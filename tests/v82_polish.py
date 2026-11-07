"""V8.2 real browser layout/lifecycle tests. Provider frames use explicit test fixtures; call playback uses the actual repository WAV.
"""
import os, wave
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_fixtures import isolate_apple_metadata, isolate_instagram_embeds
BASE=os.environ.get('KAIROS_TEST_URL','http://127.0.0.1:8000')
ROOT=Path(__file__).resolve().parents[1]
OUT=Path('/tmp/kairos-v82');OUT.mkdir(exist_ok=True)
IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
ANDROID='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36'
def app(p,n):p.locator(f'#home [data-route="{n}"]').first.click()
def home(p):p.click('#homeIndicator')
def boot(p):
    p.goto(BASE,wait_until='networkidle');p.click('#unlockBtn');p.evaluate('clearTimeout(callTimer);state.firstUnlockedAt=Date.now()+3600000')
def inside(p,sel):
    box=p.locator(sel).bounding_box();screen=p.locator('.screen').bounding_box()
    assert box and box['width']>0 and box['height']>0,(sel,box)
    assert box['y']>=screen['y']-1 and box['y']+box['height']<=screen['y']+screen['height']+1,(sel,box,screen)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for name,ua,w,h in [('safari',IOS,402,874),('chrome',ANDROID,412,850),('webview',ANDROID+' Instagram',320,568)]:
    c=b.new_context(viewport={'width':w,'height':h},user_agent=ua,is_mobile=True,has_touch=True)
    isolate_apple_metadata(c);p=c.new_page();errors=[];requests=[]
    p.on('pageerror',lambda e:errors.append(str(e)));p.on('request',lambda r:requests.append(r.url))
    p.goto(BASE,wait_until='networkidle')
    for width,height in [(w,h),(h,w),(w,480),(w,h)]:
        p.set_viewport_size({'width':width,'height':height});p.wait_for_timeout(150)
        assert p.locator('html.mobile-experience').count()==1
        assert not p.locator('#statusBar').is_visible() and not p.locator('.dynamic-island').is_visible()
        for sel in ['.lock-padlock','#lockDate','#lockTime','#lockFlashlight','#lockCamera','#unlockBtn','#homeIndicator']:inside(p,sel)
        assert p.locator('#lockTime').inner_text()
        assert p.locator('#homeIndicator').evaluate('e=>getComputedStyle(e,"::after").opacity')=='1'
        assert not p.locator('#lock .lock-notif').count()
    assert not any('instagram.com' in u for u in requests)
    # Visual viewport can shrink without changing CSS layout viewport (browser chrome/keyboard).
    p.evaluate('Object.defineProperty(visualViewport,"height",{configurable:true,value:460});visualViewport.dispatchEvent(new Event("resize"))')
    p.wait_for_timeout(100)
    box=p.locator('.screen').bounding_box();assert box['y']<1 and abs(box['height']-460)<2,box
    for sel in ['.lock-padlock','#lockDate','#lockTime','#lockFlashlight','#lockCamera','#unlockBtn','#homeIndicator']:inside(p,sel)
    p.evaluate('delete visualViewport.height;visualViewport.dispatchEvent(new Event("resize"))')
    p.screenshot(path=str(OUT/(name+'-lock.png')))
    p.click('#lockFlashlight');assert p.locator('#lockFlashlight').get_attribute('aria-pressed')=='true'
    p.click('#lockCamera');assert p.locator('.camera-app').count()==1;home(p);assert p.locator('#lock.active-view').count()==1
    assert not errors,errors
    c.close();print('PASS V8.2 mobile',name,'portrait, landscape, reduced browser height, restored chrome; lock components visible',flush=True)
 c=b.new_context(viewport={'width':1440,'height':1100});p=c.new_page();p.goto(BASE,wait_until='networkidle')
 assert p.locator('#statusBar').is_visible() and p.locator('.dynamic-island').is_visible();inside(p,'#lockTime');c.close()
 print('PASS V8.2 desktop: simulated system bar and island retained',flush=True)
 # Six actual configured permalinks, single embed script and one mounted provider frame.
 c=b.new_context(viewport={'width':402,'height':874},is_mobile=True,has_touch=True)
 isolate_apple_metadata(c);isolate_instagram_embeds(c);p=c.new_page();errors=[];requests=[]
 p.on('pageerror',lambda e:errors.append(str(e)));p.on('request',lambda r:requests.append(r.url))
 boot(p);assert not any('instagram.com' in u for u in requests)
 app(p,'instagram');assert not any('embed.js' in u for u in requests)
 p.click('[data-ig-publications]');assert p.locator('[data-ig-real-post]').count()==6
 urls=p.evaluate('MANII_REAL_INSTAGRAM_CONTENT')
 for i,url in enumerate(urls):
    card=p.locator(f'[data-ig-real-post="{i}"]');card.scroll_into_view_if_needed()
    p.wait_for_function('(i)=>document.querySelector(`[data-ig-real-post="${i}"]`).dataset.embedState==="success"',arg=i)
    assert card.locator('iframe').get_attribute('data-permalink')==url
    assert p.locator('.ig-real-feed iframe').count()==1
    assert card.locator('[data-instagram-public-post]').get_attribute('href')==url
 assert len([u for u in requests if u=='https://www.instagram.com/embed.js'])==1
 p.screenshot(path=str(OUT/'instagram-isolated-fixture.png'))
 # Hidden contexts are torn down; return restores the scroll without another script.
 p.evaluate('Object.defineProperty(document,"hidden",{configurable:true,value:true});document.dispatchEvent(new Event("visibilitychange"))')
 assert p.locator('iframe,blockquote').count()==0
 p.evaluate('Object.defineProperty(document,"hidden",{configurable:true,value:false});document.dispatchEvent(new Event("visibilitychange"))')
 p.wait_for_function('(i)=>document.querySelector(`[data-ig-real-post="${i}"]`).dataset.embedState==="success"',arg=5)
 home(p);assert p.locator('iframe,blockquote').count()==0
 app(p,'instagram');p.click('[data-ig-publications]');p.wait_for_function('(i)=>document.querySelector(`[data-ig-real-post="${i}"]`).dataset.embedState==="success"',arg=5)
 assert p.locator('script[data-instagram-embed-script]').count()==1
 assert not errors,errors;c.close();print('PASS V8.2 Instagram six permalinks rendered inside shell with isolated embed script; one active frame; cleanup and singleton',flush=True)
 # Script unavailable => clean fallback without navigation.
 c=b.new_context(viewport={'width':402,'height':874},is_mobile=True,has_touch=True);isolate_apple_metadata(c)
 c.route('https://www.instagram.com/embed.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body='/* unavailable provider fixture */'))
 p=c.new_page();boot(p);app(p,'instagram');p.click('[data-ig-publications]')
 p.locator('[data-ig-real-post="0"] .ig-embed-fallback').wait_for(state='visible');assert p.url.startswith(BASE)
 assert p.locator('.ig-embed-fallback a').first.get_attribute('href')==urls[0];c.close();print('PASS V8.2 Instagram rejected embed fallback',flush=True)
 # Official player state machine, requests held deliberately to inspect LOADING.
 c=b.new_context(viewport={'width':402,'height':874},is_mobile=True,has_touch=True);isolate_apple_metadata(c);p=c.new_page();errors=[];pending=[]
 p.on('pageerror',lambda e:errors.append(str(e)))
 for pattern in ['https://embed.music.apple.com/**','https://open.spotify.com/embed/**']:c.route(pattern,lambda r:pending.append(r))
 boot(p);p.clock.install()
 for provider,key in [('apple','kairos'),('apple','hatelove'),('spotify','kairos')]:
    app(p,'music' if provider=='apple' else 'spotify')
    p.click(f'[data-apple-content="{key}"]' if provider=='apple' else '[data-album-play]')
    p.wait_for_function('document.querySelector("[data-official-frame]")!==null')
    assert p.locator('.official-player').get_attribute('data-player-state')=='loading'
    assert p.locator('[data-official-loading]').is_visible()
    assert not p.locator('[data-official-error]').is_visible()
    assert p.locator('[data-official-frame]').get_attribute('loading')=='eager'
    p.wait_for_timeout(100);assert pending
    pending.pop(0).fulfill(status=200,content_type='text/html',body='<p id="fixture">Isolated provider fixture</p>')
    p.wait_for_function('document.querySelector(".official-player").dataset.playerState==="success"')
    assert not p.locator('[data-official-error]').is_visible() and not p.locator('[data-embed-retry]').is_visible()
    assert not p.locator('[data-official-loading]').is_visible()
    # Native error: frame removed; retry creates a new frame and a fresh timer.
    p.locator('iframe').dispatch_event('error')
    assert p.locator('.official-player').get_attribute('data-player-state')=='error'
    assert p.locator('[data-official-error]').is_visible() and p.locator('iframe').count()==0
    assert p.locator('[data-embed-retry]').inner_text()=='Réessayer'
    p.click('[data-embed-retry]');p.wait_for_timeout(100)
    assert p.locator('.official-player').get_attribute('data-player-state')=='loading'
    p.clock.fast_forward(9100)
    assert p.locator('.official-player').get_attribute('data-player-state')=='error'
    pending.pop(0).fulfill(status=200,content_type='text/html',body='Late timeout fixture')
    p.click('[data-embed-retry]');p.wait_for_timeout(100)
    pending.pop(0).fulfill(status=200,content_type='text/html',body='<p id="fixture">Successful retry fixture</p>')
    p.wait_for_function('document.querySelector(".official-player").dataset.playerState==="success"')
    home(p);p.clock.fast_forward(10000);assert p.locator('iframe').count()==0
 assert not errors,errors;c.close();print('PASS V8.2 Apple KAIROS/Hatelove and Spotify loading/success/error/timeout/retry/exit; isolated provider frames',flush=True)
 # Real repository call audio: initial accept/hangup, then decline/recall/natural completion.
 for recall in (False,True):
    c=b.new_context(viewport={'width':402,'height':874},is_mobile=True,has_touch=True);isolate_apple_metadata(c)
    p=c.new_page();seen=[];failures=[]
    p.on('request',lambda r:seen.append(r.url))
    p.on('pageerror',lambda e:failures.append(str(e)))
    p.on('response',lambda r:failures.append((r.status,r.url)) if r.status>=400 else None)
    boot(p);p.clock.install();app(p,'phone')
    assert p.locator('[data-call-accept]').is_visible()
    if recall:
        p.click('[data-call-decline]');p.clock.fast_forward(61000);p.wait_for_function('state.callStatus==="ringing"')
    p.click('[data-call-accept]');p.wait_for_function('document.querySelector("#callAudio")?.currentTime>0')
    audio=p.locator('#callAudio').element_handle()
    assert p.locator('#callAudio').get_attribute('src')=='assets/audio/Nouvel-enregistrement-215.wav'
    assert not any('call-0243' in u or 'call%20officiel' in u for u in seen)
    assert any('Nouvel-enregistrement-215.wav' in u for u in seen)
    if recall:
        assert p.evaluate('state.unknownCallAttempts===2 && state.unknownCallRecalled')
        p.wait_for_function('document.querySelector("#callAudio").readyState>=3')
        p.evaluate('document.querySelector("#callAudio").currentTime=document.querySelector("#callAudio").duration-0.15')
        p.wait_for_function('state.callStatus==="idle"')
    else:p.click('[data-call-hangup]')
    assert p.locator('#callAudio').count()==0
    assert audio.evaluate('a=>a.paused && a.currentTime===0')
    assert not failures,failures
    c.close()
 print('PASS real call WAV: first accept/hangup, refusal/recall/accept/natural end, no legacy request, no JS errors/404',flush=True)
 b.close()
with wave.open(str(ROOT/'assets/audio/Nouvel-enregistrement-215.wav')) as audio:
 assert audio.getnframes()>0
 print('PASS real call WAV format and duration',audio.getnframes()/audio.getframerate(),flush=True)
