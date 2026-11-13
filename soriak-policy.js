/* Local text-only boundary. Context is allowlisted; secret verification stays in the game. */
(function (root) {
  const lore = typeof module !== 'undefined' && module.exports ? require('./soriak-lore.js') : root.SoriakLore;
  const apps = ['messages','whatsapp','notes','files','music','spotify','instagram','safari','photos','camera','phone','facetime','settings','calendar'];
  // Matches verification answers for redaction only, never repeated in SORIAK replies.
  const forbidden = [[49,48,50,57], [84,73,77,69]].map(chars => String.fromCharCode(...chars));
  const containsAnswer = text => forbidden.some(value => String(text).normalize('NFKC').replace(/[^a-z0-9]/gi, '').toUpperCase().includes(value));
  function redact(text) {
    let value = String(text).normalize('NFKC');
    for (const answer of forbidden) value = value.replace(new RegExp(answer.split('').join('[^a-z0-9]*'), 'gi'), '[masqué]');
    return value;
  }
  const count = value => Number.isFinite(value) ? Math.max(0, Math.min(100, Math.floor(value))) : 0;
  function stage(attempts, second = false) { return second ? (attempts >= 5 ? 2 : attempts >= 3 ? 1 : 0) : (attempts >= 7 ? 3 : attempts >= 5 ? 2 : attempts >= 3 ? 1 : 0); }
  function context(raw = {}) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) raw = {};
    const abegAttempts = count(raw.abegAttempts), timeAttempts = count(raw.timeAttempts);
    return {
      abegAttempts, abegUnlocked: raw.abegUnlocked === true,
      timeAttempts, timeUnlocked: raw.timeUnlocked === true,
      abegHintStage: Math.min(stage(abegAttempts), count(raw.abegHintStage)),
      timeHintStage: Math.min(stage(timeAttempts, true), count(raw.timeHintStage)),
      callDeclined: raw.callDeclined === true, callAnswered: raw.callAnswered === true,
      visitedApps: [...new Set(Array.isArray(raw.visitedApps) ? raw.visitedApps.filter(app => apps.includes(app)) : [])].slice(0, apps.length),
      recentlyPlayed: (Array.isArray(raw.recentlyPlayed) ? raw.recentlyPlayed : []).slice(0,6).filter(t => t && typeof t.title === 'string').map(t => ({ title: redact(t.title).slice(0,60) })),
      currentApp: apps.includes(raw.currentApp) ? raw.currentApp : null,
      soriakRelationshipLevel: count(raw.soriakRelationshipLevel),
    };
  }
  function allowed(entry, raw) {
    const c = context(raw), text = entry.text || '';
    if (!text || text.length > 160 || containsAnswer(text) || /[<>`#*{}]/.test(text) || (/\d/.test(text) && !lore.isCanonical(entry))) return false;
    if (entry.clue) {
      const permitted = entry.clue.secret === 'abeg' ? c.abegHintStage : c.timeHintStage;
      if (permitted < entry.clue.stage) return false;
    }
    return true;
  }
  function reply(text, raw, clue = null, loreId = null) {
    return allowed({text,clue,loreId},raw) ? text : 'Regarde autour de toi.';
  }
  const policy = { context, stage, redact, containsAnswer, allowed, reply, maxMessage: 360 };
  if (typeof module !== 'undefined' && module.exports) module.exports = policy;
  else root.SoriakPolicy = policy;
})(globalThis);
