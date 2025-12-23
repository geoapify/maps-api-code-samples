export class PlacesAPI {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.geoapify.com/v2/places';
    }

    async findSupermarkets(location, radius = 10000, limit = 10) {
        const { lat, lng } = location;
        
        const params = new URLSearchParams({
            categories: 'commercial.supermarket',
            filter: `circle:${lng},${lat},${radius}`,
            bias: `proximity:${lng},${lat}`,
            limit: limit,
            apiKey: this.apiKey
        });
        
        const url = `${this.baseUrl}?${params.toString()}`;
        
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return this.processSupermarkets(data.features || []);
        } catch (error) {
            console.error('Error fetching supermarkets:', error);
            throw error;
        }
    }

    processSupermarkets(features) {
        return features.map((feature, index) => {
            const props = feature.properties;
            const geometry = feature.geometry;
            
            return {
                id: props.place_id || `supermarket_${index}`,
                name: props.name || 'Unknown Supermarket',
                address: props.formatted || 'No address available',
                coordinates: {
                    lat: geometry.coordinates[1],
                    lng: geometry.coordinates[0]
                },
                categories: props.categories || [],
                contact: {
                    phone: props.contact?.phone,
                    website: props.website || props.contact?.website
                },
                original: feature
            };
        });
    }


}


if (typeof window !== 'undefined') {
    window.PlacesAPI = PlacesAPI;
} 