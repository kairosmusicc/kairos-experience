/* Canonical public lore. No verification answers, transforms or puzzle actions. */
(function(root){
 const facts=Object.freeze({
  project:'KAIROS',releaseDate:'29 octobre 2026',releaseDay:'29 octobre',artists:'Manii & Paapii',
  manii:'Ephrem Amani',paapii:'Ange Diabaté',paapiiFull:'Diabaté Ange Ismaël',
  meaning:'le moment opportun',director:'Ephrem Amani',leadActor:'Paapii',
  locations:'Paris, Cergy, le train et le cabinet',
 });
 const tracks=Object.freeze([{id:'bandite',title:'Bandite',aliases:['bandite']},{id:'tu-sais',title:'Tu sais',aliases:['tu sais']},{id:'lpb',title:'LPB',aliases:['lpb','la plus belle']}]);
 const groups=[],registry=new Map();
 const render=text=>text.replace(/\{(\w+)\}/g,(_,key)=>facts[key] || '');
 function add(id,intent,texts,requires={}){
  const responses=texts.map((template,i)=>{
   const tone=i<4?'direct':i<6?'mocking':'mysterious';
   const entry={id:`lore-${id}:${i}`,loreId:`lore-${id}:${i}`,text:render(template),tone,weight:1};
   registry.set(entry.loreId,entry.text);return entry;
  });
  const totals=responses.reduce((n,r)=>(n[r.tone]=(n[r.tone]||0)+1,n),{});
  responses.forEach(r=>r.weight=({direct:5,mocking:3,mysterious:2})[r.tone]/totals[r.tone]);
  groups.push({id:'lore-'+id,intents:[intent],priority:80,requires,clue:null,responses});
 }
 add('project','ASK_PROJECT',[
  '{project}. Le projet musical de {artists}.','{artists}. Un projet autour du temps et des moments qui changent une vie.',
  '{project}, par {artists}. Il est disponible en streaming.','{project}. Sorti le {releaseDate}, sur les plateformes.',
  '{project}. {artists}. Tu suis un peu ou pas ?','Le projet de {artists}. Le nom est écrit partout.',
  '{project}. Des événements qui peuvent faire basculer une vie.',
 ]);
 add('release','ASK_RELEASE_DATE',[
  'Le {releaseDate}.','{project} est sorti le {releaseDate}.','{releaseDate}. Sur les plateformes de streaming.',
  '{releaseDate}, pour le projet musical.','Le {releaseDate}. T’étais en retard ?',
  '{releaseDay}. Tu suis vraiment le projet ou pas ?','{releaseDate}. Un moment choisi, forcément.',
 ]);
 add('artists','ASK_ARTISTS',[
  '{artists}.','Le projet musical est porté par {artists}.','Manii, c’est {manii}. Paapii, {paapii}.',
  '{artists}, deux amis d’enfance.','{artists}. Je pensais que tu les avais repérés.',
  '{artists}. Les noms sont quand même assez visibles.','Deux amis d’enfance. {artists}. Ça laisse des traces.',
 ]);
 add('manii','ASK_MANII',[
  'Manii, c’est {manii}.','{manii}. Manii, sur le projet.','{manii}, artiste et réalisateur du court métrage {project}.',
  'Manii : {manii}. Il porte le projet musical avec Paapii.','{manii}. T’avais pas fait le lien ?',
  'Ephrem. Manii. Ça commence à faire sens ?','{manii}. Il est aussi derrière la caméra.',
 ]);
 add('paapii','ASK_PAAPII',[
  'Paapii, c’est {paapii}.','{paapiiFull}. Paapii, sur le projet.','{paapii}, alias Paapii. Il joue le rôle principal du court métrage.',
  'Paapii porte le projet musical avec Manii. Son nom : {paapii}.','Ange. Paapii. Tu peux retenir les deux.',
  '{paapii}. Le nom de scène t’avait suffi jusque-là ?', 'Paapii, {paapii}. Un ami d’enfance de Manii.',
 ]);
 add('director','ASK_DIRECTOR',[
  '{director} réalise le court métrage {project}.','{director}. Manii, aussi.',
  'Le réalisateur, c’est {director}.','Le court métrage est réalisé par {director}, qui est aussi Manii.',
  '{director}. Oui, Manii a aussi réalisé le film.','Manii derrière la caméra. {director}, si tu veux le nom.',
  '{director}. Une autre manière de raconter {project}.',
 ]);
 add('favorite','ASK_FAVORITE_TRACK',[
  'Bandite.','Bandite, en premier.','Mon préféré reste Bandite.','Si je dois en garder un : Bandite.',
  'Bandite. J’assume.','Bandite. Je vais pas faire durer le suspense.', 'Bandite. Il prend sa place.',
 ]);
 add('top','ASK_TOP_TRACKS',[
  'Bandite, Tu sais, LPB. Dans cet ordre.','Mon trio : Bandite, Tu sais, LPB.','Bandite devant, Tu sais ensuite, LPB en dernier.',
  'Bandite, puis Tu sais, puis La plus belle. LPB, donc.','Bandite. Tu sais. LPB. J’assume.',
  'Bandite, Tu sais, LPB. On peut rester sur ce trio.','Bandite, Tu sais, LPB. Trois moments que je garde.',
 ]);
 add('meaning','ASK_KAIROS_MEANING',[
  'Le moment opportun. Pas le temps qui passe, le moment qui compte.','KAIROS signifie le moment juste.',
  'Le moment opportun. Celui où quelque chose peut basculer.','Le bon moment, plutôt qu’une durée mesurée.',
  'Le moment juste. Tu peux retenir ça sans chercher une complication.','Le moment opportun. Pas juste une heure sur un écran.',
  'Le moment où une décision peut changer la suite.',
 ]);
 add('film','ASK_FILM',[
  'Le court métrage {project} est réalisé par {director}, avec Paapii dans le rôle principal.',
  'Le film tourne autour du temps et de la perception.','Le court métrage prolonge l’univers {project}. Sa fin reste ouverte.',
  'Ephrem à la réalisation, Paapii au premier rôle. Le temps et la perception au centre.',
  'Le court métrage {project}. Tu peux le regarder sans vouloir tout résoudre tout de suite.',
  'Le film parle aussi de perception. Regarder vite, c’est un choix.',
  'Du temps, de la perception et une fin qui te laisse de la place.',
 ]);
 add('locations','ASK_FILM_LOCATIONS',[
  'Autour de Paris et de Cergy. Il y a aussi le train et le cabinet.',
  'Paris, Cergy, le train, le cabinet : ce sont les repères du tournage.',
  'Le tournage passe par Paris, Cergy, le train et le cabinet.','Paris et Cergy, avec des passages dans le train et au cabinet.',
  'Paris, Cergy, train, cabinet. Tu regardais les lieux ou pas ?',
  'Le train et le cabinet font partie du décor. Paris et Cergy aussi.',
  'Entre Paris, Cergy, le train et le cabinet. Les lieux ont leur place.',
 ]);
 add('ending','ASK_FILM_ENDING',[
  'La fin est volontairement ouverte.','Le film ne ferme pas toutes les interprétations.',
  'La fin laisse une place à ta lecture.','Le temps et la perception comptent. La fin reste ouverte.',
  'Tu veux une conclusion unique ? Le film te la laisse pas.',
  'La fin est ouverte. C’est pas un oubli.', 'La fin ne choisit pas tout à ta place.',
 ]);
 add('friendship','ASK_ARTIST_RELATION',[
  'Manii et Paapii sont amis d’enfance.','Ils se connaissent depuis l’enfance.',
  'Des amis d’enfance. Le projet musical, ils le portent ensemble.','Leur amitié remonte à l’enfance.',
  'Depuis longtemps. Amis d’enfance.','Ils se sont pas rencontrés pour remplir une pochette.',
  'Amis d’enfance. Certaines histoires commencent bien avant un projet.',
 ]);
 add('actor','ASK_FILM_ACTOR',[
  'Paapii est l’acteur principal.','Le rôle principal est tenu par Paapii.',
  'Paapii joue le premier rôle du court métrage {project}.','Paapii, aussi connu sous le nom de {paapii}.',
  'Paapii au premier rôle. Tu peux retenir ce visage.', 'Paapii. Tu l’as aussi entendu sur le projet.',
 ]);
 for(const [pair,winner,other]of [['bandite|tu-sais','Bandite','Tu sais'],['bandite|lpb','Bandite','LPB'],['tu-sais|lpb','Tu sais','LPB']])add('compare-'+pair,'ASK_TRACK_COMPARISON',[
  `${winner}, devant ${other}.`,`${winner}. Dans mon classement, il passe avant ${other}.`, `Entre les deux, je garde ${winner}.`,
 ],{comparison:pair});
 for(const [entity,texts]of Object.entries({
  bandite:['Bandite prend sa place sans demander la permission. C’est ce que j’aime.','Pour moi, Bandite passe devant. Il accroche tout de suite.','C’est mon goût. Bandite me retient plus que les autres.','Parce que je reviens à Bandite. Pas besoin d’une théorie.'],
  'tu-sais':['Tu sais me retient. C’est une préférence, pas une règle.','Tu sais passe devant LPB pour moi. Je le garde plus près.','Parce que je reviens à Tu sais. Simplement.','C’est mon classement. Tu sais y a sa place.'],
  lpb:['LPB reste dans mon trio. Je lui garde une place.','La plus belle me reste en tête. C’est mon goût.','LPB ferme mon podium. Ça veut pas dire que je l’oublie.','Parce que je garde LPB avec les deux autres.'],
 }))add('reason-'+entity,'ASK_PREFERENCE_REASON',texts,{entity});
 add('track-lpb','ASK_MUSIC',[
  'LPB, c’est La plus belle.','La plus belle. LPB, en abrégé.','LPB ferme mon trio, derrière Bandite et Tu sais.',
 ],{entity:'lpb'});
 add('track-bandite','ASK_MUSIC',[
  'Bandite est mon préféré sur KAIROS.','Bandite passe devant Tu sais et LPB dans mon classement.','Bandite. Celui que je garde en premier.',
 ],{entity:'bandite'});
 add('track-tu-sais','ASK_MUSIC',[
  'Tu sais est dans mon trio, entre Bandite et LPB.','Tu sais passe après Bandite dans mon classement.','Tu sais. Je le garde devant LPB.',
 ],{entity:'tu-sais'});
 const api={facts,tracks,groups,isCanonical:entry=>!!entry.loreId && registry.get(entry.loreId)===entry.text};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SoriakLore=api;
})(globalThis);
