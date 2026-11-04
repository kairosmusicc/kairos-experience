const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];

const intro=$("#intro"), phoneScene=$("#phoneScene"), lockscreen=$("#lockscreen"), home=$("#home"), appView=$("#appView"), appContent=$("#appContent");
const incomingCall=$("#incomingCall"), activeCall=$("#activeCall"), callAudio=$("#callAudio"), toastEl=$("#toast");
let stack=["home"], callTimer=null, callSeconds=0;

const AUDIO={
  abeg:"assets/audio/abeg.wav",
  toutgacher:"assets/audio/tout_gacher.wav"
};
const unlocked={
  abeg:localStorage.kairos_abeg==="1",
  toutgacher:localStorage.kairos_toutgacher==="1"
};

const photos=[
  "manii-01.jpg","manii-02.jpg","duo-01.jpg","paapii-01.jpg","lockscreen-cicatrices.png","IMG_2207-2.png"
];

const messagesData={
  paapii:{name:"Paapii",subtitle:"iMessage",messages:[
    ["me","frérot t’as gardé la dernière version d’abeg ?"],
    ["","oui pourquoi"],
    ["me","celle qu’on devait garder de côté"],
    ["","ouais elle est dans les fichiers"],
    ["me","j’ai encore oublié le code 💀"],
    ["","mais t’es grave"],
    ["me","c’était quoi déjà"],
    ["","la date du projet"],
    ["me","29/10"],
    ["","maintenant retourne-la"]
  ]},
  corentin:{name:"Corentin",subtitle:"iMessage",messages:[
    ["","J’ai remis l’ordre final de KAIROS."],
    ["me","carré"],
    ["","ABEG vous le gardez pour vous pour l’instant."],
    ["me","oui"],
    ["","Et l’autre morceau aussi."],
    ["me","Tout gâcher ?"],
    ["","Oui. Ne le mettez pas dans le dossier public."]
  ]},
  yoan:{name:"Yoan — Zénithal",subtitle:"iMessage",messages:[
    ["","Les selects sont prêts."],
    ["me","lourd envoie"],
    ["","J’en ai gardé 5."],
    ["me","parfait"],
    ["","Vous validez laquelle pour la prochaine annonce ?"],
    ["me","je regarde ça ce soir"]
  ]},
  redka:{name:"Redka",subtitle:"iMessage",messages:[
    ["","T’as écouté l’intro avec les modifs ?"],
    ["me","ouais c’est mieux"],
    ["","Je te renvoie le bounce propre."],
    ["me","vas-y"]
  ]}
};

function show(view){
  $$(".view").forEach(v=>v.classList.remove("active-view"));
  view.classList.add("active-view");
}
function goHome(){
  stack=["home"];
  show(home);
  appContent.innerHTML="";
}
function toast(msg,ms=1800){
  toastEl.textContent=msg;
  toastEl.classList.remove("hidden");
  clearTimeout(toast._t);
  toast._t=setTimeout(()=>toastEl.classList.add("hidden"),ms);
}
function nativeHeader(title,{light=false,back=true,sub=""}={}){
  return `<div class="native-header ${light?"light":""}">
    ${back?'<button class="back-btn" data-back>‹</button>':'<span class="header-spacer"></span>'}
    <div style="flex:1"><h2>${title}</h2>${sub?`<small>${sub}</small>`:""}</div>
    <span class="header-spacer"></span>
  </div>`;
}
function push(route,params={}){
  stack.push({route,params});
  renderRoute(route,params);
}
function pop(){
  if(stack.length<=1){goHome();return}
  stack.pop();
  const prev=stack[stack.length-1];
  if(prev==="home") goHome(); else renderRoute(prev.route,prev.params,false);
}
function wireCommon(){
  $$("[data-back]",appContent).forEach(b=>b.onclick=pop);
}
function openRoute(route,params={}){
  stack=["home",{route,params}];
  renderRoute(route,params,false);
}
function renderRoute(route,params={},pushState=false){
  show(appView);
  const map={
    messages:renderMessages,photos:renderPhotos,notes:renderNotes,files:renderFiles,camera:renderCamera,
    music:renderMusic,whatsapp:renderWhatsApp,spotify:renderSpotify,instagram:renderInstagram,
    settings:renderSettings,phone:renderPhone,safari:renderSafari,
    imessage:()=>renderIMessage(params.id),
    whatsappchat:()=>renderWhatsAppChat(params.id||"paapii"),
    lockedfile:()=>renderLockedFile(params.id),
    player:()=>renderPlayer(params.id),
    instascreen:()=>renderInstagramScreen(params.screen)
  };
  appContent.innerHTML="";
  (map[route]||(()=>{appContent.innerHTML=nativeHeader("KAIROS")+"<div style='padding:20px'>Rien ici.</div>"}))();
  wireCommon();
}

