#!/usr/bin/env node

const fs = require('fs');
const csv = require('csv-parser');
const { Command } = require('commander');
const RequestRateLimiter = require('@geoapify/request-rate-limiter');

// Configuration
const DEFAULT_CONFIG = {
  rateLimit: 5, // requests per second
  apiUrl: 'https://api.geoapify.com/v1/geocode/search',
  // Column mapping - customize this based on your CSV structure
  columnMapping: {
    street: 'Street',
    city: 'City', 
    state: 'State',
    country: 'Country',
    postalCode: 'PostalCode'
  },
  outputFormat: 'ndjson', // 'json' or 'ndjson' or 'console'
  retryFailedRequests: true,
  maxRetries: 3
};

/**
 * Logs messages with timestamp
 */
function log(level, message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
}

function isNotEmpty(value) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

function isValidNumber(value, min = -Infinity, max = Infinity) {
  const num = parseFloat(value);
  return !isNaN(num) && num >= min && num <= max;
}

function isValidApiKey(apiKey) {
  return isNotEmpty(apiKey) && apiKey.length >= 10;
}

function isValidRateLimit(rateLimit) {
  return isValidNumber(rateLimit, 0.1, 1000);
}

/**
 * Builds the text parameter for geocoding from CSV row
 */
function buildAddressText(row, columnMapping) {
  const parts = [];
  
  if (row[columnMapping.street]) parts.push(row[columnMapping.street]);
  if (row[columnMapping.city]) parts.push(row[columnMapping.city]);
  if (row[columnMapping.state]) parts.push(row[columnMapping.state]);
  if (row[columnMapping.postalCode]) parts.push(row[columnMapping.postalCode]);
  if (row[columnMapping.country]) parts.push(row[columnMapping.country]);
  
  return parts.join(', ');
}

/**
 * Geocodes a single address
 */
async function geocodeAddress(addressText, apiKey) {
  const params = new URLSearchParams({
    format: 'json',
    text: addressText,
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
        originalAddress: addressText,
        result: data.results[0]
      };
    } else {
      return {
        success: false,
        originalAddress: addressText,
        error: 'No results found'
      };
    }
  } catch (error) {
    return {
      success: false,
      originalAddress: addressText,
      error: error.message
    };
  }
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
 * Processes CSV rows into address objects with original index tracking
 */
function processAddressesFromRows(rows) {
  return rows.map((row, originalIndex) => {
    const addressText = buildAddressText(row, DEFAULT_CONFIG.columnMapping);
    return {
      originalRow: row,
      addressText: addressText,
      originalIndex: originalIndex
    };
  });
}

/**
 * Separates valid addresses from empty ones, placing empty results in correct positions
 */
function separateValidAndEmptyAddresses(allAddresses, results) {
  const validAddresses = [];

  allAddresses.forEach((addr) => {
    if (!addr.addressText.trim()) {
      log('warning', `Skipping empty address at row ${addr.originalIndex + 1}`);
      results[addr.originalIndex] = {
        success: false,
        originalRow: addr.originalRow,
        originalAddress: addr.addressText,
        error: 'Empty address'
      };
    } else {
      validAddresses.push(addr);
    }
  });

  return validAddresses;
}

/**
 * Creates a geocoding request function for a single address
 */
function createGeocodeRequestFunction(addr, apiKey) {
  return async () => {
    const result = await geocodeAddress(addr.addressText, apiKey);
    result.originalRow = addr.originalRow;
    result.originalIndex = addr.originalIndex;
    
    if (result.success) {
      log('info', `✓ Geocoded: ${addr.addressText}`);
    } else {
      log('warning', `✗ Failed: ${addr.addressText} - ${result.error}`);
    }
    
    return result;
  };
}

/**
 * Creates a retry request function for a failed result
 */
function createRetryRequestFunction(failedResult, apiKey) {
  return async () => {
    const result = await geocodeAddress(failedResult.originalAddress, apiKey);
    result.originalRow = failedResult.originalRow;
    result.originalIndex = failedResult.originalIndex;
    
    if (result.success) {
      log('info', `✓ Retry successful: ${failedResult.originalAddress}`);
    } else {
      log('warning', `✗ Retry failed: ${failedResult.originalAddress} - ${result.error}`);
    }
    
    return result;
  };
}

