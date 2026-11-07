"""V8 mobile/desktop Instagram, conversion, voluntary external navigation and V7 invariants."""
import os
from pathlib import Path
import subprocess
from playwright.sync_api import sync_playwright

BASE=os.environ.get('KAIROS_TEST_URL','http://127.0.0.1:8000')
ROOT=Path(__file__).resolve().parents[1]
OUT=Path('/tmp/kairos-v8-screenshots');OUT.mkdir(exist_ok=True)
BASELINE='d3ac4554c4ae6021bb339b94079d7b04150d307c'
old=subprocess.check_output(['git','show',BASELINE+':app.js'],cwd=ROOT,text=True)
new=(ROOT/'app.js').read_text()
assert old[old.index('if (navigator.getBattery)'):old.index('\nfunction icon(')]==new[new.index('if (navigator.getBattery)'):new.index('\nfunction icon(')]
old_html=subprocess.check_output(['git','show',BASELINE+':index.html'],cwd=ROOT,text=True)
html=(ROOT/'index.html').read_text()
assert old_html[old_html.index('<div id="statusBar"'):old_html.index('<div class="dynamic-island"')]==html[html.index('<div id="statusBar"'):html.index('<div class="dynamic-island"')]
assert '#intro' not in new and 'enterBtn' not in html
print('PASS V8: V7 battery logic and status bar markup unchanged',flush=True)


def app(p,name):p.locator(f'#home [data-route="{name}"]').first.click()
def home(p):p.click('#homeIndicator')
def unlock(p,kind):
    if kind=='abeg':app(p,'files');p.click('[data-file="abeg"]')
    else:app(p,'whatsapp');p.click('[data-wa-thread="paapii"]');p.click('[data-audio-lock]')
    p.fill('#codeField','1029' if kind=='abeg' else 'TIME');p.click('[data-unlock]')

def swipe(page,context,x1,y1,x2,y2):
    cdp=context.new_cdp_session(page)
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x1,'y':y1}]})
    for i in range(1,13):
        cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x1+(x2-x1)*i/12,'y':y1+(y2-y1)*i/12}]})
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});cdp.detach();page.wait_for_timeout(450)


