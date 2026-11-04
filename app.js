const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const intro=$('#intro'), phoneScene=$('#phoneScene'), lock=$('#lock'), home=$('#home'), appView=$('#appView'), appContent=$('#appContent'), device=$('#device'), statusBar=$('#statusBar'), modal=$('#modal'), toastEl=$('#toast');
let routeStack=[];

const ALBUM_URL='https://album.link/qzsdrsh5r3m8j';
const AUDIO={abeg:'assets/audio/abeg.wav',tout:'assets/audio/tout_gacher.wav'};
const GALLERY=[
  'assets/images/manii-01.jpg','assets/images/manii-02.jpg','assets/images/duo-01.jpg','assets/images/paapii-01.jpg','assets/images/lockscreen-cicatrices.png','assets/images/IMG_2207-2.png',
  'assets/images/gallery-studio.jpg','assets/images/gallery-kid.jpg','assets/images/gallery-cat.jpg','assets/images/gallery-track-1.png','assets/images/gallery-track-2.png','assets/images/gallery-track-3.png','assets/images/gallery-track-4.png','assets/images/gallery-track-5.png'
];

const IMessageThreads={
  paapii:{name:'Paapii',avatar:'assets/images/paapii-01.jpg',preview:'le code c’est tjrs le même ?',time:'23:41',messages:[
    ['them','t’as gardé le bounce d’abeg ?'],['me','ouais dans fichiers'],['them','le code c’est tjrs le même ?'],['me','j’ai oublié mdrr'],['them','la date du projet'],['me','29/10 ?'],['them','retourne-la.']
  ]},
  corentin:{name:'Corentin',avatar:'assets/images/gallery-kid.jpg',preview:'planning validé ✅',time:'22:18',messages:[
    ['them','planning validé ✅'],['me','parfait'],['them','on garde les deux exclus hors du dossier public'],['me','oui'],['them','je fais le point demain avec vous deux']
  ]},
  yoan:{name:'Yoan — Zénithal',avatar:'assets/images/gallery-studio.jpg',preview:'je vous renvoie les exports',time:'19:06',messages:[
    ['them','je vous renvoie les exports'],['me','lourd merci'],['them','j’ai aussi gardé quelques photos du shooting'],['me','mets-les dans le tel']
  ]},
  redka:{name:'Redka',avatar:'assets/images/gallery-cat.jpg',preview:'le bounce est propre',time:'18:42',messages:[
    ['them','le bounce est propre'],['me','ça marche'],['them','j’ai juste resserré l’intro'],['me','parfait']
  ]}
};

const WAThreads={
  paapii:{name:'Paapii',avatar:'assets/images/paapii-01.jpg',preview:'j’ai retrouvé le mix',time:'23:48',unread:1,messages:[
    ['them','frérot'],['them','j’ai retrouvé le mix qu’on devait pas mettre dans le dossier'],['me','tout gâcher ?'],['them','oui'],['audio','tout_gacher.wav'],['me','le mdp ?'],['them','4 lettres. c’est littéralement le thème du projet 💀']
  ]},
  kairos:{name:'KAIROS',avatar:'assets/images/duo-01.jpg',preview:'Corentin : planning validé ✅',time:'22:41',messages:[['them','Corentin : planning validé ✅'],['me','on est bons'],['them','Yoan : je vous renvoie les exports ce soir']]},
  corentin:{name:'Corentin',avatar:'assets/images/gallery-kid.jpg',preview:'on fait le point demain',time:'18:12',messages:[['them','on fait le point demain'],['me','ça marche'],['them','je vous envoie la dernière checklist avant midi']]},
  yoan:{name:'Yoan',avatar:'assets/images/gallery-studio.jpg',preview:'je vous renvoie les exports',time:'17:06',messages:[['them','je vous renvoie les exports'],['me','merci frère'],['them','les selects photo aussi']]}
};

