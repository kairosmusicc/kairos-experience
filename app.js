const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];

const intro = $('#intro');
const phoneScene = $('#phoneScene');
const home = $('#home');
const lockscreen = $('#lockscreen');
const appView = $('#appView');
const appContent = $('#appContent');
const appTitle = $('#appTitle');
const appEyebrow = $('#appEyebrow');
const lockFile = $('#lockFile');
const player = $('#player');
const audioPlayer = $('#audioPlayer');
const incomingCall = $('#incomingCall');
const activeCall = $('#activeCall');
const callAudio = $('#callAudio');

let previousView = home;
let currentFile = 'abeg';
let activeAudioId = null;
let callTimer = null;
let callSeconds = 0;
const unlocked = {
  abeg: localStorage.kairos_abeg === '1',
  exclu: localStorage.kairos_exclu === '1'
};

const AUDIO = {
  abeg: 'assets/audio/abeg.wav',
  exclu: 'assets/audio/tout_gacher.wav'
};

const appNames = {
  messages:'Messages', photos:'Photos', notes:'Notes', files:'Fichiers', camera:'Appareil photo',
  music:'Musique', whatsapp:'WhatsApp', spotify:'Spotify', instagram:'Instagram', settings:'Réglages',
  phone:'Téléphone', safari:'Safari'
};

const chats = {
  paapii: {
    name:'Paapii',
    messages:[
      ['me','frérot t’as gardé la dernière version d’abeg ?'],['','oui pourquoi'],['me','celle qu’on devait garder de côté'],['','ouais elle est dans les fichiers'],['me','j’ai encore oublié le code 💀'],['','mais t’es grave'],['me','c’était quoi déjà'],['','la date du projet'],['me','29/10'],['','maintenant retourne-la']
    ]
  },
  corentin:{
    name:'Corentin',
    messages:[
      ['','J’ai remis l’ordre final de KAIROS'],['me','carré'],['','ABEG vous le gardez pour vous pour l’instant'],['me','oui'],['','et l’autre morceau aussi'],['me','tout gâcher ?'],['','oui'],['me','Paapii l’a encore je crois'],['','parfait'],['','ne le mettez pas dans le dossier public']
    ]
  },
  yoan:{
    name:'Yoan — Zénithal',
    messages:[['','Les selects sont prêts'],['me','lourd envoie'],['','j’en ai gardé 5'],['me','parfait'],['','vous validez laquelle pour la prochaine annonce ?'],['me','je regarde ça ce soir']]
  },
  redka:{
    name:'Redka',
    messages:[['','t’as écouté l’intro avec les modifs ?'],['me','ouais c’est mieux'],['','je te renvoie le bounce propre'],['me','vas-y']]
  }
};

function show(view){
  $$('.phone-view').forEach(v=>v.classList.remove('active-view'));
  view.classList.add('active-view');
}

function toast(msg, ms=2200){
  const t=$('#toast'); t.textContent=msg; t.classList.remove('hidden');
  clearTimeout(toast._t); toast._t=setTimeout(()=>t.classList.add('hidden'),ms);
}

$('#powerBtn').onclick=()=>{intro.classList.remove('active');phoneScene.classList.add('active');show(lockscreen)};
$('#unlockBtn').onclick=()=>show(home);
$('#backHome').onclick=()=>show(home);
$('#backLocked').onclick=()=>show(previousView || home);
$('#backPlayer').onclick=()=>show(previousView || home);
$$('[data-open]').forEach(b=>b.onclick=()=>{show(home);openApp(b.dataset.open)});
$$('[data-app]').forEach(b=>b.onclick=()=>openApp(b.dataset.app));

function openApp(name){
  previousView = appView;
  appTitle.textContent = appNames[name] || name;
  appEyebrow.textContent = name==='whatsapp' ? '1 nouveau message' : 'KAIROS';
  const renderers={messages,photos,notes,files,camera,music,whatsapp,spotify,instagram,settings,phone,safari};
  appContent.innerHTML = renderers[name] ? renderers[name]() : '<p>Rien ici.</p>';
  show(appView);
  bindApp(name);
}

function messages(){
  return `<h3 class="section-title">Messages</h3><div class="thread-list">
  ${thread('paapii','P','maintenant retourne-la')}
  ${thread('corentin','C','ne le mettez pas dans le dossier public')}
  ${thread('yoan','Y','Les selects sont prêts')}
  ${thread('redka','R','je te renvoie le bounce propre')}
  </div>`;
}
function thread(id,initial,preview){return `<button class="thread-item" data-chat="${id}"><div class="avatar">${initial}</div><div class="meta"><b>${chats[id].name}</b><p>${preview}</p></div></button>`}
function openChat(id){const c=chats[id];appContent.innerHTML=`<div class="chat-name">${c.name}</div><div class="chat">${c.messages.map(x=>`<div class="bubble ${x[0]}">${x[1]}</div>`).join('')}</div>`;}

