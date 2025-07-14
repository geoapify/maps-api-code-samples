# Geoapify Location Platform Code Samples
![License](https://img.shields.io/github/license/geoapify/maps-api-code-samples)
![GitHub Repo Stars](https://img.shields.io/github/stars/geoapify/maps-api-code-samples?style=social)

Welcome to the **Geoapify Location Platform Code Samples** repository! This project provides a growing collection of code samples and demos showcasing how to work with Geoapify's powerful geospatial APIs. Whether you're building mapping applications, calculating routes, or integrating geocoding, these samples will help you get started quickly.

## 🧩 Available Code Samples

### JavaScript

* [Printable Route Directions](#javascript-printable-route-directions)

### Node.js

* [Batch Geocoding with Rate Limiting](#nodejs-batch-geocoding-with-rate-limiting)
* [Batch Reverse Geocoding](#nodejs-batch-reverse-geocoding)

### Python

* [Create Map Example](#python-create-map-example)
* [Batch Geocode Example](#python-batch-geocode-example)
* [Reverse Geocode Example](#python-reverse-geocode-example)
* [Address Standardization Example](#python-address-standardization-example)
* [Address Validation Example](#python-address-validation-example)
* [Isoline Visualization Example](#python-isoline-visualization-example)
* [Display Geocoded Addresses](#python-display-geocoded-addresses-with-clustering-and-confidence-coloring)
* [Fetch Places with Grid and Pagination](#python-fetch-places-with-grid-and-pagination)
* [Route Planner Result Processor](#python-route-planner-result-processor)

---

### JavaScript: [Printable Route Directions](https://github.com/geoapify/maps-api-code-samples/tree/main/javascript/printable-route-directions)

**What it does:**  
Generates printable, step-by-step route directions with static maps, interactive previews, and an elevation chart.

**How it works:**  
Uses JavaScript and HTML to call the Geoapify Routing API for route data and the Static Maps API to render visual instructions. It includes an overview image of the full route, dynamic step previews with arrows, and an elevation profile.

**Key features:**
- Turn-by-turn instructions with icons, distances, and durations.
- Static map of the complete route via a POST request.
- Dynamic map previews for each step with bearings and arrows.
- Elevation profile chart using route data.

**APIs used:**
- [Geoapify Routing API](https://www.geoapify.com/routing-api/)
- [Geoapify Static Maps API](https://www.geoapify.com/static-maps-api/)

**Demo:**  
👉 [Printable Route Directions – Live Demo](https://geoapify.github.io/maps-api-code-samples/javascript/printable-route-directions/demo.html)

---

### Node.js: [Batch Geocoding with Rate Limiting](https://github.com/geoapify/maps-api-code-samples/tree/main/node/geocoding-with-RPS-limit-respect)

**What it does:**  
Geocodes a large list of addresses while respecting API rate limits automatically.

**How it works:**  
Reads addresses from a text file and sends geocoding requests to the Geoapify API using a built-in rate limiter. It ensures no more than 5 requests per second (Free plan limit), logs progress, and saves structured results to a JSON file.

**Key features:**
- Reads addresses line-by-line from `input.txt`.
- Enforces 5 requests per second using Geoapify’s rate limiter.
- Outputs full geocoding results to `results.json`.
- Logs progress and errors in real time.
- Uses modern stack: ES modules, `node-fetch`, and `@geoapify/request-rate-limiter`.

**APIs used:**
- [Geoapify Geocoding API](https://www.geoapify.com/geocoding-api/)
- [@geoapify/request-rate-limiter](https://www.npmjs.com/package/@geoapify/request-rate-limiter)

---

### Node.js: [Batch Reverse Geocoding](https://github.com/geoapify/maps-api-code-samples/tree/main/node/reverse-geocoding-lat-lon-to-address)

**What it does:**  
Converts latitude/longitude pairs into human-readable addresses in batch mode, while respecting Geoapify API rate limits.

**How it works:**  
Reads coordinate pairs from a text file and uses the Geoapify Reverse Geocoding API to resolve them into addresses. The script uses a built-in rate limiter to stay within 5 requests per second (Free plan limit) and saves the results in structured JSON.

**Key features:**
- Reads coordinate pairs from `input.txt` (`lat,lon` format).
- Sends reverse geocoding requests for each point.
- Automatically respects the 5 RPS limit using `@geoapify/request-rate-limiter`.
- Logs progress and errors in real time.
- Outputs results to `results.json`.

**APIs used:**
- [Geoapify Reverse Geocoding API](https://www.geoapify.com/reverse-geocoding-api/)
- [@geoapify/request-rate-limiter](https://www.npmjs.com/package/@geoapify/request-rate-limiter)
- [node-fetch](https://www.npmjs.com/package/node-fetch)

---

### Python: [Create Map Example](https://github.com/geoapify/maps-api-code-samples/tree/main/python/create-a-map)

**What it does:**  
Generates an interactive web map using Geoapify map tiles and the Folium Python library.

**How it works:**  
Uses Python and Folium to create a Leaflet-based map with custom tile styles from Geoapify. You can add interactive markers, control the map center and zoom, and export the result as an HTML file.

**Key features:**
- Custom map styles via Geoapify tile URLs.
- Interactive markers for enhanced UX.
- Dynamically set zoom level and map center.
- Outputs a self-contained interactive HTML map.

**APIs used:**
- [Geoapify Map Tiles](https://www.geoapify.com/map-tiles/)

---

### Python: [Batch Geocode Example](https://github.com/geoapify/maps-api-code-samples/tree/main/python/geocode_addresses)

**What it does:**  
Performs batch forward geocoding to convert addresses into geographic coordinates (latitude and longitude).

**How it works:**  
Reads a list of addresses and sends them to the Geoapify Geocoding API. Optionally applies country filters to improve result relevance. Results are saved in NDJSON format for easy processing.

**Key features:**
- Batch processing of address lists.
- Optional country filtering to improve accuracy.
- Outputs results in newline-delimited JSON (NDJSON) format.

**APIs used:**
- [Geoapify Geocoding API](https://www.geoapify.com/geocoding-api/)

---

### Python: [Reverse Geocode Example](https://github.com/geoapify/maps-api-code-samples/tree/main/python/reverse-geocoding)

**What it does:**  
Converts latitude and longitude coordinates into human-readable addresses using batch reverse geocoding.

**How it works:**  
Processes a list of coordinate pairs and sends them to the Geoapify Reverse Geocoding API. Supports optional country filtering and selectable output formats such as `json` or `geojson`.

**Key features:**
- Batch reverse geocoding of coordinate lists.
- Country filtering for more relevant results.
- Configurable output format: `json` or `geojson`.

**APIs used:**
- [Geoapify Reverse Geocoding API](https://www.geoapify.com/reverse-geocoding-api/)

---

### Python: [Address Standardization Example](https://github.com/geoapify/maps-api-code-samples/tree/main/python/address-standardization)

**What it does:**  
Geocodes raw address data and generates standardized address strings based on a custom format.

**How it works:**  
Processes a batch of addresses using the Geoapify Geocoding API and applies a formatting template with placeholders like `{street}`, `{postcode}`, and `{city}`. Supports both raw and clean outputs for different use cases.

**Key features:**
- Batch geocoding of address lists.
- Flexible address formatting using placeholders.
- Outputs:
  - NDJSON (raw API results)
  - CSV (standardized address format)

**APIs used:**
- [Geoapify Forward Geocoding API](https://www.geoapify.com/geocoding-api/)

---

### Python: [Address Validation Example](https://github.com/geoapify/maps-api-code-samples/tree/main/python/address-validation)

**What it does:**  
Validates address quality and accuracy using confidence levels from the Geoapify Geocoding API.

**How it works:**  
Performs batch geocoding of address data and evaluates the `rank.confidence` and `result_type` fields to assess how well each address is recognized. Results are classified into confidence levels and saved to a CSV file.

**Key features:**
- Batch validation of address lists.
- Confidence-based classification:
  - `CONFIRMED`
  - `PARTIALLY_CONFIRMED`
  - `NOT_CONFIRMED`
- CSV output includes validation results and uncertainty reasons.

**APIs used:**
- [Geoapify Forward Geocoding API](https://www.geoapify.com/geocoding-api/)

---

### Python: [Isoline Visualization Example](https://github.com/geoapify/maps-api-code-samples/tree/main/python/calculate-and-visualize-isoline)

**What it does:**  
Generates and visualizes travel areas (isochrones or isodistances) as interactive polygons on a map.

**How it works:**  
Uses the Geoapify Isoline API to calculate reachable areas from a starting point, based on time or distance. The result is rendered on a Leaflet-based map with Folium and saved as an interactive HTML file.

**Key features:**
- Visualizes travel range by time or distance.
- Supports various travel modes (`drive`, `walk`, `bicycle`, etc.).
- Accepts advanced options: traffic, route optimization, avoidance zones.
- Outputs an interactive HTML map with isoline overlays.

**APIs used:**
- [Geoapify Isoline API](https://www.geoapify.com/isoline-api/)
- [Geoapify Map Tiles](https://www.geoapify.com/map-tiles/)
- [Folium Library](https://python-visualization.github.io/folium/)

---

### Python: [Display Geocoded Addresses with Clustering and Confidence Coloring](https://github.com/geoapify/maps-api-code-samples/tree/main/python/show-addresses-on-a-map)

**What it does:**  
Displays geocoded address data on an interactive Folium map, with support for clustering, confidence-based color coding, and optional custom markers.

**How it works:**  
Reads geocoded results from an NDJSON file and plots them on a Leaflet map using Folium. Nearby markers can be clustered, and each marker’s color reflects its confidence level. You can optionally use custom map marker icons from the Geoapify Marker API.

**Key features:**
- Reads geocoded address data from NDJSON.
- Adds interactive markers with address popups.
- Marker clustering with `MarkerCluster`.
- Marker color reflects `rank.confidence` values.
- Optional custom icons via Geoapify Marker API.
- Auto-fit map view to all markers.
- Outputs a fully interactive HTML map.

**APIs used:**
- [Geoapify Map Markers API](https://apidocs.geoapify.com/playground/icon/)
- [Geoapify Map Tiles](https://www.geoapify.com/map-tiles/)
- [Folium Library](https://python-visualization.github.io/folium/)
- [Folium MarkerCluster Plugin](https://python-visualization.github.io/folium/latest/user_guide/plugins/marker_cluster.html)

---

### Python: [Fetch Places with Grid and Pagination](https://github.com/geoapify/maps-api-code-samples/tree/main/python/query-points-of-interest-with-places-api)

**What it does:**  
Retrieves places of interest from the Geoapify Places API across a large geographic area using grid-based queries with pagination.

**How it works:**  
Accepts a bounding box and optional filters, then divides the area into smaller 5×5 km grid cells. It queries each cell using the Places API with pagination and saves the results in NDJSON format. The script uses `asyncio` and `aiohttp` for efficient concurrent requests and respects the Free Plan rate limit.

**Key features:**
- Input: bounding box with optional POI category filters.
- Automatically splits large areas into 5 km grid cells.
- Handles pagination for >200 results.
- Uses `aiohttp` + `asyncio` for fast async requests.
- Respects 5 RPS rate limit (Geoapify Free Plan).
- Outputs `properties` of POIs in NDJSON format.

**APIs used:**
- [Geoapify Places API](https://www.geoapify.com/places-api/)
- [Geoapify Places API Playground](https://apidocs.geoapify.com/playground/places/)
- [Asyncio](https://docs.python.org/3/library/asyncio.html)
- [Aiohttp](https://docs.aiohttp.org/)

---

### Python: [Route Planner Result Processor](https://github.com/geoapify/maps-api-code-samples/tree/main/python/route-planner)

**What it does:**  
Processes a request to the Geoapify Route Planner API, extracts results per agent, and visualizes their routes on interactive maps.

**How it works:**  
Accepts a JSON file describing agents, jobs, and shipments. It sends the request to the Route Planner API, then organizes the results into per-agent folders. For each agent, it saves detailed route data and generates a route map using Folium and the Routing API. Unassigned or problematic jobs are logged separately.

**Key features:**
- Accepts structured JSON input compatible with Route Planner API.
- Creates per-agent folders with route and job data (`plan.json`).
- Generates interactive route maps using Folium.
- Produces an `issues.json` report for unassigned jobs.

**APIs used:**
- [Geoapify Route Planner API](https://www.geoapify.com/route-planner/)
- [Geoapify Routing API](https://www.geoapify.com/routing-api/)
- [Folium Library](https://python-visualization.github.io/folium/)

## 🚧 Upcoming Code Samples

We're actively expanding this repository with examples in multiple programming languages, demonstrating how to work with additional Geoapify APIs and features.

**Planned topics include:**

### Geocoding & Address Lookup
- Forward and reverse geocoding
- Address validation and standardization

### Isochrones API
- Create travel-time or distance-based areas (isochrones/isodistances)
- Use cases: accessibility analysis, service area mapping

### POI Search API
- Find places near a given location
- Filter by categories, names, or tags

### Interactive & Static Maps
- Style and generate static maps
- Embed interactive maps using Geoapify map tiles

### Multi-language Code Samples
- Examples in **JavaScript**, **Python**, **Node.js**, **Java**, **C#**, and more

## 🚀 How to Use

Each code sample includes everything you need to get started quickly:

- **Step-by-step instructions** to install dependencies and run the code.
- **Ready-to-run scripts or HTML demos** you can test immediately.
- **Real-world use cases** showing how Geoapify APIs solve common geospatial tasks.

## 🗺️ About Geoapify

[Geoapify](https://www.geoapify.com) provides powerful and flexible APIs for building location-based and geospatial applications. Whether you're working on maps, geocoding, routing, isochrones, POI search, or spatial analysis — Geoapify offers the tools to bring your ideas to life.

Our APIs are designed with developers in mind and are ideal for creating GIS platforms, logistics solutions, delivery systems, smart city tools, and more.

Explore our full API catalog at [geoapify.com](https://www.geoapify.com), or check out the [API Playground](https://apidocs.geoapify.com/playground/) to test requests in your browser.

## 💬 Feedback and Contributions

We welcome feedback, suggestions, and contributions to improve this repository!

If you have:
- Questions about how something works,
- Ideas for new code samples,
- Or a Geoapify-powered project you'd like to share —

Feel free to [contact us](mailto:info@geoapify.com) or open an issue or pull request.

Stay tuned — we're continuously adding more examples and use cases!