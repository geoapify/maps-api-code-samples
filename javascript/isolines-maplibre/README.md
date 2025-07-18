# How to Visualize Isochrones and Isodistances with MapLibre GL and Geoapify API

This code sample demonstrates how to calculate and visualize **isochrones** (time-based isolines) and **isodistances** (distance-based isolines) using the [Geoapify Isoline API](https://apidocs.geoapify.com/docs/isolines/) and the [MapLibre GL JS](https://maplibre.org/) map library.

The application lets users click on the map, select travel mode and isoline type, and view the resulting polygon directly on a dynamic vector map. Each isoline is styled with a distinct color and features a custom marker that reflects the travel mode and value.

![Isoline MapLibre Screenshot](https://github.com/geoapify/maps-api-code-samples/blob/main/javascript/isolines-maplibre/isoline-maplibre-demo-screenshot.jpg?raw=true)

The application combines Geoapify APIs with MapLibre’s vector rendering engine:

* **Interactive Map:** Click to select a point and generate isolines.
* **Multiple Travel Modes:** Drive, walk, bike, truck, transit, and more.
* **Time or Distance Ranges:** Switch between travel time (minutes) or travel distance (kilometers).
* **Informative Marker Icons:** Uses the [Geoapify Marker API](https://www.geoapify.com/map-marker-icon-api/) to generate travel-mode-specific markers.
* **Multiple Isoline Support:** Each isoline is shown with a distinct color and automatically zoomed to fit.
* **Full Vector Rendering:** Isolines are added as live `GeoJSON` layers for styling and interactivity.

> 💡 Tip: This demo uses only the essential [Isoline API](https://apidocs.geoapify.com/docs/isolines/) parameters (`type`, `mode`, `range`).  
> The full API supports advanced options like `traffic`, `avoid areas`, and custom `route types` — feel free to extend the project to explore them.

This project is ideal for accessibility analysis, delivery service areas, and travel-time visualizations.

## Demo

You can try the sample live here:  
**[Open Demo on GitHub Pages](https://geoapify.github.io/maps-api-code-samples/javascript/isolines-maplibre/demo_combined.html)**

> The `demo_combined.html` file is a self-contained version of the app with all JavaScript and CSS inlined.  
> It’s perfect for publishing to GitHub Pages or deploying as a single HTML file.


## APIs and Technologies Used

### [Geoapify Isoline API](https://apidocs.geoapify.com/docs/isolines/)
The core of this demo. It returns polygon features that represent the reachable area based on either time or distance. You can specify a wide variety of parameters:

- **Travel modes** — walk, drive, hike, bicycle, bus, truck, and more.
- **Range types** — time (in seconds) or distance (in meters).
- **Advanced options** — enable traffic-aware routing, avoid areas or features (e.g. ferries, highways), and customize route preferences.

> **Note:** This demo uses only the basic parameters: `lat`, `lon`, `type`, `mode`, and `range`.  
> See the [full API reference](https://apidocs.geoapify.com/docs/isolines/) for all capabilities.

### [Geoapify Marker Icon API](https://www.geoapify.com/map-marker-icon-api/)
Used to generate visually informative markers that reflect the selected travel mode and range:

- Icon types are based on [Font Awesome](https://fontawesome.com/) styles
- Marker shape, size, color, and label are customizable via URL parameters
- Retina-optimized and suitable for dynamic UIs


### [MapLibre GL JS](https://maplibre.org/)
An open-source, high-performance map rendering engine based on WebGL:

- Loads vector tile basemaps styled with Mapbox-compatible styles (e.g., Geoapify’s `osm-bright`)
- Displays isolines as dynamic `GeoJSON` layers with real-time styling
- Supports smooth zooming, panning, and camera transitions

## Key Files

- `src/demo.html` — Main HTML page that contains the layout, map container, sidebar, and popup form UI.
- `src/demo.js` — Application logic: initializes the map, handles clicks, sends API requests, and renders markers and isolines.
- `src/styles.css` — Styling for the map container, sidebar, popup dialog, buttons, and custom markers.
- `combine.js` — Node.js script that generates a fully self-contained HTML file with all assets inlined.
- `demo_combined.html` — Single-file version of the demo, ready for hosting or sharing without external dependencies.

## How to Run the Sample

You can run the MapLibre isoline demo locally using a static server or directly in your IDE with live preview.

### Option 1: Run with a Local HTTP Server

Serve the contents of the `src/` folder using a static server:

1. **Install `http-server`** (if not already installed):
   ```bash
   npm install -g http-server
   ```

2. **Start the server** from the `src` directory:

   ```bash
   http-server ./src
   ```

3. **Open the demo** in your browser:

   ```
   http://localhost:8080/demo.html
   ```

Or use `npx` for a one-time server:

```bash
npx http-server ./src
```

### Option 2: Use IDE Live Preview

Many modern IDEs provide live preview for HTML files:

* **Visual Studio Code** — Install the “Live Server” extension, then right-click `demo.html` and choose **“Open with Live Server”**.
* **WebStorm / IntelliJ / PhpStorm** — Right-click `demo.html` and choose **“Open in Browser”**.
* **Brackets** — Click the **lightning bolt icon** or use **File → Live Preview**.

> Opening the file directly via `file://` protocol is not recommended, as some browsers block dynamic requests in local mode.

## How to Build `demo_combined.html`

As an alternative to running the project from the `src/` folder, you can generate a standalone HTML file with all scripts and styles inlined. This is useful for GitHub Pages or distributing the demo as a single file.

### Steps

1. **Navigate to the `javascript/` folder** — the parent of `isolines-maplibre/`:
   ```bash
   cd javascript
   ```

2. **Install the required build dependency**:

   ```bash
   npm install inline-source
   ```

3. **Run the build script**:

   ```bash
   node isolines-maplibre/combine.js
   ```

This will create a `demo_combined.html` file in the `isolines-maplibre/` folder, with all assets embedded.

> The script uses `src/demo.html` as input and outputs a self-contained file with embedded JavaScript and CSS.


Вот следующий раздел — **Code Examples** — с ключевыми фрагментами из `isolines-maplibre`:

## Code Examples

Here are the key code snippets that power the application:

### 1. Getting Latitude / Longitude on Map Click

Capture coordinates when the user clicks the map, then open a form to configure the isoline:

```js
map.on('click', function(event) {
    clickedCoordinates = [event.lngLat.lng, event.lngLat.lat];
    // Then open the isoline configuration dialog
});
```

### 2. Requesting an Isoline from Geoapify API

Sends a request to the Isoline API using selected travel mode and value:

```js
async function fetchIsoline(coordinates, travelMode, isolineType, isolineValue) {
    const [lng, lat] = coordinates;

    const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lng.toString(),
        type: isolineType,
        mode: travelMode,
        apiKey: GEOAPIFY_API_KEY
    });

    const range = isolineType === 'time'
        ? parseInt(isolineValue) * 60     // seconds
        : parseFloat(isolineValue) * 1000; // meters

    params.append('range', range.toString());

    const response = await fetch(`https://api.geoapify.com/v1/isoline?${params.toString()}`);
    const data = await response.json();

    return data;
}
```

### 3. Creating a Custom Marker with Geoapify Marker API

Generates a custom Marker with color and label to visualize isoline origin and add the marker to the map:

```js
function addMarker(coordinates, travelMode, isolineType, isolineValue) {
    const markerId = `marker-${Date.now()}-${markerCounter}`;
    const currentColor = COLORS[currentColorIndex];
    
    const iconUrl = generateIconUrl(travelMode, currentColor, isolineValue);
    
    const markerElement = document.createElement('div');
    markerElement.innerHTML = `
        <div class="custom-marker">
            <img src="${iconUrl}" class="marker-icon" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=&quot;marker-fallback&quot; style=&quot;background: ${currentColor}&quot;>●<div class=&quot;marker-value&quot; style=&quot;background: ${currentColor}&quot;>${isolineValue}</div></div>';" />
            <div class="marker-value" style="background: ${currentColor}">${isolineValue}</div>
        </div>
    `;
    
    const marker = new maplibregl.Marker({
        element: markerElement,
        anchor: 'center'
    })
        .setLngLat([coordinates[0], coordinates[1]])
        .addTo(map);
    
    marker._markerId = markerId;
    markers.push(marker);
    
    return markerId;
}


function generateIconUrl(travelMode, color, value) {
    const icon = getTravelModeIcon(travelMode);
    const colorCode = color.replace('#', '');

    return `https://api.geoapify.com/v2/icon/?type=circle&color=%23${colorCode}&size=40&icon=${icon}&iconType=awesome&contentSize=20&contentColor=%23${colorCode}&scaleFactor=2&apiKey=${GEOAPIFY_API_KEY}`;
}

function getTravelModeIcon(travelMode) {
    const icons = {
        'walk': 'walking',
        'hike': 'person-hiking',
        'scooter': 'motorcycle',
        'motorcycle': 'motorcycle',
        'drive': 'car',
        'truck': 'truck',
        'light_truck': 'truck-pickup',
        'medium_truck': 'truck-moving',
        'truck_dangerous_goods': 'truck-monster',
        'heavy_truck': 'truck-ramp-box',
        'long_truck': 'truck-moving',
        'bicycle': 'person-biking',
        'mountain_bike': 'bicycle',
        'road_bike': 'bicycle',
        'bus': 'bus',
        'drive_shortest': 'car-side',
        'drive_traffic_approximated': 'car-on',
        'truck_traffic_approximated': 'truck-front',
        'transit': 'train-subway',
        'approximated_transit': 'train-tram',
};
```

### 4. Drawing the Isoline on the MapLibre GL Map

To display isolines, we first define a **GeoJSON source** and add two layers: one for the fill (polygon) and one for the outline (contour):

```js
// When the map is ready
map.on('load', function() {
    // Add source for isoline polygons
    map.addSource('isolines', {
        'type': 'geojson',
        'data': {
            'type': 'FeatureCollection',
            'features': []
        }
    });

    // Add layer for isoline fill
    map.addLayer({
        'id': 'isolines-fill',
        'type': 'fill',
        'source': 'isolines',
        'paint': {
            'fill-color': ['get', 'color'],
            'fill-opacity': 0.4
        }
    });

    // Add layer for isoline borders
    map.addLayer({
        'id': 'isolines-outline',
        'type': 'line',
        'source': 'isolines',
        'paint': {
            'line-color': ['get', 'color'],
            'line-width': 2,
            'line-opacity': 0.8
        }
    });
});
```

When new isoline data is returned from the API, it is added to the existing source to render dynamically:

```js
function addIsolineToMap(isolineData, markerId) {
    const color = COLORS[currentColorIndex];

    // Annotate each feature with styling info
    isolineData.features.forEach(feature => {
        feature.properties.color = color;
        feature.properties.markerId = markerId;
    });

    // Update source data with new isolines
    const currentData = map.getSource('isolines')._data;
    currentData.features.push(...isolineData.features);
    map.getSource('isolines').setData(currentData);

    // Cycle through color palette
    currentColorIndex = (currentColorIndex + 1) % COLORS.length;
}
```

> Note: All isolines are stored in a single `FeatureCollection` and updated incrementally with each user click.

## Summary

This code sample shows how to visualize travel-time or travel-distance areas using MapLibre GL JS and the Geoapify Isoline API. It includes:

- An interactive map that lets users generate isolines by clicking on a location
- Support for multiple transportation modes and units (minutes or kilometers)
- Use of the Geoapify Marker API to create informative, colorful icons
- Dynamic rendering of isoline polygons as layers in MapLibre GL
- A clean, responsive UI for adjusting isoline parameters

The application is useful for building service area maps, accessibility tools, coverage visualizations, and more.

> Note: The demo uses only the basic Isoline API parameters. The full [Geoapify Isoline API](https://apidocs.geoapify.com/docs/isolines/) supports many advanced features like `type=balanced` for route type, `traffic=approximated`, `avoid` options, and more.

## Learn More

- Explore the full [Geoapify Isoline API documentation](https://apidocs.geoapify.com/docs/isolines/)
- Customize marker icons with the [Geoapify Marker API](https://www.geoapify.com/map-marker-icon-api/)
- Learn more about [MapLibre GL JS](https://maplibre.org/)
- Discover more tutorials and examples at [https://www.geoapify.com/tutorials](https://www.geoapify.com/tutorials/)
