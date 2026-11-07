"""Exact six-cell mapping and full, uncropped V2 image. Official embeds isolated explicitly."""
from playwright.sync_api import sync_playwright
from browser_fixtures import isolate_apple_metadata,isolate_instagram_embeds
EXPECTED=['DfXpuedCD04','DfP7VvKodGb','DfKoj85o1Ya','DfFiuwHIyyN','De90ubzOOuZ','DezXPBwiOxd']
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for desktop in [False,True]:
  c=b.new_context(viewport={'width':1440,'height':1100} if desktop else {'width':402,'height':874},is_mobile=not desktop,has_touch=True,reduced_motion='reduce');isolate_apple_metadata(c);isolate_instagram_embeds(c)
  p=c.new_page();errors=[];requests=[];p.on('pageerror',lambda e:errors.append(str(e)));p.on('request',lambda r:requests.append(r.url))
  p.goto('http://127.0.0.1:8000',wait_until='networkidle');p.click('#unlockBtn');p.evaluate('clearTimeout(callTimer);state.firstUnlockedAt=Date.now()+3600000');p.evaluate('route("instagram")')
  assert p.evaluate('MANII_GRID_POST_ORDER')==[5,4,3,2,1,0]
  assert p.locator('[data-ig-publications]').count()==0
  img=p.locator('.ig-feed-window > img');assert img.get_attribute('src').endswith('insta-manii-feed-current-v2.webp')
  p.wait_for_function('document.querySelector(".ig-feed-window > img").naturalHeight>0')
  assert img.evaluate('e=>{const r=e.getBoundingClientRect();return Math.abs(r.width/r.height-e.naturalWidth/e.naturalHeight)<.001&&getComputedStyle(e).marginTop==="0px"&&getComputedStyle(e).objectFit==="contain"}')
  assert p.locator('.ig-feed-window').evaluate('e=>getComputedStyle(e).overflow!=="hidden"')
  assert not any('embed.js' in u for u in requests)
  for cell,shortcode in enumerate(EXPECTED):
   tile=p.locator(f'[data-ig-grid-cell="{cell}"]');assert tile.get_attribute('data-ig-post-index')==str(5-cell)
   tile.scroll_into_view_if_needed();p.wait_for_timeout(50)
   box=tile.bounding_box();root=p.locator('.ig-profile .ig-scroll').bounding_box()
   assert box['y']>=root['y']-1 and box['y']+box['height']<=root['y']+root['height']+1,(cell,box,root)
   position=p.locator('.ig-profile .ig-scroll').evaluate('e=>e.scrollTop')
   tile.click();p.wait_for_function('document.querySelector("[data-ig-real-post]").dataset.embedState==="success"')
   assert shortcode in p.locator('.ig-real-feed iframe').get_attribute('data-permalink')
   assert p.locator('iframe').count()==1
   p.click('[data-app-back]');assert p.locator('iframe').count()==0
   assert abs(p.locator('.ig-profile .ig-scroll').evaluate('e=>e.scrollTop')-position)<2
  assert requests.count('https://www.instagram.com/embed.js')==1
  assert not errors,errors
  c.close()
 b.close();print('PASS full V2 image and both complete rows; cells map 5/4/3/2/1/0; isolated embeds, no preload and scroll restored')
