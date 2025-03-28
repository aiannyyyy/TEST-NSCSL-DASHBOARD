document.addEventListener("DOMContentLoaded", async function () {
    const ctx = document.getElementById("cumulativeAnnualSamples").getContext("2d");
    let chartInstance;
    let selectedType = "Received"; // Default category
    let selectedMonths = "January"; // Default month

    async function fetchData() {
        try {
            const response = await fetch(`http://localhost:3000/api/cumulative-annual-samples?category=${selectedType}`);
            if (!response.ok) throw new Error("Failed to fetch data");

            const { data } = await response.json();
            if (!Array.isArray(data) || data.length === 0) throw new Error("No data available");

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
                return; // Skip this entry if YEAR_MONTH is missing
            }
    
            const parts = entry.YEAR_MONTH.split("-");
            if (parts.length !== 2) {
                console.warn("⚠️ Invalid YEAR_MONTH format:", entry.YEAR_MONTH);
                return; // Skip invalid format
            }
    
            const [, month] = parts; // Ignore the year
            const test6 = Number(entry.TEST_6 || 0);
            const enbs = Number(entry.ENBS || 0);
    
            if (!yearlyData[month]) {
                yearlyData[month] = { test6: 0, enbs: 0 };
            }
            yearlyData[month].test6 += test6;
            yearlyData[month].enbs += enbs;
    
            if (!cumulativeData[month]) {
                cumulativeData[month] = { test6: 0, enbs: 0 };
            }
            cumulativeData[month].test6 += test6;
            cumulativeData[month].enbs += enbs;
        });
    
        let labels = Object.keys(yearlyData);
        let test6Data = labels.map(month => yearlyData[month].test6);
        let enbsData = labels.map(month => yearlyData[month].enbs);
    
        updateChart(labels, test6Data, enbsData);
    }
    
    function updateChart(labels, test6Data, enbsData) {
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
                        borderWidth: 1
                    },
                    {
                        label: "Total ENBS",
                        data: enbsData,
                        backgroundColor: "rgba(255, 99, 132, 0.6)",
                        borderColor: "rgba(255, 99, 132, 1)",
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    document.getElementById("cumulativeAnnualDropdown").addEventListener("click", (event) => {
        if (event.target.classList.contains("dropdown-item")) {
            selectedType = event.target.getAttribute("data-type");
            document.getElementById("cumulativeAnnualButton").textContent = selectedType;
            event.stopPropagation();
            fetchData();
        }
    });

    document.getElementById("monthDropdown2").addEventListener("click", (event) => {
        if (event.target.classList.contains("dropdown-item")) {
            selectedMonths = event.target.getAttribute("data-month");
            document.getElementById("monthDropdownBtn2").textContent = selectedMonths;
            event.stopPropagation();
            fetchData();
        }
    });

    fetchData();
});
