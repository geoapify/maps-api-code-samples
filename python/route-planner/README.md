# Route Planner Result Processor Example

This project demonstrates how to process a Route Planner API request using the **[Geoapify Route Planner API]((https://www.geoapify.com/route-planner-api/))**, generate structured outputs per agent, and visualize the assigned routes using **Folium** and [Routing API](https://www.geoapify.com/routing-api/).

## Requirements

Ensure you have the following installed:

1. Python 3.11 or higher
2. pip (Python package manager)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://gitlab.com/geoapify-externals/code-samples
cd code-samples/python/route_planner_example
```

### 2. Create a Virtual Environment (Optional)

```bash
python -m venv env
source env/bin/activate  # On Windows: env\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install folium requests
```

## Running the Example

```bash
cd route-planner
python route_planner.py --api_key YOUR_API_KEY --input request.json --output results/
```

## Command-line Arguments

- `--api_key` (required): Geoapify API key.
- `--input` (required): Path to the input JSON file. That represents a request for Route Planner API. You can generate examples of request with our [Playground](https://apidocs.geoapify.com/playground/route-planner/).
- `--output` (required): Output directory to store results.


## What It Does

- **Reads** a Route Planner API request (input JSON).
- **Sends** the request to the Geoapify Route Planner API.
- **Generates** structured results for each agent:
  - Saves `plan.json` with assigned waypoints and actions.
  - Creates a route **preview map (`map.html`)** using the **Routing API** and **Folium**.
- **Outputs** an `issues.json` file listing any reported issues (e.g., unassigned jobs).


## Example Output Structure

```
results/
│── issues.json
│── agent_1/
│   ├── plan.json
│   ├── map.html
│── agent_2/
│   ├── plan.json
│   ├── map.html
...
```

## Code Explanation
This Python script automates the processing of a Route Planner API request using Geoapify's services, and generates detailed structured outputs for each agent.
It is designed to work with JSON files formatted according to the Geoapify Route Planner API specifications.

The key features of the script include:
* Sending the input JSON request to the Route Planner API and handling the response.
* Extracting and saving individual agent plans in separate folders.
* Creating interactive maps visualizing each agent’s optimized route using Folium.
* Generating an issues report file listing any problems detected during the optimization (e.g., unassigned jobs).



Perfect! Let’s go function-by-function, starting with the `main()` function, then moving on to `extract_route_plans()` and its subfunctions, followed by `save_agent_plan()` and `save_issues_report()`.

---

### 1. `main()`

```python
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
```

#### What it does:
- This is the main entry point of the script.
- It parses command-line arguments, loads the input JSON request, sends it to the Route Planner API, and handles the response.
- For each agent in the result, it creates a folder with:
  - A `plan.json` containing routing info.
  - A `map.html` visualizing the agent’s route.
- It also saves `issues.json` summarizing any problems returned by the API.

### 2. `extract_route_plans(api_key, request_data)`

```python
def extract_route_plans(api_key, request_data):
    response = requests.post(ROUTE_PLANNER_URL,
                             params={'apiKey': api_key},
                             json=request_data)
    response.raise_for_status()
    return response.json()
```

#### What it does:
- Sends a `POST` request to Geoapify's **Route Planner API**, using the provided request body.
- Attaches the API key as a query parameter.
- Raises an exception if the request fails (e.g., due to a network issue or invalid request).
- Returns the parsed JSON response on success.

### 3. `save_agent_plan(api_key, agent_data, output_dir)`

```python
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
```

#### What it does:
- Creates a folder for each agent (e.g., `agent_0`, `agent_1`).
- Saves a JSON file (`plan.json`) with the agent’s route plan, actions, and assigned jobs.
- Extracts waypoints from the agent's data and calls the **Routing API** to retrieve a navigable route.
- Generates a Folium map (`map.html`) with markers and polylines visualizing the route.


### 4. `get_route(api_key, waypoints)`

```python
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
```

This function sends a **request to the Geoapify Routing API** to retrieve a route (polyline) based on a given list of waypoints.

- **Inputs**:
  - `api_key`: Your Geoapify API key for authentication.
  - `waypoints`: A list of `[longitude, latitude]` pairs representing the route points.

- **What it does**:
  1. Converts the list of waypoints into the API-expected string format:
     ```
     lonlat:lon1,lat1|lonlat:lon2,lat2|...
     ```
  2. Sends a **GET** request to the Routing API using the waypoints, `drive` mode, and your API key.
  3. If the API call succeeds, returns the route as a GeoJSON object.
  4. If the call fails, raises an exception to be caught in the higher-level function.

- **Notes**:
  - Currently, the `mode` is hardcoded as `drive`, but it can be extended easily.
  - Uses `raise_for_status()` for clean error handling.


### 5. `generate_map(route_data, output_map, waypoints, api_key)`

```python
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
```

This function **creates an interactive HTML map** using **Folium** that displays the calculated route and numbered waypoint markers.

- **Inputs**:
  - `route_data`: The GeoJSON route returned by the Routing API.
  - `output_map`: The filename to save the generated HTML map.
  - `waypoints`: List of `[lon, lat]` points to mark along the route.
  - `api_key`: Used if custom markers (via Geoapify Icon API) are added.

- **What it does**:
  1. Initializes a **Folium Map** centered at `[0,0]` (but adjusted later).
  2. Adds the route as a **red polyline** using `folium.GeoJson`.
  3. Adjusts the viewport automatically with `fit_bounds()` to show the full route.
  4. Adds **custom numbered markers** for each waypoint, calling `make_icon_marker()`.

- **Notes**:
  - The map has a nice zoom and line style for clarity.
  - Each waypoint is clickable with a styled marker.

### 6. `make_icon_marker(label, coords, api_key)`

```python
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
```

This helper function **creates a custom Folium marker** with a **number or label** using the **Geoapify Map Marker API**.

- **Inputs**:
  - `label`: The number or text displayed inside the marker.
  - `coords`: The `[longitude, latitude]` position where the marker should be placed.
  - `api_key`: Geoapify API key needed to fetch the marker icon.

- **What it does**:
  1. Builds a URL to request a **red circular marker** with the given label from the Geoapify Map Marker API.
  2. Creates a `folium.CustomIcon` using that URL.
  3. Returns a **Folium Marker** positioned at the provided coordinates, using the custom icon.

- **Notes**:
  - Automatically flips coordinates (`coords[::-1]`) because Folium expects `[lat, lon]` order.
  - Marker size, anchor, and popup settings are optimized for clean display.


### 7. `save_issues_report(issues, output_dir)`

```python
def save_issues_report(issues, output_dir):
    issues_path = os.path.join(output_dir, 'issues.json')
    with open(issues_path, 'w') as file:
        json.dump(issues, file)
```

#### What it does:
- Writes a simple `issues.json` file containing problems reported by the Route Planner API.
- These might include unassigned jobs, infeasible shipments, or routing errors.

## Related Links

- [Geoapify Route Planner API](https://www.geoapify.com/route-planner-api/)
- [Geoapify Routing API](https://www.geoapify.com/routing-api/)
- [Folium](https://python-visualization.github.io/folium/)


## License

This example is provided under the [MIT License](../../LICENSE.md).

