
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const intro=$('#intro'),phoneScene=$('#phoneScene'),lock=$('#lock'),home=$('#home'),appView=$('#appView'),appContent=$('#appContent'),device=$('#device'),statusBar=$('#statusBar'),modal=$('#modal'),toastEl=$('#toast'),screen=$('.screen');
let routeStack=[],callTimer=null,callHandled=false,callStartedAt=0,callInterval=null;
const ALBUM_URL='https://album.link/qzsdrsh5r3m8j';
const AUDIO={abeg:'assets/audio/abeg.wav',tout:'assets/audio/tout_gacher.wav',call:'assets/audio/call-0243.wav'};
const GALLERY=[
  'assets/images/manii-01.jpg','assets/images/manii-02.jpg','assets/images/duo-01.jpg','assets/images/paapii-01.jpg',
  'assets/images/lockscreen-cicatrices.png','assets/images/IMG_2207-2.png','assets/images/gallery-studio.jpg','assets/images/gallery-kid.jpg',
  'assets/images/gallery-cat.jpg','assets/images/gallery-track-1.png','assets/images/gallery-track-2.png','assets/images/gallery-track-3.png',
  'assets/images/gallery-track-4.png','assets/images/gallery-track-5.png','assets/images/home-wallpaper.jpg'
];

const IMessageThreads={
  paapii:{name:'Paapii',avatar:'assets/images/paapii-01.jpg',preview:'le code c’est tjrs le même ?',offset:7,messages:[
    ['them','t’as gardé le bounce d’abeg ?'],['me','ouais dans Fichiers'],['them','le code c’est tjrs le même ?'],['me','j’ai oublié mdrr'],['them','la date du projet'],['me','29/10 ?'],['them','retourne-la.']
  ]},
  corentin:{name:'Corentin',avatar:'assets/images/gallery-kid.jpg',preview:'planning validé ✅',offset:29,messages:[
    ['them','planning validé ✅'],['me','parfait'],['them','on garde les deux exclus hors du dossier public'],['me','oui'],['them','je fais le point demain avec vous deux']
  ]},
  yoan:{name:'Yoan — Zénithal',avatar:'assets/images/gallery-studio.jpg',preview:'je vous renvoie les exports',offset:74,messages:[
    ['them','je vous renvoie les exports'],['me','lourd merci'],['them','j’ai aussi gardé quelques photos du shooting'],['me','mets-les dans le tel']
  ]},
  redka:{name:'Redka',avatar:'assets/images/gallery-cat.jpg',preview:'le bounce est propre',offset:106,messages:[
    ['them','le bounce est propre'],['me','ça marche'],['them','j’ai juste resserré l’intro'],['me','parfait']
  ]}
};
const WAThreads={
  paapii:{name:'Paapii',avatar:'assets/images/paapii-01.jpg',preview:'j’ai retrouvé le mix',offset:4,unread:1,messages:[
    ['them','frérot'],['them','j’ai retrouvé le mix qu’on devait pas mettre dans le dossier'],['me','tout gâcher ?'],['them','oui'],['audio','tout_gacher.wav'],['me','le mdp ?'],['them','4 lettres. c’est littéralement le thème du projet 💀']
  ]},
  kairos:{name:'KAIROS',avatar:'assets/images/duo-01.jpg',preview:'Corentin : planning validé ✅',offset:27,messages:[['them','Corentin : planning validé ✅'],['me','on est bons'],['them','Yoan : je vous renvoie les exports ce soir']]},
  corentin:{name:'Corentin',avatar:'assets/images/gallery-kid.jpg',preview:'on fait le point demain',offset:59,messages:[['them','on fait le point demain'],['me','ça marche'],['them','je vous envoie la dernière checklist avant midi']]},
  yoan:{name:'Yoan',avatar:'assets/images/gallery-studio.jpg',preview:'je vous renvoie les exports',offset:121,messages:[['them','je vous renvoie les exports'],['me','merci frère'],['them','les selects photo aussi']]}
};

