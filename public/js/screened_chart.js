document.addEventListener("DOMContentLoaded", function () {
    let selectedYear1 = new Date().getFullYear() - 1; // last year
    let selectedYear2 = new Date().getFullYear();     // current year
    let selectedProvince = "Batangas"; // Default province
    const monthNames = ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"];
    let selectedMonth = monthNames[new Date().getMonth()]; // ← auto set to current month

    function updateDropdownText() {
        document.getElementById("yearDropdownBtn1").textContent = selectedYear1;
        document.getElementById("yearDropdownBtn2").textContent = selectedYear2;
        document.getElementById("provinceDropdownBtn").textContent = selectedProvince;
        document.getElementById("monthDropdownBtn").textContent = selectedMonth; // Update month button text

        // ✅ Update the card title with the selected province
        let cardTitle = document.querySelector(".card-title-dash1");
        if (cardTitle) {
            cardTitle.textContent = `Monthly Total Screened Samples (${selectedProvince})`;
        }

        // ✅ Update the chart title with the selected years
        let chartTitle = document.getElementById("chartTitle");
        if (chartTitle) {
            chartTitle.textContent = `${selectedYear1} vs ${selectedYear2}`;
        }

        let yearPrev = document.getElementById("yearPrev");
        if (yearPrev) {
            yearPrev.textContent = selectedYear1;
        }

        let yearCurrent = document.getElementById("yearCurrent");
        if (yearCurrent) {
            yearCurrent.textContent = selectedYear2;
        }
    }

    function getChartDataForMonth(month) {
        if (!window.myChart || !window.myChart.data) return { prev: 0, current: 0 };

        let monthIndex = {
            "January": 0, "February": 1, "March": 2, "April": 3, "May": 4, "June": 5,
            "July": 6, "August": 7, "September": 8, "October": 9, "November": 10, "December": 11
        }[month];

        if (monthIndex === undefined) return { prev: 0, current: 0 };

        let prev = window.myChart.data.datasets[0].data[monthIndex] || 0;
        let current = window.myChart.data.datasets[1].data[monthIndex] || 0;

        return { prev, current };
    }

    function updateTable() {
        let { prev: totalPrev, current: totalCurrent } = getChartDataForMonth(selectedMonth);
        let incDec = totalCurrent - totalPrev;
        let percentChange = totalPrev ? ((incDec / totalPrev) * 100).toFixed(2) : 0;

        document.getElementById("totalPrev").textContent = totalPrev;
        document.getElementById("totalCurrent").textContent = totalCurrent;
        document.getElementById("incDec").textContent = incDec;
        document.getElementById("percentChange").textContent = `${percentChange}% ${incDec >= 0 ? "Increase" : "Decrease"}`;

        // Apply color formatting
        let color = incDec >= 0 ? "green" : "red";
        document.getElementById("incDec").style.color = color;
        document.getElementById("percentChange").style.color = color;
    }

    function updateChart(data) {
        if (!Array.isArray(data) || data.length === 0) {
            console.warn("⚠️ No valid data received! Check API response.");
            return;
        }
    
        let allMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        let valuesYear1 = Array(12).fill(0);
        let valuesYear2 = Array(12).fill(null);
    
        data.forEach(entry => {
            let [year, month] = entry.MONTH_YEAR.split("-").map(Number);
            let monthIndex = month - 1;
            let province = entry.PROVINCE ? entry.PROVINCE.trim().toLowerCase() : "";
            let selectedProvinceNormalized = selectedProvince.trim().toLowerCase();
    
            if (province === selectedProvinceNormalized) {
                if (parseInt(year, 10) === selectedYear1) valuesYear1[monthIndex] = entry.TOTAL_LABNO || 0;
                if (parseInt(year, 10) === selectedYear2) valuesYear2[monthIndex] = entry.TOTAL_LABNO || 0;
            }
        });
    
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
                        title: { display: false },
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: { position: "top" },
                    tooltip: { enabled: true },
                    datalabels: {
                        anchor: "end",
                        align: "top",
                        color: "#000",
                        font: {
                            weight: "bold"
                        },
                        formatter: function (value) {
                            return value > 0 ? value : "";
                        }
                    }
                }
            },
            plugins: [ChartDataLabels] // Add the ChartDataLabels plugin
        });
    
        updateTable();
    }    

    function fetchChartData() {
        let fromDate = `${selectedYear1}-01-01`;
        let toDate = `${selectedYear2}-12-31`;

        let apiUrl = `http://localhost:3001/api/inc-dec/monthly-labno-count?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}&province=${encodeURIComponent(selectedProvince)}`;

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
        event.preventDefault(); // ⛔ Prevents page jump
        let selected = event.target.getAttribute("data-year");
        if (selected) {
            selectedYear1 = parseInt(selected, 10);
            updateDropdownText();
            fetchChartData();
        }
    });

    // Handle Year 2 Selection
    document.getElementById("yearDropdown2").addEventListener("click", function (event) {
        event.preventDefault(); // ⛔ Prevents page jump
        let selected = event.target.getAttribute("data-year");
        if (selected) {
            selectedYear2 = parseInt(selected, 10);
            updateDropdownText();
            fetchChartData();
        }
    });

    // Handle Province Selection
    document.getElementById("provinceDropdown").addEventListener("click", function (event) {
        event.preventDefault(); // ⛔ Prevents page jump
        let selected = event.target.getAttribute("data-province");
        if (selected) {
            selectedProvince = selected;
            updateDropdownText();
            fetchChartData();
        }
    });

    // Handle Month Selection
    document.getElementById("monthDropdown").addEventListener("click", function (event) {
        event.preventDefault(); // ⛔ Prevents page jump
        let selected = event.target.getAttribute("data-month");
        if (selected) {
            selectedMonth = selected;
            updateDropdownText();
            updateTable();
        }
    });

    updateDropdownText();
    fetchChartData();
});
