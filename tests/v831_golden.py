"""Capture frozen screens identically before/after. Known Battery API isolates the intentional unknown-glyph fix."""
import os, sys, json
from pathlib import Path
from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright
from browser_fixtures import isolate_apple_metadata
BASE=os.environ.get('KAIROS_TEST_URL','http://127.0.0.1:8000')
phase=sys.argv[1] if len(sys.argv)>1 else 'after'
ROOT=Path('/tmp/kairos-v831-golden');out=ROOT/phase;out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for desktop in (False,True):
  c=b.new_context(viewport={'width':1440,'height':1100} if desktop else {'width':402,'height':874},has_touch=True,is_mobile=not desktop,reduced_motion='reduce')
  isolate_apple_metadata(c);p=c.new_page()
  p.add_init_script('navigator.getBattery=()=>Promise.resolve({level:.63,addEventListener(){}})')
  p.clock.install(time=__import__('datetime').datetime(2026,11,7,12,0,0,tzinfo=__import__('datetime').timezone.utc))
  p.goto(BASE,wait_until='networkidle');p.click('#unlockBtn')
  p.evaluate('clearTimeout(callTimer);state.callHandled=true;state.firstUnlockedAt=Date.now()+3600000')
  for name in ['home','messages','whatsapp','notes','phone','facetime','files','instagram-inbox','emmanuella','safari','spotify']:
   p.evaluate('goHome()')
   if name!='home':
    p.evaluate('(name)=>route(name)', 'instagram' if name in ['instagram-inbox','emmanuella'] else name)
    if name in ['instagram-inbox','emmanuella']:p.click('[data-ig-view="inbox"]')
    if name=='emmanuella':p.click('[data-ig-thread="emmanuella"]')
   p.wait_for_timeout(250)
   p.evaluate('Promise.all(Array.from(document.images).filter(i=>i.getBoundingClientRect().width).map(i=>i.decode().catch(()=>{})))')
   p.screenshot(path=str(out/f'{"desktop" if desktop else "mobile"}-{name}.png'),animations='disabled',caret='hide')
  c.close()
 b.close()
if phase=='after':
 report={}
 for path in sorted(out.glob('*.png')):
  before=Image.open(ROOT/'before'/path.name).convert('RGB');after=Image.open(path).convert('RGB')
  diff=ImageChops.difference(before,after);bbox=diff.getbbox()
  pixels=list(diff.get_flattened_data())
  changed=sum(max(rgb)>8 for rgb in pixels)
  max_delta=max(max(rgb) for rgb in pixels)
  # Full frames, no masks. Allow only tiny blur/compositor rounding between runs.
  unchanged=max_delta<=24 and changed/(after.width*after.height)<=.00005
  report[path.name]={'pixel_identical':bbox is None,'unchanged':unchanged,'pixels_delta_over_8':changed,'max_channel_delta':max_delta,'bbox':bbox}
  if bbox:diff.save(ROOT/('DIFF-'+path.name))
 (ROOT/'comparison.json').write_text(json.dumps(report,indent=2))
 assert all(item['unchanged'] for item in report.values()),report
 print('PASS golden: 22/22 frozen screenshots unchanged (full-frame raster tolerance: max delta 24 and <=0.005% pixels delta>8)')
else:print('Saved 22 pre-fix golden screenshots',out)
