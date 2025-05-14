document.addEventListener("DOMContentLoaded", function () {
    // Set default year to current year
    let selectYear = new Date().getFullYear();
    const monthNames = ["January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December"];
    let selectMonth = monthNames[new Date().getMonth()];

    let pieChart = null;

    function updateDropdownText() {
        document.getElementById("error-year-dropdown-btn").textContent = selectYear;
        document.getElementById("error-month-dropdown-btn").textContent = selectMonth;
    }

    // Set initial dropdown text when page loads
    updateDropdownText();

    document.querySelectorAll("#error-year-dropdown .dropdown-item").forEach(item => {
        item.addEventListener("click", function (event) {
            event.preventDefault();
            selectYear = this.textContent.trim();
            updateDropdownText();
            updateChart();
        });
    });

    document.querySelectorAll("#error-month-dropdown .dropdown-item").forEach(item => {
        item.addEventListener("click", function (event) {
            event.preventDefault();
            selectMonth = this.textContent.trim();
            updateDropdownText();
            updateChart();
        });
    });

    async function updateChart() {
        try {
            const monthMap = {
                "January": "01", "February": "02", "March": "03", "April": "04",
                "May": "05", "June": "06", "July": "07", "August": "08",
                "September": "09", "October": "10", "November": "11", "December": "12"
            };
            const monthNumber = monthMap[selectMonth];
            
            const response = await fetch(`http://localhost:3000/api/common-error?year=${selectYear}&month=${monthNumber}`);
            const data = await response.json();
            const chartData = processDataForChart(data.data);
            
            if (pieChart) {
                pieChart.destroy();
            }
            
            const ctx = document.getElementById('commonErrorGraph').getContext('2d');
            pieChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: chartData.labels,
                    datasets: [{
                        label: 'Error Percentage',
                        data: chartData.data,
                        backgroundColor: ['#FF5733', '#33FF57', '#3357FF', '#FF33A5', '#FFC300'],
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false, 
                    aspectRatio: 0.8,
                    layout: {
                        padding: 20 
                    },
                    plugins: {
                        legend: {
                            position: 'bottom',
                            align: 'center',
                            labels: {
                                font: {
                                    size: 12
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(tooltipItem) {
                                    return `${tooltipItem.label}: ${tooltipItem.raw}%`;
                                }
                            }
                        },
                        datalabels: {
                            anchor: 'end',
                            align: 'end',
                            offset: 10,
                            color: '#000',
                            font: {
                                size: 12
                            },
                            backgroundColor: '#fff',
                            borderColor: '#ccc',
                            borderWidth: 1,
                            borderRadius: 4,
                            padding: 3,
                            formatter: (value, context) => `${context.chart.data.labels[context.dataIndex]}: ${value}%`
                        }
                    }
                },
                plugins: [ChartDataLabels]
            });
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    function processDataForChart(data) {
        const sortedData = data.sort((a, b) => b.PERCENTAGE - a.PERCENTAGE).slice(0, 5);
        const labels = sortedData.map(row => row.TABLECOLUMN);
        const counts = sortedData.map(row => row.PERCENTAGE);
        return { labels, data: counts };
    }

    updateChart();
});