import fetch from 'node-fetch';
import RequestRateLimiter from '@geoapify/request-rate-limiter';
import fs from 'fs/promises';

async function readAddressesFromFile(filename = 'input.txt') {
    try {
      const data = await fs.readFile(filename, 'utf-8');
      return data
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    } catch (err) {
      console.error(`❌ Failed to read ${filename}:`, err.message);
      return [];
    }
  }

const API_KEY = "YOUR_API_KEY";
const GEOCODING_API_URL = 'https://api.geoapify.com/v1/geocode/search?limit=1&format=json';

const createGeocodingRequest = (address) => {
  return async () => {
    try {
      const url = `${GEOCODING_API_URL}&text=${encodeURIComponent(address)}&apiKey=${API_KEY}`;
      const response = await fetch(url);
      if (!response.ok) {
        return { address, error: `HTTP error ${response.status}: ${response.statusText}` };
      }

      const data = await response.json();
      if (data.results && data.results.length > 0) {
        return { address, result: data.results[0] };
      } else {
        return { address, error: 'No result found' };
      }
    } catch (err) {
      return { address, error: err.message };
    }
  };
};

async function geocodeBatch(addresses) {
  const requests = addresses.map(createGeocodingRequest);

  const options = {
    batchSize: 10,
    onProgress: (progress) => {
      console.log(`Progress: ${progress.completedRequests}/${progress.totalRequests}`);
    },
    onBatchComplete: (batch) => {
      console.log(`Batch completed (${batch.results.length}):`);
      batch.results.forEach(r => {
        console.log(r.result
          ? `✅ ${r.address} → (${r.result.lat}, ${r.result.lon})`
          : `❌ ${r.address} → ${r.error}`);
      });
    }
  };

  try {
    const results = await RequestRateLimiter.rateLimitedRequests(requests, 5, 1000, options);
    console.log('\n✅ All requests completed.');

    return results;
  } catch (err) {
    console.error('❌ Error during batch geocoding:', err);
  }
}

async function saveToJSONFile(results, filename = 'results.json') {
    const json = JSON.stringify(results, null, 2);
    await fs.writeFile(filename, json, 'utf-8');
    console.log(`✅ Results saved to ${filename}`);
}

const addresses = await readAddressesFromFile();
const results = await geocodeBatch(addresses);
await saveToJSONFile(results);