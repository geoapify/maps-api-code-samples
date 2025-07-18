// Configuration
const GEOAPIFY_API_KEY = '27a3c5f9a6754da28283d1995edb9467'; // Replace with your actual API key
const DEFAULT_CENTER = [-74.0060, 40.7128]; // New York coordinates
const DEFAULT_ZOOM = 13;

// Color palette for isoline polygons
const COLORS = [
    '#FF6B6B', // Coral Red
    '#4ECDC4', // Medium Turquoise
    '#FFD93D', // Goldenrod
    '#1A535C', // Dark Cyan
    '#FF9F1C', // Bright Orange
    '#6A4C93', // Muted Purple
    '#1982C4', // Vibrant Blue
    '#8AC926', // Bright Lime Green
    '#FF595E', // Warm Red
    '#9B5DE5'  // Soft Violet
];

// Global variables
let map;
let currentColorIndex = 0;
let markerCounter = 0;
let clickedCoordinates = null;
let markers = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    setupEventListeners();
});

function initializeMap() {
    // Initialize MapLibre GL JS map
    map = new maplibregl.Map({
        container: 'map',
        style: `https://maps.geoapify.com/v1/styles/osm-bright/style.json?apiKey=${GEOAPIFY_API_KEY}`,
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM
    });

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl());

    // Add click event listener to the map
    map.on('click', onMapClick);

    // Add sources and layers for isolines when map is loaded
    map.on('load', function() {
        // Add source for isoline polygons
        map.addSource('isolines', {
            'type': 'geojson',
            'data': {
                'type': 'FeatureCollection',
                'features': []
            }
        });

        // Add layer for isoline polygons
        map.addLayer({
            'id': 'isolines-fill',
            'type': 'fill',
            'source': 'isolines',
            'paint': {
                'fill-color': ['get', 'color'],
                'fill-opacity': 0.4
            }
        });

        // Add layer for isoline borders
        map.addLayer({
            'id': 'isolines-outline',
            'type': 'line',
            'source': 'isolines',
            'paint': {
                'line-color': ['get', 'color'],
                'line-width': 2,
                'line-opacity': 0.8
            }
        });
    });
}

function setupEventListeners() {
    // Dialog form submission
    document.getElementById('isoline-form').addEventListener('submit', handleFormSubmit);
    
    // Cancel button
    document.getElementById('cancel-button').addEventListener('click', hideDialog);
    
    // Clear all button
    document.getElementById('clear-all-button').addEventListener('click', clearAll);
    
    // Isoline type change event to update value unit
    document.getElementById('isoline-type').addEventListener('change', updateValueUnit);
    
    // Dialog overlay click to close
    document.getElementById('isoline-dialog').addEventListener('click', function(e) {
        if (e.target === e.currentTarget) {
            hideDialog();
        }
    });
}

function onMapClick(event) {
    clickedCoordinates = [event.lngLat.lng, event.lngLat.lat];
    showDialog();
}

function showDialog() {
    const dialog = document.getElementById('isoline-dialog');
    dialog.classList.remove('hidden');
    
    // Focus on the first form element
    setTimeout(() => {
        document.getElementById('travel-mode').focus();
    }, 100);
}

function hideDialog() {
    const dialog = document.getElementById('isoline-dialog');
    dialog.classList.add('hidden');
    clickedCoordinates = null;
}

