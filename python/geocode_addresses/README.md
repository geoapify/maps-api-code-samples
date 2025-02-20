# **Python Batch Geocode Addresses Example**

This project demonstrates how to use the [Geoapify Geocoding API](https://www.geoapify.com/geocoding-api/) to geocode addresses from an input file and save the results in NDJSON format.


## **Features**
- Uses Geoapify's Geocoding API to retrieve latitude/longitude for addresses.
- Supports batch processing of addresses from an input file.
- Implements rate limiting (5 requests per second) to comply with API restrictions.
- Supports country code filtering to improve geocoding accuracy.
- Saves results in NDJSON format.

## **Requirements**

Ensure you have the following installed:

1. Python 3.11 or higher
2. pip (Python package manager)

## **Setup Instructions**

### 1. Clone the Repository

```bash
git clone https://geoapify.github.io/maps-api-code-samples/
cd maps-api-code-samples/python/
```

### 2. Create a Virtual Environment (Optional)

It’s recommended to use a virtual environment to avoid dependency conflicts:

```bash
python -m venv env # or python3 -m venv env
source env/bin/activate  # On Windows: env\Scripts\activate
```

### 3. Install Dependencies

Install the required Python libraries using pip:

```bash
pip install requests
```

You can copy the **"Example Geocoding API Call"** section from here:

## Example Input File (Museums in New York)

Below is a sample list of museum addresses in New York that can be used as input (saved, for example, as `input.txt`):

```txt
The Metropolitan Museum of Art, 1000 5th Ave, New York, NY 10028, USA
American Museum of Natural History, Central Park West & 79th St, New York, NY 10024, USA
The Museum of Modern Art, 11 W 53rd St, New York, NY 10019, USA
Whitney Museum of American Art, 99 Gansevoort St, New York, NY 10014, USA
Solomon R. Guggenheim Museum, 1071 5th Ave, New York, NY 10128, USA
Brooklyn Museum, 200 Eastern Pkwy, Brooklyn, NY 11238, USA
```


## **Running the Example**

Run the script to generate an output file:

```bash
cd geocode_addresses
python geocode_addresses.py --api_key 27a3c5f9a6754da28283d1995edb9467 --input input.txt --output output.ndjson --country_code gb
```

### **Command-line Arguments**
- `--api_key` (required): Geoapify API key.
- `--input` (required): Input filename (e.g., `input.txt`).
- `--output` (required): Output filename (e.g., `output.ndjson`).
- `--country_code` (optional): Restrict geocoding results to a specific country (e.g., `us`, `de`, `fr`).



## **Code Explanation**

### **1. Geocoding Addresses**
The `geocode_address` function sends a request to the Geoapify API to retrieve location details for a given address.

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

    response = requests.get(GEOAPIFY_API_URL, params=params)
    if response.status_code == 200:
        data = response.json()
        return data['results'][0] if data['results'] else {"error": "Not found"}
    return {}
```

### **2. Processing Multiple Addresses**
The `geocode_addresses` function reads addresses from an input file and processes them in batches to respect the rate limit.

```python
def geocode_addresses(api_key, input_file, output_file, country_code):
    with open(input_file, 'r') as f:
        addresses = f.read().strip().splitlines()

    addresses = list(it.batched(addresses, REQUESTS_PER_SECOND))
    tasks = []
    with ThreadPoolExecutor(max_workers=10) as executor:
        for batch in addresses:
            tasks.extend([executor.submit(geocode_address, address, api_key, country_code) for address in batch])
            sleep(1)
    
    wait(tasks, return_when=ALL_COMPLETED)
    results = [task.result() for task in tasks]

    with open(output_file, 'w') as f:
        for result in results:
            f.write(json.dumps(result) + '\n')
```

### **3. Command-Line Argument Handling**
The `main` function sets up argument parsing for user input.

```python
def main():
    parser = argparse.ArgumentParser(description='Geocode addresses using Geoapify API.')
    parser.add_argument('--api_key', type=str, required=True, help='API Key for Geoapify')
    parser.add_argument('--input', type=str, required=True, help='Input file containing addresses')
    parser.add_argument('--output', type=str, required=True, help='Output file for NDJSON results')
    parser.add_argument('--country_code', type=str, help='Optional country code to improve accuracy')
    
    args = parser.parse_args()
    geocode_addresses(args.api_key, args.input, args.output, args.country_code)

if __name__ == "__main__":
    main()
```



## **Output**
- The script generates an NDJSON (`.ndjson`) file with geocoding results.
- Each line in the file is a JSON object containing location data.
- If an address is not found, an error message is logged.



## **Example Geocoding API Call**

The script sends a `GET` request to the Geoapify Geocoding API using the following format:

```
https://api.geoapify.com/v1/geocode/search?text={ADDRESS}&format=json&limit=1&apiKey={API_KEY}
```

### **Notes**

- Replace `{ADDRESS}` with the desired address (spaces replaced with `+`).
- Replace `{API_KEY}` with your valid Geoapify API key.
- Use `format=json` to get the response in JSON format.
- Use `limit=1` to get only one result.

### **Example Request**

To geocode "The Metropolitan Museum of Art, 1000 5th Ave, New York, NY 10028, USA":

```
https://api.geoapify.com/v1/geocode/search?text=The%20Metropolitan%20Museum%20of%20Art%2C%201000%205th%20Ave%2C%20New%20York%2C%20NY%2010028%2C%20USA&format=json&limit=1&apiKey=YOUR_API_KEY
```

### **Example Response (JSON)**

```json
{
  "results": [
    {
      "datasource": {
        "sourcename": "openstreetmap",
        "attribution": "© OpenStreetMap contributors",
        "license": "Open Database License",
        "url": "https://www.openstreetmap.org/copyright"
      },
      "name": "The Metropolitan Museum of Art",
      "country": "United States",
      "country_code": "us",
      "state": "New York",
      "county": "New York County",
      "city": "New York",
      "postcode": "10035",
      "suburb": "Manhattan",
      "quarter": "Upper East Side",
      "street": "5th Avenue",
      "housenumber": "1000",
      "lon": -73.96338248033601,
      "lat": 40.7794396,
      "state_code": "NY",
      "result_type": "amenity",
      "formatted": "The Metropolitan Museum of Art, 1000 5th Avenue, New York, NY 10035, United States of America",
      "address_line1": "The Metropolitan Museum of Art",
      "address_line2": "1000 5th Avenue, New York, NY 10035, United States of America",
      "category": "entertainment.museum",
      "timezone": {
        "name": "America/New_York",
        "offset_STD": "-05:00",
        "offset_STD_seconds": -18000,
        "offset_DST": "-04:00",
        "offset_DST_seconds": -14400,
        "abbreviation_STD": "EST",
        "abbreviation_DST": "EDT"
      },
      "plus_code": "87G8Q2HP+QJ",
      "plus_code_short": "Q2HP+QJ New York, New York County, United States",
      "rank": {
        "importance": 0.929706212260086,
        "popularity": 8.125651845013953,
        "confidence": 1,
        "confidence_city_level": 1,
        "confidence_street_level": 1,
        "confidence_building_level": 1,
        "match_type": "full_match"
      },
      "place_id": "5148a5fd0ea87d52c0598a9a43adc4634440f00101f901ce70380000000000c0020192031e546865204d6574726f706f6c6974616e204d757365756d206f6620417274",
      "bbox": {
        "lon1": -73.9651438,
        "lat1": 40.7778736,
        "lon2": -73.9616917,
        "lat2": 40.78092
      }
    }
  ],
  "query": {
    "text": "The Metropolitan Museum of Art, 1000 5th Ave, New York, NY 10028, USA",
    "parsed": {
      "house": "the metropolitan museum of art",
      "housenumber": "1000",
      "street": "5th ave",
      "postcode": "10028",
      "city": "new york",
      "state": "ny",
      "country": "usa",
      "expected_type": "amenity"
    }
  }
}
```



## **Error Handling**
- Handles HTTP errors, including invalid API keys and server failures.
- Logs warnings when an address cannot be geocoded.
- Ensures the program does not crash due to individual request failures.

## **Notes**
- Ensure that you have a valid [Geoapify API key](https://www.geoapify.com/) before running the script.
- The API supports different country filters to improve geocoding accuracy.

## **License**
This project is licensed under the MIT License.

