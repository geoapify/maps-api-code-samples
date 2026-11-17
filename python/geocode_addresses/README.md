# Geocode a List of Addresses in Python

## Objective
Turn a text file of addresses into coordinates with the [Geoapify Geocoding API](https://apidocs.geoapify.com/docs/geocoding/forward-geocoding/). The script sends one request per address, at 5 requests per second, and saves one result per line in an NDJSON file.

The flow: **address list → Geocoding API → NDJSON**. To put the results on a map, pass the file to the [show-addresses-on-a-map](../show-addresses-on-a-map) sample.

## Requirements
- Python 3.9 or higher (tested on 3.11 and 3.14)
- pip
- A Geoapify API key: register on [Geoapify MyProjects](https://myprojects.geoapify.com/), create a project and copy its API key. The Free plan includes 3,000 credits per day.

## Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/geoapify/maps-api-code-samples.git
cd maps-api-code-samples/python/geocode_addresses
```

### 2. Create a Virtual Environment (Optional)
```bash
python -m venv env  # or python3 -m venv env
source env/bin/activate  # On Windows: env\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

## Running the Example

The repository includes `input_example.txt`, a list of six museums in New York:

```txt
American Museum of Natural History, 200 Central Park West, New York, NY 10024, USA
The Museum of Modern Art, 11 W 53rd St, New York, NY 10019, USA
Whitney Museum of American Art, 99 Gansevoort St, New York, NY 10014, USA
Solomon R. Guggenheim Museum, 1071 5th Ave, New York, NY 10128, USA
Brooklyn Museum, 200 Eastern Pkwy, Brooklyn, NY 11238, USA
Tenement Museum, 103 Orchard St, New York, NY 10002, USA
```

Run the script:

```bash
python geocode_addresses.py --api_key YOUR_API_KEY --input input_example.txt --output output.ndjson --country_code us
```

It writes six lines to `output.ndjson`, in the same order as the input file.

## Command-Line Arguments
| Argument         | Required | Description |
|------------------|----------|-------------|
| `--api_key`      | Yes      | Geoapify API key |
| `--input`        | Yes      | Text file with one address per line; blank lines are skipped |
| `--output`       | Yes      | Output NDJSON file |
| `--country_code` | No       | Limit results to one country, for example `us`, `de` or `fr`. Use the code of the country your addresses are in: with `gb`, the New York list above matches places in the United Kingdom with confidence 0. |

## Credits
One address is one Geocoding API request, and [one request costs 1 credit](https://apidocs.geoapify.com/docs/geocoding/forward-geocoding/#pricing). The example uses 6 credits. The Free plan includes 3,000 credits per day.

For long lists, the [Batch Geocoding API](https://www.geoapify.com/solutions/batch-geocoding-requests/) can save up to 50% of the cost.

## Output Format (NDJSON)
Each line is one JSON object: the first result of the [Geocoding API response](https://apidocs.geoapify.com/docs/geocoding/forward-geocoding/). This is the Whitney Museum line, shortened and formatted for reading:

```json
{
  "name": "Whitney Museum of American Art",
  "housenumber": "99",
  "street": "Gansevoort Street",
  "city": "New York",
  "state_code": "NY",
  "postcode": "10014",
  "country_code": "us",
  "lon": -74.008921,
  "lat": 40.7396451,
  "result_type": "amenity",
  "formatted": "Whitney Museum of American Art, 99 Gansevoort Street, New York, NY 10014, United States of America",
  "rank": {
    "confidence": 1,
    "match_type": "full_match"
  },
  "datasource": {
    "sourcename": "openstreetmap",
    "attribution": "© OpenStreetMap contributors",
    "license": "Open Database License"
  }
}
```

Addresses that fail keep their place in the file, with the input address and the reason:

```json
{"address": "zzzqqqxxx yyyvvv kkkjjj", "error": "Not found"}
{"address": "The Museum of Modern Art, 11 W 53rd St, New York, NY 10019, USA", "error": "HTTP 401"}
```

### Check the confidence
`rank.confidence` goes from 0 to 1. We recommend treating 0.8 and above as a good match and reviewing anything lower. You decide the threshold that fits your data. In this example:

| Address | `confidence` | `match_type` |
|---------|--------------|--------------|
| Whitney Museum of American Art | 1 | `full_match` |
| The Museum of Modern Art | 0.9 | `full_match` |
| Solomon R. Guggenheim Museum | 0.9 | `match_by_building` |
| Tenement Museum | 0.729 | `full_match` |

## Code Explanation

### 1. Geocoding one address
`geocode_address()` sends a `GET` request with the address in `text`, asks for one result, and adds the country filter when you set one:

```python
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
```

### 2. Processing the list
`geocode_addresses()` splits the list into batches of `REQUESTS_PER_SECOND` addresses and starts one batch per second. Results are collected in input order. To change the speed, edit `REQUESTS_PER_SECOND` to match your [pricing plan](https://www.geoapify.com/pricing/).

```python
batches = [addresses[i:i + REQUESTS_PER_SECOND] for i in range(0, len(addresses), REQUESTS_PER_SECOND)]

tasks = []
with ThreadPoolExecutor(max_workers=10) as executor:
    for batch in batches:
        logger.info(batch)
        tasks.extend([executor.submit(geocode_address, address, api_key, country_code) for address in batch])
        sleep(1)
wait(tasks, return_when=ALL_COMPLETED)
results = [task.result() for task in tasks]
```

### 3. The API call
This is the request the script sends for one address:

```
https://api.geoapify.com/v1/geocode/search?text=Whitney%20Museum%20of%20American%20Art%2C%2099%20Gansevoort%20St%2C%20New%20York%2C%20NY%2010014%2C%20USA&format=json&limit=1&filter=countrycode:us&apiKey=YOUR_API_KEY
```

## Error Handling
- **Missing arguments:** the script stops and prints which ones are required.
- **API errors**, such as an invalid key (401): the status and the response body go to the log, and the line in the output file says `HTTP 401`.
- **Network errors and timeouts** (10 seconds per request): the exception type goes to the log and to the output file. The API key is never logged.
- **No match:** the line says `Not found`.

One failed address doesn't stop the others.

## Attribution
The results come from OpenStreetMap and other open data, and each result names its source in `datasource`. When you store or show the results, keep the attribution: "© OpenStreetMap contributors" as a minimum, plus "Powered by Geoapify" on the Free plan.

## Related
- [Python Geocoding Tutorial: From Address List to Saved Results](https://www.geoapify.com/tutorial/geocoding-python/)
- [show-addresses-on-a-map](../show-addresses-on-a-map): put the NDJSON file on a map; it skips failed lines
- [Geocoding API documentation](https://apidocs.geoapify.com/docs/geocoding/forward-geocoding/)
- [Batch Geocoding API](https://www.geoapify.com/solutions/batch-geocoding-requests/)

## License
MIT License
