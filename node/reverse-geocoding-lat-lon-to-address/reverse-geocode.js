import fetch from 'node-fetch';
import fs from 'fs/promises';
import RequestRateLimiter from '@geoapify/request-rate-limiter';

const API_KEY = "YOUR_API_KEY";
const GEOCODING_API_URL = 'https://api.geoapify.com/v1/geocode/reverse?limit=1&format=json';
const type = null; // Optional: can be set to a specific location type such as 'country', 'state', 'city', 'postcode', 'street', or 'amenity'

// Load coordinates from JSON file
async function readCoordinates(filename = 'input.txt') {
  try {
    const data = await fs.readFile(filename, 'utf-8');
    return data
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        const [lat, lon] = line.split(',').map(Number);
        return { lat, lon };
      });
  } catch (err) {
    console.error(`❌ Failed to read ${filename}:`, err.message);
    return [];
  }
}

// Create a single reverse geocoding request
const createReverseGeocodingRequest = (row) => {
  return async () => {
    try {
      const url = `${GEOCODING_API_URL}&lat=${encodeURIComponent(row.lat)}&lon=${encodeURIComponent(row.lon)}&apiKey=${API_KEY}`;

      if (type) {
        url += `&type=${encodeURIComponent(type)}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        return { row, error: `HTTP ${response.status}: ${response.statusText}` };
      }

      const data = await response.json();
      if (data.results && data.results.length > 0) {
        return { row, result: data.results[0] };
      } else {
        return { row, error: 'No address found' };
      }
    } catch (err) {
      return { row, error: err.message };
    }
  };
};

// Save results to JSON
async function saveToJSON(results, filename = 'results.json') {
  await fs.writeFile(filename, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`✅ Results saved to ${filename}`);
}

// Main function
async function reverseGeocodeBatch() {
  const coordinates = await readCoordinates();
  if (coordinates.length === 0) {
    console.warn('⚠️ No coordinates to process.');
    return;
  }

  const requests = coordinates.map(createReverseGeocodingRequest);

  const options = {
    batchSize: 10,
    onProgress: (progress) => {
      console.log(`Progress: ${progress.completedRequests}/${progress.totalRequests}`);
    },
    onBatchComplete: (batch) => {
      console.log(`Batch completed (${batch.results.length})`);
    }
  };

  try {
    const results = await RequestRateLimiter.rateLimitedRequests(requests, 5, 1000, options);
    console.log('✅ All reverse geocoding requests completed.');
    return results;
  } catch (err) {
    console.error('❌ Error during reverse geocoding:', err);
  }
}

const coords = await readCoordinates();
const results = await reverseGeocodeBatch(coords);
await saveToJSON(results);
