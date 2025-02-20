"""
This script generates an interactive map using the Geoapify Maps API and displays it in a web browser using folium.

Dependencies:
- folium
- requests

To install the required libraries, run:
pip install folium requests

Usage:
python interactive_map.py --style osm-bright --zoom 12 --lat 48.8566 --lon 2.3522 --api-key=your-api-key

Command-line arguments:
--api-key: Api Key for Geoapify services
--style: Map style (default: osm-carto)
--zoom: Zoom level (default: 17)
--lat: Latitude for the map center (default: 48.8584)
--lon: Longitude for the map center (default: 2.2945)
"""

import argparse
import sys
import webbrowser

import folium
import requests

# Define base URL for Geoapify
BASE_URL = "https://maps.geoapify.com/v1/tile/{map_style}/{{z}}/{{x}}/{{y}}@2x.png?apiKey={api_key}"


def create_map(map_style, zoom, lat, lon, api_key) -> folium.Map:
    # Create a folium map centered at the given latitude and longitude
    m = folium.Map(location=[lat, lon], zoom_start=zoom)

    # Construct the tile URL with the selected map style and API Key
    tile_url = BASE_URL.format(map_style=map_style, api_key=api_key)

    # Add the Geoapify raster tiles to the map
    folium.TileLayer(
        tiles=tile_url,
        name='Geoapify Map',
        attr="""Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> 
        | <a href="https://openmaptiles.org/" rel="nofollow" target="_blank">© OpenMapTiles</a> 
        <a href="https://www.openstreetmap.org/copyright" rel="nofollow" target="_blank">© OpenStreetMap</a> contributors""",
        overlay=True,
        control=True
    ).add_to(m)

    # Add Eiffel Tower pin to the map
    folium.Marker(
        location=[48.8584, 2.2945],
        popup='Eiffel Tower',
        icon=folium.Icon(color='red'),
    ).add_to(m)

    # Return the map object
    return m


def get_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description='Generate an interactive map using Geoapify Maps API.')
    parser.add_argument('--style', type=str, default='osm-carto', help='Map style (default: osm-carto)')
    parser.add_argument('--zoom', type=int, default=17, help='Zoom level (default: 17)')
    parser.add_argument('--lat', type=float, default=48.8584, help='Latitude for the map center (default: 48.8584)')
    parser.add_argument('--lon', type=float, default=2.2945, help='Longitude for the map center (default: 2.2945)')
    parser.add_argument('--api-key', type=str, required=True, help='Api Key for Geoapify services')

    return parser


def main():
    # Set up argument parsing for command-line customization
    parser = get_arg_parser()
    args = parser.parse_args()

    # Validate the map style by making a request to the Geoapify API
    response = requests.get(BASE_URL.format(map_style=args.style,
                                            api_key=args.api_key).replace('{z}/{x}/{y}', '0/0/0'))
    if response.status_code == 400:
        print(f"Error: Possible issue with incorrect map style. Falling back to default 'osm-carto'.")
        args.style = 'osm-carto'
    elif response.status_code == 401:
        print('Invalid Api Key, abort')
        sys.exit(1)
    elif response.status_code // 100 == 5:
        print('Server respond with 5XX error, abort')
        sys.exit(1)

    # Create the map with the specified parameters
    map_object = create_map(args.style, args.zoom, args.lat, args.lon, args.api_key)

    # Better not to use show_in_browser method as it can lead to file not found error in different os
    map_object.save('map.html')
    if not webbrowser.open('map.html'):
        print('Cannot open default browser, check your settings')


if __name__ == "__main__":
    main()
