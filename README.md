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

Le lecteur unique gère les fichiers locaux, la progression, la file, les changements de titre et le mini-player. L’appel interrompt la musique et possède son propre flux audio. Il démarre 35 secondes après le premier déverrouillage, ou immédiatement à la première ouverture de Téléphone.

## Médias disponibles et limites

Trois sources existent : `assets/audio/abeg.wav`, `assets/audio/tout_gacher.wav` et `assets/audio/call-0243.wav`. Les huit titres de l’album sont présents dans la structure `ALBUM_TRACKS` avec `src: null` : aucun audio fictif ne leur est attribué. Les fichiers déverrouillés deviennent accessibles dans les lecteurs Musique et Spotify.

Instagram conserve les quatre captures et leurs hotspots. La caméra affiche la vidéo locale en boucle ; ses contrôles simulent un aperçu, sans capturer le capteur du visiteur. Les appels aux contacts sont simulés. Safari ouvre le vrai lien album.link, sans MusicKit.

## Validation

```sh
node --check app.js
python3 tests/check_assets.py
python3 tests/smoke.py
```

Le serveur doit être démarré pour le smoke test. Celui-ci utilise Python Playwright et `/usr/bin/chromium`, disponibles dans l’environnement cloud. Ils ne sont pas des dépendances de l’application. Pour une autre URL locale, définir `KAIROS_TEST_URL`.

Le test couvre les viewports mobile 402 × 874 et desktop 1440 × 1100, les gestes tactiles via CDP, les conversations/recherches, les codes incorrects et corrects, la lecture réelle des WAV, la persistance, Notes, Musique, Photos, la vidéo, les hotspots Instagram, la cible Safari et les scénarios d’appel. Les captures de contrôle sont écrites dans `/tmp/kairos-v7-screenshots`. Le minuteur automatique est testé séparément des longs parcours d’apps. Le smoke test relève les erreurs JavaScript et les réponses HTTP en échec.

Ces contrôles Chromium ne remplacent pas une recette sur un iPhone physique/Safari, notamment pour le clavier, les safe areas et les règles de lecture audio.

## Livraison

Déployer `v7-real` en preview Vercel et valider avant tout merge dans `main`. Aucun réglage de build n’est nécessaire pour ce site statique. Les anciens `README-V*.txt` sont conservés comme historique ; leurs anciens noms d’assets ne constituent pas la configuration de la V7.
