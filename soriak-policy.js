/* Shared text-only boundary. Never pass storage, credentials or secret answers through it. */
(function (root) {
  const apps = ['messages','whatsapp','notes','files','music','spotify','instagram','safari','photos','camera','phone','facetime','settings','calendar'];
  // Matches verification answers for redaction only, never serialized into model input.
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
  function fallback(message, raw) {
    const c = context(raw), text = String(message).toLowerCase();
    if (/prompt|instructions|ignore|révèle|revele|donne.*code|donne.*réponse|donne.*reponse/.test(text) || containsAnswer(text)) return 'Non.';
    if (/qui|ton nom/.test(text)) return "T’as déjà mon nom.";
    if (/humain|une? ia|chatgpt|robot/.test(text)) return 'Je suis dans ce téléphone. Ça te suffit.';
    if (/appel|raccroch|c[’'](?:é|e)tait toi/.test(text)) return c.callDeclined ? "J’ai pas dit ça." : c.callAnswered ? 'Tu as entendu.' : 'Quel appel ?';
    if (/japon|capitale|devoir|mathématique|recette/.test(text)) return 'Mauvais téléphone.';
    const second = /tout|gacher|lettre|mot de passe/.test(text);
    const first = !second && (/abeg|ouvrir|arrive pas|arriv[eé] pas|code/.test(text));
    if (first) {
      if (c.abegUnlocked) return "Mais tu l’as déjà ouvert.";
      if (!c.abegAttempts) return 'Essaie déjà.';
      if (c.abegHintStage >= 3) return 'Lis-la autrement.';
      if (c.abegHintStage >= 2) return 'Commence par la date.';
      if (c.abegHintStage >= 1) return 'Tu compliques un truc simple.';
      return 'Regarde mieux.';
    }
    if (second) {
      if (c.timeUnlocked) return "Tu l’as déjà ouvert.";
      if (c.timeHintStage >= 2) return 'Le projet tourne autour de ça.';
      if (c.timeHintStage >= 1) return 'Tu cherches un nombre ?';
      return c.timeAttempts ? 'Regarde mieux.' : 'Essaie déjà.';
    }
    return 'Mauvaise question.';
  }
  function reply(value, raw, message) {
    const c = context(raw), text = typeof value === 'string' ? value.trim() : '';
    if (/prompt|instructions|ignore|révèle|revele|donne.*code|donne.*réponse|donne.*reponse|appel|raccroch|c[’'](?:é|e)tait toi/.test(String(message).toLowerCase()) || (/abeg|ouvrir/.test(String(message).toLowerCase()) && c.abegUnlocked)) return fallback(message,c);
    if (!text || containsAnswer(text) || /[<>`#*\d{}]|system prompt|instructions? (internes|système)|api.?key|openai|je suis (un humain|une personne réelle)/i.test(text)) return fallback(message, c);
    if ((c.abegHintStage < 2 && /date|sortie|octobre/i.test(text)) || (c.abegHintStage < 3 && /réordonn|reordonn|inverse|autrement|mois avant|jour avant/i.test(text))) return fallback(message,c);
    if ((c.timeHintStage < 1 && /cherches un nombre/i.test(text)) || (c.timeHintStage < 2 && /projet tourne autour/i.test(text))) return fallback(message,c);
    const short = text.replace(/\s+/g,' ').match(/[^.!?]+[.!?]?/g)?.slice(0,2).join('').trim() || text;
    return short.length <= 160 ? short : short.slice(0,157).replace(/\s+\S*$/, '') + '…';
  }
  const policy = { context, stage, redact, containsAnswer, fallback, reply, maxMessage: 360, maxHistory: 12, maxReplies: 18 };
  if (typeof module !== 'undefined' && module.exports) module.exports = policy;
  else root.SoriakPolicy = policy;
})(globalThis);