$("#powerBtn").onclick=()=>{intro.classList.remove("active");phoneScene.classList.add("active");show(lockscreen)};
$("#unlockBtn").onclick=goHome;
$("#homeGesture").onclick=goHome;
$$("[data-route]").forEach(b=>b.onclick=()=>openRoute(b.dataset.route));
$$(".notif[data-route]").forEach(b=>b.onclick=()=>openRoute(b.dataset.route));

function renderMessages(){
  appContent.innerHTML=`${nativeHeader("Messages",{back:true})}
    <div class="messages-list">
      <div class="ios-search">🔍 Rechercher</div>
      ${msgThread("paapii","P","maintenant","maintenant retourne-la")}
      ${msgThread("corentin","C","hier","ne le mettez pas dans le dossier public")}
      ${msgThread("yoan","Y","hier","Les selects sont prêts")}
      ${msgThread("redka","R","lun.","je te renvoie le bounce propre")}
    </div>`;
  $$("[data-imessage]",appContent).forEach(x=>x.onclick=()=>push("imessage",{id:x.dataset.imessage}));
}
function msgThread(id,initial,time,preview){
  const n=messagesData[id].name;
  return `<button class="msg-thread" data-imessage="${id}" style="width:100%;border:0;background:none">
    <div class="msg-avatar">${initial}</div>
    <div class="msg-copy">
      <div class="msg-top"><b>${n}</b><span>${time} ›</span></div>
      <p>${preview}</p>
    </div>
  </button>`;
}
function renderIMessage(id){
  const c=messagesData[id];
  appContent.innerHTML=`<div class="chat-screen">
    <div class="native-header chat-head">
      <button class="back-btn" data-back>‹</button>
      <div class="chat-title"><b>${c.name}</b><span>${c.subtitle}</span></div>
      <span class="header-spacer"></span>
    </div>
    <div class="chat-body">${c.messages.map(m=>`<div class="bubble ${m[0]}">${m[1]}</div>`).join("")}</div>
    <div class="chat-input">iMessage</div>
  </div>`;
}

function renderPhotos(){
  appContent.innerHTML=`<div class="photos-wrap">${nativeHeader("Photos",{back:true})}
    <h2 class="photos-title">Récents</h2>
    <div class="gallery">${photos.map((f,i)=>`<button data-photo="${i}" style="padding:0;border:0;background:none"><img src="assets/images/${f}" alt=""></button>`).join("")}</div>
  </div>`;
  $$("[data-photo]",appContent).forEach(btn=>btn.onclick=()=>{
    const f=photos[+btn.dataset.photo];
    appContent.innerHTML=`<div class="photo-full"><button class="back-btn" data-back style="position:absolute;top:58px;left:10px;z-index:2">‹</button><img src="assets/images/${f}"></div>`;
    wireCommon();
  });
}

function renderNotes(){
  appContent.innerHTML=`<div class="notes-wrap">${nativeHeader("Notes",{light:true,back:true})}
    <h2 class="note-title">Toutes les notes</h2>
    ${note("KAIROS","καιρός\nle bon moment\nl’instant qu’on ne contrôle pas\ncelui qu’on reconnaît parfois trop tard")}
    ${note("À faire","finaliser cover\nappeler Yoan\nexports reels\nvérifier tracklist\nretrouver le mdp du fichier de Paapii\nrépondre à Corentin")}
    ${note("02:43","Pourquoi cette heure revient tout le temps ?")}
  </div>`;
}
function note(title,body){return `<div class="note-card"><h3>${title}</h3><p>${body}</p></div>`}

