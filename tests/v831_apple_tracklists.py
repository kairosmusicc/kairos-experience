"""Full official-lookup-shaped fixtures, never claimed as real catalog counts. No Apple metadata invented in production."""
import json, re, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_fixtures import rich_metadata
ROOT=Path(__file__).resolve().parents[1]
source=(ROOT/'apple-metadata.js').read_text()
play=re.search(r'function playKairos\([^)]*\) \{[\s\S]*?\n\}',source).group()
original=subprocess.check_output(['git','show','v8.3-before-regression-fix:apple-metadata.js'],cwd=ROOT,text=True)
assert play==re.search(r'function playKairos\([^)]*\) \{[\s\S]*?\n\}',original).group(), 'Frozen playKairos changed'
assert 'await' not in play
IDS={'sensation':'6831219034','shogun':'6825863696','hatelove':'6784591752'}
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for desktop in [False,True]:
  c=b.new_context(viewport={'width':1440,'height':1100} if desktop else {'width':402,'height':874},is_mobile=not desktop,has_touch=True,reduced_motion='reduce')
  pending=[];seen=rich_metadata(c,pending);p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
  # A v1 session contains only one song per album and must be invalidated once.
  p.add_init_script('if(!sessionStorage.getItem("v831.seeded")){sessionStorage.setItem("v831.seeded","1");sessionStorage.setItem("kairos.appleMetadata",JSON.stringify({version:1,catalog:{results:[]},songs:{results:[]}}))}')
  p.goto('http://127.0.0.1:8000',wait_until='networkidle');p.click('#unlockBtn');p.evaluate('clearTimeout(callTimer);state.firstUnlockedAt=Date.now()+3600000')
  p.wait_for_function('appleMetadataState.loading');p.wait_for_timeout(150);assert len(pending)==2
  for route,body in pending:
   assert 'limit=1&' not in route.request.url
   if ',' in route.request.url:
    rows=body['results']
    for key,id in IDS.items():
     rows[:]=[r for r in rows if not(r['wrapperType']=='track' and str(r.get('collectionId'))==id)]
     for index in range(3):
      rows.append(dict(wrapperType='track',collectionId=int(id),trackId=int(id)*10+index,trackName=f'Fixture {key} {index+1}',artistName='Fixture artist',trackTimeMillis=120000+index*1000,previewUrl=None if index==0 else f'https://audio-ssl.itunes.apple.com/isolated-test-fixture/{key}-{index}.m4a'))
   route.fulfill(status=200,content_type='application/json',headers={'Access-Control-Allow-Origin':'*'},body=json.dumps(body))
  p.wait_for_function('appleMetadataState.loaded');assert p.evaluate('storedJSON("kairos.appleMetadata",{}).version')==2
  p.evaluate('route("music")')
  for key in IDS:
   p.click(f'[data-apple-content="{key}"]')
   assert p.locator('.apple-local-album [data-apple-art] img').count()==1
   tracks=p.evaluate('(key)=>appleMetadataState.catalog[key].tracks',key)
   assert len(tracks)==3 and tracks[0]['previewUrl'] is None
   assert tracks[1]['duration']==121
   rows=p.locator('[data-catalog-track]');assert rows.count()==3
   assert rows.nth(0).is_disabled() and 'Aperçu indisponible' in rows.nth(0).inner_text()
   assert [rows.nth(i).locator('b').inner_text() for i in range(3)]==[t['title'] for t in tracks]
   # Instrument play inside the click handler; Promise continuations would fail this assertion.
   p.evaluate('''()=>{const orig=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){window.syncPlay=window.inHandler;return orig.call(this)};const el=document.querySelector('[data-catalog-play]'),handler=el.onclick;el.onclick=function(e){window.inHandler=true;try{return handler.call(this,e)}finally{window.inHandler=false}}}''')
   p.click('[data-catalog-play]');assert p.evaluate('window.syncPlay')
   assert p.locator('[data-now-title]').inner_text()==tracks[1]['title']
   p.wait_for_function('audioManager.audio.currentTime>0')
   rows.nth(2).click();assert p.locator('[data-now-title]').inner_text()==tracks[2]['title']
   assert p.locator('iframe').count()==0 and len(seen)==2
   p.click('[data-app-back]')
  p.click('[data-apple-content="kany"]');assert p.locator('[data-catalog-track]').count()==1
  p.click('[data-catalog-play]');p.wait_for_function('audioManager.audio.currentTime>0');p.click('[data-app-back]')
  p.click('[data-apple-content="kairos"]');assert p.locator('[data-track^="album-"]').count()==8
  p.evaluate('''()=>{const el=document.querySelector('[data-album-play]'),handler=el.onclick;el.onclick=function(e){window.inHandler=true;try{return handler.call(this,e)}finally{window.inHandler=false}}}''')
  p.click('[data-album-play]');assert p.evaluate('window.syncPlay');assert p.locator('[data-now-title]').inner_text()=='KAIROS'
  p.click('#homeIndicator');assert p.evaluate('audioManager.audio.paused && audioManager.audio.currentTime===0')
  p.reload(wait_until='networkidle');p.click('#unlockBtn');p.wait_for_function('appleMetadataState.loaded')
  assert len(seen)==2 and p.evaluate('appleMetadataState.catalog.sensation.tracks.length')==3
  assert not errors,errors;c.close()
 b.close();print('PASS Sensation/Shogun/Hatelove: 3 fixture tracks each, all rows retained incl. missing preview; Kany:1; KAIROS:8 unchanged; synchronous playback, v1 migration, v2 session cache, no extra lookup')