/**
 * Places results at their original positions in the results array
 */
function placeResultsAtOriginalPositions(results, resultsToPlace) {
  resultsToPlace.forEach(result => {
    results[result.originalIndex] = result;
  });
}

/**
 * Executes geocoding batch with rate limiting
 */
async function executeGeocodingBatch(validAddresses, apiKey, rateLimit) {
  const requestFunctions = validAddresses.map(addr => 
    createGeocodeRequestFunction(addr, apiKey)
  );

  return await RequestRateLimiter.rateLimitedRequests(
    requestFunctions,
    rateLimit,
    1000 // 1 second interval
  );
}

/**
 * Executes retry batch for failed requests
 */
async function executeRetryBatch(failedResults, apiKey, rateLimit) {
  const retryFunctions = failedResults.map(failedResult => 
    createRetryRequestFunction(failedResult, apiKey)
  );

  try {
    return await RequestRateLimiter.rateLimitedRequests(
      retryFunctions,
      rateLimit,
      1000
    );
  } catch (error) {
    log('error', `Error during retry batch: ${error.message}`);
    return [];
  }
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
    
    const retryResults = await executeRetryBatch(currentFailedResults, apiKey, rateLimit);
    placeResultsAtOriginalPositions(results, retryResults);

    // Check which requests still failed after this retry
    currentFailedResults = retryResults.filter(r => !r.success);
    
    if (currentFailedResults.length === 0) {
      log('info', `All requests succeeded after ${retryAttempt} retry attempt(s)`);
      break;
    } else if (retryAttempt === maxRetries) {
      log('warning', `${currentFailedResults.length} requests still failed after ${maxRetries} retry attempts`);
    }
  }
}

/**
 * Outputs final results based on format
 */
async function outputFinalResults(results, outputFormat, outputFile) {
  const finalResults = results.filter(r => r !== null);
  const successCount = finalResults.filter(r => r.success).length;
  const failureCount = finalResults.length - successCount;
  
  log('info', `Geocoding complete: ${successCount} successful, ${failureCount} failed`);

  if (!outputFile || outputFormat === 'console') {
    console.log(JSON.stringify(finalResults, null, 2));
  } else if (outputFile) {
    await writeResults(finalResults, outputFile, outputFormat);
  }

  return finalResults;
}

/**
 * Main geocoding function
 */
async function geocodeAddresses(options) {
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

    // Process addresses from CSV rows
    const allAddresses = processAddressesFromRows(rows);
    
    // Create results array with same length as input
    const results = new Array(rows.length).fill(null);
    
    // Separate valid addresses from empty ones
    const validAddresses = separateValidAndEmptyAddresses(allAddresses, results);

    log('info', `Starting geocoding of ${validAddresses.length} valid addresses at ${rateLimit} requests per second`);

    if (validAddresses.length > 0) {
      // Execute geocoding batch
      const geocodingResults = await executeGeocodingBatch(validAddresses, apiKey, rateLimit);
      
      // Place results at original positions
      placeResultsAtOriginalPositions(results, geocodingResults);

      // Handle retry logic
      await handleRetryLogic(geocodingResults, results, apiKey, rateLimit, retryFailedRequests, maxRetries);
    }

    // Output final results
    return await outputFinalResults(results, outputFormat, outputFile);

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
    .name('address-geocoder')
    .description('Geocode addresses from CSV files using Geoapify API')
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
        const geocodeOptions = {
          inputFile: options.input,
          outputFile: options.output,
          apiKey: options.apiKey,
          rateLimit: options.rateLimit,
          outputFormat: options.outputFormat,
          retryFailedRequests: options.retry,
          maxRetries: options.maxRetries
        };

        await geocodeAddresses(geocodeOptions);
        
      } catch (error) {
        log('error', `CLI error: ${error.message}`);
        process.exit(1);
      }
    });

  program.parse();
}

// Export functions for programmatic use
module.exports = {
  geocodeAddresses,
  geocodeAddress,
  buildAddressText,
  DEFAULT_CONFIG
};

// Run CLI if this script is executed directly
if (require.main === module) {
  setupCLI();
}
