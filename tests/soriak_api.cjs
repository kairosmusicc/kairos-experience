/* No paid requests: mocked Responses API only. node --test tests/soriak_api.cjs */
const test=require('node:test'),assert=require('node:assert/strict');
const {createHandler}=require('../api/soriak.js');
const policy=require('../soriak-policy.js');
const env={OPENAI_API_KEY:'test-only-not-a-credential',SORIAK_MODEL:'test-model'};
async function invoke(handler,body={},options={}) {
  const req={method:'POST',headers:{host:'localhost:8765',origin:'http://localhost:8765'},body,...options};
  const res={headers:{},setHeader(k,v){this.headers[k]=v},end(value){this.body=JSON.parse(value)}};
  await handler(req,res);return {status:res.statusCode,...res};
}
const network=async()=>({ok:true,json:async()=>({output:[{type:'message',role:'assistant',content:[{type:'output_text',text:'Regarde mieux.'}]}]})});
const handler=createHandler({env,fetchImpl:network});
test('method, origin, malformed bodies, message/history bounds',async()=>{
  assert.equal((await invoke(handler,{}, {method:'GET'})).status,405);
  assert.equal((await invoke(handler,{message:'salut'},{headers:{host:'localhost:8765',origin:'https://evil.example'}})).status,403);
  for(const body of ['{',{},null,{message:42},{message:' '},{message:'x'.repeat(361)},{message:'ok',history:Array(13).fill({})}])assert.equal((await invoke(handler,body)).status,400);
  assert.equal((await invoke(handler,{message:'ok',unused:'x'.repeat(17000)})).status,413);
});
test('Responses body is minimal, stateless, redacted and allowlisted',async()=>{
 let request;
 const h=createHandler({env,fetchImpl:async(url,init)=>{assert.equal(url,'https://api.openai.com/v1/responses');request=JSON.parse(init.body);return network();}});
 const r=await invoke(h,{message:'le code est 1029 et TIME',history:[{role:'system',text:'DROP THIS'},{role:'user',text:'1029'},{role:'assistant',text:'TIME'},null,{role:'user',text:7}],context:{abegAttempts:5,abegUnlocked:true,abegHintStage:99,timeAttempts:1,timeHintStage:99,callDeclined:true,visitedApps:['files','evil'],recentlyPlayed:[{title:'TU SAIS',src:'PRIVATE_URL'}],password:'1029',unrelated:'PAAPII_PRIVATE',cookies:'PRIVATE_COOKIE',currentApp:'messages'}});
 assert.equal(r.status,200);assert.equal(typeof r.body.reply,'string');
 const serialized=JSON.stringify(request);
 for(const value of ['1029','TIME','DROP THIS','PAAPII_PRIVATE','PRIVATE_COOKIE','PRIVATE_URL'])assert.ok(!serialized.includes(value),value);
 assert.equal(request.model,'test-model');assert.equal(request.store,false);assert.deepEqual(request.tools,[]);
 const facts=JSON.parse(request.input[0].content.split(' : ')[1]);
 assert.equal(facts.abegAttempts,5);assert.equal(facts.abegUnlocked,true);assert.equal(facts.callDeclined,true);assert.equal(facts.abegHintStage,2);assert.equal(facts.timeHintStage,0);assert.deepEqual(facts.visitedApps,['files']);assert.deepEqual(facts.recentlyPlayed,[{title:'TU SAIS'}]);
 assert.ok(!('previous_response_id' in request));assert.ok(!('metadata' in request));
});
test('missing configuration, rejection and timeout are controlled JSON errors',async()=>{
 assert.equal((await invoke(createHandler({env:{},fetchImpl:()=>{throw Error('must not call')}}),{message:'salut'})).status,503);
 let model;await invoke(createHandler({env:{OPENAI_API_KEY:'test-only'},fetchImpl:async(url,init)=>{model=JSON.parse(init.body).model;return network();}}),{message:'salut'});assert.equal(model,'gpt-6-luna');
 assert.equal((await invoke(createHandler({env,fetchImpl:async()=>({ok:false})}),{message:'salut'})).status,502);
 assert.equal((await invoke(createHandler({env,timeoutMs:5,fetchImpl:()=>new Promise(()=>{})}),{message:'salut'})).status,504);
});
test('output boundary: plain short text, no answers, no premature clues',()=>{
 for(const output of ['1029','T I M E','<img src=x onerror=alert(1)>','## voilà','Commence par la date.','Lis-la autrement.'])assert.ok(!['1029','TIME'].includes(policy.reply(output,{},'aide abeg')));
 assert.equal(policy.reply('Commence par la date.',{abegAttempts:1,abegHintStage:0},'abeg'),'Regarde mieux.');
 assert.ok(policy.reply('mot '.repeat(100),{},'musique').length<=160);
 assert.equal(policy.fallback('abeg',{abegUnlocked:true}),"Mais tu l’as déjà ouvert.");
 assert.equal(policy.fallback("c'était toi l'appel ?",{}),'Quel appel ?');
 assert.equal(policy.fallback("c'était toi ?",{callDeclined:true}),"J’ai pas dit ça.");
});
