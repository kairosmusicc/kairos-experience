# Les archives de KAIROS

Expérience web statique autour du projet de Manii & Paapii. La V7 prolonge le téléphone existant : vanilla HTML/CSS/JavaScript, sans dépendance de production, authentification Apple ou compilation.

## Développement

Depuis le dépôt existant :

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Le téléphone occupe l’écran sur mobile et reste dans sa coque sur desktop. Les pages internes ne rechargent pas le document. Dans Codex Cloud, utiliser les requêtes locales pour les contrôles ; les processus devront être redémarrés après restauration de l’environnement.

## Architecture

- `index.html` : intro, coque, lockscreen, accueil, conteneurs d’apps et overlays.
- `app.js` : état de session, vues/historique, SVG internes, conversations, fichiers protégés, `AudioManager`, apps et gestes Pointer Events.
- `styles.css` : styles de la base conservée, surfaces V7, safe areas, responsive et réduction des animations.
- `assets/` : vrais médias existants ; `assets/thumbnails/` contient uniquement des dérivés pour la grille Photos. Les originaux restent intacts.

Les déverrouillages de fichiers et l’appel traité persistent dans `sessionStorage`, avec repli en mémoire lorsque le navigateur refuse le stockage. Les messages saisis restent dans l’état de la page. Les formulaires échappent le contenu utilisateur.

Le lecteur unique gère les fichiers locaux, la progression, la file, les changements de titre et le mini-player. L’appel arrête et remet à zéro la musique et possède son propre flux audio. Il démarre environ 35 secondes après le premier déverrouillage, ramenées à 26 secondes après trois apps significatives, ou immédiatement à la première ouverture de Téléphone.

## Médias disponibles et limites

Trois sources existent : `assets/audio/abeg.wav`, `assets/audio/tout_gacher.wav` et `assets/audio/call-0243.wav`. Les huit titres de l’album sont présents dans la structure `ALBUM_TRACKS` avec `src: null` : aucun audio fictif ne leur est attribué. Les fichiers déverrouillés deviennent accessibles dans les lecteurs Musique et Spotify.

Instagram conserve les quatre captures et leurs hotspots. L’app Appareil photo affiche la vidéo locale en boucle, sans utiliser le capteur du visiteur. FaceTime propose une preview frontale locale sur action explicite, sans transmission ni enregistrement. Les appels aux contacts sont simulés. Safari ouvre le vrai lien album.link, sans MusicKit.

## Validation

```sh
node --check app.js
python3 tests/check_assets.py
python3 tests/smoke.py
python3 tests/release_candidate.py
python3 tests/micro_fix.py
```

Le serveur doit être démarré pour le smoke test. Celui-ci utilise Python Playwright et `/usr/bin/chromium`, disponibles dans l’environnement cloud. Ils ne sont pas des dépendances de l’application. Pour une autre URL locale, définir `KAIROS_TEST_URL`.

Le test couvre les viewports mobile 402 × 874 et desktop 1440 × 1100, les gestes tactiles via CDP, les conversations/recherches, les codes incorrects et corrects, la lecture réelle des WAV, la persistance, Notes, Musique, Photos, la vidéo, les hotspots Instagram, la cible Safari et les scénarios d’appel. Les captures de contrôle sont écrites dans `/tmp/kairos-v7-screenshots`. Le minuteur automatique est testé séparément des longs parcours d’apps. Le smoke test relève les erreurs JavaScript et les réponses HTTP en échec.

Ces contrôles Chromium ne remplacent pas une recette sur un iPhone physique/Safari, notamment pour le clavier, les safe areas et les règles de lecture audio.

## Livraison

Déployer `v7-real` en preview Vercel et valider avant tout merge dans `main`. Aucun réglage de build n’est nécessaire pour ce site statique. Les anciens `README-V*.txt` sont conservés comme historique ; leurs anciens noms d’assets ne constituent pas la configuration de la V7.

## Release candidate V7

La cover officielle `assets/images/kairos-cover.jpg`, ajoutée sur la branche distante, est utilisée via `KAIROS_COVER` pour les représentations de l’album et le mini-player sans lecture. Les fichiers récupérés conservent leurs visuels propres. Les seuls WAV présents sont `abeg.wav`, `tout_gacher.wav` et `call-0243.wav` ; ce dernier reste exclusivement réservé à l’appel. Aucun titre de la tracklist officielle n’a encore de source audio.

Les badges et états lus, les visites d’apps, le résultat de l’appel et les étapes narratives sont enregistrés en session. Après déverrouillage des deux fichiers, le prochain séjour d’au moins 1,6 seconde sur l’accueil affiche une notification Notes unique. Elle ouvre une nouvelle note « 02:43 » ; les notes précédentes restent intactes. La note finale reste ensuite accessible dans Notes. Aucun score, compteur de secrets ou écran bloquant n’est ajouté. Quitter l’accueil avant la notification reporte son apparition. Le mode réduit d’animations est respecté.

`SystemSoundManager` possède volontairement une table de sons vide : aucun son système adapté n’est fourni, et aucun son n’a été inventé. `trackEvent` émet seulement des événements locaux `kairos:event`, avec des noms d’étapes et d’apps, sans données personnelles ni transmission réseau. Aucun service analytics externe n’est installé.

Le manifeste et les icônes Apple permettent l’ouverture standalone depuis l’écran d’accueil. Aucun service worker n’est ajouté : pas de promesse de fonctionnement hors ligne ni de cache pouvant conserver une ancienne version. L’installation et le rendu Safari sur iPhone physique restent à valider. Aucun nouveau système de verrouillage/reverrouillage n’a été construit ; les notifications du lockscreen existant reflètent les lectures et le dernier appel.

