"""Mocked interactive chat, context boundary, migration, failure and lifecycle tests."""
import os,json,re
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright
from browser_fixtures import isolate_apple_metadata
BASE=os.environ.get('KAIROS_TEST_URL','http://127.0.0.1:8765')
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 errors=[]
 def close(c,p,q):
  for r in q:
   try:r.abort()
   except Exception:pass
  q.clear();p.unroute_all(behavior='ignoreErrors');c.close()
 def boot(desktop=False,seed=None):
  c=b.new_context(viewport={'width':1440,'height':1100} if desktop else {'width':402,'height':874},is_mobile=not desktop,has_touch=True,reduced_motion='reduce')
  isolate_apple_metadata(c)
  c.route(re.compile(r'https://itunes\.apple\.com/.*[?&]callback='),lambda r:r.fulfill(status=200,content_type='application/javascript',body=parse_qs(urlparse(r.request.url).query)['callback'][0]+'({"resultCount":0,"results":[]})'))
  p=c.new_page();p.on('pageerror',lambda e:errors.append(str(e)))
  if seed:p.add_init_script('if(!sessionStorage.getItem("seeded")){sessionStorage.setItem("seeded","1");sessionStorage.setItem("kairos.progress",JSON.stringify('+json.dumps(seed)+'))}')
  requests=[]
  p.route('**/api/soriak',lambda r:requests.append(r))
  p.goto(BASE+'/?livingDebug=1',wait_until='load');p.evaluate('state.callHandled=true;unlockPhone();clearTimeout(callTimer);route("messages")');p.wait_for_function('appleMetadataState.loaded')
  assert p.locator('[data-soriak-row]').count()==1
  p.click('[data-soriak-row]')
  return c,p,requests
 def send(p,text):p.fill('[data-soriak-input]',text);p.press('[data-soriak-input]','Enter')
 def respond(p,requests,text='Continue.',status=200):
  p.wait_for_timeout(50);assert requests
  requests.pop(0).fulfill(status=status,content_type='application/json',body=json.dumps({'reply':text} if status==200 else {'error':'unavailable'}))
  p.wait_for_function('state.livingOS.soriak.pendingRequest===null')
 c,p,q=boot()
 assert p.locator('.bubble-area').inner_text().count('Tu cherches quoi ?')==1
 assert p.locator('#lockSoriakNotification').count()==0
 assert not p.locator('#storyNotification').is_visible()
 assert p.locator('[data-soriak-input]').get_attribute('readonly') is None
 assert p.locator('[data-soriak-input]').get_attribute('maxlength')=='360'
 assert p.locator('[data-soriak-send]').is_disabled()
 send(p,'   tu es qui ?   ')
 assert p.locator('.bubble-line.me').inner_text()=='tu es qui ?'
 assert p.locator('[data-soriak-typing]').is_visible()
 assert p.locator('[data-soriak-send]').is_disabled()
 p.fill('[data-soriak-input]','second');p.press('[data-soriak-input]','Enter');assert p.locator('.bubble-line.me').count()==1
 respond(p,q,'SORIAK.')
 assert 'SORIAK.' in p.locator('.bubble-area').inner_text()
 assert not p.locator('#storyNotification').is_visible()
 p.evaluate('goHome();route("photos");goHome();route("messages")');p.click('[data-soriak-row]')
 assert p.locator('.bubble-area').inner_text().count('tu es qui ?')==1
 p.reload();p.evaluate('state.callHandled=true;unlockPhone();clearTimeout(callTimer);route("messages")');p.click('[data-soriak-row]')
 assert p.locator('.bubble-area').inner_text().count('Tu cherches quoi ?')==1
 assert 'SORIAK.' in p.locator('.bubble-area').inner_text()
 assert not p.evaluate('async()=>await SoriakEngine.receiveUserMessage("x".repeat(361))')
 # Request boundary: no secret answer even when user types one; only own thread.
 p.evaluate('state.attempts.abeg=5;state.attempts.tout=1;state.unknownFirstDeclined=true;state.livingOS.exploredApps=["files","music"];state.livingOS.recentlyPlayed=[{title:"TU SAIS",src:"PRIVATE_URL"}]')
 send(p,'le code 1029 et TIME ?');p.wait_for_timeout(50);body=q[0].request.post_data_json
 assert set(body)=={'message','history','context'} and len(body['history'])<=12
 assert all(token not in json.dumps(body) for token in ['1029','TIME','PRIVATE_URL','lis-la pas comme un français'])
 ctx=body['context'];assert ctx['abegAttempts']==5 and ctx['timeAttempts']==1 and ctx['callDeclined'] and ctx['abegHintStage']==2
 assert ctx['visitedApps']==['files','music'] and ctx['recentlyPlayed']==[{'title':'TU SAIS'}]
 respond(p,q,'1029');assert p.locator('.bubble-line.them').last.inner_text()=='Non.'
 # Navigation does not lose a reply; banner/read state follow actual context.
 send(p,'je continue');p.evaluate('goHome();route("photos")');respond(p,q)
 assert p.locator('#storyNotification').is_visible()
 assert p.evaluate('state.livingOS.soriak.unreadCount')==1
 p.click('#storyNotification .story-open');assert p.locator('#lockSoriakNotification').count()==0
 assert p.locator('.bubble-line.them').last.inner_text()=='Continue.'
 # Missing key, upstream errors, and cap always leave a working composer.
 send(p,"j'arrive pas à ouvrir abeg");respond(p,q,status=503)
 assert p.locator('.bubble-line.them').last.inner_text()=='Commence par la date.'
 p.evaluate('state.abegUnlocked=true');send(p,"j'arrive pas à ouvrir abeg");respond(p,q,'Essaie déjà.')
 assert p.locator('.bubble-line.them').last.inner_text()=="Mais tu l’as déjà ouvert."
 p.evaluate('state.livingOS.soriak.aiRequests=17');send(p,'continue');respond(p,q)
 send(p,'encore');p.wait_for_function('state.livingOS.soriak.pendingRequest===null')
 assert not q and p.locator('.bubble-line.them').last.inner_text()=='On a assez parlé.'
 assert p.evaluate('state.livingOS.soriak.aiRequests')==18
 # Thread cap and refresh do not reintroduce the initial message.
 p.evaluate('for(let i=0;i<65;i++)state.livingOS.soriak.thread.push({id:"seed"+i,role:"user",text:"ok",at:Date.now(),source:"interactive"});persistProgress()')
 p.reload();assert p.evaluate('state.livingOS.soriak.thread.length')==60
 close(c,p,q);print('PASS immediate visibility, editable chat/Enter, typing, double-send, privacy, navigation/read, fallback, solved-state guard, cap and bounded persistence',flush=True)
 # Refresh with an outstanding request recovers once without another model call.
 c,p,q=boot();send(p,"c'était toi ?");p.reload();p.evaluate('state.callHandled=true;unlockPhone();clearTimeout(callTimer);route("messages")');p.click('[data-soriak-row]')
 assert p.locator('.bubble-area').inner_text().count("c'était toi ?")==1
 assert p.locator('.bubble-line.them').last.inner_text()=='Quel appel ?'
 p.reload();assert p.evaluate('state.livingOS.soriak.thread.filter(m=>m.id.startsWith("reply:")).length')==1;close(c,p,q)
 # Genuine request timeout, no fake model response and no stuck typing.
 c,p,q=boot();p.clock.install();send(p,'salut');p.clock.run_for(9600)
 assert not p.locator('[data-soriak-typing]').count()
 assert p.locator('.bubble-line.them').last.inner_text()=='Mauvaise question.'
 p.fill('[data-soriak-input]','encore');assert p.locator('[data-soriak-send]').is_enabled();close(c,p,q)
 # Desktop Enter and migrated V9.0 records.
 seed={'livingOS':{'soriak':{'discovered':True,'receivedReplies':[{'text':'Tu es qui ?','at':1001}]},'notificationHistory':[{'id':'old','type':'soriak_message','messageId':'abeg-struggle','at':1000,'read':True}]}}
 c,p,q=boot(desktop=True,seed=seed)
 assert 'Tu compliques un truc simple.' in p.locator('.bubble-area').inner_text()
 assert 'Tu es qui ?' in p.locator('.bubble-area').inner_text()
 assert 'Tu cherches quoi ?' not in p.locator('.bubble-area').inner_text()
 send(p,'salut');respond(p,q);assert p.locator('.bubble-line.me').last.inner_text()=='salut'
 close(c,p,q);assert not errors,errors;b.close();print('PASS refresh-in-flight recovery, 9s timeout, desktop Enter, V9.0 migration and no page errors',flush=True)
