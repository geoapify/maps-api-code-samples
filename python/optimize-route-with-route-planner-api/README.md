# Find the Optimal Route and Visualize It on a Map

## Description
This example demonstrates how to calculate an **optimal route** using the **Geoapify Route Planner API** and visualize it with **Folium**. It optionally supports skipping optimization and generating a route from coordinates in their original order.

![Optimal Route Example, in Limassol, Cyprus](https://github.com/geoapify/maps-api-code-samples/blob/main/python/optimize-route-with-route-planner-api/optimal-route-example.png?raw=true)

## Requirements
- Python 3.11 or higher
- pip

## Setup Instructions

### 1. Clone the Repository
```bash
git clone https://geoapify.github.io/maps-api-code-samples/
cd maps-api-code-samples/python/
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

---

## Running the Example

Go to the folder:

```bash
cd optimize-route-with-route-planner-api
```

Run the script:

```bash
python optimal_route.py \
  --api_key YOUR_API_KEY \
  --input input.txt \
  --map map.html \
  --coord_order lonlat \
  --route_mode drive \
  --route_type balanced \
  --route_traffic free_flow \
  --start_location 33.055045935635796,34.683768
```

Skip Optimization Example:

```bash
python optimal_route.py --api_key YOUR_API_KEY --input input.txt --skip_optimization
```

## Command-Line Arguments
| Argument             | Required | Description |
|----------------------|----------|-------------|
| `--api_key`          | Yes      | Geoapify API key |
| `--input`            | Yes      | Input file with coordinates |
| `--output`           | No       | Output file with optimized coordinates (default: `optimized.txt`) |
| `--map`              | No       | Output HTML map file (default: `map.html`) |
| `--coord_order`      | No       | Coordinate format: `latlon` (default) or `lonlat` |
| `--skip_optimization`| No       | Bypass Route Planner API and use given order |
| `--route_mode`       | No       | Travel mode (`drive`, `walk`, `bike`, etc.) |
| `--route_type`       | No       | Routing strategy: `balanced`, `short`, `less_maneuvers` |
| `--route_traffic`    | No       | Traffic model: `free_flow`, `approximated` |
| `--start_location`   | Required*| Start location in same format as coord_order |
| `--end_location`     | Required*| End location in same format as coord_order |

> *At least one of `--start_location` or `--end_location` must be provided.*


## Features
- Optimizes stop sequence using **Geoapify Route Planner API**
- Plots route using **Geoapify Routing API**
- Supports both `optimized` and `original` coordinate order
- Saves route as sorted coordinates and HTML map
- Configurable routing parameters
- Adds numbered markers using Geoapify Marker API or built-in icons


## Output Files
- `optimized.txt`: List of reordered coordinates (one per line)
- `map.html`: Folium map displaying the full route

## APIs Used
- [Geoapify Route Planner API](https://apidocs.geoapify.com/playground/route-planner/)
- [Geoapify Routing API](https://apidocs.geoapify.com/playground/routing/)
- [Geoapify Map Marker API](https://apidocs.geoapify.com/playground/icon/)
- [Folium Library](https://python-visualization.github.io/folium/)


## Function-by-Function Breakdown

### `optimize_route(...)`

```python
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
```

Sends a POST request to **Geoapify Route Planner API**.

- Constructs a task payload with:
  - Agent: `start_location`, `end_location` (if provided)
  - Jobs: the list of locations
  - Mode: travel type (`drive`, `walk`, etc.)
- Returns only the waypoints that are part of the optimized visit plan.
- Filters out non-"visit" actions like `start` or `end`.

✅ **Why?** The Route Planner API returns a complete task solution with all actions — we keep only those with `"visit"` action to get the optimized order.

### `get_route(...)`

```python
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
```

Sends a GET request to the **Geoapify Routing API** using the ordered list of coordinates.

- Converts waypoints into `lonlat:` format string, separated by `|`.
- Returns GeoJSON route geometry.

### `generate_map(...)`

```python
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
```

Builds a Folium map and adds:
- **Geoapify tile layer** as the background map
- The **route geometry** as a red polyline
- **Custom markers** for each stop using the Geoapify Map Marker API (with number or "Start"/"End" labels)

Also auto-fits the map to the full route.

### `make_icon_marker(label, coords, api_key)`

```python
def make_icon_marker(label, coords, api_key) -> folium.Marker:
    # Create custom marker from icon API
    marker_url = 'https://api.geoapify.com/v1/icon/?type=circle&color=red&size=large&text={label}&noShadow&noWhiteCircle&scaleFactor=2&apiKey={api_key}'
    icon = folium.CustomIcon(marker_url.format(api_key=api_key, label=label),
                             icon_size=(31, 31),
                             icon_anchor=(15, 42),
                             popup_anchor=(0, -42))
    return folium.Marker(location=coords[::-1], icon=icon)
```

Generates a numbered marker using the **Geoapify Map Marker API** and returns a `folium.Marker`.

- Applies red circle style with the `label` as text.
- Marker icons are visually distinct and scalable.

### `main()`

The script’s entry point.

1. Parses args
2. Validates that at least `--start_location` or `--end_location` is present
3. Reads and optionally reorders the coordinates
4. Saves the reordered list to `optimized.txt`
5. Calls Routing API and saves the HTML route map

### Highlights

- Works with both optimized and static orders
- Easy configuration with CLI flags
- Uses Route Planner for TSP-style optimization
- Uses Routing API for navigable polyline
- Beautiful map rendering with Geoapify tiles and marker icons


## License
MIT License