function renderFiles(){
  appContent.innerHTML=`<div class="files-wrap">${nativeHeader("Fichiers",{light:true,back:true})}
    <div class="files-body">
      <div class="files-section">Sur mon iPhone</div>
      <div class="file-card">
        ${folder("KAIROS")}${folder("SHOOTING")}${folder("EXPORTS")}${folder("PERSO")}
      </div>
      <div class="files-section">KAIROS</div>
      <div class="file-card">
        ${file("TRACKLIST.txt","Document texte")}
        ${file("cover_final.jpg","Image")}
        ${audioFile("abeg","ABEG_MASTER.wav")}
        ${file("notes_session.txt","Document texte")}
      </div>
    </div></div>`;
  $$("[data-file]",appContent).forEach(b=>b.onclick=()=>openAudioFile(b.dataset.file));
  $$("[data-dummy]",appContent).forEach(b=>b.onclick=()=>toast("Ce fichier ne contient rien d’utile."));
}
function folder(name){return `<div class="file-row"><div class="file-icon">📁</div><div class="file-meta"><b>${name}</b><small>Dossier</small></div></div>`}
function file(name,type){return `<div class="file-row"><div class="file-icon">▤</div><div class="file-meta"><b>${name}</b><small>${type}</small></div><button data-dummy>Ouvrir</button></div>`}
function audioFile(id,name){return `<div class="file-row"><div class="file-icon">🎵</div><div class="file-meta"><b>${name}</b><small>${unlocked[id]?"Déverrouillé":"Protégé"}</small></div><button data-file="${id}">${unlocked[id]?"Ouvrir":"🔒"}</button></div>`}
function openAudioFile(id){
  if(unlocked[id]) push("player",{id});
  else push("lockedfile",{id});
}
function renderLockedFile(id){
  const abeg=id==="abeg";
  appContent.innerHTML=`<div class="lock-wrap">
    <button class="back-btn" data-back style="position:absolute;top:58px;left:12px">‹</button>
    <div class="lock-mark">⌁</div>
    <h3>${abeg?"ABEG_MASTER.wav":"tout_gacher.wav"}</h3>
    <p>${abeg?"Code à 4 chiffres":"Mot de passe · 4 lettres"}</p>
    <form id="lockForm" class="lock-form">
      <input id="lockInput" maxlength="4" inputmode="${abeg?"numeric":"text"}" placeholder="••••">
      <button>Déverrouiller</button>
    </form>
    <div id="feedback" class="feedback"></div>
    <button id="hintBtn" style="border:0;background:none;color:#0a84ff">Indice</button>
  </div>`;
  $("#lockForm").onsubmit=e=>{
    e.preventDefault();
    const val=$("#lockInput").value.trim().toUpperCase();
    const ok=abeg?val==="1029":val==="TIME";
    if(!ok){$("#feedback").textContent=abeg?"Mauvais code.":"Mauvais mot de passe.";return}
    unlocked[id]=true;
    localStorage[id==="abeg"?"kairos_abeg":"kairos_toutgacher"]="1";
    stack.pop();
    push("player",{id});
  };
  $("#hintBtn").onclick=()=>$("#feedback").textContent=abeg?"Indice : 29/10, mais à l’envers.":"Indice : ce que KAIROS te répète depuis le début.";
}
function renderPlayer(id){
  const abeg=id==="abeg";
  const source=abeg?AUDIO.abeg:AUDIO.toutgacher;
  appContent.innerHTML=`<div class="player-wrap">
    ${nativeHeader(abeg?"ABEG":"TOUT GÂCHER",{back:true})}
    <div class="player-art"><img src="${abeg?"assets/images/duo-01.jpg":"assets/images/lockscreen-cicatrices.png"}"></div>
    <div class="player-meta"><b>Manii & Paapii</b><small>${abeg?"ABEG_MASTER.wav":"tout_gacher.wav"}</small></div>
    <div class="progress"><i id="progressFill"></i></div>
    <div class="player-controls">
      <button id="rewind">−10</button>
      <button id="playBtn" class="play">▶</button>
      <button id="forward">+10</button>
    </div>
    <audio id="audioPlayer" preload="metadata" src="${source}"></audio>
    <div id="detected" class="detected hidden">1 élément supplémentaire détecté.</div>
  </div>`;
  const a=$("#audioPlayer"), play=$("#playBtn");
  play.onclick=async()=>{try{if(a.paused){await a.play();play.textContent="Ⅱ"}else{a.pause();play.textContent="▶"}}catch{toast("Audio introuvable.")}};
  $("#rewind").onclick=()=>a.currentTime=Math.max(0,a.currentTime-10);
  $("#forward").onclick=()=>a.currentTime=Math.min(a.duration||0,a.currentTime+10);
  a.ontimeupdate=()=>$("#progressFill").style.width=(a.duration?a.currentTime/a.duration*100:0)+"%";
  a.onended=()=>{
    play.textContent="▶";
    if(abeg){
      $("#detected").classList.remove("hidden");
      toast("1 élément supplémentaire détecté.",2200);
      setTimeout(()=>show(incomingCall),2800);
    }
  };
}

