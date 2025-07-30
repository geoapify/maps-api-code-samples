const GEOAPIFY_API_KEY = '27a3c5f9a6754da28283d1995edb9467';
const DEFAULT_CENTER = [2.10, 48.81];
const DEFAULT_ZOOM = 3;
const MAX_POINTS = 1000;

const mapMatchingAPI = new MapMatchingAPI(GEOAPIFY_API_KEY);
const fileUtils = new FileUtils(MAX_POINTS);
const mapManager = new MapMatchingMap(GEOAPIFY_API_KEY, DEFAULT_CENTER, DEFAULT_ZOOM);

let currentGpxData = null;
let currentMatchingData = null;
let gpxFileName = null;

document.addEventListener('DOMContentLoaded', async function() {
    try {
        await initializeApp();
    } catch (error) {
        console.error('Failed to initialize app:', error);
    }
});

async function initializeApp() {
    await initializeMap();
    setupEventListeners();
}

async function initializeMap() {
    await mapManager.initialize('map');
    console.log('✅ Map Matching application initialized');
}

function setupEventListeners() {
    document.getElementById('upload-button').addEventListener('click', function() {
        document.getElementById('gpx-file-input').value = '';
        document.getElementById('gpx-file-input').click();
    });

    document.getElementById('gpx-file-input').addEventListener('change', handleFileUpload);
    document.getElementById('match-button').addEventListener('click', performMapMatching);
    document.getElementById('clear-all-button').addEventListener('click', clearAll);

    document.getElementById('error-ok-button').addEventListener('click', function() {
        hideErrorDialog();
    });

    document.getElementById('error-dialog').addEventListener('click', function(e) {
        if (e.target === e.currentTarget) {
            hideErrorDialog();
        }
    });

    document.getElementById('download-geojson').addEventListener('click', downloadGeoJSON);
    document.getElementById('download-gpx').addEventListener('click', downloadGPX);
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.gpx') && !file.name.toLowerCase().endsWith('.xml')) {
        showError('Please select a GPX file (.gpx or .xml)');
        return;
    }

    gpxFileName = file.name;
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const gpxContent = e.target.result;
        parseGpxFile(gpxContent);
    };
    
    reader.onerror = function() {
        showError('Error reading file. Please try again.');
    };
    
    reader.readAsText(file);
}

function parseGpxFile(gpxContent) {
    try {
        const result = fileUtils.parseGpxFile(gpxContent);
        
        currentGpxData = result.gpxData;
        currentMatchingData = null;
        
        mapManager.clearDisplay();
        hideSummary();
        mapManager.displayGpsTrace(result.coordinates);
        
        if (result.simplificationApplied) {
            updateFileInfo(
                `${gpxFileName} - Route simplified from ${result.originalCount} to ${result.coordinates.length} points for optimal processing`,
                'success'
            );
        } else {
            updateFileInfo(
                `${gpxFileName} - ${result.coordinates.length} points loaded`,
                'success'
            );
        }

        document.getElementById('match-button').disabled = false;

    } catch (error) {
        console.error('Error parsing GPX file:', error);
        showError(`Error parsing GPX file: ${error.message}`);
    }
}

async function performMapMatching() {
    if (!currentGpxData || currentGpxData.length === 0) {
        showError('No GPS data available. Please upload a GPX file first.');
        return;
    }

    const travelModeElement = document.querySelector('input[name="travel-mode"]:checked');
    const travelMode = travelModeElement ? travelModeElement.value : 'walk';
    
    showLoadingIndicator();
    
    try {
        const matchingResult = await mapMatchingAPI.performMapMatching(currentGpxData, travelMode);
        
        currentMatchingData = matchingResult;
        
        mapManager.displayMatchedTrace(matchingResult);
        displaySummary(matchingResult, currentGpxData);

        console.log('✅ Map matching completed successfully');

    } catch (error) {
        console.error('❌ Error during map matching:', error);
        showError(`Map matching failed: ${error.message}`);
    } finally {
        hideLoadingIndicator();
    }
}

