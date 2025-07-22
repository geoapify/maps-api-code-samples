# Printable Route Directions with Geoapify

This code sample demonstrates how to generate **printable route directions** using the Geoapify [Routing API](https://www.geoapify.com/routing-api/) and Geoapify [Static Maps API](https://www.geoapify.com/static-maps-api/). It combines an interactive map interface with detailed step-by-step instructions, providing users with the ability to calculate, visualize, and print route directions.

The code retrieves the calculated route from the Geoapify Routing API and transforms it into **print-ready static content**, including:

- **Route Preview:** A static map image showing the entire route.
- **Turn-by-Turn Directions:** Step-by-step instructions with icons, distances, and turn descriptions.
- **Step Preview Images:** Visual previews of each step, including maneuvers, transitions, and nearby landmarks.
- **Route Elevation Profile**: A detailed elevation profile, based on elevation data returned by the Geoapify Routing API.

This combination of dynamic and static content allows users to interact with the map to create routes and then print detailed, high-quality route information for offline use or distribution.

## Demo

You can see the code sample in action here: [Demo Link](https://geoapify.github.io/maps-api-code-samples/javascript/printable-route-directions/demo_combined.html)

## About the Code Sample

This code sample integrates the following tools and technologies:

### 1. [@geoapify/route-directions](https://www.npmjs.com/package/@geoapify/route-directions)
- A JavaScript library that simplifies interaction with the **Geoapify Routing API**.
- It enables users to add, update, and manage waypoints for route calculations.
- Supports various transportation modes (e.g., driving, walking, cycling) and options (e.g., avoid tolls, ferries).
- Automatically integrates Geoapify's API for seamless route management.

#### Example:
```javascript
// Initialize the RouteDirections object. This handles adding waypoints, calculating routes, and managing routing options.
const routeDirections = new directions.RouteDirections(
    document.getElementById("route-directions"), // The HTML element to render route directions
    'YOUR_GEOAPIFY_API_KEY', // Replace with your Geoapify API Key
    {
        supportedModes: [
            'walk', 'hike', 'scooter', 'motorcycle', 'drive', 
            'light_truck', 'medium_truck', 'truck', 'bicycle', 
            'mountain_bike', 'road_bike', 'bus'
        ], // Specify transportation modes supported by the routing API
        supportedOptions: ['highways', 'tolls', 'ferries'], // Routing options to include (e.g., avoid highways)
        elevation: true // Enable elevation data for supported modes (e.g., hiking, biking)
    },
    {
        placeholder: "Enter an address here or click on the map" // Placeholder text for the input field
    }
);

// Event handler for waypoint changes. Triggered when a waypoint is added, removed, or updated
routeDirections.on('waypointChanged', (waypoint, reason) => {
    // 'waypoint' contains information about the changed waypoint (e.g., latitude, longitude)
    // 'reason' indicates why the change occurred (e.g., 'added', 'removed', 'updated')
    console.log("Waypoint changed:", waypoint, "Reason:", reason);

    // Example: Clear existing routes when a waypoint is removed
    if (reason === "removed") {
        // Add your code here to handle waypoint removal
        console.log("Waypoint removed. Updating route...");
    }
});

// Event handler for route calculation. Triggered when a route is successfully calculated
routeDirections.on('routeCalculated', (geojson) => {
    // 'geojson' contains the calculated route data in GeoJSON format
    console.log("Route calculated:", geojson);

    // Example: Visualize the route on a map
    // Add your code here to display the route
});


```

### 2. [Leaflet](https://leafletjs.com/)
- A popular JavaScript library for creating interactive maps.
- Used here to display a map, manage user interactions, and visualize routes dynamically.
- Integrates with Geoapify's map tiles for rich, customizable mapping.

#### Example:

```javascript
// Define the map tile URL. Use high-resolution tiles for Retina displays, otherwise use standard tiles
var mapURL = L.Browser.retina
    ? `https://maps.geoapify.com/v1/tile/{mapStyle}/{z}/{x}/{y}@2x.png?apiKey=YOUR_GEOAPIFY_API_KEY`
    : `https://maps.geoapify.com/v1/tile/{mapStyle}/{z}/{x}/{y}.png?apiKey=YOUR_GEOAPIFY_API_KEY`;

// Add a tile layer to the Leaflet map
L.tileLayer(mapURL, {
    attribution: 'Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> | <a href="https://openmaptiles.org/" rel="nofollow" target="_blank">© OpenMapTiles</a> <a href="https://www.openstreetmap.org/copyright" rel="nofollow" target="_blank">© OpenStreetMap</a> contributors', 
    apiKey: apiKey, // Replace with your Geoapify API key
    mapStyle: "osm-bright-smooth", // Use "osm-bright-smooth" map style. See more styles at https://apidocs.geoapify.com/docs/maps/map-tiles/
    maxZoom: 20 // Set the maximum zoom level for the map
}).addTo(map); // Add the tile layer to the map object

// Add a zoom control to the map. Position the zoom control in the bottom-right corner of the map
L.control.zoom({ position: 'bottomright' }).addTo(map);

```

### 3. [Chart.js](https://www.chartjs.org/)
- A flexible JavaScript library used for creating visualizations.
- In this code sample, Chart.js is used to generate an **elevation profile** for the calculated route.
- Elevation data is retrieved directly from the **Geoapify Routing API**, enabling users to visualize changes in elevation along the route.

![Route Elevation Profile](https://github.com/geoapify/maps-api-code-samples/blob/main/javascript/printable-route-directions/elevation-profile.png?raw=true)

#### Example:

```javascript
// Function to draw the elevation profile using Chart.js
export function drawElevationProfile(routeData, elevationData) {
    // Get the canvas context for the chart
    const ctx = document.getElementById("route-elevation-chart").getContext("2d");

    // Prepare chart data
    const chartData = {
        labels: elevationData.labels, // X-axis: Distance points along the route
        datasets: [{
            data: elevationData.data, // Y-axis: Elevation values at corresponding distances
            fill: true, // Fill the area under the line
            borderColor: '#66ccff', // Line color
            backgroundColor: '#66ccff66', // Fill color (with transparency)
            tension: 0.1, // Smoothing factor for the line
            pointRadius: 0, // Remove points from the line for a clean look
            spanGaps: true // Allow gaps in data without breaking the line
        }]
    };

    // Chart configuration
    const config = {
        // see the full code in demo.html
    };

    // Create the chart instance with the prepared configuration
    chartInstance = new Chart(ctx, config);
}
``` 

This integration adds an elevation visualization generated by `calculateElevationProfileData(routeData)` function to the printed route details, enhancing usability for activities like hiking or cycling.

### Generating a Route Preview

The **`getMapPreview()`** function demonstrates how to generate a static map image of the route using the **Geoapify Static Maps API**. This static image provides a visual overview of the calculated route, including markers for waypoints and the route geometry.

![Route Preview on a Map](https://github.com/geoapify/maps-api-code-samples/blob/main/javascript/printable-route-directions/route-preview.jpeg?raw=true)

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

The **`generateInstructions()`** function dynamically generates turn-by-turn instructions based on the route data (`geojson`) and populates a specified HTML container with these instructions. It leverages route properties like waypoints, legs, and steps to provide detailed guidance, including textual descriptions, icons, distances, and visual step previews. The image is generated via a **POST request and displayed dynamically** in the application.

#### Key Aspects of `generateInstructions()`:

1. **Dynamic HTML Creation:**
   - The function creates and appends HTML elements dynamically for each route instruction.
   - It uses a container (`instrictionContainer`) to hold all instructions.
   - Example:
     ```javascript
     const instruction = document.createElement("div");
     instruction.classList.add("direction-instruction");
     instrictionContainer.appendChild(instruction);
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

The **`generateImageURL()`** function dynamically generates static map previews for individual steps of a route using the **Geoapify Static Maps API**. Each step preview highlights the route’s current position, shows the previous and next parts of the route, and includes a directional arrow to indicate the next maneuver.

![Step Preview on a Map](https://github.com/geoapify/maps-api-code-samples/blob/main/javascript/printable-route-directions/step-preview.jpeg?raw=true)

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
   - Both are dynamically generated and included in the static map’s geometry.
   - Example:
     ```javascript
     geometries.push(`polygon:${manoeuvreArrow};linewidth:1;linecolor:${encodeURIComponent('#333333')};fillcolor:${encodeURIComponent('#ffffff')};fillopacity:1`);
     ```

## How to Run the Sample

You can run the Route + Elevation demo locally using a static server or directly in your IDE with live preview.

### Option 1: Run with a Local HTTP Server

Serve the contents of the folder using a static server:

1. **Install `http-server`** (if not already installed):

   ```bash
   npm install -g http-server
   ```

2. **Start the server** from the folder containing your HTML and JS files:

   ```bash
   http-server .
   ```

3. **Open the demo** in your browser:

   ```
   http://localhost:8080/demo.html
   ```

Or use `npx` for a one-time server:

```bash
npx http-server .
```

### Option 2: Use IDE Live Preview

Many modern IDEs provide live preview for HTML files:

* **Visual Studio Code** — Install the “Live Server” extension, then right-click `src/demo.html` and choose **“Open with Live Server”**.
* **WebStorm / IntelliJ / PhpStorm** — Right-click `src/demo.html` and choose **“Open in Browser”**.
* **Brackets** — Click the **lightning bolt icon** or use **File → Live Preview**.

> Opening the file directly via `file://` protocol is not recommended, as some browsers block dynamic requests in local mode.

## How to Build `demo_combined.html`

As an alternative to running the project from multiple files, you can generate a standalone HTML file with all scripts and styles inlined. This is useful for GitHub Pages or distributing the demo as a single file.

### Steps

1. **Navigate to the parent folder**, e.g. `javascript/route-elevation-chart`:

   ```bash
   cd javascript/route-elevation-chart
   ```

2. **Install the required build dependency**:

   ```bash
   npm install inline-source
   ```

3. **Run the build script** (make sure `combine.js` exists in the folder):

   ```bash
   node combine.js
   ```

This will generate a `demo_combined.html` file with all JavaScript and CSS embedded inline.

> The `combine.js` script should take `src/` as input and produce a portable version suitable for publishing or offline usage.


## Summary

This code sample showcases how to use the **Geoapify Routing API** and **Geoapify Static Maps API** to generate rich, interactive route instructions and static map visuals. It includes key functionalities like:

- **Generating Turn-by-Turn Instructions:** Dynamically creating HTML elements with clear guidance, including icons, distances, and descriptions.
- **Static Route Preview:** Using an image POST request to generate a high-quality, Base64-encoded map preview of the entire route.
- **Step Previews:** Visualizing individual steps with dynamically calculated bearings, previous and next route segments, and directional arrows for precise maneuver guidance.
- **Route Elevation Profile:** Rendering an elevation chart using **Chart.js**, based on elevation data returned by the Geoapify Routing API.

These features are ideal for creating printable or interactive route instructions, combining detailed visuals with clear, actionable guidance.

Explore more about Geoapify's APIs and capabilities at [geoapify.com](https://www.geoapify.com).