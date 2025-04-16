# Display Isochrone/IsoDistance on a Map Using Folium

## Description
This project demonstrates how to generate and display an **isochrone** (time-based isoline) or **isodistance** (distance-based isoline) on an interactive map using the [Geoapify Isoline API](https://www.geoapify.com/isoline-api/) and Folium in Python.

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
source env/bin/activate  # Windows: env\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install folium requests
```

## Running the Example

### For isochrone:
```bash
python show_isoline.py --lat 28.293067 --lon -81.550409 --type time --mode drive --range 900 --output my_map.html --api_key YOUR_API_KEY
```

### For isodistance:
```bash
python show_isoline.py --lat 40.712776 --lon -74.005974 --type distance --mode walk --range 2000 --traffic approximated --route_type short --api_key YOUR_API_KEY
```

## Command-Line Arguments
| Argument         | Required | Description |
|------------------|----------|-------------|
| `--lat`          | Yes      | Latitude of the start point |
| `--lon`          | Yes      | Longitude of the start point |
| `--type`         | Yes      | Type of isoline: `time` or `distance` |
| `--mode`         | Yes      | Travel mode: `drive`, `walk`, `bicycle`, etc. |
| `--range`        | Yes      | Time in seconds or distance in meters |
| `--avoid`        | No       | Space-separated list of things to avoid: `tolls`, `ferries`, etc. |
| `--traffic`      | No       | Traffic model: `free_flow` or `approximated` |
| `--route_type`   | No       | Route optimization: `balanced`, `short`, `less_maneuvers` |
| `--max_speed`    | No       | Max vehicle speed in KPH |
| `--units`        | No       | Units: `metric` or `imperial` (default: `metric`) |
| `--output`       | No       | Output HTML filename (default: `map.html`) |
| `--api_key`      | Yes      | Your Geoapify API key |


## Features
- Generate isochrones and isodistances interactively
- Visualize results using [Folium](https://python-visualization.github.io/folium/)
- Automatically opens the map in the browser
- Supports advanced options: traffic, route types, avoidance, units


## APIs Used
- [Geoapify Isoline API](https://www.geoapify.com/isoline-api/)
- API Playground: https://apidocs.geoapify.com/playground/isoline/


## Example Output
The script will generate an interactive HTML map (e.g., `my_map.html`) with the isoline drawn as a colored polygon, centered on the selected location.


Here's a clear explanation of your `show_isoline.py` script, broken down by function and purpose. This script uses the **Geoapify Isoline API** and **Folium** to visualize isochrones or isodistances on a map.


## Code Explanation

### 1. `fetch_isoline(...)`

```python
def fetch_isoline(lat, lon,
                  type_, mode, range_,
                  avoid=None, traffic="free_flow", route_type="balanced", max_speed=None,
                  units="metric",
                  api_key=None):
    """Fetch isoline data from Geoapify API."""
    url = "https://api.geoapify.com/v1/isoline"

    params = {
        "lat": lat,
        "lon": lon,
        "type": type_,
        "mode": mode,
        "range": range_,
        "traffic": traffic,
        "route_type": route_type,
        "units": units,
        "apiKey": api_key,
    }

    # Build avoid params as elements separated by |
    if avoid:
        params["avoid"] = "|".join(avoid)

    if max_speed:
        params["max_speed"] = max_speed

    response = requests.get(url, params=params)

    if response.status_code == 200:
        # Return isoline for on success
        return response.json()
    else:
        print(f"API request failed: {response.text}")
        exit(1)
```

- **Purpose**: Sends a GET request to the [Geoapify Isoline API](https://apidocs.geoapify.com/playground/isoline/) to retrieve an isochrone (time) or isodistance (distance) polygon.
- **Parameters**: Latitude, longitude, travel mode, range (seconds/meters), and optional parameters like traffic model, avoid options, and units.
- **Behavior**:
  - Formats all parameters into a dictionary for the API request.
  - If `avoid` is provided as a list, it's joined with `|` as required by Geoapify (`"tolls|ferries"`).
  - Makes the request using `requests.get(...)`.
  - Returns the parsed JSON (`GeoJSON`) if successful; otherwise, prints an error and exits.

### 2. `render_map(...)`

```python
def render_map(lat, lon, isoline_data, output_file):
    """Render isoline on a Folium map."""
    m = folium.Map(location=[lat, lon], zoom_start=13)

    # Extract coordinates and type from GeoJSON, skip empty data
    if "features" in isoline_data and len(isoline_data["features"]) > 0:
        folium.GeoJson(
            isoline_data,
            style_function=lambda feature: {
                "color": "orange" if feature["properties"].get("type") == "time" else "green",
                "fillColor": "orange" if feature["properties"].get("type") == "time" else "green",
                "fillOpacity": 0.4,
            },
            # Enable popup with isoline metadata
            popup=folium.features.GeoJsonPopup(fields=["id", "range", "mode"], aliases=['Id', 'Range', 'Mode'])
        ).add_to(m)

    m.save(output_file)
    print(f"Map saved to {output_file}")
    webbrowser.open(output_file)
```

- **Purpose**: Visualizes the isoline data using [Folium](https://python-visualization.github.io/folium/).
- **Features**:
  - Initializes a `folium.Map` centered on the given coordinates.
  - Checks for valid isoline data.
  - Uses `folium.GeoJson()` to display the polygon.
    - Style is dynamically set:
      - `orange` for time-based isolines
      - `green` for distance-based isolines
  - Adds a **popup** with the isoline’s metadata: `id`, `range`, and `mode`.
  - Saves the map to an HTML file and opens it in the default browser using `webbrowser.open()`.

### 3. `main()`

```python
def main():
    parser = argparse.ArgumentParser(description="Generate isoline maps using Geoapify API.")

    parser.add_argument("--lat", type=float, required=True, help="Latitude of the starting point.")
    parser.add_argument("--lon", type=float, required=True, help="Longitude of the starting point.")
    parser.add_argument("--type", type=str, choices=["time", "distance"], required=True,
                        help="Isochrone or isodistance.")
    parser.add_argument("--mode", type=str, required=True, help="Travel mode.")
    parser.add_argument("--range", type=int, required=True,
                        help="Isoline range (seconds for time, meters for distance).")
    parser.add_argument("--avoid", type=str, nargs="*", help="Avoid options (e.g., tolls, ferries).")
    parser.add_argument("--traffic", type=str, default="free_flow", choices=["free_flow", "approximated"],
                        help="Traffic model.")
    parser.add_argument("--route_type", type=str, default="balanced", choices=["balanced", "short", "less_maneuvers"],
                        help="Route optimization type.")
    parser.add_argument("--max_speed", type=int, help="Maximum vehicle speed in KPH.")
    parser.add_argument("--units", type=str, default="metric", choices=["metric", "imperial"],
                        help="Distance measurement system.")
    parser.add_argument("--output", type=str, default="map.html", help="Path to save the generated HTML file.")
    parser.add_argument('--api_key', required=True, type=str, help='Geoapify API KEY')

    args = parser.parse_args()

    try:
        # Fetch isoline data
        isoline_data = fetch_isoline(
            lat=args.lat,
            lon=args.lon,
            type_=args.type,
            mode=args.mode,
            range_=args.range,
            avoid=args.avoid,
            traffic=args.traffic,
            route_type=args.route_type,
            max_speed=args.max_speed,
            units=args.units,
            api_key=args.api_key
        )

        # Render the map
        render_map(args.lat, args.lon, isoline_data, args.output)

    except Exception as e:
        print(f"Error: {e}")
```

- **Purpose**: Entry point of the script. Parses command-line arguments and orchestrates the isoline generation and rendering.
- Uses Python’s `argparse` module to handle CLI parameters.
- Calls:
  - `fetch_isoline(...)` to get GeoJSON isoline data.
  - `render_map(...)` to draw and save the map.


## License
MIT License