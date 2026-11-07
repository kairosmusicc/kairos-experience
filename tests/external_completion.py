"""Official content config and iframe lifecycle.
Remote documents are fulfilled by explicit local fixtures; this is not live provider validation.
"""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE=os.environ.get('KAIROS_TEST_URL','http://127.0.0.1:8000')
OUT=Path('/tmp/kairos-external-completion');OUT.mkdir(exist_ok=True)
PROFILES={
 'manii':('manii_musicoff','https://www.instagram.com/manii_musicoff/'),
 'angiste':('angiste3','https://www.instagram.com/angiste3/'),
 'paapii':('paapii_levrai','https://www.instagram.com/paapii_levrai/'),
 'emmanuella':('honey_emmanuella','https://www.instagram.com/honey_emmanuella/'),
 'corentin':('_co.ko__','https://www.instagram.com/_co.ko__/'),
 'redka':('prodbyredka','https://www.instagram.com/prodbyredka/'),
}
POSTS=['https://www.instagram.com/p/DezXPBwiOxd/','https://www.instagram.com/p/De90ubzOOuZ/','https://www.instagram.com/reel/DfFiuwHIyyN/','https://www.instagram.com/reel/DfKoj85o1Ya/','https://www.instagram.com/reel/DfP7VvKodGb/','https://www.instagram.com/reel/DfXpuedCD04/']
APPLE={
 'kairos':'https://embed.music.apple.com/fr/album/kairos/6822465566',
 'sensation':'https://embed.music.apple.com/fr/album/sensation/6831219034',
 'shogun':'https://embed.music.apple.com/fr/album/shogun-in-lagos/6825863696',
 'kany':'https://embed.music.apple.com/fr/album/kany/1695779911?i=1695779918',
 'hatelove':'https://embed.music.apple.com/fr/album/hatelove/6784591752',
}
SPOTIFY='https://open.spotify.com/embed/album/6nyjz8T3h6paStfVUerOMi'
SPOTIFY_URL='https://open.spotify.com/intl-fr/album/6nyjz8T3h6paStfVUerOMi'


def app(p,name):p.locator(f'#home [data-route="{name}"]').first.click()
def home(p):p.click('#homeIndicator')
def expect_popup(p,selector,url):
    a=p.locator(selector)
    assert a.get_attribute('href')==url
    assert a.get_attribute('target')=='_blank'
    assert set(a.get_attribute('rel').split())>={'noopener','noreferrer'}
    with p.expect_popup() as event:a.click()
    popup=event.value;popup.wait_for_load_state('domcontentloaded')
    assert popup.url==url;popup.close()


def player_frame(p,url,height):
    frame=p.locator('[data-official-frame]')
    assert frame.count()==1
    assert frame.get_attribute('src')==url
    assert frame.get_attribute('loading')=='lazy'
    assert frame.evaluate('f=>f.style.height')==str(height)+'px'
    p.frame_locator('[data-official-frame]').locator('#fixture').wait_for()
    return frame.element_handle().content_frame()


