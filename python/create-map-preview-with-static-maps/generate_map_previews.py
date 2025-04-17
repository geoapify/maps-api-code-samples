import argparse
import asyncio
import itertools
import logging
import os

import aiofiles
from aiohttp import ClientSession
from aiohttp.client_exceptions import ClientError

# Constants
GEOAPIFY_STATIC_MAP_API_URL = "https://maps.geoapify.com/v1/staticmap"
REQUESTS_PER_SECOND = 5
RETRY_ATTEMPTS = 3

logging.basicConfig(level='INFO')
logger = logging.getLogger(__name__)

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


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate map previews using Geoapify Static Maps API.")
    parser.add_argument('--api_key', required=True, help="Geoapify API key.")
    parser.add_argument('--input', required=True, help="Input filename (e.g., coordinates.txt).")
    parser.add_argument('--output', required=True, help="Output directory for saving images.")
    parser.add_argument('--zoom', type=int, default=15, help="Map zoom level.")
    parser.add_argument('--size', default="512x512", help="Image size (e.g., 512x512).")
    parser.add_argument('--style', default="osm-bright", help="Map style (e.g., osm-bright, dark-matter).")
    parser.add_argument('--order', default="latlon", choices=["latlon", "lonlat"],
                        help="Coordinate order (latlon or lonlat).")

    args = parser.parse_args()

    asyncio.run(main(args.api_key, args.input, args.output, args.zoom, args.size, args.style, args.order))
