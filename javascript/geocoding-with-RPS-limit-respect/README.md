# Geoapify Batch Geocoding Script

This Node.js script performs batch geocoding using the [Geoapify Geocoding API](https://www.geoapify.com/geocoding-api/) while **respecting rate limits** through the official [`@geoapify/request-rate-limiter`](https://www.npmjs.com/package/@geoapify/request-rate-limiter) package. It reads addresses from a text file, geocodes them, and writes the results to a JSON file.

## Highlights

- Uses [@geoapify/request-rate-limiter](https://www.npmjs.com/package/@geoapify/request-rate-limiter) to automatically respect Geoapify RPS limits
- Reads addresses from `input.txt`
- Outputs full results to `results.json`
- Logs geocoding progress and errors
- Built with ES Modules and `node-fetch`

## Requirements

- Node.js **v16+**
- A [Geoapify API key](https://myprojects.geoapify.com)
- The following dependencies:
  - [`@geoapify/request-rate-limiter`](https://www.npmjs.com/package/@geoapify/request-rate-limiter)
  - [`node-fetch`](https://www.npmjs.com/package/node-fetch)

## Install dependencies

All required dependencies are already listed in the `package.json` file.  
To install them, simply run:

```bash
npm install
```

## Usage

1. **Create `input.txt`**  
   List one address per line:

   ```
   1600 Amphitheatre Parkway, Mountain View, CA
   1 Infinite Loop, Cupertino, CA
   ```

2. Use your API key

Replace 'YOUR_API_KEY' with you Geoapify API key.

3. **Run the script**

   ```bash
   node geocode.js
   ```

4. **View output**

   - `results.json`: contains structured geocoding results

## Code Overview

### Powered by [`@geoapify/request-rate-limiter`](https://www.npmjs.com/package/@geoapify/request-rate-limiter)

This script relies on Geoapify's official rate limiter to stay within the Free plan's 5 requests per second. The package makes it easy to batch and throttle API calls without hitting limits.

### Key Components

- `readAddressesFromFile()` – Loads addresses from `input.txt`.
- `createGeocodingRequest()` – Creates individual throttled fetch requests.
- `geocodeBatch()` – Processes all addresses using `rateLimitedRequests()` with:
  - `limit: 5 RPS`
  - `batchSize: 10`
  - progress and batch logging
- `saveToJSONFile()` – Writes structured results to disk.

## Output Example

A successful geocode result:

```json
{
  "address": "North Oak Street, Bethalto, IL 62010, USA,",
  "result": {
    "datasource": {
      "sourcename": "openstreetmap",
      "attribution": "© OpenStreetMap contributors",
      "license": "Open Database License",
      "url": "https://www.openstreetmap.org/copyright"
    },
    "name": "North Oak Street",
    "country": "United States",
    "country_code": "us",
    "state": "Illinois",
    "county": "Madison County",
    "city": "Bethalto",
    "postcode": "62010",
    "street": "North Oak Street",
    "iso3166_2": "US-IL",
    "lon": -90.0421214,
    "lat": 38.9103244,
    "state_code": "IL",
    "result_type": "street",
    "formatted": "North Oak Street, Bethalto, IL 62010, United States of America",
    "address_line1": "North Oak Street",
    "address_line2": "Bethalto, IL 62010, United States of America",
    "timezone": {
      "name": "America/Chicago",
      "offset_STD": "-06:00",
      "offset_STD_seconds": -21600,
      "offset_DST": "-05:00",
      "offset_DST_seconds": -18000,
      "abbreviation_STD": "CST",
      "abbreviation_DST": "CDT"
    },
    "plus_code": "86CFWX65+45",
    "plus_code_short": "65+45 Bethalto, Madison County, United States",
    "rank": {
      "importance": 0.35334333333333334,
      "popularity": 1.6436670429679177,
      "confidence": 1,
      "confidence_city_level": 1,
      "confidence_street_level": 1,
      "match_type": "full_match"
    },
    "place_id": "518dddf41db28256c0591b608b8285744340f00102f90140194f0100000000c002049203104e6f727468204f616b20537472656574",
    "bbox": {
      "lon1": -90.0424917,
      "lat1": 38.909672,
      "lon2": -90.041749,
      "lat2": 38.9110236
    }
  }
}
```

If no result was found:

```json
{
  "address": "Unknown Street",
  "error": "No result found"
}
```

## Read More

- [Geoapify Geocoding API Documentation](https://www.geoapify.com/geocoding-api/)
- [@geoapify/request-rate-limiter on npm](https://www.npmjs.com/package/@geoapify/request-rate-limiter)
- [node-fetch Documentation](https://www.npmjs.com/package/node-fetch)
- [Geoapify Developer Portal](https://apidocs.geoapify.com/)
- [Rate Limiting and Batch Request Patterns (Blog)](https://www.geoapify.com/how-to-avoid-429-too-many-requests-with-api-rate-limiting/)

For advanced use cases like CSV input/output, asynchronous job batching, or fallback handling, check the [Geoapify GitHub Examples](https://github.com/geoapify/maps-api-code-samples).