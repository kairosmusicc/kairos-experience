/* V8 extensions. Official profiles and players are configured in external-content.js. */
const INSTAGRAM_POSTS = [
  {
    id: "kairos",
    image: "assets/images/kairos-cover.jpg",
    caption: "KAIROS · 29.10.26",
    externalUrl: null,
  },
  {
    id: "manii",
    image: "assets/images/manii-01.jpg",
    caption: "Manii",
    externalUrl: null,
  },
  {
    id: "duo",
    image: "assets/images/duo-01.jpg",
    caption: "Manii & Paapii",
    externalUrl: null,
  },
  {
    id: "paapii",
    image: "assets/images/paapii-01.jpg",
    caption: "Paapii",
    externalUrl: null,
  },
];
const IG_CONTACTS = {
  emmanuella: {
    name: "emmanuella",
    username: INSTAGRAM_PROFILES.emmanuella.username,
    preview: "2 nouveaux messages",
    time: "9 h",
  },
  angiste: {
    name: "Angiste",
    username: INSTAGRAM_PROFILES.angiste.username,
    preview: "En ligne il y a 57 minutes",
    time: "",
  },
  corentin: {
    name: "Corentin",
    username: INSTAGRAM_PROFILES.corentin.username,
    preview: "lien final reçu",
    time: "1 j",
  },
  redka: {
    name: "Redka",
    username: INSTAGRAM_PROFILES.redka.username,
    preview: "frérot l’intro 🔥",
    time: "1 j",
  },
};
const igUI = { filter: "Principal", query: "", inboxScroll: 0 };
function igAvatar(name, src, extra = "") {
  return src
    ? `<img class="ig-avatar ${extra}" src="${src}" width="56" height="56" alt="${escapeHTML(name)}" loading="lazy" decoding="async">`
    : `<span class="ig-avatar ig-neutral ${extra}" aria-label="${escapeHTML(name)}">${escapeHTML(name[0] || "•")}</span>`;
}
function igVerified() {
  return `<span class="ig-verified" aria-label="Compte vérifié">${icon("check")}</span>`;
}
function igUnreadCount() {
  return (
    1 +
    (state.instagramEmmanuellaRead ? 0 : 1) +
    (state.finalAlbumMessageAvailable && !state.finalAlbumMessageRead ? 1 : 0)
  );
}
function updateInstagramBadge() {
  const button = $('#home [data-route="instagram"]');
  if (!button) return;
  const count = igUnreadCount();
  button.classList.toggle("has-badge", count > 0);
  let badge = $("i", button);
  if (!badge) {
    badge = document.createElement("i");
    button.append(badge);
  }
  badge.textContent = count;
  badge.classList.toggle("hidden", !count);
}
function igBottomNav(selected) {
  return `<nav class="ig-bottom-nav" aria-label="Navigation Instagram">${[
    ["home", "igHome", "Accueil"],
    ["reels", "reels", "Reels"],
    ["inbox", "message", "Messages"],
    ["search", "search", "Rechercher"],
    ["manii-profile", "contacts", "Profil"],
  ]
    .map(
      ([view, ic, label]) =>
        `<button data-ig-view="${view}" aria-label="${label}" class="${selected === view ? "selected" : ""}" ${selected === view ? 'aria-current="page"' : ""}>${view === "manii-profile" ? igAvatar("Manii", "assets/images/manii-01.jpg") : icon(ic)}${view === "inbox" ? `<span class="ig-nav-dot" aria-label="${igUnreadCount()} discussions non lues"></span>` : ""}</button>`,
    )
    .join("")}</nav>`;
}
function igSwitch(view) {
  transitionMedia({ renderer: renderInstagram, args: [view] });
  state.navigationStack = [];
  state.currentView = { renderer: renderInstagram, args: [view] };
  renderInstagram(view);
}
function renderInstagram(view = "manii-profile") {
  if (view === "inbox") return renderInstagramInbox();
  if (view === "home") return renderIGFeed();
  if (view === "search") return renderIGSearch();
  if (view === "reels") return renderIGReels();
  // Preserve all four real profile captures and their original hotspots.
  renderInstagramProfile(view);
  const capture = $(".screen-shot-app"),
    shell = document.createElement("section"),
    scroll = document.createElement("div"),
    frame = document.createElement("div");
  shell.className = "ig-app ig-profile";
  scroll.className = "ig-scroll";
  frame.className = "ig-capture-window";
  if (view.endsWith("-profile"))
    capture.insertAdjacentHTML(
      "beforeend",
      '<button class="hotspot" data-safari-album aria-label="Ouvrir le lien album du profil" style="left:4%;top:34%;width:82%;height:5%"></button>',
    );
  frame.append(capture);
  scroll.append(frame);
  if (view.endsWith("-profile")) {
    const owner = view.startsWith("paapii") ? "paapii" : "manii";
    scroll.insertAdjacentHTML(
      "beforeend",
      `<div class="ig-profile-official"><b>${INSTAGRAM_PROFILES[owner].username}</b>${instagramProfileLink(owner, "Ouvrir sur Instagram")}</div>`,
    );
  }
  if (view.endsWith("-profile")) {
    const grid = document.createElement("div");
    grid.className = "ig-profile-posts";
    grid.innerHTML = `<div class="ig-posts-title">${icon("grid")} Publications</div><div class="ig-post-grid">${INSTAGRAM_POSTS.map((p) => `<button data-ig-post="${p.id}" aria-label="Ouvrir ${p.caption}"><img src="${p.image}" alt="${p.caption}" loading="lazy" decoding="async"></button>`).join("")}</div>`;
    scroll.append(grid);
    if (view === "manii-profile")
      scroll.insertAdjacentHTML("beforeend", instagramPublicPosts());
  }
  shell.append(scroll);
  shell.insertAdjacentHTML("beforeend", igBottomNav("manii-profile"));
  appContent.replaceChildren(shell);
  bindV8Controls();
}
function igNotesStrip() {
  const notes = [
    ["Votre note", "📌 Localisation dé…", "", "assets/images/manii-01.jpg"],
    [
      "emmanuella",
      "⏸ RECULER",
      "Gaillard Jules · Tchi tchi",
      INSTAGRAM_AVATARS.emmanuella,
    ],
    ["Angiste", "Mon soleil", "Princess Lover", INSTAGRAM_AVATARS.angiste],
    ["Corentin", "On est bons", "", INSTAGRAM_AVATARS.corentin],
    ["Redka", "Encore au studio", "", INSTAGRAM_AVATARS.redka],
    ["Yoan", "Dernière lumière", "", null],
  ];
  return `<div class="ig-notes" data-horizontal-scroll aria-label="Notes Instagram">${notes.map(([name, text, song, src], i) => `<button class="ig-note" data-ig-note="${i}" aria-label="Note de ${name} : ${text}"><span class="ig-note-bubble"><b>${text}</b>${song ? `<small>${song}</small>` : ""}</span>${igAvatar(name, src)}<span class="ig-note-name">${name}</span></button>`).join("")}</div>`;
}
function igInboxRow(id, name, preview, time, options = {}) {
  const unread = options.unread,
    src = INSTAGRAM_AVATARS[id],
    real = !!IG_CONTACTS[id];
  const body = `<span class="ig-avatar-wrap">${igAvatar(name, src)}${options.online ? '<i class="ig-online"></i>' : ""}</span><span class="ig-inbox-copy"><b>${name}</b><span class="${unread ? "unread" : ""}">${escapeHTML(preview)}${time ? ` <time>· ${time}</time>` : ""}</span></span>${unread ? '<span class="ig-unread" aria-label="Non lu"></span>' : ""}<span class="ig-row-camera" aria-hidden="true">${icon("camera")}</span>`;
  return real
    ? `<button class="ig-inbox-row" data-ig-thread="${id}" data-ig-searchable="${escapeHTML(name)}">${body}</button>`
    : `<div class="ig-inbox-row" data-ig-searchable="${escapeHTML(name)}">${body}</div>`;
}
function renderInstagramInbox() {
  const rows = [
    igInboxRow("himra", "himra_saiyen", "Envoyé", ""),
    igInboxRow(
      "emmanuella",
      "emmanuella",
      state.instagramEmmanuellaRead
        ? "tu me réponds plus 😭"
        : "2 nouveaux messages",
      "9 h",
      { unread: !state.instagramEmmanuellaRead },
    ),
    igInboxRow("ruben", "Ruben cutz 💈", "En ligne", "", { online: true }),
    igInboxRow("angiste", "Angiste", "En ligne il y a 57 minutes", ""),
    igInboxRow("ange", "Ange Attéméné", "A aimé un message", "21 h", {
      unread: true,
    }),
    igInboxRow(
      "corentin",
      "Corentin",
      state.finalAlbumMessageAvailable
        ? "j’ai laissé le lien final dans Safari"
        : "lien final reçu",
      state.finalAlbumMessageAvailable ? "maintenant" : "1 j",
      {
        unread:
          state.finalAlbumMessageAvailable && !state.finalAlbumMessageRead,
      },
    ),
    igInboxRow("redka", "Redka", "frérot l’intro 🔥", "1 j"),
    igInboxRow(
      "yoan",
      "Yoan — Zénithal",
      "les exports sont sur le disque",
      "2 j",
    ),
  ].join("");
  const filtered =
    igUI.filter === "Principal"
      ? rows
      : `<div class="ig-inbox-empty"><b>${igUI.filter === "Invitations" ? "Aucune invitation" : "Aucune discussion générale"}</b><p>Les conversations de ce téléphone sont dans Principal.</p><button data-ig-filter="Principal">Revenir à Principal</button></div>`;
  openApp(
    `<section class="ig-app ig-inbox"><div class="ig-inbox-header"><button class="ig-username" data-ig-account><span class="ig-username-text">${INSTAGRAM_PROFILES.manii.username}</span> ${igVerified()}<span class="ig-down">${icon("back")}</span></button><div>${iconButton("ellipsis", "Options Instagram", "data-ig-options")}${iconButton("compose", "Nouveau message Instagram", "data-ig-compose")}</div></div><div class="ig-scroll" id="igInboxScroll"><label class="ig-search-bar"><span class="ig-meta-orb" aria-hidden="true"></span><input id="igInboxSearch" type="search" placeholder="Recherchez ou demandez à Meta AI" aria-label="Rechercher une discussion Instagram" value="${escapeHTML(igUI.query)}"></label>${igNotesStrip()}<div class="ig-inbox-tabs">${iconButton("sliders", "Filtrer les discussions", "data-ig-options")}${["Principal", "Invitations", "Général"].map((t) => `<button data-ig-filter="${t}" aria-pressed="${igUI.filter === t}" class="${igUI.filter === t ? "selected" : ""}">${t}${t === "Principal" ? `<i>${igUnreadCount()}</i>` : ""}</button>`).join("")}</div><div id="igInboxRows">${filtered}</div><p id="igSearchEmpty" class="hidden ig-empty">Aucun résultat</p></div>${igBottomNav("inbox")}</section>`,
  );
  $("#igInboxScroll").scrollTop = igUI.inboxScroll;
  filterIGInbox(igUI.query);
}
function filterIGInbox(query) {
  igUI.query = query;
  let count = 0;
  $$("[data-ig-searchable]").forEach((row) => {
    const visible = row.dataset.igSearchable
      .toLocaleLowerCase("fr")
      .includes(query.toLocaleLowerCase("fr"));
    row.classList.toggle("hidden", !visible);
    if (visible) count++;
  });
  $("#igSearchEmpty")?.classList.toggle(
    "hidden",
    count > 0 || igUI.filter !== "Principal",
  );
}
function igDateGroup(timestamp) {
  const d = new Date(timestamp),
    now = new Date(),
    yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  return d.toDateString() === now.toDateString()
    ? "Aujourd’hui"
    : d.toDateString() === yesterday.toDateString()
      ? "Hier"
      : d.toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        });
}
function instagramMessages(id) {
  const base = (INSTAGRAM_CONVERSATIONS[id] || []).map((m) => ({
    ...m,
    timestamp: state.instagramEpoch - m.minutesAgo * 60000,
    read: id === "emmanuella" ? state.instagramEmmanuellaRead || m.read : true,
  }));
  if (id === "corentin" && state.finalAlbumMessageAvailable)
    base.push(
      ...INSTAGRAM_FINAL_MESSAGES.map((m, i) => ({
        ...m,
        timestamp: (state.finalAlbumMessageAt || Date.now()) - (4 - i) * 15000,
        read: state.finalAlbumMessageRead,
        reaction: null,
      })),
    );
  return base
    .concat(state.instagramReplies[id] || [])
    .map((m) => ({ ...m, dateGroup: igDateGroup(m.timestamp) }));
}
function igMessageHTML(m) {
  let body =
    m.type === "image"
      ? `<button class="ig-image-message" data-ig-image="${m.image}" aria-label="Ouvrir la photo"><img src="${m.image}" alt="Photo partagée" width="180" height="180" loading="lazy"></button>`
      : m.text === ALBUM_URL
        ? `<button class="ig-shared-link" data-safari-album>${icon("globe")}<b>KAIROS — Manii & Paapii</b><span>album.link</span></button>`
        : escapeHTML(m.text);
  const reaction = Object.hasOwn(state.instagramReactions, m.id)
    ? state.instagramReactions[m.id]
    : m.reaction?.emoji;
  return `<div class="ig-message-line ${m.sender === "me" ? "me" : "them"}" data-message-id="${m.id}" data-read="${m.read}"><div class="ig-message-bubble ${m.type === "image" ? "is-image" : ""}" data-ig-react="${m.id}" title="Double-cliquer pour réagir">${body}</div>${reaction ? `<span class="ig-reaction" aria-label="Réaction ${reaction}">${escapeHTML(reaction)}</span>` : ""}<time>${new Date(m.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</time></div>`;
}
function renderInstagramThread(id, updateOnly = false) {
  const c = IG_CONTACTS[id];
  if (!c) return;
  if (id === "emmanuella") state.instagramEmmanuellaRead = true;
  else
    state[
      {
        angiste: "instagramAngisteOpened",
        corentin: "instagramCorentinOpened",
        redka: "instagramRedkaOpened",
      }[id]
    ] = true;
  if (id === "corentin" && state.finalAlbumMessageAvailable)
    state.finalAlbumMessageRead = true;
  persistProgress();
  updateInstagramBadge();
  if (!updateOnly) {
    trackEvent("instagram_dm_opened", { thread: id });
    trackEvent(id + "_opened");
  }
  let group = "";
  const messages = instagramMessages(id)
    .map((m) => {
      const separator =
        m.dateGroup !== group
          ? `<div class="ig-date-separator">${escapeHTML(m.dateGroup)}</div>`
          : "";
      group = m.dateGroup;
      return separator + igMessageHTML(m);
    })
    .join("");
  openApp(
    `<section class="ig-app ig-thread"><header class="ig-thread-header"><button class="back" data-app-back aria-label="Retour à la boîte Instagram">${icon("back")}</button>${igAvatar(c.name, INSTAGRAM_AVATARS[id])}<div><b>${c.name}</b><small>${id === "angiste" ? "En ligne il y a 57 minutes" : c.username}</small></div>${iconButton("phone", "Appeler " + c.name, "data-contact-call")}${iconButton("video", "Appel vidéo " + c.name, "data-contact-call")}</header><div class="ig-thread-messages" id="igThreadMessages"><div class="ig-contact-card">${igAvatar(c.name, INSTAGRAM_AVATARS[id])}<b>${c.name}</b><span>${c.username} · Instagram</span>${instagramProfileLink(id, "Voir le profil")}</div>${messages}<span class="ig-delivered">Vu</span></div><form class="ig-composer" data-ig-reply="${id}">${iconButton("camera", "Photos de ce téléphone", "data-ig-photos")}<input name="message" placeholder="Envoyer un message…" aria-label="Message à ${c.name}" maxlength="500" autocomplete="off"><button type="submit" aria-label="Envoyer">${icon("send")}</button></form></section>`,
  );
  requestAnimationFrame(() => {
    if (
      state.currentView?.renderer === renderInstagramThread &&
      state.currentView.args[0] === id
    ) {
      const scroll = $("#igThreadMessages");
      scroll.scrollTop = scroll.scrollHeight;
    }
  });
}
function renderIGFeed() {
  openApp(
    `<section class="ig-app ig-feed"><header class="ig-feed-header"><b>Instagram</b><div>${iconButton("heart", "Activité Instagram", "data-ig-activity")}${iconButton("message", "Messages Instagram", 'data-ig-view="inbox"')}</div></header><div class="ig-scroll">${INSTAGRAM_POSTS.map((p) => `<article class="ig-feed-post"><header>${igAvatar("Manii", "assets/images/manii-01.jpg")}<b>${INSTAGRAM_PROFILES.manii.username} ${igVerified()}</b>${iconButton("ellipsis", "Options de la publication", "data-ig-options")}</header><button data-ig-post="${p.id}" aria-label="Ouvrir ${p.caption}"><img src="${p.image}" alt="${p.caption}" loading="lazy" decoding="async"></button><p>${p.caption}</p></article>`).join("")}</div>${igBottomNav("home")}</section>`,
  );
}
function renderIGPost(id) {
  const p = INSTAGRAM_POSTS.find((p) => p.id === id);
  if (!p) return;
  openApp(
    `<section class="ig-app ig-post-detail">${nav("Publication", "•••")}<div class="ig-scroll"><div class="ig-feed-header">${igAvatar("Manii", "assets/images/manii-01.jpg")}<b>${INSTAGRAM_PROFILES.manii.username} ${igVerified()}</b></div><img class="ig-full-post" src="${p.image}" alt="${p.caption}"><div class="ig-post-actions">${iconButton("heart", "Aimer la publication", `data-ig-like="${p.id}" aria-pressed="false"`)}${iconButton("share", "Partager la publication", "data-share")}</div><p><b>${INSTAGRAM_PROFILES.manii.username}</b> ${p.caption}</p>${p.externalUrl ? `<a href="${p.externalUrl}" target="_blank" rel="noopener noreferrer">Ouvrir sur Instagram</a>` : ""}</div></section>`,
  );
}
function renderIGSearch() {
  openApp(
    `<section class="ig-app ig-search"><label class="ig-search-bar">${icon("search")}<input type="search" id="igExploreSearch" placeholder="Rechercher" aria-label="Rechercher un compte"></label><div class="ig-scroll"><div id="igExploreResults">${Object.entries(
      IG_CONTACTS,
    )
      .map(([id, c]) => igInboxRow(id, c.name, c.username, ""))
      .join(
        "",
      )}</div><div class="ig-post-grid">${INSTAGRAM_POSTS.map((p) => `<button data-ig-post="${p.id}" aria-label="Ouvrir ${p.caption}"><img src="${p.image}" alt="${p.caption}" loading="lazy"></button>`).join("")}</div></div>${igBottomNav("search")}</section>`,
  );
}
function renderIGReels() {
  openApp(
    `<section class="ig-app ig-reels"><h2>Reels</h2><video id="igReelVideo" src="assets/video/camera.mp4" poster="assets/images/manii-02.jpg" muted playsinline loop preload="none"></video><button class="ig-reel-play" data-ig-reel aria-label="Lire ou mettre en pause la vidéo">${icon("play")}</button><div class="ig-reel-caption"><b>${INSTAGRAM_PROFILES.manii.username}</b><p>KAIROS · archives</p></div>${igBottomNav("reels")}</section>`,
    { dark: true },
  );
}
function renderIGImage(src) {
  if (!Object.values(INSTAGRAM_AVATARS).includes(src)) return;
  openApp(
    `<div class="ig-image-viewer">${nav("Photo")}<img src="${src}" alt="Photo partagée"></div>`,
    { dark: true },
  );
}

