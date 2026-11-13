/* Fully local dialogue: classification + gated content + bounded anti-repetition memory. */
(function(root){
 const node=typeof module!=='undefined' && module.exports;
 const policy=node?require('./soriak-policy.js'):root.SoriakPolicy;
 const intents=node?require('./soriak-intents.js'):root.SoriakIntents;
 const content=node?require('./soriak-responses.js'):root.SoriakResponses;
 function hash(value){let n=2166136261;for(const ch of String(value))n=Math.imul(n^ch.charCodeAt(0),16777619);return n>>>0;}
 function matches(requires,c,target,classification={}){
  return Object.entries(requires).every(([key,value])=>{
   if(key==='comparison')return classification.comparison===value;
   if(key==='entity')return classification.entity===value;
   if(key==='target')return target===value;
   if(key==='visited')return c.visitedApps.includes(value);
   if(key==='played')return c.recentlyPlayed.length>0;
   if(key==='minRelationship')return c.soriakRelationshipLevel>=value;
   return c[key]===value;
  });
 }
 function selectReply(message,raw,memory){
  const c=policy.context(raw),classification=intents.classify(message,c,memory);
  let groups=content.groups.filter(g=>g.intents.includes(classification.intent) && matches(g.requires,c,classification.target,classification));
  const priority=Math.max(...groups.map(g=>g.priority));
  groups=groups.filter(g=>g.priority===priority);
  const candidates=groups.flatMap(g=>g.responses.map(r=>({...r,clue:g.clue,text:r.text.replace('{track}',c.recentlyPlayed[0]?.title || 'ce morceau')}))).filter(r=>policy.allowed(r,c));
  memory.used ||= {};
  const recent=memory.used[classification.intent] || [];
  let available=candidates.filter(r=>!recent.includes(r.id) && r.text!==memory.lastReply);
  if(!available.length)available=candidates.filter(r=>r.text!==memory.lastReply);
  // A tiny pool can still avoid consecutive repetition without escalating hints.
  if(!available.length)available=content.groups.find(g=>g.id==='neutral').responses.filter(r=>r.text!==memory.lastReply);
  const total=available.reduce((n,r)=>n+r.weight,0);
  let position=hash(`${memory.seed}:${memory.turn || 0}:${classification.intent}`)/4294967296*total;
  let chosen=available[0];
  for(const entry of available){if(position<entry.weight){chosen=entry;break;}position-=entry.weight;}
  const text=policy.reply(chosen.text,c,chosen.clue,chosen.loreId);
  memory.used[classification.intent]=[chosen.id,...recent.filter(id=>id!==chosen.id)].slice(0,3);
  memory.lastReply=text;memory.lastIntent=classification.intent;
  if(classification.topic){memory.lastTopic=classification.topic;memory.lastImportantIntent=classification.intent;memory.lastEntity=classification.entity || null;}
  if(classification.target)memory.lastTarget=classification.target;
  for(const key of ['abegAttempts','timeAttempts','abegUnlocked','timeUnlocked'])memory[key]=c[key];
  memory.turn=(memory.turn || 0)+1;
  return {text,intent:classification.intent,target:classification.target,score:classification.score,ambiguous:classification.ambiguous,clue:chosen.clue || null,loreId:chosen.loreId || null,tone:chosen.tone || null};
 }
 class SoriakChat {
  constructor({state,legacy,context,persist,changed,received,debug=false}){
   Object.assign(this,{state,context,persist,changed,received,debug});this.busy=false;
   if(!Array.isArray(state.thread)){
    state.thread=legacy.map(m=>({...m})).sort((a,b)=>a.at-b.at);
    if(!state.thread.length)state.thread.push({id:'soriak-initial',role:'soriak',text:'Tu cherches quoi ?',at:Date.now(),source:'initial'});
   }
   state.thread=state.thread.filter(m=>m && ['user','soriak'].includes(m.role) && typeof m.text==='string').slice(-60);
   state.threadVersion=3;state.discovered=true;state.sequence=Number.isFinite(state.sequence)?state.sequence:0;
   state.dialogue ||= {seed:String(state.thread[0]?.at || Date.now()),turn:0,used:{},lastReply:state.thread.filter(m=>m.role==='soriak').at(-1)?.text || ''};
   // Retain an interrupted exchange from the former transport, without retrying it.
   if(state.pendingRequest && !state.pendingReply)state.pendingReply=state.pendingRequest;
   delete state.pendingRequest;delete state.aiRequests;
   this.persist();
  }
  start(){if(this.state.pendingReply)this.finish(this.state.pendingReply);}
  append(message){
   if(this.state.thread.some(m=>m.id===message.id))return;
   this.state.thread.push(message);this.state.thread=this.state.thread.slice(-60);
   if(message.role==='soriak')this.state.dialogue.lastReply=message.text;
   this.persist();
  }
  finish(pending){
   const decision=pending.reply || selectReply(pending.message,this.context(),this.state.dialogue);
   const message={id:'reply:'+pending.id,role:'soriak',text:policy.reply(decision.text,this.context(),decision.clue,decision.loreId),at:Date.now(),source:'interactive'};
   const duplicate=this.state.thread.some(m=>m.id===message.id);
   this.state.pendingReply=null;this.busy=false;
   if(!duplicate){this.append(message);this.received(message,{intent:decision.intent});}
   this.persist();this.changed();
  }
  async send(value){
   if(this.busy || typeof value!=='string')return false;
   const message=value.trim();if(!message || message.length>policy.maxMessage)return false;
   const pending={id:`user:${Date.now()}:${++this.state.sequence}`,message,at:Date.now()};
   this.busy=true;this.state.pendingReply=pending;
   this.append({id:pending.id,role:'user',text:message,at:pending.at,source:'interactive'});
   this.changed();
   // Presentation pacing only: no request, deadline, quota or connectivity requirement.
   await new Promise(resolve=>setTimeout(resolve,450));
   pending.reply=selectReply(message,this.context(),this.state.dialogue);
   if(this.debug)console.debug('[SORIAK]',{intent:pending.reply.intent,score:pending.reply.score});
   this.finish(pending);return true;
  }
 }
 if(node)module.exports={SoriakChat,selectReply,matches};else{root.SoriakChat=SoriakChat;root.SoriakDialogue={selectReply};}
})(globalThis);
