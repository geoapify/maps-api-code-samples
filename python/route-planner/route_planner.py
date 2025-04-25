import argparse
import json
import os

import folium
import requests

ROUTE_PLANNER_URL = "https://api.geoapify.com/v1/routeplanner"
ROUTING_URL = "https://api.geoapify.com/v1/routing"


def parse_arguments():
    parser = argparse.ArgumentParser(description='Process a Route Planner API request.')
    parser.add_argument('--api_key', required=True, help='Geoapify API key')
    parser.add_argument('--input', required=True, help='Input JSON file containing the route request')
    parser.add_argument('--output', required=True, help='Output directory for agent folders and reports')
    
    return parser.parse_args()


def read_request_file(input_file):
    with open(input_file, 'r') as file:
       request = json.load(file)
    if not 'agents' in request or not ('jobs' in request or 'shipments' in request):
        print('Incorrect request body')
        exit(1)

    return request


def extract_route_plans(api_key, request_data):
    response = requests.post(ROUTE_PLANNER_URL,
                             params={'apiKey': api_key},
                             json=request_data)
    response.raise_for_status()

    return response.json()


def save_agent_plan(api_key, agent_data, output_dir):
    # Create dir that contains agent index in name
    agent_dir = os.path.join(output_dir, f'agent_{agent_data['agent_index']}')
    os.makedirs(agent_dir, exist_ok=True)

    # Save plan.json
    plan_path = os.path.join(agent_dir, 'plan.json')
    with open(plan_path, 'w') as file:
        json.dump(agent_data, file)


    map_path = os.path.join(agent_dir, 'map.html')
    coordinates = [wp['location'] for wp in agent_data['waypoints']]
    try:
        # Generate route by Routing API
        route = get_route(api_key, coordinates)
    except requests.exceptions.RequestException as e:
        print(f'Cannot get route for agent {agent_data['agent_index']}: {e}')
        return
    # Generate map.html
    generate_map(route, map_path, coordinates, api_key)


def get_route(api_key, waypoints):
    waypoints_str = '|'.join([f"lonlat:{lon},{lat}" for lon, lat in waypoints])
    url = ROUTING_URL.format(waypoints_str=waypoints_str)

    response = requests.get(url, params={
        'waypoints': waypoints_str,
        'mode': 'drive',
        'apiKey': api_key
    })
    response.raise_for_status()
    return response.json()


def generate_map(route_data, output_map, waypoints, api_key):
    m = folium.Map(location=[0, 0], zoom_start=13)
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

    m.save(output_map)


def make_icon_marker(label, coords, api_key) -> folium.Marker:
    # Create custom marker from icon API
    marker_url = 'https://api.geoapify.com/v1/icon/?type=circle&color=red&size=large&text={label}&noShadow&noWhiteCircle&scaleFactor=2&apiKey={api_key}'
    icon = folium.CustomIcon(marker_url.format(api_key=api_key, label=label),
                             icon_size=(31, 31),
                             icon_anchor=(15, 15),
                             popup_anchor=(0, -42))
    return folium.Marker(location=coords[::-1], icon=icon)


def save_issues_report(issues, output_dir):
    issues_path = os.path.join(output_dir, 'issues.json')
    with open(issues_path, 'w') as file:
        json.dump(issues, file)


def main():
    # Parse cli arguments
    args = parse_arguments()

    # Read and validate input JSON
    request_data = read_request_file(args.input)

    # Call Geoapify Route Planner API to extract route plans
    try:
        response_data = extract_route_plans(args.api_key, request_data)
    except requests.exceptions.RequestException as e:
        print(f"API request failed: {e}")
        return

    # Extract geojson properties as agents plans
    agents = response_data.get('features', [])
    # Extract issues occurred during the planning process
    issues = response_data['properties'].get('issues', {})

    # For every agent plan save data and generate map with optimized route
    for agent_data in agents:
        save_agent_plan(args.api_key, agent_data['properties'], args.output)

    save_issues_report(issues, args.output)


if __name__ == '__main__':
    main()