function renderWhatsApp(){
  appContent.innerHTML=`<div class="wa-wrap">
    <div class="wa-top">
      <h2 class="wa-title">Discussions</h2>
      <div class="wa-filters"><span class="wa-pill active">Toutes</span><span class="wa-pill">Non lues 1</span><span class="wa-pill">Favoris</span><span class="wa-pill">Groupes 1</span></div>
    </div>
    <div class="wa-list">
      ${waItem("paapii","P","22:53","4 lettres.","1")}
      ${waItem("kairos","K","21:44","Corentin : planning validé ✅","")}
      ${waItem("corentin","C","18:12","on fait le point demain","")}
      ${waItem("yoan","Y","17:06","je vous renvoie les exports","")}
    </div>
  </div>`;
  $$("[data-wa]",appContent).forEach(x=>x.onclick=()=>push("whatsappchat",{id:x.dataset.wa}));
}
function waItem(id,initial,time,preview,badge){
  const names={paapii:"Paapii",kairos:"KAIROS",corentin:"Corentin",yoan:"Yoan"};
  return `<button data-wa="${id}" class="wa-item" style="width:100%;border:0;background:none;color:inherit;text-align:left">
    <div class="wa-avatar">${initial}</div>
    <div class="wa-copy">
      <div class="wa-rowtop"><b>${names[id]}</b><span>${time}</span></div>
      <p>${preview}</p>
    </div>${badge?`<span class="wa-badge">${badge}</span>`:""}
  </button>`;
}
function renderWhatsAppChat(id){
  const names={paapii:"Paapii",kairos:"KAIROS",corentin:"Corentin",yoan:"Yoan"};
  let body="";
  if(id==="paapii"){
    body=[
      waBubble("","t’as écouté la dernière version ?","22:41"),
      waBubble("me","de quoi","22:42"),
      waBubble("","tout gâcher","22:42"),
      waBubble("me","non envoie","22:42"),
      waBubble("","att","22:43"),
      `<button id="waAudioFile" class="wa-bubble" style="border:0;color:#fff;text-align:left">
        <div class="wa-doc"><span class="wa-doc-icon">🎵</span><div><b>tout_gacher.wav</b><small style="display:block;color:#aebac1">Fichier audio</small></div><span class="wa-time">22:43</span></div>
      </button>`,
      waBubble("me","encore un mot de passe ???","22:44"),
      waBubble("","😂","22:44"),
      waBubble("me","donne","22:44"),
      waBubble("","nan réfléchis","22:44"),
      waBubble("me","indice au moins","22:45"),
      waBubble("","ce que KAIROS essaie de te faire comprendre depuis le début","22:45"),
      waBubble("me","??","22:45"),
      waBubble("","4 lettres.","22:46")
    ].join("");
  } else if(id==="kairos"){
    body=waBubble("","Planning validé ✅","21:41")+waBubble("me","on garde jeudi pour les exports","21:42")+waBubble("","Oui. Corentin fait le point demain matin.","21:44");
  } else if(id==="corentin"){
    body=waBubble("","On fait le point demain.","18:12")+waBubble("me","oui carré","18:13")+waBubble("","Pensez au dernier export KAIROS.","18:14");
  } else {
    body=waBubble("","Je vous renvoie les exports.","17:06")+waBubble("me","merci frérot","17:07")+waBubble("","Les selects sont prêts aussi.","17:08");
  }
  appContent.innerHTML=`<div class="wa-chat">
    <div class="wa-chat-head">
      <button class="back-btn" data-back>‹</button>
      <div class="wa-avatar" style="width:36px;height:36px">${names[id][0]}</div>
      <div class="wa-chat-name"><b>${names[id]}</b><span>en ligne</span></div>
      <div class="wa-actions"><span>◉</span><span>☎</span></div>
    </div>
    <div class="wa-wall">${body}</div>
    <div class="wa-input"><div class="wa-inputbox">Message</div><div class="wa-mic">🎙</div></div>
  </div>`;
  if($("#waAudioFile")) $("#waAudioFile").onclick=()=>openAudioFile("toutgacher");
}
function waBubble(side,text,time){return `<div class="wa-bubble ${side}">${text}<span class="wa-time">${time}${side==="me"?" ✓✓":""}</span></div>`}

