# Geoapify Location Platform Code Samples

Welcome to the **Geoapify Location Platform Code Samples** repository! This project provides a growing collection of code samples and demos showcasing how to work with Geoapify's powerful geospatial APIs. Whether you're building mapping applications, calculating routes, or integrating geocoding, these samples will help you get started quickly.

## Available Code Samples

### **1. JavaScript: [Printable Route Directions](https://github.com/geoapify/maps-api-code-samples/tree/main/javascript/printable-route-directions)**

#### Description:
This code sample demonstrates how to generate **Printable Route Directions** using Geoapify's Routing API and Static Maps API with JavaScript and HTML. It includes interactive features and static content generation for detailed route instructions.

#### Features:
- **Turn-by-Turn Instructions:** Generate step-by-step instructions with icons, distances, and times.
- **Static Route Preview:** Create a static map image of the entire route using a **POST request**.
- **Step Previews:** Generate dynamic step-by-step map visuals with bearings and directional arrows.
- **Route Elevation Profile:** Render an elevation chart using elevation data from the Routing API.

#### APIs Used:
- [Geoapify Routing API](https://www.geoapify.com/routing-api/)
- [Geoapify Static Maps API](https://www.geoapify.com/static-maps-api/)

#### Demo:
Explore the demo: [Printable Route Directions Demo](https://geoapify.github.io/maps-api-code-samples/javascript/printable-route-directions/demo.html)

### **2. Python: [Create Map Example](https://github.com/geoapify/maps-api-code-samples/tree/main/python/create-a-map)**

#### Description:
This sample demonstrates how to generate an interactive map using the Geoapify Maps API with Python and Folium.

#### Features:
- Custom map styles using Geoapify API.
- Interactive markers for enhanced user experience.
- Dynamic zoom and center capabilities.

#### APIs Used:
- [Geoapify Maps Tiles](https://www.geoapify.com/map-tiles/)

### **3. Python: [Batch Geocode Example](https://github.com/geoapify/maps-api-code-samples/tree/main/python/geocode_addresses)**

#### Description:
This example shows how to perform forward geocoding using the Geoapify Geocoding API to obtain latitude and longitude from addresses.

#### Features:
- Batch geocoding support.
- Country filtering for improved accuracy.
- NDJSON output format.

#### APIs Used:
- [Geoapify Geocoding API](https://www.geoapify.com/geocoding-api/)

### **4. Python: [Reverse Geocode Example](https://github.com/geoapify/maps-api-code-samples/tree/main/python/reverse-geocoding)**

#### Description:
This example demonstrates how to perform reverse geocoding to retrieve addresses from latitude and longitude coordinates using the Geoapify API.

#### Features:
- Batch processing of coordinates.
- Configurable response format (`json` or `geojson`).
- Country filtering for improved results.

#### APIs Used:
- [Geoapify Reverse Geocoding API](https://www.geoapify.com/reverse-geocoding-api/)

Sure! Here's how you can write similar sections for the **Address Standardization** and **Address Validation** examples in the same style as your Reverse Geocode Example:


### **5. Python: [Address Standardization Example](https://github.com/geoapify/maps-api-code-samples/tree/main/python/address-standardization)**

#### Description:
This example demonstrates how to use the Geoapify Geocoding API to geocode addresses and generate standardized address strings based on a custom format.

#### Features:
- Batch geocoding of address lists.
- Flexible address formatting using placeholders (e.g., `{street}`, `{city}`, `{postcode}`).
- Output in both NDJSON (raw results) and CSV (standardized format).

#### APIs Used:
- [Geoapify Forward Geocoding API](https://www.geoapify.com/geocoding-api/)

### **6. Python: [Address Validation Example](https://github.com/geoapify/maps-api-code-samples/tree/main/python/address-validation)**

#### Description:
This example shows how to validate address accuracy using confidence levels returned by the Geoapify Geocoding API.

#### Features:
- Batch address validation with detailed confidence analysis.
- Classification into `CONFIRMED`, `PARTIALLY_CONFIRMED`, and `NOT_CONFIRMED`.
- Output CSV includes validation results and reasons for uncertainty.

#### APIs Used:
- [Geoapify Forward Geocoding API](https://www.geoapify.com/geocoding-api/)

### **7. Python: [Isoline Visualization Example](https://github.com/geoapify/maps-api-code-samples/tree/main/python/calculate-and-visualize-isoline)**

#### Description:  
This example demonstrates how to use the Geoapify Isoline API to generate and display **isochrones** (time-based) or **isodistances** (distance-based) as interactive polygons on a map using **Folium**.

#### Features:
- Visualizes travel range from a specific location by time or distance.
- Supports multiple travel modes (`drive`, `walk`, `bicycle`, etc.).
- Accepts advanced options like traffic modeling, route optimization, and avoidance.
- Saves and opens an interactive HTML map with isoline overlays.

#### APIs Used:
- [Geoapify Isoline API](https://www.geoapify.com/isoline-api/)
- [Geoapify Map Tiles](https://www.geoapify.com/map-tiles/)  
- [Folium Library](https://python-visualization.github.io/folium/)


### **8. Python: [Display Geocoded Addresses with Clustering and Confidence Coloring](https://github.com/geoapify/maps-api-code-samples/tree/main/python/show-addresses-on-a-map)**

#### Description:  
This example demonstrates how to display **geocoded addresses** on a Folium map using data from Geoapify. It supports **marker clustering**, **interactive popups**, and **confidence-based color coding**. Optionally, you can enable **custom markers** using the Geoapify Map Markers API.

#### Features:
- Reads geocoded data from an NDJSON file.
- Adds individual markers with address popups.
- Optionally clusters nearby markers with `MarkerCluster`.
- Colors markers based on `rank.confidence` value.
- Supports custom marker icons via Geoapify Map Markers API.
- Automatically adjusts map zoom to fit all locations.
- Opens the result in a browser as an interactive HTML map.

#### APIs Used:
- [Geoapify Map Markers API](https://apidocs.geoapify.com/playground/icon/)
- [Geoapify Map Tiles](https://www.geoapify.com/map-tiles/)  
- [Folium Library](https://python-visualization.github.io/folium/)  
- [Folium MarkerCluster Plugin](https://python-visualization.github.io/folium/latest/user_guide/plugins/marker_cluster.html)

### **9. Python: [Fetch Places with Grid and Pagination](https://github.com/geoapify/maps-api-code-samples/tree/main/python/query-points-of-interest-with-places-api)**

#### Description:  
This example demonstrates how to fetch **places data** from the Geoapify Places API for a given bounding box. It divides large areas into smaller grid cells (if needed), handles **pagination**, and writes results in **NDJSON format**.

#### Features:
- Accepts a bounding box and optional place categories.
- Divides the area into grid cells ≤ 5 km using lat/lon conversion.
- Handles pagination when more than 200 results are returned.
- Uses `aiohttp` + `asyncio` for efficient parallel requests.
- Implements request rate-limiting (5 RPS) to comply with Geoapify Free Plan.
- Outputs place `properties` in newline-delimited JSON format (NDJSON).

#### APIs Used:
- [Geoapify Places API](https://www.geoapify.com/places-api/)
- [API Playground – Places](https://apidocs.geoapify.com/playground/places/)
- [Asyncio](https://docs.python.org/3/library/asyncio.html), [Aiohttp](https://docs.aiohttp.org/)


### **10. Python: [Route Planner Result Processor](https://github.com/geoapify/maps-api-code-samples/tree/main/python/route-planner)**

#### **Description:**  
This example demonstrates how to process a request to the **Geoapify Route Planner API**, generate structured outputs for each agent, and visualize their assigned routes.

#### **Features:**
- Accepts a JSON request compatible with the Route Planner API.
- Calls the **Route Planner API** and retrieves planned jobs and waypoints.
- Creates **individual folders** for each agent:
  - Saves `plan.json` with job and route details.
  - Renders a **route map** using **Folium** and the **Routing API**.
- Outputs an `issues.json` file listing any unassigned or problematic jobs.
  
#### **APIs Used:**
- [Geoapify Route Planner API](https://www.geoapify.com/route-planner/)
- [Geoapify Routing API](https://www.geoapify.com/routing-api/)
- [Folium Library](https://python-visualization.github.io/folium/)


### **11. JavaScript(Node.js): [Batch Geocoding with Rate Limiting](https://github.com/geoapify/maps-api-code-samples/tree/main/javascript/geocoding-with-RPS-limit-respect)**

#### **Description:**  
This example demonstrates how to geocode a large number of addresses using the **Geoapify Geocoding API**, while automatically respecting API rate limits with the help of the [`@geoapify/request-rate-limiter`](https://www.npmjs.com/package/@geoapify/request-rate-limiter) package.

#### **Features:**
- Reads addresses from a plain text file (`input.txt`), one per line.
- Sends geocoding requests with a limit of **5 requests per second** (default for Free plan).
- Outputs results to:
  - `results.json` — full API response per address.
- Logs geocoding progress and errors in real-time.
- Built with **ES modules**, `node-fetch`, and Geoapify’s official rate limiter.

#### **APIs Used:**
- [Geoapify Geocoding API](https://www.geoapify.com/geocoding-api/)
- [@geoapify/request-rate-limiter](https://www.npmjs.com/package/@geoapify/request-rate-limiter)

### **12. JavaScript(Node.js): [Batch Reverse Geocoding](https://github.com/geoapify/maps-api-code-samples/tree/main/javascript/reverse-geocoding-lat-lon-to-address)**

#### **Description:**  
This example demonstrates how to perform batch **reverse geocoding** using the **Geoapify Reverse Geocoding API**. It reads a list of latitude/longitude pairs from a text file, resolves them into addresses, and saves the output as structured JSON — all while respecting rate limits.

#### **Features:**
- Reads coordinate pairs (`lat,lon`) from `input.txt`.
- Calls the **Geoapify Reverse Geocoding API** for each location.
- Uses [`@geoapify/request-rate-limiter`](https://www.npmjs.com/package/@geoapify/request-rate-limiter) to automatically respect the 5 RPS API limit.
- Logs progress and handles errors gracefully.
- Saves results to a `results.json` file in structured format.

#### **APIs Used:**
- [Geoapify Reverse Geocoding API](https://www.geoapify.com/reverse-geocoding-api/)
- [@geoapify/request-rate-limiter](https://www.npmjs.com/package/@geoapify/request-rate-limiter)
- [node-fetch](https://www.npmjs.com/package/node-fetch)


## Upcoming Code Samples

We plan to expand this repository with code samples in various programming languages, demonstrating different Geoapify APIs, including:

1. **Geocoding and Address Lookup:**
   - Forward and reverse geocoding examples.
   - Address validation and standardization.

2. **Isochrones API:**
   - Create travel-time or distance-based areas.
   - Use cases for accessibility analysis and service area mapping.

3. **POI Search API:**
   - Find points of interest near a location.
   - Filter results by categories, names, or other attributes.

4. **Interactive and Static Maps:**
   - Generate and style static maps.
   - Integrate dynamic interactive maps using Geoapify map tiles.

5. **Multi-Language Code Samples:**
   - Examples in **JavaScript**, **Python**, **Node.js**, **Java**, **C#**, and more.

## How to Use

Each code sample includes:
- **Detailed Instructions:** Step-by-step guidance to set up and run the sample.
- **Ready-to-Run Code:** Fully functional code you can test immediately.
- **APIs in Action:** Demonstrations of Geoapify's APIs with practical use cases.

Stay tuned for updates as we add more samples!

## About Geoapify

The [Geoapify Location Platform](https://www.geoapify.com) provides APIs and tools for geospatial applications, including geocoding, routing, isochrones, POI search, and map generation. Its flexible APIs are perfect for developers building location-based services or GIS solutions.

## Feedback and Contributions

We welcome feedback and contributions to improve this repository. If you have questions, suggestions, or would like to share your Geoapify-based project, feel free to [reach out](mailto:info@geoapify.com)!

Stay updated as we expand this repository to include even more Geoapify API use cases.