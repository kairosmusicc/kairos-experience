const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const phoneScene = $("#phoneScene"),
  lock = $("#lock"),
  home = $("#home"),
  appView = $("#appView"),
  appContent = $("#appContent"),
  device = $("#device"),
  statusBar = $("#statusBar"),
  modal = $("#modal"),
  toastEl = $("#toast"),
  screen = $(".screen");
// Session state is separate from rendered views. Storage may be unavailable in private browsers.
const session = {
  get(key) {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      sessionStorage.setItem(key, value);
    } catch {}
  },
};
function storedJSON(key, fallback) {
  try {
    return JSON.parse(session.get(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
const savedProgress = storedJSON("kairos.progress", {});
const state = {
  phoneUnlocked: false,
  lockCameraActive: false,
  flashlightOn: false,
  currentApp: null,
  currentView: null,
  navigationStack: [],
  callHandled:
    session.get("kairos.callHandled") === "1" || !!savedProgress.callTriggered,
  messagesOpened: !!savedProgress.messagesOpened,
  paapiiMessageRead: !!savedProgress.paapiiMessageRead,
  whatsappOpened: !!savedProgress.whatsappOpened,
  notesOpened: !!savedProgress.notesOpened,
  callTriggered: !!savedProgress.callTriggered,
  finalSequenceTriggered: !!savedProgress.finalSequenceTriggered,
  finalNoteOpened: !!savedProgress.finalNoteOpened,
  firstUnlockedAt: savedProgress.firstUnlockedAt || 0,
  visitedApps: new Set(savedProgress.visitedApps || []),
  callHistory: savedProgress.callHistory || null,
  callStatus: "idle",
  unknownCallAttempts:
    savedProgress.unknownCallAttempts ?? (savedProgress.callTriggered ? 1 : 0),
  unknownFirstDeclined: !!savedProgress.unknownFirstDeclined,
  unknownCallRecalled: !!savedProgress.unknownCallRecalled,
  unknownCallAccepted:
    !!savedProgress.unknownCallAccepted ||
    savedProgress.callHistory?.outcome === "answered",
  recallDueAt: savedProgress.recallDueAt || 0,
  facetimeStream: null,
  facetimeActive: false,
  abegUnlocked: session.get("kairos.abeg") === "1",
  toutGacherUnlocked: session.get("kairos.tout") === "1",
  attempts: { abeg: 0, tout: 0 },
  messages: {},
  read: new Set(savedProgress.read || []),
  photoIndex: 0,
  musicState: null,
  instagramEpoch: savedProgress.instagramEpoch || Date.now(),
  instagramEmmanuellaRead: !!savedProgress.instagramEmmanuellaRead,
  instagramAngisteOpened: !!savedProgress.instagramAngisteOpened,
  instagramCorentinOpened: !!savedProgress.instagramCorentinOpened,
  instagramRedkaOpened: !!savedProgress.instagramRedkaOpened,
  finalAlbumMessageAvailable: !!savedProgress.finalAlbumMessageAvailable,
  finalAlbumMessageRead: !!savedProgress.finalAlbumMessageRead,
  finalAlbumMessageAt: savedProgress.finalAlbumMessageAt || 0,
  safariKairosAvailable: true,
  albumLinkClicked: !!savedProgress.albumLinkClicked,
  instagramReplies: savedProgress.instagramReplies || {},
  instagramReactions: savedProgress.instagramReactions || {},
  safariHistory: Array.isArray(savedProgress.safariHistory)
    ? savedProgress.safariHistory
        .filter((x) => ["start", "album"].includes(x))
        .slice(-20)
    : ["start"],
};
let callTimer = null,
  callStartedAt = 0,
  callInterval = null,
  recallTimer = null;
function navigate(renderer, ...args) {
  transitionMedia({ renderer, args });
  if (state.currentView) state.navigationStack.push(state.currentView);
  state.currentView = { renderer, args };
  renderer(...args);
}
function unlockPhone() {
  resetLockSwipe();
  state.lockCameraActive = false;
  systemSounds.enable();
  warmAppleMusic();
  if (!state.phoneUnlocked) trackEvent("phone_unlocked");
  state.phoneUnlocked = true;
  if (!state.firstUnlockedAt) state.firstUnlockedAt = Date.now();
  persistProgress();
  systemSounds.play("unlock");
  scheduleIncomingCall();
  goHome();
}

// Single checked source for the official album artwork.
const KAIROS_COVER = "assets/images/kairos-cover.jpg";
const ALBUM_URL = "https://album.link/qzsdrsh5r3m8j";
const AUDIO = {
  abeg: "assets/audio/abeg.wav",
  tout: "assets/audio/tout_gacher.wav",
  call: "assets/audio/Nouvel-enregistrement-215.wav",
};
const GALLERY = [
  "assets/images/manii-01.jpg",
  "assets/images/manii-02.jpg",
  "assets/images/duo-01.jpg",
  "assets/images/paapii-01.jpg",
  "assets/images/lockscreen-cicatrices.png",
  "assets/images/IMG_2207-2.png",
  "assets/images/gallery-studio.jpg",
  "assets/images/gallery-kid.jpg",
  "assets/images/gallery-cat.jpg",
  "assets/images/gallery-track-1.png",
  "assets/images/gallery-track-2.png",
  "assets/images/gallery-track-3.png",
  "assets/images/gallery-track-4.png",
  "assets/images/gallery-track-5.png",
  "assets/images/home-wallpaper.jpg",
];

const IMessageThreads = {
  paapii: {
    name: "Paapii",
    avatar: "assets/images/paapii-01.jpg",
    preview: "lis-la pas comme un français.",
    offset: 7,
    messages: [
      ["them", "t’as gardé le bounce d’abeg ?"],
      ["me", "ouais dans Fichiers"],
      ["me", "par contre j’ai verrouillé le truc et j’ai oublié le code 😭"],
      ["them", "mdrrrr t’es sérieux"],
      ["me", "rappelle-moi"],
      ["them", "non cherche un peu"],
      ["me", "frère 😭"],
      ["them", "c’est lié au projet"],
      ["me", "ça m’aide de fou merci"],
      ["them", "la date"],
      ["me", "29/10"],
      ["them", "voilà"],
      ["me", "et donc ?"],
      ["them", "lis-la pas comme un français."],
    ],
  },
  corentin: {
    name: "Corentin",
    avatar: "assets/images/gallery-kid.jpg",
    preview: "planning validé ✅",
    offset: 29,
    messages: [
      ["them", "planning validé ✅"],
      ["me", "parfait"],
      ["them", "on garde les deux exclus hors du dossier public"],
      ["me", "oui"],
      ["them", "je fais le point demain avec vous deux"],
    ],
  },
  yoan: {
    name: "Yoan — Zénithal",
    avatar: "assets/images/gallery-studio.jpg",
    preview: "je vous renvoie les exports",
    offset: 74,
    messages: [
      ["them", "je vous renvoie les exports"],
      ["me", "lourd merci"],
      ["them", "j’ai aussi gardé quelques photos du shooting"],
      ["me", "mets-les dans le tel"],
    ],
  },
  redka: {
    name: "Redka",
    avatar: "assets/images/gallery-cat.jpg",
    preview: "le bounce est propre",
    offset: 106,
    messages: [
      ["them", "le bounce est propre"],
      ["me", "ça marche"],
      ["them", "j’ai juste resserré l’intro"],
      ["me", "parfait"],
    ],
  },
};
const WAThreads = {
  paapii: {
    name: "Paapii",
    avatar: "assets/images/paapii-01.jpg",
    preview: "tu le connais déjà",
    offset: 4,
    unread: 1,
    messages: [
      ["them", "frérot"],
      [
        "them",
        "j’ai retrouvé un truc qu’on avait dit de pas mettre dans le dossier",
      ],
      ["me", "quoi ?"],
      ["file", "tout_gacher.wav"],
      ["me", "mais t’avais pas supprimé ça ?"],
      ["them", "apparemment non 💀"],
      ["me", "le fichier est verrouillé"],
      ["them", "normal"],
      ["me", "le mdp ?"],
      ["them", "4 lettres"],
      ["them", "tu le connais déjà"],
    ],
  },
  kairos: {
    name: "KAIROS",
    avatar: "assets/images/duo-01.jpg",
    preview: "Corentin : planning validé ✅",
    offset: 27,
    messages: [
      ["them", "Corentin : planning validé ✅"],
      ["me", "on est bons"],
      ["them", "Yoan : je vous renvoie les exports ce soir"],
    ],
  },
  corentin: {
    name: "Corentin",
    avatar: "assets/images/gallery-kid.jpg",
    preview: "on fait le point demain",
    offset: 59,
    messages: [
      ["them", "on fait le point demain"],
      ["me", "ça marche"],
      ["them", "je vous envoie la dernière checklist avant midi"],
    ],
  },
  yoan: {
    name: "Yoan",
    avatar: "assets/images/gallery-studio.jpg",
    preview: "je vous renvoie les exports",
    offset: 121,
    messages: [
      ["them", "je vous renvoie les exports"],
      ["me", "merci frère"],
      ["them", "les selects photo aussi"],
    ],
  },
};

function pad(n) {
  return String(n).padStart(2, "0");
}
function clock(offset = 0) {
  const d = new Date(Date.now() - offset * 60000);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function syncClock() {
  const d = new Date(),
    time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  $("#statusTime").textContent = time;
  $("#lockTime").textContent = time;
  const days = [
      "Dimanche",
      "Lundi",
      "Mardi",
      "Mercredi",
      "Jeudi",
      "Vendredi",
      "Samedi",
    ],
    months = [
      "janvier",
      "février",
      "mars",
      "avril",
      "mai",
      "juin",
      "juillet",
      "août",
      "septembre",
      "octobre",
      "novembre",
      "décembre",
    ];
  $("#lockDate").textContent =
    `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
  const cal = $("#calendarDay");
  if (cal) cal.textContent = d.getDate();
  $(".calendar-icon small").textContent = d
    .toLocaleDateString("fr-FR", { weekday: "short" })
    .toUpperCase();
  $$("[data-clock]").forEach(
    (el) => (el.textContent = clock(Number(el.dataset.clock))),
  );
}
syncClock();
setInterval(syncClock, 10000);
// Mobile browsers use the real system chrome; unknown batteries have no invented number.
$(".battery-pill").classList.add("battery-unknown");
if (navigator.getBattery) {
  navigator
    .getBattery()
    .then((b) => {
      const update = () => {
        if (!Number.isFinite(b.level) || b.level < 0 || b.level > 1) return;
        $("#batteryLevel").textContent = Math.round(b.level * 100);
        $(".battery-pill").classList.remove("battery-unknown");
      };
      update();
      b.addEventListener("levelchange", update);
    })
    .catch(() => {});
}

function icon(name) {
  const paths = {
    igHome: '<path d="m3 10 9-7 9 7v11h-6v-7H9v7H3z"/>',
    reels:
      '<rect x="3" y="4" width="18" height="17" rx="4"/><path d="M3 9h18M8 4l3 5m3-5 3 5m-7 4 5 3-5 3z"/>',
    message: '<path d="m22 2-7 20-4-9-9-4zM22 2 11 13"/>',
    heart:
      '<path d="M20 4c-3-2-6 0-8 2-2-2-5-4-8-2-5 4 0 10 8 16 8-6 13-12 8-16z"/>',
    grid: '<path d="M3 3h18v18H3zM9 3v18M15 3v18M3 9h18M3 15h18"/>',
    sliders:
      '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2" fill="white"/><circle cx="16" cy="12" r="2" fill="white"/><circle cx="10" cy="18" r="2" fill="white"/>',
    reload: '<path d="M20 10a8 8 0 1 0-1 8M20 4v6h-6"/>',
    tabs: '<rect x="7" y="3" width="14" height="14" rx="3"/><path d="M17 17v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h3"/>',
    globe:
      '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-6 6-6 12 0 18 6-6 6-12 0-18z"/>',
    flashlight: '<path d="M6 3h12v4l-3 4v10H9V11L6 7zM6 7h12M12 14v3"/>',
    gallery:
      '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="8" r="2"/><path d="m4 17 5-5 4 4 3-3 5 5"/>',
    sticker:
      '<path d="M4 4h16v10l-6 6H4zM14 20v-6h6M8 9h.01M15 9h.01M8 13q4 3 7 0"/>',
    music:
      '<path d="M9 18V5l11-2v13M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/>',
    pause: '<path d="M9 5v14M15 5v14"/>',
    next: '<path d="m5 5 11 7-11 7zM19 5v14"/>',
    previous: '<path d="m19 5-11 7 11 7zM5 5v14"/>',
    shuffle:
      '<path d="M3 6h3c5 0 7 12 12 12h3m-4-4 4 4-4 4M3 18h3c2 0 3-2 4-4m4-4c1-2 2-4 4-4h3m-4-4 4 4-4 4"/>',
    ellipsis:
      '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    share: '<path d="M12 15V2m-4 4 4-4 4 4M7 9H4v12h16V9h-3"/>',
    speaker:
      '<path d="M4 9h4l5-4v14l-5-4H4zM16 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>',
    file: '<path d="M5 3h9l5 5v13H5zM14 3v6h5M9 13h6M9 17h6"/>',
    folder: '<path d="M3 6h7l2 3h9v12H3z"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
    pin: '<path d="m9 3 6 0-1 6 4 4H6l4-4zM12 13v8"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    send: '<path d="M12 20V4m-6 6 6-6 6 6"/>',
    check: '<path d="m5 12 4 4 10-10"/>',
    video:
      '<rect x="2" y="5" width="14" height="14" rx="3"/><path d="M16 9l6-3v12l-6-3z"/>',
    phone:
      '<path d="M6.6 2.7l3.1 3.1-2 3.2c1.8 3.3 4.1 5.6 7.4 7.4l3.1-2 3.1 3.1-2.1 3.5c-.6 1-1.7 1.5-2.9 1.2C8.6 20.4 3.6 15.4 1.8 7.7 1.5 6.5 2 5.4 3 4.8z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 7h.01"/>',
    compose:
      '<path d="M4 20l4.5-1 10-10-3.5-3.5-10 10L4 20zM14 6l3.5 3.5M13 20h7"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    camera:
      '<path d="M4 7h3l1.5-2h7L17 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"/><circle cx="12" cy="13" r="4"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    play: '<path d="M8 5l11 7-11 7z"/>',
    recent: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    contacts:
      '<circle cx="12" cy="8" r="3"/><path d="M6 20c.5-4 2.5-6 6-6s5.5 2 6 6"/>',
    keypad:
      '<path d="M7 6h.01M12 6h.01M17 6h.01M7 11h.01M12 11h.01M17 11h.01M7 16h.01M12 16h.01M17 16h.01"/>',
    star: '<path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
    voicemail:
      '<circle cx="7" cy="12" r="4"/><circle cx="17" cy="12" r="4"/><path d="M7 16h10"/>',
    flash: '<path d="M13 2L5 14h6l-1 8 8-12h-6z"/>',
    rotate:
      '<path d="M20 7v5h-5M4 17v-5h5M18 12a7 7 0 0 0-12-4M6 12a7 7 0 0 0 12 4"/>',
  };
  return `<svg class="ui" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ""}</svg>`;
}
function setStatus(dark = false) {
  statusBar.className = "status-bar " + (dark ? "dark-status" : "light-status");
  device.classList.toggle("dark-ui", dark);
}
function show(v) {
  $$(".view").forEach((x) => x.classList.remove("active-view"));
  v.classList.add("active-view");
}
function goHome() {
  if (state.callStatus !== "idle") return;
  if (state.lockCameraActive && !state.phoneUnlocked) return returnToLock();
  if (!state.phoneUnlocked) return unlockPhone();
  transitionMedia(null);
  state.navigationStack = [];
  state.currentView = null;
  state.currentApp = null;
  setStatus(true);
  show(home);
  appContent.innerHTML = "";
  appView.scrollTop = 0;
  updatePhoneSignals();
  scheduleFinalNote();
  scheduleAlbumMessage();
}
function openApp(html, { dark = false } = {}) {
  setStatus(dark);
  appContent.innerHTML = html;
  show(appView);
  appView.scrollTop = 0;
  appContent.scrollTop = 0;
  bindDynamic();
  enhanceControls();
  syncAudioUI();
  bindV8Controls();
  syncAppleCatalogUI();
}
function goBack() {
  if (state.lockCameraActive && !state.phoneUnlocked) return returnToLock();
  if (state.callStatus !== "idle") return;
  if ($("#photoViewer.open")) return closePhoto();
  const previous = state.navigationStack.pop();
  if (previous) {
    transitionMedia(previous);
    state.currentView = previous;
    previous.renderer(...previous.args);
  } else goHome();
}
function toast(msg, ms = 1700) {
  toastEl.textContent = msg;
  toastEl.classList.remove("hidden");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toastEl.classList.add("hidden"), ms);
}
function escapeHTML(s = "") {
  return String(s).replace(
    /[&<>'"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        c
      ],
  );
}
function avatarHTML(src, name = "") {
  return src
    ? `<img class="avatar" src="${src}" alt="">`
    : `<span class="avatar initial">${escapeHTML(name[0] || "?")}</span>`;
}
function nav(title, right = "") {
  return `<div class="ios-nav"><button class="back" data-app-back aria-label="Retour">${icon("back")}</button><h2>${title}</h2>${right ? `<button class="action" data-options aria-label="Options">${right === "•••" ? icon("ellipsis") : right}</button>` : '<span class="nav-spacer"></span>'}</div>`;
}
function timeHTML(offset) {
  return `<time data-clock="${offset}">${clock(offset)}</time>`;
}
function iconButton(name, label, attrs = "") {
  return `<button class="icon-glass" aria-label="${label}" ${attrs}>${icon(name)}</button>`;
}
function enhanceControls() {
  $$("button", appContent).forEach((b) => {
    if (!b.getAttribute("aria-label") && !b.textContent.trim()) {
      b.setAttribute(
        "aria-label",
        b.dataset.hot ? b.dataset.hot.replaceAll("-", " ") : "Options",
      );
    }
  });
}

/* MESSAGES — searchable lists and session-only replies. */
function floatingSearch(scope, compose = false) {
  return `<div class="floating-search"><label>${icon("search")}<input type="search" data-search="${scope}" aria-label="Rechercher" placeholder="Rechercher"></label>${compose ? iconButton("compose", "Nouveau message", "data-compose") : ""}</div>`;
}
function renderMessages() {
  const rows = Object.entries(IMessageThreads)
    .map(
      ([id, t], i) =>
        `<button class="row message-row" data-msg-thread="${id}" data-searchable="${escapeHTML(t.name + " " + t.preview)}"><span class="unread-dot ${i === 0 && !state.read.has("im-" + id) ? "visible" : ""}"></span>${avatarHTML(t.avatar, t.name)}<span class="row-copy"><b>${t.name}</b><span>${t.preview}</span></span><span class="row-meta">${timeHTML(t.offset)} ${icon("back")}</span></button>`,
    )
    .join("");
  openApp(
    `<div class="messages-app"><div class="list-toolbar"><button class="text-button" data-message-filter>Filtres</button>${iconButton("ellipsis", "Options des messages", "data-options")}</div><h1 class="section-title">Messages</h1><div class="list">${rows}</div><p class="empty-search hidden">Aucun résultat</p>${floatingSearch("messages", true)}</div>`,
  );
}
function composer(kind, id) {
  return `<form class="${kind === "im" ? "imessage-compose" : "wa-input"}" data-reply="${kind}" data-thread="${id}">${iconButton("plus", "Joindre un fichier", "data-attach")}<input class="field" name="message" aria-label="${kind === "im" ? "iMessage" : "Message"}" placeholder="${kind === "im" ? "iMessage" : "Message"}" autocomplete="off" maxlength="500">${kind === "wa" ? iconButton("camera", "Appareil photo", "data-open-camera") : ""}<button type="submit" class="send-button" aria-label="Message audio">${icon("mic")}</button></form>`;
}
function threadMessages(kind, id, original) {
  return original.concat(state.messages[kind + "-" + id] || []);
}
function renderMessageThread(id) {
  const t = IMessageThreads[id];
  if (!t) return;
  state.read.add("im-" + id);
  if (id === "paapii") state.paapiiMessageRead = true;
  persistProgress();
  updatePhoneSignals();
  const messages = threadMessages("im", id, t.messages),
    lastSentIndex = messages.map(m => m[0]).lastIndexOf("me");
  const msgs = messages.map(
      (m, i) =>
        `<div class="bubble-line ${m[0] === "me" ? "me" : "them"}"><div class="bubble">${escapeHTML(m[1])}</div></div>${i === lastSentIndex ? '<div class="delivery-label">Distribué</div>' : ""}`,
    )
    .join("");
  openApp(
    `<div class="thread-wrap"><div class="thread-head"><button class="back" data-app-back aria-label="Retour aux messages">${icon("back")}</button><div class="thread-person">${avatarHTML(t.avatar, t.name)}<b>${t.name}</b></div><div class="thread-tools">${iconButton("video", "Appeler en vidéo", "data-contact-call")}${iconButton("phone", "Appeler", "data-contact-call")}</div></div><div class="bubble-area"><div class="time-label">Aujourd’hui ${timeHTML(t.offset + t.messages.length)}</div>${msgs}</div>${composer("im", id)}</div>`,
  );
}

/* WHATSAPP — the locked WAV is an incoming document, never a voice note. */
function renderWhatsApp() {
  const rows = Object.entries(WAThreads)
    .map(
      ([id, t]) =>
        `<button class="row wa-row" data-wa-thread="${id}" data-searchable="${escapeHTML(t.name + " " + t.preview)}" data-unread="${t.unread && !state.read.has("wa-" + id) ? "1" : "0"}" data-group="${id === "kairos" ? 1 : 0}" data-favorite="${id === "paapii" ? 1 : 0}">${avatarHTML(t.avatar, t.name)}<span class="row-copy"><b>${t.name}</b><span>${t.preview}</span></span><span class="row-meta">${timeHTML(t.offset)}${t.unread && !state.read.has("wa-" + id) ? `<span class="green-badge">${t.unread}</span>` : ""}</span></button>`,
    )
    .join("");
  openApp(
    `<div class="wa-app"><div class="list-toolbar"><button class="text-button" data-options>Modifier</button><div class="wa-top-actions">${iconButton("camera", "Appareil photo", "data-open-camera")}${iconButton("plus", "Nouvelle discussion", "data-wa-compose")}</div></div><h1 class="section-title">Discussions</h1><label class="wa-search">${icon("search")}<input type="search" aria-label="Rechercher une discussion" placeholder="Rechercher" data-search="whatsapp"></label><div class="chip-row">${["Toutes", "Non lues", "Favoris", "Groupes"].map((label, i) => `<button class="chip ${i === 0 ? "active" : ""}" data-wa-filter="${i}" aria-pressed="${i === 0}">${label}</button>`).join("")}</div><div class="list">${rows}</div><p class="empty-search hidden">Aucune discussion</p><div class="wa-footer">${icon("lock")} Vos messages personnels sont chiffrés de bout en bout.</div></div>`,
  );
}
function renderWAThread(id) {
  const t = WAThreads[id];
  if (!t) return;
  state.read.add("wa-" + id);
  persistProgress();
  updatePhoneSignals();
  const base = t.offset + t.messages.length * 2;
  const msgs = threadMessages("wa", id, t.messages)
    .map((m, i) => {
      const tm = timeHTML(Math.max(0, base - i * 2));
      if (m[0] === "file")
        return `<div class="wa-bubble-line them"><div class="wa-bubble attachment-bubble"><button class="wa-document" data-audio-lock="tout" aria-label="Ouvrir tout_gacher.wav">${icon("file")}<span><b>tout_gacher.wav</b><small>WAV · 31 s · fichier protégé</small></span>${icon("lock")}</button><small>${tm}</small></div></div>`;
      return `<div class="wa-bubble-line ${m[0] === "me" ? "me" : "them"}"><div class="wa-bubble">${escapeHTML(m[1])}<small>${tm}${m[0] === "me" ? ' <span class="bluechecks">✓✓</span>' : ""}</small></div></div>`;
    })
    .join("");
  openApp(
    `<div class="wa-thread"><div class="wa-thread-head"><button class="back" data-app-back aria-label="Retour aux discussions">${icon("back")}</button>${avatarHTML(t.avatar, t.name)}<div><b>${t.name}</b><small>en ligne</small></div><div class="wa-thread-tools">${iconButton("video", "Appel vidéo", "data-contact-call")}${iconButton("phone", "Appeler", "data-contact-call")}</div></div><div class="wa-chat"><div class="wa-day">Aujourd’hui</div><div class="wa-encryption">${icon("lock")} Les messages et les appels sont chiffrés de bout en bout.</div>${msgs}</div>${composer("wa", id)}</div>`,
  );
}

/* PROTECTED FILES */
function renderFiles() {
  openApp(
    `<div class="files-app">${nav("Récents", "•••")}<h1 class="section-title">Fichiers</h1><div class="files-block"><button class="file-row" data-file="abeg">${icon("file")}<span><b>ABEG_MASTER.wav</b><small>Audio · ${state.abegUnlocked ? "déverrouillé" : "protégé"}</small></span>${icon("lock")}</button><button class="file-row" data-file-photos>${icon("folder")}<span><b>Exports shooting</b><small>Photos</small></span>${icon("back")}</button><button class="file-row" data-file-tracklist>${icon("file")}<span><b>TRACKLIST_FINAL</b><small>Note · 29 oct.</small></span>${icon("back")}</button></div></div>`,
  );
}
function secretUnlocked(kind) {
  return state[kind === "abeg" ? "abegUnlocked" : "toutGacherUnlocked"];
}
function renderFileLock(kind) {
  if (secretUnlocked(kind)) {
    state.currentView = { renderer: renderAudio, args: [kind] };
    return renderAudio(kind);
  }
  const title = kind === "abeg" ? "ABEG_MASTER.wav" : "tout_gacher.wav";
  openApp(
    `<div class="lock-file">${nav(title)}<div class="file-card">${icon("lock")}<h3>Fichier protégé</h3><p>${kind === "abeg" ? "Code à 4 chiffres" : "Mot de passe — 4 lettres"}</p><form class="code-input" data-secret="${kind}"><input id="codeField" type="password" inputmode="${kind === "abeg" ? "numeric" : "text"}" aria-label="${kind === "abeg" ? "Code à 4 chiffres" : "Mot de passe à 4 lettres"}" maxlength="4" autocomplete="off" required><button data-unlock="${kind}">Déverrouiller</button></form><p id="passwordFeedback" class="password-feedback" role="status"></p></div></div>`,
  );
}
function trySecret(kind, value) {
  if (value.trim().toUpperCase() === (kind === "abeg" ? "1029" : "TIME")) {
    state[kind === "abeg" ? "abegUnlocked" : "toutGacherUnlocked"] = true;
    session.set("kairos." + kind, "1");
    trackEvent(kind === "abeg" ? "abeg_unlocked" : "tout_gacher_unlocked");
    briefFeedback("secret");
    systemSounds.play("fileUnlock");
    // Replace the lock screen in history so back never asks for the password again.
    state.currentView = { renderer: renderAudio, args: [kind] };
    renderAudio(kind);
    return;
  }
  const n = ++state.attempts[kind];
  const hints =
    kind === "tout"
      ? [
          "Mot de passe incorrect",
          "Quatre lettres. Tu les as déjà vues.",
          "Ce qui nous échappe, même quand on essaie de le garder.",
        ]
      : ["Code incorrect", "La date de sortie.", "Le mois avant le jour."];
  $("#passwordFeedback").textContent = hints[Math.min(n - 1, 2)];
  $("#codeField").value = "";
  $("#codeField").focus();
}
function showPassword(kind) {
  navigate(renderFileLock, kind);
}
function closeModal() {
  phoneScene.querySelectorAll(".view").forEach((v) => (v.inert = false));
  $("#homeIndicator").inert = false;
  modal.className = "modal hidden";
  modal.innerHTML = "";
  modal.removeAttribute("role");
  modal.removeAttribute("aria-modal");
}

/* A single local media player owns all music, including unlocked files.
   Album tracks without a real file are deliberately unavailable. */
const ALBUM_TRACKS = [
  "KAIROS",
  "GOD BLESS",
  "BOULOT",
  "BANDITE",
  "VINCENT KOMPANY",
  "INTERLUDE",
  "TU SAIS",
  "LPB",
].map((title, i) => ({
  id: "album-" + i,
  title,
  artist: "Paapii & Manii",
  artwork: KAIROS_COVER,
  src: null,
  source: "apple-preview",
}));
const SECRET_TRACKS = [
  {
    id: "abeg",
    title: "ABEG",
    artist: "Manii & Paapii",
    artwork: "assets/images/duo-01.jpg",
    src: AUDIO.abeg,
  },
  {
    id: "tout",
    title: "Tout gâcher",
    artist: "Manii & Paapii",
    artwork: "assets/images/gallery-track-2.png",
    src: AUDIO.tout,
  },
];
class AudioManager {
  constructor() {
    this.audio = new Audio();
    this.audio.preload = "metadata";
    this.playGeneration = 0;
    this.state = {
      currentTrack: null,
      currentTime: 0,
      duration: 0,
      isPlaying: false,
      queue: [],
      shuffle: false,
      artwork: KAIROS_COVER,
    };
    state.musicState = this.state;
    for (const event of [
      "timeupdate",
      "loadedmetadata",
      "durationchange",
      "play",
      "pause",
      "ended",
    ])
      this.audio.addEventListener(event, () => {
        this.state.currentTime = this.audio.currentTime;
        this.state.duration = Number.isFinite(this.audio.duration)
          ? this.audio.duration
          : 0;
        this.state.isPlaying = !this.audio.paused;
        syncAudioUI();
        if (event === "play") briefFeedback("audio");
        if (event === "ended") this.next(1, false);
      });
    this.audio.addEventListener("error", () => {
      this.state.isPlaying = false;
      syncAudioUI();
      if (this.state.currentTrack) toast("Ce fichier ne peut pas être lu");
    });
  }
  prime(track) {
    if (!track?.src || this.state.currentTrack || state.callStatus !== "idle")
      return;
    this.audio.preload = "auto";
    if (this.audio.getAttribute("src") !== track.src) {
      this.audio.src = track.src;
      this.audio.load();
    }
  }
  available() {
    return SECRET_TRACKS.filter((t) => secretUnlocked(t.id));
  }
  load(
    track,
    queue = track?.source === "apple-preview"
      ? ALBUM_TRACKS
      : track?.source === "apple-catalog"
        ? [track]
        : this.available(),
  ) {
    if (!track?.src) {
      toast("Audio indisponible");
      return false;
    }
    if (state.callStatus !== "idle") {
      toast("Appel en cours");
      return false;
    }
    if (track.source === "apple-preview") stopOfficialEmbeds();
    this.state.queue = queue.filter((t) => t.src);
    if (this.state.currentTrack?.id !== track.id) {
      if (this.audio.getAttribute("src") !== track.src)
        this.audio.src = track.src;
      this.state.currentTrack = track;
      this.state.artwork = track.artwork || KAIROS_COVER;
      this.state.currentTime = 0;
      this.state.duration = 0;
    }
    syncAudioUI();
    return true;
  }
  async play(track) {
    if (state.callStatus !== "idle" || !audioContextFor(state.currentView))
      return;
    const generation = ++this.playGeneration;
    if (track && !this.load(track)) return;
    if (!this.state.currentTrack) {
      if (state.currentApp === "music") {
        await playKairos();
        return;
      }
      const first = this.available()[0];
      if (!first) {
        toast("Les fichiers audio sont encore verrouillés");
        return;
      }
      this.load(first);
    }
    try {
      await this.audio.play();
      if (generation !== this.playGeneration) return;
      if (!audioContextFor(state.currentView) || state.callStatus !== "idle")
        this.stop();
    } catch {
      if (generation !== this.playGeneration) return;
      this.state.isPlaying = false;
      syncAudioUI();
      toast("Touchez Lecture pour démarrer le son");
    }
  }
  pause() {
    ++this.playGeneration;
    this.audio.pause();
  }
  resume() {
    return this.play();
  }
  previous() {
    this.next(-1);
  }
  stop() {
    ++this.playGeneration;
    this.audio.pause();
    // Reset even if metadata has not arrived yet; do not let a pending play escape its view.
    if (this.audio.getAttribute("src")) this.audio.currentTime = 0;
    this.state.currentTime = 0;
    this.state.isPlaying = false;
    syncAudioUI();
  }
  toggle() {
    if (this.audio.paused) this.resume();
    else this.pause();
  }
  next(direction = 1, manual = true) {
    const q = this.state.queue;
    if (!q.length) return;
    if (direction < 0 && this.audio.currentTime > 3) {
      this.audio.currentTime = 0;
      return;
    }
    const i = q.findIndex((t) => t.id === this.state.currentTrack?.id);
    let next = i + direction;
    if (this.state.shuffle && q.length > 1)
      next = (i + 1 + Math.floor(Math.random() * (q.length - 1))) % q.length;
    if (!manual && next >= q.length) return;
    this.play(q[(next + q.length) % q.length]);
  }
  seek(value) {
    if (this.state.duration)
      this.audio.currentTime = Math.max(
        0,
        Math.min(this.state.duration, value),
      );
  }
}
const audioManager = new AudioManager();
function mediaTime(s) {
  return `${Math.floor((s || 0) / 60)}:${pad(Math.floor((s || 0) % 60))}`;
}
function syncAudioUI() {
  if (typeof audioManager === "undefined") return;
  const m = audioManager.state,
    t = m.currentTrack;
  $$("[data-player-toggle]").forEach((b) => {
    b.innerHTML = icon(m.isPlaying ? "pause" : "play");
    b.setAttribute("aria-label", m.isPlaying ? "Pause" : "Lecture");
    b.setAttribute("aria-pressed", String(m.isPlaying));
  });
  $$("[data-now-title]").forEach(
    (el) => (el.textContent = t?.title || "Aucune lecture"),
  );
  $$("[data-now-artist]").forEach(
    (el) => (el.textContent = t?.artist || "Paapii & Manii"),
  );
  $$("[data-mini-progress]").forEach(
    (el) =>
      (el.style.width =
        (m.duration ? (m.currentTime / m.duration) * 100 : 0) + "%"),
  );
  $$("[data-now-art]").forEach((el) => {
    el.src = t?.artwork || KAIROS_COVER;
  });
  $$("[data-player-time]").forEach(
    (el) => (el.textContent = mediaTime(m.currentTime)),
  );
  $$("[data-player-duration]").forEach(
    (el) => (el.textContent = mediaTime(m.duration)),
  );
  $$("[data-player-seek]").forEach((el) => {
    if (document.activeElement !== el)
      el.value = m.duration ? (m.currentTime / m.duration) * 100 : 0;
  });
  $$("[data-track]").forEach((el) =>
    el.classList.toggle("playing", el.dataset.track === t?.id),
  );
  const island = $(".dynamic-island");
  island.classList.toggle("is-playing", m.isPlaying);
  island.setAttribute(
    "aria-label",
    m.isPlaying ? "En lecture : " + t?.title : "Dynamic Island",
  );
}
function miniPlayer() {
  return `<div class="mini-player liquid"><button class="mini-info" data-now-open><img data-now-art src="${KAIROS_COVER}" alt="Pochette"><span><b data-now-title>Aucune lecture</b><small data-now-artist>Paapii & Manii</small></span></button>${iconButton("play", "Lecture", "data-player-toggle")}${iconButton("next", "Morceau suivant", "data-player-next")}<span class="mini-progress"><i data-mini-progress></i></span></div>`;
}
function playerControls() {
  return `<div class="player-seek"><input type="range" min="0" max="100" step="0.1" value="0" aria-label="Progression audio" data-player-seek><div><span data-player-time>0:00</span><span data-player-duration>0:00</span></div></div><div class="controls">${iconButton("previous", "Morceau précédent", "data-player-prev")}<button class="play" data-player-toggle aria-label="Lecture">${icon("play")}</button>${iconButton("next", "Morceau suivant", "data-player-next")}</div>`;
}
function renderAudio(kind) {
  if (!secretUnlocked(kind)) return renderFileLock(kind);
  const track = SECRET_TRACKS.find((t) => t.id === kind);
  audioManager.load(track);
  openApp(
    `<div class="audio-player">${nav(track.title, "•••")}<img class="audio-cover" src="${track.artwork}" alt="${track.title}"><p class="eyebrow">ARCHIVES KAIROS</p><h2>${track.title}</h2><p>Manii & Paapii</p>${playerControls()}<div class="audio-footer">${icon("speaker")} Ce téléphone ${iconButton("share", "Partager", "data-share")}</div></div>`,
  );
}
function musicTrackRows(tracks) {
  return tracks
    .map(
      (t, i) =>
        `<button class="music-track ${t.src ? "" : "unavailable"}" data-track="${t.id}" data-audio-available="${!!t.src}"><span>${t.src ? icon("play") : i + 1}</span><span><b>${t.title}</b><small>${t.source === "apple-preview" ? (t.src ? "Aperçu Apple Music" : "Aperçu indisponible") : "Manii & Paapii"}</small></span>${icon("ellipsis")}</button>`,
    )
    .join("");
}
function renderMusic(view = "library") {
  warmAppleMusic();
  const available = audioManager.available();
  const library = `<div class="list-toolbar"><span>Bibliothèque</span>${iconButton("ellipsis", "Options", "data-options")}</div><h1 class="section-title">Bibliothèque</h1><div class="library-categories"><button data-music-album>${icon("contacts")} Artistes ${icon("back")}</button><button data-music-album>${icon("file")} Albums ${icon("back")}</button><button data-music-album>${icon("music")} Morceaux ${icon("back")}</button></div><h2 class="subheading">Ajouts récents</h2><button class="album-tile" data-music-album><img src="${KAIROS_COVER}" alt="Pochette KAIROS"><b>KAIROS</b><span>Manii & Paapii</span></button>${available.length ? `<h2 class="subheading">Fichiers récupérés</h2>${musicTrackRows(available)}` : '<p class="muted library-hint">Quelques fichiers sont restés dans les archives.</p>'}`;
  const album = `${nav("Bibliothèque", "•••")}<div class="album-header"><img src="${KAIROS_COVER}" alt="Pochette KAIROS"><h1>KAIROS</h1><p>Manii & Paapii</p><small>ALBUM · 8 MORCEAUX</small></div><div class="album-actions"><button data-album-play>${icon("play")} Lecture</button><button data-shuffle>${icon("shuffle")} Aléatoire</button></div><div>${musicTrackRows(ALBUM_TRACKS)}</div><p class="muted album-notice">Aperçus officiels Apple Music.</p>${available.length ? `<h2 class="subheading">Fichiers récupérés</h2>${musicTrackRows(available)}` : ""}`;
  openApp(
    `<div class="music-app">${view === "album" ? album : library}${view === "library" ? appleRecentlyPlayed() : ""}<p data-apple-loading class="apple-loading"></p><button data-apple-refresh class="hidden apple-retry">Réessayer</button>${officialAlbumEntry("apple")}${miniPlayer()}<div class="music-tabs"><button class="active" data-music-library>${icon("file")}<span>Bibliothèque</span></button><button data-music-album>${icon("music")}<span>KAIROS</span></button><button data-music-search>${icon("search")}<span>Rechercher</span></button></div></div>`,
  );
}

/* PHOTOS — originals stay intact; thumbnails are generated from the same assets. */
function renderPhotos() {
  const imgs = GALLERY.map(
    (src, i) =>
      `<button data-photo-index="${i}" aria-label="Ouvrir la photo ${i + 1}"><img src="assets/thumbnails/${src
        .split("/")
        .pop()
        .replace(
          /\.[^.]+$/,
          ".webp",
        )}" loading="lazy" decoding="async" alt="Photo des archives KAIROS"></button>`,
  ).join("");
  openApp(
    `<div class="photos-app"><div class="photo-toolbar"><div><h1>Photothèque</h1><p>${new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</p></div>${iconButton("ellipsis", "Options des photos", "data-options")}</div><div class="gallery-grid">${imgs}</div><p class="photo-count">${GALLERY.length} photos</p><div id="photoViewer" class="photo-viewer"><div class="viewer-top">${iconButton("back", "Fermer la photo", "data-close-photo")}<span id="photoPosition"></span>${iconButton("ellipsis", "Options de la photo", "data-photo-options")}</div><img id="viewerImg" alt="Photo des archives KAIROS"><div class="viewer-bottom">${iconButton("back", "Photo précédente", "data-photo-prev")}${iconButton("share", "Partager la photo", "data-share")}${iconButton("next", "Photo suivante", "data-photo-next")}</div></div></div>`,
  );
}
function openPhoto(index) {
  state.photoIndex = Number(index);
  $("#photoViewer").classList.add("open");
  setStatus(true);
  updatePhoto();
}
function updatePhoto() {
  $("#viewerImg").src = GALLERY[state.photoIndex];
  $("#photoPosition").textContent =
    `${state.photoIndex + 1} sur ${GALLERY.length}`;
}
function movePhoto(delta) {
  state.photoIndex =
    (state.photoIndex + delta + GALLERY.length) % GALLERY.length;
  updatePhoto();
}
function closePhoto() {
  $("#photoViewer").classList.remove("open");
  setStatus(false);
}

/* NOTES — deliberately personal fragments, not a lore guide. */
const NOTES = [
  {
    id: "garde",
    title: "Ce qu’on garde",
    section: "Épinglées",
    offset: 20,
    body: "La prise où on rigole à la fin.\nMême si ça dépasse un peu.\n\nNe pas tout nettoyer.\n\nP. dit que la première version respirait mieux. Il a peut-être raison.",
  },
  {
    id: "clips",
    title: "Idées clips",
    section: "Aujourd’hui",
    offset: 55,
    body: "Parking vide / dernière lumière\nPlan fixe, laisser venir.\n\nDemander à Yoan pour le toit.\nPas de fumée cette fois svp\n\nfin : on part chacun d’un côté ? à voir",
  },
  {
    id: "oubli",
    title: "À ne pas oublier",
    section: "Aujourd’hui",
    offset: 130,
    body: "☑ envoyer les selects\n☐ rappeler Corentin\n☐ récupérer le disque\n\n29/10. comme prévu.\n\nLe bounce est dans Fichiers, pas dans les exports.",
  },
  {
    id: "tracklist",
    title: "Tracklist",
    section: "7 jours précédents",
    offset: 2800,
    body: "KAIROS\nGOD BLESS\nBOULOT\nBANDITE\nVINCENT KOMPANY\nINTERLUDE\nTU SAIS\nLPB\n\nordre final ? ne plus toucher avant écoute ensemble",
  },
  {
    id: "0243",
    title: "02:43",
    section: "7 jours précédents",
    offset: 4300,
    body: "Encore réveillé.\n\nJ’ai laissé le téléphone sur la table.\nIl a sonné une fois.\n\nPersonne au bout.",
  },
  {
    id: "exports",
    title: "Exports",
    section: "30 jours précédents",
    offset: 18000,
    body: "master / instrumental / a cappella\n48k, pas le vieux dossier\n\nYoan a les images.\nRenommer FINAL_final2 avant d’envoyer…",
  },
  {
    id: "tout",
    title: "Tout gâcher",
    section: "30 jours précédents",
    offset: 21000,
    body: "On avait dit qu’on le gardait pour nous.\n\nNe pas effacer le message de P.\n\nIl y a des trucs qu’on réécoute seulement la nuit.",
  },
];
function noteDate(n, full = false) {
  return new Date(Date.now() - n.offset * 60000).toLocaleString(
    "fr-FR",
    full
      ? { dateStyle: "long", timeStyle: "short" }
      : n.offset < 1440
        ? { hour: "2-digit", minute: "2-digit" }
        : { day: "numeric", month: "short" },
  );
}
const FINAL_NOTE = {
  id: "final-0243",
  title: "02:43",
  section: "Épinglées",
  offset: 0,
  body: "On pense toujours qu’on aura le temps.\n\nPour dire quelque chose.\nPour revenir.\nPour appeler.\nPour finir ce qu’on avait commencé.\n\nEt puis parfois,\nquelques minutes suffisent.\n\nKAIROS.\n\n29.10.26",
};
function sessionNotes() {
  return state.finalSequenceTriggered ? [FINAL_NOTE, ...NOTES] : NOTES;
}
function renderNotes() {
  openApp(
    `<div class="notes-app"><div class="list-toolbar"><span class="notes-account">${icon("folder")} Sur mon iPhone</span>${iconButton("ellipsis", "Options des notes", "data-options")}</div><h1 class="notes-title">Notes</h1>${[
      "Épinglées",
      "Aujourd’hui",
      "7 jours précédents",
      "30 jours précédents",
    ]
      .map(
        (section) =>
          `<section class="note-section"><h2>${section === "Épinglées" ? icon("pin") : ""}${section}</h2><div class="note-group">${sessionNotes()
            .filter((n) => n.section === section)
            .map(
              (n) =>
                `<button class="note-row" data-note="${n.id}" data-searchable="${escapeHTML(n.title + " " + n.body)}"><b>${n.title}</b><span><time>${noteDate(n)}</time> ${escapeHTML(n.body.split("\n")[0])}</span></button>`,
            )
            .join("")}</div></section>`,
      )
      .join(
        "",
      )}<p class="empty-search hidden">Aucune note</p>${floatingSearch("notes")}</div>`,
  );
}
function renderNote(id) {
  const n = sessionNotes().find((n) => n.id === id);
  if (n?.id === FINAL_NOTE.id && !state.finalNoteOpened) {
    state.finalNoteOpened = true;
    persistProgress();
    trackEvent("final_note_opened");
  }
  if (!n) return;
  openApp(
    `<article class="note-detail">${nav("Notes", "•••")}<time class="note-date">${noteDate(n, true)}</time><h1>${n.title}</h1><div class="note-body">${escapeHTML(n.body).replaceAll("\n", "<br>")}</div><footer>${iconButton("share", "Partager la note", "data-share")}${iconButton("search", "Rechercher dans les notes", "data-notes-search")}</footer></article>`,
  );
}

function renderCamera() {
  openApp(
    `<div class="camera-app"><video src="assets/video/camera.mp4" muted autoplay loop playsinline preload="metadata" poster="assets/images/manii-02.jpg"></video><div class="camera-ui"><div class="cam-glass-row">${iconButton("flash", "Flash désactivé", "data-camera-flash")}${iconButton("back", "Réglages caméra", "data-camera-options")}${iconButton("rotate", "Live Photo", "data-camera-live")}</div><div class="camera-bottom"><div class="camera-zoom"><button data-zoom="0.5">.5</button><button class="active" data-zoom="1">1×</button><button data-zoom="2">2</button></div><div class="cam-modes">${["CINÉMATIQUE", "VIDÉO", "PHOTO", "PORTRAIT"].map((m) => `<button class="${m === "PHOTO" ? "active" : ""}" data-camera-mode>${m}</button>`).join("")}</div><div class="cam-bottom"><button class="thumb" data-camera-gallery aria-label="Dernière photo"></button><button class="shutter" data-shutter aria-label="Prendre une photo"></button><button class="flipbtn" data-camera-flip aria-label="Changer de caméra">${icon("rotate")}</button></div></div></div><div class="camera-flash"></div></div>`,
    { dark: true },
  );
}
function renderSettings() {
  openApp(
    `<div class="settings-app"><h1>Réglages</h1><div class="setting-card setting-profile">${avatarHTML("assets/images/duo-01.jpg", "KAIROS")}<div><b>KAIROS</b><small>Ce téléphone</small></div></div><div class="setting-card"><button class="setting-row" data-setting-toggle><span>Mode Avion</span><span class="switch" role="switch" aria-checked="false"></span></button><button class="setting-row" data-setting-detail="Wi-Fi"><span>Wi-Fi</span><span>KAIROS — studio ${icon("back")}</span></button><button class="setting-row" data-setting-toggle><span>Bluetooth</span><span class="switch on" role="switch" aria-checked="true"></span></button></div><div class="setting-card">${["Général", "Fond d’écran", "Face ID et code"].map((label) => `<button class="setting-row" data-setting-detail="${label}"><span>${label}</span>${icon("back")}</button>`).join("")}</div></div>`,
  );
}
function renderSettingDetail(label) {
  openApp(
    `<div class="settings-app">${nav(label)}<div class="setting-card">${label === "Général" ? '<div class="setting-row"><span>Nom</span><span>iPhone de Manii</span></div><div class="setting-row"><span>Modèle</span><span>iPhone 16 Pro</span></div><div class="setting-row"><span>Version d’iOS</span><span>iOS 26</span></div><div class="setting-row"><span>Capacité</span><span>128 Go</span></div><div class="setting-row"><span>Disponible</span><span>45,6 Go</span></div>' : label === "Fond d’écran" ? '<img class="wallpaper-preview" src="assets/images/home-wallpaper.jpg" alt="Fond d’écran actuel">' : `<p class="settings-description">${label === "Wi-Fi" ? "Connecté à KAIROS — studio." : "Le téléphone est déverrouillé."}</p>`}</div></div>`,
  );
}
function renderSpotify() {
  const available = audioManager.available();
  openApp(
    `<div class="spotify-app">${nav("KAIROS", "•••")}<div class="spotify-hero"><button class="spotify-cover-button" data-official-embed="spotify" aria-label="Ouvrir KAIROS dans Spotify"><img src="${KAIROS_COVER}" alt="Pochette KAIROS"></button><h1><button class="spotify-title-button" data-official-embed="spotify">KAIROS</button></h1><p>Manii & Paapii · Album</p></div><div class="spot-actions">${iconButton("shuffle", "Lecture aléatoire", "data-shuffle")}<button class="spot-play" data-album-play aria-label="Lire l’album">${icon("play")}</button></div>${musicTrackRows(ALBUM_TRACKS)}<p class="album-notice muted">Les titres de l’album ne sont pas encore disponibles sur ce téléphone.</p>${available.length ? `<h2 class="subheading">Fichiers récupérés</h2>${musicTrackRows(available)}` : ""}${officialAlbumEntry("spotify")}${miniPlayer()}</div>`,
    { dark: true },
  );
}
function calendarEvents(year, month, day) {
  const now = new Date();
  const appointments = [
    { date: new Date(2026, 9, 29), title: "KAIROS", time: "Toute la journée" },
    ...[
      [-3, "Shoot cover", "16:30"],
      [-1, "Exports", "19:00"],
      [0, "Studio — Zénithal", "21:00"],
      [2, "Réunion Corentin", "11:30"],
    ].map(([offset, title, time]) => ({
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset),
      title,
      time,
    })),
  ];
  return appointments.filter(
    (e) =>
      e.date.getFullYear() === year &&
      e.date.getMonth() === month &&
      e.date.getDate() === day,
  );
}
function calendarAgenda(year, month, day) {
  const events = calendarEvents(year, month, day);
  return events.length
    ? events
        .map(
          (e) =>
            `<div class="calendar-event"><div class="datebadge">${day}</div><h3>${e.title}</h3><p>${e.time}</p></div>`,
        )
        .join("")
    : '<p class="empty-search">Aucun événement ce jour</p>';
}
function renderCalendar(monthOffset = 0) {
  const now = new Date(),
    d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1),
    days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(),
    start = (d.getDay() + 6) % 7;
  openApp(
    `<div class="calendar-app"><div class="list-toolbar">${iconButton("back", "Mois précédent", `data-month="${monthOffset - 1}"`)}<button class="text-button" data-month="0">Aujourd’hui</button>${iconButton("next", "Mois suivant", `data-month="${monthOffset + 1}"`)}</div><h1 class="section-title">${d.toLocaleDateString("fr-FR", { month: "long" })}</h1><p class="calendar-year">${d.getFullYear()}</p><div class="calendar-grid">${["L", "M", "M", "J", "V", "S", "D"].map((x) => `<small>${x}</small>`).join("")}${Array.from({ length: start }, () => "<span></span>").join("")}${Array.from({ length: days }, (_, i) => `<button class="${!monthOffset && i + 1 === now.getDate() ? "today" : ""} ${calendarEvents(d.getFullYear(), d.getMonth(), i + 1).length ? "has-event" : ""}" data-calendar-day="${i + 1}" data-calendar-month="${d.getMonth()}" data-calendar-year="${d.getFullYear()}">${i + 1}</button>`).join("")}</div><div id="calendarAgenda">${calendarAgenda(d.getFullYear(), d.getMonth(), monthOffset === 0 ? now.getDate() : 1)}</div></div>`,
  );
}
function renderFaceTime() {
  const people = [
    ["Paapii", "assets/images/paapii-01.jpg", 6],
    ["Corentin", "assets/images/gallery-kid.jpg", 38],
    ["Yoan", "assets/images/gallery-studio.jpg", 83],
  ];
  openApp(
    `<div class="facetime-app">${nav("FaceTime", "＋").replace("data-options", "data-facetime-start")}<h1 class="section-title">FaceTime</h1><button class="facetime-new" data-facetime-start>${icon("video")} Nouveau FaceTime</button><div class="list">${people.map((p) => `<button class="row" data-contact-call>${avatarHTML(p[1], p[0])}<span class="row-copy"><b>${p[0]}</b><span>${p[0] === "Corentin" ? "Appel vidéo manqué" : "Appel vidéo entrant"}</span></span><span class="row-meta">${timeHTML(p[2])} ${icon("video")}</span></button>`).join("")}</div></div>`,
  );
}