function renderCamera(){
  appContent.innerHTML=`<div class="camera-ui">
    <video id="cameraVideo" autoplay muted loop playsinline src="assets/video/camera.mp4"></video>
    <div class="camera-top"><span>⚡</span><span>⌃</span><span>◉</span></div>
    <div class="camera-modes"><span>CINÉMATIQUE</span><span>VIDÉO</span><b>PHOTO</b><span>PORTRAIT</span></div>
    <div class="camera-bottom"><div class="cam-thumb"><img src="assets/images/duo-01.jpg"></div><button id="shutter" class="shutter"></button><button class="flip">↻</button></div>
    <div id="cameraFlash" class="flash-layer"></div>
  </div>`;
  $("#shutter").onclick=()=>{const f=$("#cameraFlash");f.classList.add("flash");setTimeout(()=>f.classList.remove("flash"),200);toast("Photo enregistrée dans Récents.")};
}

function renderInstagram(){
  renderInstagramScreen("maniiProfile");
}
function renderInstagramScreen(screen){
  const files={
    maniiProfile:"insta-manii-profile.webp",
    maniiFollowing:"insta-manii-following.webp",
    paapiiProfile:"insta-paapii-profile.webp",
    paapiiFollowing:"insta-paapii-following.webp"
  };
  let hotspots="";
  if(screen==="maniiProfile"){
    hotspots+=`<button class="hotspot" data-insta-go="maniiFollowing" style="left:52%;top:10%;width:27%;height:10%"></button>`;
  }else if(screen==="maniiFollowing"){
    hotspots+=`<button class="hotspot" data-insta-go="paapiiProfile" style="left:0;top:36%;width:100%;height:12%"></button>`;
    hotspots+=`<button class="hotspot" data-back style="left:0;top:0;width:18%;height:9%"></button>`;
  }else if(screen==="paapiiProfile"){
    hotspots+=`<button class="hotspot" data-insta-go="paapiiFollowing" style="left:64%;top:9%;width:23%;height:11%"></button>`;
  }else if(screen==="paapiiFollowing"){
    hotspots+=`<button class="hotspot" data-insta-go="maniiProfile" style="left:0;top:16%;width:100%;height:13%"></button>`;
    hotspots+=`<button class="hotspot" data-back style="left:0;top:0;width:18%;height:9%"></button>`;
  }
  appContent.innerHTML=`<div class="insta-wrap">
    <div class="insta-shot"><img src="assets/images/${files[screen]}" alt="Instagram">${hotspots}</div>
    <div class="insta-note">Navigation active : ouvre les abonnements/suivis puis clique sur Manii ou Paapii.</div>
  </div>`;
  $$("[data-insta-go]",appContent).forEach(b=>b.onclick=()=>{
    const next=b.dataset.instaGo;
    if(next==="maniiProfile"||next==="paapiiProfile") stack.push({route:"instascreen",params:{screen:next}});
    else stack.push({route:"instascreen",params:{screen:next}});
    renderInstagramScreen(next);
  });
  wireCommon();
}

function renderPhone(){
  appContent.innerHTML=`<div class="phone-wrap">${nativeHeader("Récents",{back:true})}
    <h2 class="phone-title">Récents</h2>
    ${callRow("Paapii","Appel sortant · 6 min","29 oct. · 01:58")}
    ${callRow("Corentin","Appel manqué","28 oct. · 23:17",true)}
    ${callRow("Yoan — Zénithal","Appel entrant · 4 min","27 oct.")}
    ${callRow("Numéro inconnu","Appel manqué","29 oct. · 02:43",true,true)}
  </div>`;
  if($("[data-mystery-call]",appContent)) $("[data-mystery-call]",appContent).onclick=()=>show(incomingCall);
}
function callRow(name,type,date,miss=false,mystery=false){
  return `<button class="call-row ${miss?"missed":""}" ${mystery?"data-mystery-call":""} style="width:100%;border:0;background:none;color:#fff;text-align:left">
    <div class="circle">${name[0]}</div><div class="call-info"><b>${name}</b><small>${type}</small></div><small>${date}</small>
  </button>`;
}

