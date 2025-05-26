document.addEventListener("DOMContentLoaded", async function () {
    const ctx = document.getElementById("cumulativeAnnualSamples")?.getContext("2d");
    let chartInstance;

    // Get current date and set default month range based on it
    const today = new Date();
    const currentMonth = today.getMonth(); // 0-based (0 = January, 1 = February, etc.)
    
    // Create the month range string based on current month
    const monthRanges = [
        "January",
        "January-February",
        "January-March", 
        "January-April",
        "January-May",
        "January-June",
        "January-July",
        "January-August",
        "January-September",
        "January-October",
        "January-November",
        "January-December"
    ];
    
    // Set default month range based on current month (0-based index)
    let cumulativeMode = monthRanges[currentMonth]; // Default to current month's range

    // Update dropdown button text with default value
    const monthDropdownBtn = document.getElementById("monthDropdownBtn2");
    if (monthDropdownBtn) {
        monthDropdownBtn.textContent = cumulativeMode;
    } else {
        console.error("❌ monthDropdown2 button element not found!");
    }

    const titleElement = document.querySelector(".card-title-dash4"); // Title element

    async function fetchData() {
        try {
            const response = await fetch(`http://localhost:3000/api/cumulative-annual-samples`);
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
        const cumulativeData = {};

        data.forEach(entry => {
            if (!entry.YEAR_MONTH) {
                console.warn("⚠️ Missing YEAR_MONTH in entry:", entry);
                return;
            }

            const [year, month] = entry.YEAR_MONTH.split('-');
            const test6 = Number(entry.TEST_6 || 0);
            const enbs = Number(entry.ENBS || 0);

            // Initialize yearly data
            if (!yearlyData[year]) {
                yearlyData[year] = { test6: 0, enbs: 0 };
            }

            yearlyData[year].test6 += test6;
            yearlyData[year].enbs += enbs;

            // Calculate cumulative data
            if (!cumulativeData[year]) {
                cumulativeData[year] = { total: 0 };
            }
            if (monthInRange(month, cumulativeMode)) {
                cumulativeData[year].total += test6 + enbs;
            }
        });

        let labels = Object.keys(yearlyData);
        let test6Data = labels.map(year => yearlyData[year].test6);
        let enbsData = labels.map(year => yearlyData[year].enbs);
        let cumulativeValues = labels.map(year => cumulativeData[year]?.total || 0);

        updateChart(labels, test6Data, enbsData, cumulativeValues);
    }

    function updateChart(labels, test6Data, enbsData, cumulativeValues) {
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
                        stack: "Stack 0"
                    },
                    {
                        label: "ENBS",
                        data: enbsData,
                        backgroundColor: "rgba(255, 99, 132, 0.6)",
                        borderColor: "rgba(255, 99, 132, 1)",
                        borderWidth: 1,
                        stack: "Stack 0"
                    },
                    {
                        label: "Cumulative",
                        data: cumulativeValues,
                        type: "line",
                        borderColor: "rgba(0, 255, 0, 1)",
                        backgroundColor: "rgba(0, 255, 0, 0.2)",
                        borderWidth: 2,
                        tension: 0.3,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        formatter: (value) => value.toLocaleString(),
                        formatter: (value) => value === 0 ? '' : value,
                        font: {
                            weight: 'bold'
                        }
                    }
                },
                scales: {
                    x: { stacked: true },
                    y: { beginAtZero: true, stacked: true, max: 250000 }
                }
            },
            plugins: [ChartDataLabels] // Enables data labels
        });
    }

    function monthInRange(month, range) {
        const monthOrder = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
        const selectedMonths = {
            "January": ["01"],
            "January-February": ["01", "02"],
            "January-March": ["01", "02", "03"],
            "January-April": ["01", "02", "03", "04"],
            "January-May": ["01", "02", "03", "04", "05"],
            "January-June": ["01", "02", "03", "04", "05", "06"],
            "January-July": ["01", "02", "03", "04", "05", "06", "07"],
            "January-August": ["01", "02", "03", "04", "05", "06", "07", "08"],
            "January-September": ["01", "02", "03", "04", "05", "06", "07", "08", "09"],
            "January-October": ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10"],
            "January-November": ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11"],
            "January-December": monthOrder
        };
        return selectedMonths[range]?.includes(month);
    }

    document.querySelectorAll("#monthDropdown2 .dropdown-item").forEach(item => {
        item.addEventListener("click", function (event) {
            event.preventDefault();
            cumulativeMode = this.getAttribute("data-month");
            document.getElementById("monthDropdownBtn2").textContent = cumulativeMode;

            // Update the chart title based on the selected month range
            titleElement.textContent = `Cumulative Annual Census of Samples Received (${cumulativeMode})`;
            fetchData();
        });
    });

    fetchData();
});
