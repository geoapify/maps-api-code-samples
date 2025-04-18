import argparse

import folium
import requests

ROUTE_PLANNER_URL = 'https://api.geoapify.com/v1/routeplanner'
ROUTING_URL = 'https://api.geoapify.com/v1/routing'
BASE_MAP_TILE_URL = "https://maps.geoapify.com/v1/tile/{map_style}/{{z}}/{{x}}/{{y}}@2x.png?apiKey={api_key}"


def parse_arguments():
    parser = argparse.ArgumentParser(description="Optimize route using Geoapify API.")
    parser.add_argument('--api_key', required=True, help='Geoapify API key.')
    parser.add_argument('--input', required=True, help='Input filename (e.g., input.txt).')
    parser.add_argument('--output', default='optimized.txt', help='Output filename for sorted coordinates.')
    parser.add_argument('--map', default='map.html', help='Output HTML file for the generated route map.')
    parser.add_argument('--coord_order', default='latlon', choices=['latlon', 'lonlat'], help='Order of input coordinates.')
    parser.add_argument('--skip_optimization', action='store_true', help='Bypass the Route Planner API.')
    parser.add_argument('--route_mode', default='drive', help='Travel mode (e.g., drive, walk, bike).')
    parser.add_argument('--route_type', default='balanced', choices=['balanced', 'short', 'less_maneuvers'], help='Route optimization type.')
    parser.add_argument('--route_traffic', default='free_flow', choices=['free_flow', 'approximated'], help='Traffic model.')
    parser.add_argument('--start_location', help='Starting location (lat,lon or lon,lat).')
    parser.add_argument('--end_location', help='Ending location (lat,lon or lon,lat).')

    return parser.parse_args()


def read_coordinates(input_file, coord_order):
    coordinates = []
    for line in open(input_file, 'r'):
        coordinates.append(extract_coordinates(line, coord_order))
    return coordinates


def extract_coordinates(coords: str, order: str = 'latlon') -> list[float]:
    try:
        x, y = map(float, coords.strip().split(','))
    except ValueError:
        print('Coordinates must have 2 elements and be digits')
        exit(1)
    return [y, x] if order == 'latlon' else [x, y]


def optimize_route(api_key, coordinates, start_location, end_location, route_mode):
    url = ROUTE_PLANNER_URL.format(api_key=api_key)
    agents = [{key: value for key, value in zip(['start_location', 'end_location'],
                                                [start_location, end_location]) if value}]
    jobs = [{"location": coord} for coord in coordinates]
    payload = {
        "mode": route_mode,
        "agents": agents,
        "jobs": jobs
    }
    response = requests.post(url, json=payload, params={'apiKey': api_key})
    if response.status_code == 200:
        data = response.json()
        waypoints = data['features'][0]['properties']['waypoints']
        # Return waypoints only if they have certainly one action
        return [wp['location'] for wp in waypoints if len(wp['actions']) == 1]
    else:
        raise Exception(f"Failed to optimize route: {response.text}")


def get_route(api_key, waypoints, route_mode, route_type, route_traffic):
    waypoints_str = '|'.join([f"lonlat:{lon},{lat}" for lon, lat in waypoints])
    url = ROUTING_URL.format(waypoints_str=waypoints_str,
                             route_mode=route_mode,
                             route_type=route_type,
                             route_traffic=route_traffic)
    response = requests.get(url, params={
        'waypoints': waypoints_str,
        'mode': route_mode,
        'type': route_type,
        'traffic': route_traffic,
        'apiKey': api_key
    })
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Failed to retrieve route: {response.text}")


def generate_map(route_data, output_map, waypoints, start_location, end_location, api_key):
    m = folium.Map(location=[0, 0], zoom_start=13)
    
    # Construct the tile URL with the selected map style and API Key
    tile_url = BASE_MAP_TILE_URL.format(map_style="osm-bright-grey", api_key=api_key)

    # Add the Geoapify raster tiles to the map
    folium.TileLayer(
        tiles=tile_url,
        name='Geoapify Map',
        attr="""Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> 
        | <a href="https://openmaptiles.org/" rel="nofollow" target="_blank">© OpenMapTiles</a> contributors""",
        overlay=True,
        control=True
    ).add_to(m)

    route = folium.GeoJson(route_data, style_function=lambda f: {
        'color': 'red',
        'weight': 7,
        'opacity': 0.8
    })
    route.add_to(m)
    m.fit_bounds(route.get_bounds())
    # Render markers that present every waypoint of route
    for num, coords in enumerate(waypoints):
        make_icon_marker(num + 1, coords, api_key).add_to(m)
    # Mark start and end locations
    for label, coords in zip(['Start', 'End'], [start_location, end_location]):
        if coords:
            make_icon_marker(label, coords, api_key).add_to(m)

    m.save(output_map)


def make_icon_marker(label, coords, api_key) -> folium.Marker:
    # Create custom marker from icon API
    marker_url = 'https://api.geoapify.com/v1/icon/?type=circle&color=red&size=large&text={label}&noShadow&noWhiteCircle&scaleFactor=2&apiKey={api_key}'
    icon = folium.CustomIcon(marker_url.format(api_key=api_key, label=label),
                             icon_size=(31, 31),
                             icon_anchor=(15, 42),
                             popup_anchor=(0, -42))
    return folium.Marker(location=coords[::-1], icon=icon)


def main():
    # Retrieve command line options
    args = parse_arguments()

    # Check for starting or ending point
    if not args.start_location and not args.end_location:
        raise ValueError("At least one of --start_location or --end_location must be provided.")
    # Read coordinates from input file
    coordinates = read_coordinates(args.input, args.coord_order)

    # Extract coordinates from string and adjust order
    start_location = extract_coordinates(args.start_location, args.coord_order) if args.start_location else None
    end_location = extract_coordinates(args.end_location, args.coord_order) if args.end_location else None

    if not args.skip_optimization:
        try:
            # Optimize coordinates order based on route planner API
            coordinates = optimize_route(args.api_key, coordinates, start_location, end_location, args.route_mode)
        except Exception as e:
            print(f'Cannot optimize route ({str(e)}), fallback to original order..')
    # Write file with original or optimized coordinates
    with open(args.output, 'w') as file:
        for coord in coordinates:
            x, y = coord
            record = f'{x},{y}\n' if args.coord_order == 'lonlat' else f'{y},{x}\n'
            file.write(record)
    # Obtain Geojson polyline from routing API based on set of coordinates and route options
    route_data = get_route(args.api_key, coordinates, args.route_mode, args.route_type, args.route_traffic)
    # Create html file with folium map
    generate_map(route_data, args.map, coordinates, start_location, end_location, args.api_key)


if __name__ == "__main__":
    main()