function renderSafari(){
  appContent.innerHTML=`<div class="safari-wrap">${nativeHeader("Safari",{light:true,back:true})}
    <div class="safari-bar">google.com/search?q=kairos+signification</div>
    ${result("wikipedia.org","Kairos — Wikipédia","Kairos désigne le moment opportun, le bon moment pour agir.")}
    ${result("google.com","comment récupérer un fichier wav corrompu","Résultats et méthodes de récupération audio.")}
    ${result("google.com","02:43 signification","Aucun résultat particulièrement utile.")}
  </div>`;
}
function result(domain,title,desc){return `<div class="search-row"><small>${domain}</small><h3>${title}</h3><p>${desc}</p></div>`}

function renderMusic(){
  const rows=[["KAIROS","Manii & Paapii","duo-01.jpg"],["Bandite","Paapii, Manii","manii-01.jpg"],["Tu sais","Manii & Paapii","paapii-01.jpg"],["La Plus Belle","Manii & Paapii","manii-02.jpg"]];
  appContent.innerHTML=`<div class="music-wrap">${nativeHeader("Musique",{light:true,back:true})}<h2 class="music-title">Ajouts récents</h2>
    ${rows.map(r=>`<div class="music-row"><img src="assets/images/${r[2]}"><div><b>${r[0]}</b><small>${r[1]}</small></div></div>`).join("")}
  </div>`;
}
function renderSpotify(){
  appContent.innerHTML=`<div class="spotify-wrap">${nativeHeader("Spotify",{back:true})}<h2>Bonsoir</h2>
    ${spotifyCard("KAIROS","Manii & Paapii","duo-01.jpg")}
    ${spotifyCard("Bandite","Manii & Paapii","manii-01.jpg")}
    ${spotifyCard("Afro R&B","Mix","paapii-01.jpg")}
    <div style="margin-top:26px;color:#b3b3b3;font-size:12px">Dernière écoute · 02:43</div>
  </div>`;
}
function spotifyCard(t,s,img){return `<div class="spotify-card"><img src="assets/images/${img}"><div><b>${t}</b><small>${s}</small></div></div>`}
function renderSettings(){
  appContent.innerHTML=`<div class="settings-wrap">${nativeHeader("Réglages",{light:true,back:true})}
    <div class="settings-card">
      ${setting("Nom","KAIROS")}${setting("Modèle","iPhone 16 Pro")}${setting("Version","29.10")}${setting("Capacité","128 Go")}${setting("Disponible","10,29 Go")}
    </div>
    <button id="resetProgress" class="reset-btn">Réinitialiser les fichiers cachés</button>
  </div>`;
  $("#resetProgress").onclick=()=>{["kairos_abeg","kairos_toutgacher","kairos_call_heard"].forEach(k=>localStorage.removeItem(k));unlocked.abeg=false;unlocked.toutgacher=false;toast("Progression réinitialisée.")};
}
function setting(a,b){return `<div class="setting-row"><span>${a}</span><span>${b}</span></div>`}

$("#declineCall").onclick=()=>{localStorage.kairos_call_heard="1";goHome()};
$("#acceptCall").onclick=()=>{show(activeCall);startCall()};
$("#hangupCall").onclick=endCall;
function startCall(){
  localStorage.kairos_call_heard="1";
  callSeconds=0;
  $("#callTimer").textContent="connecté — 00:00";
  clearInterval(callTimer);
  callTimer=setInterval(()=>{callSeconds++;$("#callTimer").textContent="connecté — "+String(Math.floor(callSeconds/60)).padStart(2,"0")+":"+String(callSeconds%60).padStart(2,"0")},1000);
  callAudio.currentTime=0;callAudio.play().catch(()=>toast("Audio d’appel introuvable."));
}
function endCall(){clearInterval(callTimer);callAudio.pause();goHome()}
callAudio.onended=()=>setTimeout(endCall,600);
