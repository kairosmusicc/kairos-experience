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
