# Generate Printable Turn-by-Turn Route Directions with JavaScript and Geoapify

Build a browser-based route planner that turns Geoapify [Routing API](https://www.geoapify.com/routing-api/) results into printable turn-by-turn directions with static map images.

## What You Build

This JavaScript sample converts a calculated Geoapify route into a print-ready directions page. The workflow covers:

- **Interactive route planning:** [`@geoapify/route-directions`](https://www.npmjs.com/package/@geoapify/route-directions) lets users add waypoints on a Leaflet map or through address inputs.
- **Route calculation:** Geoapify Routing API returns route geometry, legs, steps, distance, time, and elevation data.
- **Printable route overview:** Geoapify [Static Maps API](https://www.geoapify.com/static-maps-api/) generates a static map image of the full route.
- **Turn-by-turn instructions:** the app renders route steps with maneuver icons, distances, street names, and per-step map previews.
- **Elevation profile:** Chart.js displays elevation changes along the route for hiking, cycling, and other outdoor use cases.

![Printable route directions demo with an interactive Leaflet map, static route preview, elevation chart, and turn-by-turn instructions](https://github.com/geoapify/maps-api-code-samples/blob/main/javascript/printable-route-directions/printable-route-directions-demo.png?raw=true)

## Implementation Overview

1. Use [`@geoapify/route-directions`](https://www.npmjs.com/package/@geoapify/route-directions) to collect waypoints and calculate a route.
2. Render the route on a Leaflet map.
3. Use the Geoapify Static Maps API to generate a route preview image.
4. Read route legs and steps from the Routing API GeoJSON response.
5. Generate turn-by-turn HTML instructions with icons and distances.
6. Generate static map previews for individual maneuvers.
7. Use Chart.js to render the route elevation profile.
8. Print the generated route page from the browser.

## Demo

You can see the code sample in action here: [Open the printable route directions demo](https://geoapify.github.io/maps-api-code-samples/javascript/printable-route-directions/demo_combined.html)

## Used Libraries and APIs

| Library or API | Type | Used for |
| --- | --- | --- |
| [`@geoapify/route-directions`](https://www.npmjs.com/package/@geoapify/route-directions) | JavaScript library | Waypoint inputs, route options, transportation modes, and route calculation events. |
| [Geoapify Routing API](https://www.geoapify.com/routing-api/) | Geoapify API | Route geometry, route legs, turn-by-turn steps, distance, time, and elevation data. |
| [Geoapify Static Maps API](https://www.geoapify.com/static-maps-api/) | Geoapify API | Static route overview images and per-step maneuver preview maps. |
| [Geoapify Map Tiles](https://www.geoapify.com/map-tiles/) | Geoapify API | Interactive Leaflet basemap tiles. |
| [Geoapify Marker Icon API](https://www.geoapify.com/marker-icons-api/) | Geoapify API | Custom waypoint marker icons for the interactive map. |
| [Leaflet](https://leafletjs.com/) | JavaScript library | Interactive map rendering, route layers, waypoint markers, and map controls. |
| [Chart.js](https://www.chartjs.org/) | JavaScript library | Route elevation profile chart. |
| [Turf.js](https://turfjs.org/) | JavaScript library | Route geometry calculations for maneuver previews. |

## Project Files

- `src/demo.html` - the source HTML for the interactive route directions page.
- `src/demo.js` - route calculation, map rendering, static map previews, and printable route instructions.
- `src/elevation.js` - elevation profile data preparation and Chart.js rendering.
- `src/styles.css` - screen and print styles for the sample.

## Geoapify API Key

The sample includes a Geoapify API key restricted to this demo. For your own project, create an API key in [Geoapify MyProjects](https://myprojects.geoapify.com/) and replace the `apiKey` value in `src/demo.js`:

```javascript
var apiKey = "YOUR_GEOAPIFY_API_KEY";
```

The same key is used for Geoapify Routing API requests, map tiles, static map images, and marker icons.

## Code Walkthrough

This walkthrough focuses on the main implementation steps in `src/demo.js` and `src/elevation.js`: collecting waypoints, rendering the route, generating static map images, building printable instructions, and drawing the elevation profile.

### Initialize Route Controls

The [`@geoapify/route-directions`](https://www.npmjs.com/package/@geoapify/route-directions) widget collects waypoints, exposes route options, and emits events when waypoints change or a route is calculated.

```javascript
const routeDirections = new directions.RouteDirections(
    document.getElementById("route-directions"),
    apiKey,
    {
        supportedModes: [
            'walk', 'hike', 'scooter', 'motorcycle', 'drive', 
            'light_truck', 'medium_truck', 'truck', 'bicycle', 
            'mountain_bike', 'road_bike', 'bus'
        ],
        supportedOptions: ['highways', 'tolls', 'ferries'],
        elevation: true
    },
    {
        placeholder: "Enter an address here or click on the map"
    }
);
```

The sample also lets users add waypoints by clicking the map:

```javascript
map.on("click", (event) => {
    routeDirections.addLocation(event.latlng.lat, event.latlng.lng);
});
```

When a route is calculated, the sample updates all route-dependent views:

```javascript
routeDirections.on('routeCalculated', (geojson) => {
    loadElevationData(geojson);
    visualizeRoute(geojson);
    generateInstructions(geojson);
    getMapPreview(geojson);
    updateElementsVisibility();
});
```

### Render the Interactive Map

Leaflet displays the interactive map, while Geoapify Map Tiles provide the basemap.

```javascript
var mapURL = L.Browser.retina
    ? `https://maps.geoapify.com/v1/tile/{mapStyle}/{z}/{x}/{y}@2x.png?apiKey={apiKey}`
    : `https://maps.geoapify.com/v1/tile/{mapStyle}/{z}/{x}/{y}.png?apiKey={apiKey}`;

L.tileLayer(mapURL, {
    attribution: 'Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> | <a href="https://openmaptiles.org/" rel="nofollow" target="_blank">© OpenMapTiles</a> <a href="https://www.openstreetmap.org/copyright" rel="nofollow" target="_blank">© OpenStreetMap</a> contributors', 
    apiKey: apiKey,
    mapStyle: "osm-bright-smooth",
    maxZoom: 20
}).addTo(map);

L.control.zoom({ position: 'bottomright' }).addTo(map);
```

The route itself is rendered as two GeoJSON layers: a wider shadow line and a narrower visible route line. The sample also adds small circle markers at turn-by-turn instruction points.

### Render the Elevation Profile

The Geoapify Routing API returns `elevation_range` data for route legs when elevation is enabled. `src/elevation.js` converts that route data into Chart.js labels and values, then draws a line chart.

![Printable route elevation profile generated from Geoapify Routing API data](https://github.com/geoapify/maps-api-code-samples/blob/main/javascript/printable-route-directions/elevation-profile.png?raw=true)

```javascript
export function drawElevationProfile(routeData, elevationData) {
    const ctx = document.getElementById("route-elevation-chart").getContext("2d");
    const chartData = {
        labels: elevationData.labels,
        datasets: [{
            data: elevationData.data,
            fill: true,
            borderColor: '#66ccff',
            backgroundColor: '#66ccff66',
            tension: 0.1,
            pointRadius: 0,
            spanGaps: true
        }]
    };

    const config = {
        // see the full configuration in src/elevation.js
    };

    chartInstance = new Chart(ctx, config);
}
``` 

The `calculateElevationProfileData(routeData)` function also reduces the number of chart points to avoid rendering unnecessarily dense elevation data.

### Generating a Route Preview

The **`getMapPreview()`** function demonstrates how to generate a static map image of the route using the **Geoapify Static Maps API**. This static image provides a visual overview of the calculated route, including markers for waypoints and the route geometry.

![Static map route preview generated with Geoapify Static Maps API](https://github.com/geoapify/maps-api-code-samples/blob/main/javascript/printable-route-directions/route-preview.jpeg?raw=true)

#### Why Use a POST Request?
- **Large Geometry Data:** The route's geometry (line data) can be large and exceed the URL length limits of a GET request. 
- **POST Requests:** Allow sending complex data structures like GeoJSON without worrying about URL size restrictions.

#### How the Function Works

1. **Set Request Headers:**
   - The `Content-Type` is set to `application/json` to indicate that the request body contains JSON data.
   ```javascript
   const myHeaders = new Headers();
   myHeaders.append("Content-Type", "application/json");
   ```

2. **Prepare Route Data:**
   - **Customize Line Appearance:** The route line is styled with a specific color and width (`linecolor` and `linewidth`).
   - **GeoJSON and Markers:** The route's geometry and waypoints are added to the payload.
   ```javascript
   geojson.properties.linecolor = '#6699ff';
   geojson.properties.linewidth = '5';

   const params = {
       style: "osm-bright", // Map style
       width: 800, // Image width in pixels
       height: 250, // Image height in pixels
       scaleFactor: 2, // Higher resolution for better quality
       geojson: geojson, // Route geometry data
       markers: geojson.properties.waypoints.map(waypoint => {
           return {
               "lat": waypoint.location[1], // Latitude of the waypoint
               "lon": waypoint.location[0], // Longitude of the waypoint
               "color": "#ff0000", // Marker color
               "size": "medium", // Marker size
               "type": "awesome" // Marker style
           };
       })
   };
   ```

3. **Configure the Fetch Request:**
   - A POST request is used to send the route data to the Geoapify Static Maps API.
   - The prepared JSON payload (`params`) is included in the request body.
   ```javascript
   const requestOptions = {
       method: "POST",
       headers: myHeaders,
       body: JSON.stringify(params),
       redirect: "follow"
   };
   ```

4. **Fetch the Static Map:**
   - The response is processed as a binary blob to handle the image data.
   - A `FileReader` converts the blob into a Base64 data URL, which is then assigned to an image element (`<img>`).
   ```javascript
   fetch(`https://maps.geoapify.com/v1/staticmap?apiKey=${apiKey}`, requestOptions)
       .then((response) => response.blob())
       .then((blob) => {
           var reader = new FileReader();
           reader.onload = function() {
               const mapPreview = document.getElementById("route-preview");
               mapPreview.src = this.result; // Assign the generated image to the <img> element
               mapPreview.classList.remove("hidden"); // Make the preview visible
           };
           reader.readAsDataURL(blob);
       })
       .catch((error) => console.error(error));
   ```

### Generating Route Instructions

The **`generateInstructions()`** function dynamically generates turn-by-turn instructions based on the route data (`geojson`) and populates a specified HTML container with these instructions. It uses route properties like waypoints, legs, and steps to show route summaries, maneuver icons, instruction text, distances, and step preview images. The step preview image URL is generated by `generateImageURL()`.

#### Key Aspects of `generateInstructions()`:

1. **Dynamic HTML Creation:**
   - The function creates and appends HTML elements dynamically for each route instruction.
   - It uses a container (`instructionContainer` in this sample) to hold all instructions.
   - Example:
     ```javascript
     const instruction = document.createElement("div");
     instruction.classList.add("direction-instruction");
     instructionContainer.appendChild(instruction);
     ```

2. **Mapping Instruction Types to Icons:**
   - A predefined `type2icon` object maps routing instruction types (e.g., `Straight`, `TurnRight`) to corresponding icons.
   - Icons are added using the `addIcon()` function.
   - Example:
     ```javascript
     const iconElement = document.createElement("div");
     iconElement.classList.add("direction-instruction-icon");

     if (type2icon[step.instruction.type]) {
         addIcon(iconElement, type2icon[step.instruction.type]);
     }
     instruction.appendChild(iconElement);
     ```

3. **Waypoints and Overall Route Info:**
   - The function summarizes the route, including total distance and time, and displays it at the top.
   - Example:
     ```javascript
     const distance = toPrettyDistance(geojson.properties.distance, isMetric);
     const time = toPrettyTime(geojson.properties.time);
     waypointsInfo.textContent = `${distance}, ${time}`;
     ```

4. **Detailed Step Instructions:**
   - Each step in a route leg is processed to generate its specific instruction, including:
     - A sequence number.
     - Icon representing the maneuver (e.g., turn left, roundabout).
     - Instruction text, including highlighted street names.
     - A preview image for the step.
   - Example:
     ```javascript
     const numberElement = document.createElement("div");
     numberElement.classList.add("direction-instruction-number");
     numberElement.innerHTML = `${stepIndex + 1}.`;

     const textElement = document.createElement("div");
     textElement.classList.add("direction-instruction-text");
     textElement.innerHTML = step.instruction.text;
     ```

5. **Step Preview Image:**
   - Each instruction includes an image generated by the `generateImageURL()` function that visually represents the step.
   - Example:
     ```javascript
     const imageElement = document.createElement("img");
     imageElement.src = generateImageURL(index, step, geojson.geometry.coordinates);
     imageElement.classList.add("direction-instruction-image");
     instruction.appendChild(imageElement);
     ```

### Generating Step Previews

The **`generateImageURL()`** function dynamically generates static map preview URLs for individual route steps using the **Geoapify Static Maps API**. Each step preview highlights the route’s current position, shows the previous and next parts of the route, and includes a directional arrow for the next maneuver. Turf.js helps calculate bearings, clip nearby route geometry, and build the maneuver arrow polygon.

![Turn-by-turn route step preview with maneuver arrow on a static map](https://github.com/geoapify/maps-api-code-samples/blob/main/javascript/printable-route-directions/step-preview.jpeg?raw=true)

#### Key Aspects of `generateImageURL()`

1. **Dynamic Map Bearing:**
   - The map is oriented dynamically using the **bearing** calculated from the route geometry.
   - The `getBearing()` function computes the bearing based on the current step's position and nearby coordinates.
   - Example:
     ```javascript
     let bearing = getBearing(coordinates[legIndex], step) + 180;
     ```

2. **Route Context (Previous and Next Parts):**
   - The preview shows both the preceding and upcoming parts of the route for context.
   - The `getRelatedCoordinates()` function extracts segments of the route (past, next, and maneuver parts) to be visualized on the static map.
   - Example:
     ```javascript
     let relatedCoordinatesPast = getRelatedCoordinates(coordinates[legIndex], step, 'past');
     let relatedCoordinatesNext = getRelatedCoordinates(coordinates[legIndex], step, 'next');
     let manoeuvre = getRelatedCoordinates( coordinates[legIndex], step, 'manoeuvre');
     let manoeuvreArrow = getRelatedCoordinates( coordinates[legIndex], step, 'manoeuvre-arrow');
     ```

3. **Directional Arrow for the Next Maneuver:**
   - A polyline represents the maneuver path, and a polygon arrow indicates the turn direction.
   - Both are dynamically generated and included in the static map's geometry.
   - Example:
     ```javascript
     geometries.push(`polygon:${manoeuvreArrow};linewidth:1;linecolor:${encodeURIComponent('#333333')};fillcolor:${encodeURIComponent('#ffffff')};fillopacity:1`);
     ```

## How to Run the Sample

Run the source version from the `src/` folder with a local HTTP server. Do not open `src/demo.html` directly with the `file://` protocol, because browser restrictions can block API requests and module loading.

### Option 1: Run with a Local HTTP Server

1. **Navigate to the sample folder**:

   ```bash
   cd javascript/printable-route-directions
   ```

2. **Start a static server**:

   ```bash
   npx http-server .
   ```

3. **Open the source demo**:

   ```
   http://localhost:8080/src/demo.html
   ```

If `http-server` is already installed globally, you can run:

```bash
http-server .
```

### Option 2: Use IDE Live Preview

Many modern IDEs provide live preview for HTML files:

* **Visual Studio Code** — Install the “Live Server” extension, then right-click `src/demo.html` and choose **“Open with Live Server”**.
* **WebStorm / IntelliJ / PhpStorm** — Right-click `src/demo.html` and choose **“Open in Browser”**.
* **Brackets** — Click the **lightning bolt icon** or use **File → Live Preview**.

## Related Code Samples

- [Route visualization with Leaflet styling](https://github.com/geoapify/geoapify-quickstart-examples/tree/main/routing-api/route-visualization-leaflet-styling) - style Geoapify Routing API results on a Leaflet map.
- [Visualize GeoJSON routes with Leaflet and Geoapify Routing API](https://github.com/geoapify/geoapify-quickstart-examples/tree/main/routing-api/visualizing-geojson-routes-with-leaflet-and-geoapify-routing-api) - render Routing API GeoJSON responses with Leaflet.
- [`@geoapify/route-waypoint-selector`](https://www.npmjs.com/package/@geoapify/route-waypoint-selector) - add waypoint selection controls for route planning interfaces.
- [Route waypoint selector CodePen demo](https://codepen.io/editor/geoapify/pen/019e889c-62eb-7336-baa5-3e367b66766f) - experiment with waypoint selection in an online editor.

## FAQ

### How do I generate printable route directions in JavaScript?

Use the Geoapify Routing API to calculate a route, then convert the returned GeoJSON legs and steps into HTML instructions. Use the Geoapify Static Maps API to generate static map images for the full route and individual maneuvers.

### Can I create turn-by-turn directions with static map previews?

Yes. This sample creates one static route preview and separate static images for each route step using Geoapify Static Maps API geometry parameters.

### Does the sample support elevation profiles?

Yes. The sample requests elevation data from the Geoapify Routing API and renders the route elevation profile with Chart.js.

### Can I print the generated route directions?

Yes. The sample creates print-ready HTML content with a route overview map, turn-by-turn instructions, step preview images, and an elevation profile that can be printed from the browser.

### Which Geoapify APIs are required for printable route directions?

This sample uses the Geoapify Routing API to calculate routes, the Static Maps API to generate printable map images, Map Tiles for the interactive Leaflet map, and the Marker Icon API for waypoint markers.

### Can I use this sample for walking, cycling, hiking, or truck routes?

Yes. The sample configures `@geoapify/route-directions` with multiple transportation modes, including walking, hiking, cycling, driving, scooters, motorcycles, buses, and truck modes.

### Why does the route preview use the Static Maps API instead of the interactive map?

Printable pages need stable image content. The Static Maps API generates image-based route previews that can be printed, saved, embedded, or shared more reliably than an interactive map.

### How are step-by-step map previews generated?

Each step preview is generated as a Geoapify Static Maps API URL. The sample builds geometry overlays for the previous route segment, next route segment, maneuver path, and maneuver arrow.

### Why does the full route preview use a POST request?

The full route geometry can be too large for a URL. A POST request lets the sample send GeoJSON route data and marker definitions in the request body without hitting URL length limits.

### Can I customize the printed route layout?

Yes. Edit `src/styles.css` to customize the printable route preview, instruction list, step preview images, and elevation chart layout.
