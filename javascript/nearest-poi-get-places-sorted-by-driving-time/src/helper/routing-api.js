export class RoutingAPI {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.geoapify.com/v1/routing';
    }

    async getRoute(origin, destination, mode = 'drive') {
        const params = new URLSearchParams({
            waypoints: `${origin.lat},${origin.lng}|${destination.coordinates.lat},${destination.coordinates.lng}`,
            mode: mode,
            apiKey: this.apiKey
        });
        
        const url = `${this.baseUrl}?${params.toString()}`;
        
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return this.processRouteData(data, origin, destination);
        } catch (error) {
            console.error('Error fetching route:', error);
            throw error;
        }
    }

    processRouteData(routeData, origin, destination) {
        if (!routeData.features || routeData.features.length === 0) {
            throw new Error('No route found');
        }

        const route = routeData.features[0];
        const properties = route.properties;
        
        return {
            geometry: route.geometry,
            distance: properties.distance,
            time: properties.time,
            distanceFormatted: this.formatDistance(properties.distance),
            timeFormatted: this.formatTime(properties.time),
            origin: origin,
            destination: destination,
            mode: properties.mode || 'drive',
            waypoints: properties.waypoints || []
        };
    }

    formatTime(seconds) {
        if (seconds === null || seconds === undefined) return 'N/A';
        
        const minutes = Math.round(seconds / 60);
        
        if (minutes < 60) {
            return `${minutes} min`;
        } else {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
        }
    }

    formatDistance(meters) {
        if (meters === null || meters === undefined) return 'N/A';
        
        if (meters < 1000) {
            return `${Math.round(meters)} m`;
        } else {
            const kilometers = (meters / 1000).toFixed(1);
            return `${kilometers} km`;
        }
    }


}


if (typeof window !== 'undefined') {
    window.RoutingAPI = RoutingAPI;
} 