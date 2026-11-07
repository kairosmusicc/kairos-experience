"""Empty official metadata for unrelated regressions. Rich provider fixtures live in v81_reality.py."""
def isolate_apple_metadata(context):
    context.route('https://itunes.apple.com/**', lambda route: route.fulfill(status=200, content_type='application/json', headers={'Access-Control-Allow-Origin':'*'}, body='{"resultCount":0,"results":[]}'))
