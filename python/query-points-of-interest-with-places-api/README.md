# Geoapify Places API Python Example: Fetch Points of Interest by Bounding Box

This Python tutorial shows how to fetch points of interest (POIs) with the **[Geoapify Places API](https://www.geoapify.com/places-api/)** within a specified bounding box. Use it to download POI data by category, split large search areas into smaller grid cells, handle paginated Places API responses, remove duplicate places, and export the results as **NDJSON**.

## Features

- **Bounding box search:** Queries points of interest inside a user-defined geographic area
- **Flexible filters:** Accepts place categories, grid size, output path, and API key via CLI
- **Grid splitting:** Splits large bounding boxes into smaller cells to avoid incomplete results from broad API queries
- **Pagination support:** Handles pagination for each grid cell to collect more than one page of Places API results
- **Controlled request batches:** Starts grid-cell requests in controlled batches to avoid sending every request at once
- **Deduplicated results:** Removes duplicate places that may appear near grid cell boundaries
- **NDJSON output:** Saves results as newline-delimited JSON (`.ndjson`) for easy streaming and processing
- **Funny progress animation:** Optionally displays ASCII rain progress while grid cells are processed
- **Failure handling:** Retries transient request failures and skips cells that still fail

Splitting matters because a large bounding box can contain more places than one API query can reliably return, even with pagination. Smaller grid cells keep each request focused, reduce the chance of hitting result limits for dense areas, and make it easier to retry or skip only the part of the area that failed.

## What This Example Does

This sample builds a command-line POI downloader for the Geoapify Places API:

- Fetches places inside a bounding box using the Places API `rect` filter
- Searches by one or more Places API categories, such as restaurants, cafes, hotels, or shops
- Splits larger bounding boxes into smaller grid cells for more complete results
- Paginates through up to `200` results per request with `limit` and `offset`
- Retries temporary failures and skips cells that still fail
- Deduplicates places by `place_id`
- Writes one place per line to an `.ndjson` file

## Table of Contents

- [Requirements](#requirements)
- [Setup Instructions](#setup-instructions)
- [Running the Example](#running-the-example)
- [Command-Line Arguments](#command-line-arguments)
- [How the Script Works](#how-the-script-works)
- [Common Issues](#common-issues)
- [Useful Links](#useful-links)

## Requirements

- Python 3.12 or higher. The script uses `itertools.batched`, which was added in Python 3.12.
- A Geoapify API key. You can create one in the [Geoapify dashboard](https://myprojects.geoapify.com/).
- `pip` for installing the `aiohttp` dependency.

You can get a free Geoapify API key by registering for a Geoapify account. No credit card is required to start, and the free tier is suitable for testing this example with small bounding boxes. Check the [pricing page](https://www.geoapify.com/pricing/) for current limits.

## Setup Instructions

### 1. Clone the repository
```bash
git clone https://github.com/geoapify/maps-api-code-samples.git
cd maps-api-code-samples/python/query-points-of-interest-with-places-api
```

### 2. Create and activate a virtual environment
```bash
python3 -m venv .venv
source .venv/bin/activate
```

On Windows, activate the environment with:
```bash
.venv\Scripts\activate
```

Using a virtual environment is recommended, especially with Homebrew-managed Python on macOS, where global `pip install` commands may be blocked by the externally managed environment policy.

### 3. Install dependencies
```bash
python -m pip install aiohttp
```

### 4. Verify the installation
```bash
python --version
python -m pip show aiohttp
```

## Running the Example

Run the script from the `python/query-points-of-interest-with-places-api` directory after activating your virtual environment.

### Quick test

This command searches for restaurants in a small area of central London and writes the result to `restaurants.ndjson`:

```bash
python fetch_places.py \
  --api_key YOUR_API_KEY \
  --bbox -0.15 51.50 -0.14 51.51 \
  --categories "catering.restaurant" \
  --grid_size 1 \
  --output restaurants.ndjson
```

The `--bbox` argument uses this order:

```text
min_lon min_lat max_lon max_lat
```

For example, `-0.15 51.50 -0.14 51.51` covers a small rectangle in London. Start with a small bounding box when testing so the script finishes quickly and uses fewer API calls.

### Fetch multiple categories

Use a comma-separated category list to fetch more than one type of place:

```bash
python fetch_places.py \
  --api_key YOUR_API_KEY \
  --bbox -0.15 51.50 0.10 51.55 \
  --categories "catering.restaurant,catering.cafe" \
  --grid_size 2 \
  --output london-pois.ndjson
```

### Show rain progress

Add `--rain` to display row-by-row ASCII progress while grid cells are processed:

```bash
python fetch_places.py \
  --api_key YOUR_API_KEY \
  --bbox -0.15 51.50 0.10 51.55 \
  --categories "catering.restaurant" \
  --grid_size 1 \
  --output london-restaurants.ndjson \
  --rain
```

### Inspect the output

The script writes one place per line in NDJSON format. You can check how many places were saved and preview the first records:

```bash
wc -l restaurants.ndjson
head restaurants.ndjson
```

## Command-Line Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `--api_key` | Yes | - | Your Geoapify API key. |
| `--bbox` | Yes | - | Bounding box in the order `min_lon min_lat max_lon max_lat`. Longitude must be between `-180` and `180`; latitude must be between `-90` and `90`. |
| `--categories` | Yes | - | Comma-separated Places API categories, for example `catering.restaurant,catering.cafe`. |
| `--grid_size` | No | `5.0` | Maximum grid cell size in kilometers. Must be greater than `0` and no more than `5`. Smaller values create more API requests but reduce the chance of incomplete results in dense areas. |
| `--output` | No | `output.ndjson` | Path to the NDJSON output file. Existing files with the same name are overwritten. |
| `--rain` | No | Disabled | Draw row-by-row ASCII rain progress while grid cells are processed. |

Use category names from the [Places API category list](https://apidocs.geoapify.com/docs/places/#categories). Multiple categories should be passed as one quoted comma-separated value.

## How the Script Works

The script follows this flow:

1. **Parse and validate CLI input.** It reads the API key, bounding box, categories, grid size, output path, and optional rain progress flag. The bounding box and grid size are validated before any API requests are sent.
2. **Split the bounding box into grid cells.** The script converts the requested grid size from kilometers to approximate latitude and longitude degrees, then creates smaller rectangular cells that cover the full input area.
3. **Fetch places for each grid cell.** Each cell is sent to the Geoapify Places API with a `rect:` filter. Requests are processed in rate-limited batches so the script does not start too many API calls at once.
4. **Handle pagination.** For each grid cell, the script requests up to `200` places at a time and increases the `offset` until the API returns fewer than `200` results.
5. **Retry transient failures.** Temporary network errors, timeouts, rate-limit responses, and server errors are retried before the script skips the failed request.
6. **Deduplicate and write results.** Places are written to the output file as NDJSON. When a place has a `place_id`, the script uses it to avoid writing duplicates from neighboring grid cells.
7. **Show optional progress.** When `--rain` is enabled, the script prints an ASCII rain row each time a grid cell finishes.

### Grid Splitting Strategy

The script does not send one large Places API request for the entire bounding box. Instead, it splits the area into smaller rectangular grid cells and queries each cell separately.

This matters because dense urban areas can contain many more places than a single broad query can return reliably. Smaller cells keep each request focused, make pagination more predictable, and reduce the chance of missing places in high-density areas.

The `--grid_size` argument controls the maximum cell size in kilometers:

- A **larger grid size** creates fewer cells and fewer API requests, but each request covers a broader area.
- A **smaller grid size** creates more cells and more API requests, but each request is more focused and better suited for dense areas.
- The script limits `--grid_size` to `5` kilometers to keep each cell reasonably small.

The grid calculation uses approximate conversions:

- `1` degree of latitude is about `111` km.
- `1` degree of longitude is about `111 km * cos(latitude)`.

This approximation is accurate enough for small and medium-sized bounding boxes, especially for city-scale POI searches.

The grid is created in the `calculate_grid()` function:

```python
def calculate_grid(bbox, grid_size):
    if grid_size <= 0:
        raise ValueError('grid_size must be greater than 0')

    min_lon, min_lat, max_lon, max_lat = validate_bbox(bbox)
    lon_diff = max_lon - min_lon
    lat_diff = max_lat - min_lat
    num_lon_cells = math.ceil(lon_diff / (grid_size / 111 * math.cos(
        math.radians((min_lat + max_lat) / 2))))
    num_lat_cells = math.ceil(lat_diff / (grid_size / 111))

    lon_step = lon_diff / num_lon_cells
    lat_step = lat_diff / num_lat_cells
    grid_cells = []
    for i in range(num_lon_cells):
        for j in range(num_lat_cells):
            cell_min_lon = min_lon + i * lon_step
            cell_max_lon = cell_min_lon + lon_step
            cell_min_lat = min_lat + j * lat_step
            cell_max_lat = cell_min_lat + lat_step
            grid_cells.append((round(cell_min_lon, 6),
                               round(cell_min_lat, 6),
                               round(cell_max_lon, 6),
                               round(cell_max_lat, 6)))
    return grid_cells
```

### Places API Request

Each grid cell is queried with the [Geoapify Places API](https://www.geoapify.com/places-api/) endpoint. You can also explore request parameters in the [API Playground](https://apidocs.geoapify.com/playground/places/):

```text
https://api.geoapify.com/v2/places
```

The script sends the bounding box as a rectangular filter:

```text
filter=rect:min_lon,min_lat,max_lon,max_lat
```

It also passes the selected categories, result limit, pagination offset, and API key as query parameters.

```python
async def fetch_places(session, api_key, categories, bbox, offset=0):
    params = {
        'categories': categories,
        'filter': f'rect:{bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]}',
        'limit': MAX_RESULTS_PER_REQUEST,
        'offset': offset,
        'apiKey': api_key
    }
    ...
```

#### Example API Call

For example, a Places API request for restaurants in a bounding box looks like this:

```text
https://api.geoapify.com/v2/places?categories=catering.restaurant&filter=rect:-0.15,51.50,0.10,51.55&limit=200&offset=0&apiKey=YOUR_API_KEY
```

The API response is GeoJSON. The script reads the `features` array and later writes each feature's `properties` object to the NDJSON output file.

### Pagination, Rate Limits, and Retries

The script is designed to work with larger result sets without sending all requests at once. It combines pagination, batched concurrency, request timeouts, and retries.

#### Pagination

The Places API request uses `limit` and `offset`. Each request returns up to `MAX_RESULTS_PER_REQUEST` places. If a response contains exactly that many features, the script increases the offset and requests the next page for the same grid cell.

```python
async def process_grid_cell(session, api_key, categories, bbox):
    offset = 0
    places = []
    while True:
        data = await fetch_places(session, api_key, categories, bbox, offset)
        if not data:
            logger.error(f'Aborting grid {bbox}, offset {offset}: request failed')
            break
        if 'features' not in data:
            logger.error(f'Aborting grid {bbox}, offset {offset}: invalid response')
            break
        places.extend(data['features'])
        if len(data['features']) < MAX_RESULTS_PER_REQUEST:
            break
        offset += MAX_RESULTS_PER_REQUEST

    return places
```

#### Rate-limited batches

Grid cells are processed in batches controlled by `REQUESTS_PER_SECOND`. This keeps the script from starting every grid request at once.

Known limitation: pagination requests can make the real request rate slightly higher than `REQUESTS_PER_SECOND`, because each grid cell may request more than one page. The sample keeps this logic simple on purpose; Geoapify uses soft rate limits and is tolerant of small, occasional limit bursts.

This simplified snippet shows the batching idea:

```python
coros = itertools.batched((process_grid_cell(session, args.api_key, args.categories, bbox)
                           for bbox in grid_cells), REQUESTS_PER_SECOND)
for batch in coros:
    tasks = [asyncio.create_task(coro) for coro in batch]
    for task in asyncio.as_completed(tasks):
        places = await task
        saved_count += write_places(f, places, seen_place_ids)
    await asyncio.sleep(1)
```

#### Timeouts and retries

The HTTP client uses a request timeout. The script retries temporary failures such as timeouts, rate-limit responses (`429`), and server errors (`5xx`) before skipping the failed request.

```python
timeout = ClientTimeout(total=REQUEST_TIMEOUT_SECONDS)
async with ClientSession(timeout=timeout) as session:
    ...
```

```python
for attempt in range(1, MAX_RETRIES + 1):
    try:
        async with session.get(GEOAPIFY_PLACES_API_URL, params=params) as response:
            if response.status == 200:
                return await response.json()

            error_text = await response.text()
            if (response.status == 429 or response.status >= 500) and attempt < MAX_RETRIES:
                delay = 2 ** (attempt - 1)
                logger.warning(
                    f"Request failed with status {response.status}: {error_text}. "
                    f"Retrying in {delay}s ({attempt}/{MAX_RETRIES})"
                )
                await asyncio.sleep(delay)
                continue

            logger.error(f"Request failed with status {response.status}: {error_text}")
            return None
    except (asyncio.TimeoutError, ClientError, ValueError) as exc:
        if attempt < MAX_RETRIES:
            delay = 2 ** (attempt - 1)
            logger.warning(
                f"Request failed for grid {bbox}, offset {offset}: {exc}. "
                f"Retrying in {delay}s ({attempt}/{MAX_RETRIES})"
            )
            await asyncio.sleep(delay)
            continue

        logger.error(f"Request failed for grid {bbox}, offset {offset}: {exc}")
        return None
```

### Deduplication

When a large bounding box is split into grid cells, places near cell borders may appear in more than one API response. The script removes these duplicates before writing the output file.

Deduplication is based on `properties.place_id`, which is a stable identifier returned by the Places API for many features. If a place has already been written, the script skips it when it appears again in another grid cell.

```python
def write_places(output_file, places, seen_place_ids):
    written = 0
    for place in places:
        properties = place.get("properties")
        if not properties:
            logger.warning("Skipping place without properties")
            continue

        place_id = properties.get("place_id")
        if place_id:
            if place_id in seen_place_ids:
                continue
            seen_place_ids.add(place_id)

        output_file.write(json.dumps(properties) + "\n")
        written += 1

    return written
```

Places without `properties` are skipped. Places without `place_id` are still written, because the script does not have a reliable identifier to compare them with.

### Output Format

The script writes results as **NDJSON**: newline-delimited JSON. Each line is a separate JSON object, which makes the file easy to stream, inspect, split, or import into other tools.

The Places API returns GeoJSON features, but this script writes only the `properties` object for each place:

```python
output_file.write(json.dumps(properties) + "\n")
```

#### Example Output (NDJSON)

An output file may look like this:

```json
{"name": "The Coffee House", "lat": 51.51, "lon": -0.13, "categories": ["catering.cafe"], ...}
{"name": "City Hotel", "lat": 51.52, "lon": -0.10, "categories": ["accommodation.hotel"], ...}
```

Because each place is stored on its own line, you can inspect the result with standard command-line tools:

```bash
wc -l output.ndjson
head output.ndjson
```

## Common Issues

### `ModuleNotFoundError: No module named 'aiohttp'`

Install dependencies inside your active virtual environment:

```bash
python -m pip install aiohttp
```

If you use Homebrew Python on macOS, avoid installing packages globally. Create and activate a virtual environment first.

### `AttributeError: module 'itertools' has no attribute 'batched'`

The script requires Python 3.12 or higher because it uses `itertools.batched`. Check your Python version:

```bash
python --version
```

### Invalid or missing API key

If requests fail with an authorization error, check that `--api_key` contains a valid Geoapify API key. You can create a free key in the [Geoapify dashboard](https://myprojects.geoapify.com/).

### Empty output file

An empty output file usually means no places matched the requested area and categories. Try a smaller known area or use a broader category.

### Incorrect bounding box order

The bounding box must use this order:

```text
min_lon min_lat max_lon max_lat
```

Latitude and longitude are easy to swap by mistake. For London, longitude values are around `-0.1`, while latitude values are around `51.5`.

### `Ctrl+C` interruption

The script handles `Ctrl+C` and exits cleanly with an `Interrupted by user` message.

## Useful Links

- **[Geoapify Places API](https://www.geoapify.com/places-api/):** Product overview, use cases, and high-level Places API capabilities.
- **[Places API documentation](https://apidocs.geoapify.com/docs/places/):** Request parameters, filters, response format, categories, conditions, examples, and pricing notes.
- **[Places API Playground](https://apidocs.geoapify.com/playground/places/):** Interactive tool for building and testing Places API requests.
- **[Supported Places API categories](https://apidocs.geoapify.com/docs/places/#categories):** Category keys for filtering places, such as `catering.restaurant`, `accommodation.hotel`, or `commercial.supermarket`.
- **[Supported Places API conditions](https://apidocs.geoapify.com/docs/places/#conditions):** Optional filters for attributes such as accessibility, internet access, or payment options.
- **[Geoapify dashboard](https://myprojects.geoapify.com/):** Create projects, manage API keys, and check usage.
- **[Geoapify pricing](https://www.geoapify.com/pricing/):** Free tier and paid plan details.
- **[Place Details API documentation](https://apidocs.geoapify.com/docs/place-details/):** Retrieve richer information for a place using a `place_id` returned by the Places API.

## License
MIT License