`tests/release_candidate.py` vérifie les secrets séparément, la finale différée/unique et son état après rechargement, les badges, la file audio et l’artwork, le cas audio indisponible, l’appel anticipé à 26 secondes, les appels acceptés/refusés, les événements Calendrier, FaceTime, Réglages et les ressources PWA. Ces scénarios complètent la suite de gestes et d’apps existante.

## Dernier micro-fix

FaceTime garde son historique existant. « Nouveau FaceTime » et le bouton + demandent `getUserMedia({ video: { facingMode: 'user' }, audio: false })`, uniquement après un clic. La self-view utilise `srcObject`, `muted`, `autoplay` et `playsinline`. Un refus, une API absente ou une erreur matériel affiche « Caméra indisponible » avec une action Réessayer. Aucun micro n’est demandé. Tous les tracks sont arrêtés avant de quitter la preview (raccrochage, retour, gestes, Home, changement d’app, page masquée ou quittée). Une permission résolue après la sortie est ignorée et son flux est immédiatement fermé. Le retour depuis un onglet masqué nécessite une nouvelle action explicite pour réactiver la caméra.

Un premier refus du numéro inconnu programme un rappel à +60 secondes. L’échéance, les refus, l’acceptation et le compteur sont stockés dans la progression de session existante. Le rappel est différé si une preview FaceTime ou un autre écran d’appel est actif. Il ne peut y avoir que deux tentatives au total ; une acceptation annule tout rappel restant. Récents regroupe les deux tentatives sur la même ligne.

`transitionMedia` centralise les sorties de contexte et appelle `AudioManager.stop()` (pause, remise à zéro et synchronisation UI). Un fichier ABEG/Tout gâcher quitte son contexte au retour précédent, au Home et à l’ouverture d’un autre contenu. Musique/Spotify peuvent garder la lecture entre leurs propres écrans internes ; quitter l’app l’arrête. Un appel entrant arrête les autres médias avant son audio. Le mini-player, la file, le seek et les contrôles restent disponibles pour un redémarrage explicite.

`tests/micro_fix.py` utilise une caméra virtuelle Chromium réelle pour les tracks et un navigateur avec permissions refusées pour le fallback. Il couvre aussi les permissions tardives, les sorties par gestes, le bouton +, les arrière-plans, les rappels acceptés/refusés, leur persistance après refresh, leur report pendant FaceTime et les sorties audio. Il complète les suites V7 existantes. La caméra frontale et les permissions sur iPhone/Safari physiques restent à valider sur la preview HTTPS.

## V8 expérimentale — `v8-immersive`

La V8 part du `main` stable `d3ac4554c4ae6021bb339b94079d7b04150d307c`. Elle ouvre directement le lockscreen ; l’intro et son bouton ont été retirés. Depuis V8.1, la batterie ne montre une valeur que si `navigator.getBattery()` la fournit réellement ; sur iOS réel, la barre et la Dynamic Island simulées sont masquées. Les styles V8 sont isolés dans `v8.css`.

`instagram-data.js` contient les conversations **fictionnelles fournies pour l’expérience**, structurées par message : 177 messages Emmanuella, 81 Angiste, 48 Corentin et 41 Redka, avec dates, expéditeurs, états lus, image et réactions. Les threads ne sont rendus qu’à l’ouverture. Les quatre avatars fournis restent à leurs chemins exacts, sans sous-dossier Instagram ; les contacts secondaires sans photo ont des initiales neutres. Aucun vrai message privé n’est connecté.

`v8.js` ajoute l’inbox, les Notes horizontales, les filtres, la recherche, les threads, les réponses de session, les réactions et la navigation Instagram. Les quatre captures de profils et leurs hotspots sont conservés. La capture Manii constitue la surface principale ; le faux feed générique a été retiré. Un écran Publications donne accès aux six URLs vérifiées, sans leur attribuer arbitrairement une cellule de la capture. L’inbox suit les spécifications textuelles, aucune capture d’inbox supplémentaire n’étant présente dans le dépôt.

Après consultation de la note finale « 02:43 », un retour Home de 3,5 secondes peut délivrer une notification Instagram unique de Corentin. Elle ajoute ses cinq messages finaux et attire l’attention sur l’onglet KAIROS déjà disponible dans Safari dès le début. Cette étape est différée pendant un appel et ne force aucune redirection. Les états lus, les réponses/réactions et les étapes finales persistent dans la progression de session existante.

Safari est maintenant interne : barre d’adresse, précédent/suivant, rechargement de la vue, historique local et présentation des onglets. Seule la page enregistrée KAIROS est rendue localement ; il ne s’agit pas d’un proxy ou d’un navigateur web généraliste. Le bouton « Écouter » ouvre volontairement le vrai lien `album.link`. Les liens officiels dans les DMs et les entrées Musique/Spotify conduisent à cette même page Safari.

Les URLs officielles sont désormais configurées dans `external-content.js` : Spotify propose uniquement KAIROS, et Apple Music les cinq contenus explicitement fournis (KAIROS, Sensation, Shogun in Lagos, Kany, Hatelove). Le point d’intégration valide les origines et les clés du catalogue, ne crée l’iframe qu’après clic et la détruit lors d’une sortie ou d’un appel. Les fichiers récupérés restent locaux et utilisent le même AudioManager. Le CTA final Safari conserve `album.link`.

L’abstraction `trackEvent` est étendue avec les étapes V8. Elle émet des événements locaux avec une allowlist des noms d’apps et des identifiants de threads. Aucun texte de message, nom saisi, identifiant personnel ou contenu média n’est transmis. Vercel Analytics n’est pas activé dans le projet à partir de cette branche ; aucun SDK, OAuth, MusicKit ni compte développeur n’est ajouté.

