# Map Previews Example using Geoapify Static Maps API

## Description
This project demonstrates how to generate **map previews** for a list of coordinates using the **[Geoapify Static Maps API](https://www.geoapify.com/static-maps-api/)**. The script reads coordinates from an input file and generates `.png` image previews with markers on each location.

![Map Previews](https://github.com/geoapify/maps-api-code-samples/blob/main/python/create-map-preview-with-static-maps/collage_map_landmarks_with_separators.png?raw=true)

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
pip install aiohttp aiofiles
```

## Running the Example
```bash
cd create-map-preview-with-static-maps

python generate_map_previews.py \
  --api_key=YOUR_API_KEY \
  --input coordinates.txt \
  --output maps \
  --zoom 15 \
  --style osm-bright \
  --size 600x600 \
  --order latlon
```

## Command-Line Arguments
| Argument       | Required | Description |
|----------------|----------|-------------|
| `--api_key`    | Yes      | Geoapify API key |
| `--input`      | Yes      | Input file with coordinates (`lat,lon` or `lon,lat` per line) |
| `--output`     | Yes      | Output directory for saving map previews |
| `--zoom`       | No       | Map zoom level (default: `15`) |
| `--size`       | No       | Image size in pixels (default: `512x512`) |
| `--style`      | No       | Map style (`osm-bright`, `dark-matter`, etc.) |
| `--order`      | No       | Coordinate order: `latlon` (default) or `lonlat` |

## Features
- Batch generation of map previews for input coordinates
- PNG images with marker overlays
- Filename format: `{index}_{lat}_{lon}.png`
- Built-in rate limiting (5 RPS) using asyncio and aiohttp
- Retry mechanism for failed requests (up to 3 attempts)
- Skips and logs invalid lines


## Geoapify Static Maps API Endpoint Example
```text
https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=512&height=512&zoom=15&marker=lonlat:-122.34,47.62;type:awesome;color:%23ff4040;size:large&apiKey=YOUR_API_KEY
```

## Example Input File
```
48.858844,2.294351
40.748817,-73.985428
51.500729,-0.124625
```

### Output Files
```
1_48.858844_2.294351.png
2_40.748817_-73.985428.png
3_51.500729_-0.124625.png
```

## Deliverable
A Python script that:
- Reads coordinate pairs from a file
- Requests map previews from Geoapify
- Saves images with structured filenames
- Honors Geoapify’s rate limit (5 RPS)
- Retries failed requests up to 3 times
- Provides customization via command-line arguments

## Code Breakdown

### Imports and Setup

```python
import argparse, asyncio, itertools, logging, os
import aiofiles
from aiohttp import ClientSession
from aiohttp.client_exceptions import ClientError
```

- Uses `asyncio`, `aiohttp`, and `aiofiles` for **efficient async I/O**.
- Uses `itertools.batched()` (Python 3.12+) to enforce **5 requests per second**.

### Constants

```python
GEOAPIFY_STATIC_MAP_API_URL = "https://maps.geoapify.com/v1/staticmap"
REQUESTS_PER_SECOND = 5
RETRY_ATTEMPTS = 3
```

- Limits requests to 5 RPS to comply with **Geoapify Free plan**.
- Retries each request **up to 3 times** on failure.

### `fetch_map(...)`

```python
async def fetch_map(session, api_key, lat, lon, index, output_dir, zoom, size, style):
    # Construct the request URL
    width, height = size.split('x')
    params = {
        "style": style,
        "width": width,
        "height": height,
        "zoom": zoom,
        "marker": f"lonlat:{lon},{lat};type:awesome;color:#ff4040;size:large",
        "apiKey": api_key
    }

    filename = f"{index}_{lat}_{lon}.png"
    filepath = os.path.join(output_dir, filename)

    for attempt in range(RETRY_ATTEMPTS):  # Retry up to 3 times
        try:
            async with session.get(GEOAPIFY_STATIC_MAP_API_URL, params=params) as response:
                if response.status == 200:
                    # write png to file
                    async with aiofiles.open(filepath, 'wb') as f:
                        await f.write(await response.read())
                    logger.info(f"Saved map to {filepath}")
                    return
                else:
                    logger.error(f"Failed to fetch map for {lat}, {lon} (status: {response.status})")
        except ClientError as e:
            logger.error(f"Request error for {lat}, {lon}: {e}")

        await asyncio.sleep(1)  # Wait before retrying

    logger.error(f"Skipping {lat}, {lon} after {RETRY_ATTEMPTS} failed attempts")
```

**Purpose**: Request a static map with a marker and save it as a `.png` file.

#### What it does:
- Constructs the API URL using query parameters.
- Builds the output filename:  
  `"{index}_{lat}_{lon}.png"`
- Sends an HTTP GET request using `aiohttp`.
- Writes the response content to a file using `aiofiles`.
- Retries failed requests up to `RETRY_ATTEMPTS` times.
- Logs errors and skips any location if all retries fail.

### `main(...)`

```python
async def main(api_key, input_file, output_dir, zoom, size, style, order):
    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)

    # Read coordinates from the input file
    with open(input_file, 'r') as f:
        lines = f.readlines()

    coros = []
    async with ClientSession() as session:
        # Extract coordinates with index
        for index, line in enumerate(lines, start=1):
            try:
                if order == 'latlon':
                    lat, lon = map(float, line.split(','))
                elif order == 'lonlat':
                    lon, lat = map(float, line.split(','))
                coros.append(fetch_map(session, api_key, lat, lon, index, output_dir, zoom, size, style))
            except ValueError:
                print(f"Invalid line in input file: {line.strip()}")

        # Start 5 tasks per second
        coros = itertools.batched(coros, REQUESTS_PER_SECOND)
        async with asyncio.TaskGroup() as tg:
            for batch in coros:
                for coro in batch:
                    tg.create_task(coro)
                await asyncio.sleep(1)

```

**Purpose**: Orchestrates the entire process: reads input, prepares tasks, and batches them.

#### Steps:

1. **Create output directory** (if not exists):
   ```python
   os.makedirs(output_dir, exist_ok=True)
   ```

2. **Read and parse coordinate lines**:
   ```python
   for index, line in enumerate(lines, start=1):
       ...
   ```

3. **Support coordinate order**:
   - `latlon` (default): `lat,lon`
   - `lonlat`: `lon,lat`

4. **Prepare all tasks** in a list called `coros`.

5. **Batch requests** using `itertools.batched()`:
   ```python
   coros = itertools.batched(coros, REQUESTS_PER_SECOND)
   ```

6. **Run one batch per second**:
   ```python
   async with asyncio.TaskGroup() as tg:
       for batch in coros:
           for coro in batch:
               tg.create_task(coro)
           await asyncio.sleep(1)
   ```

### Highlights

- Async + batching for **rate-limited performance**
- Automatic **retry** logic
- Clean filenames for each preview
- Easy to extend with more map styling or layers

## License
MIT License