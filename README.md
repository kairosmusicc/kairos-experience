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

La V8 part du `main` stable `d3ac4554c4ae6021bb339b94079d7b04150d307c`. Elle ouvre directement le lockscreen ; l’intro et son bouton ont été retirés. Le code `navigator.getBattery()`, son fallback et le markup de la status bar sont inchangés. Les styles V8 sont isolés dans `v8.css`.

`instagram-data.js` contient les conversations **fictionnelles fournies pour l’expérience**, structurées par message : 177 messages Emmanuella, 81 Angiste, 48 Corentin et 41 Redka, avec dates, expéditeurs, états lus, image et réactions. Les threads ne sont rendus qu’à l’ouverture. Les quatre avatars fournis restent à leurs chemins exacts, sans sous-dossier Instagram ; les contacts secondaires sans photo ont des initiales neutres. Aucun vrai message privé n’est connecté.

`v8.js` ajoute l’inbox, les Notes horizontales, les filtres, la recherche, les threads, les réponses de session, les réactions et la navigation Instagram. Les quatre captures de profils et leurs hotspots sont conservés ; une grille ouvre les images du projet en détail. Les publications sont configurées dans `INSTAGRAM_POSTS` avec `externalUrl: null`, faute d’URLs publiques exactes dans le dépôt. Les images représentent les contenus fournis ; aucun lien vers un post Instagram n’est inventé. L’inbox suit les spécifications textuelles, aucune capture d’inbox supplémentaire n’étant présente dans le dépôt.

Après consultation de la note finale « 02:43 », un retour Home de 3,5 secondes peut délivrer une notification Instagram unique de Corentin. Elle ajoute ses cinq messages finaux et rend l’album disponible dans Safari. Cette étape est différée pendant un appel et ne force aucune redirection. Les états lus, les réponses/réactions et les étapes finales persistent dans la progression de session existante.

Safari est maintenant interne : barre d’adresse, précédent/suivant, rechargement de la vue, historique local et présentation des onglets. Seule la page enregistrée KAIROS est rendue localement ; il ne s’agit pas d’un proxy ou d’un navigateur web généraliste. Le bouton « Écouter » ouvre volontairement le vrai lien `album.link`. Les liens officiels dans les DMs et les entrées Musique/Spotify conduisent à cette même page Safari.

`KAIROS_SPOTIFY_EMBED` et `KAIROS_APPLE_MUSIC_EMBED` restent **null** : aucun identifiant officiel n’est présent dans le dépôt, et la consultation de `album.link` est refusée par le réseau de l’environnement. Le point d’intégration valide les origines officielles, ne crée l’iframe qu’après clic et la supprime lors d’une sortie ou d’un appel. Pour le moment, les deux apps gardent leur UI et offrent l’entrée vers l’album officiel ; les fichiers récupérés restent locaux et utilisent le même AudioManager.

L’abstraction `trackEvent` est étendue avec les étapes V8. Elle émet des événements locaux avec une allowlist des noms d’apps et des identifiants de threads. Aucun texte de message, nom saisi, identifiant personnel ou contenu média n’est transmis. Vercel Analytics n’est pas activé dans le projet à partir de cette branche ; aucun SDK, OAuth, MusicKit ni compte développeur n’est ajouté.

Validation complémentaire :

```sh
node --check v8.js
node --check instagram-data.js
python3 tests/v8_immersive.py
```

Cette suite vérifie les invariants de batterie/status bar contre la baseline Git, le démarrage direct, le scroll tactile horizontal/vertical, les quatre conversations, les réactions/états lus, la persistance, la navigation, les publications, la finale puis Corentin/Safari, l’ouverture externe volontaire et l’absence d’erreurs JavaScript/404. Captures : `/tmp/kairos-v8-screenshots`. Les suites V7 sont conservées, avec seulement l’adaptation du boot sans intro et de Safari interne. WebKit n’est pas installé dans l’environnement ; la recette Safari/iPhone physique reste nécessaire avant toute promotion. `main` et la Production ne doivent pas être modifiés sans validation explicite.