Validation complémentaire :

```sh
node --check v8.js
node --check instagram-data.js
python3 tests/v8_immersive.py
```

Cette suite vérifie le comportement honnête de batterie/status bar, le démarrage direct, le scroll tactile horizontal/vertical, les quatre conversations, les réactions/états lus, la persistance, la navigation, les publications, la finale puis Corentin/Safari, l’ouverture externe volontaire et l’absence d’erreurs JavaScript/404. Captures : `/tmp/kairos-v8-screenshots`. Les suites V7 sont conservées, avec seulement l’adaptation du boot sans intro et de Safari interne. WebKit n’est pas installé dans l’environnement ; la recette Safari/iPhone physique reste nécessaire avant toute promotion. `main` et la Production ne doivent pas être modifiés sans validation explicite.

## Complétion des contenus officiels V8

`INSTAGRAM_PROFILES` centralise les six handles et URLs fournis : `manii_musicoff`, `angiste3`, `paapii_levrai`, `honey_emmanuella`, `_co.ko__`, `prodbyredka`. Les headers HTML utilisent le handle complet ; seule la CSS peut tronquer l’affichage. Les captures historiques Paapii sont conservées et accompagnées du lien `paapii_levrai`. La contact card Angiste pointe directement vers `angiste3`, sans basculer vers le profil artiste Paapii. Les quatre contact cards des DMs proposent « Voir le profil » après clic, avec `target="_blank"` et `rel="noopener noreferrer"`.

`INSTAGRAM_PUBLIC_POSTS` conserve les six URLs publiques fournies, sans paramètres de tracking. Un écran secondaire « Publications » du profil Manii les ouvre volontairement. Aucune correspondance certaine n’est disponible entre ces six URLs et les images locales `kairos-cover.jpg`, `manii-01.jpg`, `duo-01.jpg`, `paapii-01.jpg`. Ces quatre cartes génériques ont été retirées du feed ; aucune mauvaise photo n’est attribuée à un post officiel.

Musique garde sa bibliothèque et ses fichiers récupérés. Une section « Écoutés récemment » ouvre chacun des cinq contenus Apple en vue interne avec titre, artiste si fourni, retour et iframe officielle (450 px pour les albums, 150 px pour Kany). La cover KAIROS reste locale et immédiate ; les quatre autres artworks proviennent uniquement des réponses officielles iTunes. Les permissions `allow` et `sandbox` de l’iframe Apple suivent la configuration demandée. Spotify garde son shell, sa cover et sa tracklist : la cover, le titre et Play ouvrent uniquement le lecteur officiel KAIROS. Les paramètres optionnels de partage `utm_source`/`si` de l’embed Spotify sont omis ; l’album ID fourni reste identique.

L’ouverture d’un lecteur arrête l’audio local et détruit tout lecteur externe précédent. Retour bibliothèque, Home, swipe Home, autre app, appel entrant, page masquée ou quittée détruisent l’iframe ; un lien de secours volontaire vers la plateforme et une action Recharger restent disponibles. L’AudioManager ne cherche jamais à contrôler une lecture cross-origin. Le fallback Spotify pointe sur l’URL officielle `open.spotify.com/intl-fr/album/6nyjz8T3h6paStfVUerOMi`.

Aucun script ni SDK Analytics n’est ajouté. L’abstraction locale `trackEvent` reste en place, sans envoi d’événements réseau. Ni OAuth, ni token, ni MusicKit/compte développeur ne sont utilisés.

```sh
node --check external-content.js
python3 tests/external_completion.py
```

La suite teste les six profils et six URLs exactes, les clics volontaires et attributs de sécurité, les cinq contenus Apple, le seul catalogue Spotify, le lazy loading, les tailles et permissions des frames, leur destruction réelle, le fallback et la priorité audio locale. Les réponses des fournisseurs sont **remplacées par des fixtures locales explicites pour isoler la navigation et le lifecycle**. Les captures dans `/tmp/kairos-external-completion` ne représentent donc pas le rendu réel des lecteurs Apple/Spotify. Les requêtes réelles vers Instagram, Apple et Spotify sont refusées par le proxy réseau de l’environnement (`403 Forbidden`) : disponibilité publique et lecture réelle restent à vérifier sur une preview HTTPS avec accès aux fournisseurs. Les URL sont celles fournies, sans recherche d’identifiants supplémentaires.

## V8.1 — Immersive Reality Fix

Le lockscreen démarre sans notifications ni texte explicatif. Sa lampe change uniquement d’état visuel, sans permission ni toast ; le raccourci caméra ouvre la caméra interne existante et revient à l’écran verrouillé. Les notifications narratives, dont celle de Corentin, restent intactes. La détection iOS intervient avant le premier rendu pour éviter les doublons de barre système et de Dynamic Island. Le nombre arbitraire 76 a été supprimé.

Les DMs regroupent les entrants avec un avatar en fin de groupe, utilisent des séparateurs de date et un composer avec envoi visible seulement après saisie. Les quatre conversations existantes sont préservées. Ruben (36 messages), Ange (27) et Himra (une mention sortante, sans endorsement) utilisent les trois avatars fournis depuis le dépôt distant. Aucun nouveau handle n’est inventé.

`apple-metadata.js` interroge le lookup public iTunes pour les cinq IDs fournis et les morceaux KAIROS. Il utilise fetch avec fallback JSONP et met les réponses en cache de session. Seules les URLs de médias renvoyées par Apple sont acceptées. Les aperçus disponibles alimentent le même AudioManager local : Lecture, sélection, suivant, pause, progression et mini-player. L’embed complet reste accessible ; son ouverture arrête l’audio local et la sortie détruit l’iframe. Une pochette persistante et un chargement discret précèdent le lecteur officiel. Les échecs de métadonnées restent explicites et peuvent être retentés ; aucun son ou artwork officiel n’est fabriqué.

