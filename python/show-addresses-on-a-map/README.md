# Display Addresses on a Map with Clustering and Confidence-Based Coloring (Folium)

## Objective
Create a Python script that visualizes **[geocoded addresses](https://github.com/geoapify/maps-api-code-samples/tree/main/python/geocode_addresses) on a Folium map**. The script should support **marker clustering**, **interactive popups**, and **custom marker colors based on confidence levels**. Optionally, it can integrate with the **[Geoapify Map Markers API](https://apidocs.geoapify.com/playground/icon/)** for enhanced visual styling.

![Map Previews](https://github.com/geoapify/maps-api-code-samples/blob/main/python/show-addresses-on-a-map/addresses-on-a-map.png?raw=true)

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
pip install folium ndjson
```

## Running the Example

Switch to the folder:

```bash
cd show-addresses-on-a-map
```

Run the script:

```bash
python show_addresses.py --input addresses.ndjson --output my_map.html --cluster --geoapify-markers --api-key=YOUR_API_KEY
```

```bash
python show_addresses.py --input addresses.ndjson --output map.html --cluster False
```

## Command-Line Arguments
| Argument              | Required | Description |
|------------------------|----------|-------------|
| `--input`              | Yes      | Path to the NDJSON input file |
| `--output`             | No       | Path to output HTML file (default: `map.html`) |
| `--cluster`            | No       | Enable marker clustering |
| `--geoapify-markers`   | No       | Use Geoapify Map Markers API for icons |
| `--api-key`            | No       | Geoapify API key (required if using `--geoapify-markers`) |

## Features
- Read geocoded addresses from NDJSON file
- Interactive popups showing the address
- Marker color coding based on `rank.confidence`:
  - Green: ≥ 0.7
  - Yellow: (0.7; 0.5]
  - Orange: (0.5; 0.25]
  - Red: < 0.25
- Enable optional **marker clustering** via Folium's `MarkerCluster`
- Use Geoapify Map Markers API for styled icons: https://apidocs.geoapify.com/playground/icon/
- Auto-fit map bounds to include all points
- Automatically opens generated HTML map

## Error Handling
- Skips and warns on invalid or incomplete records
- Validates required fields (`lat`, `lon`, optionally `address`, `rank.confidence`)
- Provides user-friendly errors for input issues

## Example Input (NDJSON)
```json
{"lat": 48.858844, "lon": 2.294351, "address": "Eiffel Tower", "rank": {"confidence": 0.95}}
{"lat": 40.748817, "lon": -73.985428, "address": "Empire State", "rank": {"confidence": 0.65}}
{"lat": 51.500729, "lon": -0.124625, "address": "Big Ben", "rank": {"confidence": 0.4}}
```

## Code Explanation

### Imports

```python
import argparse, webbrowser
from urllib.parse import urlencode
import folium, ndjson
from branca.colormap import linear
from folium.plugins import MarkerCluster
```

- `folium`: interactive map rendering.
- `MarkerCluster`: groups nearby markers.
- `linear`: color gradient scale for confidence.
- `ndjson`: reads newline-delimited JSON.
- `webbrowser`: opens map in the browser.

### `read_ndjson(file_path)`

Reads geocoded data from an NDJSON file.

- Returns a list of dicts.
- Gracefully handles missing files or malformed data.

### `calculate_bounds(points)`

Calculates map bounds for all coordinates to ensure all markers are visible.

```python
sw = [min(latitudes), min(longitudes)]  # Southwest
ne = [max(latitudes), max(longitudes)]  # Northeast
```

### `get_discrete_color(confidence)`

Returns a color based on confidence value:

| Confidence Range | Color  |
|------------------|--------|
| ≥ 0.7            | Green  |
| 0.5 – 0.7        | Yellow |
| 0.25 – 0.5       | Orange |
| < 0.25           | Red    |

Used if **Geoapify markers are not enabled**.

### `create_map(...)`

```python
def create_map(data, cluster, add_geoapify_markers=False, api_key=None):
    if not data:
        print("No data to display on the map.")
        return

    # Initialize map
    m = folium.Map(location=[0, 0], zoom_start=10)

    # Construct the tile URL with the selected map style and API Key
    tile_url = BASE_MAP_TILE_URL.format(map_style="osm-bright", api_key=api_key)

    # Add the Geoapify raster tiles to the map
    folium.TileLayer(
        tiles=tile_url,
        name='Geoapify Map',
        attr="""Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> 
        | <a href="https://openmaptiles.org/" rel="nofollow" target="_blank">© OpenMapTiles</a> contributors""",
        overlay=True,
        control=True
    ).add_to(m)    

    # Init marker cluster
    marker_cluster = MarkerCluster().add_to(m) if cluster else None
    # Use gradient of green for Geoapify markers else discrete colors
    get_color = get_discrete_color if not add_geoapify_markers else linear.Greens_04

    coords = []
    for entry in data:
        lat = entry.get('lat')
        lon = entry.get('lon')
        address = entry.get('formatted', '')
        confidence = entry.get('rank', {}).get('confidence', 0)

        # Check required fields
        if not (lat and lon):
            print("Skipping entry with missing coordinates, address or geocoding confidence.")
            continue

        marker_color = get_color(confidence)
        if add_geoapify_markers:
            # Use Geoapify Map Markers API
            params = {
                'type': 'material',
                'color': marker_color,
                'icon': 'building',
                'iconType': 'awesome',
                'apiKey': api_key
            }
            icon_url = f"https://api.geoapify.com/v1/icon/?{urlencode(params)}"
            icon = folium.CustomIcon(icon_url, icon_size=(31, 46), icon_anchor=(15, 42), popup_anchor=(0, -42))
        else:
            # Use default folium markers with color coding
            icon = folium.Icon(color=marker_color)

        marker = folium.Marker(
            location=[lat, lon],
            popup=folium.Popup(address, parse_html=True),
            icon=icon
        )

        marker.add_to(marker_cluster if marker_cluster else m)
        coords.append([lon, lat])

    # Adjust map viewport to contain all given points
    if coords:
        m.fit_bounds(calculate_bounds(coords))
    return m
```

#### Inputs:
- `data`: List of geocoded results
- `cluster`: Boolean toggle for marker clustering
- `add_geoapify_markers`: Whether to use Geoapify's marker icons
- `api_key`: Required for Geoapify markers

#### Key Steps:

1. **Initialize map**
   ```python
   folium.Map(location=[0, 0], zoom_start=10)
   ```

2. **Add Geoapify tile layer**  
   Uses a styled base map from Geoapify via:
   ```
   https://maps.geoapify.com/v1/tile/{map_style}/{z}/{x}/{y}@2x.png?apiKey=...
   ```

3. **Set up clustering** (if `--cluster` is enabled):
   ```python
   marker_cluster = MarkerCluster().add_to(m)
   ```

4. **Loop through address entries**:
   - Extract `lat`, `lon`, `address`, `confidence`
   - Skip invalid records
   - Determine marker color:
     - Custom Geoapify marker: colored icon URL via `https://api.geoapify.com/v1/icon/?...`
     - Default marker: `folium.Icon(color=...)`
   - Create marker and add it to the map or cluster group

5. **Auto-fit bounds** to display all points using `fit_bounds()`.

## License
MIT License
