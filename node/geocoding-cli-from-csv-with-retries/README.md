# Geoapify CLI Address Geocoder

A fast and flexible Node.js CLI tool for batch geocoding addresses from CSV files using the [Geoapify Geocoding API](https://www.geoapify.com/geocoding-api/).  
Includes built-in rate limiting, retry logic, and multiple output formats.

> 🧰 Use as a command-line utility or import as a Node.js module.

## 📚 Table of Contents

- [🚀 Features](#features)
- [📦 Installation & Dependencies](#installation--dependencies)
- [📁 Usage](#usage)
- [📄 CSV Format](#csv-format)
- [📝 Output Formats](#output-formats)
- [⚠️ Error Handling & Fallbacks](#error-handling--fallbacks)
- [📊 Sample Logs](#sample-logs)
- [🔐 API Access Requirements](#api-access-requirements)

## Features

- 📁 **CSV Input** — Read addresses from CSV files with customizable column mapping
- ⏱️ **Rate Limiting** — Automatically throttles requests using `@geoapify/request-rate-limiter` (default: 5 RPS)
- 🔁 **Retry Logic** — Automatically retries failed or rate-limited requests
- 📤 **Flexible Output** — Save results as JSON, NDJSON, or print to console
- 🌍 **Country Filtering** — Optional `--country-code` for more precise geocoding
- 🧾 **Detailed Logging** — Logs each step with timestamps and summaries
- 🛠️ **CLI & Module Support** — Use from terminal or as a programmatic function

## Installation & Dependencies

### Requirements

- **Node.js v18+**
- A [Geoapify API key](https://www.geoapify.com/get-started/)
- The following npm packages (already listed in `package.json`):
  - [`@geoapify/request-rate-limiter`](https://www.npmjs.com/package/@geoapify/request-rate-limiter)
  - [`commander`](https://www.npmjs.com/package/commander)
  - [`csv-parser`](https://www.npmjs.com/package/csv-parser)

### Install

Run the following in the project root:

```bash
# Install required dependencies
npm install
```

## Usage

This tool can be used via the command line or imported into your own JavaScript code.

### 🖥️ Command Line Interface (CLI)

#### Basic usage

```bash
node geocoder.js -k YOUR_API_KEY -i addresses.csv -o results.ndjson
````

#### Full example with all options

```bash
node geocoder.js \
  --api-key YOUR_API_KEY \
  --input addresses.csv \
  --output results.ndjson \
  --rate-limit 3 \
  --country-code US \
  --output-format ndjson \
  --max-retries 2
```

### 🧾 CLI Options

| Option            | Short | Description                                   | Default |
| ----------------- | ----- | --------------------------------------------- | ------- |
| `--api-key`       | `-k`  | **(Required)** Your Geoapify API key          | -       |
| `--input`         | `-i`  | **(Required)** Input CSV file path            | -       |
| `--output`        | `-o`  | Path to write geocoding results               | -       |
| `--rate-limit`    | `-r`  | Requests per second (RPS)                     | 5       |
| `--country-code`  | `-c`  | Optional country filter (e.g., US, GB)        | -       |
| `--output-format` | `-f`  | Output format: `json`, `ndjson`, `console`    | ndjson  |
| `--no-retry`      |       | Disable automatic retries for failed requests | false   |
| `--max-retries`   |       | Max retry attempts per failed request         | 3       |

### 📦 Programmatic Usage

You can also use the geocoder as a module in your own Node.js scripts:

```js
const { geocodeAddresses } = require('./geocoder');

async function main() {
  const results = await geocodeAddresses({
    inputFile: 'addresses.csv',
    outputFile: 'results.json',
    apiKey: 'YOUR_API_KEY',
    rateLimit: 5,
    countryCode: 'US',
    outputFormat: 'json',
    retryFailedRequests: true,
    maxRetries: 3
  });

  console.log(`Geocoded ${results.length} addresses`);
}
```

> ✅ Tip: You can pass all CLI options as object keys in programmatic usage.

## CSV Format

By default, the tool expects a CSV file where each row represents an address split into structured fields. This improves geocoding accuracy and flexibility when building queries.

### ✅ Expected Columns

Your CSV file should include the following columns (names are configurable):

```csv
Street,City,State,Country,PostalCode
123 Main St,New York,NY,USA,10001
456 Oak Ave,Los Angeles,CA,USA,90210
789 Pine Rd,Chicago,IL,USA,60601
````

Each row will be transformed into a full address string internally before sending it to the Geoapify Geocoding API.

### 🔧 Custom Column Mapping

If your CSV file uses different column names (e.g., `AddressLine1`, `ZIP`, etc.), you can customize how fields are mapped by editing the `DEFAULT_CONFIG.columnMapping` object in `geocoder.js`:

```js
columnMapping: {
  street: 'Street',
  city: 'City',
  state: 'State',
  country: 'Country',
  postalCode: 'PostalCode'
}
```

> 💡 You only need to map the columns you're using — unused fields can be omitted from both the file and config.

## Output Formats

You can choose between **JSON**, **NDJSON**, or **console output** using the `--output-format` option.

### 🗂 JSON Format

The JSON format produces a single array of results and is ideal for smaller datasets or integrations with APIs and tools expecting full structured output:

```json
[
  {
    "success": true,
    "originalAddress": "123 Main St, New York, NY, USA, 10001",
    "result": {
      "lat": 40.7128,
      "lon": -74.0060,
      "formatted": "123 Main St, New York, NY 10001, USA",
      "address_line1": "123 Main St",
      "address_line2": "New York, NY 10001",
      "city": "New York",
      "state": "New York",
      "country": "United States",
      "country_code": "us",
      "postcode": "10001"
    },
    "originalRow": {
      "Street": "123 Main St",
      "City": "New York",
      "State": "NY",
      "Country": "USA",
      "PostalCode": "10001"
    }
  }
]
````

### 📄 NDJSON Format

**NDJSON (Newline-Delimited JSON)** is the default and recommended format for large datasets. Each line represents a single geocoding result as a standalone JSON object:

```
{"success":true,"originalAddress":"123 Main St, New York, NY, USA, 10001","result":{...}}
{"success":false,"originalAddress":"Invalid Address","error":"No results found"}
```

This format is stream-friendly and works well with tools like `jq`, BigQuery, or data pipelines.

## Error Handling & Fallbacks

This tool includes robust error handling to ensure smooth execution, even with problematic input or network interruptions:

### Handled Cases

* **💡 Empty or incomplete addresses**
  Empty or poorly structured addresses are skipped automatically and logged as warnings.

* **🌐 Network errors & timeouts**
  Requests that fail due to connection issues or API unavailability are automatically retried (unless disabled).

* **📉 No geocoding results**
  If the API returns no matches for an address, it's logged with a message like `No results found` and included in the output with an error flag.

* **⏱️ Rate limiting**
  All API requests are throttled using `@geoapify/request-rate-limiter` to respect the defined RPS (default: 5/sec), preventing HTTP 429 errors.

* **⚠️ Retry logic**
  Failed requests are retried up to `--max-retries` times (default: 3). Each attempt is logged with success/failure.

* **📂 File-related errors**
  Missing or unreadable files trigger clear fatal errors with informative messages.

### Result Consistency

* The output (JSON/NDJSON) always preserves the **original row order**.
* Failed entries include the original data and error description, so nothing is lost or silently skipped.


## Sample Logs

The script logs each step of the process with timestamps and severity levels. Below are sample log messages you might see during a typical run:

```
[2025-07-14T10:00:00.000Z] INFO: Read 3 rows from addresses.csv
[2025-07-14T10:00:00.100Z] INFO: Starting geocoding of 3 valid addresses at 5 requests per second
[2025-07-14T10:00:00.300Z] INFO: ✓ Geocoded: 123 Main St, New York, NY, USA, 10001
[2025-07-14T10:00:00.500Z] INFO: ✓ Geocoded: 456 Oak Ave, Los Angeles, CA, USA, 90210
[2025-07-14T10:00:00.700Z] WARNING: ✗ Failed: Invalid Address - No results found
[2025-07-14T10:00:00.800Z] INFO: Retry attempt 1/3: 1 failed requests...
[2025-07-14T10:00:01.100Z] WARNING: ✗ Retry failed: Invalid Address - No results found
[2025-07-14T10:00:01.300Z] INFO: Geocoding complete: 2 successful, 1 failed
[2025-07-14T10:00:01.400Z] INFO: Results written to results.ndjson
```

### Log Levels

* `INFO`: Normal operation — progress updates, success messages.
* `WARNING`: Non-critical issues — failed geocoding, empty input rows, retries.
* `ERROR`: Fatal problems that stop execution — missing files, invalid input, network failures beyond retry.


## API Access Requirements

To use this tool, you'll need a valid [Geoapify API key](https://myprojects.geoapify.com):

### ✅ Requirements

* **Geoapify API Key** – Required for authenticating requests.
  * Get a free key from [geoapify.com](https://www.geoapify.com)
* **Rate limits**:
  * **Free plan**: 5 requests/second (soft limit), up to 3,000 requests/day
  * Use the `--rate-limit` flag to control request frequency
* **Node.js**:
  * Requires **Node.js v18+** for `fetch()` support out of the box

### 🔒 Best Practices

* Do **not hardcode** your API key in public repositories.
* Use `.env` or pass `--api-key` via CLI arguments.
* If you're approaching daily limits, consider batching across time or upgrading your plan.