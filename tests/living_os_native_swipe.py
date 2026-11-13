"""Native lockscreen regression with physical touch coordinates at four scales."""
import sys, time, os
from browser_fixtures import isolate_apple_metadata
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 c=b.new_context(viewport={'width':460,'height':1000},is_mobile=True,has_touch=True)
 isolate_apple_metadata(c);p=c.new_page();cd=c.new_cdp_session(p);count=0
 def load(scale):
  p.goto(os.environ.get('KAIROS_TEST_URL','http://127.0.0.1:8765'),wait_until='load');p.evaluate('(s)=>document.documentElement.style.setProperty("--mobile-device-scale",s)',str(scale));p.wait_for_timeout(230)
 def drag(selector,dx,dy,slow=True,cancel=False,success=False):
  global count
  r=p.locator(selector).bounding_box();x=r['x']+r['width']/2;y=r['y']+r['height']/2
  stamp=time.time()
  cd.send('Input.dispatchTouchEvent',{'timestamp':stamp,'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
  assert p.evaluate('screen.hasPointerCapture(gesture.id) && !state.phoneUnlocked && home.classList.contains("lock-home-preview")')
  steps=4 if slow else 2
  for i in range(1,steps+1):
   cd.send('Input.dispatchTouchEvent',{'timestamp':time.time() if slow else stamp+i*.016,'type':'touchMove','touchPoints':[{'x':x+dx*i/steps,'y':y+dy*i/steps}]})
   if slow:p.wait_for_timeout(70)
  if slow:p.wait_for_timeout(20)
  if slow and dx==0 and dy < -28:
   assert p.evaluate('parseFloat(lock.style.getPropertyValue("--lock-drag-y")) < -28'),(scale,selector,dx,dy,p.evaluate('lock.style.cssText'))
  cd.send('Input.dispatchTouchEvent',{'timestamp':time.time() if slow else stamp+(steps+1)*.016,'type':'touchCancel' if cancel else 'touchEnd','touchPoints':[]})
  if success:assert not p.evaluate('state.phoneUnlocked'), 'state changed before animation'
  p.wait_for_timeout(350)
  assert p.evaluate('state.phoneUnlocked')==success,(scale,selector,dx,dy,cancel)
  assert p.evaluate('gesture===null && !lock.style.getPropertyValue("--lock-drag-y") && !home.classList.contains("lock-home-preview") && !lock.classList.contains("lock-settling")')
  count+=1
 for scale in [1,.9,.8,.7]:
  for selector in ['#lockTime','#unlockBtn','#homeIndicator']:
   load(scale);p.locator(selector).tap();p.wait_for_timeout(300);assert not p.evaluate('state.phoneUnlocked');count+=1
  for selector in ['#lockTime','#unlockBtn','.lock-view']:
   load(scale);drag(selector,0,-80,success=True)
  for dx,dy,slow,cancel,success in [(0,-20,True,False,False),(0,-55,False,False,True),(80,-5,True,False,False),(80,-40,True,False,False),(0,-70,True,True,False)]:
   load(scale);drag('#lockTime',dx,dy,slow,cancel,success)
  for selector in ['#lockFlashlight','#lockCamera']:
   load(scale);p.locator(selector).tap();p.wait_for_timeout(300)
   assert p.evaluate('state.flashlightOn' if selector=='#lockFlashlight' else 'state.lockCameraActive');assert not p.evaluate('state.phoneUnlocked');count+=1
   for dx,dy in [(0,-20),(25,-5)]:
    load(scale);drag(selector,dx,dy)
    assert not p.evaluate('state.flashlightOn || state.lockCameraActive')
  print('PASS scale',scale,flush=True)
 print('PASS',count,'touch cases')
 b.close()
