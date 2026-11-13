"""Local chat UX and migration. Browser is deliberately offline while discussing."""
import os,json,re
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright
from browser_fixtures import isolate_apple_metadata
BASE=os.environ.get('KAIROS_TEST_URL','http://127.0.0.1:8765')
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);errors=[]
 def boot(desktop=False,seed=None):
  c=b.new_context(viewport={'width':1440,'height':1100} if desktop else {'width':402,'height':874},is_mobile=not desktop,has_touch=True,reduced_motion='reduce');isolate_apple_metadata(c)
  c.route(re.compile(r'https://itunes\.apple\.com/.*[?&]callback='),lambda r:r.fulfill(status=200,content_type='application/javascript',body=parse_qs(urlparse(r.request.url).query)['callback'][0]+'({"resultCount":0,"results":[]})'))
  p=c.new_page();p.on('pageerror',lambda e:errors.append(str(e)))
  if seed:p.add_init_script('if(!sessionStorage.getItem("seeded")){sessionStorage.setItem("seeded","1");sessionStorage.setItem("kairos.progress",JSON.stringify('+json.dumps(seed)+'))}')
  requests=[];p.on('request',lambda r:requests.append(r.url))
  p.goto(BASE,wait_until='load');p.evaluate('state.callHandled=true;unlockPhone();clearTimeout(callTimer);route("messages")');p.wait_for_function('appleMetadataState.loaded');p.click('[data-soriak-row]');p.clock.install()
  return c,p,requests
 def send(p,text):p.fill('[data-soriak-input]',text);p.press('[data-soriak-input]','Enter')
 def done(p):p.clock.run_for(500);p.wait_for_function('state.livingOS.soriak.pendingReply===null')
 def intent(p):return p.evaluate('state.livingOS.events.filter(e=>e.type==="soriak_reply").at(-1).payload.intent')
 c,p,requests=boot();assert p.locator('.bubble-area').inner_text().count('Tu cherches quoi ?')==1
 assert p.locator('#lockSoriakNotification').count()==0 and not p.locator('#storyNotification').is_visible()
 assert p.locator('[data-soriak-input]').get_attribute('readonly') is None
 assert p.locator('[data-soriak-input]').get_attribute('maxlength')=='360'
 assert p.locator('[data-soriak-send]').is_disabled()
 c.set_offline(True);start=len(requests)
 send(p,'  t qui  ');assert p.locator('.bubble-line.me').inner_text()=='t qui'
 assert p.locator('[data-soriak-typing]').is_visible() and p.locator('[data-soriak-send]').is_disabled()
 p.fill('[data-soriak-input]','second');p.press('[data-soriak-input]','Enter');assert p.locator('.bubble-line.me').count()==1
 done(p);assert intent(p)=='ASK_WHO_ARE_YOU';assert p.locator('[data-soriak-input]').input_value()=='second'
 assert p.locator('[data-soriak-send]').is_enabled() and not p.locator('#storyNotification').is_visible()
 assert not p.evaluate('async()=>await SoriakEngine.receiveUserMessage("x".repeat(361))')
 assert not p.evaluate('async()=>await SoriakEngine.receiveUserMessage(" ")')
 last=''
 for _ in range(22):
  send(p,'salut');done(p);current=p.locator('.bubble-line.them').last.inner_text();assert current!=last;last=current
 assert len(requests)==start,'chat must create no network requests, even without connectivity'
 assert p.evaluate('state.livingOS.soriak.dialogue.turn')==23
 c.set_offline(False);p.reload();p.evaluate('state.callHandled=true;unlockPhone();clearTimeout(callTimer);route("messages")');p.click('[data-soriak-row]');c.set_offline(True)
 assert p.locator('.bubble-area').inner_text().count('Tu cherches quoi ?')<=1
 send(p,'salut');done(p);assert p.locator('.bubble-line.them').last.inner_text()!=last
 # Context is read-only for the dialogue and earned clues remain separate.
 p.evaluate('state.attempts.abeg=5;state.attempts.tout=0')
 send(p,'aide abeg');done(p);assert 'date' in p.locator('.bubble-line.them').last.inner_text()
 assert p.evaluate('state.attempts.abeg===5 && !state.abegUnlocked')
 p.evaluate('state.abegUnlocked=true');send(p,'code abeg');done(p)
 assert any(word in p.locator('.bubble-line.them').last.inner_text() for word in ['ouvert','ouverte','déverrouillé'])
 p.evaluate('state.unknownFirstDeclined=true');send(p,"pk tu m'appelles");done(p);assert intent(p)=='ASK_CALL'
 send(p,'wsh donne un indice');p.evaluate('goHome()');done(p)
 assert p.locator('#storyNotification').is_visible() and p.evaluate('state.livingOS.soriak.unreadCount')==1
 p.click('#storyNotification .story-open');assert p.locator('#lockSoriakNotification').count()==0
 assert not p.evaluate('state.livingOS.soriak.thread.filter(m=>m.role==="soriak").some(m=>SoriakPolicy.containsAnswer(m.text))')
 assert not any('/api/' in url for url in requests)
 c.close();print('PASS offline editable chat, Enter, typing, double-send, >18 replies, no network/quota, memory refresh, state/hints, navigation/unread and secrets',flush=True)
 # Old V9.1 request recovery: no API call, no lost exchange, no quota state.
 seed={'livingOS':{'soriak':{'aiRequests':18,'thread':[{'id':'user:old','role':'user','text':'t qui','at':10,'source':'interactive'}],'pendingRequest':{'id':'user:old','message':'t qui','at':10}},'notificationHistory':[]}}
 c,p,requests=boot(desktop=True,seed=seed)
 assert p.locator('.bubble-line.me').inner_text()=='t qui'
 assert p.evaluate('state.livingOS.soriak.thread.filter(m=>m.id==="reply:user:old").length')==1
 assert not p.evaluate('"aiRequests" in state.livingOS.soriak || "pendingRequest" in state.livingOS.soriak')
 send(p,'merci');done(p);assert intent(p)=='USER_THANKS'
 p.evaluate('for(let i=0;i<65;i++)state.livingOS.soriak.thread.push({id:"seed"+i,role:"user",text:"ok",at:Date.now(),source:"interactive"});persistProgress()');p.reload()
 assert p.evaluate('state.livingOS.soriak.thread.length')==60
 assert not any('/api/' in url for url in requests)
 c.close();assert not errors,errors;b.close();print('PASS desktop Enter, old pending-request migration, bounded thread, no provider requests and no page errors',flush=True)