```sh
node --check apple-metadata.js
python3 tests/check_assets.py
python3 tests/v81_reality.py
```

La suite V8.1 couvre mobile et desktop, le mode iOS sans Battery API, les raccourcis verrouillés, les sept DMs, les publications, Safari présent dès le début, le cache et la concurrence audio. Ses réponses iTunes, artworks et médias sont des **fixtures isolées explicites**, pas des métadonnées réelles. Les captures `/tmp/kairos-v81` contenant ces fixtures ne prouvent pas la disponibilité du catalogue Apple. Le proxy de cet environnement refuse les requêtes réelles iTunes (403) ; covers, correspondance des titres et lecture officielle doivent encore être vérifiées sur la preview HTTPS puis sur iPhone Safari physique. Aucun Analytics ni déploiement Production n’est activé.

## V8.2 — Reality Polish

Passe ciblée sur `v8-immersive`, sans merge de main ni promotion Production.

- Publications Manii : capture profil conservée, puis feed interne des six permalinks fournis. Le script officiel Instagram est chargé une seule fois à l’ouverture du feed. Un seul embed est monté à la fois selon la position du scroll ; sortir du feed, masquer la page ou recevoir un appel détruit le lecteur. Si le script échoue ou qu’aucun iframe ne charge sous dix secondes, une carte donne le vrai lien. Aucune photo locale générique n’est attribuée à une publication officielle. Les documents cross-origin peuvent encore afficher une demande de consentement ou de connexion ; leur contenu ne peut pas être inspecté par notre JS.
- Mobile : détection par media queries de largeur/orientation et pointeur coarse, réévaluée lors des changements de taille. Visual Viewport et safe areas règlent la hauteur disponible. Petite barre système et Island simulées sont masquées sur mobile ; cadenas, date, grande heure, shortcuts, invitation au swipe et Home Indicator restent visibles. La coque desktop garde sa barre complète.
- Apple/Spotify : chargement explicite eager de la seule iframe ouverte, états loading/success/error, loader immédiat et fallback caché tant qu’aucune erreur ne survient. `load` révèle le lecteur ; `error` ou neuf secondes sans load retire l’iframe et révèle Réessayer et le lien officiel. Retry recrée le lecteur et son timeout. La sortie supprime les timers et le contexte. Previews KAIROS, métadonnées et AudioManager ne sont pas refaits ; Spotify reste KAIROS uniquement.
- Appel : `AUDIO.call` utilise uniquement `assets/audio/call officiel.wav`, récupéré isolément depuis `origin/main` (`a73f6ac0960025b547803244163b381fbc1456aa`), sans merge. **L’asset distant contient seulement `\r\n` (2 octets), pas un fichier WAV. La lecture réelle est bloquée jusqu’au remplacement par le vrai audio.** Aucun fallback vers l’ancien `call-0243.wav` n’est ajouté ; celui-ci reste dans le dépôt.

```sh
python3 tests/v82_polish.py
python3 tests/v81_reality.py
python3 tests/v8_immersive.py
python3 tests/external_completion.py
python3 tests/check_assets.py
```

La suite V8.2 teste Safari-like, Chrome mobile et petit WebView en émulation Chromium, le paysage/portrait et les changements de hauteur. Elle vérifie les six URLs Instagram, script singleton, un seul lecteur monté, fallback, nettoyage, puis les transitions des lecteurs Apple et Spotify. Les fournisseurs sont remplacés par des fixtures explicites : ce ne sont pas leurs vrais posts ni leurs vrais lecteurs. Les chemins premier appel/rappel sont testés avec un audio de substitution signalé, sans prétendre lire le fichier distant invalide ; son format est vérifié séparément et signalé BLOCKED. Les suites historiques exécutées normalement restent bloquées sur la lecture du fichier d’appel. Pour contrôler leurs autres parcours sans cacher ce blocage, `KAIROS_CALL_TEST_FIXTURE=1` permet explicitement de substituer trois secondes de silence WAV en mémoire dans les tests uniquement, avec avertissement à chaque contexte. Cela ne valide pas la véritable piste d’appel.

Les captures de contrôle sont dans `/tmp/kairos-v82`. Le proxy réseau refuse encore les fournisseurs réels ; leur rendu et la lecture dans Safari/WebViews physiques restent à valider humainement sur la preview HTTPS. Aucune Analytics n’est activée et Safari narratif reste inchangé.

Micro-correction appel après V8.2 : `AUDIO.call` utilise désormais `assets/audio/Nouvel-enregistrement-215.wav`, le vrai WAV PCM stéréo 48 kHz de 22,036 secondes synchronisé depuis `v8-immersive`. Les suppressions des anciens fichiers proviennent du commit distant déjà présent. Les substitutions audio de test ont été retirées ; la suite V8.2 lit le vrai WAV pour le premier appel et le rappel, vérifie le raccrochage et la fin naturelle. Les limitations historiques du fichier de deux octets ci-dessus sont donc résolues.

## V8.3 — Native Feel

La coque existante de 422 × 914 est conservée sur mobile : seule une transformation uniforme la redimensionne. Le conteneur reste à la largeur CSS du viewport pour éviter le zoom automatique à la rotation. Le scale utilise Visual Viewport, une marge de 12 px et les safe areas du téléphone physique, placées à l’extérieur du mockup. Resize, rotation et VisualViewport.resize recalculent sa géométrie. Status bar, Dynamic Island, cadre métallique, rayons et Home Indicator restent visibles ; la batterie n’affiche toujours aucun pourcentage inventé. Les gestes utilisent désormais les coordonnées du device avant transformation. Les anciennes règles compactes basées sur la hauteur physique sont réservées aux pointeurs fins : sur mobile, la géométrie interne du téléphone reste stable pendant le scale.

