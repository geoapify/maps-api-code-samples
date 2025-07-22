import { createElevationChart, destroyChart, hideElements } from './elevation.js';

const apiKey = "27a3c5f9a6754da28283d1995edb9467";

const map = new maplibregl.Map({
    container: 'map',
    style: `https://maps.geoapify.com/v1/styles/osm-bright-smooth/style.json?apiKey=${apiKey}`,
    center: [11.5753989, 48.1500327], // Munich (lng, lat)
    zoom: 6
});

map.addControl(new maplibregl.NavigationControl(), 'bottom-right');

let waypoints = [];
let markers = [];
let currentMode = 'drive';

map.on('click', handleMapClick);
map.on('load', onMapLoad);

const routeDirections = new directions.RouteDirections(document.getElementById("route-directions"), apiKey, {
    supportedModes: ['walk', 'hike', 'scooter', 'motorcycle', 'drive', 'light_truck', 'medium_truck', 'truck', 'bicycle', 'mountain_bike', 'road_bike', 'bus'],
    elevation: true,
    noStopover: true
}, {
    placeholder: "Enter an address here or click on the map"
});

routeDirections.on('waypointChanged', (waypoint, reason) => {
    const options = routeDirections.getOptions();
    currentMode = options.mode || 'drive';
    
    const componentWaypoints = options.waypoints.filter(w => w.lat && w.lon);
    waypoints = componentWaypoints.map(w => [w.lon, w.lat]);
    
    updateMarkers();
    
    if (waypoints.length < 2) {
        clearRouteVisualization();
        resetInfoPanel();
    }
});

routeDirections.on('modeChanged', (mode) => {
    currentMode = mode;
});

routeDirections.on('routeCalculated', (geojson) => {
    visualizeRoute(geojson);
    createElevationChart(geojson);
});

function onMapLoad() {
    // Add route source
    map.addSource('route', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: []
        }
    });

    map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
            'line-join': 'round',
            'line-cap': 'round'
        },
        paint: {
            'line-color': '#007bff',
            'line-width': 6
        }
    });
}

function handleMapClick(e) {
    const coords = e.lngLat;
    routeDirections.addLocation(coords.lat, coords.lng);
}

function updateMarkers() {
    markers.forEach(marker => marker.remove());
    markers = [];
    
    waypoints.forEach((waypoint, index) => {
        const marker = new maplibregl.Marker({
            color: index === 0 ? '#28a745' : '#dc3545'
        })
        .setLngLat([waypoint[0], waypoint[1]])
        .setPopup(new maplibregl.Popup().setHTML(`
            <div>
                <strong>${index === 0 ? 'Start' : 'End'}</strong><br>
                ${waypoint[1].toFixed(4)}, ${waypoint[0].toFixed(4)}
            </div>
        `))
        .addTo(map);
        
        markers.push(marker);
    });
}

function resetInfoPanel() {
    const infoPanel = document.getElementById('info-panel');
    const infoParagraph = infoPanel.querySelector('p');
    
    infoParagraph.textContent = 'Click two points on the map to create a route and see the elevation profile.';
    infoPanel.classList.remove('error');
}

function visualizeRoute(routeData) {
    let geoJsonData;
    let routeFeature;
    
    if (routeData.type === 'Feature') {
        geoJsonData = {
            type: 'FeatureCollection',
            features: [routeData]
        };
        routeFeature = routeData;
    } else if (routeData.type === 'FeatureCollection' && routeData.features && routeData.features.length > 0) {
        geoJsonData = routeData;
        routeFeature = routeData.features[0];
    } else {
        console.error('Unexpected route data format:', routeData);
        return;
    }
    
    map.getSource('route').setData(geoJsonData);

    if (routeFeature && routeFeature.geometry && routeFeature.geometry.coordinates) {
        const coordinates = routeFeature.geometry.coordinates;
        const bounds = new maplibregl.LngLatBounds();
        
        if (routeFeature.geometry.type === 'MultiLineString') {
            coordinates.forEach(lineString => {
                lineString.forEach(coord => {
                    bounds.extend(coord);
                });
            });
        } else {
            coordinates.forEach(coord => {
                bounds.extend(coord);
            });
        }
        
        waypoints.forEach(waypoint => {
            bounds.extend([waypoint[0], waypoint[1]]);
        });
        
        map.fitBounds(bounds, {
            padding: {
                top: 200,
                bottom: 400, // Extra space for elevation panel
                left: 200,
                right: 200
            },
            duration: 1000 // Smooth animation
        });
    }
}

function clearRouteVisualization() {
    if (map.getSource('route')) {
        map.getSource('route').setData({
            type: 'FeatureCollection',
            features: []
        });
    }
    
    destroyChart();
    hideElements();
}