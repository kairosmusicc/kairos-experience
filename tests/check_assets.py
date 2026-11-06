"""Verify literal media references and gallery thumbnails without dependencies."""
from pathlib import Path
import re
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
refs = set()
for name in ('index.html', 'styles.css', 'app.js'):
    refs.update(re.findall(r'''assets/[\w./-]+\.(?:png|jpg|webp|wav|mp4)''', (ROOT / name).read_text()))
missing = sorted(ref for ref in refs if not (ROOT / ref).is_file())
manifest = json.loads((ROOT / 'manifest.webmanifest').read_text())
for icon in manifest['icons']:
    if not (ROOT / icon['src']).is_file():
        missing.append(icon['src'])
js = (ROOT / 'app.js').read_text()
gallery = re.search(r'const GALLERY\s*=\s*\[(.*?)\];', js, re.S).group(1)
for original in re.findall(r'"([^"]+)"', gallery):
    thumb = ROOT / 'assets/thumbnails' / (Path(original).stem + '.webp')
    if not thumb.is_file():
        missing.append(str(thumb.relative_to(ROOT)))
if missing:
    print('Missing assets:', *missing, sep='\n')
    sys.exit(1)
print(f'PASS: {len(refs)} literal media references and all gallery/PWA icons exist')
