"""V9.1 proactive Living OS regressions; SORIAK visibility is unconditional."""
import os,re
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright
from browser_fixtures import isolate_apple_metadata,rich_metadata
BASE=os.environ.get('KAIROS_TEST_URL','http://127.0.0.1:8765')
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);errors=[]
 def boot(rich=False):
  c=b.new_context(viewport={'width':402,'height':874},is_mobile=True,has_touch=True,reduced_motion='reduce')
  rich_metadata(c) if rich else isolate_apple_metadata(c)
  c.route(re.compile(r'https://itunes\.apple\.com/.*[?&]callback='),lambda r:r.fulfill(status=200,content_type='application/javascript',body=parse_qs(urlparse(r.request.url).query)['callback'][0]+'({"resultCount":0,"results":[]})'))
  p=c.new_page();p.on('pageerror',lambda e:errors.append(str(e)));p.clock.install();p.goto(BASE+'/?livingDebug=1',wait_until='load')
  p.evaluate('state.callHandled=true;unlockPhone();clearTimeout(callTimer);route("messages")');p.wait_for_function('appleMetadataState.loaded')
  assert p.locator('[data-soriak-row]').count()==1 and p.locator('#lockSoriakNotification').count()==0
  return c,p
 def fail(p,k,n):
  p.evaluate('(k)=>{route(k==="abeg"?"files":"whatsapp");showPassword(k)}',k)
  for i in range(n):
   p.fill('#codeField','0000');p.click('[data-unlock]');assert p.locator('#passwordFeedback').inner_text()==('Code incorrect' if k=='abeg' else 'Mot de passe incorrect')
 def tick(p,n=5000):p.clock.run_for(n)
 def sent(p,id):return p.evaluate('(id)=>state.livingOS.soriak.sentMessageIds.includes(id)',id)
 def wait_sent(p,id):
  for _ in range(25):
   tick(p,1000)
   if sent(p,id):return
   dismiss(p)
  assert sent(p,id),id
 def dismiss(p):p.evaluate('notifications.hide()')
 c,p=boot();p.evaluate('route("files");showPassword("abeg")')
 assert p.evaluate('!state.livingOS.pending.length')
 tick(p,30000);assert p.evaluate('!state.livingOS.notificationHistory.length')
 fail(p,'abeg',1);p.evaluate('goHome();route("notes")');tick(p)
 assert sent(p,'first-attempt') and p.locator('#storyNotification').is_visible()
 p.evaluate('returnToLock()');p.locator('#lockSoriakNotification').tap()
 assert p.locator('[data-soriak-thread]').count()==1 and p.locator('#lockSoriakNotification').count()==0
 p.reload();p.evaluate('state.callHandled=true;unlockPhone();clearTimeout(callTimer);route("messages")')
 assert p.locator('[data-soriak-row]').count()==1 and p.locator('#lockSoriakNotification').count()==0
 c.close();print('PASS immediate access, first-attempt reaction before all ambient activity, delayed native banner, lock-card tap/read and refresh',flush=True)
 c,p=boot();fail(p,'abeg',3)
 assert p.evaluate('state.livingOS.pending.filter(e=>e.ruleId==="soriak-abeg-struggle").length')==1
 due=p.evaluate('state.livingOS.pending.find(e=>e.ruleId==="soriak-abeg-struggle").dueAt')
 p.reload();p.evaluate('state.callHandled=true;unlockPhone();clearTimeout(callTimer)')
 assert p.evaluate('state.attempts.abeg')==3
 assert p.evaluate('state.livingOS.pending.find(e=>e.ruleId==="soriak-abeg-struggle").dueAt')==due
 wait_sent(p,'abeg-struggle');dismiss(p)
 fail(p,'abeg',2);p.evaluate('goHome()');wait_sent(p,'abeg-date');dismiss(p)
 fail(p,'abeg',2);p.evaluate('goHome()');wait_sent(p,'abeg-other');dismiss(p)
 p.evaluate('route("files");showPassword("abeg");trySecret("abeg","1029");goHome();route("photos")');wait_sent(p,'abeg-success')
 assert sent(p,'abeg-success') and p.evaluate('state.livingOS.soriak.sentMessageIds.filter(id=>id==="abeg-success").length')==1
 assert not p.evaluate('state.livingOS.pending.some(e=>e.ruleId==="soriak-protected-file" || /soriak-abeg-(date|other|struggle)/.test(e.ruleId))')
 c.close();print('PASS generic ABEG failures, persisted deadlines, separate hint stages, obsolete cancellation and success once',flush=True)
 c,p=boot();fail(p,'tout',3);p.evaluate('goHome()');wait_sent(p,'time-number');dismiss(p)
 fail(p,'tout',2);p.evaluate('goHome()');wait_sent(p,'time-project')
 assert p.evaluate('state.attempts.abeg')==0
 c.close();print('PASS separate TIME hint path without leaked answers',flush=True)
 for block in ['call','facetime','modal','hidden','banner']:
  c,p=boot();fail(p,'abeg',3)
  p.evaluate('''kind=>{if(kind==='call')state.callStatus='ringing';if(kind==='facetime')state.facetimeActive=true;if(kind==='modal')modal.classList.remove('hidden');if(kind==='hidden')Object.defineProperty(document,'hidden',{value:true,configurable:true});if(kind==='banner')notifications.key='other';}''',block)
  tick(p);assert not sent(p,'abeg-struggle')
  p.reload();p.evaluate('state.callHandled=true;unlockPhone();clearTimeout(callTimer)');wait_sent(p,'abeg-struggle');assert sent(p,'abeg-struggle')
  dismiss(p);tick(p);assert p.evaluate('state.livingOS.soriak.sentMessageIds.filter(id=>id==="abeg-struggle").length')==1;c.close()
 print('PASS calls/FaceTime/modal/hidden/banner defer safely through refresh without duplicate delivery',flush=True)
 c,p=boot();p.evaluate('state.callHandled=false;triggerIncomingCall();declineCall();updatePhoneSignals()');assert p.locator('#lockCallNotification').count()==1
 p.evaluate('route("phone");goHome();for(let i=0;i<130;i++)emitOSEvent("navigation")');p.reload();p.evaluate('state.callHandled=true;unlockPhone();clearTimeout(callTimer)')
 assert p.locator('#lockCallNotification').count()==0;c.close()
 c,p=boot(rich=True);p.evaluate('route("music")');assert p.locator('.apple-recent-item').count()==0
 p.click('[data-music-album]');p.click('[data-track="album-6"]');p.wait_for_function('state.livingOS.recentlyPlayed.length===1')
 p.reload();p.evaluate('state.callHandled=true;unlockPhone();clearTimeout(callTimer);route("music")');assert 'TU SAIS' in p.locator('.apple-recent').inner_text()
 c.close();assert not errors,errors;b.close();print('PASS read missed-call persistence and actual TU SAIS playback history; no page errors',flush=True)
