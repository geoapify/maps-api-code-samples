# Geoapify Places API Example

## Description
This example demonstrates how to fetch places from the **Geoapify Places API** for a specified bounding box. It divides large areas into smaller grid cells (if needed), paginates results, and outputs them in **NDJSON** format.

## **Features**
- Accepts bounding box, category list, and grid size via CLI
- Splits bbox into smaller cells (5x5 km) if needed
- Fetches and paginates places from Geoapify Places API
- Saves all results to an `.ndjson` file
- Logs and skips over failed requests

## Requirements
- Python 3.11 or higher
- pip


## Setup Instructions

### 1. Clone the Repository
```bash
git clone https://geoapify.github.io/maps-api-code-samples/
cd maps-api-code-samples/python/
```

### 2. Create a Virtual Environment (Optional)
```bash
python -m venv env
source env/bin/activate  # Windows: env\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install aiohttp
```

## Running the Example
```bash
cd query-points-of-interest-with-places-api

python fetch_places.py \
  --api_key YOUR_API_KEY \
  --bbox -0.15 51.50 0.10 51.55 \
  --categories "catering.restaurant,accommodation.hotel" \
  --grid_size 4.5
```

## Command-Line Arguments
| Argument        | Required | Description |
|------------------|----------|-------------|
| `--api_key`      | Yes      | Your Geoapify API key |
| `--bbox`         | Yes      | Bounding box in format: `min_lon min_lat max_lon max_lat` |
| `--categories`   | No       | Comma-separated list of place categories |
| `--grid_size`    | No       | Grid cell size in km (default: 5, max: 5) |

## Features
- Splits large bounding boxes into smaller grid cells (≤ 5 km)
- Fetches places by category using **Geoapify Places API**
- Automatically handles **pagination** (up to 200 results per call)
- Makes **rate-limited async requests** using `aiohttp` and `asyncio`
- Logs errors without stopping the entire script
- Outputs data in **NDJSON** format


## API Reference
- [Geoapify Places API](https://www.geoapify.com/places-api/)
- [API Playground](https://apidocs.geoapify.com/playground/places/)

### Example API Call:
```
https://api.geoapify.com/v2/places?categories=catering.restaurant&filter=rect:-0.15,51.50,0.10,51.55&limit=200&offset=0&apiKey=YOUR_API_KEY
```

## Example Output (NDJSON)
```
{"name": "The Coffee House", "lat": 51.51, "lon": -0.13, "categories": ["catering.cafe"], ...}
{"name": "City Hotel", "lat": 51.52, "lon": -0.10, "categories": ["accommodation.hotel"], ...}
```

## Function-by-Function Breakdown

### `calculate_grid(bbox, grid_size)`

```python
def calculate_grid(bbox, grid_size):
    min_lon, min_lat, max_lon, max_lat = map(float, bbox)
    # Calculate the number of grid cells needed
    lon_diff = max_lon - min_lon
    lat_diff = max_lat - min_lat
    num_lon_cells = math.ceil(lon_diff / (grid_size / 111 * math.cos(
        math.radians((min_lat + max_lat) / 2))))  # Approximate conversion from km to degrees
    num_lat_cells = math.ceil(lat_diff / (grid_size / 111))

    # Generate grid cells
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

**Splits the bounding box** into smaller cells if it exceeds the specified `grid_size`.

- Uses approximations:
  - 1° latitude ≈ 111 km
  - 1° longitude ≈ 111 km × cos(latitude)
- Converts grid size from km to degrees.
- Returns a list of `(min_lon, min_lat, max_lon, max_lat)` grid cells.

### `fetch_places(session, api_key, categories, bbox, offset=0)`

```python
async def fetch_places(session, api_key, categories, bbox, offset=0):
    params = {
        'categories': categories,
        'filter': f'rect:{bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]}',
        'limit': MAX_RESULTS_PER_REQUEST,
        'offset': offset,
        'apiKey': api_key
    }
    async with session.get(GEOAPIFY_PLACES_API_URL, params=params) as response:
        if response.status == 200:
            # return geojson with places
            return await response.json()
        else:
            # Skip on error
            logger.error(f"Request failed with status {response.status}: {await response.text()}")
            return None
```

Sends a request to the **Geoapify Places API** for a single cell and offset.

- Supports pagination by using `offset`.
- Returns raw **GeoJSON** data.
- Logs and skips failed requests.


### `process_grid_cell(session, api_key, categories, bbox)`

```python
async def process_grid_cell(session, api_key, categories, bbox):
    offset = 0
    places = []
    # Fetch 200 places at once
    while True:
        data = await fetch_places(session, api_key, categories, bbox, offset)
        logger.info(f'Fetched data for grid {bbox}, offset {offset}')
        if not data or 'features' not in data:  # skip for empty or invalid data
            continue
        places.extend(data['features'])
        if len(data['features']) < MAX_RESULTS_PER_REQUEST:
            break
        offset += MAX_RESULTS_PER_REQUEST

    return places
```

Calls `fetch_places()` in a **loop** to handle **pagination**:

- Starts with `offset = 0`.
- Collects up to 200 places at a time.
- Stops when fewer than 200 places are returned.
- Returns a full list of places for that cell.

### `main()`

```python
async def main():
    args = parse_arguments()
    if args.grid_size > 5:
        logger.error('Grid size must be less or equal to 5')
        exit()
    # Calculate all grids bounding
    grid_cells = calculate_grid(args.bbox, args.grid_size)
    logger.info('Grids calculated')

    tasks = []
    async with ClientSession() as session:
        coros = itertools.batched([process_grid_cell(session, args.api_key, args.categories, bbox)
                                   for bbox in grid_cells], REQUESTS_PER_SECOND)
        async with asyncio.TaskGroup() as tg:
            for batch in coros:
                for coro in batch:
                    tasks.append(tg.create_task(coro))
                await asyncio.sleep(1)
    results  = [place for task in tasks for place in task.result()]

    with open(OUTPUT_FILE, "w") as f:
        for place in results:
            # Write ndjson with places properties
            f.write(json.dumps(place["properties"]) + "\n")
    logger.info(f"Saved {len(results)} places to {OUTPUT_FILE}")
```

The async entry point of the script.

1. Parses CLI arguments.
2. Validates `grid_size <= 5`.
3. Calls `calculate_grid()` to generate the grid.
4. Creates tasks using:
   - `itertools.batched(..., REQUESTS_PER_SECOND)` for rate limiting.
   - `asyncio.TaskGroup()` for concurrent execution.
5. Collects and flattens all place results.
6. Writes the `properties` of each place to `output.ndjson`.


### Highlights

- Fully **asynchronous** with built-in **rate limiting (5 RPS)**.
- Handles **grids + pagination** automatically.
- Fault-tolerant: skips errors but continues.
- Outputs clean, machine-readable NDJSON format.
- Modular structure is easy to reuse for other APIs or bounding boxes.

## License
MIT License
