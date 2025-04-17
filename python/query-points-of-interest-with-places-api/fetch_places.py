import argparse
import asyncio
import itertools
import json
import logging
import math

from aiohttp import ClientSession

# Configure logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s-%(name)s | %(levelname)s  %(message)s')
logger = logging.getLogger(__name__)

# Constants
GEOAPIFY_PLACES_API_URL = "https://api.geoapify.com/v2/places"
MAX_RESULTS_PER_REQUEST = 200
REQUESTS_PER_SECOND = 5  # requests per second
OUTPUT_FILE = 'output.ndjson'


def parse_arguments():
    parser = argparse.ArgumentParser(description="Fetch places using Geoapify Places API.")
    parser.add_argument('--api_key', required=True, help='Geoapify API key')
    parser.add_argument('--bbox', nargs=4, required=True, help='Bounding box as min_lon,min_lat,max_lon,max_lat')
    parser.add_argument('--categories', default='', help='Comma-separated list of place categories')
    parser.add_argument('--grid_size', type=float, default=5.0, help='Maximum size of each grid cell in kilometers')
    return parser.parse_args()


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


if __name__ == '__main__':
    asyncio.run(main())