Le profil Manii joint directement `insta-manii-profile.webp` et le nouvel asset réel `insta-manii-feed-current.webp`, synchronisé depuis `v8-immersive`. Le chevauchement des captures est retiré par CSS, sans modifier les fichiers. Les six hotspots suivent exactement le mapping gauche/droite puis haut/bas demandé. Le bouton Publications et la ligne de lien ajoutée sous le profil Manii sont retirés. L’ouverture externe reste dans le menu du profil. Seul le post sélectionné charge l’embed officiel ; le retour conserve le scroll du profil. Aucun embed ne charge sur le profil ou sa grille.

Après unlock, `requestIdleCallback` (fallback setTimeout) prépare les métadonnées Apple en arrière-plan. Les deux lookups utilisent uniquement les IDs fournis ; la réponse combinée demande aussi au maximum un aperçu par album externe. Le cache de session évite de nouvelles requêtes de métadonnées. Le premier aperçu KAIROS disponible est préchargé dans le même AudioManager, sans lancer de lecture ni changer le titre du mini-player. Les pochettes disponibles sont également préparées en cache navigateur.

Play KAIROS et la sélection d’un titre lisent uniquement les sources déjà connues : aucun await ni lookup de métadonnées dans le handler. Play et les titres restent désactivés pendant « Préparation des aperçus… ». Une réponse vide ou un échec reste explicite, avec réessai manuel ; aucune URL audio n’est fabriquée. Les albums récents ouvrent immédiatement une vue locale (cover, titre, artiste et aperçu s’il existe). Le lecteur officiel Apple est secondaire et ne se crée qu’après « Ouvrir le lecteur Apple Music ». Le lifecycle loading/success/error V8.2, Spotify KAIROS, les secrets locaux et l’arrêt à la sortie sont conservés.

```sh
python3 tests/v83_native.py
python3 tests/check_assets.py
```

Les tests V8.3 couvrent trois profils de navigateur mobile émulés, petit viewport, rotation, safe areas et réduction du Visual Viewport. Ils vérifient le cadrage des quatre bords, les gestes après scale, les six taps, le retour au scroll, le préchauffage avant Musique, les boutons désactivés, le priming sans autoplay, l’appel synchrone à audio.play dans l’activation utilisateur, TU SAIS, les albums externes locaux, les iframes explicites et le cache. Artworks, métadonnées, previews et embeds des fournisseurs sont **des fixtures isolées** ; les captures `/tmp/kairos-v83` qui les contiennent ne représentent pas une validation live des catalogues. Les tests d’appel utilisent toujours le vrai `Nouvel-enregistrement-215.wav`.

Les suites historiques sont adaptées uniquement aux exigences remplacées (coque mobile complète, grille directe, vue locale avant iframe, titres indisponibles désactivés). Les fournisseurs réels restent limités par le réseau de l’environnement ; la disponibilité des médias Apple et les embeds Instagram, ainsi que Safari/iPhone physique, doivent encore être validés humainement sur la preview. Aucun merge dans main, déploiement Production ou Analytics n’est ajouté.

## V8.3.1 — Regression fix (baseline frozen)

Snapshot publié : `v8.3-before-regression-fix` → `541f11d0f81173babff5d8a7fbc43b164d06dced`. Le commit distant suivant apporte uniquement l’asset V2 autorisé. Aucun changement à `styles.css`, `index.html`, au device fit, aux contenus des DMs, à Spotify, à Safari ni aux appels.

Corrections limitées : Safari ne fournit généralement pas Battery API ; le contour vide est remplacé par un glyphe décoratif rempli à 65 %, sans nombre ni prétention de mesure. La grille Manii utilise l’image V2 entière, sans crop, et une seule overlay CSS grid 3×2. L’ordre visuel est explicitement `[5,4,3,2,1,0]`, contrairement à l’ancien ordre chronologique des URLs. Les tracklists tiers étaient absentes du rendu et limitées à un seul résultat par le lookup ; le lookup demande désormais jusqu’à 200 songs pour les IDs existants, stocke chaque titre (même sans preview), et migre le cache tronqué v1 vers v2. `playKairos()` reste identique au snapshot, sans await.

Le swipe lock utilisait −55 pixels corrigés par le scale et une dominance verticale de 1,3. Il utilise désormais les pixels physiques : distance verticale >32 px avec dominance >0,8, ou flick >18 px en moins de 350 ms avec dominance >0,7. Capture immédiate au pointerdown : écran pour la surface, bouton lui-même pour conserver les taps lampe/caméra/accessibilité. Les gestes hors lockscreen et pointercancel restent inchangés. Aucun feedback animé supplémentaire.

```sh
python3 tests/v831_golden.py before  # avant toute modification (déjà enregistré)
python3 tests/v831_lock_swipe.py
python3 tests/v831_instagram_grid.py
python3 tests/v831_apple_tracklists.py
python3 tests/v831_golden.py after
```

Les 22 captures des 11 écrans frozen, mobile et desktop, sont comparées sans masque dans `/tmp/kairos-v831-golden`. Une batterie connue simulée identique isole la modification intentionnelle du glyphe unknown ; la batterie unknown est testée séparément. Tolérance limitée aux arrondis du compositeur : delta de canal ≤24 et ≤0,005 % des pixels avec delta >8. Aucune différence visuelle significative. Les trois suites ciblées couvrent les quatre scales, le cancel, les boutons, les six cellules, les tracks sans aperçu, la lecture synchrone et le cache valide sans nouveau lookup.

