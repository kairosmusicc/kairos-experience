/* Offline unit tests: no packages, provider, endpoint or credentials. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const I=require('../soriak-intents.js'),R=require('../soriak-responses.js'),P=require('../soriak-policy.js');
const {selectReply,SoriakChat}=require('../soriak-chat.js');
const fixtures=require('./fixtures/soriak_intents.json');
const context=overrides=>P.context({abegHintStage:3,timeHintStage:2,...overrides});
const memory=()=>({seed:'repeatable-test-session',turn:0,used:{}});
test(`${fixtures.length} realistic messages: normalization, SMS, accents, priorities, ambiguity, whole words`,()=>{
 for(const [message,expected]of fixtures)assert.equal(I.classify(message).intent,expected,message);
 assert.equal(I.normalize('  T’ES  QUI ? '),'tu es qui');
 assert.equal(I.classify('aide code').intent,'ASK_HINT');
 assert.equal(I.classify('fichiers musique').ambiguous,true);
 assert.equal(I.classify('décodage').intent,'USER_RANDOM');
});
test('44 intentions; at least 300 unique short written responses; no answers at any stage',()=>{
 assert.equal(I.definitions.length,44);assert.ok(R.total()>=300);
 for(const group of R.groups)for(const item of group.responses){
  const text=item.text.replace('{track}','TU SAIS');
  assert.ok(text.length<=160,item.id);assert.ok(!P.containsAnswer(text),item.id);
  assert.ok(P.allowed({...item,text,clue:group.clue},context({abegAttempts:7,timeAttempts:5})),item.id);
  if(group.clue)assert.ok(!P.allowed({...item,text,clue:group.clue},context({})),item.id);
 }
 console.log(R.total()+' unique written responses');
});
test('earned stages, solved contradictions, calls, visits, music and relationship gates',()=>{
 const ask=(message,c)=>selectReply(message,context(c),memory());
 assert.ok(!/date|autrement|ordre/.test(ask('donne code abeg',{abegAttempts:1}).text));
 assert.match(ask('aide abeg',{abegAttempts:5}).text,/date/);
 assert.match(ask('aide abeg',{abegAttempts:7}).text,/date|ordre|autrement/);
 assert.equal(ask('aide abeg',{abegAttempts:5,abegHintStage:0}).clue,null);
 assert.match(ask('code abeg',{abegUnlocked:true}).text,/ouvert|ouverte|déverrouillé/);
 assert.ok(!/date|ordre/.test(ask('indice tout gacher',{timeAttempts:5}).text));
 assert.notEqual(ask("c'était toi ?",{}).text,ask("c'était toi ?",{callDeclined:true}).text);
 assert.notEqual(ask('les fichiers',{}).text,ask('les fichiers',{visitedApps:['files']}).text);
 assert.notEqual(ask('musique',{}).text,ask('musique',{recentlyPlayed:[{title:'TU SAIS'}]}).text);
 assert.notEqual(ask('je suis perdu',{}).text,ask('je suis perdu',{soriakRelationshipLevel:8}).text);
 const m=memory();ask('musique',{});selectReply('musique',context({}),m);
 const next=selectReply("j'y arrive pas",context({abegAttempts:5}),m);assert.equal(next.target,'abeg');assert.match(next.text,/date/);
});
test('stable weighted selection, bounded persisted per-intent memory, no consecutive repetition',()=>{
 const m=memory(),game=context({abegAttempts:7,timeAttempts:5,visitedApps:['files'],recentlyPlayed:[{title:'TU SAIS'}]});const original=JSON.stringify(game);
 for(const message of ['salut','donne code abeg','jcomprends rien','t es nul','encore','un nuage mange ma chaussure']){
  let previous='';const seen=new Set();
  for(let i=0;i<50;i++){const r=selectReply(message,game,m);assert.notEqual(r.text,previous);assert.ok(!P.containsAnswer(r.text));seen.add(r.text);previous=r.text;}
  assert.ok(seen.size>=4,message);
 }
 assert.equal(JSON.stringify(game),original,'only dialogue memory may change');
 assert.ok(Object.values(m.used).every(ids=>ids.length<=3));assert.ok(Object.keys(m.used).length<=I.definitions.length);
 const restored=JSON.parse(JSON.stringify(m));assert.deepEqual(selectReply('salut',game,m),selectReply('salut',game,restored));
 for(const c of [{},{abegAttempts:7,timeAttempts:5}])for(let i=0;i<20;i++)assert.equal(selectReply('xylophone cosmique',context(c),memory()).clue,null);
});
test('no transport or key configuration; interrupted old requests migrate locally once',async()=>{
 const state={aiRequests:18,thread:[{id:'user:old',role:'user',text:'t qui',at:1,source:'interactive'}],pendingRequest:{id:'user:old',message:'t qui',at:1}};
 let delivered=0;
 const chat=new SoriakChat({state,legacy:[],context:()=>context({}),persist:()=>{},changed:()=>{},received:()=>{delivered++;}});
 chat.start();chat.start();assert.equal(delivered,1);assert.equal(state.thread.length,2);
 assert.ok(!('aiRequests'in state));assert.ok(!('pendingRequest'in state));
 assert.equal(await chat.send(' '),false);assert.equal(await chat.send('x'.repeat(361)),false);
 const source=fs.readFileSync(require.resolve('../soriak-chat.js'),'utf8');
 assert.ok(!/fetch\(|AbortController|\/api\/|OPENAI_API_KEY|SORIAK_MODEL|maxReplies/.test(source));
 assert.ok(!fs.existsSync(require.resolve('../soriak-chat.js').replace('soriak-chat.js','api/soriak.js')));
});
