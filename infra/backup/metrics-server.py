#!/usr/bin/env python3
"""Prometheus metrics server for db-backup container."""
import os
import time
from http.server import HTTPServer, BaseHTTPRequestHandler

METRICS_FILE = '/tmp/backup-metrics.prom'

def get_metrics():
    if os.path.exists(METRICS_FILE):
        with open(METRICS_FILE) as f:
            return f.read()
    return '# HELP udb_backup_last_success_timestamp Last successful backup timestamp\n# TYPE udb_backup_last_success_timestamp gauge\nudb_backup_last_success_timestamp 0\n'

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/metrics':
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain; version=0.0.4')
            self.end_headers()
            self.wfile.write(get_metrics().encode())
        else:
            self.send_response(404)
            self.end_headers()
    def log_message(self, format, *args):
        pass

if __name__ == '__main__':
    port = int(os.environ.get('METRICS_PORT', 9122))
    server = HTTPServer(('0.0.0.0', port), Handler)
    server.serve_forever()