const photoFiles=['manii-01.jpg','manii-02.jpg','duo-01.jpg','paapii-01.jpg','paapii-02.png','lockscreen-cicatrices.png','IMG_2207-2.png'];
function photos(){return `<h3 class="section-title">Récents</h3><div class="gallery">${photoFiles.map((f,i)=>`<img data-photo="${i}" src="assets/images/${f}" alt="" onerror="this.style.display='none'">`).join('')}</div><div class="photo-modal" id="photoModal"><button id="closePhoto">‹</button><img id="photoFull" alt=""></div>`}

function notes(){return `
<div class="note-card"><h3>KAIROS</h3><p>καιρός
le bon moment
l’instant qu’on ne contrôle pas
celui qu’on reconnaît parfois trop tard</p></div>
<div class="note-card"><h3>Idées projet</h3><p>temps
choix
hasard
conséquence
opportunité
attente
retard</p></div>
<div class="note-card"><h3>À faire</h3><p>finaliser cover
appeler Yoan
exports reels
vérifier tracklist
retrouver le mdp du fichier de Paapii
répondre à Corentin</p></div>
<div class="note-card"><h3>02:43</h3><p>Pourquoi cette heure revient tout le temps ?</p></div>`}

function files(){return `<h3 class="section-title">Sur mon iPhone</h3>
<div class="file-card">
  ${folderRow('KAIROS')}${folderRow('SHOOTING')}${folderRow('EXPORTS')}${folderRow('PERSO')}
</div>
<div class="sub-title">KAIROS</div><div class="file-card">
  ${plainFile('TRACKLIST.txt','Document texte')}${plainFile('cover_final.jpg','Image')}
  ${audioFile('abeg','ABEG_MASTER.wav')}
  ${plainFile('notes_session.txt','Document texte')}
</div>`}
function folderRow(name){return `<div class="file-row"><div class="file-emoji">📁</div><div class="file-meta"><b>${name}</b><small>Dossier</small></div></div>`}
function plainFile(name,type){return `<div class="file-row"><div class="file-emoji">▤</div><div class="file-meta"><b>${name}</b><small>${type}</small></div><button data-dummy-file>Ouvrir</button></div>`}
function audioFile(id,name){return `<div class="file-row"><div class="file-emoji">🎵</div><div class="file-meta"><b>${name}</b><small>${unlocked[id]?'Déverrouillé':'Protégé'}</small></div><button data-file="${id}">${unlocked[id]?'Ouvrir':'🔒'}</button></div>`}

function whatsapp(){return `<h3 class="section-title">Discussions</h3><div class="wa-list">
  <div class="wa-item" data-wa="paapii"><div class="avatar" style="background:#4c8">P</div><div><b>Paapii</b><p>4 lettres.</p></div></div>
  <div class="wa-item"><div class="avatar">K</div><div><b>KAIROS</b><p>Corentin : planning validé ✅</p></div></div>
  <div class="wa-item"><div class="avatar">C</div><div><b>Corentin</b><p>on fait le point demain</p></div></div>
  <div class="wa-item"><div class="avatar">Y</div><div><b>Yoan</b><p>je vous renvoie les exports</p></div></div>
</div>`}
function openWhatsAppChat(){appContent.innerHTML=`<div class="wa-chat"><div class="chat-name">Paapii</div>
${waBubble('','t’as écouté la dernière version ?')}${waBubble('me','de quoi')}${waBubble('','tout gâcher')}${waBubble('me','non envoie')}${waBubble('','att')}
<button class="wa-audio locked" data-wa-file><span>▶</span><div><b>tout_gacher.wav</b><small>Fichier audio</small></div></button>
${waBubble('me','encore un mot de passe ???')}${waBubble('','😂')}${waBubble('me','donne')}${waBubble('','nan réfléchis')}${waBubble('me','indice au moins')}${waBubble('','ce que kairos essaie de te faire comprendre depuis le début')}${waBubble('me','??')}${waBubble('','4 lettres.')}
</div>`; bindWhatsAppFile();}
function waBubble(side,text){return `<div class="bubble ${side}">${text}</div>`}

function camera(){return `<div class="camera-ui">
<video id="cameraVideo" autoplay muted loop playsinline src="assets/video/camera.mp4"></video>
<img id="cameraFallback" class="camera-fallback hidden" src="assets/images/manii-02.jpg" alt="">
<div class="camera-top"><span>⚡</span><span>LIVE</span><span>⌃</span></div>
<div class="camera-bottom"><div class="camera-thumb"><img src="assets/images/duo-01.jpg"></div><button id="shutter" class="shutter"></button><button class="flip">↻</button></div><div id="cameraFlash" class="camera-flash"></div></div>`}

