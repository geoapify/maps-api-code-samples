# How to Visualize Isochrones and Isodistances with Leaflet and Geoapify

This code sample demonstrates how to calculate and display **isochrones** (time-based isolines) and **isodistances** (distance-based isolines) on an interactive [Leaflet map](https://leafletjs.com/) using the [Geoapify Isoline API](https://apidocs.geoapify.com/docs/isolines/).

The application allows users to click on the map, configure travel mode and isoline parameters, and visualize the reachable area as a polygon layer. Each isoline is styled with a distinct color and includes a custom marker to indicate its origin.

![Isoline Leaflet Screenshot](https://github.com/geoapify/maps-api-code-samples/blob/main/javascript/isolines-leaflet/isoline-leaflet-demo-screenshot.jpg?raw=true)

The code calculates isolines with the [Geoapify Isoline API](https://www.geoapify.com/isoline-api/) and renders it dynamically using Leaflet:

* **Interactive Map:** Click to select a location and generate isolines.
* **Multiple Travel Modes:** Choose from car, walking, hiking, transit, bicycle, and truck modes.
* **Time or Distance Ranges:** Configure isolines by travel time (minutes) or travel distance (kilometers).
* **Beautiful Informative Markers:** Uses the [Geoapify Marker API](https://www.geoapify.com/map-marker-icon-api/) to generate rich icons with color-coded travel modes and values.
* **Custom Markers and Colors:** Each isoline is styled with a unique color and icon.
* **Multi-Isoline Support:** Display multiple isolines on the same map, and clear them when needed.

> 💡 Tip: This demo uses only the most essential [Isoline API](https://apidocs.geoapify.com/docs/isolines/) parameters: `type`, `mode`, and `range`.  
> The API supports many more advanced options such as `traffic`, `avoid areas`, `custom route types`, and more — feel free to extend the code to explore them.

This project is ideal for exploring service areas, delivery coverage, or accessibility ranges based on real-world travel constraints.

## Demo

You can try the sample live here:  
**[Open Demo on GitHub Pages](https://geoapify.github.io/maps-api-code-samples/javascript/isolines-leaflet/demo_combined.html)**

> The `demo_combined.html` file is a self-contained version of the project with all CSS and JavaScript inlined for easy deployment on GitHub Pages. 

## APIs and Technologies Used

### [Geoapify Isoline API](https://apidocs.geoapify.com/docs/isolines/)
- Generates isochrone (time-based) or isodistance (distance-based) polygons.
- Supports various travel modes: car, walk, bike, bus, truck, transit, and more.
- Accepts coordinates, travel type, and range parameters.

### [Geoapify Marker Icon API](https://www.geoapify.com/map-marker-icon-api/)
- Used to generate colorful, travel-mode-specific marker icons.
- Supports Font Awesome icons, retina-ready output, and color customization via URL parameters.

### [Leaflet](https://leafletjs.com/)
- Lightweight open-source JavaScript library for interactive maps.
- Handles map rendering, user interaction, layers, and custom markers.

## Key files

- `src/demo.html` — Main HTML file with layout and form controls
- `src/demo.js` — Main JavaScript logic
- `src/styles.css` — CSS for map layout and dialog styling
- `combine.js` — Utility to inline all assets into a single HTML file
- `demo_combined.html` — Standalone, portable HTML output for publishing

## How to Run the Sample

You can run the interactive map demo using either a custom local HTTP server or built-in live preview tools in your IDE.

### Option 1: Run with a Local HTTP Server

You can serve the contents of the `src/` folder using any static file server:

1. **Install `http-server`** (if not installed globally):
   ```bash
   npm install -g http-server
   ```

2. **Start the server** from the project’s `src` folder:

   ```bash
   http-server ./src
   ```

3. **Open the demo** in your browser:

   ```
   http://localhost:8080/demo.html
   ```

### Option 2: Use IDE Live Server / Preview

Most modern IDEs and code editors offer built-in or plugin-based live preview tools that you can use to open `src/demo.html` directly:

* **Visual Studio Code**
  Use the “Live Server” extension. Right-click `demo.html` in the `src/` folder and choose **“Open with Live Server”**.

* **WebStorm / PhpStorm / IntelliJ**
  Right-click `demo.html` and select **“Open in Browser”** or use the built-in preview icon.

* **Brackets**
  Click the **lightning bolt icon** or choose **File → Live Preview**.

* **Other editors**
  If your IDE doesn't include live preview, use Option 1 with a local HTTP server.


## How to Build `demo_combined.html`

As an alternative to running the code from the `src/` folder, you can build a **self-contained HTML file** (`demo_combined.html`) that includes all JavaScript and CSS inlined. This version is ideal for publishing on GitHub Pages or sharing as a single file.

### Steps

1. **Go to the `javascript/` folder** — the parent of `isolines-leaflet/`:
   ```bash
   cd javascript
   ```

2. **Install the `inline-source` package**:

   ```bash
   npm install inline-source
   ```

3. **Run the build script**:

   ```bash
   node isolines-leaflet/combine.js
   ```

This will generate a new `demo_combined.html` file in the `isolines-leaflet/` folder. You can open it directly in a browser or deploy it as a static page.

> Note: The script uses `src/demo.html` as the input file and inlines all linked assets (CSS, JS) into one output file.

## Code Examples

Here are key snippets that demonstrate how the application works under the hood:

### 1. Getting Latitude / Longitude on Map Click

When a user clicks on the map, the clicked coordinates are captured and used to configure the isoline:

```js
map.on('click', function(event) {
    const clickedCoordinates = [event.latlng.lng, event.latlng.lat]; // [lon, lat]
   // Store coordinates and show the isoline dialog
});
```


### 2. Requesting an Isoline from Geoapify API

This function sends a request to the [Isoline API](https://apidocs.geoapify.com/docs/isolines/) using the chosen travel mode and range:

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

### 3. Creating a Custom Marker Using Geoapify Marker API

Each isoline marker is created with a color-coded icon that reflects the travel mode and value:

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
    
    // Create Leaflet marker with custom HTML
    const marker = L.marker([coordinates[1], coordinates[0]], {
        icon: L.divIcon({
            html: markerElement.innerHTML,
            className: 'custom-marker-container',
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        })
    }).addTo(map);
    
    // Store marker reference
    marker._markerId = markerId;
    markers.push(marker);
    
    return markerId;
}

function generateIconUrl(travelMode, color, value) {
    const icon = getTravelModeIcon(travelMode); // Maps mode to Font Awesome icon
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

    return icons[travelMode] || 'map-marker';
}
```

### 4. Drawing the Isoline Polygon on the Leaflet Map

Once the GeoJSON data is received from the API, it is added as a colored polygon layer:

```js
function addIsolineToMap(isolineData, color) {
    const isolineLayer = L.geoJSON(isolineData, {
        style: {
            fillColor: color,
            fillOpacity: 0.4,
            color: color,
            weight: 2,
            opacity: 0.8
        }
    }).addTo(map);
}
```

These building blocks enable the dynamic generation and visualization of isolines based on user interaction.

## Summary

This code sample shows how to create an interactive isoline map using Leaflet and Geoapify APIs. It demonstrates:

- Real-time calculation of isochrones and isodistances
- Support for multiple transportation modes
- Use of custom, informative marker icons
- Dynamic rendering of isoline polygons on a Leaflet map
- Deployment as a self-contained HTML file or via local development

It’s a great starting point for building map-based applications such as service area visualizations, logistics coverage maps, and accessibility tools.

## Learn More

Explore more Geoapify APIs, tutorials, and use cases at:  
👉 [https://www.geoapify.com](https://www.geoapify.com)
