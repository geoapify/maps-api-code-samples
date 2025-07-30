class MapMatchingAPI {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.geoapify.com/v1/mapmatching';
    }

    async performMapMatching(gpxData, travelMode) {
        if (!gpxData || gpxData.length === 0) {
            throw new Error('No GPS data available. Please upload a GPX file first.');
        }

        const requestData = {
            mode: travelMode,
            waypoints: gpxData.map(point => {
                const data = {
                    location: point.location
                };
                
                if (point.timestamp) {
                    data.timestamp = point.timestamp;
                }
                
                return data;
            })
        };

        const response = await fetch(`${this.baseUrl}?apiKey=${this.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `API request failed with status ${response.status}`);
        }

        const matchingResult = await response.json();
        
        if (!matchingResult.features || matchingResult.features.length === 0) {
            throw new Error('No matching results returned from API');
        }

        return matchingResult;
    }
}

if (typeof window !== 'undefined') {
    window.MapMatchingAPI = MapMatchingAPI;
} 