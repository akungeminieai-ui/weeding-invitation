#!/usr/bin/env python3
"""No-cache HTTP server for development. Forces browsers to always fetch fresh files."""

from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import os

class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    server = ThreadingHTTPServer(('0.0.0.0', 8080), NoCacheHandler)
    print('🚀 No-cache dev server running on http://0.0.0.0:8080')
    print('   Local:   http://localhost:8080')
    print('   Network: http://192.168.1.172:8080')
    server.serve_forever()
