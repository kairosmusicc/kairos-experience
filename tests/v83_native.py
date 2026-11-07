"""V8.3 native interaction contracts. Providers use explicit local fixtures; call audio stays real."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_fixtures import rich_metadata, isolate_apple_metadata, isolate_instagram_embeds
BASE=os.environ.get('KAIROS_TEST_URL','http://127.0.0.1:8000')
OUT=Path('/tmp/kairos-v83');OUT.mkdir(exist_ok=True)
IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
def app(p,n):p.locator(f'#home [data-route="{n}"]').first.click()
def home(p):p.click('#homeIndicator')
def click_play(p,selector):
 p.locator(selector).evaluate('''el=>{const original=el.onclick;el.onclick=function(e){window.__insideHandler=true;try{return original.call(this,e)}finally{window.__insideHandler=false}}}''')
 p.click(selector)
def no_call(p):p.evaluate('clearTimeout(callTimer);state.firstUnlockedAt=Date.now()+3600000')
def swipe(p,c,edge=False,home_gesture=False):
 r=p.locator('.screen').bounding_box();ratio=r['width']/p.locator('.screen').evaluate('e=>e.clientWidth')
 x=r['x']+(8 if edge else 180)*ratio
 y=r['y']+r['height']-(10*ratio) if home_gesture else r['y']+r['height']*.7
 dx=105*ratio if edge else 0;dy=0 if edge else -140*ratio
 cd=c.new_cdp_session(p);cd.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
 for i in range(1,11):cd.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+dx*i/10,'y':y+dy*i/10}]})
 cd.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});cd.detach();p.wait_for_timeout(400)
def fitted(p,w,h,top=0,bottom=0):
 d=p.locator('.device').bounding_box();assert d['x']>=11 and d['y']>=top+11,d
 assert d['x']+d['width']<=w-11 and d['y']+d['height']<=h-bottom-11,d
 assert abs(d['width']/d['height']-422/914)<.001,d
 assert p.locator('.device').evaluate('e=>e.offsetWidth===422 && e.offsetHeight===914')
 assert p.locator('.device').evaluate('e=>getComputedStyle(e).borderTopWidth')=='10px'
 assert p.locator('.screen').evaluate('e=>parseFloat(getComputedStyle(e).borderRadius)')==52
 for sel in ['#statusBar','.dynamic-island','#lockDate','#lockTime','.lock-padlock','#lockFlashlight','#lockCamera','#homeIndicator']:
  assert p.locator(sel).is_visible(),sel
 assert p.locator('#batteryLevel').inner_text()==''
 assert p.locator('#lockTime').evaluate('e=>getComputedStyle(e).fontSize')=='86px'
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for ua in [IOS,'Mozilla/5.0 Chrome/130.0 Android Mobile','Mozilla/5.0 Instagram WebView']:
  c=b.new_context(viewport={'width':402,'height':874},user_agent=ua,is_mobile=True,has_touch=True,reduced_motion='reduce');isolate_apple_metadata(c)
  p=c.new_page();p.add_init_script('Object.defineProperty(navigator,"getBattery",{value:undefined})');p.goto(BASE,wait_until='networkidle')
  for w,h in [(402,874),(320,568),(874,402),(402,480),(402,874)]:
   p.set_viewport_size({'width':w,'height':h});p.wait_for_timeout(100);fitted(p,w,h)
  p.evaluate('document.documentElement.style.setProperty("--viewport-safe-top","47px");document.documentElement.style.setProperty("--viewport-safe-bottom","34px");syncMobileExperience()');fitted(p,402,874,47,34)
  p.evaluate('Object.defineProperty(visualViewport,"height",{configurable:true,value:520});visualViewport.dispatchEvent(new Event("resize"))');fitted(p,402,520,47,34)
  p.evaluate('delete visualViewport.height;document.documentElement.style.removeProperty("--viewport-safe-top");document.documentElement.style.removeProperty("--viewport-safe-bottom");syncMobileExperience()')
  p.screenshot(path=str(OUT/('mobile-full-device-'+str(len(ua))+'.png')))
  p.click('#lockCamera');assert p.locator('.camera-app').count()==1;home(p);assert p.locator('#lock.active-view').count()==1
  swipe(p,c);assert p.locator('#home.active-view').count()==1;no_call(p)
  app(p,'messages');p.click('[data-msg-thread="paapii"]');swipe(p,c,edge=True);assert p.locator('.message-list').count() or p.locator('[data-msg-thread="paapii"]').count()
  swipe(p,c,home_gesture=True);assert p.locator('#home.active-view').count()==1
  c.close()
 print('PASS V8.3 full mobile device: ratio, frame, all edges, safe areas, orientation, VisualViewport, lock camera, scaled gestures',flush=True)
 for desktop in [False,True]:
  c=b.new_context(viewport={'width':1440,'height':1100} if desktop else {'width':402,'height':874},is_mobile=not desktop,has_touch=True,reduced_motion='reduce')
  pending=[];seen=rich_metadata(c,pending);isolate_instagram_embeds(c);p=c.new_page();errors=[];requests=[]
  p.on('pageerror',lambda e:errors.append(str(e)))
  p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
  p.on('response',lambda r:errors.append((r.status,r.url)) if r.status>=400 else None)
  p.on('request',lambda r:requests.append(r.url))
  p.goto(BASE,wait_until='networkidle');assert not pending
  p.click('#unlockBtn');no_call(p)
  p.wait_for_function('appleMetadataState.loading');p.wait_for_timeout(150);assert len(pending)==2
  assert p.locator('#home.active-view').count()==1,'Metadata starts before Music'
  app(p,'music');p.click('[data-music-album]');assert p.locator('[data-album-play]').is_disabled()
  assert 'Préparation des aperçus' in p.locator('[data-apple-loading]').inner_text()
  assert p.locator('iframe').count()==0
  for route,body in pending:route.fulfill(status=200,content_type='application/json',headers={'Access-Control-Allow-Origin':'*'},body=json.dumps(body))
  p.wait_for_function('appleMetadataState.loaded && ALBUM_TRACKS.every(t=>t.src)')
  assert p.locator('[data-album-play]').is_enabled()
  assert p.evaluate('audioManager.audio.preload==="auto" && audioManager.audio.paused && audioManager.state.currentTrack===null')
  # A media play must happen synchronously in the click's user activation, never after metadata await.
  p.evaluate('''()=>{const original=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){window.__playSync=window.__insideHandler;window.__playActivation=navigator.userActivation.isActive;return original.call(this)}}''')
  metadata_count=len(seen);click_play(p,'[data-album-play]')
  assert p.evaluate('window.__playSync && window.__playActivation')
  assert p.locator('[data-now-title]').inner_text()=='KAIROS'
  p.wait_for_function('audioManager.audio.currentTime>0 && !audioManager.audio.paused')
  assert len(seen)==metadata_count
  click_play(p,'[data-track="album-6"]');assert p.locator('[data-now-title]').inner_text()=='TU SAIS'
  assert p.evaluate('window.__playSync && window.__playActivation')
  p.click('[data-player-next]');assert p.locator('[data-now-title]').inner_text()=='LPB'
  p.click('[data-player-toggle]');assert p.evaluate('audioManager.audio.paused')
  home(p);assert p.evaluate('audioManager.audio.paused && audioManager.audio.currentTime===0')
  app(p,'music');assert len(seen)==metadata_count
  assert p.locator('[data-apple-art] img').count()==5
  for key in ['sensation','shogun','kany','hatelove']:
   p.click(f'[data-apple-content="{key}"]');assert p.locator('.apple-local-album').count()==1
   assert p.locator('iframe').count()==0 and p.locator('.apple-local-album [data-apple-art] img').count()==1
   assert len(seen)==metadata_count
   click_play(p,'[data-catalog-play]');assert p.evaluate('window.__playSync && window.__playActivation')
   p.wait_for_function('audioManager.audio.currentTime>0 && !audioManager.audio.paused')
   p.click('[data-official-embed]');p.frame_locator('iframe').locator('#fixture').wait_for()
   assert p.evaluate('audioManager.audio.paused && audioManager.audio.currentTime===0')
   assert p.locator('.official-player').get_attribute('data-player-state')=='success'
   p.click('[data-app-back]');assert p.locator('iframe').count()==0
   p.click('[data-app-back]')
  home(p);app(p,'instagram')
  assert p.locator('.ig-manii-top .full-shot').get_attribute('src').endswith('insta-manii-profile.webp')
  assert p.locator('.ig-feed-window > img').get_attribute('src').endswith('insta-manii-feed-current.webp')
  assert p.locator('[data-ig-publications],.ig-profile-official').count()==0
  assert p.locator('[data-ig-post-index]').count()==6
  assert p.locator('iframe').count()==0 and not any('instagram.com/embed.js' in u for u in requests)
  urls=p.evaluate('MANII_REAL_INSTAGRAM_CONTENT')
  for i,url in enumerate(urls):
   tile=p.locator(f'[data-ig-post-index="{i}"]');tile.scroll_into_view_if_needed();scroll=p.locator('[data-ig-profile-scroll]');position=scroll.evaluate('e=>e.scrollTop')
   if i==0:p.screenshot(path=str(OUT/('desktop-grid.png' if desktop else 'mobile-grid.png')))
   tile.click();p.wait_for_function('document.querySelector("[data-ig-real-post]").dataset.embedState==="success"')
   assert p.locator('.ig-real-feed iframe').count()==1
   assert p.locator('.ig-real-feed iframe').get_attribute('data-permalink')==url
   assert p.locator('[data-instagram-public-post]').get_attribute('href')==url
   p.click('[data-app-back]');assert p.locator('iframe').count()==0
   assert abs(p.locator('[data-ig-profile-scroll]').evaluate('e=>e.scrollTop')-position)<2
  assert requests.count('https://www.instagram.com/embed.js')==1
  home(p);app(p,'music');assert len(seen)==metadata_count
  # Session cache prevents even a refresh from performing metadata lookups again.
  p.reload(wait_until='networkidle');p.click('#unlockBtn');no_call(p);p.wait_for_function('appleMetadataState.loaded')
  assert len(seen)==metadata_count
  assert not errors,errors
  p.screenshot(path=str(OUT/('desktop-lock.png' if desktop else 'mobile-lock.png')))
  c.close();print('PASS V8.3', 'desktop' if desktop else 'mobile', ': metadata warming, disabled preparation, priming, synchronous activated Play, 8 Kairos previews, 4 local external albums, cache, real grid, six mapped taps, scroll restoration, no errors/404 (isolated providers)',flush=True)
 b.close()
