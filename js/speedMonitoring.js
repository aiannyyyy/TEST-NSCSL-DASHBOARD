document.addEventListener("DOMContentLoaded", function () {
    let selectedYear = 2025;
    let selectedMonth = "January";
    let selectedType = "Data Entry";  // Default is Data Entry
    let myChart; // Declare myChart globally

    updateDropdownText();
    fetchChartData();

    function updateDropdownText() {
        document.getElementById("year-dropdown").textContent = selectedYear;
        document.getElementById("month-dropdown").textContent = selectedMonth;
        document.getElementById("type-dropdown").textContent = selectedType;

        let cardTitle = document.querySelector(".card-title-dash");
        if (cardTitle) {
            cardTitle.innerHTML = `Speed Monitoring - ${selectedType} <br> ${selectedMonth} ${selectedYear}`;
        }
    }

    function fetchChartData() {
        const monthMap = {
            "January": "01", "February": "02", "March": "03", "April": "04",
            "May": "05", "June": "06", "July": "07", "August": "08",
            "September": "09", "October": "10", "November": "11", "December": "12"
        };

        const typeMap = {
            "Data Entry": "entry",
            "Data Verification": "verification"
        };

        const selectedMonthNumber = monthMap[selectedMonth];
        const apiType = typeMap[selectedType] || selectedType.toLowerCase();

        let apiUrl = `http://localhost:3000/api/speed-monitoring/?year=${selectedYear}&month=${selectedMonthNumber}&type=${apiType}`;

        console.log("Fetching from:", apiUrl);

        fetch(apiUrl)
            .then(response => response.json())
            .then(data => {
                console.log("Received data:", data);

                if (!data.data || data.data.length === 0) {
                    console.warn("No data available for the selected filters.");
                    updateChart([]); // No data, so clear the chart
                    return;
                }

                // Process data to avoid duplicates
                const processedData = processChartData(data.data);
                updateChart(processedData);
            })
            .catch(error => console.error("Error fetching data:", error));
    }

    function processChartData(data) {
        const technicianData = {};

        data.forEach(entry => {
            const name = entry.FIRSTNAME;

            if (!technicianData[name]) {
                technicianData[name] = {
                    FIRSTNAME: name,
                    TOTAL_SAMPLES: 0,
                    MONTHLY_AVG_INIT_TIME_SECONDS: 0,
                    count: 0
                };
            }

            technicianData[name].TOTAL_SAMPLES += parseInt(entry.TOTAL_SAMPLES || 0);
            technicianData[name].MONTHLY_AVG_INIT_TIME_SECONDS += parseFloat(entry.MONTHLY_AVG_INIT_TIME_SECONDS || 0);
            technicianData[name].count++;
        });

        return Object.values(technicianData).map(tech => ({
            FIRSTNAME: tech.FIRSTNAME,
            TOTAL_SAMPLES: tech.TOTAL_SAMPLES,
            MONTHLY_AVG_INIT_TIME_SECONDS: tech.count > 0 ? tech.MONTHLY_AVG_INIT_TIME_SECONDS / tech.count : 0
        }));
    }

    function updateChart(data) {
        const ctx = document.getElementById("speedMonitoringGraph").getContext("2d");

        const technicians = data.map(entry => formatTechnicianName(entry.FIRSTNAME));
        const sampleCounts = data.map(entry => entry.TOTAL_SAMPLES);
        const avgTimes = data.map(entry => entry.MONTHLY_AVG_INIT_TIME_SECONDS);

        if (myChart) {
            myChart.destroy();
        }

        let performanceThresholds;
        if (selectedType === "Data Entry") {
            performanceThresholds = {
                ideal: { min: 0, max: 25 },
                acceptable: { min: 25, max: 35 },
                unacceptable: { min: 35, max: 100 }
            };
        } else {
            performanceThresholds = {
                ideal: { min: 0, max: 20 },
                acceptable: { min: 20, max: 30 },
                unacceptable: { min: 30, max: 100 }
            };
        }

        myChart = new Chart(ctx, {
            type: "bar",
            data: {
                labels: technicians,
                datasets: [
                    {
                        label: "Total # of Samples Encoded",
                        data: sampleCounts,
                        backgroundColor: "rgba(75, 192, 255, 0.7)",
                        borderColor: "rgba(75, 192, 255, 1)",
                        borderWidth: 1,
                        yAxisID: "ySamples",
                        barPercentage: 0.8,
                        categoryPercentage: 0.9,
                        datalabels: {
                            anchor: 'end',
                            align: 'top',
                            font: {
                                weight: 'bold'
                            },
                            formatter: function (value) {
                                return value.toLocaleString();
                            }
                        }
                    },
                    {
                        label: "Seconds per filter card",
                        data: avgTimes,
                        type: "line",
                        borderColor: "rgba(255, 159, 64, 1)",
                        backgroundColor: "rgba(255, 159, 64, 0.2)",
                        borderWidth: 2,
                        pointRadius: 6,
                        pointBackgroundColor: "rgba(255, 159, 64, 1)",
                        pointBorderColor: "#fff",
                        pointBorderWidth: 2,
                        pointHoverRadius: 8,
                        fill: false,
                        tension: 0.4,
                        yAxisID: "ySeconds",
                        datalabels: {
                            anchor: 'start',
                            align: 'bottom',
                            font: {
                                weight: 'bold'
                            },
                            color: 'rgb(0, 0, 0)',
                            formatter: function (value) {
                                return value.toFixed(1) + 's'; // Display as seconds with 1 decimal place
                            }
                        }
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: selectedType,
                        font: {
                            size: 18
                        }
                    },
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const label = context.dataset.label || '';
                                const value = context.raw;
                                if (label === "Total # of Samples Encoded") {
                                    return `${label}: ${value}`;
                                } else {
                                    return `${label}: ${Math.round(value)} seconds`;
                                }
                            }
                        }
                    },
                    datalabels: {
                        color: '#000',
                        font: {
                            size: 12
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    ySamples: {
                        type: "linear",
                        position: "left",
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: "No. of Samples",
                            font: {
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            callback: function (value) {
                                return value.toLocaleString();
                            }
                        },
                        grid: {
                            color: function (context) {
                                return 'rgba(0, 0, 0, 0.1)';
                            }
                        }
                    },
                    ySeconds: {
                        type: "linear",
                        position: "right",
                        beginAtZero: true,
                        max: 70,
                        title: {
                            display: true,
                            text: "seconds",
                            font: {
                                weight: 'bold'
                            }
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            },
            plugins: [ChartDataLabels, {
                id: 'backgroundColorPlugin',
                beforeDraw: function (chart) {
                    const ctx = chart.ctx;
                    const chartArea = chart.chartArea;
                    const yScale = chart.scales.ySeconds;

                    const idealTop = yScale.getPixelForValue(performanceThresholds.ideal.max);
                    ctx.fillStyle = 'rgba(75, 192, 75, 0.1)';
                    ctx.fillRect(chartArea.left, idealTop, chartArea.right - chartArea.left, chartArea.bottom - idealTop);

                    const acceptableTop = yScale.getPixelForValue(performanceThresholds.acceptable.max);
                    ctx.fillStyle = 'rgba(255, 159, 64, 0.1)';
                    ctx.fillRect(chartArea.left, acceptableTop, chartArea.right - chartArea.left, idealTop - acceptableTop);

                    const unacceptableTop = yScale.getPixelForValue(performanceThresholds.unacceptable.max);
                    ctx.fillStyle = 'rgba(255, 99, 132, 0.1)';
                    ctx.fillRect(chartArea.left, chartArea.top, chartArea.right - chartArea.left, acceptableTop - chartArea.top);
                }
            }]
        });

        addCustomLegend();
    }

    function formatTechnicianName(name) {
        const nameMap = {
            "JAY ARR": "Jay Arr Apelado",
            "MARY ROSE": "Mary Rose Gomez",
            "ABIGAIL": "Abigail Morfe",
            "ANGELICA": "Angelica Brutas"
        };

        return nameMap[name] || name;
    }

    function addCustomLegend() {
        const existingLegend = document.querySelector(".performance-legend");
        if (existingLegend) {
            existingLegend.remove();
        }

        const chartContainer = document.getElementById("speedMonitoringGraph").parentElement;

        const legendContainer = document.createElement("div");
        legendContainer.className = "performance-legend mt-3";
        legendContainer.style.display = "flex";
        legendContainer.style.justifyContent = "center";
        legendContainer.style.gap = "20px";
        legendContainer.style.marginTop = "15px";

        const legendItems = [
            { color: "rgba(75, 192, 75, 0.4)", label: "Ideal" },
            { color: "rgba(255, 159, 64, 0.4)", label: "Acceptable" },
            { color: "rgba(255, 99, 132, 0.4)", label: "Unacceptable" }
        ];

        legendItems.forEach(item => {
            const box = document.createElement("div");
            box.style.display = "flex";
            box.style.alignItems = "center";
            box.innerHTML = `<div style="width: 20px; height: 20px; background-color: ${item.color}; margin-right: 8px;"></div>${item.label}`;
            legendContainer.appendChild(box);
        });

        chartContainer.appendChild(legendContainer);
    }

    // Event listeners for dropdown menu changes
    document.querySelectorAll("#year-dropdown-menu .dropdown-item").forEach(item => {
        item.addEventListener("click", function () {
            event.preventDefault();
            selectedYear = this.textContent.trim();
            updateDropdownText();
            fetchChartData();
        });
    });

    document.querySelectorAll("#month-dropdown-menu .dropdown-item").forEach(item => {
        item.addEventListener("click", function () {
            event.preventDefault();
            selectedMonth = this.textContent.trim();
            updateDropdownText();
            fetchChartData();
        });
    });

    document.querySelectorAll("#type-dropdown-menu .dropdown-item").forEach(item => {
        item.addEventListener("click", function () {
            event.preventDefault();
            selectedType = this.textContent.trim();
            updateDropdownText();
            fetchChartData();
        });
    });
});
