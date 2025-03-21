document.addEventListener("DOMContentLoaded", function () {
    let selectedYearA = 2024; // Default previous year
    let selectedYearB = 2025; // Default current year
    let selectedProvince2 = "Batangas"; // Default province
    let selectedMonthRange = "January"; // Default month selection

    function updateDropdownText2() {
        document.getElementById("yearDropdownBtnA").textContent = selectedYearA;
        document.getElementById("yearDropdownBtnB").textContent = selectedYearB;
        document.getElementById("provinceDropdownBtn2").textContent = selectedProvince2;
        document.getElementById("monthDropdownBtn2").textContent = selectedMonthRange;

        let chartTitle = document.getElementById("chartTitle2");
        if (chartTitle) {
            chartTitle.textContent = `${selectedYearA} vs ${selectedYearB}`;
        }

        let cardTitle = document.querySelector(".card-title-dash");
        if (cardTitle) {
            cardTitle.textContent = `Cumulative Sample Screened Per Province (${selectedProvince2})`;
        }

        let yearPrev = document.getElementById("yearPrev2");
        if (yearPrev) yearPrev.textContent = selectedYearA;

        let yearCurrent = document.getElementById("yearCurrent2");
        if (yearCurrent) yearCurrent.textContent = selectedYearB;
    }

    function filterDataByMonthRange(data, monthRange) {
        console.log(`📆 Filtering data for month range: ${monthRange}`);

        let months = {
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
            "January-December": ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"]
        };

        let selectedMonths = months[monthRange] || ["01"]; // Default to January if no match

        return data.filter(entry => {
            let year = parseInt(entry.MONTH_YEAR.split("-")[0], 10);
            let month = entry.MONTH_YEAR.split("-")[1]; // Extracts "MM" from "YYYY-MM"
            let province = entry.PROVINCE ? entry.PROVINCE.trim().toLowerCase() : "";

            return (
                province === selectedProvince2.trim().toLowerCase() &&
                selectedMonths.includes(month) &&
                (year === selectedYearA || year === selectedYearB)
            );
        });
        
    }
    
    function updateTable2(totalYearA, totalYearB) {
        let totalPrevElem = document.getElementById("totalPrev2");
        let totalCurrentElem = document.getElementById("totalCurrent2");
        let incDecElem = document.getElementById("incDec2");
        let percentChangeElem = document.getElementById("percentChange2");
    
        if (!totalPrevElem || !totalCurrentElem || !incDecElem || !percentChangeElem) {
            console.error("❌ Table elements not found!");
            return;
        }
    
        // Update table values
        totalPrevElem.textContent = totalYearA;
        totalCurrentElem.textContent = totalYearB;
    
        // Calculate Increase/Decrease
        let incDecValue = totalYearB - totalYearA;
        incDecElem.textContent = incDecValue;
    
        // Calculate Percentage Change
        let percentChange = totalYearA !== 0 ? ((incDecValue / totalYearA) * 100).toFixed(2) : 0;
        let percentText = `${Math.abs(percentChange)}% ${percentChange >= 0 ? "Increase" : "Decrease"}`;
        percentChangeElem.textContent = percentText;
    
        // Apply color formatting
        if (incDecValue >= 0) {
            incDecElem.style.color = "green";
            percentChangeElem.style.color = "green";
        } else {
            incDecElem.style.color = "red";
            percentChangeElem.style.color = "red";
        }
    }
    
    
    function updateChart2(data) {
        console.log("🟢 updateChart2() called with data:", data);
    
        if (!data || data.length === 0) {
            console.warn("⚠️ No valid data received!");
            return;
        }
    
        let totalYearA = 0, totalYearB = 0;
    
        data.forEach(entry => {
            let year = parseInt(entry.MONTH_YEAR.split("-")[0], 10);
            let province = entry.PROVINCE ? entry.PROVINCE.trim().toLowerCase() : "";
    
            console.log(`📅 Year: ${year}, Province: ${province}, Total: ${entry.TOTAL_LABNO}`);
    
            if (province === selectedProvince2.trim().toLowerCase()) {
                if (year === selectedYearA) totalYearA += entry.TOTAL_LABNO || 0;
                if (year === selectedYearB) totalYearB += entry.TOTAL_LABNO || 0;
            }
        });
    
        console.log(`📊 Final Data for Chart -> ${selectedYearA}: ${totalYearA}, ${selectedYearB}: ${totalYearB}`);
    
        let canvas = document.getElementById("marketingOverview2");
        if (!canvas) {
            console.error("❌ Canvas element not found!");
            return;
        }
    
        let ctx = canvas.getContext("2d");
    
        if (window.myChart2) {
            window.myChart2.destroy();
        }
    
        window.myChart2 = new Chart(ctx, {
            type: "bar",
            data: {
                labels: ["Total Screened Samples"],
                datasets: [
                    {
                        label: selectedYearA.toString(),
                        backgroundColor: "rgba(0, 123, 255, 0.7)",
                        data: [totalYearA]
                    },
                    {
                        label: selectedYearB.toString(),
                        backgroundColor: "rgba(255, 99, 132, 0.7)",
                        data: [totalYearB]
                    }
                ]
            },
            options: {
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                scales: { x: { beginAtZero: true } },
                plugins: {
                    legend: { position: "top" },
                    datalabels: {  // ✅ Enable Data Labels
                        anchor: 'end',
                        align: 'right',
                        color: '#000',
                        font: { weight: 'bold', size: 14 },
                        formatter: (value) => value.toLocaleString() // Formats numbers with commas
                    }
                }
            },
            plugins: [ChartDataLabels]  // ✅ Add Datalabels Plugin
        });
    
        // 🔥 Call the function to update the table after chart updates
        updateTable2(totalYearA, totalYearB);
    }
    
    
    function fetchChartData2() {
        let apiUrl = `http://localhost:3000/api/inc-dec/monthly-labno-count?from=${selectedYearA}-01-01&to=${selectedYearB}-12-31&province=${encodeURIComponent(selectedProvince2)}`;
        console.log("🚀 Fetching data from:", apiUrl);

        fetch(apiUrl)
            .then(response => response.json())
            .then(data => {
                console.log("✅ API Response Data:", data);

                if (!data || data.length === 0) {
                    console.warn("⚠️ No data received! Check API response.");
                    return;
                }

                console.table(data);

                let filteredData = filterDataByMonthRange(data, selectedMonthRange);
                updateChart2(filteredData);
            })
            .catch(error => console.error("❌ Error fetching chart data:", error));
    }

    // ✅ Event Listeners for Dropdowns
    document.getElementById("yearDropdownA").addEventListener("click", function (event) {
        let selected = event.target.getAttribute("data-year");
        if (selected) { 
            selectedYearA = parseInt(selected, 10); 
            updateDropdownText2(); 
            fetchChartData2(); 
        }
    });

    document.getElementById("yearDropdownB").addEventListener("click", function (event) {
        let selected = event.target.getAttribute("data-year");
        if (selected) { 
            selectedYearB = parseInt(selected, 10); 
            updateDropdownText2(); 
            fetchChartData2();
        }
    });

    document.getElementById("provinceDropdown2").addEventListener("click", function (event) {
        let selected = event.target.getAttribute("data-province");
        if (selected) { 
            selectedProvince2 = selected; 
            updateDropdownText2(); 
            fetchChartData2(); 
            updateTable();
        }
    });

    document.getElementById("monthDropdown2").addEventListener("click", function (event) {
        let selected = event.target.getAttribute("data-month");
        if (selected) { 
            selectedMonthRange = selected;
            updateDropdownText2(); 
            fetchChartData2();
        }
    });

    updateDropdownText2();
    setTimeout(() => {
        fetchChartData2();
    }, 500);
});