function music(){const rows=[['KAIROS','Manii & Paapii','duo-01.jpg'],['Bandite','Manii & Paapii','manii-01.jpg'],['Tu sais','Manii & Paapii','paapii-01.jpg'],['La Plus Belle','Manii & Paapii','manii-02.jpg']];return `<h3 class="section-title">Ajouts récents</h3><div class="music-list">${rows.map(r=>`<div class="music-row"><img src="assets/images/${r[2]}"><div><b>${r[0]}</b><small>${r[1]}</small></div></div>`).join('')}</div>`}
function spotify(){return `<div class="spotify-view"><h2>Bonsoir</h2><div class="spotify-card"><img src="assets/images/duo-01.jpg"><div><b>KAIROS</b><small>Manii & Paapii</small></div></div><div class="spotify-card"><img src="assets/images/manii-01.jpg"><div><b>Late Night</b><small>Playlist</small></div></div><div class="spotify-card"><img src="assets/images/paapii-01.jpg"><div><b>Afro R&B</b><small>Mix</small></div></div><div class="sub-title">Dernière écoute</div><p>02:43</p></div>`}
function instagram(){return `<div class="insta-head"><img src="assets/images/duo-01.jpg"><div><b>@manii.music</b><div class="insta-stats"><span><b>12</b>posts</span><span><b>2K</b>abonnés</span><span><b>72</b>suivis</span></div></div></div><div class="sub-title">Brouillons</div><div class="list-card"><b>KAIROS — post final</b><p>Non publié</p></div><div class="list-card"><b>ABEG teaser</b><p>Non publié</p></div><div class="insta-grid">${photoFiles.slice(0,6).map(f=>`<img src="assets/images/${f}" onerror="this.style.display='none'">`).join('')}</div>`}
function settings(){return `<div class="settings-card"><h3>Manii’s iPhone</h3>${settingRow('Nom','KAIROS')}${settingRow('Version','29.10')}${settingRow('Modèle','iPhone')}${settingRow('Capacité','128 Go')}${settingRow('Disponible','10,29 Go')}</div><button id="resetProgress" class="reset-btn">Réinitialiser les fichiers cachés</button>`}
function settingRow(a,b){return `<div class="settings-row"><span>${a}</span><span>${b}</span></div>`}
function phone(){return `<h3 class="section-title">Récents</h3><div class="phone-recents">
${callRow('Paapii','Appel sortant · 6 min','29 oct. · 01:58')}
${callRow('Corentin','Appel manqué','28 oct. · 23:17',true)}
${callRow('Yoan — Zénithal','Appel entrant · 4 min','27 oct.')}
${callRow('Numéro inconnu','Appel manqué','29 oct. · 02:43',true,true)}
</div>`}
function callRow(name,type,date,missed=false,mystery=false){return `<div class="call-row ${missed?'missed':''}" ${mystery?'data-mystery-call':''}><div class="avatar">${name[0]}</div><div class="call-info"><b>${name}</b><small>${type}</small></div><small>${date}</small></div>`}
function safari(){return `<div class="safari-page"><div class="safari-bar">google.com/search?q=kairos+signification</div>${result('wikipedia.org','Kairos — Wikipédia','Kairos désigne le moment opportun, le bon moment pour agir.')}${result('google.com','comment récupérer un fichier wav corrompu','Résultats et méthodes de récupération audio.')}${result('google.com','02:43 signification','Aucun résultat particulièrement utile.')}</div>`}
function result(domain,title,desc){return `<div class="search-result"><small>${domain}</small><h3>${title}</h3><p>${desc}</p></div>`}

function bindApp(name){
  $$('[data-chat]',appContent).forEach(x=>x.onclick=()=>openChat(x.dataset.chat));
  $$('[data-file]',appContent).forEach(x=>x.onclick=()=>openFile(x.dataset.file, appView));
  $$('[data-dummy-file]',appContent).forEach(x=>x.onclick=()=>toast('Ce fichier ne contient rien d’utile.'));
  $$('[data-wa]',appContent).forEach(x=>x.onclick=()=>openWhatsAppChat());
  $$('[data-photo]',appContent).forEach(img=>img.onclick=()=>{const m=$('#photoModal');$('#photoFull').src=img.src;m.classList.add('open')});
  if($('#closePhoto')) $('#closePhoto').onclick=()=>$('#photoModal').classList.remove('open');
  if(name==='camera') bindCamera();
  if(name==='settings' && $('#resetProgress')) $('#resetProgress').onclick=resetProgress;
  $$('[data-mystery-call]',appContent).forEach(x=>x.onclick=()=>show(incomingCall));
}

function bindWhatsAppFile(){const b=$('[data-wa-file]',appContent);if(!b)return;b.onclick=()=>{if(unlocked.exclu){openPlayer('exclu',appView)}else openFile('exclu',appView)}}

