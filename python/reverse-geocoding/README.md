# **Python Batch Reverse Geocode Example**

This project demonstrates how to use the Geoapify [Reverse Geocoding API](https://www.geoapify.com/reverse-geocoding-api/) to retrieve address details from latitude and longitude coordinates.

---

## **Features**

- Implements Reverse Geocoding to get addresses from latitude/longitude coordinates.
- Supports batch processing of coordinates from an input file.
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
python -m venv env
source env/bin/activate  # On Windows: env\Scripts\activate
```

### 3. Install Dependencies

Install the required Python libraries using pip:

```bash
pip install requests
```

---

## **Running the Reverse Geocoding Example**

Run the script to generate an output file:

```bash
cd reverse-geocoding
python reverse_geocode.py --api_key 27a3c5f9a6754da28283d1995edb9467 --input input.txt --output output.ndjson --order latlon
```

### **Command-line Arguments**

- `--api_key` (required): Geoapify API key.
- `--input` (required): Input filename containing latitude and longitude pairs.
- `--output` (required): Output filename (e.g., `output.ndjson`).
- `--order` (optional, default: `latlon`): Order of coordinates (`latlon` or `lonlat`).
- `--country_code` (optional): Restrict results to a specific country (e.g., `us`, `de`, `fr`).
- `--type` (optional, default: `address`): Type of result to retrieve (`address`, `street`, `city`, `postcode`, `county`, `state`).
- `--output_format` (optional, default: `json`): Format of response (`json` or `geojson`).

---

## **Example Input File (Coordinates)**

Below is a sample list of latitude and longitude coordinates that can be used as input (to be saved as input.txt):

```
40.779437, -73.963244
37.774929, -122.419416
48.858844, 2.294351
51.507351, -0.127758
34.052235, -118.243683
```

---

## **Reverse Geocoding API Call**

The script sends a `GET` request to the Geoapify Reverse Geocoding API using the following format:

```
https://api.geoapify.com/v1/geocode/reverse?lat={LAT}&lon={LON}&format=json&apiKey={API_KEY}
```

### **Notes**
- Replace `{LAT}` and `{LON}` with the desired coordinates.
- Replace `{API_KEY}` with your valid Geoapify API key.
- Use `format=json` to get the response in JSON format.

### **Example Request**
To reverse geocode coordinates `40.779437, -73.963244`:

```
https://api.geoapify.com/v1/geocode/reverse?lat=40.779437&lon=-73.963244&format=json&apiKey=YOUR_API_KEY
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
      "distance": 0,
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
        "importance": 0.6197062122600859,
        "popularity": 8.125651845013953
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
    "lat": 40.779437,
    "lon": -73.963244,
    "plus_code": "87G8Q2HP+QP"
  }
}
```

### **Notes**
- Replace `{LAT}` and `{LON}` with the desired coordinates.
- Replace `{API_KEY}` with your valid Geoapify API key.
- Use `format=json` to get the response in JSON format.


