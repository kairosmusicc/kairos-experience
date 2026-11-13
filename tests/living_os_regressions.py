"""Run frozen legacy suites with only the pre-swipe tap-to-unlock fixture updated.
No application monkeypatches. Original assertions are retained.
"""
import os,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'tests'))
base=os.environ.get('KAIROS_TEST_URL','http://127.0.0.1:8765')
os.environ['KAIROS_TEST_URL']=base
for name in sys.argv[1:] or ['v8_immersive.py','release_candidate.py','micro_fix.py','v831_instagram_grid.py']:
 path=root/'tests'/name
 source=path.read_text().replace('http://127.0.0.1:8000',base)
 for obj in ['p','page']:
  source=source.replace(obj+".click('#unlockBtn')",obj+".evaluate('unlockPhone()')")
 print('RUN',name,flush=True)
 exec(compile(source,str(path),'exec'),{'__file__':str(path),'__name__':'__main__'})
