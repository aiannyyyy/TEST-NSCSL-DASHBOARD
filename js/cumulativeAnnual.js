document.addEventListener("DOMContentLoaded", async function () {
    const ctx = document.getElementById("cumulativeAnnualSamples")?.getContext("2d");
    let chartInstance;
    let selectedType = "Received"; // Default category

    async function fetchData() {
        try {
            const response = await fetch(`http://localhost:3000/api/cumulative-annual-samples?category=${selectedType}`);
            if (!response.ok) throw new Error("Failed to fetch data");

            const { data } = await response.json();
            if (!Array.isArray(data) || data.length === 0) {
                console.warn("⚠️ No data received from API.");
                return;
            }

            processData(data);
        } catch (error) {
            console.error("❌ Error loading chart data:", error.message);
        }
    }

    function processData(data) {
        const yearlyData = {};

        data.forEach(entry => {
            if (!entry.YEAR_MONTH) {
                console.warn("⚠️ Missing YEAR_MONTH in entry:", entry);
                return; // Skip this entry if YEAR_MONTH is missing
            }

            const year = entry.YEAR_MONTH.split('-')[0]; // Extract year from YYYY-MM format
            const test6 = Number(entry.TEST_6 || 0);
            const enbs = Number(entry.ENBS || 0);

            if (!yearlyData[year]) {
                yearlyData[year] = { test6: 0, enbs: 0 };
            }
            yearlyData[year].test6 += test6;
            yearlyData[year].enbs += enbs;
        });

        let labels = Object.keys(yearlyData);
        let test6Data = labels.map(year => yearlyData[year].test6);
        let enbsData = labels.map(year => yearlyData[year].enbs);

        updateChart(labels, test6Data, enbsData);
    }

    function updateChart(labels, test6Data, enbsData) {
        if (!ctx) return;
        if (chartInstance) {
            chartInstance.destroy();
        }

        chartInstance = new Chart(ctx, {
            type: "bar",
            data: {
                labels,
                datasets: [
                    {
                        label: "Test 6",
                        data: test6Data,
                        backgroundColor: "rgba(54, 162, 235, 0.6)",
                        borderColor: "rgba(54, 162, 235, 1)",
                        borderWidth: 1,
                        stack: "Stack 0",
                        datalabels: {
                            anchor: 'center',
                            align: 'center',
                            formatter: (value) => value > 0 ? value : '',
                            color: 'black',
                            font: {
                                weight: 'bold'
                            }
                        }
                    },
                    {
                        label: "ENBS",
                        data: enbsData,
                        backgroundColor: "rgba(255, 99, 132, 0.6)",
                        borderColor: "rgba(255, 99, 132, 1)",
                        borderWidth: 1,
                        stack: "Stack 0",
                        datalabels: {
                            anchor: 'end',
                            align: 'top',
                            formatter: (value) => value,
                            color: 'black',
                            font: {
                                weight: 'bold'
                            }
                        }
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    datalabels: {
                        display: true
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                    },
                    y: {
                        beginAtZero: true,
                        stacked: true,
                        max: 250000
                    }
                }
            },
            plugins: [ChartDataLabels]
        });
    }

    const dropdownElement = document.getElementById("cumulativeAnnualDropdown");
    if (dropdownElement) {
        dropdownElement.addEventListener("click", (event) => {
            if (event.target.classList.contains("dropdown-item")) {
                selectedType = event.target.getAttribute("data-type");
                const buttonElement = document.getElementById("cumulativeAnnualButton");
                if (buttonElement) buttonElement.textContent = selectedType;
                fetchData();
            }
        });
    }

    fetchData();
});
