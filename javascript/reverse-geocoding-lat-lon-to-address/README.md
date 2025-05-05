# Geoapify Batch Reverse Geocoding Script

This Node.js script performs **reverse geocoding** for a list of geographic coordinates using the [Geoapify Geocoding API](https://www.geoapify.com/reverse-geocoding-api/). It reads coordinates from a `.txt` file, sends API requests in batches, respects rate limits via [`@geoapify/request-rate-limiter`](https://www.npmjs.com/package/@geoapify/request-rate-limiter), and saves the resulting addresses to a JSON file.

## Features

- Reads input coordinates from `input.txt`
- Sends reverse geocoding requests to Geoapify's API
- Automatically throttles requests (5 RPS by default)
- Logs progress and batches to console
- Outputs structured results to `results.json`
- Handles HTTP errors and empty API responses

## Requirements

- Node.js v16 or later
- Geoapify API key ([get one for free](https://myprojects.geoapify.com))d
- The following NPM packages:
  - [`node-fetch`](https://www.npmjs.com/package/node-fetch)
  - [`@geoapify/request-rate-limiter`](https://www.npmjs.com/package/@geoapify/request-rate-limiter)

### Install dependencies

Make sure your `package.json` includes:

```json
{
  "type": "module"
}


Then install:

```bash
npm install
```

## Usage

### 1. Prepare your input file

Create a file called `input.txt` with one coordinate pair per line in `lat,lon` format:

```
48.8606,2.3376
41.9065,12.4536
39.9042,116.4074
51.5194,-0.1270
51.4967,-0.1764
40.7794,-73.9632
40.7813,-73.9735
...
```

### 2. Add your API key

Replace 'YOUR_API_KEY' with you Geoapify API key.

### 3. Run the script

```bash
node reverse-geocode.js
```

### 4. View the results

After the script runs, check the `results.json` file in your project directory.

## Output Format

Each result in `results.json` will follow this structure:

```json
{
"row": {
    "lat": 48.8606,
    "lon": 2.3376
},
"result": {
    "datasource": {
    "sourcename": "openstreetmap",
    "attribution": "© OpenStreetMap contributors",
    "license": "Open Database License",
    "url": "https://www.openstreetmap.org/copyright"
    },
    "name": "Louvre Museum",
    "country": "France",
    "country_code": "fr",
    "region": "Metropolitan France",
    "state": "Ile-de-France",
    "city": "Paris",
    "postcode": "75001",
    "district": "Paris",
    "suburb": "1st Arrondissement",
    "city_block": "Quartier Saint-Germain-l'Auxerrois",
    "street": "Place du Carrousel",
    "iso3166_2": "FR-IDF",
    "iso3166_2_sublevel": "FR-75C",
    "lon": 2.33802768704666,
    "lat": 48.8611473,
    "state_code": "IDF",
    "state_COG": "11",
    "distance": 0,
    "result_type": "amenity",
    "formatted": "Louvre Museum, Place du Carrousel, 75001 Paris, France",
    "address_line1": "Louvre Museum",
    "address_line2": "Place du Carrousel, 75001 Paris, France",
    "category": "entertainment.museum",
    "timezone": {
    "name": "Europe/Paris",
    "offset_STD": "+01:00",
    "offset_STD_seconds": 3600,
    "offset_DST": "+02:00",
    "offset_DST_seconds": 7200,
    "abbreviation_STD": "CET",
    "abbreviation_DST": "CEST"
    },
    "plus_code": "8FW4V86Q+F6",
    "plus_code_short": "6Q+F6 Paris, Ile-de-France, France",
    "rank": {
    "importance": 0.6436012537671365,
    "popularity": 8.995467104553104
    },
    "place_id": "513c1028dc47b4024059f44421133a6e4840f00101f90122ad720000000000c0020192030d4c6f75767265204d757365756d",
    "bbox": {
    "lon1": 2.3317162,
    "lat1": 48.8593816,
    "lon2": 2.3400113,
    "lat2": 48.8629132
    }
}
}
```

If an address wasn't found or an error occurred:

```json
{
  "row": { "lat": 10.0000, "lon": 10.0000 },
  "error": "No address found"
}
```

## Filtering by Type

You can restrict reverse geocoding results to specific types of locations by setting the optional `type` parameter in the script.

This is useful when you want to extract only certain geographic features, such as cities, postcodes, or amenities.

### Supported types:

- `country` – Find country by lat/lon  
- `state` – Find state or province by lat/lon  
- `city` – Find city, town, or village by lat/lon  
- `postcode` – Find postcode by lat/lon  
- `street` – Find the street name only  
- `amenity` – Find the nearest point of interest (e.g. museum, restaurant)

### Example

To find **only the city** for each coordinate:

```js
const type = 'city';
```

To get the **nearest postcode**:

```js
const type = 'postcode';
```

Leave `type = null` if you want the full reverse geocoding result without filtering.

## How It Works

- `readCoordinates()` reads and parses `lat,lon` entries from a text file.
- `createReverseGeocodingRequest()` builds one API call per coordinate.
- `RequestRateLimiter` executes those calls in batches (10 per batch, max 5 per second).
- `saveToJSON()` writes the full result set to a JSON file.

## Read More

- [Geoapify Reverse Geocoding API Documentation](https://www.geoapify.com/reverse-geocoding-api/)
- [@geoapify/request-rate-limiter on npm](https://www.npmjs.com/package/@geoapify/request-rate-limiter)
- [node-fetch Documentation](https://www.npmjs.com/package/node-fetch)
- [Geoapify Developer Portal](https://apidocs.geoapify.com/)
- [Rate Limiting and Batch Request Patterns (Blog)](https://www.geoapify.com/how-to-avoid-429-too-many-requests-with-api-rate-limiting/)

For advanced use cases like CSV input/output, asynchronous job batching, or fallback handling, check the [Geoapify GitHub Examples](https://github.com/geoapify/maps-api-code-samples).
