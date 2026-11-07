"""V8.1 contract tests. Apple metadata/media are explicit isolated fixtures, never real URLs claimed as verified."""
import io
import json
import os
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright
from browser_fixtures import isolate_apple_metadata
BASE=os.environ.get('KAIROS_TEST_URL','http://127.0.0.1:8000')
ROOT=Path(__file__).resolve().parents[1]
OUT=Path('/tmp/kairos-v81');OUT.mkdir(exist_ok=True)
TITLES=['KAIROS','GOD BLESS','BOULOT','BANDITE','VINCENT KOMPANY','INTERLUDE','TU SAIS','LPB']
IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
# All fixture media URLs below are intentionally test-only. Production takes URLs only from Apple responses.
def rich_metadata(ctx):
    seen=[]
    ids=['6822465566','6831219034','6825863696','1695779918','6784591752']
    names=['KAIROS','Sensation','Shogun in Lagos','Kany','Hatelove']
    artists=['Paapii & Manii','Ronisia','Didi B','Artiste du test','Joé Dwèt Filé']
    results=[dict(wrapperType='track' if i==3 else 'collection',collectionId=int(id),trackId=int(id),collectionName=names[i],trackName=names[i],artistName=artists[i],artworkUrl100=f'https://is1-ssl.mzstatic.com/isolated-test-fixture/{id}.png') for i,id in enumerate(ids)]
    songs=[results[0]]+[dict(wrapperType='track',kind='song',collectionId=6822465566,trackId=i+1,trackName=t,previewUrl=f'https://audio-ssl.itunes.apple.com/isolated-test-fixture/kairos-{i}.m4a',trackTimeMillis=180000) for i,t in enumerate(TITLES)]
    def lookup(route):
        seen.append(route.request.url)
        body={'results':songs if 'entity=song' in route.request.url else results,'resultCount':len(songs if 'entity=song' in route.request.url else results)}
        route.fulfill(status=200,content_type='application/json',headers={'Access-Control-Allow-Origin':'*'},body=json.dumps(body))
    ctx.route('https://itunes.apple.com/**',lookup)
    image=Image.new('RGB',(100,100),'#ab889b');raw=io.BytesIO();image.save(raw,format='PNG')
    ctx.route('https://is1-ssl.mzstatic.com/isolated-test-fixture/**',lambda r:r.fulfill(status=200,content_type='image/png',body=raw.getvalue()))
    ctx.route('https://audio-ssl.itunes.apple.com/isolated-test-fixture/**',lambda r:r.fulfill(status=200,content_type='audio/wav',body=(ROOT/'assets/audio/abeg.wav').read_bytes()))
    ctx.route('https://embed.music.apple.com/**',lambda r:r.fulfill(status=200,content_type='text/html',body='<p id="fixture">Isolated official player fixture</p>'))
    return seen

def app(p,n):p.locator(f'#home [data-route="{n}"]').first.click()
def home(p):p.click('#homeIndicator')
def swipe(p,c,x1,y1,x2,y2):
    cd=c.new_cdp_session(p);cd.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x1,'y':y1}]})
    for i in range(1,10):cd.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x1+(x2-x1)*i/9,'y':y1+(y2-y1)*i/9}]})
    cd.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});cd.detach();p.wait_for_timeout(400)

