const GEOAPIFY_API_KEY = '27a3c5f9a6754da28283d1995edb9467';
const BERLIN_CENTER = [13.4050, 52.5200];
const DEFAULT_ZOOM = 13;
const SEARCH_RADIUS = 3000;
const MAX_SUPERMARKETS = 10;
const placesAPI = new PlacesAPI(GEOAPIFY_API_KEY);
const routeMatrixAPI = new RouteMatrixAPI(GEOAPIFY_API_KEY);
const routingAPI = new RoutingAPI(GEOAPIFY_API_KEY);
const mapHelper = new MapHelper(GEOAPIFY_API_KEY, BERLIN_CENTER, DEFAULT_ZOOM);
let currentLocation = null;
let currentSupermarkets = [];
let isLoading = false;
let selectedTravelMode = 'drive';

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    mapHelper.initialize('map');
    setupEventListeners();
    setLocationToBerlin();
    updateUI();
}

function setupEventListeners() {
    mapHelper.onMapClick(handleMapClick);
    document.getElementById('reset-button').addEventListener('click', handleResetLocation);
    document.getElementById('travel-mode').addEventListener('change', handleTravelModeChange);
    mapHelper.onLoad(() => {});
}

async function handleMapClick(location) {
    if (isLoading) return;
    
    currentLocation = location;
    showLoadingIndicator('Finding location...');
    
    try {
        await mapHelper.setUserLocation(location);
        await findAndDisplaySupermarkets(location);
    } catch (error) {
        console.error('Error handling map click:', error);
        showErrorMessage('Failed to process location. Please try again.');
    } finally {
        hideLoadingIndicator();
    }
}



async function findAndDisplaySupermarkets(location) {
    showLoadingIndicator('Finding supermarkets...');
    
    try {
        const supermarkets = await placesAPI.findSupermarkets(location, SEARCH_RADIUS, MAX_SUPERMARKETS * 2 /* We query more data to get nearest by travel time*/);
        
        if (supermarkets.length === 0) {
            showNoResults();
            return;
        }
        
        showLoadingIndicator('Calculating travel times...');
        const supermarketsWithTravelInfo = await routeMatrixAPI.calculateTravelTimes(
            location, 
            supermarkets, 
            selectedTravelMode
        );
        
        currentSupermarkets = supermarketsWithTravelInfo;
        currentSupermarkets.length = Math.min(currentSupermarkets.length, MAX_SUPERMARKETS);
        
        await mapHelper.addSupermarketMarkers(
            supermarketsWithTravelInfo,
            handleMarkerHover,
            handleMarkerClick
        );
        
        displaySupermarketsList(supermarketsWithTravelInfo);
        mapHelper.fitToUserLocationAndMarkers(location, supermarketsWithTravelInfo);
        updateUI();
        
    } catch (error) {
        console.error('Error finding supermarkets:', error);
        showErrorMessage('Failed to find supermarkets. Please try again.');
    } finally {
        hideLoadingIndicator();
    }
}

function displaySupermarketsList(supermarkets) {
    const resultsList = document.getElementById('results-list');
    
    if (supermarkets.length === 0) {
        resultsList.innerHTML = `
            <div class="no-results">
                <p>No supermarkets found within ${SEARCH_RADIUS / 1000} km radius.</p>
            </div>
        `;
        return;
    }
    
    resultsList.innerHTML = supermarkets.map((supermarket, index) => 
        createSupermarketResultItem(supermarket, index + 1)
    ).join('');
    supermarkets.forEach((supermarket, index) => {
        const resultItem = document.querySelector(`[data-result-id="${supermarket.id}"]`);
        const routeButton = resultItem.querySelector('.route-button');
        
        resultItem.addEventListener('mouseenter', () => {
            resultItem.classList.add('highlighted');
            mapHelper.highlightSupermarketMarker(supermarket.id, true);
        });
        
        resultItem.addEventListener('mouseleave', () => {
            resultItem.classList.remove('highlighted');
            mapHelper.highlightSupermarketMarker(supermarket.id, false);
        });
        
        routeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            showRoute(supermarket);
        });
        
        resultItem.addEventListener('click', () => {
            mapHelper.map.flyTo({
                center: [supermarket.coordinates.lng, supermarket.coordinates.lat],
                zoom: 16,
                duration: 1000
            });
        });
    });
}

