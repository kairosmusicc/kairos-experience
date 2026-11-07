"""Lock thresholds use physical pixels at every scale. Battery fallback is a decorative glyph."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_fixtures import isolate_apple_metadata
BASE='http://127.0.0.1:8000'
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 c=b.new_context(viewport={'width':460,'height':1000},is_mobile=True,has_touch=True,reduced_motion='reduce');isolate_apple_metadata(c)
 p=c.new_page();p.add_init_script('Object.defineProperty(navigator,"getBattery",{value:undefined})')
 for scale in [1,.9,.8,.7]:
  for name,dx,dy,slow,unlocked in [('short',0,-20,True,False),('normal',0,-35,True,True),('long',0,-60,True,True),('flick',0,-20,False,True),('horizontal',70,-5,False,False),('cancel',0,-35,False,False)]:
   p.goto(BASE,wait_until='networkidle');p.evaluate('(s)=>document.documentElement.style.setProperty("--mobile-device-scale",s)',str(scale))
   r=p.locator('.screen').bounding_box();x=r['x']+r['width']/2;y=r['y']+r['height']*.65
   cd=c.new_cdp_session(p);cd.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
   assert p.evaluate('screen.hasPointerCapture(gesture.id)'),'Immediate capture missing'
   if slow:p.wait_for_timeout(400)
   for i in range(1,5):cd.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+dx*i/4,'y':y+dy*i/4}]})
   cd.send('Input.dispatchTouchEvent',{'type':'touchCancel' if name=='cancel' else 'touchEnd','touchPoints':[]});cd.detach();p.wait_for_timeout(50)
   assert p.evaluate('state.phoneUnlocked')==unlocked,(scale,name)
   assert p.evaluate('gesture===null')
  p.goto(BASE,wait_until='networkidle');p.evaluate('(s)=>document.documentElement.style.setProperty("--mobile-device-scale",s)',str(scale))
  p.click('#lockFlashlight');assert p.locator('#lockFlashlight').get_attribute('aria-pressed')=='true';assert not p.evaluate('state.phoneUnlocked')
  p.click('#lockFlashlight');assert p.locator('#lockFlashlight').get_attribute('aria-pressed')=='false'
  p.click('#lockCamera');assert p.locator('.camera-app').count()==1;assert not p.evaluate('state.phoneUnlocked')
  p.click('#homeIndicator');p.click('#unlockBtn');assert p.evaluate('state.phoneUnlocked')
 print('PASS physical lock swipes at scales 1/.9/.8/.7; short/normal/long/flick/horizontal/cancel, flashlight, camera and click fallback',flush=True)
 p.goto(BASE,wait_until='networkidle')
 assert p.locator('#batteryLevel').inner_text()==''
 for dark in (True,False):
  p.evaluate('(dark)=>setStatus(dark)',dark)
  assert p.locator('.battery-unknown').is_visible()
  glyph=p.locator('.battery-unknown').evaluate('e=>({width:parseFloat(getComputedStyle(e,"::before").width),box:e.clientWidth,color:getComputedStyle(e,"::before").backgroundColor})')
  assert .55<glyph['width']/glyph['box']<.75 and glyph['color'] in ['rgb(255, 255, 255)','rgb(17, 17, 17)'],glyph
 c.close()
 c=b.new_context();p=c.new_page();p.add_init_script('navigator.getBattery=()=>Promise.resolve({level:.52,addEventListener(name,fn){window.updateBattery=fn;window.battery=this}})')
 p.goto(BASE,wait_until='networkidle');assert p.locator('#batteryLevel').inner_text()=='52';assert p.locator('.battery-unknown').count()==0
 p.evaluate('battery.level=.73;updateBattery()');assert p.locator('#batteryLevel').inner_text()=='73'
 c.close();b.close();print('PASS honest unknown decorative battery and actual Battery API updates',flush=True)
