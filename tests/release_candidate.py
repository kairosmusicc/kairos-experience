"""Targeted V7 release-candidate regression, alongside tests/smoke.py."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.environ.get('KAIROS_TEST_URL', 'http://127.0.0.1:8000')
OUT = Path('/tmp/kairos-rc-screenshots')
OUT.mkdir(exist_ok=True)


def boot(browser, desktop=False, clock=True):
    ctx = browser.new_context(viewport={'width': 1440, 'height': 1100} if desktop else {'width': 402, 'height': 874}, is_mobile=not desktop, has_touch=True, reduced_motion='reduce')
    page = ctx.new_page()
    errors, failures, console = [], [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: console.append(m.text) if m.type == 'error' else None)
    page.on('response', lambda r: failures.append((r.status, r.url)) if r.status >= 400 else None)
    page.goto(BASE, wait_until='networkidle')
    if clock:
        page.clock.install()
    page.click('#enterBtn'); page.click('#unlockBtn')
    return ctx, page, (errors, failures, console)


def app(page, name):
    page.locator(f'#home [data-route="{name}"]').first.click()


def home(page):
    page.click('#homeIndicator')


def unlock(page, kind):
    if kind == 'abeg':
        app(page, 'files'); page.click('[data-file="abeg"]')
    else:
        app(page, 'whatsapp'); page.click('[data-wa-thread="paapii"]'); page.click('[data-audio-lock]')
    page.fill('#codeField', '1029' if kind == 'abeg' else 'TIME');page.click('[data-unlock]')
    assert page.locator('.audio-player').count() == 1


def clean(evidence):
    assert all(not items for items in evidence), evidence


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox', '--disable-dev-shm-usage'])
    # Either secret alone must never reveal the final note or the other secret.
    for kind in ['abeg', 'tout']:
        ctx, page, evidence = boot(browser)
        page.evaluate('state.firstUnlockedAt=Date.now()+3600000')
        app(page, 'music')
        assert page.locator('[data-track="abeg"],[data-track="tout"]').count() == 0
        assert 'call-0243' not in page.locator('.music-app').inner_text()
        home(page);unlock(page, kind);home(page)
        page.clock.fast_forward(2000)
        assert not page.evaluate('state.finalSequenceTriggered')
        assert not page.locator('#storyNotification').is_visible()
        app(page, 'music')
        assert page.locator('[data-track="'+kind+'"]').count() == 1
        assert page.locator('[data-track="'+('tout' if kind=='abeg' else 'abeg')+'"]').count() == 0
        assert page.locator('[data-note="final-0243"]').count() == 0
        clean(evidence);ctx.close()
    for desktop in [False, True]:
        ctx, page, evidence = boot(browser, desktop)
        page.evaluate('state.firstUnlockedAt=Date.now()+3600000')
        page.evaluate("window.__events=[];window.addEventListener('kairos:event',e=>window.__events.push(e.detail))")
        assert page.locator('.home-page-dots').count() == 0
        assert page.locator('#home .has-badge[data-route="whatsapp"]').count() == 1
        app(page,'messages');page.click('[data-msg-thread="paapii"]');home(page)
        assert page.locator('#home [data-route="messages"] i:visible').count() == 0
        unlock(page,'abeg')
        page.click('[data-player-toggle]');page.wait_for_function('audioManager.audio.currentTime>0')
        page.evaluate('audioManager.seek(5)')
        page.click('[data-player-toggle]');assert page.evaluate('audioManager.audio.paused')
        page.click('[data-player-toggle]');page.wait_for_function('!audioManager.audio.paused')
        home(page);unlock(page,'tout')
        assert page.locator('#home [data-route="whatsapp"] i:visible').count() == 0
        page.clock.fast_forward(2000)
        assert not page.evaluate('state.finalSequenceTriggered'), 'No finale inside a player'
        home(page);page.clock.fast_forward(500);app(page,'notes');page.clock.fast_forward(2000)
        assert not page.evaluate('state.finalSequenceTriggered'), 'Leaving Home cancels pending notification'
        home(page);page.clock.fast_forward(1700)
        assert page.locator('#storyNotification').is_visible()
        page.screenshot(path=str(OUT / ('desktop-final-notification.png' if desktop else 'mobile-final-notification.png')))
        page.click('.story-open')
        assert page.locator('.note-detail h1').inner_text()=='02:43'
        assert 'On pense toujours' in page.locator('.note-body').inner_text()
        page.screenshot(path=str(OUT / ('desktop-final-note.png' if desktop else 'mobile-final-note.png')))
        assert page.evaluate('state.finalNoteOpened')
        home(page);page.clock.fast_forward(3000);assert not page.locator('#storyNotification').is_visible()
        app(page,'music')
        assert page.locator('.album-tile img').get_attribute('src')=='assets/images/kairos-cover.jpg'
        assert page.locator('[data-now-art]').get_attribute('src').endswith('gallery-track-2.png') # Actual secret artwork
        page.click('[data-music-album]')
        assert page.locator('.album-header img').get_attribute('src')=='assets/images/kairos-cover.jpg'
        assert page.locator('[data-track^="album-"]').count()==8
        assert page.evaluate('ALBUM_TRACKS.every(t=>t.src===null && t.artwork===KAIROS_COVER)')
        page.click('[data-track="album-0"]');assert page.locator('#toast').inner_text()=='Audio indisponible'
        page.click('[data-track="abeg"]');page.wait_for_function('!audioManager.audio.paused')
        current=page.evaluate('audioManager.audio.currentTime')
        page.click('[data-app-back]');assert page.evaluate('!audioManager.audio.paused')
        assert page.evaluate('audioManager.audio.currentTime')>=current
        # Queue controls share exactly the same audio element across screens.
        page.evaluate('window.__audio=audioManager.audio')
        page.click('[data-player-next]');page.wait_for_function('audioManager.state.currentTrack.id==="tout"')
        assert page.evaluate('audioManager.audio===window.__audio')
        page.evaluate('audioManager.previous()');page.wait_for_function('audioManager.state.currentTrack.id==="abeg"')
        page.evaluate('audioManager.stop()');assert page.evaluate('audioManager.audio.paused && audioManager.state.currentTime===0')
        home(page);app(page,'phone');page.click('[data-call-accept]');page.wait_for_function('document.querySelector("#callAudio").currentTime>0')
        assert page.evaluate('audioManager.audio.paused')
        page.click('[data-call-hangup]')
        assert page.evaluate('audioManager.audio.paused')
        assert page.locator('[data-call-info="Numéro inconnu"]').inner_text().find('Appel entrant')>=0
        home(page);app(page,'phone');assert page.locator('[data-call-accept]').count()==0
        home(page);app(page,'calendar');assert page.locator('#calendarAgenda').inner_text().find('Studio — Zénithal')>=0
        home(page);app(page,'settings');page.click('[data-setting-detail="Général"]');assert '128 Go' in page.locator('.settings-app').inner_text()
        home(page);app(page,'facetime');assert 'Appel vidéo manqué' in page.locator('.facetime-app').inner_text()
        page.reload(wait_until='networkidle');page.click('#enterBtn');page.click('#unlockBtn');page.clock.fast_forward(3000)
        assert not page.locator('#storyNotification').is_visible()
        assert page.evaluate('state.finalSequenceTriggered && state.finalNoteOpened && state.callHandled')
        app(page,'notes');assert page.locator('[data-note="final-0243"]').count()==1
        # Manifest and icons exist; no service worker/caching policy is introduced.
        response=page.request.get(BASE+'/manifest.webmanifest');manifest=response.json()
        assert manifest['display']=='standalone'
        for icon in manifest['icons']: assert page.request.get(BASE+'/'+icon['src']).ok
        clean(evidence)
        print('PASS RC', 'desktop' if desktop else 'mobile', ': progression, finale once, badges, queue, cover, call history, secondary apps, PWA',flush=True)
        ctx.close()
    # Organic trigger is earlier only after three significant apps; handled calls never repeat.
    ctx,page,evidence=boot(browser)
    for name in ['messages','notes','files']:
        app(page,name);home(page)
    remaining = page.evaluate('state.firstUnlockedAt+26000-Date.now()')
    page.clock.fast_forward(max(0, int(remaining)-500));assert page.locator('[data-call-accept]').count()==0
    page.clock.fast_forward(600);assert page.locator('[data-call-accept]').is_visible()
    page.click('[data-call-decline]');app(page,'phone')
    assert 'Appel manqué' in page.locator('[data-call-info="Numéro inconnu"]').inner_text()
    home(page);page.clock.fast_forward(60000);assert page.locator('[data-call-accept]').count()==0
    clean(evidence);ctx.close()
    print('PASS RC: each secret alone, organic call at 26s, decline and no repeated call',flush=True)
    browser.close()
