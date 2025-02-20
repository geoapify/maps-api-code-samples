# Python Interactive Map Example

This project demonstrates how to use the [Geoapify Maps Tiles](https://www.geoapify.com/map-tiles/) to display an interactive raster map using [folium](https://pypi.org/project/folium/). The map includes customizable styles, zoom levels, and center coordinates.

---

## **Features**
- Uses Geoapify Maps API for high-quality map tiles.
- Supports various map styles.
- Allows customization of zoom level and map center.
- Displays an interactive map with an Eiffel Tower marker.
- Automatically validates API keys and handles errors.

![Route Preview on a Map](https://github.com/geoapify/maps-api-code-samples/blob/main/python/create-a-map/map.png?raw=true)

## **Requirements**

Ensure you have the following installed:

1. Python 3.11 or higher
2. pip (Python package manager)

## **Setup Instructions**

### 1. Clone the Repository

```bash
git clone https://geoapify.github.io/maps-api-code-samples/
cd maps-api-code-samples/python
```

### 2. Create a Virtual Environment (Optional)

It’s recommended to use a virtual environment to avoid dependency conflicts:

```bash
python -m venv env
source env/bin/activate  # On Windows: env\Scripts\activate
```

### 3. Install Dependencies

Install the required Python libraries using pip:

```bash
pip install folium requests
```

---

## **Running the Example**

Run the script to generate an interactive map:

```bash
cd create-a-map
python interactive_map.py --style osm-bright --zoom 12 --lat 48.8566 --lon 2.3522 --api-key=YOUR_API_KEY
```

### **Command-line Arguments**
- `--api-key` (required): API key for Geoapify services.
- `--style` (optional, default: `osm-carto`): Map style.
- `--zoom` (optional, default: `17`): Zoom level.
- `--lat` (optional, default: `48.8584`): Latitude for the map center.
- `--lon` (optional, default: `2.2945`): Longitude for the map center.

---

## Code Explanation

The `create_map` function initializes an interactive map using `folium`. It takes the map style, zoom level, latitude, longitude, and API key as parameters to generate a customized map with Geoapify tiles.

```python
import folium

BASE_URL = "https://maps.geoapify.com/v1/tile/{map_style}/{{z}}/{{x}}/{{y}}@2x.png?apiKey={api_key}"

def create_map(map_style, zoom, lat, lon, api_key):
    """
    Creates an interactive map using Geoapify tiles.

    Parameters:
    - map_style (str): The style of the map (e.g., 'osm-carto', 'osm-bright').
    - zoom (int): The initial zoom level.
    - lat (float): Latitude for the map center.
    - lon (float): Longitude for the map center.
    - api_key (str): API key for accessing Geoapify services.

    Returns:
    - folium.Map object containing the configured map.
    """

    # Initialize the folium map centered at the specified location
    m = folium.Map(location=[lat, lon], zoom_start=zoom)

    # Construct the tile layer URL using the provided API key and map style
    tile_url = BASE_URL.format(map_style=map_style, api_key=api_key)

    # Add Geoapify tile layer to the map
    folium.TileLayer(
        tiles=tile_url,
        name="Geoapify Map",
        attr="""Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> 
                | <a href="https://openmaptiles.org/" rel="nofollow" target="_blank">© OpenMapTiles</a> 
                | <a href="https://www.openstreetmap.org/copyright" rel="nofollow" target="_blank">© OpenStreetMap</a> contributors""",
        overlay=True,
        control=True
    ).add_to(m)

    # Add a marker at the Eiffel Tower location for demonstration purposes
    folium.Marker(
        location=[48.8584, 2.2945],
        popup="Eiffel Tower",
        icon=folium.Icon(color="red"),
    ).add_to(m)

    return m
```

### **Explanation**
1. **Initialize the Map**  
   - Uses `folium.Map()` to create a base map centered at the provided latitude and longitude.
   - The `zoom_start` parameter determines the initial zoom level.

2. **Add Tile Layer**  
   - The tile layer URL is formatted using the provided `map_style` and `api_key` values.
   - The tile layer is added using `folium.TileLayer()`, ensuring that Geoapify map styles are applied.

3. **Add a Marker**  
   - A red marker is placed at the Eiffel Tower's coordinates (`48.8584, 2.2945`).
   - The marker has a popup message that appears when clicked.

4. **Return the Map**  
   - The function returns a `folium.Map` object that can be saved as an HTML file or displayed in a browser.

This function allows users to create a customizable interactive map with Geoapify tiles, supporting different styles and zoom levels.

---

## **Output**
- The script generates a `map.html` file.
- The browser automatically opens the generated map.
- If the browser fails to open, manually open `map.html` in any web browser.

## **Error Handling**
- If an invalid map style is provided, the script falls back to `osm-carto`.
- If an invalid API key is provided, the script exits with an error.
- If a server error occurs (5XX response), the script stops execution.

## **Notes**
- Ensure that you have a valid [Geoapify API key](https://www.geoapify.com/) before running the script.
- The map includes attribution links to comply with OpenStreetMap and Geoapify usage policies.

## **License**
This project is licensed under the MIT License.

