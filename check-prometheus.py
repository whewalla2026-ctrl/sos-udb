import sys, json
import urllib.request

url = "http://udb-prometheus:9090/api/v1/targets"
with urllib.request.urlopen(url) as response:
    data = json.load(response)
    for target in data['data']['activeTargets']:
        job = target['labels'].get('job', '?')
        health = target['health']
        print(f"  {job}: {health}")
