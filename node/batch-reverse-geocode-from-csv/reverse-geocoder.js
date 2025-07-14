#!/usr/bin/env node

const fs = require('fs');
const csv = require('csv-parser');
const { Command } = require('commander');
const RequestRateLimiter = require('@geoapify/request-rate-limiter');

// Configuration
const DEFAULT_CONFIG = {
  rateLimit: 5, // requests per second
  apiUrl: 'https://api.geoapify.com/v1/geocode/reverse',
  outputFormat: 'ndjson', // 'json' or 'ndjson' or 'console'
  retryFailedRequests: true,
  maxRetries: 3,
  // Column mapping - customize this based on your CSV structure
  columnMapping: {
    lat: 'lat',
    lon: 'lon'
  }
};

function log(level, message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
}

// Array utilities
function placeResultsAtOriginalPositions(results, resultsToPlace) {
  resultsToPlace.forEach(result => {
    results[result.originalIndex] = result;
  });
}

function countResults(results) {
  const finalResults = results.filter(r => r !== null);
  const successCount = finalResults.filter(r => r.success).length;
  const failureCount = finalResults.length - successCount;

  return {
    total: finalResults.length,
    successful: successCount,
    failed: failureCount,
    results: finalResults
  };
}

// Validation utilities
function isNotEmpty(value) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

function isValidNumber(value, min = -Infinity, max = Infinity) {
  const num = parseFloat(value);
  return !isNaN(num) && num >= min && num <= max;
}

function isValidLatitude(lat) {
  return isValidNumber(lat, -90, 90);
}

function isValidLongitude(lon) {
  return isValidNumber(lon, -180, 180);
}

function isValidCoordinatePair(lat, lon) {
  return isValidLatitude(lat) && isValidLongitude(lon);
}

function isValidApiKey(apiKey) {
  return isNotEmpty(apiKey) && apiKey.length >= 10;
}

function isValidRateLimit(rateLimit) {
  return isValidNumber(rateLimit, 0.1, 1000);
}

/**
 * Reads CSV file and returns array of rows
 */
