const ROAD_COLORS = {
    'motorway': '#009933',
    'trunk': '#00cc99',
    'primary': '#009999',
    'secondary': '#00ccff',
    'tertiary': '#9999ff',
    'residential': '#9933ff',
    'service_other': '#ffcc66',
    'unclassified': '#666699'
};

const LAYER_STYLES = {
    GPS_TRACE_LINE: {
        'line-color': '#666666',
        'line-width': 4,
        'line-opacity': 0.8,
        'line-dasharray': [10, 5]
    },
    GPS_TRACE_POINTS: {
        'circle-radius': 4,
        'circle-color': '#000000',
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
        'circle-opacity': 0.9
    },
    MATCHED_TRACE_POINTS: {
        'circle-radius': 5,
        'circle-color': '#ffffff',
        'circle-stroke-color': '#007bff',
        'circle-stroke-width': 2,
        'circle-opacity': 0.9
    }
};

const MAP_CONFIG = {
    MAX_DISPLAY_POINTS: 50,
    BOUNDS_PADDING: 50
};

class MapMatchingMap {
    constructor(apiKey, defaultCenter, defaultZoom) {
        this.apiKey = apiKey;
        this.defaultCenter = defaultCenter;
        this.defaultZoom = defaultZoom;
        this.map = null;
        this.popup = null;
    }

    initialize(containerId) {
        this.map = new maplibregl.Map({
            container: containerId,
            style: `https://maps.geoapify.com/v1/styles/osm-bright/style.json?apiKey=${this.apiKey}`,
            center: this.defaultCenter,
            zoom: this.defaultZoom
        });

        this.map.addControl(new maplibregl.NavigationControl());

        return new Promise((resolve, reject) => {
            this.map.on('load', () => {
                try {
                    this.setupLayers();
                    this.setupPopup();
                    resolve(this.map);
                } catch (error) {
                    console.error('Error during map setup:', error);
                    reject(error);
                }
            });
            
            this.map.on('error', (error) => {
                console.error('Map error:', error);
                reject(error);
            });
        });
    }

    setupLayers() {
        this.map.addSource('gps-trace', {
            'type': 'geojson',
            'data': {
                'type': 'FeatureCollection',
                'features': []
            }
        });

        this.map.addLayer({
            'id': 'gps-trace-line',
            'type': 'line',
            'source': 'gps-trace',
            'paint': LAYER_STYLES.GPS_TRACE_LINE
        });

        this.map.addLayer({
            'id': 'gps-trace-points',
            'type': 'circle',
            'source': 'gps-trace',
            'filter': ['==', '$type', 'Point'],
            'paint': LAYER_STYLES.GPS_TRACE_POINTS
        });

        this.map.addSource('matched-trace', {
            'type': 'geojson',
            'data': {
                'type': 'FeatureCollection',
                'features': []
            }
        });

        this.map.addLayer({
            'id': 'matched-trace-line',
            'type': 'line',
            'source': 'matched-trace',
            'paint': {
                'line-color': this.createRoadColorExpression(),
                'line-width': 5,
                'line-opacity': 0.8
            }
        });

        this.map.addLayer({
            'id': 'matched-trace-points',
            'type': 'circle',
            'source': 'matched-trace',
            'filter': ['==', '$type', 'Point'],
            'paint': LAYER_STYLES.MATCHED_TRACE_POINTS
        });
    }

    createRoadColorExpression() {
        const expression = ['match', ['get', 'road_class']];
        
        Object.entries(ROAD_COLORS).forEach(([roadClass, color]) => {
            expression.push(roadClass, color);
        });
        
        expression.push('#007bff'); // default color
        return expression;
    }

