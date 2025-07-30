class FileUtils {
    constructor(maxPoints = 1000) {
        this.maxPoints = maxPoints;
    }

    parseGpxFile(gpxContent) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(gpxContent, 'application/xml');
        
        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
            throw new Error('Invalid XML format');
        }

        const geoJson = toGeoJSON.gpx(xmlDoc);
        
        if (!geoJson.features || geoJson.features.length === 0) {
            throw new Error('No track data found in GPX file');
        }

        const coordinates = [];
        const timestamps = [];
        
        geoJson.features.forEach(feature => {
            if (feature.geometry.type === 'LineString') {
                feature.geometry.coordinates.forEach((coord, index) => {
                    coordinates.push([coord[0], coord[1]]);
                    
                    if (feature.properties && feature.properties.coordTimes && feature.properties.coordTimes[index]) {
                        timestamps.push(feature.properties.coordTimes[index]);
                    }
                });
            }
        });

        if (coordinates.length === 0) {
            throw new Error('No valid coordinates found in GPX file');
        }

        return this.processCoordinates(coordinates, timestamps);
    }

    processCoordinates(coordinates, timestamps) {
        let finalCoordinates = coordinates;
        let finalTimestamps = timestamps;
        let simplificationApplied = false;
        const originalCount = coordinates.length;

        if (coordinates.length > this.maxPoints) {
            const result = this.simplifyPolyline(coordinates, timestamps, this.maxPoints);
            finalCoordinates = result.coordinates;
            finalTimestamps = result.timestamps;
            simplificationApplied = true;
            
            console.log(`Route simplified from ${originalCount} to ${finalCoordinates.length} points`);
        }

        const gpxData = finalCoordinates.map((coord, index) => ({
            location: coord,
            timestamp: finalTimestamps[index] || undefined
        }));

        return {
            gpxData,
            coordinates: finalCoordinates,
            simplificationApplied,
            originalCount
        };
    }

    simplifyPolyline(coordinates, timestamps, maxPoints) {
        if (coordinates.length <= maxPoints) {
            return { coordinates, timestamps };
        }
        
        // Combine coordinates and timestamps into point objects
        const points = coordinates.map(([lng, lat], i) => ({
            x: lng,
            y: lat,
            t: timestamps[i] || null
        }));
        
        // Use simplify-js with progressive tolerance values
        let simplified = points;
        for (const tolerance of [0.00001, 0.0001, 0.001, 0.01, 0.1]) {
            if (simplified.length <= maxPoints) break;
            simplified = simplify(simplified, tolerance, true);
        }
        
        // If still exceeds maxPoints, keep every Nth point
        if (simplified.length > maxPoints) {
            const skipFactor = Math.ceil(simplified.length / maxPoints);
            const fallbackPoints = [simplified[0]]; // Always include first point
            
            for (let i = skipFactor; i < simplified.length - 1; i += skipFactor) {
                fallbackPoints.push(simplified[i]);
            }
            
            // Always include last point if not already included
            const lastPoint = simplified[simplified.length - 1];
            if (fallbackPoints[fallbackPoints.length - 1] !== lastPoint) {
                fallbackPoints.push(lastPoint);
            }
            
            simplified = fallbackPoints;
        }
        
        return {
            coordinates: simplified.map(pt => [pt.x, pt.y]),
            timestamps: simplified.map(pt => pt.t)
        };
    }

    calculateHaversineDistance(coord1, coord2) {
        const R = 6371000; // Earth's radius in meters
        const lat1 = coord1[1] * Math.PI / 180;
        const lat2 = coord2[1] * Math.PI / 180;
        const deltaLat = (coord2[1] - coord1[1]) * Math.PI / 180;
        const deltaLon = (coord2[0] - coord1[0]) * Math.PI / 180;

        const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
                  Math.cos(lat1) * Math.cos(lat2) *
                  Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}h ${minutes}m ${remainingSeconds}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        } else {
            return `${remainingSeconds}s`;
        }
    }

    downloadGeoJSON(matchingData, fileName = null) {
        if (!matchingData) {
            throw new Error('No matched route data available. Please match a route first.');
        }

        const geoJsonData = {
            type: 'FeatureCollection',
            features: matchingData.features
        };

        this.downloadFile(
            JSON.stringify(geoJsonData, null, 2),
            'application/json',
            fileName || `matched-route-${new Date().toISOString().split('T')[0]}.geojson`
        );
    }

    downloadGPX(matchingData, originalFileName = null) {
        if (!matchingData) {
            throw new Error('No matched route data available. Please match a route first.');
        }

        const options = {
            creator: 'GPX Map Matching Tool',
            metadata: {
                name: `Matched Route - ${originalFileName || 'Unknown'}`,
                time: new Date()
            }
        };

        const gpxContent = window.togpx(matchingData, options);
        
        this.downloadFile(
            gpxContent,
            'application/gpx+xml',
            `matched-route-${new Date().toISOString().split('T')[0]}.gpx`
        );
    }

    downloadFile(content, mimeType, fileName) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    }
}

if (typeof window !== 'undefined') {
    window.FileUtils = FileUtils;
} 