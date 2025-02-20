import requests
import itertools as it
import json
from time import sleep
import argparse
import logging
from concurrent.futures import ThreadPoolExecutor, wait, ALL_COMPLETED

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
            logger.warning(f"Failed to geocode address '{address}': {response_data}")
            return {}
    except Exception as e:
        logger.error(f"Error while geocoding address '{address}': {e}")
        return {}

def geocode_addresses(api_key, input_file, output_file, country_code):
    addresses = []

    with open(input_file, 'r') as f:
        addresses = f.read().strip().splitlines()
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
    results = [task.result() for task in tasks]

    # Write results to NDJSON file
    with open(output_file, 'w') as f:
        for result in results:
            f.write(json.dumps(result) + '\n')

def main():
    # Argument parsing
    parser = argparse.ArgumentParser(description='Geocode addresses using Geoapify API.')
    parser.add_argument('--api_key', type=str, help='API Key for Geoapify')
    parser.add_argument('--input', type=str, help='Input file containing addresses')
    parser.add_argument('--output', type=str, help='Output file for NDJSON results')
    parser.add_argument('--country_code', type=str, help='Optional country code to improve accuracy')

    args = parser.parse_args()

    geocode_addresses(args.api_key, args.input, args.output, args.country_code)

if __name__ == "__main__":
    main()