/* One media boundary for navigation: music may survive internal Music views only. */
function audioContextFor(view, app = state.currentApp) {
  if (!view) return null;
  if (
    (app === "music" || app === "spotify") &&
    [
      renderMusic,
      renderAppleAlbum,
      renderSpotify,
      renderAudio,
      renderPreviewPlayer,
    ].includes(view.renderer)
  )
    return app;
  if (view.renderer === renderAudio) return `file:${view.args[0]}`;
  return null;
}
function transitionMedia(nextView) {
  stopInstagramRealFeed();
  if (
    !nextView ||
    audioContextFor(nextView) !== audioContextFor(state.currentView)
  )
    audioManager.stop();
  if (nextView?.renderer !== renderFaceTimePreview) stopFaceTime();
  if (nextView?.renderer !== renderOfficialEmbed) stopOfficialEmbeds();
}
let facetimeRequest = 0;
function stopTracks(stream) {
  for (const track of stream?.getTracks() || []) {
    try {
      track.stop();
    } catch {
      /* Stop remaining tracks even if one device has already disappeared. */
    }
  }
}
function stopFaceTime() {
  ++facetimeRequest;
  stopTracks(state.facetimeStream);
  state.facetimeStream = null;
  state.facetimeActive = false;
  const video = $("#facetimeCamera");
  if (video) {
    video.pause();
    video.srcObject = null;
  }
}
function faceTimeStatus(message) {
  const status = $("#facetimeStatus");
  if (status) status.textContent = message;
  $("#facetimeFallback")?.classList.remove("hidden");
  $("[data-facetime-retry]")?.classList.remove("hidden");
  $("#facetimeCamera")?.classList.add("hidden");
}
function renderFaceTimePreview() {
  openApp(
    `<div class="facetime-preview"><video id="facetimeCamera" class="hidden" autoplay playsinline muted></video><div class="facetime-preview-title"><small>FaceTime</small><h2>Nouvel appel</h2></div><div id="facetimeFallback" class="facetime-fallback">${icon("video")}<p id="facetimeStatus" role="status">Connexion à la caméra…</p><button class="hidden" data-facetime-retry>Réessayer</button></div><div class="facetime-preview-controls">${iconButton("camera", "Désactiver la caméra", 'data-facetime-camera aria-pressed="false"')}<button class="hangup" data-facetime-end aria-label="Fermer l’appel FaceTime">${icon("phone")}</button></div></div>`,
    { dark: true },
  );
}
function openFaceTimePreview() {
  navigate(renderFaceTimePreview);
  startFaceTimeCamera();
}
async function startFaceTimeCamera() {
  if (
    state.currentView?.renderer !== renderFaceTimePreview ||
    state.callStatus !== "idle" ||
    document.hidden
  )
    return;
  stopFaceTime();
  const request = ++facetimeRequest;
  state.facetimeActive = true;
  const video = $("#facetimeCamera");
  $("#facetimeStatus").textContent = "Connexion à la caméra…";
  $("[data-facetime-retry]").classList.add("hidden");
  try {
    if (!navigator.mediaDevices?.getUserMedia)
      throw new Error("Camera unavailable");
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });
    // Permission can resolve after Home/back, a new request, a hidden tab, or another call.
    if (
      request !== facetimeRequest ||
      state.currentView?.renderer !== renderFaceTimePreview ||
      document.hidden ||
      state.callStatus !== "idle"
    ) {
      stopTracks(stream);
      return;
    }
    state.facetimeStream = stream;
    video.srcObject = stream;
    video.muted = true;
    await video.play();
    if (request !== facetimeRequest) return;
    video.classList.remove("hidden");
    $("#facetimeFallback").classList.add("hidden");
    for (const track of stream.getTracks())
      track.addEventListener(
        "ended",
        () => {
          if (request === facetimeRequest) {
            stopFaceTime();
            faceTimeStatus("Caméra indisponible");
          }
        },
        { once: true },
      );
  } catch {
    if (request !== facetimeRequest) return;
    stopFaceTime();
    faceTimeStatus("Caméra indisponible");
  }
}
// No stream is kept in a background tab or a page retained by browser history.
document.addEventListener("visibilitychange", () => {
  if (document.hidden) audioManager.stop();
  if (document.hidden && state.facetimeActive) {
    stopFaceTime();
    faceTimeStatus("Caméra en pause");
  }
});
window.addEventListener("pagehide", () => {
  stopFaceTime();
  audioManager.stop();
  if (state.callStatus !== "idle") endCall();
});