function displaySummary(matchingData, currentGpxData) {
    let totalDistance = 0;
    let totalTime = 0;
    let originalDistance = 0;

    matchingData.features.forEach(feature => {
        if (feature.properties.legs) {
            feature.properties.legs.forEach(leg => {
                leg.steps.forEach(step => {
                    totalDistance += step.distance || 0;
                    totalTime += step.time || 0;
                });
            });
        }
    });

    if (currentGpxData && currentGpxData.length > 1) {
        for (let i = 0; i < currentGpxData.length - 1; i++) {
            const coord1 = currentGpxData[i].location;
            const coord2 = currentGpxData[i + 1].location;
            originalDistance += fileUtils.calculateHaversineDistance(coord1, coord2);
        }
    }

    const travelModeElement = document.querySelector('input[name="travel-mode"]:checked');
    const travelMode = travelModeElement ? travelModeElement.value : 'unknown';

    const summaryContent = `
        <div class="summary-item">
            <span class="summary-label">Original Points:</span>
            <span class="summary-value">${currentGpxData.length}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Original Distance:</span>
            <span class="summary-value">${(originalDistance / 1000).toFixed(2)} km</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Matched Distance:</span>
            <span class="summary-value">${(totalDistance / 1000).toFixed(2)} km</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Estimated Time:</span>
            <span class="summary-value">${fileUtils.formatTime(totalTime)}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Travel Mode:</span>
            <span class="summary-value">${travelMode}</span>
        </div>
    `;

    document.getElementById('summary-content').innerHTML = summaryContent;
    document.getElementById('summary-info').classList.remove('hidden');
    document.getElementById('download-section').classList.remove('hidden');
}

function clearAll() {
    currentGpxData = null;
    currentMatchingData = null;
    gpxFileName = null;

    mapManager.clearDisplay();
    hideSummary();
    hideFileInfo();
    document.getElementById('gpx-file-input').value = '';
    document.getElementById('match-button').disabled = true;

    mapManager.resetView();
}

function downloadGeoJSON() {
    try {
        fileUtils.downloadGeoJSON(currentMatchingData);
    } catch (error) {
        console.error('Error downloading GeoJSON:', error);
        showError(error.message);
    }
}

function downloadGPX() {
    try {
        fileUtils.downloadGPX(currentMatchingData, gpxFileName);
    } catch (error) {
        console.error('Error downloading GPX:', error);
        showError('Error creating GPX file. Please try again.');
    }
}

function updateFileInfo(message, type = 'info') {
    const fileInfo = document.getElementById('file-info');
    if (fileInfo) {
        fileInfo.textContent = message;
        fileInfo.className = `file-info ${type}`;
        fileInfo.classList.remove('hidden');
    }
}

function hideFileInfo() {
    const fileInfo = document.getElementById('file-info');
    if (fileInfo) {
        fileInfo.classList.add('hidden');
    }
}

function showError(message) {
    const errorMessage = document.getElementById('error-message');
    const errorDialog = document.getElementById('error-dialog');
    
    if (errorMessage && errorDialog) {
        errorMessage.textContent = message;
        errorDialog.classList.remove('hidden');
    }
}

function hideErrorDialog() {
    const errorDialog = document.getElementById('error-dialog');
    if (errorDialog) {
        errorDialog.classList.add('hidden');
    }
}

function showLoadingIndicator() {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.classList.remove('hidden');
    }
}

function hideLoadingIndicator() {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.classList.add('hidden');
    }
}

function hideSummary() {
    const summaryInfoElement = document.getElementById('summary-info');
    const downloadSectionElement = document.getElementById('download-section');

    if (summaryInfoElement) {
        summaryInfoElement.classList.add('hidden');
    }

    if (downloadSectionElement) {
        downloadSectionElement.classList.add('hidden');
    }
} 