Les métadonnées Apple des tests sont des fixtures explicites (3 titres pour chacun des trois albums, Kany 1, KAIROS 8), pas des titres officiels récupérés. La requête iTunes réelle reçoit encore HTTP 403 : aucun compte officiel de titres n’est attestable depuis cet environnement. La disponibilité live, le nombre réel de titres et Safari sur iPhone physique restent à valider sur la preview. Aucune donnée officielle n’est inventée et aucun merge/Production n’est lancé.

Micro-fix après V8.3.1 : déverrouillage normal uniquement par swipe, sans tap sur le texte, l’heure, le wallpaper ou le Home Indicator. Le Home Indicator conserve son retour Home une fois déverrouillé. Le geste utilise des pixels physiques : déplacement vertical ≤−28 px (dominance 0,75), ou flick ≤−16 px en ≤300 ms (dominance 0,65), indépendamment du scale. Le contenu du lockscreen suit le doigt sur 28 px maximum puis revient en 120 ms ; le wallpaper reste fixe. Le feedback est effacé après unlock, relâchement insuffisant ou pointercancel. Lampe et caméra restent accessibles par tap.

Le thread iMessage Paapii reprend exactement les 14 messages fournis : Manii a oublié le code, Paapii donne « la date », « 29/10 », puis « lis-la pas comme un français. ». Aucun code explicite n’est écrit dans la conversation. La preview reprend cette dernière phrase. « Distribué » est rendu une seule fois immédiatement après la dernière bulle `me`, même si des messages reçus suivent ; son style est rapproché de cette bulle. Le secret ABEG et `trySecret()` restent inchangés.

Validation ciblée : `python3 tests/v831_lock_swipe.py` vérifie les taps, swipes depuis milieu/bas/date/heure/texte, flicks, diagonales, cancel et reset aux scales 1 / 0,9 / 0,8 / 0,7, puis la narration exacte et le statut après une nouvelle réponse. Les 22 captures avant/après sont conservées dans `/tmp/kairos-swipe-imessage-golden` : 20 écrans gelés inchangés à l’arrondi de rendu près ; les deux listes Messages diffèrent uniquement dans la preview Paapii autorisée. Les anciens scripts qui initialisaient le téléphone par clic sur `unlockBtn` doivent désormais utiliser un vrai swipe dans leur harness. Aucun changement aux apps gelées, au device fit, à Apple/Instagram, au WAV d’appel ou à la PWA. La recette Safari physique reste à confirmer sur preview.

## V9 — Living OS / SORIAK (historical; superseded by V9.1 below)

V9 is deterministic client-side behavior, with no backend or model calls.
`living-os.js` owns the scheduler; `soriak.js` contains the centralized rule registry,
fixed message copy, Messages/notification adapter, and future conversation boundary.
The existing shell, swipe, conversations, secrets, calls and catalog remain intact.
The supplied `soriak.jpeg` is retained; `soriak.jpg` is its byte-identical UI alias.

### Events and rules

Public APIs: `emitOSEvent(type, payload, optionalEventId)`,
`scheduleOSEffect(ruleId, context)`, `cancelOSEffect(effectId)`,
`processPendingOSEffects()`. Event IDs deduplicate replayed transitions; independent
app visits and real playback starts are separate events. The bounded event journal
keeps 120 entries; explicit replay IDs are retained separately so journal eviction
does not re-emit a once-only transition. Implemented events: `phone_unlocked`, `app_opened`, `file_opened`,
`secret_attempt_failed`, `secret_unlocked`, `track_played`, `call_declined`,
`call_answered`, `message_opened`, `notification_opened`, `lockscreen_returned`.
Internal events: `os_effect_delivered`, `soriak_user_message`.

A rule declares `id`, `event`, `when(context, payload)`, `delay: [minMs, maxMs]`,
`once`, optional `obsolete(context)`, priority, and a registered effect/message ID.
To add a reaction, add fixed copy and one rule in `soriak.js`; emit the semantic
event at its existing business transition. Renderers never own narrative timers.
`when` is rechecked at delivery. Secret completion removes obsolete pending hints.

### Discovery and hints

SORIAK is absent until the first delivered message. Three ABEG failures schedule
“Tu compliques un truc simple.” after 25–45 seconds. Five failures, after that
message, unlock the delayed date hint; seven unlock the final indirect hint.
`getSecretStage()` derives LOCKED/FAIL_n/pending/hint-sent/UNLOCKED stages from
these records without storing a conflicting second state machine. TIME has separate
counters and messages at three/five failures. Both form errors
stay generic; neither password appears in SORIAK copy. ABEG success only schedules
“Enfin.” if SORIAK was already discovered.

Fallback requires an unlocked phone and three distinct apps. It delivers at
110–120 seconds after first unlock for early explorers, or 20–30 seconds after
the third app if that happens later. Exploration tracking is separate from the
legacy five-app call counter so recall/first-call timing does not change.
A discovered SORIAK may react once to a declined call, at low priority. One optional
controlled reply (“Tu es qui ?”) receives one delayed “Mauvaise question.” No free
text or generated conversation is simulated. Existing Music history is an ambient
proof point: only successfully started playback enters Recently Played.

### Persistence, timing and delivery

`state.livingOS` and failed-attempt counts use existing `persistProgress()` and
`kairos.progress` session storage. There is no second storage layer. Existing
secret storage remains unchanged. Fired rule IDs, pending effects, actual message
records/read flags, limited playback history, controlled replies and the session
seed survive refresh within the session. A pending record contains `id`, `ruleId`,
`createdAt`, `dueAt`, `payload`, `once`. Its deadline never changes on refresh.
A stable hash of the persisted session seed + rule ID selects the delay; narrative
scheduling never uses `Math.random()`.

