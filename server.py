#!/usr/bin/env python3
"""
Simple HTTP server to serve the genealogy website and JSON data.
This solves the CORS issue when loading JSON files directly.
"""

import http.server
import socketserver
import json
import os
from urllib.parse import urlparse, parse_qs

class GenealogyHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Parse the URL
        parsed_path = urlparse(self.path)
        
        # If requesting the JSON file, serve it with proper headers
        if parsed_path.path == '/geneology.json':
            self.serve_json_file('geneology.json')
        else:
            # Serve other files normally
            super().do_GET()
    
    def serve_json_file(self, filename):
        try:
            # Check if file exists
            if not os.path.exists(filename):
                self.send_error(404, f"File {filename} not found")
                return
            
            # Read and parse JSON
            with open(filename, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Send response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            
            # Send JSON data
            json_data = json.dumps(data, indent=2)
            self.wfile.write(json_data.encode('utf-8'))
            
        except Exception as e:
            self.send_error(500, f"Error reading JSON file: {str(e)}")

def run_server(port=8000):
    """Run the HTTP server"""
    with socketserver.TCPServer(("", port), GenealogyHandler) as httpd:
        print(f"Genealogy server running at http://localhost:{port}")
        print("Press Ctrl+C to stop the server")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")

if __name__ == "__main__":
    run_server()