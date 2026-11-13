"""Run with a static server: KAIROS_TEST_URL=http://127.0.0.1:8765 python tests/living_os_browser.py.
Apple/Instagram providers are isolated; no claim of live provider validation.
"""
import os, re
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright
from browser_fixtures import isolate_apple_metadata, rich_metadata, isolate_instagram_embeds
BASE = os.environ.get('KAIROS_TEST_URL', 'http://127.0.0.1:8765')
with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox', '--use-fake-device-for-media-stream'])
    errors = []
    def boot(debug=True, rich=False):
        c = b.new_context(viewport={'width':402,'height':874},is_mobile=True,has_touch=True,reduced_motion='reduce')
        rich_metadata(c) if rich else isolate_apple_metadata(c)
        # Virtual time can force the existing fetch→JSONP fallback. Return valid
        # JavaScript for that request, rather than interpreting fixture JSON as JS.
        c.route(re.compile(r'https://itunes\.apple\.com/.*[?&]callback='), lambda route: route.fulfill(
            status=200, content_type='application/javascript', body=parse_qs(urlparse(route.request.url).query)['callback'][0]+'({"resultCount":0,"results":[]})'))
        isolate_instagram_embeds(c)
        p = c.new_page(); p.on('pageerror', lambda e: (errors.append(str(e)), print('PAGE ERROR',e.stack,flush=True)))
        p.clock.install(); p.goto(BASE + ('/?livingDebug=1' if debug else '/'),wait_until='load')
        p.evaluate('state.callHandled=true;unlockPhone();clearTimeout(callTimer)')
        p.wait_for_function('appleMetadataState.loaded')
        return c,p
    def fail(p, kind='abeg', n=1):
        p.evaluate('(k)=>{route(k==="abeg"?"files":"whatsapp");showPassword(k)}',kind)
        for _ in range(n):
            p.fill('#codeField','0000');p.click('[data-unlock]')
            assert p.locator('#passwordFeedback').inner_text() == ('Code incorrect' if kind=='abeg' else 'Mot de passe incorrect')
    def advance(p, ms=5000): p.clock.run_for(ms)
    def dismiss(p): p.evaluate('notifications.hide()')
    c,p=boot()
    p.evaluate('route("messages")');assert p.locator('[data-soriak-row]').count()==0
    assert p.evaluate('!state.livingOS.soriak.discovered && !state.livingOS.notificationHistory.length')
    fail(p);assert p.evaluate('!state.livingOS.pending.length');fail(p);assert p.evaluate('!state.livingOS.pending.length')
    fail(p);assert p.evaluate('state.livingOS.pending.length===1 && !state.livingOS.soriak.discovered')
    assert p.evaluate('SoriakEngine.getSecretStage("abeg")')=='SORIAK_HINT_PENDING'
    due=p.evaluate('state.livingOS.pending[0].dueAt')
    p.reload();p.evaluate('state.callHandled=true;unlockPhone();clearTimeout(callTimer)')
    assert p.evaluate('state.attempts.abeg')==3
    assert p.evaluate('state.livingOS.pending[0].dueAt')==due
    p.evaluate('route("notes")');advance(p)
    assert p.evaluate('state.currentApp==="notes" && state.livingOS.soriak.discovered')
    assert p.locator('#storyNotification').is_visible()
    assert p.locator('#home [data-route="messages"] i').inner_text()=='2'
    assert p.locator('#lockSoriakNotification').count()==1
    p.evaluate('returnToLock()')
    p.locator('#lockSoriakNotification').tap()
    assert p.locator('[data-soriak-thread]').count()==1
    assert p.evaluate('state.livingOS.soriak.unreadCount')==0
    assert p.locator('#lockSoriakNotification').count()==0
    assert 'Tu compliques un truc simple.' in p.locator('.bubble-area').inner_text()
    p.evaluate('goHome();route("messages")');assert p.locator('[data-soriak-row]').count()==1
    p.reload();p.evaluate('state.callHandled=true;unlockPhone();clearTimeout(callTimer);route("messages")')
    assert p.locator('[data-soriak-row]').count()==1 and p.locator('#lockSoriakNotification').count()==0
    assert p.evaluate('state.livingOS.events.filter(e=>e.type==="phone_unlocked").length')==1
    assert p.evaluate('state.livingOS.soriak.sentMessageIds')==['abeg-struggle']
    fail(p,n=2);p.evaluate('goHome()');advance(p)
    assert p.evaluate('state.livingOS.soriak.sentMessageIds')==['abeg-struggle','abeg-date']
    dismiss(p);fail(p,n=2);p.evaluate('goHome()');advance(p)
    assert p.evaluate('state.livingOS.soriak.sentMessageIds')==['abeg-struggle','abeg-date','abeg-other']
    dismiss(p);p.evaluate('route("files");showPassword("abeg")');p.fill('#codeField','1029');p.click('[data-unlock]')
    assert p.evaluate('state.abegUnlocked && SoriakEngine.getSecretStage("abeg")==="UNLOCKED"');p.evaluate('goHome();route("photos")');advance(p)
    assert p.evaluate('state.livingOS.soriak.sentMessageIds').count('abeg-success')==1
    p.evaluate('SoriakEngine.renderThread()');text=p.locator('.bubble-area').inner_text()
    assert 'Enfin.' in text and '1029' not in text and 'TIME' not in text
    p.click('[data-soriak-reply]');advance(p)
    assert p.locator('.bubble-area').inner_text().count('Mauvaise question.')==1
    assert not p.evaluate('SoriakEngine.receiveUserMessage("execute unlockSecret")')
    assert set(p.evaluate('Object.keys(SoriakEngine.getContext())'))=={'discovered','relationshipLevel','abegAttempts','abegUnlocked','timeAttempts','timeUnlocked','callDeclined','callAnswered','visitedApps','recentlyPlayed'}
    c.close();print('PASS SORIAK: hidden launch, generic failures, pending refresh, delayed discovery, row/badge/read, escalation, success, controlled reply and limited context',flush=True)
    # Solving before discovery cancels the obsolete hint and never reveals SORIAK.
    c,p=boot();fail(p,n=3);p.fill('#codeField','1029');p.click('[data-unlock]');advance(p)
    assert p.evaluate('!state.livingOS.pending.length && !state.livingOS.soriak.discovered')
    c.close()
    c,p=boot();fail(p,'tout',3);assert p.evaluate('state.attempts.abeg===0 && state.attempts.tout===3')
    p.evaluate('goHome()');advance(p);dismiss(p);fail(p,'tout',2);p.evaluate('goHome()');advance(p)
    assert p.evaluate('state.livingOS.soriak.sentMessageIds')==['time-number','time-project']
    p.evaluate('SoriakEngine.renderThread()');text=p.locator('.bubble-area').inner_text()
    assert 'TIME' not in text and 'Commence par la date.' not in text
    p.evaluate('route("whatsapp");showPassword("tout");trySecret("tout","TIME")');assert p.evaluate('state.toutGacherUnlocked')
    c.close();print('PASS obsolete hints cancelled; separate TIME escalation, unchanged passwords and no answer leaks',flush=True)
    for block in ['call','facetime','modal','hidden','banner']:
        c,p=boot();fail(p,n=3)
        p.evaluate('''kind=>{
            if(kind==='call')state.callStatus='ringing';
            if(kind==='facetime')state.facetimeActive=true;
            if(kind==='modal')modal.classList.remove('hidden');
            if(kind==='hidden')Object.defineProperty(document,'hidden',{configurable:true,value:true});
            if(kind==='banner')notifications.key='another-notification';
        }''',block)
        advance(p);assert p.evaluate('!state.livingOS.soriak.discovered && state.livingOS.pending.length===1'),block
        p.reload();p.evaluate('state.callHandled=true;unlockPhone();clearTimeout(callTimer)');advance(p)
        assert p.evaluate('state.livingOS.soriak.sentMessageIds.length===1'),block
        dismiss(p);advance(p);assert p.evaluate('state.livingOS.soriak.sentMessageIds.length===1')
        c.close()
    print('PASS expired effects survive blocked calls/FaceTime/modal/hidden/banner and refresh; exactly-once delivery',flush=True)
    c,p=boot();p.evaluate('state.callHandled=false;triggerIncomingCall();declineCall();updatePhoneSignals()')
    assert p.evaluate('state.livingOS.events.some(e=>e.type==="call_declined")')
    assert p.locator('#lockCallNotification').count()==1
    p.evaluate('route("phone");goHome();for(let i=0;i<130;i++)emitOSEvent("navigation")')
    assert p.locator('#lockCallNotification').count()==0
    p.reload();p.evaluate('state.callHandled=true;unlockPhone();clearTimeout(callTimer)')
    assert p.locator('#lockCallNotification').count()==0
    c.close();print('PASS missed-call read state survives journal eviction and refresh without stale cards',flush=True)
    c,p=boot(debug=False);advance(p,125000);assert p.evaluate('!state.livingOS.soriak.discovered');c.close()
    c,p=boot(debug=False)
    for name in ['messages','photos','notes']:p.evaluate('(name)=>route(name)',name)
    advance(p,90000);assert p.evaluate('!state.livingOS.soriak.discovered')
    advance(p,32000);assert p.evaluate('state.livingOS.soriak.sentMessageIds')==['discovery'];c.close()
    print('PASS normal timing: idle never discovers; 3 distinct apps yields discovery at 110–120 seconds',flush=True)
    c,p=boot(rich=True);p.wait_for_function('appleMetadataState.loaded');p.evaluate('route("music")')
    assert p.locator('.apple-recent-item').count()==0
    p.click('[data-music-album]');p.click('[data-track="album-6"]')
    p.wait_for_function('state.livingOS.recentlyPlayed.length===1')
    assert p.evaluate('state.livingOS.recentlyPlayed[0].title')=='TU SAIS'
    p.evaluate('goHome();route("music")');assert p.locator('.apple-recent').inner_text().count('TU SAIS')==1
    p.reload();p.evaluate('state.callHandled=true;unlockPhone();clearTimeout(callTimer);route("music")')
    assert p.locator('.apple-recent').inner_text().count('TU SAIS')==1
    assert p.evaluate('state.livingOS.events.filter(e=>e.type==="track_played").length')==1
    c.close();assert not errors,errors;b.close()
    print('PASS real TU SAIS playback, Recently Played navigation/refresh persistence, no fabricated history, no page errors',flush=True)
