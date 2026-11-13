/* Living OS + interactive SORIAK UI. Models can return text only. */
(function () {
  const avatar = 'assets/images/soriak.jpg';
  const copy = Object.freeze({
    discovery: 'Tu fouilles beaucoup.',
    'protected-file': 'Tu comptes l’ouvrir ?',
    'abeg-struggle': 'Tu compliques un truc simple.',
    'abeg-date': 'Commence par la date.',
    'abeg-other': 'Lis-la autrement.',
    'abeg-success': 'Enfin.',
    'time-number': 'Tu cherches un nombre ?',
    'time-project': 'Le projet tourne autour de ça.',
    'call-declined': "Pourquoi t’as raccroché ?",
  });
  const sent = (c, id) => c.os.soriak.sentMessageIds.includes(id);
  const failureEvents = ['secret_attempt_failed', 'os_effect_delivered'];
  const hint = (id, secret, attempts, previous) => ({
    id: `soriak-${id}`, event: failureEvents, once: true, priority: 3, delay: [25000, 45000],
    when: c => !c[secret + 'Unlocked'] && c[secret + 'Attempts'] >= attempts && (!previous || sent(c, previous)),
    obsolete: c => c[secret + 'Unlocked'], effect: { type: 'soriak_message', messageId: id },
  });
  const rules = [
    { id: 'soriak-protected-file', event: 'file_opened', once: true, priority: 1, delay: [25000,40000],
      when: (c,p) => ['abeg','tout'].includes(p.file) && (p.file === 'abeg' ? !c.abegUnlocked && c.abegAttempts === 0 : !c.timeUnlocked && c.timeAttempts === 0),
      obsolete: (c,p) => p.file === 'abeg' ? c.abegUnlocked || c.abegAttempts > 0 : c.timeUnlocked || c.timeAttempts > 0,
      effect: { type: 'soriak_message', messageId: 'protected-file' } },
    hint('abeg-struggle', 'abeg', 3),
    hint('abeg-date', 'abeg', 5, 'abeg-struggle'),
    hint('abeg-other', 'abeg', 7, 'abeg-date'),
    hint('time-number', 'time', 3),
    hint('time-project', 'time', 5, 'time-number'),
    { id: 'soriak-discovery', event: 'app_opened', once: true, priority: 1, delay: [20000, 30000], minAge: 90000,
      when: c => c.unlocked && c.visitedApps.length >= 3,
      effect: { type: 'soriak_message', messageId: 'discovery' } },
    { id: 'soriak-abeg-success', event: 'secret_unlocked', once: true, priority: 4, delay: [20000, 35000],
      when: (c, p) => p.secret === 'abeg' && c.abegUnlocked,
      effect: { type: 'soriak_message', messageId: 'abeg-success' } },
    { id: 'soriak-call-declined', event: 'call_declined', once: true, priority: 0, delay: [35000, 45000],
      when: c => c.os.soriak.discovered,
      effect: { type: 'soriak_message', messageId: 'call-declined' } },

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
  const blocked = () => !state.phoneUnlocked || state.callStatus !== 'idle' || state.facetimeActive || !modal.classList.contains('hidden') || document.hidden || notifications.key !== null || chat?.busy;
  const relative = at => {
    const minutes = Math.max(0, Math.floor((Date.now() - at) / 60000));
    return minutes === 0 ? 'maintenant' : `il y a ${minutes} min`;
  };
  let chat = null;
  const notificationText = n => n.text || copy[n.messageId] || '...';
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
    if (notificationId) emitOSEvent('notification_opened', { id: notificationId });
    route('messages');
    navigate(renderThread);
  }
  function refreshThread(scroll = false) {
    const area = $('[data-soriak-thread] .bubble-area');
    if (!area || !chat) return;
    const nearBottom = area.scrollHeight - area.scrollTop - area.clientHeight < 80;
    const signature = JSON.stringify([state.livingOS.soriak.thread.map(m => m.id), chat.busy]);
    if (area.dataset.signature !== signature) {
      area.innerHTML = state.livingOS.soriak.thread.map(m => `<div class="time-label" data-soriak-at="${m.at}">${relative(m.at)}</div><div class="bubble-line ${m.role === 'user' ? 'me' : 'them'}"><div class="bubble">${escapeHTML(m.text)}</div></div>`).join('') + (chat.busy ? '<div class="bubble-line them" data-soriak-typing role="status"><div class="bubble">SORIAK écrit…</div></div>' : '');
      area.dataset.signature = signature;
      if (scroll || nearBottom) area.scrollTo({top:area.scrollHeight,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
    }
    $$('[data-soriak-at]',area).forEach(el => { el.textContent = relative(Number(el.dataset.soriakAt)); });
    const input = $('[data-soriak-input]');
    const button = $('[data-soriak-send]');
    if (button && input) button.disabled = chat.busy || !input.value.trim();
  }
  function renderThread() {
    if (notifications.key?.startsWith('soriak-') || notifications.key?.startsWith('reply:')) notifications.hide();
    markRead();
    if (!$('[data-soriak-thread]')) emitOSEvent('message_opened', { thread: 'soriak' });
    openApp(`<div class="thread-wrap" data-soriak-thread><div class="thread-head"><button class="back" data-app-back aria-label="Retour aux messages">${icon('back')}</button><div class="thread-person">${avatarHTML(avatar, 'SORIAK')}<b>SORIAK</b></div></div><div class="bubble-area"></div><form class="imessage-compose" data-soriak-composer><span></span><input class="field" data-soriak-input name="message" maxlength="360" aria-label="iMessage" placeholder="iMessage" autocomplete="off"><button type="submit" class="send-button" data-soriak-send aria-label="Envoyer" disabled>${icon('send')}</button></form></div>`);
    $('[data-soriak-input]').oninput = () => refreshThread();
    $('[data-soriak-composer]').onsubmit = e => {
      e.preventDefault();
      const input = $('[data-soriak-input]');
      if (chat.busy || !input.value.trim() || input.value.trim().length > SoriakPolicy.maxMessage) return;
      const value = input.value;
      input.value = '';
      chat.send(value);
      refreshThread(true);
    };
    refreshThread(true);
  }
  function rowHTML() {
    const s = state.livingOS.soriak;
    const last = s.thread?.at(-1) || {text:'...',at:Date.now()};
    return `<button class="row message-row" data-soriak-row data-searchable="SORIAK ${escapeHTML(last.text)}"><span class="unread-dot ${s.unreadCount ? 'visible' : ''}"></span>${avatarHTML(avatar, 'SORIAK')}<span class="row-copy"><b>SORIAK</b><span>${escapeHTML(last.text)}</span></span><span class="row-meta">${relative(last.at)} ${icon('back')}</span></button>`;
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
    card.innerHTML = `<img src="${avatar}" alt=""><div><b>Messages</b><small>${relative(unread.at)}</small><strong>SORIAK</strong><p>${escapeHTML(notificationText(unread))}</p></div>`;
    card.onclick = () => { if (!state.phoneUnlocked) unlockPhone(); openThread(unread.id); };
  }
  function syncUI() {
    syncSignals();
    refreshThread();
    const pendingBanner = records().find(n => n.bannerPending && !n.read);
    if (pendingBanner && !blocked() && !$('[data-soriak-thread]')) {
      if (notifications.show({key:pendingBanner.id,app:'Messages',image:avatar,sender:'SORIAK',preview:notificationText(pendingBanner),open:()=>openThread(pendingBanner.id)})) {
        pendingBanner.bannerPending = false;
        persistProgress();
      }
    }
    // Refresh only the dynamic row, preserving search, focus and existing threads.
    const list = $('.messages-app .list');
    if (list) {
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
    if (!s.discoveredAt) s.discoveredAt = at;
    s.relationshipLevel += 1;
    s.sentMessageIds.push(effect.messageId);
    s.threadRead = inThread;
    if (!inThread) s.unreadCount += 1;
    state.livingOS.notificationHistory.push({ id: pending.id, type: effect.type, messageId: effect.messageId, text:copy[effect.messageId], at, read: inThread });
    chat.append({id:pending.id,role:'soriak',text:copy[effect.messageId],at,source:'living-os'});
    if (inThread) refreshThread();
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
      const abegAttempts = state.attempts.abeg, timeAttempts = state.attempts.tout;
      return SoriakPolicy.context({
        abegAttempts, abegUnlocked: state.abegUnlocked, timeAttempts, timeUnlocked: state.toutGacherUnlocked,
        abegHintStage:SoriakPolicy.stage(abegAttempts),timeHintStage:SoriakPolicy.stage(timeAttempts,true),
        callDeclined:state.unknownFirstDeclined || state.livingOS.events.some(e=>e.type==='call_declined'),callAnswered:state.unknownCallAccepted,
        visitedApps:state.livingOS.exploredApps || [],recentlyPlayed:state.livingOS.recentlyPlayed,
        currentApp:state.currentApp,soriakRelationshipLevel:state.livingOS.soriak.relationshipLevel,
      });
    },
    receiveUserMessage(text) { return chat.send(text); },
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
  chat = new SoriakChat({
    state:state.livingOS.soriak,
    legacy:records().map(n=>({id:n.id,role:'soriak',text:notificationText(n),at:n.at,source:'living-os'})).concat(state.livingOS.soriak.receivedReplies.map((n,i)=>({id:'legacy-user:'+i,role:'user',text:n.text,at:n.at,source:'interactive'}))),
    context:()=>SoriakEngine.getContext(),persist:persistProgress,changed:()=>{
      const pending = state.livingOS.soriak.pendingRequest;
      if (pending) emitOSEvent('soriak_user_message');
      syncUI();
    },
    received:(message,meta)=>{
      const inThread = !!$('[data-soriak-thread]');
      state.livingOS.soriak.relationshipLevel++;
      state.livingOS.soriak.threadRead = inThread;
      if (!inThread) state.livingOS.soriak.unreadCount++;
      state.livingOS.notificationHistory.push({id:message.id,type:'soriak_message',text:message.text,at:message.at,read:inThread,bannerPending:!inThread,source:'interactive'});
      state.livingOS.notificationHistory = state.livingOS.notificationHistory.slice(-60);
      emitOSEvent('soriak_ai_reply',{fallback:meta.fallback});
    },debug,
  });
  // No privileged model tools: output is escaped text; verification stays in trySecret().
  chat.start();
  syncUI();
  engine.start();
})();
