"""Empty official metadata for unrelated regressions. Rich provider fixtures live in v81_reality.py."""
def isolate_apple_metadata(context):
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