/* One deterministic recall, persisted with the existing session progression. */
function recallEligible() {
  return (
    state.unknownFirstDeclined &&
    state.unknownCallAttempts === 1 &&
    !state.unknownCallRecalled &&
    !state.unknownCallAccepted &&
    state.recallDueAt > 0
  );
}
function scheduleUnknownRecall() {
  clearTimeout(recallTimer);
  recallTimer = null;
  if (!recallEligible()) return;
  recallTimer = setTimeout(
    () => triggerIncomingCall(true),
    Math.max(0, state.recallDueAt - Date.now()),
  );
}

/* PHONE + CALL: one incoming timer from first unlock, with independent Phone tabs. */
function renderPhone(tab = "Récents") {
  const contacts = ["Paapii", "Corentin", "Numéro inconnu", "Yoan"];
  const rows = contacts
    .map(
      (name, i) =>
        `<button class="row" data-call-info="${name}">${avatarHTML("", name)}<span class="row-copy"><b class="${i === 2 && state.callHistory?.outcome !== "answered" ? "missed" : ""}">${name}</b><span>${i === 2 ? (state.callHistory?.outcome === "answered" ? "Appel entrant" : "Appel manqué") + (state.unknownCallAttempts > 1 ? " (2)" : "") : "mobile"}</span></span><span class="row-meta">${i === 2 && state.callHistory ? `<time>${new Date(state.callHistory.at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</time>` : timeHTML([12, 31, 46, 180][i])} ${icon("info")}</span></button>`,
    )
    .join("");
  const dial = `<div class="dialpad"><output id="dialNumber" aria-live="polite"></output><div class="dial-grid">${"123456789*0#"
    .split("")
    .map(
      (n, i) =>
        `<button data-dial="${n}">${n}<small>${["", "ABC", "DEF", "GHI", "JKL", "MNO", "PQRS", "TUV", "WXYZ", "", "+", ""][i]}</small></button>`,
    )
    .join(
      "",
    )}</div><div class="dial-actions"><button class="dial-call" data-dial-call aria-label="Appeler">${icon("phone")}</button>${iconButton("back", "Effacer", "data-dial-delete")}</div></div>`;
  const content =
    tab === "Clavier"
      ? dial
      : tab === "Messagerie"
        ? '<div class="voicemail-empty">Aucun message vocal</div>'
        : `<div class="list">${tab === "Favoris" ? rows.split("</button>")[0] + "</button>" : rows}</div>`;
  openApp(
    `<div class="phone-app"><div class="list-toolbar"><span></span><button class="text-button" data-options>Modifier</button></div><h1 class="section-title">${tab}</h1>${content}<div class="phone-tabs">${[
      ["Favoris", "star"],
      ["Récents", "recent"],
      ["Contacts", "contacts"],
      ["Clavier", "keypad"],
      ["Messagerie", "voicemail"],
    ]
      .map(
        ([title, ic]) =>
          `<button class="phone-tab ${tab === title ? "active" : ""}" data-phone-tab="${title}" aria-label="${title}" aria-pressed="${tab === title}">${icon(ic)}<small>${title}</small></button>`,
      )
      .join("")}</div></div>`,
  );
}
function scheduleIncomingCall() {
  scheduleUnknownRecall();
  if (
    state.callHandled ||
    state.callStatus !== "idle" ||
    !state.firstUnlockedAt
  )
    return;
  const delay = state.visitedApps.size >= 3 ? 26000 : 35000;
  clearTimeout(callTimer);
  callTimer = setTimeout(
    triggerIncomingCall,
    Math.max(0, state.firstUnlockedAt + delay - Date.now()),
  );
}
function setModalInert() {
  phoneScene.querySelectorAll(".view").forEach((v) => (v.inert = true));
  $("#homeIndicator").inert = true;
}
function triggerIncomingCall(isRecall = false) {
  if (state.callStatus !== "idle") return;
  if (
    isRecall
      ? !recallEligible()
      : state.callHandled || state.unknownCallAttempts > 0
  )
    return;
  if (!modal.classList.contains("hidden") || state.facetimeActive) {
    if (isRecall)
      recallTimer = setTimeout(() => triggerIncomingCall(true), 2000);
    else callTimer = setTimeout(triggerIncomingCall, 2000);
    return;
  }
  audioManager.stop();
  stopFaceTime();
  stopOfficialEmbeds();
  stopInstagramRealFeed();
  state.unknownCallAttempts += 1;
  if (isRecall) {
    state.unknownCallRecalled = true;
    state.recallDueAt = 0;
    clearTimeout(recallTimer);
    recallTimer = null;
  }
  state.callTriggered = true;
  state.callHistory = {
    outcome: "missed",
    at: Date.now(),
    attempts: state.unknownCallAttempts,
  };
  persistProgress();
  hideFinalNotification();
  systemSounds.play("incomingCall");
  briefFeedback("call");
  state.callStatus = "ringing";
  clearTimeout(callTimer);
  callTimer = null;
  setModalInert();
  modal.className = "modal call-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", "Appel entrant de Numéro inconnu");
  modal.innerHTML = `<div class="call-screen"><div class="call-head"><span class="caller-avatar">${icon("contacts")}</span><small>iPhone · appel entrant</small><h2>Numéro inconnu</h2><p>peut-être : KAIROS</p></div><div class="call-actions"><button class="call-action decline" data-call-decline><span class="call-circle">${icon("phone")}</span><span>Refuser</span></button><button class="call-action accept" data-call-accept><span class="call-circle">${icon("phone")}</span><span>Accepter</span></button></div></div>`;
  bindDynamic();
  $("[data-call-accept]").focus();
}
function markCallHandled() {
  state.callHandled = true;
  session.set("kairos.callHandled", "1");
  clearTimeout(callTimer);
  callTimer = null;
}
function acceptCall() {
  state.unknownCallAccepted = true;
  state.recallDueAt = 0;
  clearTimeout(recallTimer);
  recallTimer = null;
  audioManager.stop();
  state.callHistory = {
    outcome: "answered",
    at: state.callHistory?.at || Date.now(),
    attempts: state.unknownCallAttempts,
  };
  persistProgress();
  trackEvent("incoming_call_answered");
  systemSounds.stop();
  markCallHandled();
  state.callStatus = "active";
  callStartedAt = Date.now();
  modal.innerHTML = `<div class="call-screen"><div class="call-head"><small id="callDuration">00:00</small><h2>Numéro inconnu</h2><p>peut-être : KAIROS</p></div><div class="active-call-actions">${[
    ["mic", "silence"],
    ["keypad", "clavier"],
    ["speaker", "haut-parleur"],
  ]
    .map(
      ([ic, label]) =>
        `<button class="call-action" data-call-control="${ic}" aria-pressed="false"><span class="call-circle">${icon(ic)}</span><span>${label}</span></button>`,
    )
    .join("")}</div><div id="callKeypad" class="hidden">${"123456789*0#"
    .split("")
    .map((n) => `<button data-call-digit>${n}</button>`)
    .join(
      "",
    )}</div><button class="hangup" data-call-hangup aria-label="Raccrocher">${icon("phone")}</button><audio id="callAudio" src="${AUDIO.call}" preload="metadata"></audio></div>`;
  const a = $("#callAudio");
  a.play().catch(() => {
    if (state.callStatus === "active" && $("#callAudio") === a)
      toast("Touchez le haut-parleur pour lancer le son");
  });
  a.onended = endCall;
  a.onerror = () => {
    toast("Audio de l’appel indisponible");
    endCall();
  };
  clearInterval(callInterval);
  callInterval = setInterval(() => {
    const el = $("#callDuration");
    if (el) el.textContent = mediaTime(a.currentTime);
  }, 250);
  bindDynamic();
  $("[data-call-hangup]").focus();
}
function endCall() {
  systemSounds.stop();
  markCallHandled();
  clearInterval(callInterval);
  const a = $("#callAudio");
  if (a) {
    a.pause();
    a.currentTime = 0;
  }
  state.callStatus = "idle";
  closeModal();
  toast("Appel terminé");
  refreshAfterCall();
}
function declineCall() {
  if (state.unknownCallAttempts === 1 && !state.unknownCallAccepted) {
    state.unknownFirstDeclined = true;
    state.recallDueAt = Date.now() + 60000;
  } else state.recallDueAt = 0;
  persistProgress();
  trackEvent("incoming_call_declined");
  systemSounds.stop();
  markCallHandled();
  state.callStatus = "idle";
  closeModal();
  toast("Appel refusé");
  scheduleUnknownRecall();
  refreshAfterCall();
}

/* screenshot apps */
function screenshotApp(src, hotspots = [], dark = false) {
  const spots = hotspots
    .map(
      (h) =>
        `<button class="hotspot" aria-label="${h.action.includes("following") ? "Comptes suivis" : "Ouvrir le profil"}" data-hot="${h.action}" style="left:${h.left}%;top:${h.top}%;width:${h.width}%;height:${h.height}%"></button>`,
    )
    .join("");
  openApp(
    `<div class="screen-shot-app"><img class="full-shot" src="${src}">${spots}</div>`,
    { dark },
  );
}
function renderInstagramProfile(profile = "manii-profile") {
  const map = {
    "manii-profile": [
      "assets/images/insta-manii-profile.webp",
      [
        {
          action: "insta-manii-following",
          left: 67,
          top: 16,
          width: 29,
          height: 17,
        },
      ],
    ],
    "manii-following": [
      "assets/images/insta-manii-following.webp",
      [
        {
          action: "insta-manii-profile",
          left: 0,
          top: 0,
          width: 18,
          height: 10,
        },
        {
          action: "insta-paapii-profile",
          left: 0,
          top: 34,
          width: 100,
          height: 14,
        },
      ],
    ],
    "paapii-profile": [
      "assets/images/insta-paapii-profile.webp",
      [
        {
          action: "insta-manii-following",
          left: 0,
          top: 0,
          width: 18,
          height: 10,
        },
        {
          action: "insta-paapii-following",
          left: 67,
          top: 13,
          width: 28,
          height: 16,
        },
      ],
    ],
    "paapii-following": [
      "assets/images/insta-paapii-following.webp",
      [
        {
          action: "insta-paapii-profile",
          left: 0,
          top: 0,
          width: 18,
          height: 10,
        },
        {
          action: "insta-manii-profile",
          left: 0,
          top: 13,
          width: 100,
          height: 13,
        },
      ],
    ],
  };
  const [src, hs] = map[profile];
  screenshotApp(src, hs, false);
}
/* Bind only the freshly rendered view; persistent AudioManager listeners are installed once. */
function bindDynamic() {
  const on = (selector, handler) =>
    $$(selector).forEach((el) => (el.onclick = (e) => handler(el, e)));
  on("[data-app-back]", goBack);
  on("[data-msg-thread]", (b) =>
    navigate(renderMessageThread, b.dataset.msgThread),
  );
  on("[data-wa-thread]", (b) => navigate(renderWAThread, b.dataset.waThread));
  on("[data-file]", (b) => navigate(renderFileLock, b.dataset.file));
  on("[data-audio-lock]", (b) => showPassword(b.dataset.audioLock));
  $$("[data-secret]").forEach(
    (form) =>
      (form.onsubmit = (e) => {
        e.preventDefault();
        trySecret(form.dataset.secret, $("#codeField").value);
      }),
  );
  on("[data-file-photos]", () => navigate(renderPhotos));
  on("[data-file-tracklist]", () => navigate(renderNote, "tracklist"));
  on("[data-note]", (b) => navigate(renderNote, b.dataset.note));
  on("[data-notes-search]", () => {
    navigate(renderNotes);
    $("[data-search]").focus();
  });
  on("[data-photo-index]", (b) => openPhoto(b.dataset.photoIndex));
  on("[data-close-photo]", closePhoto);
  on("[data-photo-next]", () => movePhoto(1));
  on("[data-photo-prev]", () => movePhoto(-1));
  on("[data-photo-options]", () =>
    toast("Photo " + (state.photoIndex + 1) + " · Archives KAIROS"),
  );
  on("[data-hot]", (b) =>
    navigate(renderInstagram, b.dataset.hot.replace("insta-", "")),
  );
  on("[data-call-decline]", declineCall);
  on("[data-call-accept]", acceptCall);
  on("[data-call-hangup]", endCall);
  on("[data-call-control]", (b) => {
    const active = b.getAttribute("aria-pressed") !== "true";
    b.setAttribute("aria-pressed", String(active));
    if (b.dataset.callControl === "keypad")
      $("#callKeypad").classList.toggle("hidden", !active);
    if (b.dataset.callControl === "speaker") {
      const a = $("#callAudio");
      if (a?.paused) a.play().catch(() => toast("Lecture indisponible"));
    }
  });
  on("[data-call-digit]", (b) => toast(b.textContent, 500));
  on("[data-phone-tab]", (b) => {
    state.currentView = { renderer: renderPhone, args: [b.dataset.phoneTab] };
    renderPhone(b.dataset.phoneTab);
  });
  on("[data-call-info]", (b) =>
    showSheet(
      b.dataset.callInfo,
      "mobile · " +
        (b.dataset.callInfo === "Numéro inconnu"
          ? state.callHistory?.outcome === "answered"
            ? "Appel entrant"
            : "Appel manqué"
          : "Dernier appel aujourd’hui"),
      [
        {
          label: "Appeler",
          run: () => toast("Ce correspondant est indisponible"),
        },
      ],
    ),
  );
  on("[data-dial]", (b) => {
    if ($("#dialNumber").textContent.length < 18)
      $("#dialNumber").textContent += b.dataset.dial;
  });
  on(
    "[data-dial-delete]",
    () =>
      ($("#dialNumber").textContent = $("#dialNumber").textContent.slice(
        0,
        -1,
      )),
  );
  on("[data-dial-call]", () =>
    toast(
      $("#dialNumber").textContent
        ? "Le correspondant est indisponible"
        : "Composez un numéro",
    ),
  );
  on("[data-facetime-start]", openFaceTimePreview);
  on("[data-facetime-retry]", startFaceTimeCamera);
  on("[data-facetime-end]", goBack);
  on("[data-facetime-camera]", (button) => {
    const track = state.facetimeStream?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    button.setAttribute("aria-pressed", String(!track.enabled));
  });
  on("[data-contact-call]", () =>
    showSheet("Correspondant indisponible", "Aucune réponse pour le moment."),
  );
  on("[data-player-toggle]", () => audioManager.toggle());
  on("[data-player-next]", () => audioManager.next());
  on("[data-player-prev]", () => audioManager.next(-1));
  $$("[data-player-seek]").forEach(
    (el) =>
      (el.oninput = () =>
        audioManager.seek(
          (Number(el.value) / 100) * audioManager.state.duration,
        )),
  );
  on("[data-track]", (b) => {
    const t = [...ALBUM_TRACKS, ...audioManager.available()].find(
      (t) => t.id === b.dataset.track,
    );
    if (t?.source === "apple-preview") {
      if (state.currentApp === "spotify")
        navigate(renderOfficialEmbed, "spotify", "kairos");
      else playKairos(t.id);
    } else if (t) audioManager.play(t);
  });
  on("[data-music-album]", () => navigate(renderMusic, "album"));
  on("[data-music-library]", () => navigate(renderMusic));
  on("[data-now-open]", () => {
    const t = audioManager.state.currentTrack;
    if (t?.source === "apple-preview") navigate(renderPreviewPlayer, t.id);
    else if (t?.source === "apple-catalog")
      navigate(renderAppleAlbum, t.catalogKey);
    else if (t) navigate(renderAudio, t.id);
    else toast("Choisissez un fichier audio");
  });
  on("[data-album-play]", () => playKairos());
  on("[data-shuffle]", (b) => {
    audioManager.state.shuffle = !audioManager.state.shuffle;
    b.setAttribute("aria-pressed", String(audioManager.state.shuffle));
    if (state.currentApp === "music") {
      playKairos();
      return;
    }
    const tracks = audioManager.available();
    if (tracks.length)
      audioManager.play(tracks[Math.floor(Math.random() * tracks.length)]);
    else toast("Aucun fichier audio déverrouillé");
  });
  on("[data-music-search]", () =>
    showSheet(
      "Rechercher",
      "Sur cet iPhone",
      [...ALBUM_TRACKS, ...audioManager.available()].map((t) => ({
        label: t.title,
        run: () =>
          t.src ? audioManager.play(t) : navigate(renderMusic, "album"),
      })),
    ),
  );
  on("[data-open-camera]", () => navigate(renderCamera));
  on("[data-camera-gallery]", () => navigate(renderPhotos));
  on("[data-camera-flash]", (b) => {
    b.classList.toggle("selected");
    b.setAttribute("aria-pressed", String(b.classList.contains("selected")));
  });
  on("[data-camera-live]", (b) => {
    b.classList.toggle("selected");
    toast(
      "Live Photo " +
        (b.classList.contains("selected") ? "activé" : "désactivé"),
    );
  });
  on("[data-camera-options]", () => toast("PHOTO · 4:3 · HD"));
  on("[data-camera-mode]", (b) => {
    $$("[data-camera-mode]").forEach((x) =>
      x.classList.toggle("active", x === b),
    );
    toast(
      b.textContent === "PHOTO"
        ? "Mode photo"
        : "Aperçu " + b.textContent.toLowerCase(),
    );
  });
  on("[data-zoom]", (b) => {
    $$("[data-zoom]").forEach((x) => x.classList.toggle("active", x === b));
    $(".camera-app video").style.transform =
      `scale(${Math.max(1, Number(b.dataset.zoom))})`;
  });
  on("[data-camera-flip]", () =>
    $(".camera-app video").classList.toggle("mirrored"),
  );
  on("[data-shutter]", () => {
    const f = $(".camera-flash");
    f.classList.remove("flash");
    void f.offsetWidth;
    f.classList.add("flash");
    toast("Photo prise · aperçu", 1000);
  });
  on("[data-setting-toggle]", (b) => {
    const el = $(".switch", b),
      active = !el.classList.contains("on");
    el.classList.toggle("on", active);
    el.setAttribute("aria-checked", String(active));
  });
  on("[data-setting-detail]", (b) =>
    navigate(renderSettingDetail, b.dataset.settingDetail),
  );
  on("[data-month]", (b) => {
    state.currentView = {
      renderer: renderCalendar,
      args: [Number(b.dataset.month)],
    };
    renderCalendar(Number(b.dataset.month));
  });
  on("[data-calendar-day]", (b) => {
    $$("[data-calendar-day]").forEach((x) =>
      x.classList.toggle("selected", x === b),
    );
    $("#calendarAgenda").innerHTML = calendarAgenda(
      Number(b.dataset.calendarYear),
      Number(b.dataset.calendarMonth),
      Number(b.dataset.calendarDay),
    );
  });
  on("[data-options]", () =>
    showSheet("Options", "Archives de KAIROS", [
      { label: "Retour à l’accueil", run: goHome },
    ]),
  );
  on("[data-message-filter]", () =>
    showSheet("Messages", "Filtrer les conversations", [
      { label: "Tous les messages", run: () => filterMessages(false) },
      { label: "Non lus", run: () => filterMessages(true) },
    ]),
  );
  on("[data-compose]", () =>
    showSheet(
      "Nouveau message",
      "Choisissez un contact",
      Object.entries(IMessageThreads).map(([id, t]) => ({
        label: t.name,
        run: () => navigate(renderMessageThread, id),
      })),
    ),
  );
  on("[data-wa-compose]", () =>
    showSheet(
      "Nouvelle discussion",
      "Choisissez un contact",
      Object.entries(WAThreads).map(([id, t]) => ({
        label: t.name,
        run: () => navigate(renderWAThread, id),
      })),
    ),
  );
  on("[data-wa-filter]", (b) => {
    $$("[data-wa-filter]").forEach((x) => {
      x.classList.toggle("active", x === b);
      x.setAttribute("aria-pressed", String(x === b));
    });
    applySearch();
  });
  $$("[data-search]").forEach((input) => (input.oninput = applySearch));
  $$("[data-reply]").forEach((form) => {
    $$("button", form).forEach((b) => {
      if (!b.hasAttribute("type")) b.type = "button";
    });
    const input = $("input", form),
      send = $(".send-button", form);
    input.oninput = () => {
      const hasText = !!input.value.trim();
      send.innerHTML = icon(hasText ? "send" : "mic");
      send.setAttribute("aria-label", hasText ? "Envoyer" : "Message audio");
    };
    form.onsubmit = (e) => {
      e.preventDefault();
      const field = $("input", form),
        text = field.value.trim();
      if (!text) return toast("Le micro de ce téléphone est indisponible");
      const key = form.dataset.reply + "-" + form.dataset.thread;
      (state.messages[key] ??= []).push(["me", text]);
      const { renderer, args } = state.currentView;
      renderer(...args);
      const area = $(".bubble-area,.wa-chat");
      area.scrollTop = area.scrollHeight;
    };
  });
  on("[data-attach]", () =>
    showSheet("Joindre", "Sur cet iPhone", [
      { label: "Photos", run: () => navigate(renderPhotos) },
      { label: "Fichiers", run: () => navigate(renderFiles) },
    ]),
  );
  on("[data-share]", () =>
    showSheet("Partager", "Les archives restent sur ce téléphone.", [
      {
        label: "Copier le lien de l’album",
        run: async () => {
          try {
            await navigator.clipboard.writeText(ALBUM_URL);
            toast("Lien copié");
          } catch {
            toast("Copie indisponible dans ce navigateur");
          }
        },
      },
    ]),
  );
}
function filterMessages(unread) {
  $$("[data-msg-thread]").forEach((b) =>
    b.classList.toggle("hidden", unread && !$(".unread-dot.visible", b)),
  );
}
function applySearch() {
  const input = $("[data-search]"),
    q = (input?.value || "").toLocaleLowerCase("fr").trim(),
    filter = $("[data-wa-filter].active")?.dataset.waFilter || "0";
  let count = 0;
  $$("[data-searchable]").forEach((row) => {
    const match =
      row.dataset.searchable.toLocaleLowerCase("fr").includes(q) &&
      (filter === "0" ||
        (filter === "1" && row.dataset.unread === "1") ||
        (filter === "2" && row.dataset.favorite === "1") ||
        (filter === "3" && row.dataset.group === "1"));
    row.classList.toggle("hidden", !match);
    if (match) count++;
  });
  $$(".note-section").forEach((section) =>
    section.classList.toggle("hidden", !$(".note-row:not(.hidden)", section)),
  );
  $(".empty-search")?.classList.toggle("hidden", count > 0);
}
function showSheet(title, description, actions = []) {
  const previousFocus = document.activeElement;
  setModalInert();
  modal.className = "modal sheet-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", title);
  modal.innerHTML = `<div class="action-sheet"><h3>${escapeHTML(title)}</h3><p>${escapeHTML(description)}</p>${actions.map((a, i) => `<button data-sheet-action="${i}">${escapeHTML(a.label)}</button>`).join("")}<button class="sheet-cancel">Fermer</button></div>`;
  $$("[data-sheet-action]").forEach(
    (b) =>
      (b.onclick = () => {
        closeModal();
        actions[Number(b.dataset.sheetAction)].run();
      }),
  );
  $(".sheet-cancel").onclick = () => {
    closeModal();
    if (previousFocus?.isConnected) previousFocus.focus();
  };
  $(".sheet-cancel").focus();
}
// Dialogs retain keyboard focus. Global audio is paused when a call arrives.
modal.addEventListener("keydown", (e) => {
  if (e.key !== "Tab") return;
  const buttons = $$("button,input", modal).filter(
    (b) => b.offsetParent !== null,
  );
  if (!buttons.length) return;
  const first = buttons[0],
    last = buttons.at(-1);
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
});

