# Address Validation with Geoapify Geocoding API

This project demonstrates how to use the [Geoapify Geocoding API](https://www.geoapify.com/geocoding-api) to geocode addresses from an input file and generate a **validation report** based on confidence levels.

It is based on the original Geocode Example but adds logic to classify addresses as `CONFIRMED`, `PARTIALLY_CONFIRMED`, or `NOT_CONFIRMED`.

## Requirements

Make sure the following are installed:

- Python 3.11 or higher
- `pip` (Python package manager)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://geoapify.github.io/maps-api-code-samples/
cd maps-api-code-samples/python/
```

### 2. (Optional) Create a Virtual Environment

```bash
python -m venv env
source env/bin/activate  # On Windows: env\Scripts\activate
```

## Running the Script

```bash
python address_verification.py \
  --api_key YOUR_API_KEY \
  --input input.txt \
  --output geocoded.ndjson \
  --validation_output address_validation.csv \
  --min_confirmed 0.85 \
  --max_not_confirmed 0.4
```

## Command-Line Arguments

| Argument              | Required | Description                                                                 |
|-----------------------|----------|-----------------------------------------------------------------------------|
| `--api_key`           | Yes      | Your [Geoapify API key](https://my.geoapify.com).                           |
| `--input`             | Yes      | Input file with one address per line.                                       |
| `--output`            | Yes      | Output file for geocoding results (NDJSON format).                          |
| `--validation_output` | Yes      | Output CSV file with validation results.                                    |
| `--country_code`      | No       | Restrict geocoding to a specific country (e.g., `us`, `de`, `fr`).          |
| `--min_confirmed`     | No       | Minimum confidence to be considered `CONFIRMED` (default: `0.9`).           |
| `--max_not_confirmed` | No       | Maximum confidence to be considered `NOT_CONFIRMED` (default: `0.5`).       |


## Validation Logic

Each geocoded result is evaluated using confidence scores provided by the API:

- `rank.confidence`
- `rank.confidence_city_level`
- `rank.confidence_street_level`
- `rank.confidence_building_level`

### Validation Categories

- `CONFIRMED` – if confidence ≥ `--min_confirmed`
- `NOT_CONFIRMED` – if confidence ≤ `--max_not_confirmed`
- `PARTIALLY_CONFIRMED` – if confidence is in between

For `PARTIALLY_CONFIRMED` cases, a **reason** is provided:

| Reason                         | Meaning                                                           |
|--------------------------------|-------------------------------------------------------------------|
| `CITY_LEVEL_DOUBTS`           | City confidence present but weak                                  |
| `LOW_CITY_LEVEL_CONFIDENCE`   | City confidence below expected threshold                          |
| `CITY_NOT_CONFIRMED`          | City not identified reliably                                      |
| `STREET_LEVEL_DOUBTS`         | Street confidence present but weak                                |
| `LOW_STREET_LEVEL_CONFIDENCE` | Street confidence below expected threshold                        |
| `STREET_NOT_CONFIRMED`        | Street not identified reliably                                    |
| `BUILDING_LEVEL_DOUBTS`       | Building confidence present but weak                              |
| `LOW_BUILDING_LEVEL_CONFIDENCE`| Building confidence below expected threshold                     |
| `BUILDING_NOT_CONFIRMED`      | Building not identified reliably                                  |

If geocoding fails, the result is `NOT_CONFIRMED` with reason: `"No geocoding result"`.

## Output Files

### NDJSON File (`geocoded.ndjson`)

- Contains raw API responses, one per line.
- Useful for debugging or reprocessing later.

### Validation Report (`address_validation.csv`)

```
Original Address,Validation Result,Reason
"1600 Amphitheatre Parkway, Mountain View, CA 94043, USA",CONFIRMED,
"Unknown Street, Nowhere",NOT_CONFIRMED,No geocoding result
"Main St, Smalltown",PARTIALLY_CONFIRMED,CITY_LEVEL_DOUBTS
"456 Example St, Springfield",PARTIALLY_CONFIRMED,LOW_STREET_LEVEL_CONFIDENCE
```

## How the Script Works

### 1. `geocode_addresses(...)`

```python
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
```

#### Purpose:
Sends batches of addresses to the Geoapify Geocoding API using multithreading and rate-limiting, then collects the results.

#### How it works:
- **Batches the addresses** into groups of 5 using [`itertools.batched()`](https://docs.python.org/3/library/itertools.html#itertools.batched), to comply with the Geoapify Free plan (5 requests/second).
- **Processes batches in parallel** using [`ThreadPoolExecutor`](https://docs.python.org/3/library/concurrent.futures.html#concurrent.futures.ThreadPoolExecutor).
- **Sleeps 1 second** between batches to stay within the rate limit.
- **Returns a list of geocoding results**, preserving the input order.

### 2. `generate_validation_report(...)`

```python
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
```

#### Purpose:
Generates a CSV validation report that labels each address as:
- `CONFIRMED`
- `PARTIALLY_CONFIRMED`
- `NOT_CONFIRMED`

…and includes the **reason** for partial or failed validation.

#### How it works:
- Opens the CSV file and sets up a header:  
  `"Original Address", "Validation Result", "Reason"`
- Iterates through all input addresses and their corresponding geocoding results.
- Calls `validate_address_geocoding(...)` to evaluate confidence levels.
- Writes one row per address with the classification and reasoning.

### 3. `validate_address_geocoding(...)`

```python
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
```

#### Purpose:
Analyzes a single geocoding result and determines the **validation status** based on confidence scores.

#### How it works:
- If the geocoding failed or no result was found → returns `'NOT_CONFIRMED'` and `'No geocoding result'`.
- Extracts the following confidence values from `rank` (if missing, falls back to `0`):
  - `rank.confidence`
  - `rank.confidence_city_level`
  - `rank.confidence_street_level`
  - `rank.confidence_building_level`
- Validation logic:
  - If `confidence >= min_confirmed` → returns `'CONFIRMED'`
  - If `confidence <= max_not_confirmed` → returns `'NOT_CONFIRMED'`
  - Otherwise → returns `'PARTIALLY_CONFIRMED'` and a **reason**, determined by the weakest of the city/street/building levels:
    - Level not present → `{LEVEL}_NOT_CONFIRMED`
    - Level ≤ max threshold → `LOW_{LEVEL}_LEVEL_CONFIDENCE`
    - Level between thresholds → `{LEVEL}_LEVEL_DOUBTS`

If no specific reason is found, it falls back to `'Unknown'`.

## Learn More

- [Geoapify Geocoding API Documentation](https://apidocs.geoapify.com/docs/geocoding/)  
- [API Playground](https://apidocs.geoapify.com/playground/geocoding/)  
- [What is Address Validation?](https://www.geoapify.com/solutions/address-lookup/)  
- [Create your free API key](https://myprojects.geoapify.com/)

## License

This project is provided for demonstration purposes under the MIT License.
