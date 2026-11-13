"""First attempt, native notification delivery, optional audio and lore in real UI."""
import os,re
from urllib.parse import parse_qs,urlparse
from playwright.sync_api import sync_playwright
from browser_fixtures import isolate_apple_metadata
BASE=os.environ.get('KAIROS_TEST_URL','http://127.0.0.1:8765')
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);errors=[]
 def boot(missing=False):
  c=b.new_context(viewport={'width':402,'height':874},is_mobile=True,has_touch=True,reduced_motion='reduce');isolate_apple_metadata(c)
  if missing:c.route('**/assets/audio/soriak-notification.mp3',lambda r:r.fulfill(status=404,body=''))
  c.route(re.compile(r'https://itunes\.apple\.com/.*[?&]callback='),lambda r:r.fulfill(status=200,content_type='application/javascript',body=parse_qs(urlparse(r.request.url).query)['callback'][0]+'({"resultCount":0,"results":[]})'))
  p=c.new_page();p.on('pageerror',lambda e:errors.append(str(e)))
  p.add_init_script('''window.__soriakAudible=0;const original=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(...args){if(this.src.includes('soriak-notification.mp3')&&!this.muted)window.__soriakAudible++;return original.apply(this,args);};''')
  p.clock.install();p.goto(BASE,wait_until='load');p.evaluate('state.callHandled=true;unlockPhone();clearTimeout(callTimer);route("files")');p.wait_for_function('appleMetadataState.loaded');p.click('[data-file="abeg"]')
  return c,p
 def fail(p):p.fill('#codeField','0000');p.click('[data-unlock]')
 def received(p):return p.evaluate('state.livingOS.notificationHistory.filter(n=>n.messageId==="first-attempt").length')
 c,p=boot();fail(p);p.evaluate('goHome();route("notes")');p.clock.run_for(3100)
 assert p.evaluate('state.currentApp')=='notes' and p.locator('#storyNotification').is_visible()
 assert 'SORIAK' in p.locator('#storyNotification').inner_text() and 'Déjà ?' in p.locator('#storyNotification').inner_text()
 assert received(p)==1 and p.evaluate('__soriakAudible')==1
 for _ in range(4):p.evaluate('emitOSEvent("secret_attempt_failed",{secret:"abeg",attempts:1});processPendingOSEffects()')
 assert received(p)==1 and p.evaluate('__soriakAudible')==1
 r=p.locator('.screen').bounding_box();n=p.locator('#storyNotification').bounding_box()
 assert n['x']>=r['x'] and n['x']+n['width']<=r['x']+r['width'] and n['y']>=r['y']
 p.click('#storyNotification .story-open');assert p.locator('[data-soriak-thread]').count()==1
 assert p.evaluate('state.livingOS.soriak.unreadCount')==0 and not p.locator('#storyNotification').is_visible()
 p.reload();p.evaluate('state.callHandled=true;unlockPhone();clearTimeout(callTimer)');p.clock.run_for(3500)
 assert received(p)==1 and p.evaluate('__soriakAudible')==0;c.close()
 for destination in ['soriak','paapii']:
  c,p=boot();fail(p);p.evaluate('goHome();route("messages")');p.click('[data-soriak-row]' if destination=='soriak' else '[data-msg-thread="paapii"]');p.clock.run_for(3100)
  assert p.locator('#storyNotification').is_visible()==(destination=='paapii')
  assert received(p)==1 and p.evaluate('__soriakAudible')==1
  if destination=='paapii':p.clock.run_for(6200);assert not p.locator('#storyNotification').is_visible()
  c.close()
 for scale in [1,.9,.8,.7]:
  c,p=boot();p.set_viewport_size({'width':460,'height':1000});p.evaluate('(s)=>document.documentElement.style.setProperty("--mobile-device-scale",String(s))',scale)
  fail(p);p.evaluate('goHome();route("notes")');p.clock.run_for(3100)
  r=p.locator('.screen').bounding_box();n=p.locator('#storyNotification').bounding_box()
  assert n and n['x']>=r['x']-1 and n['x']+n['width']<=r['x']+r['width']+1,(scale,r,n)
  p.click('#storyNotification .story-open');assert p.locator('[data-soriak-thread]').count()==1;c.close()
 c,p=boot();p.fill('#codeField','1029');p.click('[data-unlock]');p.evaluate('goHome();route("notes")');p.clock.run_for(3100)
 assert p.evaluate('state.abegUnlocked') and received(p)==1 and p.locator('#storyNotification').is_visible();c.close()
 c,p=boot();fail(p);p.evaluate('returnToLock()');p.clock.run_for(3100);p.locator('#storyNotification .story-open').tap()
 assert p.locator('[data-soriak-thread]').count()==1;c.close()
 c,p=boot(missing=True);fail(p);p.evaluate('goHome();route("notes")');p.clock.run_for(3100)
 assert received(p)==1 and p.locator('#storyNotification').is_visible();p.click('#storyNotification .story-open')
 assert p.locator('[data-soriak-input]').is_enabled();c.close()
 print('PASS first failed attempt → banner from Notes/other conversation, direct opening, same-thread suppression, auto-dismiss, sound once, refresh dedup, missing-file safety',flush=True)
 c,p=boot();p.evaluate('goHome();route("messages")');p.click('[data-soriak-row]')
 def say(text):
  p.fill('[data-soriak-input]',text);p.press('[data-soriak-input]','Enter');p.clock.run_for(500);p.wait_for_function('state.livingOS.soriak.pendingReply===null');return p.locator('.bubble-line.them').last.inner_text()
 assert 'Bandite' in say('ton top 3') and 'Bandite' in say('ton préféré')
 assert 'Bandite' in say('pourquoi ?')
 answer=say("Manii c'est qui");assert any(x in answer for x in ['Ephrem','Manii'])
 answer=say('et lui ?');assert any(x in answer for x in ['Paapii','Ange'])
 assert '29 octobre' in say('Kairos est sorti quand ?')
 answer=say("et qui l'a fait ?");assert any(x in answer for x in ['Manii','Paapii'])
 assert '29 octobre' in say('et quand ?')
 answer=say('ça veut dire quoi Kairos');assert any(x in answer for x in ['moment','décision'])
 answer=say('qui est le réalisateur');assert any(x in answer for x in ['Ephrem','Manii'])
 assert p.evaluate('!state.abegUnlocked && !state.toutGacherUnlocked && state.attempts.abeg===0 && state.attempts.tout===0')
 assert p.evaluate('!state.livingOS.soriak.sentMessageIds.includes("first-attempt")')
 c.close();assert not errors,errors;b.close();print('PASS lore and conversational follows through composer; no canonical question triggers puzzle attempts or unlocking',flush=True)
