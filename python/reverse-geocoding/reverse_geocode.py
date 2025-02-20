import requests
import itertools as it
import json
import logging
import argparse
from time import sleep
from concurrent.futures import ThreadPoolExecutor, wait, ALL_COMPLETED

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
REQUESTS_PER_SECOND = 5
GEOAPIFY_API_URL = 'https://api.geoapify.com/v1/geocode/reverse'

def reverse_geocode(api_key, lat, lon, country_filter, result_type, output_format):
    params = {
        'lat': lat,
        'lon': lon,
        'apiKey': api_key,
        'format': output_format
    }
    if country_filter:
        params['filter'] = 'countrycode:' + country_filter
    if result_type:
        params['result_type'] = result_type
    try:
        response = requests.get(GEOAPIFY_API_URL, params=params)
        if response.status_code == 200:
            data = response.json()
            if 'results' in data:
                return data['results'][0]
            elif 'features' in data:
                return data['features'][0]
            else:
                return {}
        elif response.status == 429:
            logger.warning("Rate limit exceeded. Too many requests.")
            return {}
        else:
            logger.error(f"Error: {response.status} for coordinates: ({lat}, {lon})")
            return {}
    except Exception as e:
        logger.error(f"Exception occurred: {e} for coordinates: ({lat}, {lon})")
        return {}

def main(input_file, output_file, api_key, order, country_filter, result_type, output_format):
    coordinates = []
    with open(input_file, 'r') as infile:
        coordinates = [line.strip() for line in infile.readlines()]
    # Split coordinates into batches
    coordinates = list(it.batched(coordinates, REQUESTS_PER_SECOND))

    # Request results asynchronously for each batch
    tasks = []
    with ThreadPoolExecutor(max_workers=10) as executor:
        for batch in coordinates:
            logger.info(batch)
            for coord in batch:
                if order == 'latlon':
                    lat, lon = map(float, coord.split(','))
                elif order == 'lonlat':
                    lon, lat = map(float, coord.split(','))
                tasks.append(
                    executor.submit(reverse_geocode, api_key, lat, lon, country_filter, result_type, output_format))
            sleep(1)
    # Wait for results
    wait(tasks, return_when=ALL_COMPLETED)
    results = [task.result() for task in tasks]

    # Writing results to file
    with open(output_file, 'w') as outfile:
        for result in results:
            json.dump(result, outfile)
            outfile.write('\n')

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Reverse Geocode Coordinates using Geoapify API")
    parser.add_argument("--input", type=str, help="Input file with coordinates.")
    parser.add_argument("--output", type=str, help="Output file for NDJSON results.")
    parser.add_argument("--api_key", type=str, help="Geoapify API key.")
    parser.add_argument("--order", type=str, choices=['latlon', 'lonlat'], default='latlon',
                        help="Order of coordinates: latlon or lonlat (default: latlon).")
    parser.add_argument("--country_code", type=str, default=None, help="Country filter for results.")
    parser.add_argument("--type", type=str, choices=['address', 'street', 'city', 'postcode', 'county', 'state'],
                        default='address', help="Type of result to retrieve (default: address).")
    parser.add_argument("--output_format", type=str, choices=['geojson', 'json'],
                        default='json', help="Format of result to retrieve (default: json).")

    args = parser.parse_args()
    main(args.input, args.output, args.api_key, args.order, args.country_code, args.type, args.output_format)