/* A single notification surface is reused by Notes and the final Instagram message. */
class PhoneNotifications {
  constructor() {
    this.timer = null;
    this.key = null;
  }
  show({ key, app, image, sender, preview, open, duration = 10000 }) {
    if (
      state.callStatus !== "idle" ||
      state.facetimeActive ||
      !modal.classList.contains("hidden") ||
      document.hidden
    )
      return false;
    this.hide();
    this.key = key;
    const banner = $("#storyNotification");
    banner.innerHTML = `<button class="story-open" aria-label="${escapeHTML(app + ", " + sender + ", " + preview)}"><img src="${image}" alt=""><span><small>${escapeHTML(app.toUpperCase())}<time>maintenant</time></small><b>${escapeHTML(sender)}</b><span>${escapeHTML(preview)}</span></span></button><button class="story-dismiss" aria-label="Fermer la notification">${icon("close")}</button>`;
    banner.classList.remove("hidden");
    systemSounds.play("notification");
    briefFeedback("notification");
    $(".story-open", banner).onclick = () => {
      this.hide();
      open();
    };
    $(".story-dismiss", banner).onclick = () => this.hide();
    this.timer = setTimeout(() => this.hide(), duration);
    return true;
  }
  hide() {
    clearTimeout(this.timer);
    this.timer = null;
    this.key = null;
    document.querySelector("#storyNotification")?.classList.add("hidden");
  }
}
const notifications = new PhoneNotifications();
let albumMessageTimer = null;
function scheduleAlbumMessage() {
  clearTimeout(albumMessageTimer);
  if (
    !state.abegUnlocked ||
    !state.toutGacherUnlocked ||
    !state.finalNoteOpened ||
    state.finalAlbumMessageAvailable
  )
    return;
  albumMessageTimer = setTimeout(() => {
    if (!home.classList.contains("active-view")) return;
    if (
      !notifications.show({
        key: "corentin-album",
        app: "Instagram",
        image: "assets/icons/instagram.png",
        sender: "Corentin",
        preview: "j’ai laissé le lien final dans Safari",
        open: () => {
          route("instagram");
          igSwitch("inbox");
          navigate(renderInstagramThread, "corentin");
        },
      })
    )
      return;
    state.finalAlbumMessageAvailable = true;
    state.finalAlbumMessageAt = Date.now();
    state.safariKairosAvailable = true;
    persistProgress();
    updateInstagramBadge();
    trackEvent("final_album_message_shown");
  }, 3500);
}
function openSafariAlbum() {
  state.safariKairosAvailable = true;
  persistProgress();
  route("safari");
  if (!$(".safari-album")) safariNavigate("album");
}
function openOfficialAlbum() {
  audioManager.stop();
  stopOfficialEmbeds();
  state.albumLinkClicked = true;
  persistProgress();
  trackEvent("album_link_clicked");
  window.open(ALBUM_URL, "_blank", "noopener,noreferrer");
}
function safariNavigate(page) {
  if (!["start", "album"].includes(page)) return;
  if (page === "album") {
    state.safariKairosAvailable = true;
    trackEvent("safari_kairos_opened");
  }
  if (state.safariHistory.at(-1) !== page) state.safariHistory.push(page);
  state.safariHistory = state.safariHistory.slice(-20);
  persistProgress();
  state.currentView = { renderer: renderSafari, args: [page] };
  renderSafari(page);
}
function safariBack() {
  if (state.safariHistory.length > 1) {
    state.safariHistory.pop();
    persistProgress();
    renderSafari(state.safariHistory.at(-1));
  } else if ($(".safari-album")) safariNavigate("start");
  else goHome();
}
function safariAlbumPage() {
  return `<article class="safari-album"><small>album.link</small><img src="${KAIROS_COVER}" alt="Cover officielle de KAIROS" width="260" height="260"><h1>KAIROS</h1><p>Manii & Paapii</p><button class="safari-listen" data-album-listen>Écouter ${icon("next")}</button><span>Choisissez votre plateforme.</span></article>`;
}
function renderSafari(page) {
  page =
    page ||
    (state.safariKairosAvailable
      ? "album"
      : state.safariHistory.at(-1) || "start");
  if (page === "album" && !state.safariKairosAvailable) page = "start";
  const content =
    page === "album"
      ? safariAlbumPage()
      : `<section class="safari-start"><h1>Safari</h1><h2>Onglets récents</h2>${state.safariKairosAvailable ? `<button class="safari-recent" data-safari-page="album"><img src="${KAIROS_COVER}" alt="KAIROS"><span><b>KAIROS — Manii & Paapii</b><small>album.link</small></span></button>` : "<p>Les pages ouvertes sur cet iPhone apparaîtront ici.</p>"}</section>`;
  openApp(
    `<section class="safari-app"><div class="safari-page">${content}</div><div class="safari-controls"><form class="safari-address" data-safari-address>${icon("lock")}<input aria-label="Adresse Safari" name="address" inputmode="url" autocomplete="off" value="${page === "album" ? "album.link/qzsdrsh5r3m8j" : ""}" placeholder="Rechercher ou saisir un site"><button type="button" data-safari-reload aria-label="Recharger">${icon("reload")}</button></form><nav class="safari-toolbar" aria-label="Navigation Safari"><button data-safari-back aria-label="Page précédente">${icon("back")}</button><button data-safari-forward aria-label="Page suivante">${icon("next")}</button>${iconButton("share", "Partager la page", "data-share")}${iconButton("file", "Historique Safari", "data-safari-history")}${iconButton("tabs", "Onglets Safari", "data-safari-tabs")}</nav></div></section>`,
  );
  if (page === "album" && state.safariHistory.at(-1) !== "album") {
    state.safariHistory.push("album");
    persistProgress();
    trackEvent("safari_kairos_opened");
  }
}
function renderSafariTabs() {
  openApp(
    `<section class="safari-tabs-app">${nav("Onglets Safari")}<div class="safari-tab-grid"><button class="safari-tab-card" data-safari-page="start"><div class="safari-tab-placeholder">Safari</div><b>Page de démarrage</b></button>${state.safariKairosAvailable ? `<button class="safari-tab-card" data-safari-page="album"><img src="${KAIROS_COVER}" alt="Cover KAIROS"><b>KAIROS — Manii & Paapii</b><small>album.link</small></button>` : ""}</div><button class="safari-new-tab" data-safari-page="start">${icon("plus")} Nouvel onglet</button></section>`,
  );
}
function instagramProfileLink(id, label) {
  const profile = INSTAGRAM_PROFILES[id];
  return profile
    ? `<a class="ig-profile-link" data-instagram-profile="${id}" href="${profile.url}" target="_blank" rel="noopener noreferrer">${label}</a>`
    : "";
}
function instagramPublicPosts() {
  let post = 0,
    reel = 0;
  return `<section class="ig-public-posts"><h2>Sur Instagram</h2><div>${INSTAGRAM_PUBLIC_POSTS.map(
    (url) => {
      const isReel = new URL(url).pathname.startsWith("/reel/"),
        number = isReel ? ++reel : ++post;
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" data-instagram-public-post>${icon(isReel ? "reels" : "grid")}<span><b>${isReel ? "Reel" : "Publication"} ${number}</b><small>${INSTAGRAM_PROFILES.manii.username}</small></span>${icon("next")}</a>`;
    },
  ).join("")}</div></section>`;
}
function appleRecentlyPlayed() {
  return `<section class="apple-recent"><h2 class="subheading">Écoutés récemment</h2><div>${Object.entries(
    APPLE_MUSIC_CATALOG,
  )
    .map(
      ([key, c]) =>
        `<button class="apple-recent-item ${key === "kairos" ? "kairos-priority" : ""}" data-apple-content="${key}">${key === "kairos" ? `<img src="${KAIROS_COVER}" alt="Cover KAIROS" width="52" height="52">` : `<span class="apple-art-neutral">${icon("music")}</span>`}<span><b>${c.title}</b><small>${c.artist || "Morceau · Apple Music"}</small></span>${icon("play")}</button>`,
    )
    .join("")}</div></section>`;
}
function officialContent(provider, key = "kairos") {
  if (provider === "spotify") return key === "kairos" ? SPOTIFY_KAIROS : null;
  return provider === "apple" && Object.hasOwn(APPLE_MUSIC_CATALOG, key)
    ? APPLE_MUSIC_CATALOG[key]
    : null;
}
function officialAlbumEntry(provider) {
  return `<div class="official-album-entry"><button data-official-embed="${provider}">${icon("globe")} Ouvrir le lecteur officiel</button></div>`;
}
function validatedEmbed(provider, key = "kairos") {
  const content = officialContent(provider, key);
  if (!content) return null;
  try {
    const url = new URL(content.embedUrl);
    if (url.protocol !== "https:") return null;
    if (
      provider === "spotify" &&
      url.hostname === "open.spotify.com" &&
      /^\/embed\/album\/[a-zA-Z0-9]+$/.test(url.pathname)
    )
      return url.href;
    if (
      provider === "apple" &&
      url.hostname === "embed.music.apple.com" &&
      /^\/fr\/album\/[^/]+\/\d+$/.test(url.pathname)
    )
      return url.href;
  } catch {}
  return null;
}
function stopOfficialEmbeds() {
  // Removing the browsing context stops cross-origin media without pretending to control its player.
  $$("[data-official-frame]").forEach((frame) => frame.remove());
}
function renderOfficialEmbed(provider, key = "kairos") {
  const content = officialContent(provider, key),
    src = validatedEmbed(provider, key);
  if (!content || !src) return;
  audioManager.stop();
  stopOfficialEmbeds();
  const apple = provider === "apple",
    height = apple ? (content.type === "track" ? 150 : 450) : 450;
  const officialURL = apple
    ? key === "kairos"
      ? KAIROS_APPLE_MUSIC_URL
      : src.replace("https://embed.music.apple.com", "https://music.apple.com")
    : SPOTIFY_KAIROS.url;
  trackEvent(apple ? "apple_music_embed_opened" : "spotify_embed_started");
  openApp(
    `<div class="official-player ${apple ? "music-app apple-official-player" : "spotify-app"}">${nav(apple ? "Musique" : "Spotify")}<header class="official-player-title"><h1>${content.title}</h1>${content.artist ? `<p>${content.artist}</p>` : ""}</header><iframe data-official-frame data-provider="${provider}" src="${escapeHTML(src)}" title="${content.title} — ${apple ? "Apple Music" : "Spotify"}" loading="lazy" allow="${apple ? "autoplay *; encrypted-media *;" : "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"}" ${apple ? 'sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"' : ""} frameborder="0" style="width:100%;height:${height}px;overflow:hidden;background:transparent;"></iframe><div class="official-player-fallback"><p data-embed-status role="status" class="hidden">Lecteur indisponible</p><a href="${officialURL}" target="_blank" rel="noopener noreferrer" data-official-fallback>Ouvrir dans ${apple ? "Apple Music" : "Spotify"}</a><button data-embed-retry data-provider="${provider}" data-content="${key}">Recharger le lecteur</button></div></div>`,
    { dark: !apple },
  );
  const frame = $("[data-official-frame]");
  frame.onerror = () => {
    if (frame.isConnected && $("[data-official-frame]") === frame)
      $("[data-embed-status]")?.classList.remove("hidden");
  };
}

/* Fresh-view property handlers, no duplicate global listeners on re-render. */
function bindV8Controls() {
  const on = (sel, handler) =>
    $$(sel, appContent).forEach((b) => (b.onclick = (e) => handler(b, e)));
  on("[data-ig-view]", (b) => igSwitch(b.dataset.igView));
  on("[data-ig-thread]", (b) => {
    const scroll = $("#igInboxScroll");
    if (scroll) igUI.inboxScroll = scroll.scrollTop;
    navigate(renderInstagramThread, b.dataset.igThread);
  });
  on("[data-ig-filter]", (b) => {
    igUI.filter = b.dataset.igFilter;
    igUI.inboxScroll = 0;
    renderInstagramInbox();
  });
  on("[data-ig-note]", (b) => {
    const i = Number(b.dataset.igNote);
    if (i === 1) navigate(renderInstagramThread, "emmanuella");
    else if (i === 2) navigate(renderInstagramThread, "angiste");
    else if (i === 3) navigate(renderInstagramThread, "corentin");
    else if (i === 4) navigate(renderInstagramThread, "redka");
    else
      showSheet(
        i === 0 ? "Votre note" : "Yoan",
        i === 0 ? "📌 Localisation désactivée" : "Dernière lumière",
      );
  });
  on("[data-ig-account]", () =>
    showSheet(
      INSTAGRAM_PROFILES.manii.username,
      "Ce compte est ouvert sur cet iPhone.",
    ),
  );
  on("[data-ig-options]", () =>
    showSheet("Instagram", "Discussions", [
      {
        label: "Principal",
        run: () => {
          igUI.filter = "Principal";
          igSwitch("inbox");
        },
      },
      {
        label: "Invitations",
        run: () => {
          igUI.filter = "Invitations";
          igSwitch("inbox");
        },
      },
      {
        label: "Général",
        run: () => {
          igUI.filter = "Général";
          igSwitch("inbox");
        },
      },
    ]),
  );
  on("[data-ig-compose]", () =>
    showSheet(
      "Nouveau message",
      "",
      Object.entries(IG_CONTACTS).map(([id, c]) => ({
        label: c.name,
        run: () => navigate(renderInstagramThread, id),
      })),
    ),
  );
  on("[data-ig-activity]", () =>
    showSheet("Activité", "Ange Attéméné a aimé un message."),
  );
  on("[data-ig-post]", (b) => navigate(renderIGPost, b.dataset.igPost));
  on("[data-ig-image]", (b) => navigate(renderIGImage, b.dataset.igImage));
  on("[data-ig-like]", (b) => {
    const active = b.getAttribute("aria-pressed") !== "true";
    b.setAttribute("aria-pressed", String(active));
    b.classList.toggle("liked", active);
  });
  on("[data-ig-photos]", () => navigate(renderPhotos));
  on("[data-ig-reel]", async (b) => {
    const v = $("#igReelVideo");
    if (v.paused) {
      try {
        await v.play();
        b.innerHTML = icon("pause");
      } catch {
        toast("Vidéo indisponible");
      }
    } else {
      v.pause();
      b.innerHTML = icon("play");
    }
  });
  $$("[data-ig-react]", appContent).forEach(
    (b) =>
      (b.ondblclick = () => {
        const id = b.dataset.igReact;
        state.instagramReactions[id] = state.instagramReactions[id] ? "" : "❤️";
        persistProgress();
        const scroll = $("#igThreadMessages"),
          top = scroll.scrollTop;
        const thread = state.currentView?.args[0];
        renderInstagramThread(thread, true);
        requestAnimationFrame(() => {
          const s = $("#igThreadMessages");
          if (s) s.scrollTop = top;
        });
      }),
  );
  const query = $("#igInboxSearch");
  if (query) query.oninput = () => filterIGInbox(query.value);
  const explore = $("#igExploreSearch");
  if (explore)
    explore.oninput = () =>
      $$("[data-ig-searchable]").forEach((row) =>
        row.classList.toggle(
          "hidden",
          !row.dataset.igSearchable
            .toLowerCase()
            .includes(explore.value.toLowerCase()),
        ),
      );
  const form = $("[data-ig-reply]");
  if (form) {
    $$("button", form).forEach((b) => {
      if (!b.hasAttribute("type")) b.type = "button";
    });
    form.onsubmit = (e) => {
      e.preventDefault();
      const field = $("input", form),
        text = field.value.trim(),
        id = form.dataset.igReply;
      if (!text) return;
      const replies = (state.instagramReplies[id] ||= []);
      if (replies.length >= 50) {
        toast("La conversation est pleine");
        return;
      }
      replies.push({
        id: "reply-" + id + "-" + Date.now(),
        sender: "me",
        type: "text",
        text,
        timestamp: Date.now(),
        read: true,
        reaction: null,
      });
      persistProgress();
      renderInstagramThread(id, true);
    };
  }
  on("[data-safari-album]", openSafariAlbum);
  on("[data-album-listen]", openOfficialAlbum);
  on("[data-safari-page]", (b) => safariNavigate(b.dataset.safariPage));
  on("[data-safari-back]", safariBack);
  on("[data-safari-forward]", () => {
    if (state.safariKairosAvailable) safariNavigate("album");
    else toast("Aucune page suivante");
  });
  on("[data-safari-tabs]", () => navigate(renderSafariTabs));
  on("[data-safari-history]", () =>
    showSheet(
      "Historique",
      "Sur cet iPhone",
      [...new Set(state.safariHistory)].reverse().map((page) => ({
        label:
          page === "album" ? "KAIROS — Manii & Paapii" : "Page de démarrage",
        run: () => safariNavigate(page),
      })),
    ),
  );
  on("[data-safari-reload]", () => {
    const content = $(".safari-page");
    content.classList.remove("safari-loading");
    void content.offsetWidth;
    content.classList.add("safari-loading");
  });
  const address = $("[data-safari-address]");
  if (address)
    address.onsubmit = (e) => {
      e.preventDefault();
      const value = $("input", address).value.trim();
      if (
        /^(https?:\/\/)?album\.link\/qzsdrsh5r3m8j\/?$/.test(value) ||
        /^kairos$/i.test(value)
      )
        safariNavigate("album");
      else toast("Cette page n’est pas enregistrée sur cet iPhone");
    };
  on("[data-official-embed]", (b) =>
    navigate(renderOfficialEmbed, b.dataset.officialEmbed, "kairos"),
  );
  on("[data-apple-content]", (b) =>
    navigate(renderOfficialEmbed, "apple", b.dataset.appleContent),
  );
  on(".spotify-app [data-album-play]", () =>
    navigate(renderOfficialEmbed, "spotify", "kairos"),
  );
  on(".music-app [data-album-play]", () =>
    navigate(renderOfficialEmbed, "apple", "kairos"),
  );
  on("[data-official-fallback]", stopOfficialEmbeds);
  on("[data-embed-retry]", (b) =>
    renderOfficialEmbed(b.dataset.provider, b.dataset.content),
  );
}
// Keep the DM composer above Safari's visual keyboard without changing the V7 phone geometry.
function updateIGKeyboard() {
  const thread = document.querySelector(".ig-thread"),
    viewport = window.visualViewport;
  if (!thread || !viewport) return;
  const focused = document.activeElement?.matches(".ig-composer input");
  const inset =
    focused && window.innerWidth <= 600 && viewport.scale === 1
      ? Math.max(
          0,
          screen.getBoundingClientRect().bottom -
            (viewport.height + viewport.offsetTop),
        )
      : 0;
  thread.style.setProperty("--ig-keyboard-inset", inset + "px");
}
window.visualViewport?.addEventListener("resize", updateIGKeyboard);
window.visualViewport?.addEventListener("scroll", updateIGKeyboard);
document.addEventListener("focusin", (e) => {
  if (e.target.matches(".ig-composer input"))
    requestAnimationFrame(updateIGKeyboard);
});
document.addEventListener("focusout", (e) => {
  if (e.target.matches(".ig-composer input"))
    requestAnimationFrame(updateIGKeyboard);
});

// A hidden or departed app must not retain a cross-origin playback context.
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopOfficialEmbeds();
});
window.addEventListener("pagehide", stopOfficialEmbeds);
