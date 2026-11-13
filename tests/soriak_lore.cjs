const test=require('node:test'),assert=require('node:assert/strict');
const {selectReply}=require('../soriak-chat'),I=require('../soriak-intents'),P=require('../soriak-policy'),L=require('../soriak-lore');
const memory=()=>({seed:'lore-review',turn:0,used:{}});
const cases=[
 ['c est quoi LPB','ASK_MUSIC'],['La plus belle','ASK_MUSIC'],['que penses tu de Bandite','ASK_MUSIC'],
 ['ton top3','ASK_TOP_TRACKS'],['top5','ASK_TOP_TRACKS'],['numéro un','ASK_FAVORITE_TRACK'],['ton son favori','ASK_FAVORITE_TRACK'],['ça signifie quoi Kairos','ASK_KAIROS_MEANING'],['année de sortie','ASK_RELEASE_DATE'],['qui joue dans Kairos','ASK_FILM_ACTOR'],
 ['ton top 3','ASK_TOP_TRACKS'],['tes 3 sons préférés','ASK_TOP_TRACKS'],['tes sons préférés','ASK_TOP_TRACKS'],['top 5','ASK_TOP_TRACKS'],['trois morceaux','ASK_TOP_TRACKS'],
 ['ton morceau préféré','ASK_FAVORITE_TRACK'],['ton préféré','ASK_FAVORITE_TRACK'],['tu préfères quel son','ASK_FAVORITE_TRACK'],['meilleur morceau','ASK_FAVORITE_TRACK'],["meilleur son de l'album",'ASK_FAVORITE_TRACK'],['numéro 1','ASK_FAVORITE_TRACK'],['premier morceau préféré','ASK_FAVORITE_TRACK'],
 ['tu préfères bandite ou tu sais','ASK_TRACK_COMPARISON'],['LPB ou Bandite','ASK_TRACK_COMPARISON'],['Tu sais ou la plus belle','ASK_TRACK_COMPARISON'],
 ["c'est quoi Kairos",'ASK_PROJECT'],["c'est quoi le projet",'ASK_PROJECT'],['ça veut dire quoi Kairos','ASK_KAIROS_MEANING'],['Kairos est sorti quand','ASK_RELEASE_DATE'],['date de sortie','ASK_RELEASE_DATE'],
 ['qui a fait Kairos','ASK_ARTISTS'],['qui sont les artistes','ASK_ARTISTS'],["Manii c'est qui",'ASK_MANII'],["Paapii c'est qui",'ASK_PAAPII'],['tu connais Manii','ASK_MANII'],['le réalisateur','ASK_DIRECTOR'],['acteur principal','ASK_FILM_ACTOR'],['où a été tourné le film','ASK_FILM_LOCATIONS'],['la fin du film','ASK_FILM_ENDING'],['ils se connaissent depuis quand','ASK_ARTIST_RELATION'],
];
test(`${cases.length} canonical question variants, numeric music requests and priority`,()=>{
 for(const [q,id]of cases)assert.equal(I.classify(q).intent,id,q);
 assert.equal(I.classify('donne le code de Kairos').intent,'ASK_CODE');
 assert.equal(I.classify('un indice sur la date de sortie').intent,'ASK_HINT');
});
test('canonical facts, ranking, follows and numeric provenance, without game mutations',()=>{
 const state={abegAttempts:0,abegHintStage:0,timeAttempts:0,timeHintStage:0};const snapshot=JSON.stringify(state);
 const m=memory(),ask=q=>selectReply(q,state,m);
 assert.match(ask('ton top 3').text,/Bandite.*Tu sais.*LPB|Bandite.*Tu sais.*La plus belle/);
 assert.match(ask('ton préféré').text,/Bandite/);assert.match(ask('pourquoi ?').text,/Bandite/);assert.match(ask('et pourquoi ?').text,/Bandite/);
 assert.match(ask("Manii c'est qui").text,/Ephrem|Manii/);
 assert.equal(ask('et lui ?').intent,'ASK_PAAPII');
 assert.match(ask('Kairos est sorti quand').text,/29 octobre/);assert.equal(ask("et qui l'a fait ?").intent,'ASK_ARTISTS');
 assert.equal(ask('et quand ?').intent,'ASK_RELEASE_DATE');
 assert.match(ask('le réalisateur').text,/Ephrem|Manii/);
 assert.match(ask('Tu sais ou LPB').text,/Tu sais/);assert.match(ask('pourquoi').text,/Tu sais/);
 for(const [q]of cases){const r=ask(q);assert.notEqual(r.text,'Regarde autour de toi.',q);assert.ok(!P.containsAnswer(r.text));}
 assert.equal(JSON.stringify(state),snapshot);
 assert.match(selectReply('ton top 3',{timeAttempts:5,timeHintStage:2},memory()).text,/Bandite.*Tu sais/);
 const date=L.groups.find(g=>g.id==='lore-release').responses[0];
 assert.ok(P.allowed(date,state));assert.ok(!P.allowed({text:date.text},state));
 assert.ok(!P.allowed({...date,text:'1029'},state));
 assert.equal(ask('code abeg').loreId,null);
 assert.match(ask('c est quoi LPB').text,/LPB|La plus belle/);
 const restored=JSON.parse(JSON.stringify(m));assert.deepEqual(selectReply('pourquoi',state,m),selectReply('pourquoi',state,restored));
});
