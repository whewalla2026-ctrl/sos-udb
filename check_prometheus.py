import sys, json, urllib.request
url = "http://udb-prometheus:9090/api/v1/targets"
with urllib.request.urlopen(url) as response:
    data = json.load(response)
    up = sum(1 for t in data['data']['activeTargets'] if t['health'] == 'up')
    total = len(data['data']['activeTargets'])
    print(f"UP: {up}/{total}")
    for t in data['data']['activeTargets']:
        print(f"  {t['labels'].get('job','?')}: {t['health']}")
