# Standardize Addresses with Geoapify API

This project demonstrates how to batch-geocode addresses using the [Geoapify Geocoding API](https://www.geoapify.com/geocoding-api/) and produce standardized outputs in a customizable format.

The script:
- Reads addresses from a text file
- Geocodes each address using the Geoapify Forward Geocoding API
- Saves full geocoding results to an NDJSON file
- Writes a standardized address list to a CSV file using a user-defined template


## Requirements

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

### 3. Install Dependencies

```bash
pip install requests
```


## Usage

```bash
cd address-standardization

python address_standardization.py \
  --api_key YOUR_API_KEY \
  --input input_example.txt \
  --output geocoded.ndjson \
  --standardized_output standardized_addresses.csv \
  --format "{street} {housenumber}, {city}, {state_code}, {postcode}, {country}"
```


## Command-Line Arguments

| Argument                 | Required | Description                                                                 |
|--------------------------|----------|-----------------------------------------------------------------------------|
| `--api_key`              | Yes      | Your [Geoapify API key](https://myprojects.geoapify.com).                           |
| `--input`                | Yes      | Path to the input file (one address per line).                              |
| `--output`               | Yes      | Path to the output NDJSON file with full geocoding results.                 |
| `--standardized_output` | Yes      | Path to the CSV file for formatted addresses.                               |
| `--country_code`         | No       | Restrict results to a specific country (For example, `us`, `de`, `fr`, etc).             |
| `--format`               | Yes      | Template for standardized output using placeholders (see below).            |


## Address Format Placeholders

The `--format` option lets you define how addresses should be output during **address standardization in Python** using this script. You can mix any of the following placeholders:

- `{name}` – Place name
- `{housenumber}` – House/building number
- `{street}` – Street name
- `{suburb}` – Suburb or neighborhood
- `{district}` – District or borough
- `{postcode}` – Postal code
- `{city}` – City or town
- `{county}` – County or administrative division
- `{county_code}` – County code (if available)
- `{state}` – State or province
- `{state_code}` – State code (e.g., `"CA"` for California)
- `{country}` – Country name
- `{country_code}` – Country code (ISO 3166-1 alpha-2)

Missing fields will be replaced with an empty string.

Here are some ready-to-use format examples:

```bash
--format "{street} {housenumber}, {city}, {state_code}, {postcode}, {country}"
```
**Standardized Output:**  
`Main Street 12, San Francisco, CA, 94105, United States`

---

```bash
--format "{name}, {street} {housenumber}, {postcode} {city}, {country_code}"
```
**Standardized Output:**  
`Googleplex, Amphitheatre Parkway 1600, 94043 Mountain View, US`

---

```bash
--format "{country}, {postcode}-{city}, {street} {housenumber}"
```
**Standardized Output:**  
`Germany, 10117-Berlin, Unter den Linden 77`

---

```bash
--format "{housenumber} {street}, {suburb}, {city}, {state}, {country}"
```
**Standardized Output:**  
`221B Baker Street, Marylebone, London, England, United Kingdom`

---

```bash
--format "{street}, {city}, {country_code}"
```
**Standardized Output:**  
`Champs-Élysées, Paris, FR`

## Example

**Input (`input.txt`):**
```
1600 Amphitheatre Parkway, Mountain View, CA 94043, USA
Unknown Place
123 Example St, Springfield
Platz der Republik, Berlin, Germany
```

**Run:**
```bash
python address_standardization.py \
  --api_key YOUR_API_KEY \
  --input input.txt \
  --output geocoded.ndjson \
  --standardized_output standardized_addresses.csv \
  --format "{street} {housenumber}, {city}, {state_code}, {postcode}, {country}"
```

**Output (`standardized_addresses.csv`):**
```
Original Address,Standardized Address
"1600 Amphitheatre Parkway, Mountain View, CA 94043, USA","Amphitheatre Parkway 1600, Mountain View, CA, 94043, United States"
"Unknown Place",""
"123 Example St, Springfield","Example St 123, Springfield, IL, 62704, United States"
"Platz der Republik, Berlin, Germany","Platz der Republik, Berlin, BE, 10557, Germany"
```

## How the Script Works

The script performs **address standardization in two main steps**:

### 1. **Geocode Addresses with Rate Limiting**

The function `geocode_addresses()` sends requests to the **Geoapify Geocoding API** in controlled batches.  
To comply with the Free plan’s limit of **5 requests per second (RPS)**:
- The addresses are split into chunks of 5.
- Each chunk is processed in parallel using threads.
- After every batch, the script pauses for 1 second before sending the next one.

```python
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
```

1. **Batching Input with `itertools.batched()`**  
   The function uses [`itertools.batched()`](https://docs.python.org/3/library/itertools.html#itertools.batched) to split the input list into chunks of 5 addresses.  
   This helps control request throughput so that the script doesn't exceed the Geoapify Free plan's **5 requests per second (RPS)** limit.

2. **Asynchronous Execution with `concurrent.futures.ThreadPoolExecutor`**  
   Each address within a batch is submitted to a thread pool using [`concurrent.futures.ThreadPoolExecutor`](https://docs.python.org/3/library/concurrent.futures.html#concurrent.futures.ThreadPoolExecutor).  
   This allows geocoding multiple addresses **in parallel**, improving performance and responsiveness.

3. **Rate Limiting via `sleep(1)`**  
   After each batch, the function waits 1 second (`sleep(1)`) to prevent exceeding the allowed request rate.

4. **Waiting for All Results**  
   The function uses [`concurrent.futures.wait()`](https://docs.python.org/3/library/concurrent.futures.html#concurrent.futures.wait) to block until all geocoding tasks are complete.

5. **Returning Results**  
   It collects the final results from each task using `.result()` and returns them as a list.

### 2. **Generate Standardized Addresses**

Once the geocoding results are retrieved:
- The function `generate_standard_addresses()` formats each address using a **user-defined template** (via the `--format` argument).
- Placeholders like `{street}`, `{postcode}`, `{country}` are filled using data from the geocoding response.
- If a result is missing or empty, the standardized address will be an empty string.
- The output is written to a CSV file, pairing the original address with the formatted version.

```python
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
```

1. **Opens a CSV file** using [`csv.writer`](https://docs.python.org/3/library/csv.html#csv.writer) and writes a header row:  
   `"Original Address", "Standardized Address"`

2. **Iterates** through original addresses and geocoding results using `zip()`.

3. **Handles invalid results** (missing or containing `"error"`) by outputting an empty string.

4. **Formats valid results** using [`str.format_map()`](https://docs.python.org/3/library/stdtypes.html#str.format_map) and a `GeocodeResult` dict subclass that safely substitutes missing values with empty strings.

5. **Writes each pair** to the output CSV.

## Learn More

- [Geoapify Geocoding API Documentation](https://apidocs.geoapify.com/docs/geocoding/)  
  Details about available parameters, usage limits, and response formats.

- [Geocoding API Playground](https://apidocs.geoapify.com/playground/geocoding/)  
  Try out forward and reverse geocoding interactively.

- [Address Standardization Overview](https://www.geoapify.com/solutions/address-lookup/)  
  Learn what address standardization is and how to implement it effectively.

- [Get your free Geoapify API key](https://myprojects.geoapify.com/)  
  Sign up and start using the API with free daily limits.

## License

MIT License. See `LICENSE` file for details.