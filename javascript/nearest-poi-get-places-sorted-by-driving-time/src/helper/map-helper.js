export class MapHelper {
    constructor(apiKey, defaultCenter, defaultZoom) {
        this.apiKey = apiKey;
        this.defaultCenter = defaultCenter;
        this.defaultZoom = defaultZoom;
        this.map = null;
        this.routeLayerId = 'route-layer';
        this.routeSourceId = 'route-source';
    }

    initialize(containerId) {
        this.map = new maplibregl.Map({
            container: containerId,
            style: `https://maps.geoapify.com/v1/styles/osm-bright/style.json?apiKey=${this.apiKey}`,
            center: this.defaultCenter,
            zoom: this.defaultZoom
        });

        this.map.addControl(new maplibregl.NavigationControl());

        this.map.on('load', () => {
            this.setupRouteLayer();
        });

        return this.map;
    }

    setupRouteLayer() {
        this.map.addSource(this.routeSourceId, {
            'type': 'geojson',
            'data': {
                'type': 'FeatureCollection',
                'features': []
            }
        });
        this.map.addLayer({
            'id': this.routeLayerId,
            'type': 'line',
            'source': this.routeSourceId,
            'layout': {
                'line-join': 'round',
                'line-cap': 'round'
            },
            'paint': {
                'line-color': '#007bff',
                'line-width': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    12, 4,
                    18, 12
                ]
            }
        });
    }

    onMapClick(callback) {
        this.map.on('click', (e) => {
            if (this.suppressMapClick) {
                return;
            }

            const features = this.map.queryRenderedFeatures(e.point, {
                layers: ['supermarket-markers']
            });
            
            if (features.length > 0) {
                return;
            }

            const { lat, lng } = e.lngLat;
            callback({ lat, lng });
        });
    }

    async setupUserLocationLayer() {
        if (!this.map.hasImage('user-location-icon')) {
            const iconUrl = `https://api.geoapify.com/v2/icon/?type=material&color=red&size=50&icon=location&iconType=awesome&contentSize=16&scaleFactor=2&apiKey=${this.apiKey}`;
            
            try {
                const image = await this.map.loadImage(iconUrl);
                this.map.addImage('user-location-icon', image.data);
            } catch (error) {
                console.error('Failed to load user location icon:', error);
            }
        }
        if (!this.map.getSource('user-location')) {
            this.map.addSource('user-location', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: []
                }
            });
        }
        if (!this.map.getLayer('user-location-icon')) {
            this.map.addLayer({
                id: 'user-location-icon',
                type: 'symbol',
                source: 'user-location',
                layout: {
                    'icon-image': 'user-location-icon',
                    'icon-ignore-placement': true,
                    'icon-size': 0.5,
                    'icon-anchor': 'bottom',
                    'icon-allow-overlap': true,
                    'icon-offset': [0, 5]
                }
            });
        }
    }

    async setUserLocation(location) {
        await this.setupUserLocationLayer();
        const feature = {
            type: 'Feature',
            properties: {
                type: 'user-location'
            },
            geometry: {
                type: 'Point',
                coordinates: [location.lng, location.lat]
            }
        };

        this.map.getSource('user-location').setData({
            type: 'FeatureCollection',
            features: [feature]
        });
    }

    async setupSupermarketLayers() {
        for (let i = 1; i <= 10; i++) {
            const iconName = `supermarket-icon-${i}`;
            if (!this.map.hasImage(iconName)) {
                const iconUrl = `https://api.geoapify.com/v2/icon/?type=awesome&color=%2300B894&size=50&text=${i}&iconType=awesome&contentSize=16&contentColor=%2300B894&scaleFactor=2&apiKey=${this.apiKey}`;
                
                try {
                    const image = await this.map.loadImage(iconUrl);
                    this.map.addImage(iconName, image.data);
                } catch (error) {
                    console.error(`Failed to load supermarket icon ${i}:`, error);
                }
            }
        }
        if (!this.map.getSource('supermarkets')) {
            this.map.addSource('supermarkets', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: []
                }
            });
        }

        if (!this.map.getLayer('supermarket-markers')) {
            this.map.addLayer({
                id: 'supermarket-markers',
                type: 'symbol',
                source: 'supermarkets',
                layout: {
                    'icon-image': ['concat', 'supermarket-icon-', ['to-string', ['get', 'rank']]],
                    'icon-size': 0.5,
                    'icon-ignore-placement': true,
                    'icon-anchor': 'bottom',
                    'icon-allow-overlap': true
                },
                paint: {
                    'icon-translate': [0, 6]
                }
            });
        }

        this.setupSupermarketEvents();
    }

    setupSupermarketEvents() {
        this.map.off('click', 'supermarket-markers');
        this.map.off('mouseenter', 'supermarket-markers');
        this.map.off('mouseleave', 'supermarket-markers');
        this.map.on('click', 'supermarket-markers', (e) => {
            this.handleSupermarketClick(e);
        });
        this.map.on('mouseenter', 'supermarket-markers', (e) => {
            this.map.getCanvas().style.cursor = 'pointer';
            if (this.onSupermarketHover && e.features && e.features.length > 0) {
                const supermarket = this.supermarketData.find(s => s.id === e.features[0].properties.id);
                if (supermarket) {
                    this.onSupermarketHover(supermarket, true);
                }
            }
        });
        
        this.map.on('mouseleave', 'supermarket-markers', (e) => {
            this.map.getCanvas().style.cursor = '';
            if (this.onSupermarketHover && e.features && e.features.length > 0) {
                const supermarket = this.supermarketData.find(s => s.id === e.features[0].properties.id);
                if (supermarket) {
                    this.onSupermarketHover(supermarket, false);
                }
            }
        });
    }

    handleSupermarketClick(e) {
        e.preventDefault();
        if (e.originalEvent) {
            e.originalEvent.stopPropagation();
        }

        this.suppressMapClick = true;
        setTimeout(() => {
            this.suppressMapClick = false;
        }, 50);

        const feature = e.features[0];
        const properties = feature.properties;

        const supermarket = this.supermarketData.find(s => s.id === properties.id);
        if (!supermarket) return;

        if (this.onSupermarketClick) {
            this.onSupermarketClick(supermarket);
        }
    }

    async addSupermarketMarkers(supermarkets, onMarkerHover, onMarkerClick) {
        this.onSupermarketHover = onMarkerHover;
        this.onSupermarketClick = onMarkerClick;
        this.supermarketData = supermarkets;

        await this.setupSupermarketLayers();
        const features = supermarkets.map((supermarket, index) => ({
            type: 'Feature',
            properties: {
                id: supermarket.id,
                rank: index + 1,
                name: supermarket.name || 'Unknown',
                address: supermarket.address || '',
                travelTime: supermarket.travelTime || 0,
                distance: supermarket.distance || 0,
                highlighted: false
            },
            geometry: {
                type: 'Point',
                coordinates: [supermarket.coordinates.lng, supermarket.coordinates.lat]
            }
        }));

        this.map.getSource('supermarkets').setData({
            type: 'FeatureCollection',
            features: features
        });

        if (this.map.getLayer('supermarket-markers')) {
            this.map.setLayoutProperty('supermarket-markers', 'icon-size', 0.5);
            this.map.setPaintProperty('supermarket-markers', 'icon-opacity', 1.0);
        }
    }



    highlightSupermarketMarker(supermarketId, highlight = true) {
        if (!this.supermarketData || !this.map.getSource('supermarkets')) return;

        const features = this.supermarketData.map((supermarket, index) => ({
            type: 'Feature',
            properties: {
                id: supermarket.id,
                rank: index + 1,
                name: supermarket.name || 'Unknown',
                address: supermarket.address || '',
                travelTime: supermarket.travelTime || 0,
                distance: supermarket.distance || 0,
                highlighted: highlight && supermarket.id === supermarketId
            },
            geometry: {
                type: 'Point',
                coordinates: [supermarket.coordinates.lng, supermarket.coordinates.lat]
            }
        }));

        this.map.getSource('supermarkets').setData({
            type: 'FeatureCollection',
            features: features
        });
        if (this.map.getLayer('supermarket-markers')) {
            this.map.setLayoutProperty('supermarket-markers', 'icon-size', [
                'case',
                ['get', 'highlighted'],
                0.6,
                highlight ? 0.4 : 0.5
            ]);
            
            this.map.setPaintProperty('supermarket-markers', 'icon-opacity', [
                'case',
                ['get', 'highlighted'],
                1.0,
                highlight ? 0.6 : 1.0
            ]);
        }
    }

    clearSupermarketMarkers() {
        if (this.map.getSource('supermarkets')) {
            this.map.getSource('supermarkets').setData({
                type: 'FeatureCollection',
                features: []
            });
        }
        this.supermarketData = [];
    }

    displayRoute(routeGeometry, mode = 'drive') {
        if (!this.map.getSource(this.routeSourceId)) {
            this.setupRouteLayer();
        }

        const routeGeoJSON = {
            'type': 'Feature',
            'properties': {},
            'geometry': routeGeometry
        };
        this.map.getSource(this.routeSourceId).setData({
            'type': 'FeatureCollection',
            'features': [routeGeoJSON]
        });
        const routeStyle = this.getRouteStyle(mode);
        Object.keys(routeStyle.paint).forEach(property => {
            this.map.setPaintProperty(this.routeLayerId, property, routeStyle.paint[property]);
        });
    }

    getRouteStyle(mode = 'drive') {
        switch (mode) {
            case 'walk':
                return {
                    'paint': {
                        'line-color': '#FF6B35',
                        'line-width': [
                            'interpolate',
                            ['linear'],
                            ['zoom'],
                            12, 3,
                            18, 8
                        ],
                        'line-dasharray': [2, 2]
                    }
                };
            case 'drive':
            default:
                return {
                    'paint': {
                        'line-color': '#007bff',
                        'line-width': [
                            'interpolate',
                            ['linear'],
                            ['zoom'],
                            12, 4,
                            18, 12
                        ]
                    }
                };
        }
    }

    clearRoute() {
        if (this.map.getSource(this.routeSourceId)) {
            this.map.getSource(this.routeSourceId).setData({
                'type': 'FeatureCollection',
                'features': []
            });
        }
    }

    fitToUserLocationAndMarkers(userLocation, supermarkets) {
        if (supermarkets.length === 0) {
            this.map.flyTo({
                center: [userLocation.lng, userLocation.lat],
                zoom: 15,
                duration: 1000
            });
            return;
        }
        const coordinates = [
            [userLocation.lng, userLocation.lat],
            ...supermarkets.map(s => [s.coordinates.lng, s.coordinates.lat])
        ];

        const bounds = coordinates.reduce((bounds, coord) => {
            return bounds.extend(coord);
        }, new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));

        this.map.fitBounds(bounds, {
            padding: 50,
            duration: 1000
        });
    }

    fitToRoute(routeGeometry) {
        if (!routeGeometry) {
            console.error('No route geometry provided');
            return;
        }
        
        let coordinates;
        
        if (routeGeometry.type === 'LineString' && routeGeometry.coordinates) {
            coordinates = routeGeometry.coordinates;
        } else if (routeGeometry.type === 'MultiLineString' && routeGeometry.coordinates) {
            coordinates = routeGeometry.coordinates.flat();
        } else if (Array.isArray(routeGeometry.coordinates)) {
            coordinates = routeGeometry.coordinates;
        } else {
            console.error('Invalid route geometry format:', routeGeometry);
            return;
        }
        
        if (!Array.isArray(coordinates) || coordinates.length === 0) {
            console.error('Invalid coordinates array:', coordinates);
            return;
        }
        
        let minLng = Infinity, minLat = Infinity;
        let maxLng = -Infinity, maxLat = -Infinity;
        
        coordinates.forEach(coord => {
            if (!Array.isArray(coord) || coord.length < 2) {
                console.warn('Invalid coordinate pair:', coord);
                return;
            }
            
            const lng = coord[0];
            const lat = coord[1];
            
            if (typeof lng !== 'number' || typeof lat !== 'number' || isNaN(lng) || isNaN(lat)) {
                console.warn('Invalid coordinate values:', lng, lat);
                return;
            }
            
            minLng = Math.min(minLng, lng);
            maxLng = Math.max(maxLng, lng);
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
        });
        if (!isFinite(minLng) || !isFinite(maxLng) || !isFinite(minLat) || !isFinite(maxLat)) {
            console.error('Could not calculate valid bounds from coordinates');
            return;
        }
        
        const bounds = new maplibregl.LngLatBounds([minLng, minLat], [maxLng, maxLat]);
        
        this.map.fitBounds(bounds, {
            padding: 50,
            duration: 1000
        });
    }

    resetToDefaultLocation() {
        this.map.flyTo({
            center: this.defaultCenter,
            zoom: this.defaultZoom,
            duration: 1000
        });
    }



    onLoad(callback) {
        this.map.on('load', callback);
    }
}


if (typeof window !== 'undefined') {
    window.MapHelper = MapHelper;
} 