with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    for desktop in (False,True):
        ctx=browser.new_context(viewport={'width':1440,'height':1100} if desktop else {'width':402,'height':874},is_mobile=not desktop,has_touch=True,reduced_motion='reduce')
        intercepted=[]
        def fixture(route):
            intercepted.append(route.request.url)
            route.fulfill(status=200,content_type='text/html',body='<!doctype html><meta charset="utf-8"><p id="fixture">Isolated provider fixture — lifecycle test only</p>')
        for origin in ['https://embed.music.apple.com/**','https://music.apple.com/**','https://open.spotify.com/**','https://www.instagram.com/**']:
            ctx.route(origin,fixture)
        p=ctx.new_page();errors=[];requests=[]
        p.on('pageerror',lambda e:errors.append(str(e)))
        p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
        p.on('response',lambda r:errors.append((r.status,r.url)) if r.status>=400 else None)
        p.on('request',lambda r:requests.append(r.url))
        p.goto(BASE,wait_until='networkidle');p.click('#unlockBtn')
        p.evaluate('clearTimeout(callTimer);state.firstUnlockedAt=Date.now()+3600000')
        assert p.evaluate('Object.keys(INSTAGRAM_PROFILES).length')==6
        for key,(username,url) in PROFILES.items():
            assert p.evaluate(f'INSTAGRAM_PROFILES.{key}.username')==username
            assert p.evaluate(f'INSTAGRAM_PROFILES.{key}.url')==url
        assert p.evaluate('INSTAGRAM_PUBLIC_POSTS')==POSTS
        assert p.evaluate('INSTAGRAM_POSTS.every(p=>p.externalUrl===null)')
        assert p.evaluate('Object.keys(APPLE_MUSIC_CATALOG)')==list(APPLE)
        app(p,'instagram')
        assert not intercepted, 'No external fetch on profile open'
        expect_popup(p,'[data-instagram-profile="manii"]',PROFILES['manii'][1])
        links=p.locator('[data-instagram-public-post]')
        assert links.count()==6
        for index,url in enumerate(POSTS):
            assert '?' not in links.nth(index).get_attribute('href')
            assert links.nth(index).locator('img').count()==0, 'Do not map unmatched local art to an official post'
            expect_popup(p,f'[data-instagram-public-post]:nth-child({index+1})',url)
        p.click('[data-hot="insta-manii-following"]');p.click('[data-hot="insta-paapii-profile"]')
        assert p.locator('.full-shot').get_attribute('src').endswith('insta-paapii-profile.webp')
        expect_popup(p,'[data-instagram-profile="paapii"]',PROFILES['paapii'][1])
        p.click('[data-ig-view="inbox"]')
        assert p.locator('.ig-username-text').inner_text()=='manii_musicoff'
        assert p.locator('.ig-username-text').evaluate('e=>getComputedStyle(e).textOverflow')=='ellipsis'
        p.screenshot(path=str(OUT/('desktop-inbox.png' if desktop else 'mobile-inbox.png')))
        for key in ['emmanuella','angiste','corentin','redka']:
            p.click('[data-ig-thread="'+key+'"]')
            assert PROFILES[key][0] in p.locator('.ig-contact-card').inner_text()
            if key=='angiste':assert p.locator('[data-ig-view="paapii-profile"]').count()==0
            if key=='emmanuella':assert p.locator('.ig-message-line').count()==177
            expect_popup(p,f'[data-instagram-profile="{key}"]',PROFILES[key][1])
            p.click('[data-app-back]')
        home(p);app(p,'music')
        assert p.locator('[data-apple-content]').count()==5
        assert p.locator('iframe').count()==0
        assert p.locator('[data-apple-content="kairos"] img').get_attribute('src')=='assets/images/kairos-cover.jpg'
        for key,url in APPLE.items():
            p.click('[data-apple-content="'+key+'"]')
            expected_height=150 if key=='kany' else 450
            frame=player_frame(p,url,expected_height)
            assert p.locator('.official-player h1').inner_text()==p.evaluate(f'APPLE_MUSIC_CATALOG.{key}.title')
            allow=p.locator('iframe').get_attribute('allow')
            assert 'autoplay *' in allow and 'encrypted-media *' in allow
            assert set(p.locator('iframe').get_attribute('sandbox').split())=={'allow-forms','allow-popups','allow-same-origin','allow-scripts','allow-storage-access-by-user-activation','allow-top-navigation-by-user-activation'}
            p.screenshot(path=str(OUT/f'{"desktop" if desktop else "mobile"}-apple-{key}-isolated.png'))
            p.click('[data-app-back]');assert p.locator('iframe').count()==0;assert frame.is_detached()
            assert p.locator('[data-apple-content]').count()==5
        # Local audio is stopped before an iframe browsing context can be created.
        p.evaluate('state.abegUnlocked=true;state.toutGacherUnlocked=true;renderMusic()')
        p.click('[data-track="abeg"]');p.wait_for_function('audioManager.audio.currentTime>0')
        p.evaluate('''()=>{window.__overlap=false;window.__observer=new MutationObserver(()=>{if(document.querySelector('iframe')&&!audioManager.audio.paused)window.__overlap=true});window.__observer.observe(document.body,{childList:true,subtree:true})}''')
        p.click('[data-apple-content="kairos"]');player_frame(p,APPLE['kairos'],450)
        assert p.evaluate('audioManager.audio.paused && audioManager.audio.currentTime===0 && !window.__overlap')
        # Switching provider/content retains exactly one context and destroys the previous frame.
        old=p.locator('iframe').element_handle().content_frame()
        p.evaluate('navigate(renderOfficialEmbed,"apple","kany")');player_frame(p,APPLE['kany'],150)
        assert old.is_detached()
        old=p.locator('iframe').element_handle().content_frame();home(p)
        assert p.locator('iframe').count()==0 and old.is_detached()
        app(p,'spotify');assert p.locator('iframe').count()==0
        assert p.locator('[data-apple-content]').count()==0
        assert all(title not in p.locator('.spotify-app').inner_text() for title in ['Sensation','Hatelove','Shogun','Kany'])
        p.click('[data-album-play]');frame=player_frame(p,SPOTIFY,450)
        assert p.locator('.spotify-app').count()==1
        p.locator('iframe').dispatch_event('error');assert p.locator('[data-embed-status]').is_visible()
        expect_popup(p,'[data-official-fallback]',SPOTIFY_URL)
        assert p.locator('iframe').count()==0 and frame.is_detached()
        p.click('[data-embed-retry]');frame=player_frame(p,SPOTIFY,450)
        p.click('[data-app-back]');assert frame.is_detached()
        p.click('.spotify-cover-button');frame=player_frame(p,SPOTIFY,450)
        p.evaluate('route("notes")');assert p.locator('iframe').count()==0 and frame.is_detached()
        home(p);app(p,'music');p.click('[data-apple-content="hatelove"]');frame=player_frame(p,APPLE['hatelove'],450)
        # Same Home gesture path, with real touch events on the phone's indicator area.
        r=p.locator('.screen').bounding_box();cdp=ctx.new_cdp_session(p)
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':r['x']+180,'y':r['y']+r['height']-12}]})
        for i in range(1,9):cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':r['x']+180,'y':r['y']+r['height']-12-i*18}]})
        cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});cdp.detach();p.wait_for_timeout(400)
        assert p.locator('#home.active-view').count()==1 and frame.is_detached()
        app(p,'spotify');p.click('[data-album-play]');frame=player_frame(p,SPOTIFY,450)
        p.evaluate('triggerIncomingCall()');assert p.locator('iframe').count()==0 and frame.is_detached()
        p.click('[data-call-accept]');p.wait_for_function('document.querySelector("#callAudio").currentTime>0')
        assert p.evaluate('audioManager.audio.paused')
        p.click('[data-call-hangup]');home(p)
        # Hiding the page also tears down external playback; no automatic recreation.
        app(p,'music');p.click('[data-apple-content="sensation"]');frame=player_frame(p,APPLE['sensation'],450)
        p.evaluate('()=>{Object.defineProperty(document,"hidden",{configurable:true,value:true});document.dispatchEvent(new Event("visibilitychange"))}')
        assert p.locator('iframe').count()==0 and frame.is_detached()
        p.evaluate('()=>{Object.defineProperty(document,"hidden",{configurable:true,value:false});document.dispatchEvent(new Event("visibilitychange"))}')
        assert p.locator('iframe').count()==0
        assert p.evaluate('validatedEmbed("apple","unknown")===null && officialContent("spotify","sensation")===null')
        # No analytics script/SDK is added; provider frames are the only external loads in this test.
        assert p.locator('script[src*="insights"],script[src*="analytics"]').count()==0
        assert all(url.startswith((BASE,'https://embed.music.apple.com/','https://open.spotify.com/')) for url in requests),requests
        assert not errors,errors
        print('PASS official completion', 'desktop' if desktop else 'mobile', ': 6 profile links, 6 unmapped public posts, 5 Apple items, Spotify KAIROS only, lazy frames, context destruction, local audio priority, no JS errors/404 with isolated provider fixtures',flush=True)
        ctx.close()
    browser.close()
