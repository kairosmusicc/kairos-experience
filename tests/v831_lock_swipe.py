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
  for origin in ('middle','bottom'):
   for name,dx,dy,slow,unlocked in [('short',0,-15,True,False),('normal',0,-30,True,True),('long',0,-60,True,True),('flick',0,-18,False,True),('horizontal',70,-5,False,False),('diagonal',70,-30,False,False),('cancel',0,-35,False,False)]:
    p.goto(BASE,wait_until='networkidle');p.evaluate('(s)=>document.documentElement.style.setProperty("--mobile-device-scale",s)',str(scale))
    r=p.locator('.screen').bounding_box();x=r['x']+r['width']/2;y=r['y']+r['height']*(.99 if origin=='bottom' else .55)
    cd=c.new_cdp_session(p);cd.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
    assert p.evaluate('screen.hasPointerCapture(gesture.id) || document.querySelector("#homeIndicator").hasPointerCapture(gesture.id)'),'Immediate capture missing'
    if slow:p.wait_for_timeout(400)
    for i in range(1,5):cd.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+dx*i/4,'y':y+dy*i/4}]})
    if dy<0 and abs(dy)>abs(dx)*.65:
     offset=p.evaluate('parseFloat(lock.style.getPropertyValue("--lock-swipe-y"))')
     assert -28<=offset<0,(scale,name,offset)
    cd.send('Input.dispatchTouchEvent',{'type':'touchCancel' if name=='cancel' else 'touchEnd','touchPoints':[]});cd.detach();p.wait_for_timeout(160)
    assert p.evaluate('state.phoneUnlocked')==unlocked,(scale,origin,name)
    assert p.evaluate('gesture===null && !lock.style.getPropertyValue("--lock-swipe-y") && !lock.classList.contains("lock-dragging")')
  p.goto(BASE,wait_until='networkidle');p.evaluate('(s)=>document.documentElement.style.setProperty("--mobile-device-scale",s)',str(scale))
  r=p.locator('.screen').bounding_box();p.touchscreen.tap(r['x']+r['width']*.1,r['y']+r['height']*.5);assert not p.evaluate('state.phoneUnlocked')
  for selector in ['#lockTime','#lockDate','#unlockBtn','#homeIndicator']:
   p.locator(selector).tap();assert not p.evaluate('state.phoneUnlocked'),(scale,selector)
  p.locator('#lockFlashlight').tap();assert p.locator('#lockFlashlight').get_attribute('aria-pressed')=='true';assert not p.evaluate('state.phoneUnlocked')
  p.locator('#lockFlashlight').tap();assert p.locator('#lockFlashlight').get_attribute('aria-pressed')=='false'
  p.locator('#lockCamera').tap();assert p.locator('.camera-app').count()==1;assert not p.evaluate('state.phoneUnlocked')
  p.click('#homeIndicator');assert p.locator('#lock.active-view').count()==1
  p.locator('#unlockBtn').tap();p.locator('#homeIndicator').tap();assert not p.evaluate('state.phoneUnlocked')
  # A first normal swipe can also start on the time, date or text itself.
  for selector in ['#lockTime','#lockDate','#unlockBtn']:
   p.goto(BASE,wait_until='networkidle');p.evaluate('(s)=>document.documentElement.style.setProperty("--mobile-device-scale",s)',str(scale))
   box=p.locator(selector).bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2
   cd=c.new_cdp_session(p);cd.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
   cd.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y-35}]});cd.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});cd.detach()
   assert p.evaluate('state.phoneUnlocked'),(scale,selector)
 print('PASS scales 1/.9/.8/.7: no tap unlock, middle/bottom swipes, time/date/text origins, short/flick/horizontal/diagonal/cancel, content feedback/reset and lamp/camera taps',flush=True)
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
 c.close();print('PASS honest unknown decorative battery and actual Battery API updates',flush=True)
 c=b.new_context(viewport={'width':402,'height':874},is_mobile=True,has_touch=True,reduced_motion='reduce');isolate_apple_metadata(c);p=c.new_page()
 p.goto(BASE,wait_until='networkidle')
 box=p.locator('.screen').bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']*.6
 cd=c.new_cdp_session(p);cd.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]});cd.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y-60}]});cd.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});cd.detach()
 p.wait_for_timeout(400)
 p.evaluate('clearTimeout(callTimer);state.firstUnlockedAt=Date.now()+3600000');p.evaluate('route("messages")')
 assert 'lis-la pas comme un français.' in p.locator('[data-msg-thread="paapii"]').inner_text()
 p.click('[data-msg-thread="paapii"]')
 expected=[['them','t’as gardé le bounce d’abeg ?'],['me','ouais dans Fichiers'],['me','par contre j’ai verrouillé le truc et j’ai oublié le code 😭'],['them','mdrrrr t’es sérieux'],['me','rappelle-moi'],['them','non cherche un peu'],['me','frère 😭'],['them','c’est lié au projet'],['me','ça m’aide de fou merci'],['them','la date'],['me','29/10'],['them','voilà'],['me','et donc ?'],['them','lis-la pas comme un français.']]
 assert p.evaluate('IMessageThreads.paapii.messages')==expected
 assert '1029' not in p.locator('.bubble-area').inner_text()
 label=p.locator('.delivery-label');assert label.count()==1
 assert label.evaluate('e=>e.previousElementSibling.matches(".bubble-line.me") && e.previousElementSibling.innerText==="et donc ?" && e.nextElementSibling.matches(".bubble-line.them")')
 label.scroll_into_view_if_needed()
 p.screenshot(path='/tmp/kairos-imessage-original-delivery.png')
 box=label.bounding_box();blue=p.locator('.bubble-line.me').last.bounding_box();assert box['y']>=blue['y']+blue['height'] and box['y']-(blue['y']+blue['height'])<12
 p.fill('.imessage-compose input','test réponse');p.click('.imessage-compose [type="submit"]')
 assert p.locator('.delivery-label').count()==1 and p.locator('.delivery-label').evaluate('e=>e.previousElementSibling.matches(".bubble-line.me") && e.previousElementSibling.innerText==="test réponse"')
 p.screenshot(path='/tmp/kairos-imessage-delivery.png')
 c.close();b.close();print('PASS exact Paapii narrative, preview, no explicit code, delivery under last sent message including new reply',flush=True)