async function readCsvFile(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        rows.push(row);
      })
      .on('end', () => {
        log('info', `Read ${rows.length} rows from ${filePath}`);
        resolve(rows);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

/**
 * Writes results to output file
 */
async function writeResults(results, outputPath, format) {
  if (format === 'json') {
    await fs.promises.writeFile(outputPath, JSON.stringify(results, null, 2));
  } else if (format === 'ndjson') {
    const ndjsonContent = results.map(result => JSON.stringify(result)).join('\n');
    await fs.promises.writeFile(outputPath, ndjsonContent);
  }
  
  log('info', `Results written to ${outputPath}`);
}

/**
 * Builds coordinates string from CSV row
 */
function buildCoordinatesText(row, columnMapping) {
  const lat = row[columnMapping.lat];
  const lon = row[columnMapping.lon];
  
  if (!lat || !lon) {
    return null;
  }
  
  // Validate coordinates are numeric and in valid range
  if (!isValidCoordinatePair(lat, lon)) {
    return null;
  }
  
  return `${parseFloat(lat)},${parseFloat(lon)}`;
}

/**
 * Reverse geocodes a single coordinate pair
 */
async function reverseGeocode(coordinates, apiKey) {
  const [lat, lon] = coordinates.split(',');
  const params = new URLSearchParams({
    format: 'json',
    lat: lat,
    lon: lon,
    limit: '1',
    apiKey: apiKey
  });

  try {
    const response = await fetch(`${DEFAULT_CONFIG.apiUrl}?${params}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      return {
        success: true,
        originalCoordinates: coordinates,
        result: data.results[0]
      };
    } else {
      return {
        success: false,
        originalCoordinates: coordinates,
        error: 'No results found'
      };
    }
  } catch (error) {
    return {
      success: false,
      originalCoordinates: coordinates,
      error: error.message
    };
  }
}

/**
 * Processes CSV rows into coordinate objects with original index tracking
 */
function processCoordinatesFromRows(rows) {
  return rows.map((row, originalIndex) => {
    const coordinates = buildCoordinatesText(row, DEFAULT_CONFIG.columnMapping);
    return {
      originalRow: row,
      coordinates: coordinates,
      originalIndex: originalIndex
    };
  });
}

/**
 * Separates valid coordinates from invalid ones, placing invalid results in correct positions
 */
function separateValidAndInvalidCoordinates(allCoordinates, results) {
  const validCoordinates = [];

  allCoordinates.forEach((coord) => {
    if (!coord.coordinates) {
      log('warning', `Skipping invalid coordinates at row ${coord.originalIndex + 1}`);
      results[coord.originalIndex] = {
        success: false,
        originalRow: coord.originalRow,
        originalCoordinates: coord.coordinates || 'invalid',
        error: 'Invalid or missing coordinates'
      };
    } else {
      validCoordinates.push(coord);
    }
  });

  return validCoordinates;
}

/**
 * Creates a reverse geocoding request function for a single coordinate pair
 */
function createReverseGeocodeRequestFunction(coord, apiKey) {
  return async () => {
    const result = await reverseGeocode(coord.coordinates, apiKey);
    result.originalRow = coord.originalRow;
    result.originalIndex = coord.originalIndex;
    
    if (result.success) {
      log('info', `✓ Reverse geocoded: ${coord.coordinates}`);
    } else {
      log('warning', `✗ Failed: ${coord.coordinates} - ${result.error}`);
    }
    
    return result;
  };
}

/**
 * Creates a retry request function for a failed result
 */
function createRetryRequestFunction(failedResult, apiKey) {
  return async () => {
    const result = await reverseGeocode(failedResult.originalCoordinates, apiKey);
    result.originalRow = failedResult.originalRow;
    result.originalIndex = failedResult.originalIndex;
    
    if (result.success) {
      log('info', `✓ Retry successful: ${failedResult.originalCoordinates}`);
    } else {
      log('warning', `✗ Retry failed: ${failedResult.originalCoordinates} - ${result.error}`);
    }
    
    return result;
  };
}

/**
 * Executes batch with rate limiting
 */
async function executeBatchWithRateLimit(requestFunctions, rateLimit) {
  return await RequestRateLimiter.rateLimitedRequests(
    requestFunctions,
    rateLimit,
    1000 // 1 second interval
  );
}

/**
 * Handles retry logic for failed requests
 */
async function handleRetryLogic(geocodingResults, results, apiKey, rateLimit, retryFailedRequests, maxRetries) {
  if (!retryFailedRequests || maxRetries === 0) {
    return;
  }

  let currentFailedResults = geocodingResults.filter(r => !r.success);
  
  if (currentFailedResults.length === 0) {
    return;
  }

  // Retry up to maxRetries times
  for (let retryAttempt = 1; retryAttempt <= maxRetries; retryAttempt++) {
    if (currentFailedResults.length === 0) {
      break; // No more failed requests to retry
    }

    log('info', `Retry attempt ${retryAttempt}/${maxRetries}: ${currentFailedResults.length} failed requests...`);
    
    const retryFunctions = currentFailedResults.map(failedResult => 
      createRetryRequestFunction(failedResult, apiKey)
    );

    try {
      const retryResults = await executeBatchWithRateLimit(retryFunctions, rateLimit);
      placeResultsAtOriginalPositions(results, retryResults);

      // Check which requests still failed after this retry
      currentFailedResults = retryResults.filter(r => !r.success);
      
      if (currentFailedResults.length === 0) {
        log('info', `All requests succeeded after ${retryAttempt} retry attempt(s)`);
        break;
      } else if (retryAttempt === maxRetries) {
        log('warning', `${currentFailedResults.length} requests still failed after ${maxRetries} retry attempts`);
      }
    } catch (error) {
      log('error', `Error during retry batch: ${error.message}`);
      break;
    }
  }
}

/**
 * Outputs final results
 */
async function outputResults(results, outputFormat, outputFile) {
  const { total, successful, failed, results: finalResults } = countResults(results);
  
  log('info', `Processing complete: ${successful} successful, ${failed} failed`);

  if (!outputFile || outputFormat === 'console') {
    console.log(JSON.stringify(finalResults, null, 2));
  } else if (outputFile) {
    await writeResults(finalResults, outputFile, outputFormat);
  }

  return finalResults;
}

/**
 * Main reverse geocoding function
 */
async function reverseGeocodeCoordinates(options) {
  const { 
    inputFile, 
    outputFile, 
    apiKey, 
    rateLimit, 
    outputFormat,
    retryFailedRequests,
    maxRetries 
  } = options;

  try {
    // Read CSV file
    const rows = await readCsvFile(inputFile);
    
    if (rows.length === 0) {
      log('warning', 'No rows found in CSV file');
      return;
    }

    // Process coordinates from CSV rows
    const allCoordinates = processCoordinatesFromRows(rows);
    
    // Create results array with same length as input
    const results = new Array(rows.length).fill(null);
    
    // Separate valid coordinates from invalid ones
    const validCoordinates = separateValidAndInvalidCoordinates(allCoordinates, results);

    log('info', `Starting reverse geocoding of ${validCoordinates.length} valid coordinates at ${rateLimit} requests per second`);

    if (validCoordinates.length > 0) {
      // Create request functions for rate limiting
      const requestFunctions = validCoordinates.map(coord => 
        createReverseGeocodeRequestFunction(coord, apiKey)
      );

      // Execute reverse geocoding batch
      const geocodingResults = await executeBatchWithRateLimit(requestFunctions, rateLimit);
      
      // Place results at original positions
      placeResultsAtOriginalPositions(results, geocodingResults);

      // Handle retry logic
      await handleRetryLogic(geocodingResults, results, apiKey, rateLimit, retryFailedRequests, maxRetries);
    }

    // Output final results
    return await outputResults(results, outputFormat, outputFile);

  } catch (error) {
    log('error', `Fatal error: ${error.message}`);
    throw error;
  }
}

/**
 * CLI setup
 */
function setupCLI() {
  const program = new Command();

  program
    .name('reverse-geocoder')
    .description('Reverse geocode coordinates from CSV files using Geoapify API')
    .version('1.0.0')
    .requiredOption('-k, --api-key <key>', 'Geoapify API key')
    .requiredOption('-i, --input <file>', 'Input CSV file path')
    .option('-o, --output <file>', 'Output file path (optional)')
    .option('-r, --rate-limit <number>', 'Requests per second', parseInt, DEFAULT_CONFIG.rateLimit)
    .option('-f, --output-format <format>', 'Output format: json, ndjson, console', DEFAULT_CONFIG.outputFormat)
    .option('--no-retry', 'Disable retry for failed requests')
    .option('--max-retries <number>', 'Maximum retry attempts', parseInt, DEFAULT_CONFIG.maxRetries)
    .action(async (options) => {
      try {
        // Validate input file exists
        if (!fs.existsSync(options.input)) {
          log('error', `Input file not found: ${options.input}`);
          process.exit(1);
        }

        // Validate API key
        if (!isValidApiKey(options.apiKey)) {
          log('error', 'Invalid API key provided');
          process.exit(1);
        }

        // Validate rate limit
        if (!isValidRateLimit(options.rateLimit)) {
          log('error', 'Invalid rate limit (must be between 0.1 and 1000)');
          process.exit(1);
        }

        // Configure options
        const reverseGeocodeOptions = {
          inputFile: options.input,
          outputFile: options.output,
          apiKey: options.apiKey,
          rateLimit: options.rateLimit,
          outputFormat: options.outputFormat,
          retryFailedRequests: options.retry,
          maxRetries: options.maxRetries
        };

        await reverseGeocodeCoordinates(reverseGeocodeOptions);
        
      } catch (error) {
        log('error', `CLI error: ${error.message}`);
        process.exit(1);
      }
    });

  program.parse();
}

// Export functions for programmatic use
module.exports = {
  reverseGeocodeCoordinates,
  reverseGeocode,
  buildCoordinatesText,
  DEFAULT_CONFIG
};

// Run CLI if this script is executed directly
if (require.main === module) {
  setupCLI();
} 