Chart.register(
    Chart.LineElement,
    Chart.LineController,
    Chart.Legend,
    Chart.Tooltip,
    Chart.LinearScale,
    Chart.PointElement,
    Chart.Filler,
    Chart.Title
);

let chartInstance;

export function createElevationChart(routeData) {
    destroyChart();
    
    if (!routeData) {
        return;
    }
    
    let feature;
    
    if (routeData.type === 'Feature') {
        feature = routeData;
    } else if (routeData.type === 'FeatureCollection' && routeData.features && routeData.features.length > 0) {
        feature = routeData.features[0];
    } else {
        console.error('Unexpected route data format for elevation chart:', routeData);
        return;
    }
    
    const elevationData = calculateElevationProfileData(feature);
    
    if (elevationData.data.length === 0) {
        return;
    }
    
    drawElevationProfile(elevationData);
    updateRouteStats(feature, elevationData);
    showElements();
}

export function calculateElevationProfileData(feature) {
    const legs = feature.properties.legs || [];
    const labels = [];
    const data = [];
    
    let totalDistance = 0;
    
    legs.forEach((leg, index) => {
        if (leg.elevation_range) {
            leg.elevation_range.forEach(([distance, elevation]) => {
                labels.push(totalDistance + distance);
                data.push(elevation);
            });
            totalDistance += leg.distance;
        }
    });
    
    // Optimize data for performance
    const optimizedLabels = [];
    const optimizedData = [];
    const minDist = 50; // 50m
    const minHeight = 5; // 5m
    
    labels.forEach((dist, index) => {
        if (index === 0 || index === labels.length - 1 ||
            (dist - optimizedLabels[optimizedLabels.length - 1]) > minDist ||
            Math.abs(data[index] - optimizedData[optimizedData.length - 1]) > minHeight) {
            optimizedLabels.push(dist);
            optimizedData.push(data[index]);
        }
    });
    
    return {
        labels: optimizedLabels,
        data: optimizedData,
        rawData: data
    };
}

export function drawElevationProfile(elevationData) {
    const canvas = document.getElementById('chart');
    const ctx = canvas.getContext('2d');
    
    const chartData = {
        labels: elevationData.labels,
        datasets: [{
            data: elevationData.data,
            fill: true,
            borderColor: '#007bff',
            backgroundColor: 'rgba(0, 123, 255, 0.1)',
            tension: 0.1,
            pointRadius: 0,
            spanGaps: true
        }]
    };
    
    const config = {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear',
                    min: Math.min(...elevationData.labels),
                    max: Math.max(...elevationData.labels),
                    title: {
                        display: true,
                        text: 'Distance (m)'
                    }
                },
                y: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Elevation (m)'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Elevation Profile'
                },
                legend: {
                    display: false
                },
                tooltip: {
                    displayColors: false,
                    callbacks: {
                        title: (tooltipItems) => {
                            return "Distance: " + Math.round(tooltipItems[0].label) + 'm';
                        },
                        label: (tooltipItem) => {
                            return "Elevation: " + Math.round(tooltipItem.raw) + 'm';
                        },
                    }
                }
            }
        }
    };
    
    chartInstance = new Chart(ctx, config);
}

export function updateRouteStats(feature, elevationData) {
    const properties = feature.properties;
    const distance = properties.distance || 0;
    const time = properties.time || 0;
    
    const elevationStats = calculateElevationStats(elevationData.rawData);
    
    document.getElementById('distance').textContent = formatDistance(distance);
    document.getElementById('duration').textContent = formatDuration(time);
    document.getElementById('elevation-gain').textContent = formatElevation(elevationStats.gain);
    document.getElementById('elevation-loss').textContent = formatElevation(elevationStats.loss);
}

export function calculateElevationStats(elevationData) {
    let gain = 0;
    let loss = 0;
    
    for (let i = 1; i < elevationData.length; i++) {
        const diff = elevationData[i] - elevationData[i - 1];
        if (diff > 0) {
            gain += diff;
        } else {
            loss += Math.abs(diff);
        }
    }
    
    return { gain, loss };
}

export function formatDistance(meters) {
    if (meters >= 1000) {
        return (meters / 1000).toFixed(1) + ' km';
    }
    return Math.round(meters) + ' m';
}

export function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}

export function formatElevation(meters) {
    return Math.round(meters) + ' m';
}

export function showElements() {
    document.getElementById('info-panel').classList.add('hidden');
    document.getElementById('stats').classList.remove('hidden');
    document.getElementById('elevation-chart').classList.remove('hidden');
}

export function hideElements() {
    document.getElementById('info-panel').classList.remove('hidden');
    document.getElementById('stats').classList.add('hidden');
    document.getElementById('elevation-chart').classList.add('hidden');
}

export function destroyChart() {
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
}

// Export for non-module usage
window.createElevationChart = createElevationChart;
window.destroyChart = destroyChart;
window.hideElements = hideElements; 