import argparse
import csv
import itertools as it
import json
import logging
from concurrent.futures import ThreadPoolExecutor, wait, ALL_COMPLETED
from time import sleep

import requests

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
REQUESTS_PER_SECOND = 5
GEOAPIFY_API_URL = "https://api.geoapify.com/v1/geocode/search"


def geocode_address(address, api_key, country_code):
    params = {
            'format': 'json',
            'text': address,
            'limit': 1,
            'apiKey': api_key
        }
    if country_code:
        params['filter'] = 'countrycode:' + country_code

    try:
        response = requests.get(GEOAPIFY_API_URL, params=params)
        if response.status_code == 200:
            data = response.json()
            if len(data['results']) > 0:
                return data['results'][0]
            else:
                return { "error":  "Not found"}
        else:
            logger.warning(f"Failed to geocode address '{address}': {response.text}")
            return {}
    except Exception as e:
        logger.error(f"Error while geocoding address '{address}': {e}")
        return {}


def geocode_addresses(api_key, addresses, country_code):
    # Split addresses into batches
    addresses = list(it.batched(addresses, REQUESTS_PER_SECOND))

    # Request results asynchronously for each address batch
    tasks = []
    with ThreadPoolExecutor(max_workers=10) as executor:
        for batch in addresses:
            logger.info(batch)
            tasks.extend([executor.submit(geocode_address, address, api_key, country_code) for address in batch])
            sleep(1)
    # Wait for results
    wait(tasks, return_when=ALL_COMPLETED)

    return [task.result() for task in tasks]


def generate_standard_addresses(output, addresses, address_format, geocode_results):
    # Write csv with standardized addresses
    with open(output, 'w', newline='') as f:
        csv_writer = csv.writer(f)
        csv_writer.writerow(["Original Address", "Standardized Address"])
        for address, result in zip(addresses, geocode_results):
            # For empty geocoding result set empty string
            if not result or result.get('error'):
                standardized_address = ''
            else:
                # Fill template with values, fallback missing data to empty string
                standardized_address = address_format.format_map(GeocodeResult(**result))
            csv_writer.writerow([address, standardized_address])


class GeocodeResult(dict):
    def __missing__(self, key):
        return ''


def main():
    # Argument parsing
    parser = argparse.ArgumentParser(description='Geocode addresses using Geoapify API.')
    parser.add_argument('--api_key', type=str, help='API Key for Geoapify')
    parser.add_argument('--input', type=str, help='Input file containing addresses')
    parser.add_argument('--output', type=str, help='Output file for NDJSON results')
    parser.add_argument('--country_code', type=str, help='Optional country code to improve accuracy')
    parser.add_argument('--format', required=True, help='Address format string using placeholders')
    parser.add_argument('--standardized_output', required=True, help='Output CSV file for standardized addresses')

    args = parser.parse_args()

    with open(args.input, 'r') as f:
        addresses = f.read().strip().splitlines()
    results = geocode_addresses(args.api_key, addresses, args.country_code)
    # Write results to NDJSON file
    with open(args.output, 'w') as f:
        for result in results:
            f.write(json.dumps(result) + '\n')
    # Write csv with standardized addresses
    generate_standard_addresses(args.standardized_output, addresses, args.format, results)


if __name__ == "__main__":
    main()