/* Small session-only progression hooks. No network analytics or personal data. */
const JOURNEY_EVENTS = new Set([
  "phone_unlocked",
  "app_opened",
  "abeg_unlocked",
  "tout_gacher_unlocked",
  "incoming_call_answered",
  "incoming_call_declined",
  "final_note_opened",
  "album_link_clicked",
  "instagram_opened",
  "instagram_dm_opened",
  "emmanuella_opened",
  "angiste_opened",
  "corentin_opened",
  "redka_opened",
  "final_album_message_shown",
  "safari_kairos_opened",
  "spotify_embed_started",
  "apple_music_embed_opened",
]);
function trackEvent(name, data = {}) {
  if (!JOURNEY_EVENTS.has(name)) return;
  const apps = [
    "messages",
    "whatsapp",
    "notes",
    "files",
    "music",
    "spotify",
    "instagram",
    "safari",
    "photos",
    "camera",
    "phone",
    "facetime",
    "settings",
    "calendar",
  ];
  const safe =
    name === "app_opened" && apps.includes(data.app)
      ? { app: data.app }
      : name === "instagram_dm_opened" &&
          Object.hasOwn(IG_CONTACTS, data.thread)
        ? { thread: data.thread }
        : {};
  window.dispatchEvent(
    new CustomEvent("kairos:event", { detail: { name, ...safe } }),
  );
}
function persistProgress() {
  session.set(
    "kairos.progress",
    JSON.stringify({
      messagesOpened: state.messagesOpened,
      paapiiMessageRead: state.paapiiMessageRead,
      whatsappOpened: state.whatsappOpened,
      notesOpened: state.notesOpened,
      callTriggered: state.callTriggered,
      callHistory: state.callHistory,
      unknownCallAttempts: state.unknownCallAttempts,
      unknownFirstDeclined: state.unknownFirstDeclined,
      unknownCallRecalled: state.unknownCallRecalled,
      unknownCallAccepted: state.unknownCallAccepted,
      recallDueAt: state.recallDueAt,
      finalSequenceTriggered: state.finalSequenceTriggered,
      finalNoteOpened: state.finalNoteOpened,
      firstUnlockedAt: state.firstUnlockedAt,
      visitedApps: [...state.visitedApps],
      read: [...state.read],
      instagramEpoch: state.instagramEpoch,
      instagramEmmanuellaRead: state.instagramEmmanuellaRead,
      instagramAngisteOpened: state.instagramAngisteOpened,
      instagramCorentinOpened: state.instagramCorentinOpened,
      instagramRedkaOpened: state.instagramRedkaOpened,
      finalAlbumMessageAvailable: state.finalAlbumMessageAvailable,
      finalAlbumMessageRead: state.finalAlbumMessageRead,
      finalAlbumMessageAt: state.finalAlbumMessageAt,
      safariKairosAvailable: state.safariKairosAvailable,
      albumLinkClicked: state.albumLinkClicked,
      instagramReplies: state.instagramReplies,
      instagramReactions: state.instagramReactions,
      safariHistory: state.safariHistory,
    }),
  );
}
// No system sound files exist in the supplied assets. Empty cue map intentionally stays silent.
class SystemSoundManager {
  constructor(cues = {}) {
    this.cues = cues;
    this.enabled = false;
    this.audio = null;
  }
  enable() {
    this.enabled = true;
  }
  async play(cue) {
    const src = this.cues[cue];
    if (!this.enabled || !src || document.hidden) return;
    this.stop();
    this.audio = new Audio(src);
    this.audio.volume = 0.12;
    try {
      await this.audio.play();
    } catch {
      /* Autoplay denial must remain silent. */
    }
  }
  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
  }
}
const systemSounds = new SystemSoundManager();
function briefFeedback(kind) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  try {
    navigator.vibrate?.(kind === "call" ? [18, 70, 18] : 10);
  } catch {}
  const el = kind === "secret" ? $(".audio-player") : $(".dynamic-island");
  // Secret rendering happens immediately after validation, so use its next paint.
  requestAnimationFrame(() => {
    const target = kind === "secret" ? $(".audio-player") : el;
    if (!target) return;
    target.classList.remove("discovery-feedback");
    void target.offsetWidth;
    target.classList.add("discovery-feedback");
  });
}
function updatePhoneSignals() {
  for (const [app, key] of [
    ["messages", "im-paapii"],
    ["whatsapp", "wa-paapii"],
  ]) {
    const button = $(`#home .app-icon[data-route="${app}"]`),
      unread = !state.read.has(key);
    button.classList.toggle("has-badge", unread);
    let badge = $("i", button);
    if (unread && !badge) {
      badge = document.createElement("i");
      badge.textContent = "1";
      button.append(badge);
    }
    if (badge) badge.classList.toggle("hidden", !unread);
    $(`#lock [data-route="${app}"]`)?.classList.toggle("hidden", !unread);
  }
  updateInstagramBadge();
  const old = $("#lockCallNotification");
  if (state.callHistory && state.phoneUnlocked) {
    const notification = old || document.createElement("button");
    notification.id = "lockCallNotification";
    notification.className = "lock-notif";
    notification.dataset.route = "phone";
    notification.innerHTML = `<img src="assets/icons/phone.png" alt=""><div><b>Téléphone</b><small>récent</small><strong>Numéro inconnu</strong><p>${state.callHistory.outcome === "answered" ? "Appel entrant" : "Appel manqué"}</p></div>`;
    if (!old) $(".lock-notifications").append(notification);
  }
}
let finalTimer = null;
function hideFinalNotification() {
  notifications.hide();
}
function scheduleFinalNote() {
  clearTimeout(finalTimer);
  if (
    !state.abegUnlocked ||
    !state.toutGacherUnlocked ||
    state.finalSequenceTriggered
  )
    return;
  finalTimer = setTimeout(() => {
    if (
      !home.classList.contains("active-view") ||
      state.callStatus !== "idle" ||
      !modal.classList.contains("hidden") ||
      document.hidden
    )
      return;
    if (
      !notifications.show({
        key: "final-note",
        app: "Notes",
        image: "assets/icons/notes.png",
        sender: "02:43",
        preview: "Il reste une dernière chose.",
        duration: 16000,
        open: () => {
          route("notes");
          navigate(renderNote, FINAL_NOTE.id);
        },
      })
    )
      return;
    state.finalSequenceTriggered = true;
    persistProgress();
  }, 1600);
}
function refreshAfterCall() {
  updatePhoneSignals();
  if (state.currentView?.renderer === renderPhone)
    renderPhone(...state.currentView.args);
  if (home.classList.contains("active-view")) {
    scheduleFinalNote();
    scheduleAlbumMessage();
  }
}
// Background tabs never finish the narrative while the visitor is elsewhere.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && home.classList.contains("active-view")) {
    scheduleFinalNote();
    scheduleAlbumMessage();
  }
});
updatePhoneSignals();

