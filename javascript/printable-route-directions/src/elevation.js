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

export function loadElevationData(routeData) {
    destroyChart();
    let elevationData = calculateElevationProfileData(routeData);
    drawElevationProfile(routeData, elevationData);
}

export function calculateElevationProfileData(routeData) {
    const legElevations = [];

    // elevation_range contains pairs [distance, elevation] for every leg geometry point
    routeData.properties.legs.forEach(leg => {
        if (leg.elevation_range) {
            legElevations.push(leg.elevation_range);
        } else {
            legElevations.push([]);
        }
    });

    let labels = [];
    let data = [];

    legElevations.forEach((legElevation, index) => {
        let previousLegsDistance = 0;
        for (let i = 0; i <= index - 1; i++) {
            previousLegsDistance += legElevations[i][legElevations[i].length - 1][0];
        }

        labels.push(...legElevation.map(elevationData => elevationData[0] + previousLegsDistance));
        data.push(...legElevation.map(elevationData => elevationData[1]));
    });

    // optimize array size to avoid performance problems
    const labelsOptimized = [];
    const dataOptimized = [];
    const minDist = 5; // 5m
    const minHeight = 10; // ~10m

    labels.forEach((dist, index) => {
        if (index === 0 || index === labels.length - 1 ||
            (dist - labelsOptimized[labelsOptimized.length - 1]) > minDist ||
            Math.abs(data[index] - dataOptimized[dataOptimized.length - 1]) > minHeight) {
            labelsOptimized.push(dist);
            dataOptimized.push(data[index]);
        }
    });

    return {
        data: dataOptimized,
        labels: labelsOptimized
    }
}

export function drawElevationProfile(routeData, elevationData) {
    const ctx = document.getElementById("route-elevation-chart").getContext("2d");
    const chartData = {
        labels: elevationData.labels,
        datasets: [{
            data: elevationData.data,
            fill: true,
            borderColor: '#66ccff',
            backgroundColor: '#66ccff66',
            tension: 0.1,
            pointRadius: 0,
            spanGaps: true
        }]
    };


    const config = {
        type: 'line',
        data: chartData,
        plugins: [{
            beforeInit: (chart, args, options) => {
                const maxHeight = Math.max(...chart.data.datasets[0].data);

                chart.options.scales.x.min = Math.min(...chart.data.labels);
                chart.options.scales.x.max = Math.max(...chart.data.labels);
                chart.options.scales.y.max = maxHeight + Math.round(maxHeight * 0.2);
                chart.options.scales.y1.max = maxHeight + Math.round(maxHeight * 0.2);
            }
        }],
        options: {
            onHover: function(e, item) {
                // add hover here!!!
            },
            animation: false,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index',
            },
            tooltip: {
                position: 'nearest'
            },
            scales: {
                x: {
                    type: 'linear'
                },
                y: {
                    type: 'linear',
                    beginAtZero: true
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    // grid line settings
                    grid: {
                        drawOnChartArea: false, // only want the grid lines for one axis to show up
                    },
                },
            },
            plugins: {
                title: {
                    align: "end",
                    display: true,
                    text: "Distance, m / Elevation, m"
                },
                legend: {
                    display: false
                },
                tooltip: {
                    displayColors: false,
                    callbacks: {
                        title: (tooltipItems) => {
                            return "Distance: " + tooltipItems[0].label + 'm'
                        },
                        label: (tooltipItem) => {
                            return "Elevation: " + tooltipItem.raw + 'm'
                        },
                    }
                }
            }
        }
    };

    chartInstance = new Chart(ctx, config);
    updateChartVisibility();
}

export function updateChartVisibility() {
    const chartContainer = document.getElementById("chart-container");
    if (chartInstance) {
        chartContainer.classList.remove("hidden");
    } else {
        chartContainer.classList.add("hidden");
    }
}

export function destroyChart() {
    if(chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
        updateChartVisibility();
    }
}

// Exported like this, as in the combined demo we can't use import/exports.
window.loadElevationData = loadElevationData;
window.calculateElevationProfileData = calculateElevationProfileData;
window.drawElevationProfile = drawElevationProfile;
window.updateChartVisibility = updateChartVisibility;
window.destroyChart = destroyChart;