function openFile(id, fromView=appView){
  currentFile=id; previousView=fromView;
  if(unlocked[id]){openPlayer(id,fromView);return}
  $('#lockedName').textContent=id==='abeg'?'ABEG_MASTER.wav':'tout_gacher.wav';
  $('#lockPrompt').textContent=id==='abeg'?'Code à 4 chiffres':'Mot de passe · 4 lettres';
  $('#codeInput').type=id==='abeg'?'tel':'text';
  $('#codeInput').value=''; $('#feedback').textContent=''; show(lockFile);
}

$('#codeForm').onsubmit=e=>{
  e.preventDefault(); const v=$('#codeInput').value.trim().toUpperCase();
  const ok=currentFile==='abeg'?v==='1029':v==='TIME';
  if(ok){unlocked[currentFile]=true;localStorage['kairos_'+currentFile]='1';openPlayer(currentFile,previousView)}
  else $('#feedback').textContent=currentFile==='abeg'?'Mauvais code.':'Mauvais mot de passe.';
};
$('#hint').onclick=()=>{$('#feedback').textContent=currentFile==='abeg'?'Indice : relis la conversation avec Paapii.':'Indice : ce que KAIROS signifie, en quatre lettres.'};

function openPlayer(id, fromView=appView){
  previousView=fromView; activeAudioId=id;
  $('#trackTitle').textContent=id==='abeg'?'ABEG':'TOUT GÂCHER';
  $('#playerFileName').textContent=id==='abeg'?'ABEG_MASTER.wav':'tout_gacher.wav';
  $('#playerArt').src=id==='abeg'?'assets/images/duo-01.jpg':'assets/images/lockscreen-cicatrices.png';
  $('#newFile').classList.toggle('hidden',id!=='abeg');
  audioPlayer.pause(); audioPlayer.src=AUDIO[id]; audioPlayer.load(); $('#playBtn').textContent='▶'; $('#progressFill').style.width='0%';
  show(player);
}

$('#playBtn').onclick=async()=>{try{if(audioPlayer.paused){await audioPlayer.play();$('#playBtn').textContent='Ⅱ'}else{audioPlayer.pause();$('#playBtn').textContent='▶'}}catch(e){toast('Audio introuvable dans assets/audio/.')}};
$('#rewindBtn').onclick=()=>audioPlayer.currentTime=Math.max(0,audioPlayer.currentTime-10);
$('#forwardBtn').onclick=()=>audioPlayer.currentTime=Math.min(audioPlayer.duration||0,audioPlayer.currentTime+10);
audioPlayer.ontimeupdate=()=>{$('#progressFill').style.width=(audioPlayer.duration?audioPlayer.currentTime/audioPlayer.duration*100:0)+'%'};
audioPlayer.onended=()=>{ $('#playBtn').textContent='▶'; if(activeAudioId==='abeg'){toast('1 élément supplémentaire détecté.');setTimeout(()=>triggerIncomingCall(),2500)} };

function bindCamera(){const video=$('#cameraVideo'),fallback=$('#cameraFallback');video.onerror=()=>{video.classList.add('hidden');fallback.classList.remove('hidden')};$('#shutter').onclick=()=>{const f=$('#cameraFlash');f.classList.add('flash');setTimeout(()=>f.classList.remove('flash'),180);toast('Photo enregistrée dans Récents.')}}

function triggerIncomingCall(){if(localStorage.kairos_call_heard==='1')return;show(incomingCall)}
$('#declineCall').onclick=()=>{localStorage.kairos_call_heard='1';show(home)};
$('#acceptCall').onclick=()=>{show(activeCall);startCall()};
$('#hangupCall').onclick=endCall;
function startCall(){localStorage.kairos_call_heard='1';callSeconds=0;$('#activeCallStatus').textContent='connecté — 00:00';clearInterval(callTimer);callTimer=setInterval(()=>{callSeconds++;$('#activeCallStatus').textContent='connecté — '+String(Math.floor(callSeconds/60)).padStart(2,'0')+':'+String(callSeconds%60).padStart(2,'0')},1000);callAudio.currentTime=0;callAudio.play().catch(()=>toast('Ajoute assets/audio/call-0243.wav'))}
function endCall(){clearInterval(callTimer);callAudio.pause();show(home)}
callAudio.onended=()=>{setTimeout(endCall,700)};

function resetProgress(){['kairos_abeg','kairos_exclu','kairos_call_heard'].forEach(k=>localStorage.removeItem(k));unlocked.abeg=false;unlocked.exclu=false;toast('Progression réinitialisée.');}

function tick(){const d=new Date();$('#liveTime').textContent=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')}
tick();setInterval(tick,30000);

// If the page opens directly on mobile, keep intro available but allow the user to start normally.
