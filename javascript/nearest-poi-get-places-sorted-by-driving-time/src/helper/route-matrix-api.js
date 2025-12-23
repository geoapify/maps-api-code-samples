export class RouteMatrixAPI {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.geoapify.com/v1/routematrix';
    }

    async calculateTravelTimes(origin, destinations, mode = 'drive') {
        const sources = [{
            location: [origin.lng, origin.lat]
        }];
        
        const targets = destinations.map(dest => ({
            location: [dest.coordinates.lng, dest.coordinates.lat]
        }));

        const requestBody = {
            mode: mode,
            sources: sources,
            targets: targets
        };

        try {
            const response = await fetch(`${this.baseUrl}?apiKey=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Route Matrix API error response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
            }

            const data = await response.json();
            return this.processMatrixResults(data, destinations);
        } catch (error) {
            console.error('Error calculating travel times:', error);
            throw error;
        }
    }

    processMatrixResults(matrixData, destinations) {
        const results = [];
        
        if (!matrixData.sources_to_targets || !matrixData.sources_to_targets[0]) {
            throw new Error('Invalid matrix response');
        }

        const matrixRow = matrixData.sources_to_targets[0];
        
        destinations.forEach((destination, index) => {
            const matrixCell = matrixRow[index];
            
            if (matrixCell && matrixCell.time !== undefined && matrixCell.distance !== undefined) {
                results.push({
                    ...destination,
                    travelTime: matrixCell.time,
                    distance: matrixCell.distance,
                    travelTimeFormatted: this.formatTime(matrixCell.time),
                    distanceFormatted: this.formatDistance(matrixCell.distance)
                });
            } else {
                results.push({
                    ...destination,
                    travelTime: null,
                    distance: null,
                    travelTimeFormatted: 'N/A',
                    distanceFormatted: 'N/A'
                });
            }
        });
        return results.sort((a, b) => {
            if (a.travelTime === null) return 1;
            if (b.travelTime === null) return -1;
            return a.travelTime - b.travelTime;
        });
    }

    formatTime(seconds) {
        if (seconds === null || seconds === undefined) return 'N/A';
        
        const minutes = Math.round(seconds / 60);
        
        if (minutes < 5) {
            return `${Math.floor(seconds / 60)} min ${seconds % 60} sec`;
        } else if (minutes < 60) {
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
    window.RouteMatrixAPI = RouteMatrixAPI;
} 