with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    for desktop in (False,True):
        ctx=browser.new_context(viewport={'width':1440,'height':1100} if desktop else {'width':402,'height':874},is_mobile=not desktop,has_touch=True,reduced_motion='reduce')
        p=ctx.new_page();errors=[];requests=[]
        p.on('pageerror',lambda e:errors.append(str(e)))
        p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
        p.on('response',lambda r:errors.append((r.status,r.url)) if r.status>=400 else None)
        p.on('request',lambda r:requests.append(r.url))
        p.add_init_script('''window.__opens=[];window.__events=[];window.open=(...args)=>{window.__opens.push(args[0]);return null};window.addEventListener('kairos:event',e=>window.__events.push(e.detail));
          window.__testBattery={level:0.63,addEventListener:(name,fn)=>{window.__batteryUpdate=fn}};
          Object.defineProperty(navigator,'getBattery',{value:()=>Promise.resolve(window.__testBattery)});''')
        p.goto(BASE,wait_until='networkidle');p.clock.install()
        assert p.locator('#intro,#enterBtn').count()==0
        assert p.locator('#lock.active-view').is_visible()
        assert p.locator('#batteryLevel').inner_text()=='63'
        p.evaluate('window.__testBattery.level=0.42;window.__batteryUpdate()');assert p.locator('#batteryLevel').inner_text()=='42'
        p.screenshot(path=str(OUT/('desktop-lock.png' if desktop else 'mobile-lock.png')))
        p.click('#unlockBtn');p.evaluate('clearTimeout(callTimer);state.firstUnlockedAt=Date.now()+3600000')
        home_geometry=p.locator('.dock').bounding_box()
        app(p,'instagram');assert p.locator('.full-shot').get_attribute('src').endswith('insta-manii-profile.webp')
        for hotspot in ['insta-manii-following','insta-paapii-profile','insta-paapii-following','insta-manii-profile']:
            p.click('[data-hot="'+hotspot+'"]')
        p.click('[data-ig-post="kairos"]');assert p.locator('.ig-full-post').get_attribute('src').endswith('kairos-cover.jpg')
        p.click('[data-ig-like]');assert p.locator('[data-ig-like]').get_attribute('aria-pressed')=='true'
        p.click('[data-app-back]');p.click('[data-ig-view="inbox"]')
        assert 'manii_mu' in p.locator('.ig-username').inner_text()
        assert p.locator('#igInboxSearch').get_attribute('placeholder')=='Recherchez ou demandez à Meta AI'
        assert p.locator('[data-ig-filter="Principal"] i').inner_text()=='2'
        p.wait_for_function('Array.from(document.querySelectorAll(".ig-inbox img")).every(i=>i.complete&&i.naturalWidth>0)')
        # Original avatar paths must not be swapped, especially Corentin/Redka.
        for name in ['emmanuella','angiste','corentin','redka']:
            assert p.locator(f'[data-ig-thread="{name}"] img').get_attribute('src')==f'assets/images/{name}.jpg'
        notes=p.locator('.ig-notes');r=notes.bounding_box()
        swipe(p,ctx,r['x']+r['width']-20,r['y']+80,r['x']+20,r['y']+82)
        assert notes.evaluate('e=>e.scrollLeft')>50
        assert p.locator('.ig-inbox').count()==1
        p.screenshot(path=str(OUT/('desktop-inbox.png' if desktop else 'mobile-inbox.png')))
        p.click('[data-ig-thread="emmanuella"]')
        assert p.locator('.ig-message-line').count()>=100
        assert p.locator('.ig-message-line').count()==177
        scroll=p.locator('#igThreadMessages')
        p.wait_for_function('document.querySelector("#igThreadMessages").scrollTop>1000')
        assert scroll.inner_text().find('tu me réponds plus')>=0
        assert p.evaluate('state.instagramEmmanuellaRead')
        p.screenshot(path=str(OUT/('desktop-emmanuella.png' if desktop else 'mobile-emmanuella.png')))
        # Long DM is scrollable and vertical touch does not navigate back.
        sr=scroll.bounding_box();before=scroll.evaluate('e=>e.scrollTop')
        swipe(p,ctx,sr['x']+180,sr['y']+70,sr['x']+180,sr['y']+300)
        assert scroll.evaluate('e=>e.scrollTop')<before
        assert p.locator('.ig-thread').count()==1
        scroll.evaluate('e=>e.scrollTop=0');assert 't’es où ?' in scroll.inner_text()
        event_count=p.evaluate('window.__events.filter(e=>e.name==="emmanuella_opened").length')
        p.fill('[data-ig-reply] input','<script>not analytics</script>');p.click('[data-ig-reply] [type="submit"]')
        assert p.locator('.ig-message-line').count()==178
        assert p.evaluate('window.__events.filter(e=>e.name==="emmanuella_opened").length')==event_count
        assert p.locator('.ig-message-bubble script').count()==0
        # DMs are never sent to the analytics hook.
        assert 'not analytics' not in str(p.evaluate('window.__events'))
        p.click('[data-app-back]')
        assert p.locator('[data-ig-thread="emmanuella"] .ig-unread').count()==0
        assert '2 nouveaux messages' not in p.locator('[data-ig-thread="emmanuella"]').inner_text()
        assert p.locator('[data-ig-filter="Principal"] i').inner_text()=='1'
        for name in ['angiste','corentin','redka']:
            p.click('[data-ig-thread="'+name+'"]')
            assert p.locator('.ig-message-line').count()>30
            if name=='corentin':
                assert 'tout est enfin en ligne' not in p.locator('#igThreadMessages').inner_text()
            p.click('[data-app-back]')
        p.click('[data-ig-filter="Invitations"]');assert p.locator('.ig-inbox-empty').count()==1
        p.click('[data-ig-filter="Principal"]')
        p.fill('#igInboxSearch','redka');assert p.locator('[data-ig-thread]:visible').count()==1
        p.fill('#igInboxSearch','')
        for view in ['home','reels','search','manii-profile','inbox']:
            p.click('[data-ig-view="'+view+'"]')
            assert p.locator('.ig-app').count()==1
        home(p);assert p.locator('.dock').bounding_box()==home_geometry
        app(p,'safari');assert p.locator('.safari-start').count()==1
        assert p.evaluate('window.__opens.length')==0
        home(p)
        # Conversion must not start after only one secret or before the note is read.
        unlock(p,'abeg');p.click('[data-player-toggle]');p.wait_for_function('audioManager.audio.currentTime>0')
        home(p);assert p.evaluate('audioManager.audio.paused && audioManager.audio.currentTime===0')
        p.clock.fast_forward(4000);assert not p.evaluate('state.finalAlbumMessageAvailable')
        unlock(p,'tout');home(p);p.clock.fast_forward(1700)
        assert p.locator('.story-open').inner_text().find('02:43')>=0
        assert not p.evaluate('state.finalAlbumMessageAvailable')
        p.click('.story-open');assert 'On pense toujours' in p.locator('.note-body').inner_text()
        p.clock.fast_forward(5000);assert not p.evaluate('state.finalAlbumMessageAvailable')
        home(p);p.clock.fast_forward(3700)
        assert p.evaluate('state.finalAlbumMessageAvailable && state.safariKairosAvailable')
        assert 'Corentin' in p.locator('.story-open').inner_text()
        assert p.evaluate('window.__opens.length')==0
        p.screenshot(path=str(OUT/('desktop-final-corentin.png' if desktop else 'mobile-final-corentin.png')))
        p.click('.story-open')
        assert 'tout est enfin en ligne' in p.locator('#igThreadMessages').inner_text()
        assert 'j’ai laissé le lien final dans Safari' in p.locator('#igThreadMessages').inner_text()
        assert p.evaluate('state.finalAlbumMessageRead')
        home(p);p.clock.fast_forward(5000);assert not p.locator('#storyNotification').is_visible()
        app(p,'safari');assert p.locator('.safari-album').count()==1
        assert p.locator('.safari-album img').get_attribute('src')=='assets/images/kairos-cover.jpg'
        p.click('[data-safari-tabs]');assert p.locator('[data-safari-page="album"]').count()==1
        p.click('[data-safari-page="album"]');p.click('[data-safari-reload]')
        p.click('[data-safari-back]');assert p.locator('.safari-start').count()==1
        p.click('[data-safari-forward]');assert p.locator('.safari-album').count()==1
        p.screenshot(path=str(OUT/('desktop-safari.png' if desktop else 'mobile-safari.png')))
        assert p.evaluate('window.__opens.length')==0
        p.click('[data-album-listen]');assert p.evaluate('window.__opens')==['https://album.link/qzsdrsh5r3m8j']
        assert p.evaluate('state.albumLinkClicked')
        home(p)
        for name in ['music','spotify']:
            app(p,name)
            assert p.locator('[data-safari-album]').count()>0
            assert p.evaluate('KAIROS_SPOTIFY_EMBED===null && KAIROS_APPLE_MUSIC_EMBED===null')
            assert p.locator('iframe').count()==0
            p.click('[data-safari-album]');assert p.locator('.safari-album').count()==1
            home(p)
        p.reload(wait_until='networkidle');assert p.locator('#lock.active-view').count()==1
        assert p.locator('#intro').count()==0
        p.click('#unlockBtn');app(p,'instagram');p.click('[data-ig-view="inbox"]')
        assert p.locator('[data-ig-thread="emmanuella"] .ig-unread').count()==0
        assert p.locator('[data-ig-thread="corentin"] .ig-unread').count()==0
        p.click('[data-ig-thread="emmanuella"]');assert p.locator('.ig-message-line').count()==178
        assert not errors,errors
        assert all(url.startswith(BASE) for url in requests),requests
        assert p.evaluate('INSTAGRAM_POSTS.every(p=>p.externalUrl===null)')
        print('PASS V8', 'desktop' if desktop else 'mobile', ': inbox, Notes touch, four DMs, long scroll, read persistence, posts, tabs, finale→Corentin→Safari, explicit album opening, no JS errors/404/external requests',flush=True)
        ctx.close()
    browser.close()
