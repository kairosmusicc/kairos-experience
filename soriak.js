/* Deterministic V9 adapter. V9.1 boundary: no network and no model execution. */
(function () {
  const avatar = 'assets/images/soriak.jpg';
  const copy = Object.freeze({
    discovery: 'Tu cherches quelque chose ?',
    'abeg-struggle': 'Tu compliques un truc simple.',
    'abeg-date': 'Commence par la date.',
    'abeg-other': 'Lis-la autrement.',
    'abeg-success': 'Enfin.',
    'time-number': 'Tu cherches un nombre ?',
    'time-project': 'Le projet tourne autour de ça.',
    'call-declined': "Pourquoi t’as raccroché ?",
    'reply-question': 'Mauvaise question.',
  });
  const sent = (c, id) => c.os.soriak.sentMessageIds.includes(id);
  const failureEvents = ['secret_attempt_failed', 'os_effect_delivered'];
  const hint = (id, secret, attempts, previous) => ({
    id: `soriak-${id}`, event: failureEvents, once: true, priority: 3, delay: [25000, 45000],
    when: c => !c[secret + 'Unlocked'] && c[secret + 'Attempts'] >= attempts && (!previous || sent(c, previous)),
    obsolete: c => c[secret + 'Unlocked'], effect: { type: 'soriak_message', messageId: id },
  });
  const rules = [
    hint('abeg-struggle', 'abeg', 3),
    hint('abeg-date', 'abeg', 5, 'abeg-struggle'),
    hint('abeg-other', 'abeg', 7, 'abeg-date'),
    hint('time-number', 'time', 3),
    hint('time-project', 'time', 5, 'time-number'),
    { id: 'soriak-discovery', event: 'app_opened', once: true, priority: 1, delay: [20000, 30000], minAge: 90000,
      when: c => c.unlocked && c.visitedApps.length >= 3 && !c.os.soriak.discovered,
      obsolete: c => c.os.soriak.discovered,
      effect: { type: 'soriak_message', messageId: 'discovery' } },
    { id: 'soriak-abeg-success', event: 'secret_unlocked', once: true, priority: 4, delay: [20000, 35000],
      when: (c, p) => p.secret === 'abeg' && c.abegUnlocked && c.os.soriak.discovered,
      effect: { type: 'soriak_message', messageId: 'abeg-success' } },
    { id: 'soriak-call-declined', event: 'call_declined', once: true, priority: 0, delay: [35000, 45000],
      when: c => c.os.soriak.discovered,
      effect: { type: 'soriak_message', messageId: 'call-declined' } },
    { id: 'soriak-reply-question', event: 'soriak_user_message', once: true, priority: 2, delay: [20000, 30000],
      when: c => c.os.soriak.discovered,
      effect: { type: 'soriak_message', messageId: 'reply-question' } },
  ];
  const developmentHost = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) || (location.hostname.endsWith('.vercel.app') && location.hostname.includes('-git-feat-'));
  const debug = developmentHost && new URLSearchParams(location.search).get('livingDebug') === '1';
  const facts = () => ({
    unlocked: state.phoneUnlocked,
    abegAttempts: state.attempts.abeg,
    abegUnlocked: state.abegUnlocked,
    timeAttempts: state.attempts.tout,
    timeUnlocked: state.toutGacherUnlocked,
    visitedApps: state.livingOS?.exploredApps || [],
  });
  const blocked = () => !state.phoneUnlocked || state.callStatus !== 'idle' || state.facetimeActive || !modal.classList.contains('hidden') || document.hidden || notifications.key !== null;
  const relative = at => {
    const minutes = Math.max(0, Math.floor((Date.now() - at) / 60000));
    return minutes === 0 ? 'maintenant' : `il y a ${minutes} min`;
  };
  function records() { return state.livingOS.notificationHistory.filter(n => n.type === 'soriak_message'); }
  function markRead() {
    const s = state.livingOS.soriak;
    s.unreadCount = 0;
    s.threadRead = true;
    records().forEach(n => { n.read = true; });
    persistProgress();
    updatePhoneSignals();
  }
  function openThread(notificationId = null) {
    if (!state.livingOS.soriak.discovered) return;
    if (notificationId) emitOSEvent('notification_opened', { id: notificationId }, `notification-opened:${notificationId}`);
    route('messages');
    navigate(renderThread);
  }
  function renderThread() {
    if (!state.livingOS.soriak.discovered) return;
    if (notifications.key?.startsWith('soriak-')) notifications.hide();
    markRead();
    if (!$('[data-soriak-thread]')) emitOSEvent('message_opened', { thread: 'soriak' });
    const messages = records().map(n => ({ who: 'them', text: copy[n.messageId], at: n.at })).concat(state.livingOS.soriak.receivedReplies.map(n => ({ who: 'me', ...n }))).sort((a, b) => a.at - b.at);
    openApp(`<div class="thread-wrap" data-soriak-thread><div class="thread-head"><button class="back" data-app-back aria-label="Retour aux messages">${icon('back')}</button><div class="thread-person">${avatarHTML(avatar, 'SORIAK')}<b>SORIAK</b></div></div><div class="bubble-area">${messages.map(m => `<div class="time-label">${relative(m.at)}</div><div class="bubble-line ${m.who}"><div class="bubble">${escapeHTML(m.text)}</div></div>`).join('')}</div><div class="imessage-compose">${state.livingOS.soriak.receivedReplies.length ? '' : `<span></span><input class="field" value="Tu es qui ?" aria-label="Réponse proposée" readonly><button class="send-button" data-soriak-reply aria-label="Envoyer : Tu es qui ?">${icon('send')}</button>`}</div></div>`);
    $('[data-soriak-reply]')?.addEventListener('click', () => {
      SoriakEngine.receiveUserMessage('Tu es qui ?');
      renderThread();
    });
    const area = $('.bubble-area');
    if (area) area.scrollTop = area.scrollHeight;
  }
  function rowHTML() {
    const s = state.livingOS.soriak;
    if (!s.discovered) return '';
    const last = records().at(-1);
    return `<button class="row message-row" data-soriak-row data-searchable="SORIAK ${escapeHTML(copy[last.messageId])}"><span class="unread-dot ${s.unreadCount ? 'visible' : ''}"></span>${avatarHTML(avatar, 'SORIAK')}<span class="row-copy"><b>SORIAK</b><span>${escapeHTML(copy[last.messageId])}</span></span><span class="row-meta">${relative(last.at)} ${icon('back')}</span></button>`;
  }
  function syncSignals() {
    if (!state.livingOS) return;
    const missed = $('#lockCallNotification');
    if (missed && state.callHistory) {
      const viewed = state.read.has('living-call:' + state.callHistory.at);
      if (state.callHistory.outcome !== 'missed' || viewed) missed.remove();
      else $('small', missed).textContent = relative(state.callHistory.at);
    }
    const s = state.livingOS.soriak;
    const button = $('#home [data-route="messages"]');
    const count = (state.read.has('im-paapii') ? 0 : 1) + s.unreadCount;
    let badge = $('i', button);
    if (!badge && count) { badge = document.createElement('i'); button.append(badge); }
    button.classList.toggle('has-badge', count > 0);
    if (badge) { badge.textContent = String(count); badge.classList.toggle('hidden', count === 0); }
    const unread = records().filter(n => !n.read).at(-1);
    let card = $('#lockSoriakNotification');
    if (!unread) { card?.remove(); return; }
    if (!card) {
      card = document.createElement('button');
      card.id = 'lockSoriakNotification';
      card.className = 'lock-notif';
      $('.lock-notifications').append(card);
    }
    card.innerHTML = `<img src="${avatar}" alt=""><div><b>Messages</b><small>${relative(unread.at)}</small><strong>SORIAK</strong><p>${escapeHTML(copy[unread.messageId])}</p></div>`;
    card.onclick = () => { if (!state.phoneUnlocked) unlockPhone(); openThread(unread.id); };
  }
  function syncUI() {
    syncSignals();
    // Refresh only the dynamic row, preserving search, focus and existing threads.
    const list = $('.messages-app .list');
    if (list && state.livingOS.soriak.discovered) {
      const old = $('[data-soriak-row]', list);
      if (old && old.outerHTML !== rowHTML()) old.outerHTML = rowHTML();
      else if (!old) list.insertAdjacentHTML('afterbegin', rowHTML());
      $('[data-soriak-row]', list).onclick = () => navigate(renderThread);
      const query = $('[data-search="messages"]')?.value.toLowerCase() || '';
      $('[data-soriak-row]', list).classList.toggle('hidden', !$('[data-soriak-row]', list).dataset.searchable.toLowerCase().includes(query));
    }
  }
  function deliver(effect, pending) {
    if (effect.type !== 'soriak_message' || !copy[effect.messageId] || state.livingOS.soriak.sentMessageIds.includes(effect.messageId)) return false;
    const at = Date.now();
    const inThread = !!$('[data-soriak-thread]');
    if (!inThread && !notifications.show({ key: pending.id, app: 'Messages', image: avatar, sender: 'SORIAK', preview: copy[effect.messageId], open: () => openThread(pending.id) })) return false;
    const s = state.livingOS.soriak;
    s.discovered = true;
    if (!s.discoveredAt) s.discoveredAt = at;
    s.relationshipLevel += 1;
    s.sentMessageIds.push(effect.messageId);
    s.threadRead = inThread;
    if (!inThread) s.unreadCount += 1;
    state.livingOS.notificationHistory.push({ id: pending.id, type: effect.type, messageId: effect.messageId, at, read: inThread });
    if (inThread) renderThread();
    syncUI();
    return true;
  }
  const engine = new LivingOSEngine({ state: state.livingOS, rules, facts, blocked, deliver, debug,
    persist: os => { state.livingOS = os; persistProgress(); }, changed: syncUI,
    log: (event, data) => console.debug('[Living OS]', event, data),
  });
  window.emitOSEvent = (type, payload, id) => engine.emit(type, payload, id);
  window.scheduleOSEffect = (ruleId, context) => engine.schedule(ruleId, context);
  window.cancelOSEffect = id => engine.cancel(id);
  window.processPendingOSEffects = () => engine.process();
  window.SoriakEngine = {
    getSecretStage(secret) {
      const time = secret === 'time';
      const attempts = time ? state.attempts.tout : state.attempts.abeg;
      if (time ? state.toutGacherUnlocked : state.abegUnlocked) return 'UNLOCKED';
      const path = time ? ['time-number', 'time-project'] : ['abeg-struggle', 'abeg-date', 'abeg-other'];
      for (let i = path.length - 1; i >= 0; i--) {
        if (state.livingOS.soriak.sentMessageIds.includes(path[i])) return `HINT_${i + 1}_SENT`;
        if (state.livingOS.pending.some(e => e.ruleId === 'soriak-' + path[i])) return i === 0 ? 'SORIAK_HINT_PENDING' : `HINT_${i + 1}_AVAILABLE`;
      }
      return attempts ? `FAIL_${Math.min(attempts, 3)}` : 'LOCKED';
    },
    getContext() {
      return { discovered: state.livingOS.soriak.discovered, relationshipLevel: state.livingOS.soriak.relationshipLevel,
        abegAttempts: state.attempts.abeg, abegUnlocked: state.abegUnlocked,
        timeAttempts: state.attempts.tout, timeUnlocked: state.toutGacherUnlocked,
        callDeclined: state.unknownFirstDeclined || state.livingOS.events.some(e => e.type === 'call_declined'),
        callAnswered: state.unknownCallAccepted,
        visitedApps: [...(state.livingOS.exploredApps || [])], recentlyPlayed: state.livingOS.recentlyPlayed.map(t => ({ ...t })) };
    },
    receiveUserMessage(text) {
      if (!state.livingOS.soriak.discovered || text !== 'Tu es qui ?' || state.livingOS.soriak.receivedReplies.length) return false;
      state.livingOS.soriak.receivedReplies.push({ text, at: Date.now() });
      return emitOSEvent('soriak_user_message', {}, 'soriak-user-question');
    },
    addSystemMessage(messageId) {
      // Fixed registry only: future model output cannot execute arbitrary actions.
      const rule = rules.find(r => r.effect.messageId === messageId);
      return rule ? engine.schedule(rule.id) : null;
    },
    renderThread, rowHTML, syncSignals, syncUI,
  };
  const bridge = { phone_unlocked: 'phone_unlocked', app_opened: 'app_opened', incoming_call_declined: 'call_declined', incoming_call_answered: 'call_answered' };
  window.addEventListener('kairos:event', e => {
    const type = bridge[e.detail.name];
    if (!type) return;
    // trackEvent(app_opened) precedes the legacy visitedApps update.
    if (type === 'phone_unlocked' && !state.livingOS.eventIds.includes('phone-unlocked')) state.livingOS.sessionStartedAt = Date.now();
    if (type === 'app_opened') {
      if (e.detail.app === 'phone' && state.callHistory) state.read.add('living-call:' + state.callHistory.at);
      // Exploration tracking must not change the legacy call scheduler's app count.
      state.livingOS.exploredApps ||= [];
      if (!state.livingOS.exploredApps.includes(e.detail.app)) state.livingOS.exploredApps.push(e.detail.app);
    }
    emitOSEvent(type, type === 'app_opened' ? { app: e.detail.app } : {}, type === 'phone_unlocked' ? 'phone-unlocked' : null);
  });
  window.addEventListener('living:track-played', e => {
    const track = e.detail;
    state.livingOS.recentlyPlayed = [{ id: track.id, title: track.title, catalogKey: track.catalogKey || 'kairos', at: Date.now() }, ...state.livingOS.recentlyPlayed.filter(t => t.id !== track.id)].slice(0, 12);
    emitOSEvent('track_played', { id: track.id, title: track.title });
  });
  document.addEventListener('visibilitychange', () => engine.process());
  window.addEventListener('pagehide', () => persistProgress());
  // Future V9.1: API keys stay server-side. No OpenAI secrets in frontend.
  // /api/soriak may receive getContext() only. No privileged JS execution.
  // Tool/action requests must be allowlisted; never expose unlockSecret to an LLM.
  // Secret verification remains deterministic application/business logic.
  syncUI();
  engine.start();
})();
