"""Final micro-fix: actual fake-device camera lifecycle, recall bounds, audio context exits."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE=os.environ.get('KAIROS_TEST_URL','http://127.0.0.1:8000')
OUT=Path('/tmp/kairos-microfix-screenshots');OUT.mkdir(exist_ok=True)


def boot(browser, desktop=False, permission=True):
    c=browser.new_context(viewport={'width':1440,'height':1100} if desktop else {'width':402,'height':874},is_mobile=not desktop,has_touch=True,reduced_motion='reduce',permissions=['camera'] if permission else [])
    page=c.new_page();errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
    page.on('response',lambda r:errors.append((r.status,r.url)) if r.status>=400 else None)
    page.add_init_script('''window.__cameraCalls=[];window.__streams=[];
      const nativeGet=navigator.mediaDevices?.getUserMedia.bind(navigator.mediaDevices);
      window.__nativeGet=nativeGet;
      if(nativeGet)navigator.mediaDevices.getUserMedia=async c=>{
        window.__cameraCalls.push(c);const stream=await nativeGet(c);window.__streams.push(stream);return stream;
      };''')
    page.goto(BASE,wait_until='networkidle');page.clock.install()
    page.click('#enterBtn');page.click('#unlockBtn')
    return c,page,errors


def app(p,name):p.locator(f'#home [data-route="{name}"]').first.click()
def home(p):p.click('#homeIndicator')
def no_auto(p):p.evaluate('clearTimeout(callTimer);state.firstUnlockedAt=Date.now()+3600000')
def clean(errors):assert not errors,errors

def start_camera(p,plus=False):
    p.locator('[data-facetime-start]').nth(0 if plus else 1).click();p.wait_for_function('state.facetimeStream && document.querySelector("#facetimeCamera").readyState>=2')
    assert p.locator('#facetimeCamera').evaluate('v=>v.srcObject===state.facetimeStream && v.muted && v.autoplay && v.playsInline')
    assert p.evaluate('state.facetimeStream.getAudioTracks().length')==0
    assert p.evaluate('window.__cameraCalls.at(-1)')=={'video':{'facingMode':'user'},'audio':False}

def stopped_camera(p):
    assert p.evaluate('state.facetimeStream===null && !state.facetimeActive')
    assert p.evaluate('window.__streams.every(s=>s.getTracks().every(t=>t.readyState==="ended"))')

def fast_until(p,expression,margin=200):
    remaining=p.evaluate(f'({expression})-Date.now()')
    p.clock.fast_forward(max(0,int(remaining)+margin))


def start_audio(p,kind='abeg',music=False):
    p.evaluate("state.abegUnlocked=true;state.toutGacherUnlocked=true")
    if music:
        app(p,'music');p.click('[data-track="'+kind+'"]')
    else:
        if kind=='abeg':app(p,'files');p.click('[data-file="abeg"]')
        else:app(p,'whatsapp');p.click('[data-wa-thread="paapii"]');p.click('[data-audio-lock]')
        p.click('[data-player-toggle]')
    p.wait_for_function('!audioManager.audio.paused && audioManager.audio.currentTime>0')
    p.evaluate('audioManager.seek(4)')


def stopped_audio(p):
    assert p.evaluate('audioManager.audio.paused && audioManager.audio.currentTime===0 && !audioManager.state.isPlaying')


with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--use-fake-device-for-media-stream'])
    for desktop in (False,True):
        c,p,errors=boot(b,desktop);no_auto(p)
        app(p,'facetime');assert p.evaluate('window.__cameraCalls.length')==0
        start_camera(p)
        p.screenshot(path=str(OUT/('desktop-facetime.png' if desktop else 'mobile-facetime.png')))
        p.click('[data-facetime-end]');stopped_camera(p)
        assert p.locator('.facetime-app').count()==1
        start_camera(p,plus=True);home(p);stopped_camera(p)
        app(p,'facetime');start_camera(p);p.click('[data-facetime-camera]')
        assert not p.evaluate('state.facetimeStream.getVideoTracks()[0].enabled')
        p.click('[data-facetime-camera]');assert p.evaluate('state.facetimeStream.getVideoTracks()[0].enabled')
        # Navigate directly to a different app while self-view is active.
        p.evaluate('route("notes")');stopped_camera(p);home(p)
        app(p,'facetime');start_camera(p)
        # Same goBack path used by the existing edge-swipe handler.
        p.evaluate('goBack()');stopped_camera(p)
        # Explicit app-back edge gesture from the self-view, using real touch input.
        start_camera(p);r=p.locator('.screen').bounding_box();cdp=c.new_cdp_session(p)
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':r['x']+8,'y':r['y']+220}]})
        for x in range(24,150,16):cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':r['x']+x,'y':r['y']+222}]})
        cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});cdp.detach()
        p.wait_for_function('!state.facetimeActive');stopped_camera(p);p.wait_for_timeout(400)
        # Late permission resolution after leaving the preview must stop the late stream too.
        p.evaluate('()=>{navigator.mediaDevices.getUserMedia=c=>new Promise(resolve=>window.__lateResolve=resolve)}')
        p.click('[data-facetime-start]');home(p)
        p.evaluate('''async()=>{const s=await window.__nativeGet({video:true,audio:false});window.__lateStream=s;window.__lateResolve(s)}''')
        p.wait_for_function('window.__lateStream.getTracks().every(t=>t.readyState==="ended")')
        assert not p.evaluate('state.facetimeActive')
        # Audio exit cases and retained Music navigation.
        start_audio(p);p.click('[data-app-back]');stopped_audio(p);home(p)
        start_audio(p,'tout');home(p);stopped_audio(p)
        start_audio(p,music=True);p.click('[data-music-album]')
        assert not p.evaluate('audioManager.audio.paused')
        p.click('[data-app-back]');assert not p.evaluate('audioManager.audio.paused')
        p.click('[data-now-open]');assert not p.evaluate('audioManager.audio.paused')
        p.click('[data-app-back]');assert not p.evaluate('audioManager.audio.paused')
        home(p);stopped_audio(p)
        start_audio(p,music=True);p.evaluate('route("messages")');stopped_audio(p);home(p)
        start_audio(p)
        p.evaluate('triggerIncomingCall()');stopped_audio(p)
        p.click('[data-call-accept]');p.wait_for_function('document.querySelector("#callAudio").currentTime>0');stopped_audio(p)
        assert p.evaluate('state.unknownCallAttempts')==1
        p.click('[data-call-hangup]');fast_until(p,'Date.now()+120000');assert p.locator('[data-call-accept]').count()==0
        clean(errors);c.close();print('PASS micro-fix','desktop' if desktop else 'mobile',': real fake-device camera, late permission cleanup, audio exits, Music continuity, first acceptance/no recall',flush=True)
    # Permission denial and unavailable API use the same elegant in-app fallback.
    denied=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-fake-device-for-media-stream','--deny-permission-prompts'])
    c,p,errors=boot(denied,permission=False);no_auto(p);app(p,'facetime');p.click('[data-facetime-start]')
    p.wait_for_function('document.querySelector("#facetimeStatus").textContent==="Caméra indisponible"')
    assert not p.evaluate('state.facetimeStream');p.click('[data-facetime-end]')
    p.evaluate('Object.defineProperty(navigator,"mediaDevices",{value:undefined})');p.click('[data-facetime-start]')
    assert p.locator('#facetimeStatus').inner_text()=='Caméra indisponible'
    home(p);clean(errors);c.close();denied.close();print('PASS micro-fix: real permission denial and unavailable camera API',flush=True)
    # B and C: refuse, navigate, recall once; accept or refuse again; never a third attempt.
    for answer in (True,False):
        c,p,errors=boot(b);app(p,'phone');p.click('[data-call-decline]')
        assert p.evaluate('state.unknownFirstDeclined && state.recallDueAt>0')
        due=p.evaluate('state.recallDueAt')
        home(p)
        for name in ['messages','notes','music']:
            app(p,name);home(p)
        assert p.evaluate('state.recallDueAt')==due
        remaining=p.evaluate('state.recallDueAt-Date.now()');p.clock.fast_forward(max(0,int(remaining)-500))
        assert p.locator('[data-call-accept]').count()==0
        p.clock.fast_forward(700);assert p.locator('[data-call-accept]').is_visible()
        assert p.evaluate('state.unknownCallAttempts')==2
        if answer:
            p.click('[data-call-accept]');p.wait_for_function('document.querySelector("#callAudio").currentTime>0')
            p.evaluate('document.querySelector("#callAudio").currentTime=document.querySelector("#callAudio").duration-0.1')
            p.wait_for_function('state.callStatus==="idle"')
        else:p.click('[data-call-decline]')
        home(p);p.clock.fast_forward(180000)
        assert p.locator('[data-call-accept]').count()==0
        assert p.evaluate('state.unknownCallAttempts===2 && state.unknownCallRecalled && state.recallDueAt===0')
        app(p,'phone');assert '(2)' in p.locator('[data-call-info="Numéro inconnu"]').inner_text()
        clean(errors);c.close();print('PASS micro-fix: recall after navigation, second '+('accepted' if answer else 'declined')+', no third call',flush=True)
    # Pending recall survives refresh through the same session state, without extra attempts.
    c,p,errors=boot(b);app(p,'phone');p.click('[data-call-decline]');due=p.evaluate('state.recallDueAt')
    p.reload(wait_until='networkidle');p.click('#enterBtn');p.click('#unlockBtn')
    assert p.evaluate('state.recallDueAt')==due
    fast_until(p,'state.recallDueAt');assert p.locator('[data-call-accept]').is_visible()
    assert p.evaluate('state.unknownCallAttempts')==2
    p.click('[data-call-decline]');p.reload(wait_until='networkidle');p.click('#enterBtn');p.click('#unlockBtn');p.clock.fast_forward(180000)
    assert p.locator('[data-call-accept]').count()==0
    clean(errors);c.close();print('PASS micro-fix: recall persistence across refresh, no third attempt after refresh',flush=True)
    # Hidden-page cleanup stops live tracks and requires a fresh explicit retry.
    c,p,errors=boot(b);no_auto(p);app(p,'facetime');start_camera(p)
    p.evaluate('()=>{Object.defineProperty(document,"hidden",{configurable:true,value:true});document.dispatchEvent(new Event("visibilitychange"))}')
    stopped_camera(p);assert p.locator('#facetimeStatus').inner_text()=='Caméra en pause'
    p.evaluate('()=>{Object.defineProperty(document,"hidden",{configurable:true,value:false});document.dispatchEvent(new Event("visibilitychange"))}')
    assert not p.evaluate('state.facetimeActive')
    p.click('[data-facetime-retry]');p.wait_for_function('state.facetimeStream!==null')
    home(p);stopped_camera(p);clean(errors);c.close();print('PASS micro-fix: hidden-page camera cleanup and explicit restart',flush=True)
    # Recall is deferred while a FaceTime preview is using the camera.
    c,p,errors=boot(b);app(p,'phone');p.click('[data-call-decline]');home(p);app(p,'facetime');start_camera(p)
    fast_until(p,'state.recallDueAt',3000);assert p.locator('[data-call-accept]').count()==0
    assert p.evaluate('state.unknownCallAttempts')==1
    p.click('[data-facetime-end]');stopped_camera(p);p.clock.fast_forward(2500)
    assert p.locator('[data-call-accept]').is_visible();p.click('[data-call-decline]')
    clean(errors);c.close();b.close();print('PASS micro-fix: recall waits until FaceTime is closed',flush=True)
