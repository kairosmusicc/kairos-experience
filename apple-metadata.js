/* Official iTunes metadata only. Catalog IDs come from the supplied Apple embed URLs. */
let appleMetadataPromise = null;
let appleMetadataState = {
  loaded: false,
  loading: false,
  error: false,
  catalog: {},
  tracks: [],
};
function appleId(key) {
  const item = APPLE_MUSIC_CATALOG[key],
    url = new URL(item.embedUrl);
  return item.type === "track"
    ? url.searchParams.get("i")
    : url.pathname.split("/").at(-1);
}
function appleMediaURL(value) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" &&
      (/(^|\.)mzstatic\.com$/.test(u.hostname) ||
        /(^|\.)itunes\.apple\.com$/.test(u.hostname))
      ? u.href
      : null;
  } catch {
    return null;
  }
}
function appleLookupJSONP(url) {
  return new Promise((resolve, reject) => {
    const callback = "kairosAppleLookup" + Math.random().toString(36).slice(2),
      script = document.createElement("script");
    let timer;
    const cleanup = () => {
      clearTimeout(timer);
      script.remove();
      delete window[callback];
    };
    window[callback] = (data) => {
      cleanup();
      resolve(data);
    };
    script.onerror = () => {
      cleanup();
      reject(new Error("Apple metadata unavailable"));
    };
    timer = setTimeout(() => {
      cleanup();
      reject(new Error("Apple metadata timeout"));
    }, 6000);
    script.src = url + "&callback=" + callback;
    document.head.append(script);
  });
}
async function appleLookup(url) {
  const abort = new AbortController(),
    timer = setTimeout(() => abort.abort(), 7000);
  try {
    const r = await fetch(url, { credentials: "omit", signal: abort.signal });
    if (!r.ok) throw new Error("Apple lookup failed");
    return await r.json();
  } catch {
    return await appleLookupJSONP(url);
  } finally {
    clearTimeout(timer);
  }
}
function applyAppleMetadata(data) {
  for (const [key, item] of Object.entries(APPLE_MUSIC_CATALOG)) {
    const row = (data.results || []).find(
      (r) =>
        String(item.type === "track" ? r.trackId : r.collectionId) ===
          appleId(key) &&
        (item.type === "track"
          ? r.wrapperType === "track"
          : r.wrapperType === "collection"),
    );
    if (!row) continue;
    const preview =
      item.type === "track"
        ? row
        : (data.results || []).find(
            (r) =>
              r.wrapperType === "track" &&
              String(r.collectionId) === appleId(key) &&
              appleMediaURL(r.previewUrl),
          );
    appleMetadataState.catalog[key] = {
      title:
        (item.type === "track" ? row.trackName : row.collectionName) ||
        item.title,
      artist: row.artistName || item.artist || "",
      artwork: appleMediaURL(row.artworkUrl100 || row.artworkUrl60),
      previewUrl: appleMediaURL(preview?.previewUrl),
      previewTitle: preview?.trackName || row.trackName || item.title,
      tracks: (data.results || []).filter(r => r.wrapperType === "track" && r.trackName &&
        (item.type === "track" ? String(r.trackId) === appleId(key) : String(r.collectionId) === appleId(key)))
        .map(r => ({ id: String(r.trackId), title: r.trackName, artist: r.artistName || row.artistName || "",
          previewUrl: appleMediaURL(r.previewUrl), duration: Number(r.trackTimeMillis) / 1000 || 0 })),
    };
  }
}
function applyKairosPreviews(data) {
  const rows = (data.results || []).filter(
    (r) =>
      r.wrapperType === "track" && String(r.collectionId) === appleId("kairos"),
  );
  const normalize = (s) =>
    String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  for (const t of ALBUM_TRACKS) {
    const names = [t.canonicalTitle || t.title];
    if (names[0] === "LPB") names.push("La plus belle");
    const row = rows.find((r) =>
      names.some((name) => normalize(name) === normalize(r.trackName)),
    );
    if (!row) continue;
    t.canonicalTitle ||= t.title;
    t.title = row.trackName;
    t.artist = "Paapii & Manii";
    t.artwork = KAIROS_COVER;
    t.src = appleMediaURL(row.previewUrl);
    t.source = "apple-preview";
    t.catalogDuration = Number(row.trackTimeMillis) || null;
    appleMetadataState.tracks.push({
      id: t.id,
      title: t.title,
      src: t.src,
      catalogDuration: t.catalogDuration,
    });
  }
}
async function loadAppleCatalogMetadata({ refresh = false } = {}) {
  if (appleMetadataState.loading && appleMetadataPromise)
    return appleMetadataPromise;
  if (refresh) {
    appleMetadataPromise = null;
    session.set("kairos.appleMetadata", "");
  }
  if (appleMetadataPromise) return appleMetadataPromise;
  appleMetadataPromise = (async () => {
    appleMetadataState.loading = true;
    appleMetadataState.error = false;
    syncAppleCatalogUI();
    try {
      const cached = storedJSON("kairos.appleMetadata", null);
      let catalog, songs;
      if (cached?.version === 2) {
        catalog = cached.catalog;
        songs = cached.songs;
      } else {
        const ids = Object.keys(APPLE_MUSIC_CATALOG).map(appleId).join(",");
        const results = await Promise.allSettled([
          appleLookup(
            "https://itunes.apple.com/lookup?id=" +
              ids +
              "&entity=song&limit=200&country=FR",
          ),
          appleLookup(
            "https://itunes.apple.com/lookup?id=" +
              appleId("kairos") +
              "&entity=song&country=FR",
          ),
        ]);
        catalog =
          results[0].status === "fulfilled"
            ? results[0].value
            : { results: [] };
        songs =
          results[1].status === "fulfilled"
            ? results[1].value
            : { results: [] };
        if (!Array.isArray(catalog.results) || !Array.isArray(songs.results))
          throw new Error("Invalid Apple metadata");
        if (!catalog.results.length && !songs.results.length)
          appleMetadataState.error = true;
        else
          session.set(
            "kairos.appleMetadata",
            JSON.stringify({ version: 2, catalog, songs }),
          );
      }
      appleMetadataState.tracks = [];
      applyAppleMetadata(catalog);
      applyAppleMetadata(songs);
      applyKairosPreviews(songs);
      audioManager.prime(ALBUM_TRACKS.find((track) => track.src));
      for (const key of Object.keys(APPLE_MUSIC_CATALOG)) {
        const src = appleArtwork(key);
        if (src) {
          const image = new Image();
          image.decoding = "async";
          image.src = src;
        }
      }
      appleMetadataState.loaded = true;
      // A partial response must not leave missing artwork spinning forever.
      appleMetadataState.error ||=
        Object.keys(APPLE_MUSIC_CATALOG).some(
          (key) =>
            key !== "kairos" && !appleMetadataState.catalog[key]?.artwork,
        ) || !ALBUM_TRACKS.some((track) => track.src);
    } catch {
      appleMetadataState.error = true;
    } finally {
      appleMetadataState.loading = false;
      syncAppleCatalogUI();
    }
    return appleMetadataState;
  })();
  return appleMetadataPromise;
}
function appleArtwork(key) {
  return key === "kairos"
    ? KAIROS_COVER
    : appleMetadataState.catalog[key]?.artwork || null;
}
function appleArtworkHTML(key, extra = "") {
  const src = appleArtwork(key),
    item = APPLE_MUSIC_CATALOG[key];
  return `<span class="apple-artwork ${src ? "" : "is-loading"} ${extra}" data-apple-art="${key}">${src ? `<img src="${src}" alt="Pochette ${item.title}" decoding="async">` : '<span class="apple-art-skeleton" aria-label="Chargement de la pochette"></span>'}</span>`;
}
function syncAppleCatalogUI() {
  $$("[data-apple-art]").forEach((el) => {
    const src = appleArtwork(el.dataset.appleArt);
    if (!src) {
      if (!appleMetadataState.loading && appleMetadataState.error) {
        el.classList.remove("is-loading");
        el.innerHTML =
          '<span class="apple-art-unavailable" aria-label="Pochette indisponible"></span>';
      }
      return;
    }
    el.classList.remove("is-loading");
    if (!el.querySelector("img"))
      el.innerHTML = `<img src="${src}" alt="Pochette ${APPLE_MUSIC_CATALOG[el.dataset.appleArt].title}" decoding="async">`;
  });
  $$("[data-apple-title]").forEach((el) => {
    const meta = appleMetadataState.catalog[el.dataset.appleTitle];
    if (meta?.title) el.textContent = meta.title;
  });
  $$("[data-apple-artist]").forEach((el) => {
    const meta = appleMetadataState.catalog[el.dataset.appleArtist];
    if (meta?.artist) el.textContent = meta.artist;
  });
  $$('[data-track^="album-"]').forEach((row) => {
    const t = ALBUM_TRACKS.find((t) => t.id === row.dataset.track);
    if (!t) return;
    row.classList.toggle("unavailable", !t.src);
    row.dataset.audioAvailable = String(!!t.src);
    row.querySelector("b").textContent = t.title;
    row.querySelector("small").textContent = t.src
      ? "Aperçu Apple Music"
      : "Aperçu indisponible";
  });
  $$("[data-catalog-tracks]").forEach(container => {
    const key = container.dataset.catalogTracks;
    container.innerHTML = appleCatalogTrackRows(key);
    container.querySelectorAll("[data-catalog-track]").forEach(button => {
      button.onclick = () => playAppleCatalog(key, button.dataset.catalogTrack);
    });
  });
  const ready = ALBUM_TRACKS.some((t) => t.src),
    preparing =
      appleMetadataState.loading ||
      (!appleMetadataState.loaded && !appleMetadataState.error);
  $$(".music-app [data-player-toggle]").forEach((button) => {
    button.disabled = !audioManager.state.currentTrack && !ready;
  });
  $$(".music-app [data-album-play], .music-app [data-shuffle]").forEach(
    (button) => {
      button.disabled = !ready;
    },
  );
  $$('.music-app [data-track^="album-"]').forEach((row) => {
    row.disabled = !ALBUM_TRACKS.find((t) => t.id === row.dataset.track)?.src;
  });
  $$("[data-catalog-play]").forEach((button) => {
    const key = button.dataset.catalogPlay;
    const available = !!appleMetadataState.catalog[key]?.previewUrl;
    button.disabled = !available;
    button.innerHTML = `${icon("play")} ${available ? "Lecture" : preparing ? "Préparation des aperçus…" : "Aperçu indisponible"}`;
  });
  $$("[data-apple-loading]").forEach((el) => {
    el.textContent = preparing
      ? "Préparation des aperçus…"
      : appleMetadataState.error
        ? "Métadonnées Apple indisponibles"
        : "";
    el.classList.toggle("hidden", !el.textContent);
  });
  $$("[data-apple-refresh]").forEach((button) =>
    button.classList.toggle(
      "hidden",
      !appleMetadataState.error || appleMetadataState.loading,
    ),
  );
  syncAudioUI();
}
let appleWarmScheduled = false;
function warmAppleMusic() {
  if (appleWarmScheduled) return;
  appleWarmScheduled = true;
  const warm = () => {
    loadAppleCatalogMetadata().catch(() => {});
  };
  if (window.requestIdleCallback) requestIdleCallback(warm, { timeout: 1000 });
  else setTimeout(warm, 0);
}
function playKairos(trackId = null) {
  if (state.currentApp !== "music" || state.callStatus !== "idle") return;
  const available = ALBUM_TRACKS.filter((t) => t.src);
  const track = trackId
    ? available.find((t) => t.id === trackId)
    : audioManager.state.shuffle
      ? available[Math.floor(Math.random() * available.length)]
      : available[0];
  if (!track) return;
  stopOfficialEmbeds();
  return audioManager.play(track);
}
function catalogPreview(key, trackId = null) {
  const meta = appleMetadataState.catalog[key];
  const song = trackId ? meta?.tracks?.find(t => t.id === trackId) : meta?.tracks?.find(t => t.previewUrl);
  if (trackId ? !song?.previewUrl : !meta?.previewUrl) return null;
  return {
    id: "catalog-" + key + (song ? "-" + song.id : ""),
    source: "apple-catalog",
    catalogKey: key,
    title: song?.title || meta.previewTitle || meta.title,
    artist: song?.artist || meta.artist,
    artwork: appleArtwork(key),
    src: song?.previewUrl || meta.previewUrl,
  };
}
function playAppleCatalog(key, trackId = null) {
  if (state.currentApp !== "music" || state.callStatus !== "idle") return;
  const track = catalogPreview(key, trackId);
  if (!track) return;
  stopOfficialEmbeds();
  return audioManager.play(track);
}
function appleCatalogTrackRows(key) {
  const tracks = appleMetadataState.catalog[key]?.tracks;
  if (!tracks) return `<p class="muted">${appleMetadataState.loading ? "Chargement des titres…" : "Titres indisponibles"}</p>`;
  return tracks.map((t, i) => `<button class="music-track ${t.previewUrl ? "" : "unavailable"}" data-catalog-track="${escapeHTML(t.id)}" ${t.previewUrl ? "" : "disabled"}><span>${i + 1}</span><span><b>${escapeHTML(t.title)}</b><small>${t.previewUrl ? "Aperçu Apple Music" : "Aperçu indisponible"}</small></span>${t.duration ? `<small>${mediaTime(t.duration)}</small>` : ""}</button>`).join("");
}
function renderAppleAlbum(key = "kairos") {
  if (!APPLE_MUSIC_CATALOG[key]) return;
  if (key === "kairos") return renderMusic("album");
  const item = APPLE_MUSIC_CATALOG[key],
    meta = appleMetadataState.catalog[key];
  openApp(
    `<section class="music-app apple-local-album">${nav("Bibliothèque")}${appleArtworkHTML(key)}<h1 data-apple-title="${key}">${escapeHTML(meta?.title || item.title)}</h1><p data-apple-artist="${key}">${escapeHTML(meta?.artist || item.artist || "")}</p><div class="album-actions"><button data-catalog-play="${key}">${icon("play")} Lecture</button></div><div data-catalog-tracks="${key}">${appleCatalogTrackRows(key)}</div><button class="apple-full-link" data-official-embed="apple" data-content="${key}">Ouvrir le lecteur Apple Music</button>${miniPlayer()}</section>`,
  );
}
function renderPreviewPlayer(id) {
  const t = ALBUM_TRACKS.find((t) => t.id === id);
  if (!t?.src) return;
  audioManager.load(t);
  openApp(
    `<div class="audio-player">${nav(t.title)}<img class="audio-cover" src="${KAIROS_COVER}" alt="Cover KAIROS"><h2>${t.title}</h2><p>Paapii & Manii</p>${playerControls()}<p class="preview-credit">Aperçu Apple Music</p><button class="apple-full-link" data-official-embed="apple">Ouvrir le lecteur Apple Music</button></div>`,
  );
}