    setupPopup() {
        this.popup = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false
        });

        this.map.on('mouseenter', 'matched-trace-line', (e) => {
            this.map.getCanvas().style.cursor = 'pointer';
            
            const properties = e.features[0].properties;
            const coords = e.lngLat;
            const roadClass = properties.road_class || 'unknown';
            const roadColor = ROAD_COLORS[roadClass] || '#007bff';
            
            this.popup.setLngLat(coords)
                .setHTML(this.createPopupContent(properties, roadClass, roadColor))
                .addTo(this.map);
        });

        this.map.on('mouseleave', 'matched-trace-line', () => {
            this.map.getCanvas().style.cursor = '';
            this.popup.remove();
        });
    }

    createPopupContent(properties, roadClass, roadColor) {
        return `
            <div class="popup-title">Road Information</div>
            ${properties.name ? `<div class="popup-info"><strong>Name:</strong> ${properties.name}</div>` : ''}
            <div class="popup-info"><strong>Road Class:</strong> <span style="color: ${roadColor}; font-weight: bold;">${roadClass}</span></div>
            ${properties.surface ? `<div class="popup-info"><strong>Surface:</strong> ${properties.surface}</div>` : ''}
            ${properties.speed_limit ? `<div class="popup-info"><strong>Speed Limit:</strong> ${properties.speed_limit} km/h</div>` : ''}
            ${properties.lane_count ? `<div class="popup-info"><strong>Lanes:</strong> ${properties.lane_count}</div>` : ''}
            ${properties.distance ? `<div class="popup-info"><strong>Distance:</strong> ${Math.round(properties.distance)} m</div>` : ''}
            ${properties.time ? `<div class="popup-info"><strong>Time:</strong> ${Math.round(properties.time)} s</div>` : ''}
        `;
    }

    displayGpsTrace(coordinates) {
        const lineFeature = {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: coordinates
            },
            properties: {}
        };

        const pointFeatures = this.createDisplayPoints(coordinates);

        this.map.getSource('gps-trace').setData({
            type: 'FeatureCollection',
            features: [lineFeature, ...pointFeatures]
        });

        this.fitBounds(coordinates);
    }

    createDisplayPoints(coordinates) {
        const pointFeatures = [];
        const step = Math.max(1, Math.floor(coordinates.length / MAP_CONFIG.MAX_DISPLAY_POINTS));
        
        for (let i = 0; i < coordinates.length; i += step) {
            pointFeatures.push({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: coordinates[i]
                },
                properties: { type: 'gps-point' }
            });
        }

        if ((coordinates.length - 1) % step !== 0) {
            pointFeatures.push({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: coordinates[coordinates.length - 1]
                },
                properties: { type: 'gps-point' }
            });
        }

        return pointFeatures;
    }

    displayMatchedTrace(matchingData) {
        const features = [];
        
        matchingData.features.forEach(feature => {
            if (feature.geometry.type === 'MultiLineString') {
                feature.properties.legs.forEach((leg, legIndex) => {
                    const legCoordinates = feature.geometry.coordinates[legIndex];
                    
                    leg.steps.forEach((step, stepIndex) => {
                        const stepCoordinates = legCoordinates.slice(step.from_index, step.to_index + 1);
                        
                        features.push({
                            type: 'Feature',
                            geometry: {
                                type: 'LineString',
                                coordinates: stepCoordinates
                            },
                            properties: step
                        });

                        if (stepIndex > 0) {
                            features.push({
                                type: 'Feature',
                                geometry: {
                                    type: 'Point',
                                    coordinates: stepCoordinates[0]
                                },
                                properties: step
                            });
                        }
                    });
                });
            }
        });

        this.map.getSource('matched-trace').setData({
            type: 'FeatureCollection',
            features: features
        });
    }

    clearDisplay() {
        if (this.map.getSource('gps-trace')) {
            this.map.getSource('gps-trace').setData({
                type: 'FeatureCollection',
                features: []
            });
        }

        if (this.map.getSource('matched-trace')) {
            this.map.getSource('matched-trace').setData({
                type: 'FeatureCollection',
                features: []
            });
        }
    }

    fitBounds(coordinates) {
        const bounds = new maplibregl.LngLatBounds();
        coordinates.forEach(coord => bounds.extend(coord));
        this.map.fitBounds(bounds, { padding: MAP_CONFIG.BOUNDS_PADDING });
    }

    resetView() {
        this.map.flyTo({
            center: this.defaultCenter,
            zoom: this.defaultZoom
        });
    }
}

if (typeof window !== 'undefined') {
    window.MapMatchingMap = MapMatchingMap;
} 