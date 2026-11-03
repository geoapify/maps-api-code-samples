"""
Shows geocoded addresses on an interactive Folium map with Geoapify map tiles.
Markers are colored by geocoding confidence (rank.confidence) and can be clustered.

Dependencies:
- folium
- requests

To install the required libraries, run:
pip install folium requests

Usage:
python show_addresses.py --input addresses.ndjson --api-key=YOUR_API_KEY
python show_addresses.py --input addresses.ndjson --output my_map.html --cluster --geoapify-markers --api-key=YOUR_API_KEY

Command-line arguments:
--input: NDJSON file with Geoapify Geocoding API results, one JSON object per line
--output: Output HTML file (default: map.html)
--cluster: Group nearby markers into clusters
--geoapify-markers: Use Geoapify Marker Icon API icons instead of the default Folium markers
--api-key: Geoapify API key (used for the map tiles and the marker icons)
"""

import argparse
import json
import os
import sys
import webbrowser
from html import escape
from urllib.parse import urlencode

import folium
import requests
from folium.plugins import MarkerCluster

# Geoapify raster map tiles
BASE_MAP_TILE_URL = "https://maps.geoapify.com/v1/tile/{map_style}/{{z}}/{{x}}/{{y}}@2x.png?apiKey={api_key}"
# Geoapify Marker Icon API (v2)
MARKER_ICON_URL = "https://api.geoapify.com/v2/icon"

# Confidence levels: (lowest confidence, Folium marker color, Geoapify marker color, label)
CONFIDENCE_LEVELS = [
    (0.7, 'green', '#2e7d32', 'high (0.7 and above)'),
    (0.5, 'beige', '#f9a825', 'medium (0.5 to 0.7)'),
    (0.25, 'orange', '#ef6c00', 'low (0.25 to 0.5)'),
    (0.0, 'red', '#c62828', 'very low (below 0.25)'),
]


def read_ndjson(file_path):
    """Reads one JSON object per line; skips empty and invalid lines."""
    records = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            for line_number, line in enumerate(f, start=1):
                line = line.strip()
                if not line:
                    continue
                try:
                    records.append(json.loads(line))
                except json.JSONDecodeError:
                    print(f"Skipping line {line_number}: not valid JSON.")
    except FileNotFoundError:
        sys.exit(f"Input file not found: {file_path}")
    return records


def get_confidence_level(confidence):
    for level in CONFIDENCE_LEVELS:
        if confidence >= level[0]:
            return level
    return CONFIDENCE_LEVELS[-1]


def calculate_bounds(points):
    """Returns [[south, west], [north, east]] for a list of [lat, lon] points."""
    latitudes = [p[0] for p in points]
    longitudes = [p[1] for p in points]
    return [[min(latitudes), min(longitudes)], [max(latitudes), max(longitudes)]]


def create_geoapify_icon_factory(api_key):
    """Returns a function that makes a Folium icon from a marker color.
    The Marker Icon API returns the display size and anchor point in its Icon-* response headers,
    so one HEAD request per color is enough to place the markers correctly."""
    cache = {}

    def make_icon(color):
        if color not in cache:
            params = {
                'type': 'material',
                'icon': 'building',
                'iconType': 'awesome',
                'color': color,
                'scaleFactor': 2,  # sharp on high-density screens
                'apiKey': api_key,
            }
            icon_url = f"{MARKER_ICON_URL}?{urlencode(params)}"
            response = requests.head(icon_url, timeout=10)
            if response.status_code != 200:
                sys.exit(f"Marker Icon API error {response.status_code}. Check the API key.")
            h = response.headers
            cache[color] = {
                'url': icon_url,
                'size': (float(h['Icon-Width']), float(h['Icon-Height'])),
                'anchor': (float(h['Icon-Anchor-X']), float(h['Icon-Anchor-Y'])),
            }
        icon = cache[color]
        return folium.CustomIcon(icon['url'], icon_size=icon['size'], icon_anchor=icon['anchor'],
                                 popup_anchor=(0, -icon['anchor'][1]))

    return make_icon


def create_map(data, cluster, add_geoapify_markers, api_key, map_style='osm-bright'):
    m = folium.Map(location=[0, 0], zoom_start=2, tiles=None)

    # Add the Geoapify raster tiles to the map
    folium.TileLayer(
        tiles=BASE_MAP_TILE_URL.format(map_style=map_style, api_key=api_key),
        name='Geoapify Map',
        attr="""Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a>
        | <a href="https://openmaptiles.org/" rel="nofollow" target="_blank">© OpenMapTiles</a>
        <a href="https://www.openstreetmap.org/copyright" rel="nofollow" target="_blank">© OpenStreetMap</a> contributors""",
    ).add_to(m)

    marker_cluster = MarkerCluster().add_to(m) if cluster else None
    make_geoapify_icon = create_geoapify_icon_factory(api_key) if add_geoapify_markers else None

    points = []
    skipped = 0
    for entry in data:
        lat, lon = entry.get('lat'), entry.get('lon')
        if lat is None or lon is None:
            skipped += 1
            continue

        # Geocoding API results have "formatted"; a hand-made list may use "address"
        address = entry.get('formatted') or entry.get('address') or f"{lat}, {lon}"
        confidence = entry.get('rank', {}).get('confidence', 0)
        _, folium_color, geoapify_color, label = get_confidence_level(confidence)

        icon = make_geoapify_icon(geoapify_color) if make_geoapify_icon else folium.Icon(color=folium_color)
        popup = folium.Popup(f"{escape(address)}<br>Confidence: {confidence} ({label})", max_width=300)
        folium.Marker(location=[lat, lon], popup=popup, icon=icon).add_to(marker_cluster or m)
        points.append([lat, lon])

    if skipped:
        print(f"Skipped {skipped} record(s) without coordinates.")
    if points:
        # Adjust the map view to show all points
        m.fit_bounds(calculate_bounds(points))
    return m, len(points)


def main():
    parser = argparse.ArgumentParser(description='Show geocoded addresses on a map with Geoapify map tiles.')
    parser.add_argument('--input', required=True, help='NDJSON file with geocoding results')
    parser.add_argument('--output', default='map.html', help='Output HTML file (default: map.html)')
    parser.add_argument('--cluster', action='store_true', help='Group nearby markers into clusters')
    parser.add_argument('--geoapify-markers', action='store_true', help='Use Geoapify Marker Icon API icons')
    parser.add_argument('--api-key', required=True, help='Geoapify API key')
    args = parser.parse_args()

    data = read_ndjson(args.input)
    if not data:
        sys.exit("No records to show.")

    m, count = create_map(data, args.cluster, args.geoapify_markers, args.api_key)
    m.save(args.output)
    print(f"Saved a map with {count} markers to {args.output}")
    webbrowser.open('file://' + os.path.abspath(args.output))


if __name__ == "__main__":
    main()