function route(name) {
  if (state.callStatus !== "idle") return;
  if (!state.phoneUnlocked) {
    state.phoneUnlocked = true;
    if (!state.firstUnlockedAt) state.firstUnlockedAt = Date.now();
    trackEvent("phone_unlocked");
    persistProgress();
    scheduleIncomingCall();
  }
  const routes = {
    messages: renderMessages,
    photos: renderPhotos,
    notes: renderNotes,
    files: renderFiles,
    camera: renderCamera,
    music: renderMusic,
    whatsapp: renderWhatsApp,
    spotify: renderSpotify,
    instagram: renderInstagram,
    safari: renderSafari,
    settings: renderSettings,
    calendar: renderCalendar,
    facetime: renderFaceTime,
    phone: renderPhone,
  };
  if (!routes[name]) return;
  transitionMedia(null);
  state.navigationStack = [];
  state.currentView = null;
  state.currentApp = name;
  trackEvent("app_opened", { app: name });
  if (name === "messages") state.messagesOpened = true;
  if (name === "whatsapp") state.whatsappOpened = true;
  if (name === "notes") state.notesOpened = true;
  if (name === "instagram") trackEvent("instagram_opened");
  if (["messages", "whatsapp", "notes", "files", "music"].includes(name))
    state.visitedApps.add(name);
  persistProgress();
  scheduleIncomingCall();
  clearTimeout(finalTimer);
  clearTimeout(albumMessageTimer);
  hideFinalNotification();
  toastEl.classList.add("hidden");
  navigate(routes[name]);
  if (name === "phone" && !state.callHandled) triggerIncomingCall();
}