def no_auto(p):p.evaluate('clearTimeout(callTimer);state.firstUnlockedAt=Date.now()+3600000')
with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    # Unsupported Battery API: no invented percentage. iOS: no duplicate simulated system chrome.
    for ios in (False,True):
        c=b.new_context(viewport={'width':402,'height':874},is_mobile=ios,has_touch=True,**({'user_agent':IOS} if ios else {}))
        isolate_apple_metadata(c);p=c.new_page();p.add_init_script('Object.defineProperty(navigator,"getBattery",{value:undefined})')
        p.goto(BASE,wait_until='networkidle')
        assert p.locator('#batteryLevel').inner_text()==''
        assert not p.locator('#lock .lock-notif').count()
        assert 'Tu as trouvé' not in p.locator('#lock').inner_text()
        if ios:
            assert p.locator('html.ios-native-chrome').count()==1
            assert not p.locator('#statusBar').is_visible() and not p.locator('.dynamic-island').is_visible()
        else:assert p.locator('#statusBar').is_visible()
        p.screenshot(path=str(OUT/('ios-lock.png' if ios else 'desktop-sim-lock.png')))
        p.click('#lockFlashlight');assert p.locator('#lockFlashlight').get_attribute('aria-pressed')=='true'
        p.click('#lockFlashlight');assert p.locator('#lockFlashlight').get_attribute('aria-pressed')=='false'
        assert not p.locator('#toast').is_visible()
        p.click('#lockCamera');assert p.locator('.camera-app').count()==1
        assert not p.evaluate('state.phoneUnlocked')
        home(p);assert p.locator('#lock.active-view').count()==1
        p.click('#lockCamera');p.evaluate('goBack()');assert p.locator('#lock.active-view').count()==1
        r=p.locator('.screen').bounding_box();swipe(p,c,r['x']+180,r['y']+650,r['x']+180,r['y']+400)
        assert p.locator('#home.active-view').count()==1
        c.close()
    for desktop in (False,True):
        c=b.new_context(viewport={'width':1440,'height':1100} if desktop else {'width':402,'height':874},is_mobile=not desktop,has_touch=True,reduced_motion='reduce')
        seen=rich_metadata(c);p=c.new_page();errors=[]
        p.on('pageerror',lambda e:errors.append(str(e)))
        p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
        p.on('response',lambda r:errors.append((r.status,r.url)) if r.status>=400 else None)
        p.goto(BASE,wait_until='networkidle');p.clock.install();p.click('#unlockBtn');no_auto(p)
        app(p,'instagram')
        assert p.locator('.full-shot').get_attribute('src').endswith('insta-manii-profile.webp')
        assert p.locator('.ig-post-grid,.ig-feed-post,[data-ig-post]').count()==0
        p.click('[data-ig-publications]');assert p.locator('[data-instagram-public-post]').count()==6
        p.click('[data-app-back]');p.click('[data-ig-view="home"]')
        assert p.locator('.full-shot').get_attribute('src').endswith('insta-manii-profile.webp')
        p.click('[data-ig-view="inbox"]')
        for n in ['ruben','himra','ange']:
            assert p.locator(f'[data-ig-thread="{n}"] img').get_attribute('src')==f'assets/images/{n}.jpg'
        for id,count in [('emmanuella',177),('angiste',81),('corentin',48),('redka',41),('ruben',36),('ange',27),('himra',1)]:
            p.click(f'[data-ig-thread="{id}"]');assert p.locator('.ig-message-line').count()==count
            assert p.locator('.ig-message-line>time').count()==0
            assert p.locator('.ig-composer input').get_attribute('placeholder')=='Votre message...'
            assert not p.locator('[data-ig-reply] [type="submit"]').is_visible()
            if id!='himra':
                assert p.locator('.ig-group-avatar').count()>0
                assert p.locator('.ig-group-avatar').count()<=p.locator('.ig-message-line.them').count()
                if id in ('emmanuella','corentin','ruben','ange'):assert p.locator('.ig-group-avatar').count()<p.locator('.ig-message-line.them').count()
            else:
                assert p.locator('.ig-message-line.them').count()==0
                assert p.locator('.ig-delivered').inner_text()=='Envoyé'
            if id=='ruben':p.screenshot(path=str(OUT/('desktop-ruben.png' if desktop else 'mobile-ruben.png')))
            p.fill('.ig-composer input','test');assert p.locator('[data-ig-reply] [type="submit"]').is_visible()
            assert not p.locator('.ig-composer-tools').is_visible()
            p.fill('.ig-composer input','');p.click('[data-app-back]')
        home(p);app(p,'safari');assert p.locator('[data-safari-page="album"]').count()==1
        assert 'KAIROS — Manii & Paapii' in p.locator('.safari-start').inner_text()
        home(p);app(p,'music')
        p.wait_for_function('appleMetadataState.loaded && ALBUM_TRACKS.every(t=>t.src)')
        assert len(seen)==2
        assert p.locator('[data-apple-art] img').count()==5
        assert p.locator('[data-apple-art="kairos"] img').get_attribute('src')=='assets/images/kairos-cover.jpg'
        p.screenshot(path=str(OUT/('desktop-music-fixtures.png' if desktop else 'mobile-music-fixtures.png')))
        p.click('[data-music-album]');assert p.locator('[data-track^="album-"]').count()==8
        assert all('Aperçu Apple Music' in row.inner_text() for row in p.locator('[data-track^="album-"]').all())
        p.click('[data-album-play]');p.wait_for_function('audioManager.audio.currentTime>0')
        assert p.locator('[data-now-title]').inner_text()=='KAIROS'
        assert p.locator('[data-now-artist]').inner_text()=='Paapii & Manii'
        assert p.locator('[data-now-art]').get_attribute('src')=='assets/images/kairos-cover.jpg'
        p.click('[data-player-next]');p.wait_for_function('audioManager.state.currentTrack.title==="GOD BLESS" && !audioManager.audio.paused')
        p.click('[data-player-toggle]');assert p.evaluate('audioManager.audio.paused')
        p.click('[data-player-toggle]');p.wait_for_function('!audioManager.audio.paused')
        p.click('[data-now-open]');assert p.locator('.preview-credit').inner_text()=='Aperçu Apple Music'
        p.screenshot(path=str(OUT/('desktop-preview-fixture.png' if desktop else 'mobile-preview-fixture.png')))
        p.click('[data-official-embed="apple"]');assert p.evaluate('audioManager.audio.paused && audioManager.audio.currentTime===0')
        p.frame_locator('iframe').locator('#fixture').wait_for();assert not p.locator('[data-official-loading]').is_visible()
        frame=p.locator('iframe').element_handle().content_frame();home(p);assert frame.is_detached()
        app(p,'music');p.click('[data-music-album]');p.click('[data-track="album-7"]');p.wait_for_function('audioManager.state.currentTrack.title==="LPB" && !audioManager.audio.paused')
        home(p);assert p.evaluate('audioManager.audio.paused && audioManager.audio.currentTime===0')
        app(p,'music');assert len(seen)==2
        # Cache survives refresh without an extra lookup.
        p.reload(wait_until='networkidle');p.click('#unlockBtn');no_auto(p);app(p,'music')
        p.wait_for_function('appleMetadataState.loaded');assert len(seen)==2
        assert not errors,errors
        c.close();print('PASS V8.1','desktop' if desktop else 'mobile',': lock shortcuts, 7 DMs, real-capture profile, honest battery, Apple metadata/preview lifecycle with explicit fixtures, existing Safari trace',flush=True)
    b.close()
