"""Empty official metadata for unrelated regressions. Rich provider fixtures live in v81_reality.py."""
def isolate_apple_metadata(context):
    # Opt-in only: keep normal runs checking the real repository call asset.
    import os
    if os.environ.get('KAIROS_CALL_TEST_FIXTURE') == '1':
        import io, wave
        buffer = io.BytesIO()
        with wave.open(buffer, 'wb') as wav:
            wav.setparams((1, 2, 8000, 0, 'NONE', 'not compressed'))
            wav.writeframes(b'\0\0' * 24000)
        audio = buffer.getvalue()  # Three seconds of test-only silence; never a production asset.
        context.route('**/assets/audio/call%20officiel.wav', lambda route: route.fulfill(status=200, content_type='audio/wav', body=audio))
        print('TEST FIXTURE: call audio explicitly substituted; not validation of call officiel.wav', flush=True)

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
