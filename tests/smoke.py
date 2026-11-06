"""Functional browser regression. Start the static server first.
Requires Python Playwright and system Chromium; no application dependencies.
Run: python3 tests/smoke.py
"""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.environ.get('KAIROS_TEST_URL', 'http://127.0.0.1:8000')
OUT = Path('/tmp/kairos-v7-screenshots')
OUT.mkdir(exist_ok=True)


def boot(page):
    page.goto(BASE, wait_until='networkidle')
    page.click('#enterBtn')
    assert page.locator('#lock.active-view').count() == 1


def home(page):
    page.click('#homeIndicator')
    assert page.locator('#home.active-view').count() == 1


def app(page, name):
    page.locator(f'#home [data-route="{name}"]').first.click()


def swipe(page, x1, y1, x2, y2):
    # Real touch input through Chrome DevTools; exercises Pointer Events and cancellation.
    cdp = page.context.new_cdp_session(page)
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x1, 'y': y1}]})
    for i in range(1, 9):
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x1+(x2-x1)*i/8, 'y': y1+(y2-y1)*i/8}]})
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    page.wait_for_timeout(400)
    cdp.detach()


def unlock_file(page, code):
    page.fill('#codeField', code)
    page.click('[data-unlock]')


def playing(page):
    page.wait_for_function('audioManager.audio.readyState >= 1')
    page.click('[data-player-toggle]')
    page.wait_for_function('audioManager.audio.currentTime > 0 && !audioManager.audio.paused')


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox', '--disable-dev-shm-usage'])
    for label, viewport, mobile in [('mobile', {'width': 402, 'height': 874}, True), ('desktop', {'width': 1440, 'height': 1100}, False)]:
        context = browser.new_context(viewport=viewport, is_mobile=mobile, has_touch=True, reduced_motion='reduce')
        page = context.new_page()
        errors, failures = [], []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('response', lambda r: failures.append((r.status, r.url)) if r.status >= 400 else None)
        boot(page)
        assert page.locator('#statusTime').inner_text() == page.evaluate("new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})")
        r = page.locator('.screen').bounding_box()
        swipe(page, r['x']+180, r['y']+r['height']-100, r['x']+180, r['y']+r['height']-260)
        assert page.locator('#home.active-view').count() == 1
        # Isolate long app checks from the separately tested 35-second interruption.
        page.evaluate('clearTimeout(callTimer)')
        page.screenshot(path=str(OUT / f'{label}-home.png'))
        assert page.locator('#home img').evaluate_all('(imgs)=>imgs.every(i=>i.complete&&i.naturalWidth>0)')
        app(page, 'messages')
        page.fill('[data-search]', 'Paapii')
        assert page.locator('[data-msg-thread]:visible').count() == 1
        page.click('[data-msg-thread="paapii"]')
        assert page.locator('.bubble-area').inner_text().find('retourne-la') > 0
        page.screenshot(path=str(OUT / f'{label}-messages.png'))
        assert page.locator('.send-button').get_attribute('aria-label') == 'Message audio'
        page.fill('[data-reply] input', 'je regarde')
        assert page.locator('.send-button').get_attribute('aria-label') == 'Envoyer'
        page.click('[data-reply] [type="submit"]')
        assert 'je regarde' in page.locator('.bubble-area').inner_text()
        r = page.locator('.screen').bounding_box()
        swipe(page, r['x']+8, r['y']+250, r['x']+130, r['y']+253)
        assert page.locator('.messages-app').count() == 1
        # Vertical scroll starting in content must not trigger back.
        page.click('[data-msg-thread="paapii"]')
        swipe(page, r['x']+180, r['y']+400, r['x']+182, r['y']+230)
        assert page.locator('.thread-wrap').count() == 1
        swipe(page, r['x']+180, r['y']+r['height']-12, r['x']+180, r['y']+r['height']-160)
        assert page.locator('#home.active-view').count() == 1
        app(page, 'whatsapp')
        page.click('[data-wa-filter="3"]')
        assert page.locator('[data-wa-thread]:visible').count() == 1
        page.click('[data-wa-filter="0"]')
        page.click('[data-wa-thread="paapii"]')
        assert page.locator('.wa-bubble-line.them [data-audio-lock]').count() == 1
        assert page.locator('.wa-wave').count() == 0
        page.locator('[data-audio-lock]').scroll_into_view_if_needed()
        page.screenshot(path=str(OUT / f'{label}-whatsapp.png'))
        page.click('[data-audio-lock]')
        for code in ['NOPE', 'TEST', 'AAAA']:
            unlock_file(page, code)
            assert page.locator('#passwordFeedback').inner_text()
            assert 'TIME' not in page.locator('#passwordFeedback').inner_text()
        unlock_file(page, 'TIME')
        playing(page)
        assert page.evaluate('audioManager.state.currentTrack.id') == 'tout'
        home(page)
        app(page, 'files')
        page.click('[data-file="abeg"]')
        unlock_file(page, '0000')
        assert page.locator('.audio-player').count() == 0
        unlock_file(page, '1029')
        playing(page)
        assert page.evaluate('audioManager.state.currentTrack.id') == 'abeg'
        home(page)
        app(page, 'files')
        page.click('[data-file="abeg"]')
        assert page.locator('#codeField').count() == 0
        home(page)
        app(page, 'music')
        page.click('[data-music-album]')
        assert page.locator('[data-track^="album-"]').count() == 8
        page.click('[data-track="album-0"]', force=True)
        assert page.locator('#toast').inner_text().find('pas encore') >= 0
        page.click('[data-track="tout"]')
        page.wait_for_function('audioManager.state.currentTrack.id==="tout" && !audioManager.audio.paused')
        page.screenshot(path=str(OUT / f'{label}-music.png'))
        page.click('[data-app-back]')
        assert page.locator('[data-now-title]').inner_text() == 'Tout gâcher'
        assert page.evaluate('!audioManager.audio.paused')
        home(page)
        app(page, 'notes')
        assert page.locator('[data-note]').count() == 7
        page.screenshot(path=str(OUT / f'{label}-notes.png'))
        page.click('[data-note="0243"]')
        assert 'Personne au bout' in page.locator('.note-body').inner_text()
        page.click('[data-app-back]')
        page.fill('[data-search]', 'exports')
        assert page.locator('[data-note]:visible').count() >= 1
        home(page)
        for name in ['settings', 'calendar', 'facetime', 'spotify']:
            app(page, name)
            assert page.locator('#appContent > *').count() > 0
            home(page)
        app(page, 'photos')
        page.click('[data-photo-index="0"]')
        page.click('[data-photo-next]')
        assert page.locator('#photoPosition').inner_text() == '2 sur 15'
        swipe(page, r['x']+280, r['y']+300, r['x']+100, r['y']+302)
        assert page.locator('#photoPosition').inner_text() == '3 sur 15'
        page.click('[data-close-photo]')
        home(page)
        app(page, 'camera')
        page.wait_for_function('document.querySelector("video").readyState>=2')
        assert page.locator('video').evaluate('(v)=>v.muted && !v.paused')
        page.click('[data-shutter]')
        home(page)
        app(page, 'instagram')
        for hotspot in ['insta-manii-following', 'insta-paapii-profile', 'insta-paapii-following', 'insta-manii-profile']:
            page.click(f'[data-hot="{hotspot}"]')
        assert page.locator('.full-shot').get_attribute('src').endswith('insta-manii-profile.webp')
        home(page)
        # Intercept external navigation: verify target without requiring album.link network access.
        page.evaluate('window.open=(url)=>{window.__openedURL=url}')
        app(page, 'safari')
        assert page.evaluate('window.__openedURL') == 'https://album.link/qzsdrsh5r3m8j'
        app(page, 'phone')
        assert page.locator('[data-call-accept]').is_visible()
        assert page.locator('#statusBar').evaluate('el=>getComputedStyle(el).zIndex') == '101'
        page.screenshot(path=str(OUT / f'{label}-call.png'))
        page.click('[data-call-accept]')
        page.wait_for_function('document.querySelector("#callAudio").currentTime>0')
        assert page.evaluate('audioManager.audio.paused')
        page.click('[data-call-control="keypad"]')
        assert page.locator('#callKeypad').is_visible()
        page.click('[data-call-control="keypad"]')
        page.click('[data-call-hangup]')
        assert page.locator('#modal.hidden').count() == 1
        page.click('[data-phone-tab="Clavier"]')
        page.click('[data-dial="2"]')
        assert page.locator('#dialNumber').inner_text() == '2'
        for tab in ['Favoris', 'Contacts', 'Messagerie', 'Récents']:
            page.click(f'[data-phone-tab="{tab}"]')
        assert 'Numéro inconnu' in page.locator('.phone-app').inner_text()
        # Session persistence survives reload.
        page.reload(wait_until='networkidle')
        page.click('#enterBtn'); page.click('#unlockBtn'); app(page, 'files'); page.click('[data-file="abeg"]')
        assert page.locator('.audio-player').count() == 1
        assert not errors, errors
        assert not failures, failures
        print(f'PASS {label}: navigation, touch gestures, conversations, secrets, real audio, notes, music, photos, video, Instagram, Safari, calls; no JS errors/404')
        context.close()
    # Fresh sessions for automatic incoming call, natural ending and decline.
    context = browser.new_context(viewport={'width': 402, 'height': 874}, is_mobile=True, has_touch=True, reduced_motion='reduce')
    page = context.new_page(); boot(page)
    page.clock.install()
    page.click('#unlockBtn')
    page.clock.fast_forward(34900)
    assert page.locator('[data-call-accept]').count() == 0
    page.clock.fast_forward(200)
    assert page.locator('[data-call-accept]').is_visible()
    page.click('[data-call-decline]')
    assert page.locator('#modal.hidden').count() == 1
    context.close()
    context = browser.new_context(viewport={'width': 402, 'height': 874}, is_mobile=True)
    page = context.new_page(); boot(page);page.click('#unlockBtn');app(page,'phone');page.click('[data-call-accept]')
    page.wait_for_function('document.querySelector("#callAudio").readyState>=1')
    page.evaluate('document.querySelector("#callAudio").currentTime=document.querySelector("#callAudio").duration-0.15')
    page.wait_for_function('state.callStatus==="idle"')
    assert page.locator('#modal.hidden').count() == 1
    context.close()
    print('PASS fresh sessions: automatic call at 35s, decline, natural audio completion')
    browser.close()
