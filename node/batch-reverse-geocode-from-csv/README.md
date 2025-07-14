# Geoapify CLI Reverse Geocoder

A fast and flexible Node.js CLI tool for **batch reverse geocoding** geographic coordinates from CSV files using the [Geoapify Reverse Geocoding API](https://www.geoapify.com/reverse-geocoding-api/).

> 🧰 Use as a command-line utility or import as a Node.js module.

## 📚 Table of Contents

* [🚀 Features](#features)
* [📦 Installation & Dependencies](#installation--dependencies)
* [📁 Usage](#usage)
* [📄 CSV Format](#csv-format)
* [📝 Output Formats](#output-formats)
* [⚠️ Error Handling & Fallbacks](#error-handling--fallbacks)
* [📊 Sample Logs](#sample-logs)
* [🔐 API Access Requirements](#api-access-requirements)

## Features

* Read coordinates from CSV files with customizable column mapping (`lat`, `lon`, etc.)
* Built-in rate limiting using `@geoapify/request-rate-limiter` (default: 5 requests/second)
* Automatically retries failed requests with configurable retry limits
* Supports multiple output formats: JSON, NDJSON, or console
* Preserves the original row order in the output
* Skips invalid or empty coordinates with clear warning logs
* Modular architecture with reusable utility modules
* Can be used via CLI or as a Node.js module

## Installation & Dependencies

### Requirements

* **Node.js v18+** — Required for native `fetch()` support
* **Geoapify API Key** — Get one at [https://www.geoapify.com](https://www.geoapify.com)

### Dependencies

This project uses the following NPM packages (already listed in `package.json`):

* [`@geoapify/request-rate-limiter`](https://www.npmjs.com/package/@geoapify/request-rate-limiter) – Handles request throttling
* [`commander`](https://www.npmjs.com/package/commander) – CLI argument parsing
* [`csv-parser`](https://www.npmjs.com/package/csv-parser) – Efficient CSV file parsing

### Install

In the project root, run:

```bash
npm install
```

## Usage

You can use the reverse geocoder as a **command-line tool** or as a **Node.js module** in your own scripts.

### Command Line Usage

#### Basic Example

```bash
node reverse-geocoder.js -k YOUR_API_KEY -i coordinates.csv
```

#### Full Example with All Options

```bash
node reverse-geocoder.js \
  --api-key YOUR_API_KEY \
  --input coordinates.csv \
  --output results.ndjson \
  --rate-limit 5 \
  --output-format ndjson \
  --max-retries 3
```

### CLI Options

| Option            | Short | Description                                      | Default |
| ----------------- | ----- | ------------------------------------------------ | ------- |
| `--api-key`       | `-k`  | **(Required)** Your Geoapify API key             | –       |
| `--input`         | `-i`  | **(Required)** Path to CSV file with coordinates | –       |
| `--output`        | `-o`  | Path to write reverse geocoding results          | –       |
| `--rate-limit`    | `-r`  | Requests per second (RPS)                        | 5       |
| `--output-format` | `-f`  | Output format: `json`, `ndjson`, `console`       | ndjson  |
| `--no-retry`      |       | Disable automatic retries for failed requests    | false   |
| `--max-retries`   |       | Max retry attempts per failed request            | 3       |

### Programmatic Usage

You can also import the geocoder into your own Node.js script:

```js
const { reverseGeocodeCoordinates } = require('./reverse-geocoder');

async function main() {
  const results = await reverseGeocodeCoordinates({
    inputFile: 'coordinates.csv',
    outputFile: 'results.json',
    apiKey: 'YOUR_API_KEY',
    rateLimit: 5,
    outputFormat: 'json',
    retryFailedRequests: true,
    maxRetries: 3
  });

  console.log(`Geocoded ${results.length} coordinates`);
}
```

## CSV Format

The input CSV file should contain latitude and longitude values for each point to be reverse geocoded.

### Default Column Names

By default, the script expects the following column headers:

```csv
lat,lon
40.7128,-74.0060
34.0522,-118.2437
41.8781,-87.6298
```

### Custom Column Mapping

If your file uses different column names (e.g., `latitude`, `longitude`), you can change the mapping in the configuration section of the script or modify the CLI version to support dynamic mapping.

Only valid numeric values within the coordinate range will be processed:

* Latitude: -90 to 90
* Longitude: -180 to 180

Invalid or empty coordinates will be skipped and logged with a warning.

## Output Formats

You can choose between three output formats using the `--output-format` (`-f`) option: `json`, `ndjson`, or `console`.

### JSON Format

A single JSON array containing all results. Recommended for smaller datasets or downstream systems expecting full structured data.

```json
[
  {
    "success": true,
    "originalCoordinates": [40.7128, -74.0060],
    "result": {
      "formatted": "New York, NY 10007, United States of America",
      "city": "New York",
      "state": "New York",
      "country": "United States",
      "postcode": "10007",
      "lat": 40.7128,
      "lon": -74.0060
    },
    "originalRow": { "lat": "40.7128", "lon": "-74.0060" }
  }
]
```

### NDJSON Format (default)

Each result is written on a separate line as a standalone JSON object. Ideal for streaming or processing large datasets.

```
{"success":true,"originalCoordinates":[40.7128,-74.0060],"result":{...}}
{"success":false,"originalCoordinates":[null,null],"error":"Invalid coordinates"}
```

### Console Output

If no `--output` path is specified and `--output-format` is set to `console`, results are printed to stdout.

## Error Handling & Fallbacks

The script includes robust mechanisms to handle common issues and ensure consistent results, even when individual lookups fail.

### What’s Handled:

* **Empty or invalid coordinates**
  Rows with missing or invalid `lat`/`lon` values are skipped and logged with a warning.

* **Network or API errors**
  Failures due to timeouts, DNS errors, or API availability are retried (up to `--max-retries` times).

* **No results from API**
  If no address is found for given coordinates, the result is logged with a descriptive error and included in the output with `"success": false`.

* **Rate limiting (HTTP 429)**
  Automatically throttled using the `@geoapify/request-rate-limiter` to avoid exceeding Geoapify API limits.

* **File read/write errors**
  Clear fatal errors are logged if input/output files are inaccessible or invalid.

### Output Consistency:

* Output files (JSON or NDJSON) always match the order of the original input rows.
* Even failed entries preserve `originalRow` and `originalCoordinates` with an `error` field describing the issue.
* Retry attempts are logged individually and limited by `--max-retries`.

## Sample Logs

The script logs each step with timestamps and clear status indicators. Below is an example log from a typical reverse geocoding run:

```
[2025-07-14T12:00:00.000Z] INFO: Read 3 rows from coordinates.csv
[2025-07-14T12:00:00.050Z] INFO: Starting reverse geocoding of 3 coordinates at 5 requests per second
[2025-07-14T12:00:00.200Z] INFO: ✓ Geocoded: 40.7128,-74.0060
[2025-07-14T12:00:00.400Z] INFO: ✓ Geocoded: 34.0522,-118.2437
[2025-07-14T12:00:00.600Z] WARNING: ✗ Failed: Invalid coordinates - No results found
[2025-07-14T12:00:00.700Z] INFO: Retry attempt 1/3: 1 failed requests...
[2025-07-14T12:00:01.000Z] WARNING: ✗ Retry failed: Invalid coordinates - No results found
[2025-07-14T12:00:01.100Z] INFO: Geocoding complete: 2 successful, 1 failed
[2025-07-14T12:00:01.200Z] INFO: Results written to results.ndjson
```

### Log Levels

* `INFO` — Standard messages: file read, request success, summary
* `WARNING` — Non-fatal issues: failed lookups, skipped rows, retries
* `ERROR` — Critical problems that stop the script: file not found, invalid input, API key missing

## API Access Requirements

This tool uses the [Geoapify Reverse Geocoding API](https://apidocs.geoapify.com/docs/geocoding/reverse-geocoding/).

### Requirements

* **Geoapify API Key** — Required for authenticating all requests
  Get your free API key at [geoapify.com](https://www.geoapify.com/get-started/)

* **Rate Limits**:

  * Free plan allows up to **5 requests per second** (soft limit)
  * Daily quota: up to **3,000 requests per day** on the Free plan
  * Use the `--rate-limit` option to adjust request frequency

* **Node.js version**
  Requires **Node.js 18+** for native `fetch()` support

### Best Practices

* Avoid hardcoding your API key in public code repositories
* Use environment variables or CLI flags (`--api-key`) to pass your key securely
* If processing large datasets, consider:
  * Increasing `--rate-limit` with a paid plan
  * Splitting the workload into multiple batches
  * Scheduling jobs to avoid hitting daily limits