function createSupermarketResultItem(supermarket, rank) {
    return `
        <div class="result-item" data-result-id="${supermarket.id}">
            <div class="result-header">
                <div class="result-name">${supermarket.name}</div>
                <div class="result-rank">${rank}</div>
            </div>
            <div class="result-address">${supermarket.address}</div>
            <div class="result-stats">
                <div class="stat">
                    <span class="stat-value">${supermarket.travelTimeFormatted}</span>
                    <span class="stat-label">Travel Time</span>
                </div>
                <div class="stat">
                    <span class="stat-value">${supermarket.distanceFormatted}</span>
                    <span class="stat-label">Distance</span>
                </div>
            </div>
                            <button class="button route-button">Show Route</button>
        </div>
    `;
}

async function showRoute(supermarket) {
    if (!currentLocation) return;
    
    showLoadingIndicator('Calculating route...');
    
    try {
        const route = await routingAPI.getRoute(currentLocation, supermarket, selectedTravelMode);
        
        mapHelper.displayRoute(route.geometry, selectedTravelMode);
        mapHelper.fitToRoute(route.geometry);
        
    } catch (error) {
        console.error('Error showing route:', error);
        showErrorMessage('Failed to calculate route. Please try again.');
    } finally {
        hideLoadingIndicator();
    }
}

function handleMarkerHover(supermarket, isHovering) {
    const resultItem = document.querySelector(`[data-result-id="${supermarket.id}"]`);
    if (resultItem) {
        if (isHovering) {
            resultItem.classList.add('highlighted');
        } else {
            resultItem.classList.remove('highlighted');
        }
    }
}

function handleMarkerClick(supermarket) {
    const resultItem = document.querySelector(`[data-result-id="${supermarket.id}"]`);
    if (resultItem) {
        resultItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        resultItem.classList.add('highlighted');
        setTimeout(() => {
            resultItem.classList.remove('highlighted');
        }, 2000);
    }
}

async function handleResetLocation() {
    await setLocationToBerlin();
}

async function setLocationToBerlin() {
    const berlinLocation = { lat: BERLIN_CENTER[1], lng: BERLIN_CENTER[0] };
    
    currentLocation = berlinLocation;
    currentSupermarkets = [];
    
    mapHelper.resetToDefaultLocation();
    mapHelper.clearRoute();
    mapHelper.clearSupermarketMarkers();
    
    await mapHelper.setUserLocation(berlinLocation);
    findAndDisplaySupermarkets(berlinLocation);
    updateUI();
}

async function handleTravelModeChange(event) {
    const newMode = event.target.value;
    
    if (newMode === selectedTravelMode) return;
    
    selectedTravelMode = newMode;
    mapHelper.clearRoute();
    
    if (currentLocation && currentSupermarkets.length > 0) {
        await findAndDisplaySupermarkets(currentLocation);
    }
}



function showNoResults() {
    const resultsList = document.getElementById('results-list');
    resultsList.innerHTML = `
        <div class="no-results">
            <p>No supermarkets found within ${SEARCH_RADIUS / 1000} km radius.</p>
            <p>Try selecting a different location.</p>
        </div>
    `;
    
    mapHelper.clearSupermarketMarkers();
    
    currentSupermarkets = [];
    updateUI();
}

function updateUI() {
    document.getElementById('supermarkets-count').textContent = currentSupermarkets.length;
    document.getElementById('search-radius').textContent = `${SEARCH_RADIUS / 1000} km`;
}

function showLoadingIndicator(text = 'Loading...') {
    isLoading = true;
    const loadingIndicator = document.getElementById('loading-indicator');
    const loadingText = document.getElementById('loading-text');
    
    loadingText.textContent = text;
    loadingIndicator.classList.remove('hidden');
}

function hideLoadingIndicator() {
    isLoading = false;
    const loadingIndicator = document.getElementById('loading-indicator');
    loadingIndicator.classList.add('hidden');
}

function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: #f8d7da;
        color: #721c24;
        border: 1px solid #f5c6cb;
        padding: 12px 20px;
        border-radius: 6px;
        font-size: 14px;
        z-index: 1002;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        if (errorDiv.parentElement) {
            errorDiv.parentElement.removeChild(errorDiv);
        }
    }, 5000);
} 