/* BOOT + POINTER GESTURES: coordinates are relative to the phone, including on desktop. */
function returnToLock() {
  transitionMedia(null);
  state.lockCameraActive = false;
  state.currentApp = null;
  state.currentView = null;
  state.navigationStack = [];
  appContent.innerHTML = "";
  setStatus(true);
  show(lock);
}
function openLockCamera() {
  if (state.phoneUnlocked) return route("camera");
  state.lockCameraActive = true;
  state.currentApp = "camera";
  state.navigationStack = [];
  state.currentView = { renderer: renderCamera, args: [] };
  renderCamera();
  const thumbnail = $("[data-camera-gallery]");
  if (thumbnail) thumbnail.onclick = returnToLock;
}
$("#lockFlashlight").innerHTML = icon("flashlight");
$("#lockCamera").innerHTML = icon("camera");
$("#lockFlashlight").onclick = () => {
  state.flashlightOn = !state.flashlightOn;
  $("#lockFlashlight").setAttribute("aria-pressed", String(state.flashlightOn));
};
$("#lockCamera").onclick = openLockCamera;
syncMobileExperience();
// V8 starts on the live lockscreen; activation is still explicit at unlock.
setStatus(true);
show(lock);
$("#homeIndicator").onclick = () => {
  if (!lock.classList.contains("active-view")) goHome();
};
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-route]");
  if (b) route(b.dataset.route);
});
let lockSwipeTimer = null;
let lockSwipeComplete = null;
function resetLockSwipe() {
  clearTimeout(lockSwipeTimer);
  if (lockSwipeComplete) lock.removeEventListener("transitionend", lockSwipeComplete);
  lockSwipeComplete = null;
  lock.classList.remove("lock-dragging", "lock-settling", "lock-unlocking");
  lock.style.removeProperty("--lock-drag-y");
  home.classList.remove("lock-home-preview");
  home.inert = false;
  home.removeAttribute("aria-hidden");
}
function settleLockSwipe(unlock) {
  lock.classList.remove("lock-dragging");
  lock.classList.add("lock-settling");
  lock.classList.toggle("lock-unlocking", unlock);
  // Commit the finger position before starting the release transition.
  void lock.offsetHeight;
  let finished = false;
  const complete = (e) => {
    if (e && (e.target !== lock || e.propertyName !== "transform")) return;
    if (finished) return;
    finished = true;
    if (unlock) {
      // Keep Home painted through the existing state handoff (no entrance animation).
      unlockPhone();
      home.getAnimations().forEach((animation) => animation.finish());
    } else resetLockSwipe();
  };
  lockSwipeComplete = complete;
  lock.addEventListener("transitionend", complete);
  lock.style.setProperty("--lock-drag-y", unlock ? "-100%" : "0px");
  lockSwipeTimer = setTimeout(complete, unlock ? 300 : 240);
}
function sampleLockSwipe(g, e) {
  const now = e.timeStamp;
  g.samples.push({ y: e.clientY, time: now });
  while (g.samples.length > 1 && now - g.samples[0].time > 100) g.samples.shift();
  if (Math.hypot(e.clientX - g.x, e.clientY - g.y) > 8) g.dragged = true;
}
let gesture = null,
  suppressClick = false;
