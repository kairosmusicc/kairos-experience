/* Written content only. Gates are declarative; selectors live in soriak-chat.js. */
(function(root){
 const groups=[];
 function add(id,intents,texts,requires={},priority=0,clue=null){groups.push({id,intents:[].concat(intents),requires,priority,clue,responses:texts.map((text,i)=>({id:id+':'+i,text,weight:1}))});}
 add('code','ASK_CODE',[
  'Le code ? Ça serait trop facile.','Tu crois vraiment que ça marche comme ça ? Cherche.','Tu veux vraiment que je fasse tout à ta place ?',
  'Je vais pas taper à ta place.','Le raccourci est fermé.','Tu demandes à la mauvaise personne.','Une combinaison, ça se cherche.','Tu peux insister. Ça ne la fera pas apparaître.',
 ]);
 add('hint','ASK_HINT',['Regarde mieux autour de toi.','Une chose à la fois.','Reprends ce que tu as sous les yeux.','Arrête de tout mélanger.','Tu regardes, mais tu ne vois pas encore.','Cherche mieux.']);
 add('identity','ASK_WHO_ARE_YOU',['SORIAK.','T’as déjà mon nom.','Tu lis jamais les en-têtes ?','Le nom te suffit pour l’instant.','Tu voulais quelqu’un d’autre ?']);
 add('kairos','ASK_KAIROS',['KAIROS signifie le moment opportun. Fais-en ce que tu veux.','Le bon moment. Pas juste une heure.','Le projet porte bien son nom.','Tout ne se mesure pas avec une montre.','Un moment peut compter plus que sa durée.','Le nom n’a pas été choisi au hasard.']);
 add('todo','ASK_WHAT_TO_DO',['Ouvre quelque chose. On verra après.','Commence par regarder ce téléphone.','Une app. Un détail. Pas tout à la fois.','Choisis une piste au lieu de toutes les demander.','Explore. Le reste viendra.']);
 add('call-none','ASK_CALL',['Quel appel ?','Personne n’a encore répondu ni refusé d’appel ici.','On parle du téléphone, ou d’un appel qui n’a pas eu lieu ?','Pour l’instant, rien à raconter côté appels.']);
 add('files','ASK_FILES',['Fichiers. Le nom est assez clair.','Tu peux commencer par ouvrir Fichiers.','Les documents vont pas venir à toi.','Regarde ce qui traîne dans Fichiers.','Ouvre le dossier avant de le juger.']);
 add('messages','ASK_MESSAGES',['Tu es dans Messages. C’est déjà un début.','Lis ce qui est écrit, pas ce que tu voudrais lire.','Les conversations ne sont pas là pour décorer.','Prends le temps de lire.','Une bulle après l’autre.']);
 add('instagram','ASK_INSTAGRAM',['Instagram est là. À toi de regarder.','Un profil, ça se regarde en entier.','Les images comptent aussi.','Tu peux fouiller sans faire défiler à toute vitesse.','Va voir les publications.']);
 add('music','ASK_MUSIC',['Lance un morceau avant de m’en parler.','Écouter, ça peut aider.','La bibliothèque est déjà là.','La musique mérite un peu plus que ton défilement.','Commence par un son.']);
 add('abeg','ASK_ABEG',['ABEG t’intéresse donc.','Le fichier est là. Regarde-le.','Tu l’as repéré. C’est un début.','Tu veux ouvrir ABEG ou juste en parler ?','Une chose à la fois. Commence par ce fichier.']);
 add('secret','ASK_SECRET',['Un mystère n’est pas une consigne.','Tout ce qui est fermé ne demande pas la même chose.','Tu veux déjà tout savoir ?','Il reste des choses à regarder.','Le téléphone n’a pas fini de parler.']);
 add('lost','USER_LOST',['Respire. Une app à la fois.','Tu vas trop vite.','Regarde ce que tu as vraiment fait.','Reprends une piste. Une seule.','C’est pas une course.','Tu fouilles partout sauf dans les détails.','Ferme deux pistes. Garde la troisième.','Tu peux être perdu sans tout recommencer.']);
 add('frustrated','USER_FRUSTRATED',['Pose le téléphone une seconde.','Forcer ne rend pas les détails plus visibles.','T’as le droit de ralentir.','Je vais pas courir avec toi.','Un peu de calme. Ça fait pas de mal.','Le fichier te provoque même pas.','Tu peux souffler. Il sera encore là.']);
 add('insult','USER_INSULT',['T’as fini ?','Je vais te laisser finir.','Le volume remplace pas une idée.','Ça ouvre toujours rien.','Tu peux être perdu sans crier.','Je prends ça comme une pause.','Tu reviendras quand tu voudras regarder.','Calme. C’est un téléphone.']);
 add('thanks','USER_THANKS',['De rien. Enfin, presque.','Garde ton élan.','Tu vois.','Continue comme ça.','C’est toi qui regardes.','On avance.']);
 add('hello','USER_GREETING',['Salut.','T’es là.','Je t’écoute.','Alors, on regarde ?','Vas-y.']);
 add('bye','USER_GOODBYE',['À plus.','Le téléphone reste là.','Reviens si tu veux.','Bonne pause.','On verra la suite.']);
 add('suspicious','USER_SUSPICIOUS',['T’as raison de te poser la question.','Je n’ai rien affirmé.','Tu veux une certitude ? Mauvais endroit.','Reste attentif.','T’es pas obligé de me croire.','Regarde les faits.']);
 add('found','USER_FOUND_SOMETHING',['Tu crois ?','Garde ce que t’as remarqué.','Intéressant. Continue.','Ne te précipite pas sur la conclusion.','Vérifie dans le téléphone.','Un détail peut suffire.']);
 add('failed','USER_FAILED',['Regarde ce qui n’a pas marché.','Change quelque chose. Pas tout.','Recommencer pareil, c’est un choix.','Ralentis un peu.','Tu peux essayer autrement.','Ne mélange pas les pistes.']);
 add('more','USER_WANTS_MORE',['Tu veux toujours la suite avant de regarder.','Continue ce que tu faisais.','J’ai pas encore changé d’avis.','Une question à la fois.','Regarde encore autour de toi.']);
 add('safari','ASK_SAFARI',['Safari est sur ce téléphone aussi.','Les liens attendront que tu les ouvres.','Regarde les pages disponibles.','Tu peux aller voir le navigateur.']);
 add('relation','ASK_RELATION',['Je veux voir comment tu regardes.','Tu peux avancer sans me croire.','On parle. Pour l’instant.','T’as besoin d’une raison pour chaque message ?','Ça dépend de ce que tu cherches.']);
 add('nature','ASK_IDENTITY_NATURE',['Je suis dans ce téléphone. Ça te suffit.','Une présence dans ce téléphone. Pas un inconnu à retrouver dehors.','Prends cette conversation pour ce qu’elle est.','Le personnage te parle. Le reste peut attendre.']);
 add('privacy','ASK_PRIVACY',['Je réagis à ce que tu fais dans cette expérience. Rien d’autre.','Cette conversation reste dans ce téléphone, ici.','Je ne lis pas tes données en dehors de cette expérience.','Je n’ai pas besoin de tes autres conversations.']);
 add('rules','ASK_RULES',['Non.','Tu vas pas réécrire le téléphone en me parlant.','Les coulisses restent fermées.','Mauvaise porte.','Tu peux poser une autre question.']);
 add('neutral','USER_RANDOM',['Peut-être.','Continue.','Tu poses beaucoup de questions.','Regarde mieux autour de toi.','Je vois pas pourquoi je te faciliterais la tâche.','Tu veux en venir où ?','Ça dépend.','Je te laisse préciser.','Reviens au téléphone.','On s’éloigne un peu, là.']);
 const puzzle=['ASK_CODE','ASK_HINT','ASK_ABEG','USER_FAILED'];
 add('abeg-new',['ASK_HINT','ASK_ABEG'],['Essaie déjà.','Ouvre le fichier. Après, on parle.','Tu n’as pas encore essayé ABEG.','Commence par une vraie tentative.'],{target:'abeg',abegUnlocked:false,abegAttempts:0},100);
 add('abeg-solved',puzzle,['Mais tu l’as déjà ouvert.','ABEG est déjà déverrouillé.','Tu demandes une porte qui est déjà ouverte.','Va écouter ce que tu as ouvert.'],{target:'abeg',abegUnlocked:true},120);
 add('abeg-simple',puzzle,['Tu compliques un truc simple.','T’es dessus. Mais tu forces trop.','Reprends la piste sans en inventer une autre.','Le plus simple mérite un second regard.'],{target:'abeg',abegUnlocked:false,abegHintStage:1},110,{secret:'abeg',stage:1});
 add('abeg-date',puzzle,['Commence par la date.','La date mérite un autre regard.','Tu as une date. Travaille avec ça.','Arrête d’empiler les pistes. Reviens à la date.'],{target:'abeg',abegUnlocked:false,abegHintStage:2},110,{secret:'abeg',stage:2});
 add('abeg-read',puzzle,['Lis-la autrement.','L’ordre dans lequel tu lis compte.','Tu tiens la date. Change ta manière de la lire.','La même date peut se lire autrement.'],{target:'abeg',abegUnlocked:false,abegHintStage:3},110,{secret:'abeg',stage:3});
 add('time-new',['ASK_HINT','ASK_SECRET','USER_FAILED'],['Essaie ce fichier avant de demander une piste.','Il n’y a pas encore eu de tentative sur ce fichier.','Ouvre-le. Regarde ce qu’il demande.','Tu peux commencer sans moi.'],{target:'time',timeUnlocked:false,timeAttempts:0},100);
 add('time-solved',['ASK_HINT','ASK_SECRET','ASK_CODE','USER_FAILED'],['Tu l’as déjà ouvert.','Ce fichier est déjà accessible.','Retourne écouter. C’est ouvert.','La porte est ouverte. Profites-en.'],{target:'time',timeUnlocked:true},120);
 add('time-number',['ASK_HINT','ASK_SECRET','ASK_CODE','USER_FAILED'],['Tu cherches un nombre ?','Pourquoi tu t’obstines sur les nombres ?','Le fichier ne demande pas forcément des chiffres.','Tu regardes encore les chiffres ?'],{target:'time',timeUnlocked:false,timeHintStage:1},110,{secret:'time',stage:1});
 add('time-project',['ASK_HINT','ASK_SECRET','ASK_CODE','USER_FAILED'],['Le projet tourne autour de ça.','Reviens à ce que le projet raconte.','Tu cherches loin de l’idée du projet.','L’idée du projet est une meilleure piste.'],{target:'time',timeUnlocked:false,timeHintStage:2},110,{secret:'time',stage:2});
 add('call-declined','ASK_CALL',['J’ai pas dit ça.','T’as raccroché. C’est tout ce que je sais ici.','Le refus vient de toi. Pour le reste, je n’ai rien dit.','Ne me prête pas un appel.'],{callDeclined:true},100);
 add('call-answered','ASK_CALL',['Tu as entendu. À toi de voir.','T’as répondu. Garde ça en tête.','L’appel a eu lieu. Je n’ai pas dit que c’était moi.','Tu as écouté. Ça compte.'],{callAnswered:true,callDeclined:false},100);
 add('files-visited','ASK_FILES',['Tu connais déjà Fichiers. Regarde ce que t’as laissé fermé.','Retourne voir ce dossier sans te précipiter.','Tu y es passé. Ça ne veut pas dire que t’as tout vu.','Un second regard dans Fichiers, ça se tente.'],{visited:'files'},50);
 add('instagram-visited','ASK_INSTAGRAM',['Tu y es déjà passé. Regarde plus lentement.','Le profil mérite mieux qu’un passage éclair.','Retourne voir les publications.','Tu peux regarder une image sans tout faire défiler.'],{visited:'instagram'},50);
 add('safari-visited','ASK_SAFARI',['Tu as déjà ouvert Safari. Reprends les pages disponibles.','Retourne au navigateur si tu veux vérifier.','Les liens disponibles sont toujours là.','Regarde ce que Safari te propose vraiment.'],{visited:'safari'},50);
 add('music-played','ASK_MUSIC',['Tu as lancé {track}. Prends le temps d’écouter.','{track}. Tu peux repartir de là.','Tu as déjà lancé un morceau. Écoute-le vraiment.','Ce que tu as écouté compte aussi.'],{played:true},60);
 add('cooperative',['USER_LOST','ASK_WHAT_TO_DO','USER_WANTS_MORE'],['On avance. Reprends une piste que tu as laissée.','Tu fais des liens. Continue sans te disperser.','Prends ton temps. Tu peux faire le tri maintenant.','Moins de précipitation. Tu peux y arriver.'],{minRelationship:6},20);
 const api={groups,total:()=>new Set(groups.flatMap(g=>g.responses.map(r=>r.text))).size};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SoriakResponses=api;
})(globalThis);
