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


def geocode_addresses(api_key, addresses, output_file, country_code):
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


def generate_validation_report(addresses, geocode_results, min_confirmed, max_not_confirmed, output):
    # write csv with validation results
    with open(output, 'w', newline='') as f:
        fieldnames = ['Original Address', 'Validation Result', 'Reason']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

        for address, result in zip(addresses, geocode_results):
            stats = validate_address_geocoding(result, min_confirmed, max_not_confirmed)
            writer.writerow({'Original Address': address,
                             'Validation Result': stats[0],
                             'Reason': stats[1]})


def validate_address_geocoding(geocode_result, min_confirmed, max_not_confirmed):
    # Set Not confirmed for result with errors
    if not geocode_result or geocode_result.get('error') == 'Not found':
        return 'NOT_CONFIRMED', 'No geocoding result'

    rank = geocode_result.get('rank', {})

    # Retrieve ranks and fallback to 0 if not exists
    confidence = rank.get('confidence', 0)
    confidence_city = rank.get('confidence_city_level', 0)
    confidence_street = rank.get('confidence_street_level', 0)
    confidence_building = rank.get('confidence_building_level', 0)

    if confidence >= min_confirmed:
        return 'CONFIRMED', ''
    elif confidence <= max_not_confirmed:
        return 'NOT_CONFIRMED', ''

    # Define reason for Partially Confirmed rank
    for level, l_confidence in zip(['CITY', 'STREET', 'BUILDING'],
                                   [confidence_city, confidence_street, confidence_building]):
        if l_confidence == 0:
            reason = f'{level}_NOT_CONFIRMED'
        elif l_confidence <= max_not_confirmed:
            reason = f'LOW_{level}_LEVEL_CONFIDENCE'
        elif l_confidence <= min_confirmed:
            reason = f'{level}_LEVEL_DOUBTS'
        else:
            continue
        return 'PARTIALLY_CONFIRMED', reason

    return 'PARTIALLY_CONFIRMED', 'Unknown'


def main():
    # Argument parsing
    parser = argparse.ArgumentParser(description='Geocode addresses using Geoapify API.')
    parser.add_argument('--api_key', type=str, help='API Key for Geoapify')
    parser.add_argument('--input', type=str, help='Input file containing addresses')
    parser.add_argument('--output', type=str, help='Output file for NDJSON results')
    parser.add_argument('--country_code', type=str, help='Optional country code to improve accuracy')
    parser.add_argument('--validation_output', required=True, help='Output CSV file for validation results')
    parser.add_argument('--min_confirmed', type=float, default=0.9, help='Minimum confidence for CONFIRMED')
    parser.add_argument('--max_not_confirmed', type=float, default=0.5, help='Maximum confidence for NOT_CONFIRMED')

    args = parser.parse_args()

    with open(args.input, 'r') as f:
        addresses = f.read().strip().splitlines()

    results = geocode_addresses(args.api_key, addresses, args.output, args.country_code)
    with open(args.output, 'w') as f:
        for result in results:
            f.write(json.dumps(result) + '\n')

    generate_validation_report(addresses, results, args.min_confirmed, args.max_not_confirmed, args.validation_output)


if __name__ == "__main__":
    main()