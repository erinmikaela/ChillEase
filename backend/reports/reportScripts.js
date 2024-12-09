// backend/reports/reportScripts.js

const BASE_URL = '/reports/api';
let chart;
let currentReportType = '';
let currentPeriod = '';

async function generateReport() {
    const reportType = document.getElementById('reportType').value;
    const period = document.getElementById('period').value;

    if (!reportType || !period) {
        alert('Please select a report type and period.');
        return;
    }

    currentReportType = reportType;
    currentPeriod = period;

    let endpoint = '';
    switch(reportType) {
        case 'service-utilization':
            endpoint = 'service-utilization';
            break;
        case 'user-registrations':
            endpoint = 'user-registrations';
            break;
        case 'daily-peak-times':
            endpoint = 'daily-peak-times';
            break;
        case 'transaction-status':
            endpoint = 'transaction-status';
            break;
        case 'service-usage-trends':
            endpoint = 'service-usage-trends';
            break;
        default:
            alert('Invalid report type selected.');
            return;
    }

    try {
        const response = await fetch(`${BASE_URL}/${endpoint}?period=${period}`);
        const data = await response.json();

        if (data.error) {
            alert('Error fetching report data: ' + data.error);
            return;
        }

        renderChart(reportType, data);
        document.getElementById('reportContent').style.display = 'block';
    } catch (error) {
        console.error('Error generating report:', error);
        alert('An error occurred while generating the report.');
    }
}

function renderChart(reportType, data) {
    const ctx = document.getElementById('reportChart').getContext('2d');
    const reportTitle = document.getElementById('reportTitle');

    if (chart) {
        chart.destroy();
    }

    let chartData = {};
    let chartOptions = {};
    let labels = [];
    let values = [];

    switch(reportType) {
        case 'service-utilization':
            reportTitle.innerText = 'Service Utilization Report';
            labels = data.map(item => item.service_name);
            values = data.map(item => item.total_transactions);
            chartData = {
                labels: labels,
                datasets: [{
                    label: 'Total Transactions',
                    data: values,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            };
            chartOptions = {
                plugins: {
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        color: '#000',
                        formatter: Math.round
                    }
                },
                responsive: true,
                scales: {
                    y: { beginAtZero: true }
                }
            };
            chart = new Chart(ctx, {
                type: 'bar',
                data: chartData,
                options: chartOptions,
                plugins: [ChartDataLabels]
            });
            break;

        case 'user-registrations':
            reportTitle.innerText = 'User Registration Report';
            labels = data.map(item => item.registration_date);
            values = data.map(item => item.total_users);
            chartData = {
                labels: labels,
                datasets: [{
                    label: 'New Users',
                    data: values,
                    fill: false,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    tension: 0.1
                }]
            };
            chartOptions = {
                plugins: {
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        color: '#000',
                        formatter: Math.round
                    }
                },
                responsive: true,
                scales: {
                    y: { beginAtZero: true }
                }
            };
            chart = new Chart(ctx, {
                type: 'line',
                data: chartData,
                options: chartOptions,
                plugins: [ChartDataLabels]
            });
            break;

        case 'daily-peak-times':
            reportTitle.innerText = 'Daily Peak Time Report';
            labels = data.map(item => item.hour + ':00');
            values = data.map(item => item.total_transactions);
            chartData = {
                labels: labels,
                datasets: [{
                    label: 'Transactions',
                    data: values,
                    backgroundColor: 'rgba(255, 159, 64, 0.6)',
                    borderColor: 'rgba(255, 159, 64, 1)',
                    borderWidth: 1
                }]
            };
            chartOptions = {
                plugins: {
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        color: '#000',
                        formatter: Math.round
                    }
                },
                responsive: true,
                scales: {
                    y: { beginAtZero: true }
                }
            };
            chart = new Chart(ctx, {
                type: 'bar',
                data: chartData,
                options: chartOptions,
                plugins: [ChartDataLabels]
            });
            break;

        case 'transaction-status':
            reportTitle.innerText = 'Transaction Status Distribution Report';
            labels = data.map(item => item.status);
            values = data.map(item => item.total_transactions);
            chartData = {
                labels: labels,
                datasets: [{
                    label: 'Transaction Status',
                    data: values,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.6)',
                        'rgba(54, 162, 235, 0.6)',
                        'rgba(255, 206, 86, 0.6)',
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(153, 102, 255, 0.6)',
                        'rgba(255, 159, 64, 0.6)'
                    ],
                    borderColor: [
                        'rgba(255,99,132,1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)'
                    ],
                    borderWidth: 1
                }]
            };
            chartOptions = {
                plugins: {
                    datalabels: {
                        color: '#000',
                        formatter: (value, ctx) => {
                            let sum = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                            let percentage = (value * 100 / sum).toFixed(2) + '%';
                            return percentage;
                        },
                        font: {
                            weight: 'bold',
                            size: (ctx) => {
                                const value = ctx.chart.data.datasets[0].data[ctx.dataIndex];
                                const percentage = (value * 100 / ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0)).toFixed(2);
                                return percentage < 5 ? 10 : 12; // Smaller font for smaller slices
                            }
                        },
                        align: 'center',
                        anchor: 'center',
                        overflow: 'ellipsis',
                        clamp: true
                    }
                },
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y', // Makes the bar chart horizontal
                scales: {
                    x: { beginAtZero: true }
                },
                legend: {
                    position: 'bottom',
                    labels: {
                        font: {
                            family: 'Poppins',
                            size: 12
                        }
                    }
                },
                tooltips: {
                    enabled: true,
                    callbacks: {
                        label: function(tooltipItem, data) {
                            const dataset = data.datasets[tooltipItem.datasetIndex];
                            const total = dataset.data.reduce((a, b) => a + b, 0);
                            const currentValue = dataset.data[tooltipItem.index];
                            const percentage = ((currentValue / total) * 100).toFixed(2);
                            return `${data.labels[tooltipItem.index]}: ${percentage}% (${currentValue})`;
                        }
                    }
                }
            };
            chart = new Chart(ctx, {
                type: 'bar', // Changed from 'pie' to 'bar' for horizontal bar chart
                data: chartData,
                options: chartOptions,
                plugins: [ChartDataLabels]
            });
            break;

        case 'service-usage-trends':
            reportTitle.innerText = 'Service-Specific Usage Trends Report';
            const services = [...new Set(data.map(item => item.service_name))];
            const datasets = [];

            services.forEach(service => {
                const serviceData = data.filter(item => item.service_name === service);
                const serviceLabels = serviceData.map(item => item.usage_date);
                const serviceValues = serviceData.map(item => item.total_transactions);
                datasets.push({
                    label: service,
                    data: serviceValues,
                    fill: false,
                    borderColor: getRandomColor(),
                    tension: 0.1
                });
                if (labels.length === 0) {
                    labels.push(...serviceLabels);
                }
            });

            chartData = {
                labels: labels,
                datasets: datasets
            };

            chartOptions = {
                plugins: {
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        color: '#000',
                        formatter: Math.round
                    }
                },
                responsive: true,
                scales: {
                    y: { beginAtZero: true }
                }
            };

            chart = new Chart(ctx, {
                type: 'line',
                data: chartData,
                options: chartOptions,
                plugins: [ChartDataLabels]
            });
            break;

        default:
            reportTitle.innerText = 'Unknown Report';
    }
}

function getRandomColor() {
    const r = Math.floor(Math.random() * 200);
    const g = Math.floor(Math.random() * 200);
    const b = Math.floor(Math.random() * 200);
    return `rgba(${r}, ${g}, ${b}, 1)`;
}