function updateValueUnit() {
    const isolineType = document.getElementById('isoline-type').value;
    const valueUnit = document.getElementById('value-unit');
    const valueInput = document.getElementById('isoline-value');
    
    if (isolineType === 'time') {
        valueUnit.textContent = 'minutes';
        valueInput.setAttribute('max', '120');
        valueInput.setAttribute('min', '1');
        valueInput.value = '10';
    } else {
        valueUnit.textContent = 'kilometers';
        valueInput.setAttribute('max', '100');
        valueInput.setAttribute('min', '0.1');
        valueInput.setAttribute('step', '0.1');
        valueInput.value = '1.0';
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();
    
    if (!clickedCoordinates) {
        alert('No coordinates selected. Please click on the map first.');
        return;
    }
    
    const formData = new FormData(event.target);
    const travelMode = formData.get('travel-mode');
    const isolineType = formData.get('isoline-type');
    const isolineValue = formData.get('isoline-value');
    
    // Store coordinates before hiding dialog
    const coordinates = clickedCoordinates;
    
    // Hide dialog
    hideDialog();
    
    // Add marker immediately
    const markerId = addMarker(coordinates, travelMode, isolineType, isolineValue);
    
    // Show loading indicator
    showLoadingIndicator();
    
    try {
        // Fetch isoline data
        const isolineData = await fetchIsoline(coordinates, travelMode, isolineType, isolineValue);
        
        // Add isoline to map
        addIsolineToMap(isolineData, markerId);
        
        markerCounter++;
        
    } catch (error) {
        console.error('Error fetching isoline:', error);
        alert('Error fetching isoline data. Please check your API key and try again.');
        
        // Remove the marker if API call failed
        removeMarker(markerId);
    } finally {
        // Hide loading indicator
        hideLoadingIndicator();
    }
}

function getTravelModeIcon(travelMode) {
    const icons = {
        'walk': 'walking',
        'hike': 'person-hiking',
        'scooter': 'motorcycle',
        'motorcycle': 'motorcycle',
        'drive': 'car',
        'truck': 'truck',
        'light_truck': 'truck-pickup',
        'medium_truck': 'truck-moving',
        'truck_dangerous_goods': 'truck-monster',
        'heavy_truck': 'truck-ramp-box',
        'long_truck': 'truck-moving',
        'bicycle': 'person-biking',
        'mountain_bike': 'bicycle',
        'road_bike': 'bicycle',
        'bus': 'bus',
        'drive_shortest': 'car-side',
        'drive_traffic_approximated': 'car-on',
        'truck_traffic_approximated': 'truck-front',
        'transit': 'train-subway',
        'approximated_transit': 'train-tram',
    };

    return icons[travelMode] || 'map-marker';
}

function generateIconUrl(travelMode, color, value) {
    const icon = getTravelModeIcon(travelMode);
    // Remove # from color for URL
    const colorCode = color.replace('#', '');
    
    return `https://api.geoapify.com/v2/icon/?type=circle&color=%23${colorCode}&size=40&icon=${icon}&iconType=awesome&contentSize=20&contentColor=%23${colorCode}&scaleFactor=2&apiKey=${GEOAPIFY_API_KEY}`;
}

function addMarker(coordinates, travelMode, isolineType, isolineValue) {
    const markerId = `marker-${Date.now()}-${markerCounter}`;
    const currentColor = COLORS[currentColorIndex];
    
    const iconUrl = generateIconUrl(travelMode, currentColor, isolineValue);
    
    const markerElement = document.createElement('div');
    markerElement.innerHTML = `
        <div class="custom-marker">
            <img src="${iconUrl}" class="marker-icon" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=&quot;marker-fallback&quot; style=&quot;background: ${currentColor}&quot;>●<div class=&quot;marker-value&quot; style=&quot;background: ${currentColor}&quot;>${isolineValue}</div></div>';" />
            <div class="marker-value" style="background: ${currentColor}">${isolineValue}</div>
        </div>
    `;
    
    const marker = new maplibregl.Marker({
        element: markerElement,
        anchor: 'center'
    })
        .setLngLat([coordinates[0], coordinates[1]])
        .addTo(map);
    
    marker._markerId = markerId;
    markers.push(marker);
    
    return markerId;
}

function removeMarker(markerId) {
    const markerIndex = markers.findIndex(marker => marker._markerId === markerId);
    if (markerIndex !== -1) {
        markers[markerIndex].remove();
        markers.splice(markerIndex, 1);
    }
}

async function fetchIsoline(coordinates, travelMode, isolineType, isolineValue) {
    const [lng, lat] = coordinates;
    
    const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lng.toString(),
        type: isolineType,
        mode: travelMode,
        apiKey: GEOAPIFY_API_KEY
    });
    
    if (isolineType === 'time') {
        params.append('range', (parseInt(isolineValue) * 60).toString()); // Convert minutes to seconds
    } else {
        params.append('range', (parseFloat(isolineValue) * 1000).toString()); // Convert km to meters
    }
    
    const url = `https://api.geoapify.com/v1/isoline?${params.toString()}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.features || data.features.length === 0) {
        throw new Error('No isoline data returned from API');
    }
    
    return data;
}

function addIsolineToMap(isolineData, markerId) {
    const color = COLORS[currentColorIndex];
    
    isolineData.features.forEach(feature => {
        feature.properties.color = color;
        feature.properties.markerId = markerId;
    });
    
    const currentData = map.getSource('isolines')._data;
    
    currentData.features.push(...isolineData.features);
    
    map.getSource('isolines').setData(currentData);
    
    currentColorIndex = (currentColorIndex + 1) % COLORS.length;
    
    if (isolineData.features.length > 0) {
        try {
            const bounds = new maplibregl.LngLatBounds();
            
            isolineData.features.forEach(feature => {
                if (feature.geometry && feature.geometry.type === 'Polygon' && feature.geometry.coordinates) {
                    feature.geometry.coordinates[0].forEach(coord => {
                        if (coord && coord.length >= 2) {
                            bounds.extend([coord[0], coord[1]]);
                        }
                    });
                }
            });
            
            if (!bounds.isEmpty()) {
                map.fitBounds(bounds, { padding: 50 });
            }
        } catch (error) {
            console.error('Error fitting bounds:', error);
        }
    }
}

function showLoadingIndicator() {
    const loadingIndicator = document.getElementById('loading-indicator');
    loadingIndicator.classList.remove('hidden');
}

function hideLoadingIndicator() {
    const loadingIndicator = document.getElementById('loading-indicator');
    loadingIndicator.classList.add('hidden');
}

function clearAll() {
    // Clear all markers
    markers.forEach(marker => {
        marker.remove();
    });
    markers = [];
    
    // Clear all isolines
    map.getSource('isolines').setData({
        'type': 'FeatureCollection',
        'features': []
    });
    
    // Reset counters
    markerCounter = 0;
    currentColorIndex = 0;
}