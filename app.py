import xml.etree.ElementTree as ET
import urllib.request
import re
import time
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache dictionary
cache = {
    "data": None,
    "last_fetched": 0
}
CACHE_DURATION_SECS = 1800  # 30 minutes

def parse_release_notes(xml_data):
    namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
    # XML can contain namespace definitions. ET.fromstring can parse bytes.
    root = ET.fromstring(xml_data)
    
    entries = []
    for entry in root.findall('atom:entry', namespaces):
        title_elem = entry.find('atom:title', namespaces)
        updated_elem = entry.find('atom:updated', namespaces)
        link_elem = entry.find("atom:link[@rel='alternate']", namespaces)
        if link_elem is None:
            link_elem = entry.find("atom:link", namespaces)
        content_elem = entry.find('atom:content', namespaces)
        
        title = title_elem.text if title_elem is not None else "Unknown Date"
        updated = updated_elem.text if updated_elem is not None else ""
        link = link_elem.get('href') if link_elem is not None else ""
        content = content_elem.text if content_elem is not None else ""
        
        # Extract tags from <h3> headers inside the content html
        # Google's release notes commonly use <h3>Feature</h3>, <h3>Change</h3>, etc.
        raw_tags = re.findall(r'<h3>(.*?)</h3>', content)
        tags = list(set([tag.strip() for tag in raw_tags if tag.strip()]))
        
        if not tags:
            tags = ["General"]
            
        entries.append({
            "title": title,
            "updated": updated,
            "link": link,
            "content": content,
            "tags": tags
        })
        
    return entries

def fetch_feed_data():
    req = urllib.request.Request(
        FEED_URL, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    )
    with urllib.request.urlopen(req, timeout=15) as response:
        return response.read()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    current_time = time.time()
    
    # Check if cache is valid
    if not force_refresh and cache["data"] is not None and (current_time - cache["last_fetched"] < CACHE_DURATION_SECS):
        return jsonify({
            "source": "cache",
            "last_fetched": cache["last_fetched"],
            "releases": cache["data"]
        })
        
    try:
        xml_data = fetch_feed_data()
        releases = parse_release_notes(xml_data)
        
        # Update cache
        cache["data"] = releases
        cache["last_fetched"] = current_time
        
        return jsonify({
            "source": "network",
            "last_fetched": current_time,
            "releases": releases
        })
    except Exception as e:
        # If network fetch fails but cache exists, fall back to cache
        if cache["data"] is not None:
            return jsonify({
                "source": "fallback_cache",
                "last_fetched": cache["last_fetched"],
                "releases": cache["data"],
                "error": f"Failed to fetch fresh data: {str(e)}"
            })
        return jsonify({
            "error": f"Failed to fetch release notes: {str(e)}"
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
