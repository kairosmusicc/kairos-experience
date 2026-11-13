"""Empty official metadata for unrelated regressions. Rich provider fixtures live in v81_reality.py."""
def isolate_soriak_audio(context):
    """Test-only silent cue; production asset is deliberately supplied by its owner."""
    import io, wave
    raw = io.BytesIO()
    with wave.open(raw, 'wb') as audio:
        audio.setnchannels(1); audio.setsampwidth(2); audio.setframerate(8000)
        audio.writeframes(b'\0\0' * 240)
    context.route('**/assets/audio/soriak-notification.mp3', lambda route: route.fulfill(status=200, content_type='audio/wav', body=raw.getvalue()))

def isolate_apple_metadata(context):
    isolate_soriak_audio(context)
    context.route('https://itunes.apple.com/**', lambda route: route.fulfill(status=200, content_type='application/json', headers={'Access-Control-Allow-Origin':'*'}, body='{"resultCount":0,"results":[]}'))

# Official script/players are isolated here: not live Instagram content validation.
INSTAGRAM_EMBED_FIXTURE = '''window.instgrm={Embeds:{process(){
  document.querySelectorAll('blockquote.instagram-media').forEach(block=>{
    const frame=document.createElement('iframe');
    frame.title='Isolated Instagram fixture';
    frame.srcdoc='<p id="instagram-fixture">Isolated embed fixture</p>';
    frame.dataset.permalink=block.dataset.instgrmPermalink;
    frame.style.height='450px';
    block.replaceWith(frame);
  });
}}};'''
def isolate_instagram_embeds(context):
    context.route('https://www.instagram.com/embed.js', lambda route: route.fulfill(status=200, content_type='application/javascript', body=INSTAGRAM_EMBED_FIXTURE))

# Rich metadata/media below are explicit test-only fixtures, never verified production URLs.
def rich_metadata(ctx, pending=None):
    isolate_soriak_audio(ctx)
    import io, json
    from pathlib import Path
    from PIL import Image
    ROOT=Path(__file__).resolve().parents[1]
    TITLES=['KAIROS','GOD BLESS','BOULOT','BANDITE','VINCENT KOMPANY','INTERLUDE','TU SAIS','LPB']
    seen=[]
    ids=['6822465566','6831219034','6825863696','1695779918','6784591752']
    names=['KAIROS','Sensation','Shogun in Lagos','Kany','Hatelove']
    artists=['Paapii & Manii','Ronisia','Didi B','Artiste du test','Joé Dwèt Filé']
    results=[dict(wrapperType='track' if i==3 else 'collection',collectionId=int(id),trackId=int(id),collectionName=names[i],trackName=names[i],artistName=artists[i],artworkUrl100=f'https://is1-ssl.mzstatic.com/isolated-test-fixture/{id}.png') for i,id in enumerate(ids)]
    results[3]['previewUrl']='https://audio-ssl.itunes.apple.com/isolated-test-fixture/kany.m4a'
    results += [dict(wrapperType='track',collectionId=int(ids[i]),trackId=1000+i,trackName='Extrait test '+names[i],artistName=artists[i],previewUrl=f'https://audio-ssl.itunes.apple.com/isolated-test-fixture/catalog-{i}.m4a') for i in [1,2,4]]
    songs=[results[0]]+[dict(wrapperType='track',kind='song',collectionId=6822465566,trackId=i+1,trackName=t,previewUrl=f'https://audio-ssl.itunes.apple.com/isolated-test-fixture/kairos-{i}.m4a',trackTimeMillis=180000) for i,t in enumerate(TITLES)]
    def lookup(route):
        seen.append(route.request.url)
        body={'results':songs if 'id=6822465566,' not in route.request.url else results,'resultCount':len(songs if 'id=6822465566,' not in route.request.url else results)}
        if pending is not None:pending.append((route,body))
        else:route.fulfill(status=200,content_type='application/json',headers={'Access-Control-Allow-Origin':'*'},body=json.dumps(body))
    ctx.route('https://itunes.apple.com/**',lookup)
    image=Image.new('RGB',(100,100),'#ab889b');raw=io.BytesIO();image.save(raw,format='PNG')
    ctx.route('https://is1-ssl.mzstatic.com/isolated-test-fixture/**',lambda r:r.fulfill(status=200,content_type='image/png',body=raw.getvalue()))
    ctx.route('https://audio-ssl.itunes.apple.com/isolated-test-fixture/**',lambda r:r.fulfill(status=200,content_type='audio/wav',body=(ROOT/'assets/audio/abeg.wav').read_bytes()))
    ctx.route('https://embed.music.apple.com/**',lambda r:r.fulfill(status=200,content_type='text/html',body='<p id="fixture">Isolated official player fixture</p>'))
    return seen