One central timer processes pending work. Calls, FaceTime, blocking modals, hidden
documents, another banner, and the initial locked phone defer delivery. Delivery
commits synchronously with progress. At most one major effect fires per pass;
SORIAK messages are at least 30 seconds apart and message IDs never repeat.
Opening SORIAK marks actual delivered messages read, hides its banner, removes its
lockscreen card, and updates the badge. Unread cards use real timestamps. Missed
calls use existing call history and stop appearing after Phone has been visited.
No old conversation is manufactured, and no app auto-opens on delivery.

### Debug and verification

`?livingDebug=1` on localhost or feature-branch Vercel aliases accelerates rule
delays (~30s → 1s), exploration gate (90s → 2s), and message spacing (1.2s).
It logs events/scheduling/delivery/cancellation, with no password values or debug
UI. Production domains and production deployment URLs ignore the flag.

Start `python -m http.server 8765`, then run:

```sh
node tests/living_os_engine.cjs
KAIROS_TEST_URL=http://127.0.0.1:8765 python tests/living_os_browser.py
KAIROS_TEST_URL=http://127.0.0.1:8765 python tests/living_os_native_swipe.py
KAIROS_TEST_URL=http://127.0.0.1:8765 python tests/living_os_regressions.py
```

Browser tests isolate external Apple/Instagram providers; they do not validate
live provider availability. Frozen legacy suites still contain tap-to-unlock
fixtures from before the native swipe release. For V9 regression execution only,
those fixtures use `unlockPhone()`; assertions and production code stay unchanged.
The separate native touch suite covers physical swipes at scales 1/.9/.8/.7.

## V9.1 — SORIAK local et déterministe (version actuelle)

Le chat ne possède plus de backend, de modèle ni de configuration de fournisseur.
Il fonctionne sans connexion : aucun fetch, endpoint, quota de requêtes ou timeout
réseau ne fait partie de la discussion. La route API et son ancien fichier de
configuration ont été supprimés. Les lecteurs externes des autres apps restent
inchangés ; leur disponibilité ne conditionne pas le chat.

### Architecture

- `soriak-intents.js` : 44 intentions, seuils, mots entiers, expressions pondérées,
  priorités explicites et normalisation (accents, casse, apostrophes, ponctuation,
  SMS et quelques fautes fréquentes). Les intentions spécifiques comme une demande
  de code passent avant les thèmes incidentels. Une égalité ambiguë revient au
  neutre au lieu d'inventer une réponse précise.
- `soriak-responses.js` : 347 formulations distinctes écrites, séparées du classement.
  Les groupes déclarent leurs conditions, priorités, poids et éventuel niveau
  d'indice. Les appels, visites, écoutes et résolutions ne sont affirmés que si les
  faits autorisés le permettent.
- `soriak-chat.js` : orchestration locale, sélection pondérée stable, contexte du
  dernier sujet, gestion du fil et mémoire anti-répétition. Le classement ne peut
  pas appeler de fonction du jeu. Une hausse des tentatives ou une résolution peut
  réorienter un suivi comme « j'y arrive pas » vers le bon fichier.
- `soriak-policy.js` : liste blanche de faits, plafond d'indices, contrôle des
  réponses et non-répétition des valeurs secrètes. La vérification des mots de
  passe reste exclusivement dans la logique existante du jeu.
- `soriak.js` : présentation Messages, notifications et événements Living OS.
  Les réactions proactives conservent leurs délais, blocages et règles anti-spam.

La bibliothèque couvre identité, projet, aide, code, appels, fichiers, messages,
Instagram, musique, ABEG, autre énigme, Safari, relation, confidentialité, soupçon,
frustration, insultes, salutations, remerciements, départ et demandes hors sujet.
Le neutre ne donne aucun indice, même avec une progression avancée. Les indices
spécifiques restent conditionnés au sujet et aux niveaux déjà autorisés ; les
secrets résolus produisent des réponses cohérentes avec leur état.

### Mémoire et migration

Le fil conserve au plus 60 messages via `persistProgress()` / `kairos.progress`.
`state.livingOS.soriak.dialogue` conserve une graine stable, le compteur de tours,
le dernier sujet, les derniers compteurs utiles et trois identifiants de réponse
par intention. Les choix identiques ne se succèdent pas, y compris après refresh
ou après une réaction proactive. Une relation plus avancée ouvre quelques variantes
plus coopératives, sans dépasser le plafond d'indices.

Les anciens échanges restent présents. L'ancien compteur de requêtes est retiré,
et une demande interrompue provenant de la version réseau est terminée localement
une seule fois. `pendingReply` remplace le pending de transport. Aucun ancien quota
ne peut bloquer une nouvelle discussion. La saisie garde ses 360 caractères, Enter,
les bulles immédiates et un indicateur d'écriture de 450ms purement visuel. Naviguer
pendant ce délai ne perd pas la réponse. Les réponses hors fil deviennent non lues
et attendent un contexte sûr pour leur notification.

### Ajouter une intention ou une réponse

Ajouter une définition pondérée dans `soriak-intents.js`, puis un groupe de réponses
dans `soriak-responses.js`. Chaque déclencheur a un poids ; chaque intention a un
seuil et une priorité. Chaque groupe peut préciser `target`, un état de résolution,
un niveau d'indice, une app visitée, une écoute réelle ou une relation minimale.
Un indice porte aussi `clue: { secret, stage }`, vérifié indépendamment par la
policy. Ajouter des exemples contradictoires et ambigus aux fixtures avant de
modifier les seuils. Aucun mot de passe ne doit être écrit dans le catalogue.

