document.addEventListener("DOMContentLoaded", function () {
    let selectedYear1 = 2024; // Default previous year
    let selectedYear2 = 2025; // Default current year
    let selectedProvince = "Batangas"; // Default province

    function updateDropdownText() {
        document.getElementById("yearDropdownBtn1").textContent = selectedYear1;
        document.getElementById("yearDropdownBtn2").textContent = selectedYear2;
        document.getElementById("provinceDropdownBtn").textContent = selectedProvince;
    }

    function updateChart(data) {
        if (!Array.isArray(data) || data.length === 0) {
            console.warn("⚠️ No valid data received! Check API response.");
            return;
        }
    
        let allMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        let valuesYear1 = Array(12).fill(0);
        let valuesYear2 = Array(12).fill(null);
    
        // 🔍 Debugging: Process and Log Data
        data.forEach(entry => {
            console.log("🔹 Raw Entry:", entry);
    
            if (!entry.MONTH_YEAR) {
                console.warn("⚠️ Missing MONTH_YEAR in entry:", entry);
                return;
            }
    
            let [year, month] = entry.MONTH_YEAR.split("-").map(Number);
            let monthIndex = month - 1;
            let province = entry.PROVINCE ? entry.PROVINCE.trim().toLowerCase() : "";
            let selectedProvinceNormalized = selectedProvince.trim().toLowerCase();
    
            console.log(`📅 Extracted: Year=${year}, Month=${monthIndex}, Province=${province}, Lab No=${entry.TOTAL_LABNO}`);
    
            if (province === selectedProvinceNormalized) {
                if (parseInt(year, 10) === selectedYear1) valuesYear1[monthIndex] = entry.TOTAL_LABNO || 0;
                if (parseInt(year, 10) === selectedYear2) valuesYear2[monthIndex] = entry.TOTAL_LABNO || 0;
            }
        });
    
        console.log("📊 Processed Chart Data:", { allMonths, valuesYear1, valuesYear2 });
    
        if (window.myChart instanceof Chart) {
            window.myChart.destroy();
        }
    
        let ctx = document.getElementById("marketingOverview").getContext("2d");
    
        window.myChart = new Chart(ctx, {
            type: "bar",
            data: {
                labels: allMonths,
                datasets: [
                    {
                        label: selectedYear1,
                        backgroundColor: "rgba(0, 123, 255, 0.7)",
                        borderColor: "rgba(0, 123, 255, 1)",
                        borderWidth: 1,
                        data: valuesYear1
                    },
                    {
                        label: selectedYear2,
                        backgroundColor: "rgba(255, 99, 132, 0.7)",
                        borderColor: "rgba(255, 99, 132, 1)",
                        borderWidth: 1,
                        data: valuesYear2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: { display: true, text: "Month", font: { size: 14 } },
                        ticks: { autoSkip: false, maxRotation: 0, minRotation: 0 },
                    },
                    y: {
                        title: { display: false }, // ❌ Removed Y-Axis Label
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: { position: "top" },
                    tooltip: { enabled: true },
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        formatter: (value) => value ? value : "",
                        font: { weight: 'bold' }
                    }
                }
            }
        });
    }
    
    

    function fetchChartData() {
        let fromDate = `${selectedYear1}-01-01`;
        let toDate = `${selectedYear2}-12-31`;

        let apiUrl = `http://localhost:3000/api/inc-dec/monthly-labno-count?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}&province=${encodeURIComponent(selectedProvince)}`;

        console.log("🚀 Fetching data from:", apiUrl);

        fetch(apiUrl)
            .then(response => response.json())
            .then(data => {
                console.log("✅ API Response Data:", data);

                if (!data || data.length === 0) {
                    console.warn("⚠️ No data received!");
                    return;
                }

                updateChart(data);
            })
            .catch(error => console.error("❌ Error fetching chart data:", error));
    }

    // Handle Year 1 Selection
    document.getElementById("yearDropdown1").addEventListener("click", function (event) {
        let selected = event.target.getAttribute("data-year");
        if (selected) {
            selectedYear1 = parseInt(selected, 10);
            updateDropdownText();
            fetchChartData();
        }
    });

    // Handle Year 2 Selection
    document.getElementById("yearDropdown2").addEventListener("click", function (event) {
        let selected = event.target.getAttribute("data-year");
        if (selected) {
            selectedYear2 = parseInt(selected, 10);
            updateDropdownText();
            fetchChartData();
        }
    });

    // Handle Province Selection
    document.getElementById("provinceDropdown").addEventListener("click", function (event) {
        let selected = event.target.getAttribute("data-province");
        if (selected) {
            selectedProvince = selected;
            updateDropdownText();
            fetchChartData();
        }
    });

    updateDropdownText();
    fetchChartData();
});
