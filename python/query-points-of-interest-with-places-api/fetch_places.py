import argparse
import asyncio
import itertools
import json
import logging
import math
import random

from aiohttp import ClientError, ClientSession, ClientTimeout

# Configure logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s-%(name)s | %(levelname)s  %(message)s')
logger = logging.getLogger(__name__)

# Constants
GEOAPIFY_PLACES_API_URL = "https://api.geoapify.com/v2/places"
MAX_RESULTS_PER_REQUEST = 200
REQUESTS_PER_SECOND = 5  # requests per second
REQUEST_TIMEOUT_SECONDS = 30
MAX_RETRIES = 3
OUTPUT_FILE = 'output.ndjson'


def parse_arguments():
    parser = argparse.ArgumentParser(description="Fetch places using Geoapify Places API.")
    parser.add_argument('--api_key', required=True, help='Geoapify API key')
    parser.add_argument('--bbox', nargs=4, required=True, help='Bounding box as min_lon,min_lat,max_lon,max_lat')
    parser.add_argument('--categories', required=True, help='Comma-separated list of place categories')
    parser.add_argument('--grid_size', type=float, default=5.0, help='Maximum size of each grid cell in kilometers')
    parser.add_argument('--output', default=OUTPUT_FILE, help=f'Output NDJSON file path (default: {OUTPUT_FILE})')
    parser.add_argument('--rain', action='store_true', help='Draw ASCII rain as grid cells are processed')
    return parser.parse_args()


def validate_bbox(bbox):
    try:
        min_lon, min_lat, max_lon, max_lat = map(float, bbox)
    except ValueError as exc:
        raise ValueError('bbox values must be numeric') from exc

    if not (-180 <= min_lon <= 180 and -180 <= max_lon <= 180):
        raise ValueError('longitude values must be between -180 and 180')
    if not (-90 <= min_lat <= 90 and -90 <= max_lat <= 90):
        raise ValueError('latitude values must be between -90 and 90')
    if min_lon >= max_lon:
        raise ValueError('bbox must satisfy min_lon < max_lon')
    if min_lat >= max_lat:
        raise ValueError('bbox must satisfy min_lat < max_lat')

    return min_lon, min_lat, max_lon, max_lat


def calculate_grid(bbox, grid_size):
    if grid_size <= 0:
        raise ValueError('grid_size must be greater than 0')

    min_lon, min_lat, max_lon, max_lat = validate_bbox(bbox)
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


async def fetch_places(session, api_key, categories, bbox, offset=0):
    params = {
        'categories': categories,
        'filter': f'rect:{bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]}',
        'limit': MAX_RESULTS_PER_REQUEST,
        'offset': offset,
        'apiKey': api_key
    }
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            async with session.get(GEOAPIFY_PLACES_API_URL, params=params) as response:
                if response.status == 200:
                    # return geojson with places
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

                # Skip on error
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

    return None


async def process_grid_cell(session, api_key, categories, bbox):
    offset = 0
    places = []
    # Fetch 200 places at once
    while True:
        data = await fetch_places(session, api_key, categories, bbox, offset)
        logger.info(f'Fetched data for grid {bbox}, offset {offset}')
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


class RainProgress:
    def __init__(self, total, width=48):
        self.total = max(total, 1)
        self.width = width
        self.completed = 0
        self.rng = random.Random(42)

    def start(self):
        print("Rain progress")
        print("cloud " + "_" * self.width)

    def mark(self, saved_count, failed=False):
        self.completed += 1
        progress = self.completed / self.total
        density = 0.12 + progress * 0.55
        row = []

        for column in range(self.width):
            if failed and column == self.width - 1:
                row.append('!')
                continue

            roll = self.rng.random()
            if roll < density * 0.10:
                row.append('|')
            elif roll < density * 0.30:
                row.append("'")
            elif roll < density:
                row.append('.')
            else:
                row.append(' ')

        print(f"{progress * 100:5.1f}% {''.join(row)} {saved_count} places")

    def finish(self, saved_count, output_path):
        print("ground " + "_" * self.width)
        print(f"Saved {saved_count} places to {output_path}")


async def main():
    args = parse_arguments()
    if args.grid_size > 5:
        logger.error('Grid size must be less or equal to 5')
        raise SystemExit(1)

    try:
        # Calculate all grids bounding
        grid_cells = calculate_grid(args.bbox, args.grid_size)
    except ValueError as exc:
        logger.error(str(exc))
        raise SystemExit(1) from exc

    saved_count = 0
    seen_place_ids = set()
    rain_progress = RainProgress(len(grid_cells)) if args.rain else None
    if rain_progress:
        logger.setLevel(logging.WARNING)
        rain_progress.start()
    else:
        logger.info('Grids calculated')

    timeout = ClientTimeout(total=REQUEST_TIMEOUT_SECONDS)
    with open(args.output, "w") as f:
        async with ClientSession(timeout=timeout) as session:
            coros = itertools.batched((process_grid_cell(session, args.api_key, args.categories, bbox)
                                       for bbox in grid_cells), REQUESTS_PER_SECOND)
            for batch in coros:
                tasks = [asyncio.create_task(coro) for coro in batch]
                for task in asyncio.as_completed(tasks):
                    try:
                        places = await task
                    except Exception as exc:
                        if rain_progress:
                            rain_progress.mark(saved_count, failed=True)
                        logger.error(f"Grid processing failed: {exc}")
                        continue
                    saved_count += write_places(f, places, seen_place_ids)
                    if rain_progress:
                        rain_progress.mark(saved_count)
                await asyncio.sleep(1)

    if rain_progress:
        rain_progress.finish(saved_count, args.output)
    else:
        logger.info(f"Saved {saved_count} places to {args.output}")


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info('Interrupted by user')