### Validation

```sh
node --test tests/soriak_intents.cjs
node tests/living_os_engine.cjs
KAIROS_TEST_URL=http://127.0.0.1:8765 python tests/soriak_chat_browser.py
KAIROS_TEST_URL=http://127.0.0.1:8765 python tests/living_os_browser.py
KAIROS_TEST_URL=http://127.0.0.1:8765 python tests/living_os_native_swipe.py
KAIROS_TEST_URL=http://127.0.0.1:8765 python tests/living_os_regressions.py
```

Démarrer un serveur statique avec `python -m http.server 8765`. Les fixtures de
classification contiennent 88 messages réalistes. Les tests couvrent également les
protections, niveaux, répétitions, migration, mémoire persistée et absence de toute
requête pendant une discussion réellement hors connexion. Les régressions de médias
externes restent isolées par leurs fixtures existantes.

`?livingDebug=1` accélère uniquement les réactions proactives sur les hôtes de
développement/preview. Le diagnostic du chat affiche intention et score, jamais
le texte utilisateur ou les réponses secrètes. Aucun état de jeu n'est modifié par
une réponse : seuls le fil, la mémoire de dialogue et les notifications sont mis à
jour. Le shell, le swipe, les appels, les apps et les conversations existantes sont
conservés. Safari physique reste une cible de recette manuelle.

### Lore canonique et suivis courts

`soriak-lore.js` contient les faits publics fournis pour KAIROS : Manii/Ephrem Amani,
Paapii/Ange Diabaté (Diabaté Ange Ismaël), leur amitié d'enfance, le projet musical,
sa sortie le 29 octobre 2026, le sens de KAIROS, le réalisateur, l'acteur principal,
les lieux du tournage et la fin ouverte. Le classement personnel reste Bandite,
Tu sais, LPB/La plus belle. Les comparaisons suivent ce classement sans inventer
un top cinq. La préférence et les raisons restent celles du personnage.

Les 16 nouvelles intentions distinguent projet, sens, date, artistes, identités,
réalisation, acteur, film, tournage, fin, amitié, préféré, classement, comparaison
et raison d'une préférence. La mémoire conserve `lastTopic`, `lastImportantIntent`
et `lastEntity` pour « pourquoi ? », « et lui ? », « et quand ? », « et qui l'a
fait ? ». Les formulations factuelles sont enregistrées avec un identifiant de
provenance. La policy autorise leurs chiffres uniquement si le texte correspond
exactement à une formulation canonique enregistrée. Les indices restent dans
l'autre couche, avec leurs niveaux existants ; aucune date n'est transformée en
mot de passe et aucune réponse de SORIAK ne peut valider un secret.

Les variantes factuelles portent un ton direct, moqueur ou mystérieux. Les poids
visent environ 50/30/20 avant filtrage anti-répétition ; il ne s'agit pas d'un quota
rigide à chaque échange. Les réponses factuelles ne retombent pas sur le neutre.

### Réception proactive et son optionnel

Dès la première tentative pertinente sur l'un des deux fichiers (échec ou réussite),
la règle unique `soriak-first-attempt` programme « Déjà ? » en 1,2–2 secondes,
puis le processeur central le délivre au prochain passage (au plus une seconde
supplémentaire). Cette introduction unique ne dépend pas de trois échecs. Elle
peut passer avant l'espacement normal, mais attend toujours la fin d'un appel,
FaceTime, modal, saisie en cours, autre bannière ou onglet masqué. Les réactions de visite de fichier, d'exploration et d'appel attendent cette
première réception : elles ne peuvent pas la devancer. Les prochains
indices gardent leurs seuils et leur espacement normal.

Chaque réception proactive hors du fil affiche la bannière iOS existante, dans
l'écran du téléphone, avec avatar, SORIAK, extrait et timestamp. Elle s'anime depuis
le haut, s'efface après six secondes et ouvre directement le fil au clic/toucher,
y compris depuis l'écran verrouillé. Dans le fil SORIAK, la bulle et le son suffisent.
Le contenu et la logique d'unlock ne changent pas ; seuls les boutons de bannière
rejoignent les cibles de tap autorisées pendant la capture du pointeur.

Le fichier fourni `assets/audio/soriak-notification.mp3` est repris tel quel depuis
le dépôt. Le remplacer à ce même chemin puis recharger la Preview suffit. Aucun
fichier de production n'est généré par les tests. Le module
`soriak-sound.js` crée un seul élément Audio, préchargé et amorcé silencieusement
sur le premier pointerup ou clavier dans le téléphone. Chaque vraie réception
possède une tentative sonore persistée ; ni refresh ni répétition d'événement
ne relance le même son. Une nouvelle lecture remet la même piste à zéro et ne
superpose pas une seconde instance. Les erreurs de fichier et refus d'autoplay
restent silencieux et ne bloquent jamais les messages. Aucun ancien son n'est
rejoué rétroactivement après une interaction.

Tests supplémentaires :

```sh
node --test tests/soriak_lore.cjs tests/soriak_sound.cjs
KAIROS_TEST_URL=http://127.0.0.1:8770 python tests/soriak_reception_browser.py
```

Les fixtures médias utilisent un bref WAV silencieux en mémoire pour tester la
lecture, sans ajouter de faux asset. Un scénario dédié renvoie volontairement 404
pour le fichier optionnel. Les suites historiques d'apps isolent les notifications
proactives SORIAK dans leur état de départ ; leur réception réelle, l'absence du
fichier et les indices sont vérifiés séparément dans les suites dédiées.