screen.addEventListener("pointerdown", (e) => {
  if (
    lock.classList.contains("lock-settling") ||
    e.isPrimary === false ||
    state.callStatus !== "idle" ||
    e.target.closest(
      "input,textarea,.modal:not(.hidden),[data-horizontal-scroll]",
    )
  )
    return;
  const r = screen.getBoundingClientRect(),
    ratio = screen.clientWidth / r.width,
    x = (e.clientX - r.left) * ratio,
    y = (e.clientY - r.top) * ratio;
  gesture = {
    id: e.pointerId,
    ratio,
    startTime: performance.now(),
    x: e.clientX,
    y: e.clientY,
    edge: x < 28,
    home: y > screen.clientHeight - 44,
    lock: lock.classList.contains("active-view"),
    photo: !!$("#photoViewer.open"),
  };
  if (gesture.lock) {
    suppressClick = false;
    gesture.samples = [{ y: e.clientY, time: e.timeStamp }];
    gesture.dragged = false;
    gesture.tapTarget = e.target.closest("#lockFlashlight, #lockCamera");
    screen.setPointerCapture(e.pointerId);
    home.classList.add("lock-home-preview");
    home.inert = true;
    home.setAttribute("aria-hidden", "true");
    lock.classList.add("lock-dragging");
  }
});
screen.addEventListener("pointermove", (e) => {
  if (!gesture || gesture.id !== e.pointerId) return;
  if (gesture.lock) {
    sampleLockSwipe(gesture, e);
    const rawDy = e.clientY - gesture.y, rawDx = e.clientX - gesture.x;
    const visualY = rawDy < 0 && -rawDy > Math.abs(rawDx) * 1.2
      ? Math.max(rawDy * .88, -screen.getBoundingClientRect().height) : 0;
    lock.style.setProperty("--lock-drag-y", `${visualY}px`);
    return;
  }
  const dx = (e.clientX - gesture.x) * gesture.ratio,
    dy = (e.clientY - gesture.y) * gesture.ratio;
  if (
    (gesture.home && Math.abs(dy) > 12) ||
    (gesture.edge && dx > 12 && dx > Math.abs(dy) * 1.6)
  )
    screen.setPointerCapture(e.pointerId);
});
screen.addEventListener("pointerup", (e) => {
  if (!gesture || gesture.id !== e.pointerId) return;
  const g = gesture;
  gesture = null;
  const dx = (e.clientX - g.x) * g.ratio,
    dy = (e.clientY - g.y) * g.ratio;
  let handled = false;
  if (g.lock) {
    sampleLockSwipe(g, e);
    const distance = g.y - e.clientY, horizontal = Math.abs(e.clientX - g.x);
    const first = g.samples[0], elapsed = e.timeStamp - first.time;
    const velocity = elapsed > 0 ? (first.y - e.clientY) / elapsed : 0;
    const vertical = distance > horizontal * 1.2;
    const unlock = vertical && (distance >= Math.min(80, screen.getBoundingClientRect().height * .10) ||
      (distance >= 24 && velocity >= .5));
    if (unlock) {
      // Prime activation-dependent media while pointerup still has user activation.
      systemSounds.enable();
      warmAppleMusic();
    }
    if (!g.dragged && g.tapTarget) {
      resetLockSwipe();
      g.tapTarget.click();
      handled = true;
    } else {
      settleLockSwipe(unlock);
      handled = g.dragged || unlock;
    }
  } else if (g.home && dy < -45 && Math.abs(dy) > Math.abs(dx) * 1.3) {
    goHome();
    handled = true;
  } else if (
    g.photo &&
    Math.abs(dx) > 60 &&
    Math.abs(dx) > Math.abs(dy) * 1.5
  ) {
    movePhoto(dx < 0 ? 1 : -1);
    handled = true;
  } else if (g.edge && dx > 65 && dx > Math.abs(dy) * 1.6) {
    goBack();
    handled = true;
  }
  if (handled) {
    suppressClick = true;
    setTimeout(() => (suppressClick = false), 350);
  }
});
screen.addEventListener("pointercancel", (e) => {
  if (!gesture || gesture.id !== e.pointerId) return;
  gesture = null;
  resetLockSwipe();
});
screen.addEventListener(
  "click",
  (e) => {
    if (suppressClick) {
      e.preventDefault();
      e.stopImmediatePropagation();
      suppressClick = false;
    }
  },
  true,
);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (state.callStatus === "ringing") return declineCall();
    if (state.callStatus === "active") return endCall();
    if (!modal.classList.contains("hidden")) closeModal();
    else goBack();
  }
  if ($("#photoViewer.open")) {
    if (e.key === "ArrowRight") movePhoto(1);
    if (e.key === "ArrowLeft") movePhoto(-1);
  }
});
