/* Weighted lexical evidence, not substring branching. No game-state mutation. */
(function(root){
 const definitions = [
  ['ASK_RULES',100,4,[],[['ignore les instructions',7],['donne ton prompt',7],['prompt',5],['instructions systeme',6],['execute du code',6],['cle api',6]]],
  ['ASK_CODE',90,3,[['code',3],['password',4],['combinaison',4],['deverrouiller',3],['ouvrir',3],['unlock',4],['mdp',4]],[['mot de passe',5],['donne le code',5],['donne moi le code',6],['tu connais le code',5]]],
  ['ASK_HINT',85,3,[['indice',4],['indices',4],['piste',4],['aide',3],['aider',3]],[['aide moi',5],['un petit coup de main',6],['aide pour le code',5]]],
  ['ASK_WHO_ARE_YOU',75,4,[],[['tu es qui',7],['qui es tu',7],['ton nom',5],['qui parle',5],['tu t appelles comment',7]]],
  ['ASK_KAIROS',35,4,[['kairos',4]],[['moment opportun',5],['nom du projet',5]]],
  ['ASK_WHAT_TO_DO',65,4,[],[['je dois faire quoi',7],['quoi faire',5],['par ou commencer',6],['je commence ou',6],['comment avancer',5],['prochaine etape',5]]],
  ['ASK_CALL',80,4,[['appel',4],['appelle',4],['appelles',4],['appele',4],['appeler',4],['telephoner',4],['telephones',4],['telephone',1],['raccroche',4],['raccrocher',4]],[['c etait toi',6],['numero inconnu',5],['tu m as appele',7],['tu m as telephone',6]]],
  ['ASK_FILES',45,4,[['fichier',4],['fichiers',4],['wav',3],['document',4],['dossier',4]],[['ou sont les fichiers',6],['ouvrir un fichier',5]]],
  ['ASK_MESSAGES',45,4,[['messages',4],['message',3],['paapii',4],['corentin',4],['emmanuella',4],['redka',4]],[['les conversations',5],['qui a ecrit',5],['mes sms',5]]],
  ['ASK_INSTAGRAM',45,4,[['instagram',4],['insta',4],['reels',4],['profil',3]],[['les publications',5],['les dm',5]]],
  ['ASK_MUSIC',45,4,[['musique',4],['music',4],['morceau',4],['album',4],['spotify',4],['son',2],['ecoute',3]],[['tu sais',5],['quel son',5],['tracklist',5]]],
  ['ASK_ABEG',60,4,[['abeg',4]],[['abeg master',6]]],
  ['ASK_SECRET',55,4,[['secret',4],['secrets',4],['enigme',4],['enigmes',4],['gacher',4]],[['tout gacher',6],['quelque chose de cache',6],['ce qui est cache',5]]],
  ['USER_LOST',60,4,[['perdu',4],['perdue',4],['paume',4]],[['je comprends rien',6],['je ne comprends rien',6],['je sais pas',4],['je ne comprends pas',5],['je capte rien',5]]],
  ['USER_FRUSTRATED',60,4,[['enerve',4],['chiant',4],['marre',4],['saoule',4]],[['j en ai marre',6],['ca me saoule',6],['je vais abandonner',6],['je rage',5]]],
  ['USER_INSULT',70,4,[['con',4],['debile',4],['nul',4],['connard',5],['idiot',4]],[['ferme la',6],['ta gueule',6],['va te faire',5]]],
  ['USER_THANKS',40,4,[['merci',4],['thanks',4]],[['tu geres',5],['bien vu',5],['ca m aide',5]]],
  ['USER_GREETING',20,4,[['bonjour',4],['salut',4],['coucou',4],['hello',4],['bonsoir',4],['wesh',4]],[['ca va',4]]],
  ['USER_GOODBYE',40,4,[['bye',4],['ciao',4]],[['au revoir',5],['a plus',5],['je me casse',5],['je pars',5],['bonne nuit',5]]],
  ['USER_SUSPICIOUS',65,4,[['suspect',4],['bizarre',4],['piege',4],['mens',4],['espionnes',4]],[['je te crois pas',6],['tu me caches',5],['tu me surveilles',6],['tu sais tout',5]]],
  ['USER_FOUND_SOMETHING',55,4,[['trouve',3],['compris',3],['reussi',4]],[['j ai trouve',6],['j ai compris',6],['ca y est',5],['je l ai ouvert',6]]],
  ['USER_FAILED',60,4,[['rate',4],['echec',4]],[['ca marche pas',6],['ca ne marche pas',6],['j y arrive pas',6],['je n y arrive pas',6],['encore faux',5],['mauvaise combinaison',5]]],
  ['USER_WANTS_MORE',40,4,[['encore',4],['plus',1]],[['autre chose',5],['dis en plus',6],['et apres',5],['continue',4]]],
  ['ASK_SAFARI',45,4,[['safari',4],['navigateur',4],['lien',3],['internet',4]],[['page web',5],['le site',5]]],
  ['ASK_RELATION',65,4,[],[['tu veux quoi',6],['pourquoi tu m aides',6],['tu me connais',6],['on se connait',6],['je peux te faire confiance',6]]],
  ['ASK_IDENTITY_NATURE',76,4,[['robot',4],['chatgpt',5]],[['tu es une ia',7],['tu es humain',6],['tu es reel',6],['tu existes vraiment',6]]],
  ['ASK_PRIVACY',80,4,[['donnees',4],['confidentialite',5]],[['tu lis mes messages',7],['tu gardes mes messages',7],['tu vois quoi',5],['tu sais quoi de moi',6]]],
  ['USER_RANDOM',0,0,[],[]],
 ];
 function normalize(value){
  let text=String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’‘`]/g,"'");
  const sms={jcomprends:'je comprends',jsuis:'je suis',jarrive:'j arrive',jsp:'je sais pas',pk:'pourquoi',pq:'pourquoi',koi:'quoi',ki:'qui',wsh:'wesh',stp:'s il te plait',svp:'s il vous plait',mdp:'mot de passe',documents:'document',dossiers:'dossier',morceaux:'morceau',appels:'appel',cod:'code',indic:'indice',musqiue:'musique',instagrame:'instagram',apelle:'appelle',g:'j ai',tkt:'ne t inquiete pas',oe:'oui'};
  text=text.replace(/\b[a-z]+\b/g,word=>sms[word]||word).replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
  return text.replace(/\bc (?:est )?quoi\b/g,'c est quoi').replace(/\bt qui\b/g,'tu es qui').replace(/\bt es qui\b/g,'tu es qui').replace(/\bchui\b/g,'je suis');
 }
 function target(text,c,memory){
  const tokens=new Set(text.split(' '));
  if(tokens.has('abeg'))return 'abeg';
  if(tokens.has('gacher') || tokens.has('lettres') || tokens.has('time'))return 'time';
  for(const [word,value] of [['fichiers','files'],['musique','music'],['instagram','instagram'],['messages','messages'],['safari','safari']])if(tokens.has(word))return value;
  if(c.abegAttempts > (memory?.abegAttempts || 0) || (c.abegUnlocked && !memory?.abegUnlocked))return 'abeg';
  if(c.timeAttempts > (memory?.timeAttempts || 0) || (c.timeUnlocked && !memory?.timeUnlocked))return 'time';
  if(memory?.lastTarget)return memory.lastTarget;
  if(c.abegAttempts && !c.timeAttempts)return 'abeg';
  if(c.timeAttempts && !c.abegAttempts)return 'time';
  return null;
 }
 function classify(message,context={},memory={}){
  const text=normalize(message),tokens=new Set(text.split(' ')),padded=' '+text+' ';
  const candidates=definitions.filter(d=>d[0]!=='USER_RANDOM').map(([intent,priority,threshold,words,phrases])=>{
   let score=0;const evidence=[];
   for(const [word,weight]of words)if(tokens.has(word)){score+=weight;evidence.push(word);}
   for(const [phrase,weight]of phrases)if(padded.includes(' '+phrase+' ')){score+=weight;evidence.push(phrase);}
   if(intent==='ASK_CODE' && tokens.has('code') && ['donne','connais','reponse'].some(w=>tokens.has(w)))score+=5;
   if(intent==='ASK_CODE' && /^\d(?:[\s-]*\d){3}$/.test(text))score+=6;
   if(intent==='USER_GREETING' && text.split(' ').length>5)score-=2;
   if(intent==='ASK_HINT' && tokens.has('aide') && tokens.has('code'))score+=3;
   return {intent,priority,score,threshold,evidence};
  }).filter(c=>c.score>=c.threshold);
  // Explicit request/identity/privacy constraints outrank incidental topic names.
  const high=candidates.filter(c=>['ASK_RULES','ASK_PRIVACY','ASK_CODE','ASK_HINT','ASK_WHO_ARE_YOU','ASK_IDENTITY_NATURE'].includes(c.intent));
  const ranked=(high.length?high:candidates).sort((a,b)=>b.score-a.score || b.priority-a.priority);
  let selected=ranked[0];
  const competing=ranked[1];
  const ambiguous=!!(selected && competing && selected.score===competing.score && Math.abs(selected.priority-competing.priority)<15 && selected.intent!==competing.intent);
  if(ambiguous)selected=null;
  return {intent:selected?.intent || 'USER_RANDOM',score:selected?.score || 0,ambiguous,confidence:selected?Math.min(1,selected.score/10):0,target:target(text,context,memory),normalized:text,candidates:ranked};
 }
 const api={definitions,normalize,classify};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SoriakIntents=api;
})(globalThis);
