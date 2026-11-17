import requests
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
REQUEST_TIMEOUT_SECONDS = 10
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
        response = requests.get(GEOAPIFY_API_URL, params=params, timeout=REQUEST_TIMEOUT_SECONDS)
        if response.status_code == 200:
            data = response.json()
            if len(data['results']) > 0:
                return data['results'][0]
            else:
                return {"address": address, "error": "Not found"}
        else:
            logger.warning(f"Failed to geocode address '{address}': HTTP {response.status_code}: {response.text}")
            return {"address": address, "error": f"HTTP {response.status_code}"}
    except Exception as e:
        # Log the exception type only: the message of a connection error can contain the URL with your API key
        logger.error(f"Error while geocoding address '{address}': {type(e).__name__}")
        return {"address": address, "error": type(e).__name__}

def geocode_addresses(api_key, input_file, output_file, country_code):
    with open(input_file, 'r', encoding='utf-8') as f:
        addresses = [line.strip() for line in f if line.strip()]

    # Split addresses into batches
    batches = [addresses[i:i + REQUESTS_PER_SECOND] for i in range(0, len(addresses), REQUESTS_PER_SECOND)]

    # Request results asynchronously for each address batch
    tasks = []
    with ThreadPoolExecutor(max_workers=10) as executor:
        for batch in batches:
            logger.info(batch)
            tasks.extend([executor.submit(geocode_address, address, api_key, country_code) for address in batch])
            sleep(1)
    # Wait for results
    wait(tasks, return_when=ALL_COMPLETED)
    results = [task.result() for task in tasks]

    # Write results to NDJSON file
    with open(output_file, 'w', encoding='utf-8') as f:
        for result in results:
            f.write(json.dumps(result) + '\n')

def main():
    # Argument parsing
    parser = argparse.ArgumentParser(description='Geocode addresses using Geoapify API.')
    parser.add_argument('--api_key', type=str, required=True, help='API Key for Geoapify')
    parser.add_argument('--input', type=str, required=True, help='Input file containing addresses, one per line')
    parser.add_argument('--output', type=str, required=True, help='Output file for NDJSON results')
    parser.add_argument('--country_code', type=str, help='Optional country code to improve accuracy')

    args = parser.parse_args()

    geocode_addresses(args.api_key, args.input, args.output, args.country_code)

if __name__ == "__main__":
    main()