function pad(n){return String(n).padStart(2,'0')}
function syncClock(){
  const d=new Date();
  const time=`${pad(d.getHours())}:${pad(d.getMinutes())}`;
  $('#statusTime').textContent=time;
  $('#lockTime').textContent=time;
  const days=['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const months=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  $('#lockDate').textContent=`${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}
setInterval(syncClock,15000); syncClock();

function setStatus(dark=false){statusBar.className='status-bar '+(dark?'dark-status':'light-status');device.classList.toggle('dark-ui',dark)}
function show(v){$$('.view').forEach(x=>x.classList.remove('active-view'));v.classList.add('active-view')}
function goHome(){routeStack=[];setStatus(false);show(home);appContent.innerHTML=''}
function openApp(html,{dark=false,push=true}={}){if(push) routeStack.push(appContent.innerHTML);setStatus(dark);appContent.innerHTML=html;show(appView);bindDynamic()}
function toast(msg,ms=1700){toastEl.textContent=msg;toastEl.classList.remove('hidden');clearTimeout(toast._t);toast._t=setTimeout(()=>toastEl.classList.add('hidden'),ms)}
function escapeHTML(s=''){return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function avatarHTML(src,name=''){return src?`<img class="avatar" src="${src}" alt="">`:`<span class="avatar initial">${escapeHTML(name[0]||'?')}</span>`}

function nav(title,right=''){return `<div class="ios-nav"><button class="back" data-app-back>‹</button><h2>${title}</h2><button class="action">${right}</button></div>`}

function renderMessages(){
  const rows=Object.entries(IMessageThreads).map(([id,t],i)=>`<div class="row" data-msg-thread="${id}">${avatarHTML(t.avatar,t.name)}<div class="row-copy"><b>${t.name}</b><span>${i===0?'<span class="blue-dot"></span> ':''}${t.preview}</span></div><div class="row-meta">${t.time}</div></div>`).join('');
  openApp(`<div class="messages-app"><div class="messages-nav"><h1>Messages</h1><button class="round-action">✎</button></div><div class="search-box">⌕ Rechercher</div><div class="list">${rows}</div></div>`);
}
function renderMessageThread(id){
  const t=IMessageThreads[id]; if(!t)return;
  const msgs=t.messages.map((m,i)=>`${i===0?'<div class="time-label">Aujourd’hui '+t.time+'</div>':''}<div class="bubble-line ${m[0]==='me'?'me':'them'}"><div class="bubble">${escapeHTML(m[1])}</div></div>`).join('');
  openApp(`<div class="thread-wrap"><div class="thread-head"><button class="back" data-app-back>‹</button><div class="thread-person">${avatarHTML(t.avatar,t.name)}<b>${t.name} ›</b></div><div class="info">ⓘ</div></div><div class="bubble-area">${msgs}</div><div class="compose"><i>＋</i><div class="compose-box">iMessage</div><i>🎙</i></div></div>`);
}

function renderWhatsApp(){
  const order=['paapii','kairos','corentin','yoan'];
  const rows=order.map(id=>{const t=WAThreads[id];return `<div class="row wa-row" data-wa-thread="${id}">${avatarHTML(t.avatar,t.name)}<div class="row-copy wa-preview"><b>${t.name}</b><span>${id==='kairos'?'<span class="checks">✓✓</span> ':''}${t.preview}</span></div><div class="row-meta">${t.time}${t.unread?`<span class="green-badge">${t.unread}</span>`:''}</div></div>`}).join('');
  openApp(`<div class="wa-app"><div class="wa-top"><span style="color:#007aff">Modifier</span><h1>Discussions</h1><div class="wa-actions">◉ ＋</div></div><div class="wa-search">⌕ Rechercher</div><div class="chip-row"><span class="chip active">Toutes</span><span class="chip">Non lues 1</span><span class="chip">Favoris</span><span class="chip">Groupes 1</span></div><div class="list">${rows}</div></div>`);
}
function wave(){return Array.from({length:18},()=>'<i></i>').join('')}
function renderWAThread(id){
  const t=WAThreads[id]; if(!t)return;
  const msgs=t.messages.map(m=>{
    if(m[0]==='audio')return `<div class="wa-bubble-line them"><div class="wa-bubble"><div class="wa-audio-card" data-audio-lock="tout"><span class="wa-play">▶</span><div><div class="wa-wave">${wave()}</div><div class="wa-audio-meta">${m[1]} · 2:14</div></div>${avatarHTML(t.avatar,t.name)}</div><small>23:51</small></div></div>`;
    return `<div class="wa-bubble-line ${m[0]==='me'?'me':'them'}"><div class="wa-bubble">${escapeHTML(m[1])}<small>${m[0]==='me'?'23:50 ✓✓':'23:49'}</small></div></div>`
  }).join('');
  openApp(`<div class="wa-thread"><div class="wa-thread-head"><button data-app-back>‹</button>${avatarHTML(t.avatar,t.name)}<div><b>${t.name}</b><small>en ligne</small></div><div class="tools">◉ ☎</div></div><div class="wa-chat">${msgs}</div><div class="wa-input"><div class="box">＋ &nbsp; Message</div><button class="wa-mic">🎙</button></div></div>`);
}

function renderFiles(){
  openApp(`<div class="files-app">${nav('Récents','•••')}<h1 class="section-title">Fichiers</h1><div class="files-block"><div class="file-row" data-file="abeg"><span class="ficon">🎵</span><div><b>ABEG_MASTER.wav</b><span>Audio · protégé</span></div><span class="chev">›</span></div><div class="file-row"><span class="ficon">📁</span><div><b>Exports shooting</b><span>8 éléments</span></div><span class="chev">›</span></div><div class="file-row"><span class="ficon">📄</span><div><b>TRACKLIST_FINAL.pdf</b><span>PDF · 29 oct.</span></div><span class="chev">›</span></div></div></div>`);
}
function renderFileLock(kind){
  const cfg=kind==='abeg'?{title:'ABEG_MASTER.wav',hint:'Code à 4 chiffres',code:'1029'}:{title:'tout_gacher.wav',hint:'Mot de passe · 4 lettres',code:'TIME'};
  openApp(`<div class="lock-file">${nav(cfg.title)}<div class="file-card"><div class="file-icon">🔒</div><h3>Fichier protégé</h3><p>${cfg.hint}</p><div class="code-input"><input id="codeField" inputmode="text" maxlength="4" placeholder="••••"><button data-unlock="${kind}" data-code="${cfg.code}">Déverrouiller</button></div></div></div>`);
}
function renderAudio(kind){
  const cfg=kind==='abeg'?{title:'ABEG',file:'ABEG_MASTER.wav',src:AUDIO.abeg,cover:'assets/images/duo-01.jpg'}:{title:'Tout gâcher',file:'tout_gacher.wav',src:AUDIO.tout,cover:'assets/images/gallery-track-2.png'};
  openApp(`<div class="audio-player">${nav(cfg.title)}<img class="audio-cover" src="${cfg.cover}" alt=""><h3>Manii & Paapii</h3><p>${cfg.file}</p><div class="progress"><i id="audioProgress"></i></div><div class="controls"><button data-skip="-10">−10</button><button class="play" id="audioPlay">▶</button><button data-skip="10">+10</button></div><audio id="secretAudio" src="${cfg.src}" preload="metadata"></audio></div>`,{dark:false});
  setTimeout(bindPlayer,0);
}
function bindPlayer(){
  const a=$('#secretAudio'),p=$('#audioPlay'),bar=$('#audioProgress');if(!a||!p)return;
  p.onclick=()=>{if(a.paused){a.play();p.textContent='Ⅱ'}else{a.pause();p.textContent='▶'}};
  $$('[data-skip]').forEach(b=>b.onclick=()=>{a.currentTime=Math.max(0,Math.min(a.duration||0,a.currentTime+Number(b.dataset.skip)))})
  a.ontimeupdate=()=>{bar.style.width=`${a.duration?(a.currentTime/a.duration)*100:0}%`};a.onended=()=>p.textContent='▶';
}

function renderPhotos(){
  const imgs=GALLERY.map((src,i)=>`<img src="${src}" data-photo-index="${i}" onerror="this.style.display='none'">`).join('');
  openApp(`<div class="photos-app"><div class="photo-toolbar"><h1>Photothèque</h1><div style="color:#777;margin-top:3px">Toutes les photos</div></div><div class="gallery-grid">${imgs}</div><div id="photoViewer" class="photo-viewer"><div class="viewer-top"><button data-close-photo>‹</button><span>Aujourd’hui</span><span>•••</span></div><img id="viewerImg"></div></div>`);
}

function renderNotes(){openApp(`<div class="notes-app">${nav('Notes','•••')}<h1 class="notes-title">Notes</h1><div class="note-card"><b>KAIROS</b><p>Le temps ne prévient pas. Il passe. Le bon moment n’est pas forcément celui qu’on avait prévu.</p></div><div class="note-card"><b>À ne pas oublier</b><p>ABEG — garder la master dans Fichiers.<br>Tout gâcher — envoyé sur WhatsApp.<br>02:43.</p></div><div class="note-card"><b>Tracklist</b><p>Kairos · God Bless · Boulot · Bandite · Vincent Kompany · Interlude · Tu sais · LPB</p></div></div>`)}

function renderCamera(){openApp(`<div class="camera-app"><video id="cameraVideo" src="assets/video/camera.mp4" muted autoplay loop playsinline></video><div class="camera-ui"><div class="cam-top"><span>⚡</span><span>⌃</span><span>◎</span></div><div class="cam-bottom"><span class="thumb"></span><button class="shutter"></button><span class="flip">↻</span></div></div></div>`,{dark:true})}

function renderPhone(){
  const rows=[['Paapii','mobile','23:21'],['Corentin','mobile','21:08'],['Numéro inconnu','appel manqué','20:43'],['Yoan','mobile','Hier']].map((r,i)=>`<div class="row"><span class="avatar initial">${r[0][0]}</span><div class="row-copy"><b style="${i===2?'color:#ff3b30':''}">${r[0]}</b><span>${r[1]}</span></div><div class="row-meta">${r[2]} ⓘ</div></div>`).join('');
  openApp(`<div class="phone-app">${nav('Récents','Modifier')}<h1 class="section-title">Récents</h1><div class="list">${rows}</div><div class="phone-tabs"><span>★<br>Favoris</span><b>◷<br>Récents</b><span>♙<br>Contacts</span><span>⌨<br>Clavier</span><span>◉<br>Messagerie</span></div></div>`)
}

function renderSettings(){openApp(`<div class="settings-app">${nav('Réglages')}<h1>Réglages</h1><div class="setting-card"><div class="setting-row"><span>Mode Avion</span><span>Non</span></div><div class="setting-row"><span>Wi‑Fi</span><span>Connecté</span></div><div class="setting-row"><span>Bluetooth</span><span>Activé</span></div><div class="setting-row"><span>Données cellulaires</span><span>5G</span></div></div><div class="setting-card"><div class="setting-row"><span>Général</span><span>›</span></div><div class="setting-row"><span>Fond d’écran</span><span>›</span></div><div class="setting-row"><span>Face ID et code</span><span>›</span></div></div></div>`)}

function renderSpotify(){
  const tracks=['KAIROS','GOD BLESS','BOULOT','BANDITE','VINCENT KOMPANY','INTERLUDE','TU SAIS','LPB'];
  openApp(`<div class="spotify-app"><div class="spotify-hero"><img src="assets/images/gallery-track-1.png"><h1>KAIROS</h1><p>Manii & Paapii · Album · 2026</p></div><div class="spot-actions"><button class="spot-play">▶</button></div>${tracks.map((t,i)=>`<div class="spot-track"><span>${i+1}</span><div><b>${t}</b><small>Manii & Paapii</small></div><span>•••</span></div>`).join('')}</div>`,{dark:true})
}

function screenshotApp(src,hotspots=[],dark=false){
  const spots=hotspots.map(h=>`<button class="hotspot" data-hot="${h.action}" style="left:${h.left}%;top:${h.top}%;width:${h.width}%;height:${h.height}%" aria-label="${h.label||''}"></button>`).join('');
  openApp(`<div class="screen-shot-app"><img class="full-shot" src="${src}" alt="">${spots}</div>`,{dark});
}
function renderInstagram(state='manii-profile'){
  const map={
    'manii-profile':['assets/images/insta-manii-profile.webp',[{action:'insta-manii-following',left:67,top:16,width:29,height:17,label:'Suivis'}]],
    'manii-following':['assets/images/insta-manii-following.webp',[{action:'insta-manii-profile',left:0,top:0,width:18,height:10,label:'Retour'},{action:'insta-paapii-profile',left:0,top:34,width:100,height:14,label:'Paapii'}]],
    'paapii-profile':['assets/images/insta-paapii-profile.webp',[{action:'insta-manii-following',left:0,top:0,width:18,height:10,label:'Retour'},{action:'insta-paapii-following',left:67,top:13,width:28,height:16,label:'Suivis'}]],
    'paapii-following':['assets/images/insta-paapii-following.webp',[{action:'insta-paapii-profile',left:0,top:0,width:18,height:10,label:'Retour'},{action:'insta-manii-profile',left:0,top:13,width:100,height:13,label:'Manii'}]]
  };
  const [src,hs]=map[state];screenshotApp(src,hs,false);
}
function renderMusic(state='library'){
  if(state==='album') screenshotApp('assets/images/apple-kairos.webp',[{action:'music-library',left:0,top:0,width:20,height:12,label:'Retour'}],true);
  else screenshotApp('assets/images/apple-library.webp',[{action:'music-album',left:0,top:36,width:52,height:24,label:'Kairos'}],false);
}

function showPassword(kind){
  const expected=kind==='abeg'?'1029':'TIME';
  modal.classList.remove('hidden');
  modal.innerHTML=`<div class="modal-card"><h3>${kind==='abeg'?'ABEG_MASTER.wav':'tout_gacher.wav'}</h3><p>${kind==='abeg'?'Code à 4 chiffres':'Mot de passe à 4 lettres'}</p><input id="modalCode" maxlength="4" autofocus><div class="modal-actions"><button class="cancel" data-modal-close>Annuler</button><button class="ok" data-modal-ok="${kind}" data-code="${expected}">Ouvrir</button></div></div>`;
  setTimeout(()=>$('#modalCode')?.focus(),50);
  bindDynamic();
}
function closeModal(){modal.classList.add('hidden');modal.innerHTML=''}

function bindDynamic(){
  $$('[data-app-back]').forEach(b=>b.onclick=()=>{if(routeStack.length){appContent.innerHTML=routeStack.pop();bindDynamic()}else goHome()});
  $$('[data-msg-thread]').forEach(b=>b.onclick=()=>renderMessageThread(b.dataset.msgThread));
  $$('[data-wa-thread]').forEach(b=>b.onclick=()=>renderWAThread(b.dataset.waThread));
  $$('[data-file="abeg"]').forEach(b=>b.onclick=()=>renderFileLock('abeg'));
  $$('[data-unlock]').forEach(b=>b.onclick=()=>{const v=$('#codeField')?.value.trim().toUpperCase();if(v===b.dataset.code){renderAudio(b.dataset.unlock)}else toast('Code incorrect')});
  $$('[data-audio-lock]').forEach(b=>b.onclick=()=>showPassword(b.dataset.audioLock));
  $$('[data-modal-close]').forEach(b=>b.onclick=closeModal);
  $$('[data-modal-ok]').forEach(b=>b.onclick=()=>{const v=$('#modalCode')?.value.trim().toUpperCase();if(v===b.dataset.code){const k=b.dataset.modalOk;closeModal();renderAudio(k)}else toast('Mot de passe incorrect')});
  $$('[data-photo-index]').forEach(img=>img.onclick=()=>{const v=$('#photoViewer'),vi=$('#viewerImg');vi.src=GALLERY[Number(img.dataset.photoIndex)];v.classList.add('open')});
  $$('[data-close-photo]').forEach(b=>b.onclick=()=>$('#photoViewer')?.classList.remove('open'));
  $$('[data-hot]').forEach(b=>b.onclick=()=>{
    const a=b.dataset.hot;
    if(a==='insta-manii-following')renderInstagram('manii-following');
    if(a==='insta-paapii-profile')renderInstagram('paapii-profile');
    if(a==='insta-paapii-following')renderInstagram('paapii-following');
    if(a==='insta-manii-profile')renderInstagram('manii-profile');
    if(a==='music-album')renderMusic('album');
    if(a==='music-library')renderMusic('library');
  });
}

function route(name){
  if(name==='messages')return renderMessages();
  if(name==='photos')return renderPhotos();
  if(name==='notes')return renderNotes();
  if(name==='files')return renderFiles();
  if(name==='camera')return renderCamera();
  if(name==='music')return renderMusic('library');
  if(name==='whatsapp')return renderWhatsApp();
  if(name==='spotify')return renderSpotify();
  if(name==='instagram')return renderInstagram('manii-profile');
  if(name==='settings')return renderSettings();
  if(name==='phone')return renderPhone();
  if(name==='safari'){window.open(ALBUM_URL,'_blank','noopener');return}
}

$('#enterBtn').onclick=()=>{intro.classList.remove('active');phoneScene.classList.add('active');setStatus(true);show(lock)};
$('#unlockBtn').onclick=()=>goHome();
$('#homeIndicator').onclick=()=>goHome();
document.addEventListener('click',e=>{const b=e.target.closest('[data-route]');if(b)route(b.dataset.route)});

let startY=null;
lock.addEventListener('touchstart',e=>startY=e.touches[0].clientY,{passive:true});
lock.addEventListener('touchend',e=>{if(startY-e.changedTouches[0].clientY>60)goHome()},{passive:true});