function pad(n){return String(n).padStart(2,'0')}
function clock(offset=0){const d=new Date(Date.now()-offset*60000);return `${pad(d.getHours())}:${pad(d.getMinutes())}`}
function syncClock(){
  const d=new Date(),time=`${pad(d.getHours())}:${pad(d.getMinutes())}`;
  $('#statusTime').textContent=time; $('#lockTime').textContent=time;
  const days=['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'],months=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  $('#lockDate').textContent=`${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
  const cal=$('#calendarDay'); if(cal)cal.textContent=d.getDate();
}
syncClock();setInterval(syncClock,10000);
if(navigator.getBattery){navigator.getBattery().then(b=>{const update=()=>$('#batteryLevel').textContent=Math.round(b.level*100);update();b.addEventListener('levelchange',update)}).catch(()=>{})}

function icon(name){
  const paths={
    video:'<rect x="2" y="5" width="14" height="14" rx="3"/><path d="M16 9l6-3v12l-6-3z"/>',
    phone:'<path d="M6.6 2.7l3.1 3.1-2 3.2c1.8 3.3 4.1 5.6 7.4 7.4l3.1-2 3.1 3.1-2.1 3.5c-.6 1-1.7 1.5-2.9 1.2C8.6 20.4 3.6 15.4 1.8 7.7 1.5 6.5 2 5.4 3 4.8z"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 7h.01"/>',
    compose:'<path d="M4 20l4.5-1 10-10-3.5-3.5-10 10L4 20zM14 6l3.5 3.5M13 20h7"/>',
    search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    camera:'<path d="M4 7h3l1.5-2h7L17 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"/><circle cx="12" cy="13" r="4"/>',
    back:'<path d="M15 5l-7 7 7 7"/>',
    play:'<path d="M8 5l11 7-11 7z"/>',
    recent:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    contacts:'<circle cx="12" cy="8" r="3"/><path d="M6 20c.5-4 2.5-6 6-6s5.5 2 6 6"/>',
    keypad:'<path d="M7 6h.01M12 6h.01M17 6h.01M7 11h.01M12 11h.01M17 11h.01M7 16h.01M12 16h.01M17 16h.01"/>',
    star:'<path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
    voicemail:'<circle cx="7" cy="12" r="4"/><circle cx="17" cy="12" r="4"/><path d="M7 16h10"/>',
    flash:'<path d="M13 2L5 14h6l-1 8 8-12h-6z"/>',
    rotate:'<path d="M20 7v5h-5M4 17v-5h5M18 12a7 7 0 0 0-12-4M6 12a7 7 0 0 0 12 4"/>'
  };
  return `<svg class="ui" viewBox="0 0 24 24" aria-hidden="true">${paths[name]||''}</svg>`;
}
function setStatus(dark=false){statusBar.className='status-bar '+(dark?'dark-status':'light-status');device.classList.toggle('dark-ui',dark)}
function show(v){$$('.view').forEach(x=>x.classList.remove('active-view'));v.classList.add('active-view')}
function goHome(){routeStack=[];setStatus(true);show(home);appContent.innerHTML=''}
function openApp(html,{dark=false,push=true}={}){if(push&&appContent.innerHTML)routeStack.push(appContent.innerHTML);setStatus(dark);appContent.innerHTML=html;show(appView);bindDynamic()}
function goBack(){if(routeStack.length){appContent.innerHTML=routeStack.pop();bindDynamic()}else goHome()}
function toast(msg,ms=1700){toastEl.textContent=msg;toastEl.classList.remove('hidden');clearTimeout(toast._t);toast._t=setTimeout(()=>toastEl.classList.add('hidden'),ms)}
function escapeHTML(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function avatarHTML(src,name=''){return src?`<img class="avatar" src="${src}" alt="">`:`<span class="avatar initial">${escapeHTML(name[0]||'?')}</span>`}
function nav(title,right=''){return `<div class="ios-nav"><button class="back" data-app-back>${icon('back')}</button><h2>${title}</h2><button class="action">${right}</button></div>`}

/* MESSAGES */
function renderMessages(){
  const rows=Object.entries(IMessageThreads).map(([id,t],i)=>`<div class="row" data-msg-thread="${id}">${avatarHTML(t.avatar,t.name)}<div class="row-copy"><b>${t.name}</b><span>${i===0?'<span class="blue-dot"></span> ':''}${t.preview}</span></div><div class="row-meta">${clock(t.offset)}</div></div>`).join('');
  openApp(`<div class="messages-app">
    <div class="messages-toolbar"><span class="filters">Filtres</span><h1>Messages</h1><button class="compose-glass">${icon('compose')}</button></div>
    <div class="list">${rows}</div>
    <div class="messages-bottom-search">${icon('search')}<span>Rechercher</span></div>
  </div>`);
}
function renderMessageThread(id){
  const t=IMessageThreads[id];if(!t)return;
  const base=t.offset+t.messages.length;
  const msgs=t.messages.map((m,i)=>`${i===0?`<div class="time-label">Aujourd’hui ${clock(base)}</div>`:''}<div class="bubble-line ${m[0]==='me'?'me':'them'}"><div class="bubble">${escapeHTML(m[1])}</div></div>`).join('');
  openApp(`<div class="thread-wrap">
    <div class="thread-head">
      <button class="back" data-app-back>${icon('back')}</button>
      <div class="thread-person">${avatarHTML(t.avatar,t.name)}<b>${t.name} ›</b></div>
      <div class="thread-tools"><button class="icon-glass">${icon('video')}</button><button class="icon-glass">${icon('phone')}</button></div>
    </div>
    <div class="bubble-area">${msgs}</div>
    <div class="imessage-compose"><button>${icon('plus')}</button><div class="field">iMessage</div><button>${icon('mic')}</button></div>
  </div>`);
}

/* WHATSAPP */
function renderWhatsApp(){
  const order=['paapii','kairos','corentin','yoan'];
  const rows=order.map(id=>{const t=WAThreads[id];return `<div class="row wa-row" data-wa-thread="${id}">${avatarHTML(t.avatar,t.name)}<div class="row-copy"><b>${t.name}</b><span>${id==='kairos'?'<span class="checks">✓✓</span> ':''}${t.preview}</span></div><div class="row-meta">${clock(t.offset)}${t.unread?`<span class="green-badge">${t.unread}</span>`:''}</div></div>`}).join('');
  openApp(`<div class="wa-app">
    <div class="wa-top"><span class="edit">Modifier</span><h1>Discussions</h1><div class="wa-top-actions"><button class="icon-glass">${icon('camera')}</button><button class="icon-glass">${icon('plus')}</button></div></div>
    <div class="wa-search">${icon('search')} &nbsp; Rechercher</div>
    <div class="chip-row"><span class="chip active">Toutes</span><span class="chip">Non lues 1</span><span class="chip">Favoris</span><span class="chip">Groupes 1</span></div>
    <div class="list">${rows}</div>
  </div>`);
}
function wave(){return Array.from({length:24},()=>'<i></i>').join('')}
function renderWAThread(id){
  const t=WAThreads[id];if(!t)return;
  const base=t.offset+t.messages.length*2;
  const msgs=t.messages.map((m,i)=>{
    const tm=clock(Math.max(0,base-i*2));
    if(m[0]==='audio')return `<div class="wa-bubble-line me"><div class="wa-bubble"><div class="wa-audio-card" data-audio-lock="tout"><button class="wa-play">${icon('play')}</button><div><div class="wa-wave">${wave()}</div><div class="wa-audio-meta">0:07</div></div>${avatarHTML(t.avatar,t.name)}</div><small>${tm} <span class="bluechecks">✓✓</span></small></div></div>`;
    return `<div class="wa-bubble-line ${m[0]==='me'?'me':'them'}"><div class="wa-bubble">${escapeHTML(m[1])}<small>${tm}${m[0]==='me'?' <span class="bluechecks">✓✓</span>':''}</small></div></div>`
  }).join('');
  openApp(`<div class="wa-thread">
    <div class="wa-thread-head">
      <button class="back" data-app-back>${icon('back')}</button>${avatarHTML(t.avatar,t.name)}
      <div><b>${t.name}</b><small>en ligne</small></div>
      <div class="wa-thread-tools"><button class="icon-glass">${icon('video')}</button><button class="icon-glass">${icon('phone')}</button></div>
    </div>
    <div class="wa-chat"><div class="wa-day">Aujourd’hui</div><div class="wa-encryption">🔒 Les messages et les appels sont chiffrés de bout en bout.</div>${msgs}</div>
    <div class="wa-input"><button>${icon('plus')}</button><div class="field">Message</div><button>${icon('camera')}</button><button class="wa-mic">${icon('mic')}</button></div>
  </div>`);
}

/* FILES + AUDIO */
function renderFiles(){openApp(`<div class="files-app">${nav('Récents','•••')}<h1 class="section-title">Fichiers</h1><div class="files-block">
  <div class="file-row" data-file="abeg"><span class="ficon">🎵</span><div><b>ABEG_MASTER.wav</b><span>Audio · protégé</span></div><span class="chev">›</span></div>
  <div class="file-row"><span class="ficon">📁</span><div><b>Exports shooting</b><span>8 éléments</span></div><span class="chev">›</span></div>
  <div class="file-row"><span class="ficon">📄</span><div><b>TRACKLIST_FINAL.pdf</b><span>PDF · 29 oct.</span></div><span class="chev">›</span></div>
</div></div>`)}

function renderFileLock(kind){
  const cfg=kind==='abeg'?{title:'ABEG_MASTER.wav',hint:'Code à 4 chiffres',code:'1029'}:{title:'tout_gacher.wav',hint:'Mot de passe · 4 lettres',code:'TIME'};
  openApp(`<div class="lock-file">${nav(cfg.title)}<div class="file-card"><div style="font-size:42px">🔒</div><h3>Fichier protégé</h3><p>${cfg.hint}</p><div class="code-input"><input id="codeField" maxlength="4" placeholder="••••"><button data-unlock="${kind}" data-code="${cfg.code}">Déverrouiller</button></div></div></div>`);
}
function renderAudio(kind){
  const cfg=kind==='abeg'?{title:'ABEG',file:'ABEG_MASTER.wav',src:AUDIO.abeg,cover:'assets/images/duo-01.jpg'}:{title:'Tout gâcher',file:'tout_gacher.wav',src:AUDIO.tout,cover:'assets/images/gallery-track-2.png'};
  openApp(`<div class="audio-player">${nav(cfg.title)}<img class="audio-cover" src="${cfg.cover}"><h3>Manii & Paapii</h3><p>${cfg.file}</p><div class="progress"><i id="audioProgress"></i></div><div class="controls"><button data-skip="-10">−10</button><button class="play" id="audioPlay">▶</button><button data-skip="10">+10</button></div><audio id="secretAudio" src="${cfg.src}" preload="metadata"></audio></div>`);
  setTimeout(bindPlayer,0);
}
function bindPlayer(){
  const a=$('#secretAudio'),p=$('#audioPlay'),bar=$('#audioProgress');if(!a||!p)return;
  p.onclick=()=>{if(a.paused){a.play();p.textContent='Ⅱ'}else{a.pause();p.textContent='▶'}};
  $$('[data-skip]').forEach(b=>b.onclick=()=>a.currentTime=Math.max(0,Math.min(a.duration||0,a.currentTime+Number(b.dataset.skip))));
  a.ontimeupdate=()=>bar.style.width=`${a.duration?(a.currentTime/a.duration)*100:0}%`;a.onended=()=>p.textContent='▶';
}

/* OTHER APPS */
function renderPhotos(){
  const imgs=GALLERY.map((src,i)=>`<img src="${src}" data-photo-index="${i}" onerror="this.style.display='none'">`).join('');
  openApp(`<div class="photos-app"><div class="photo-toolbar"><h1>Photothèque</h1><div style="color:#777;margin-top:3px">Toutes les photos</div></div><div class="gallery-grid">${imgs}</div><div id="photoViewer" class="photo-viewer"><div class="viewer-top"><button data-close-photo>‹</button><span>Aujourd’hui</span><span>•••</span></div><img id="viewerImg"></div></div>`);
}
function renderNotes(){openApp(`<div class="notes-app">${nav('Notes','•••')}<h1 class="notes-title">Notes</h1><div class="note-card"><b>KAIROS</b><p>Le temps ne prévient pas. Il passe. Le bon moment n’est pas forcément celui qu’on avait prévu.</p></div><div class="note-card"><b>À ne pas oublier</b><p>ABEG — garder la master dans Fichiers.<br>Tout gâcher — envoyé sur WhatsApp.<br>02:43.</p></div><div class="note-card"><b>Tracklist</b><p>Kairos · God Bless · Boulot · Bandite · Vincent Kompany · Interlude · Tu sais · LPB</p></div></div>`)}
function renderCamera(){openApp(`<div class="camera-app"><video src="assets/video/camera.mp4" muted autoplay loop playsinline></video><div class="camera-ui"><div class="cam-glass-row"><span class="cam-glass">${icon('flash')}</span><span class="cam-glass">⌃</span><span class="cam-glass">◉</span></div><div><div class="cam-modes"><span>CINÉMATIQUE</span><span>VIDÉO</span><b>PHOTO</b><span>PORTRAIT</span></div><div class="cam-bottom"><span class="thumb"></span><button class="shutter"></button><span class="flipbtn">${icon('rotate')}</span></div></div></div></div>`,{dark:true})}
function renderSettings(){openApp(`<div class="settings-app">${nav('Réglages')}<h1>Réglages</h1><div class="setting-card"><div class="setting-row"><span>Mode Avion</span><span>Non</span></div><div class="setting-row"><span>Wi‑Fi</span><span>Connecté</span></div><div class="setting-row"><span>Bluetooth</span><span>Activé</span></div><div class="setting-row"><span>Données cellulaires</span><span>5G</span></div></div><div class="setting-card"><div class="setting-row"><span>Général</span><span>›</span></div><div class="setting-row"><span>Fond d’écran</span><span>›</span></div><div class="setting-row"><span>Face ID et code</span><span>›</span></div></div></div>`)}
function renderSpotify(){const tracks=['KAIROS','GOD BLESS','BOULOT','BANDITE','VINCENT KOMPANY','INTERLUDE','TU SAIS','LPB'];openApp(`<div class="spotify-app"><div class="spotify-hero"><img src="assets/images/gallery-track-1.png"><h1>KAIROS</h1><p>Manii & Paapii · Album · 2026</p></div><div class="spot-actions"><button class="spot-play">▶</button></div>${tracks.map((t,i)=>`<div class="spot-track"><span>${i+1}</span><div><b>${t}</b><small>Manii & Paapii</small></div><span>•••</span></div>`).join('')}</div>`,{dark:true})}
function renderCalendar(){openApp(`<div class="calendar-app">${nav('Calendrier')}<h1 class="section-title">Novembre</h1><div class="calendar-event"><div class="datebadge">29</div><h3>KAIROS — sortie album</h3><p>Manii & Paapii · Toutes les plateformes</p><div style="clear:both"></div></div><div class="calendar-event"><div class="datebadge">5</div><h3>Archives KAIROS</h3><p>Vérifier les fichiers récupérés.</p><div style="clear:both"></div></div></div>`)}
function renderFaceTime(){const people=[['Paapii','appel vidéo',6],['Corentin','appel FaceTime',38],['Yoan','appel vidéo',83]];openApp(`<div class="facetime-app">${nav('FaceTime','＋')}<h1 class="section-title">FaceTime</h1><div class="list">${people.map((p,i)=>`<div class="row">${avatarHTML(i===0?'assets/images/paapii-01.jpg':i===1?'assets/images/gallery-kid.jpg':'assets/images/gallery-studio.jpg',p[0])}<div class="row-copy"><b>${p[0]}</b><span>${p[1]}</span></div><div class="row-meta">${clock(p[2])} ${icon('video')}</div></div>`).join('')}</div></div>`)}

/* PHONE + CALL */
function renderPhone(){
  const calls=[['Paapii','mobile',12],['Corentin','mobile',31],['Numéro inconnu','appel manqué',46],['Yoan','mobile',180]];
  openApp(`<div class="phone-app">${nav('Récents','Modifier')}<h1 class="section-title">Récents</h1><div class="list">${calls.map((r,i)=>`<div class="row">${avatarHTML('',r[0])}<div class="row-copy"><b style="${i===2?'color:#ff3b30':''}">${r[0]}</b><span>${r[1]}</span></div><div class="row-meta">${clock(r[2])} ⓘ</div></div>`).join('')}</div><div class="phone-tabs">
    <span class="phone-tab">${icon('star')}<small>Favoris</small></span><span class="phone-tab active">${icon('recent')}<small>Récents</small></span><span class="phone-tab">${icon('contacts')}<small>Contacts</small></span><span class="phone-tab">${icon('keypad')}<small>Clavier</small></span><span class="phone-tab">${icon('voicemail')}<small>Messagerie</small></span>
  </div></div>`)
}
function scheduleIncomingCall(){clearTimeout(callTimer);if(callHandled)return;callTimer=setTimeout(()=>{if(!callHandled)triggerIncomingCall()},45000)}
function triggerIncomingCall(){
  if(callHandled)return;
  if(!modal.classList.contains('hidden')&&!modal.classList.contains('call-modal')){callTimer=setTimeout(triggerIncomingCall,10000);return}
  modal.className='modal call-modal';
  modal.innerHTML=`<div class="call-screen"><div class="call-head"><small>appel entrant</small><h2>Numéro inconnu</h2><p>peut-être : KAIROS</p></div><div class="call-actions"><button class="call-action decline" data-call-decline><span class="call-circle">${icon('phone')}</span><span>Refuser</span></button><button class="call-action accept" data-call-accept><span class="call-circle">${icon('phone')}</span><span>Accepter</span></button></div></div>`;
  bindDynamic();
}
function acceptCall(){
  callHandled=true;clearTimeout(callTimer);callStartedAt=Date.now();
  modal.innerHTML=`<div class="call-screen"><div class="call-head"><small id="callDuration">00:00</small><h2>Numéro inconnu</h2><p>peut-être : KAIROS</p></div><div class="active-call-actions"><span class="call-action"><span class="call-circle">${icon('mic')}</span><span>silence</span></span><span class="call-action"><span class="call-circle">${icon('keypad')}</span><span>clavier</span></span><span class="call-action"><span class="call-circle">◖</span><span>haut-parleur</span></span></div><button class="hangup" data-call-hangup>${icon('phone')}</button><audio id="callAudio" src="${AUDIO.call}" preload="auto"></audio></div>`;
  const a=$('#callAudio');a.play().catch(()=>{});a.onended=endCall;
  clearInterval(callInterval);callInterval=setInterval(()=>{const s=Math.floor((Date.now()-callStartedAt)/1000),el=$('#callDuration');if(el)el.textContent=`${pad(Math.floor(s/60))}:${pad(s%60)}`},1000);
  bindDynamic();
}
function endCall(){clearInterval(callInterval);const a=$('#callAudio');if(a){a.pause();a.currentTime=0}modal.className='modal hidden';modal.innerHTML='';toast('Appel terminé')}
function declineCall(){callHandled=true;clearTimeout(callTimer);modal.className='modal hidden';modal.innerHTML='';toast('Appel refusé')}

/* screenshot apps */
function screenshotApp(src,hotspots=[],dark=false){const spots=hotspots.map(h=>`<button class="hotspot" data-hot="${h.action}" style="left:${h.left}%;top:${h.top}%;width:${h.width}%;height:${h.height}%"></button>`).join('');openApp(`<div class="screen-shot-app"><img class="full-shot" src="${src}">${spots}</div>`,{dark})}
function renderInstagram(state='manii-profile'){
  const map={
    'manii-profile':['assets/images/insta-manii-profile.webp',[{action:'insta-manii-following',left:67,top:16,width:29,height:17}]],
    'manii-following':['assets/images/insta-manii-following.webp',[{action:'insta-manii-profile',left:0,top:0,width:18,height:10},{action:'insta-paapii-profile',left:0,top:34,width:100,height:14}]],
    'paapii-profile':['assets/images/insta-paapii-profile.webp',[{action:'insta-manii-following',left:0,top:0,width:18,height:10},{action:'insta-paapii-following',left:67,top:13,width:28,height:16}]],
    'paapii-following':['assets/images/insta-paapii-following.webp',[{action:'insta-paapii-profile',left:0,top:0,width:18,height:10},{action:'insta-manii-profile',left:0,top:13,width:100,height:13}]]
  };const [src,hs]=map[state];screenshotApp(src,hs,false)
}
function renderMusic(state='library'){if(state==='album')screenshotApp('assets/images/apple-kairos.webp',[{action:'music-library',left:0,top:0,width:20,height:12}],true);else screenshotApp('assets/images/apple-library.webp',[{action:'music-album',left:0,top:36,width:52,height:24}],false)}

/* PASSWORD MODAL */
function showPassword(kind){
  const expected=kind==='abeg'?'1029':'TIME';
  modal.className='modal';
  modal.innerHTML=`<div class="modal-card"><h3>${kind==='abeg'?'ABEG_MASTER.wav':'tout_gacher.wav'}</h3><p>${kind==='abeg'?'Code à 4 chiffres':'Mot de passe à 4 lettres'}</p><input id="modalCode" maxlength="4" autofocus><div class="modal-actions"><button class="cancel" data-modal-close>Annuler</button><button class="ok" data-modal-ok="${kind}" data-code="${expected}">Ouvrir</button></div></div>`;
  setTimeout(()=>$('#modalCode')?.focus(),50);bindDynamic()
}
function closeModal(){modal.className='modal hidden';modal.innerHTML=''}

function bindDynamic(){
  $$('[data-app-back]').forEach(b=>b.onclick=goBack);
  $$('[data-msg-thread]').forEach(b=>b.onclick=()=>renderMessageThread(b.dataset.msgThread));
  $$('[data-wa-thread]').forEach(b=>b.onclick=()=>renderWAThread(b.dataset.waThread));
  $$('[data-file="abeg"]').forEach(b=>b.onclick=()=>renderFileLock('abeg'));
  $$('[data-unlock]').forEach(b=>b.onclick=()=>{const v=$('#codeField')?.value.trim().toUpperCase();if(v===b.dataset.code)renderAudio(b.dataset.unlock);else toast('Code incorrect')});
  $$('[data-audio-lock]').forEach(b=>b.onclick=()=>showPassword(b.dataset.audioLock));
  $$('[data-modal-close]').forEach(b=>b.onclick=closeModal);
  $$('[data-modal-ok]').forEach(b=>b.onclick=()=>{const v=$('#modalCode')?.value.trim().toUpperCase();if(v===b.dataset.code){const k=b.dataset.modalOk;closeModal();renderAudio(k)}else toast('Mot de passe incorrect')});
  $$('[data-photo-index]').forEach(img=>img.onclick=()=>{const v=$('#photoViewer'),vi=$('#viewerImg');vi.src=GALLERY[Number(img.dataset.photoIndex)];v.classList.add('open')});
  $$('[data-close-photo]').forEach(b=>b.onclick=()=>$('#photoViewer')?.classList.remove('open'));
  $$('[data-hot]').forEach(b=>b.onclick=()=>{const a=b.dataset.hot;
    if(a==='insta-manii-following')renderInstagram('manii-following'); if(a==='insta-paapii-profile')renderInstagram('paapii-profile');
    if(a==='insta-paapii-following')renderInstagram('paapii-following'); if(a==='insta-manii-profile')renderInstagram('manii-profile');
    if(a==='music-album')renderMusic('album'); if(a==='music-library')renderMusic('library');
  });
  $$('[data-call-decline]').forEach(b=>b.onclick=declineCall);$$('[data-call-accept]').forEach(b=>b.onclick=acceptCall);$$('[data-call-hangup]').forEach(b=>b.onclick=endCall);
}
function route(name){
  if(name==='messages')return renderMessages();if(name==='photos')return renderPhotos();if(name==='notes')return renderNotes();if(name==='files')return renderFiles();
  if(name==='camera')return renderCamera();if(name==='music')return renderMusic();if(name==='whatsapp')return renderWhatsApp();if(name==='spotify')return renderSpotify();
  if(name==='instagram')return renderInstagram();if(name==='settings')return renderSettings();if(name==='calendar')return renderCalendar();if(name==='facetime')return renderFaceTime();
  if(name==='phone'){if(!callHandled)return triggerIncomingCall();return renderPhone()}
  if(name==='safari'){window.open(ALBUM_URL,'_blank','noopener')}
}

/* BOOT + GESTURES */
$('#enterBtn').onclick=()=>{intro.classList.remove('active');phoneScene.classList.add('active');setStatus(true);show(lock)};
$('#unlockBtn').onclick=()=>{goHome();scheduleIncomingCall()};
$('#homeIndicator').onclick=goHome;
let homeGestureY=null;
$('#homeIndicator').addEventListener('pointerdown',e=>homeGestureY=e.clientY);
$('#homeIndicator').addEventListener('pointerup',e=>{if(homeGestureY!==null&&homeGestureY-e.clientY>18)goHome();homeGestureY=null});
document.addEventListener('click',e=>{const b=e.target.closest('[data-route]');if(b){if(lock.classList.contains('active-view'))scheduleIncomingCall();route(b.dataset.route)}});

let gesture=null;
lock.addEventListener('pointerdown',e=>gesture={x:e.clientX,y:e.clientY});
lock.addEventListener('pointerup',e=>{if(gesture&&gesture.y-e.clientY>55){goHome();scheduleIncomingCall()}gesture=null});
appView.addEventListener('pointerdown',e=>gesture={x:e.clientX,y:e.clientY});
appView.addEventListener('pointerup',e=>{
  if(!gesture)return;const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
  if(gesture.x<45&&dx>70&&Math.abs(dy)<80)goBack();
  else if(gesture.y>screen.getBoundingClientRect().bottom-120&&dy<-65)goHome();
  gesture=null;
});
