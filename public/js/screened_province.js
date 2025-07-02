/*
document.addEventListener("DOMContentLoaded", function () {
    let selectedYearA = new Date().getFullYear() - 1; // last year
    let selectedYearB = new Date().getFullYear();     // current year
    let selectedProvince2 = "Batangas"; // Default province

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
    let selectedMonthRange = monthRanges[currentMonth]; // Default to current month's range

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
            labels: [""],  // ✅ Keep label
            datasets: [
                {
                    label: selectedYearA.toString(),  // ✅ Keep legend label
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
            scales: {
                x: {
                    beginAtZero: true,
                    max: 60000,          // ✅ Set max value
                    ticks: {
                        stepSize: 4000  // ✅ Step interval
                    }
                }
            },
            plugins: {
                legend: { display: true },  // ✅ Show legend
                datalabels: {
                    anchor: 'end',
                    align: 'right',
                    color: '#000',
                    font: { weight: 'bold', size: 14 },
                    formatter: (value) => value.toLocaleString()
                }
            }
        },
        plugins: [ChartDataLabels]
    });

    updateTable2(totalYearA, totalYearB);
}

    
    function fetchChartData2() {
        let apiUrl = `http://localhost:3001/api/inc-dec/monthly-labno-count?from=${selectedYearA}-01-01&to=${selectedYearB}-12-31&province=${encodeURIComponent(selectedProvince2)}`;
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
        event.preventDefault(); // ⛔ Prevents page jump
        let selected = event.target.getAttribute("data-year");
        if (selected) { 
            selectedYearA = parseInt(selected, 10); 
            updateDropdownText2(); 
            fetchChartData2(); 
        }
    });

    document.getElementById("yearDropdownB").addEventListener("click", function (event) {
        event.preventDefault(); // ⛔ Prevents page jump
        let selected = event.target.getAttribute("data-year");
        if (selected) { 
            selectedYearB = parseInt(selected, 10); 
            updateDropdownText2(); 
            fetchChartData2();
        }
    });

    document.getElementById("provinceDropdown2").addEventListener("click", function (event) {
        event.preventDefault(); // ⛔ Prevents page jump
        let selected = event.target.getAttribute("data-province");
        if (selected) { 
            selectedProvince2 = selected; 
            updateDropdownText2(); 
            fetchChartData2(); 
            updateTable();
        }
    });

    document.getElementById("monthDropdown2").addEventListener("click", function (event) {
        event.preventDefault(); // ⛔ Prevents page jump
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

    document.getElementById("downloadCumulativeChart").addEventListener("click", function () {
        const chart = Chart.getChart("marketingOverview2"); // Replace "myChart" with your chart ID
        const originalCanvas = chart.canvas;
        
        // Create high-resolution canvas
        const highResCanvas = document.createElement('canvas');
        const ctx = highResCanvas.getContext('2d');
        
        // Set high resolution (3x for better quality)
        const scaleFactor = 3;
        const width = originalCanvas.width;
        const height = originalCanvas.height;
        
        // Set canvas size with scale factor
        highResCanvas.width = width * scaleFactor;
        highResCanvas.height = height * scaleFactor;
        
        // Scale the context to match
        ctx.scale(scaleFactor, scaleFactor);
        
        // Set high quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Add white background first
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        
        // Draw the chart on top of white background
        ctx.drawImage(originalCanvas, 0, 0, width, height);
        
        // Create download link
        const link = document.createElement('a');
        link.download = 'chart_white_background.png';
        link.href = highResCanvas.toDataURL('image/png', 1.0);
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    document.getElementById("downloadMonthlyTotalScreened").addEventListener("click", function () {
        const chart = Chart.getChart("marketingOverview"); // Replace "myChart" with your chart ID
        const originalCanvas = chart.canvas;
        
        // Create high-resolution canvas
        const highResCanvas = document.createElement('canvas');
        const ctx = highResCanvas.getContext('2d');
        
        // Set high resolution (3x for better quality)
        const scaleFactor = 3;
        const width = originalCanvas.width;
        const height = originalCanvas.height;
        
        // Set canvas size with scale factor
        highResCanvas.width = width * scaleFactor;
        highResCanvas.height = height * scaleFactor;
        
        // Scale the context to match
        ctx.scale(scaleFactor, scaleFactor);
        
        // Set high quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Add white background first
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        
        // Draw the chart on top of white background
        ctx.drawImage(originalCanvas, 0, 0, width, height);
        
        // Create download link
        const link = document.createElement('a');
        link.download = 'chart_white_background.png';
        link.href = highResCanvas.toDataURL('image/png', 1.0);
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
});

*/
document.addEventListener("DOMContentLoaded", function () {
    let selectedYearA = new Date().getFullYear() - 1; // last year
    let selectedYearB = new Date().getFullYear();     // current year
    let selectedProvince2 = "Batangas"; // Default province

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
    let selectedMonthRange = monthRanges[currentMonth]; // Default to current month's range

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
            cardTitle.textContent = `Cumulative Screened Samples Per Province (${selectedProvince2})`;
        }

        let yearPrev = document.getElementById("yearPrev2");
        if (yearPrev) yearPrev.textContent = selectedYearA;

        let yearCurrent = document.getElementById("yearCurrent2");
        if (yearCurrent) yearCurrent.textContent = selectedYearB;
    }

    function filterDataByMonthRange(data, monthRange) {
        console.log(`📆 Filtering screened sample data for month range: ${monthRange}`);

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

        // ✅ Filter screened samples from the updated API response structure
        let screenedData = [];
        
        if (data.monthlyData && Array.isArray(data.monthlyData)) {
            // New API format with monthlyData array
            screenedData = data.monthlyData;
        } else if (data.rawData && Array.isArray(data.rawData)) {
            // Fallback to rawData if monthlyData not available
            screenedData = data.rawData;
        } else if (Array.isArray(data)) {
            // Legacy format - direct array
            screenedData = data;
        }

        return screenedData.filter(entry => {
            let year, month, province;
            
            // Handle different data formats
            if (entry.MONTH_YEAR) {
                // Legacy format
                year = parseInt(entry.MONTH_YEAR.split("-")[0], 10);
                month = entry.MONTH_YEAR.split("-")[1];
                province = entry.PROVINCE ? entry.PROVINCE.trim().toLowerCase() : "";
            } else if (entry.month_year) {
                // New format
                year = parseInt(entry.month_year.split("-")[0], 10);
                month = entry.month_year.split("-")[1];
                province = entry.province ? entry.province.trim().toLowerCase() : "";
            } else {
                // Handle monthly data format
                year = entry.year;
                month = String(entry.month).padStart(2, '0');
                province = entry.province ? entry.province.trim().toLowerCase() : "";
            }

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
        console.log("🟢 updateChart2() called with screened data:", data);

        if (!data || data.length === 0) {
            console.warn("⚠️ No valid screened sample data received!");
            return;
        }

        let totalYearA = 0, totalYearB = 0;

        data.forEach(entry => {
            let year, province, totalValue;
            
            // Handle different data formats
            if (entry.MONTH_YEAR) {
                // Legacy format
                year = parseInt(entry.MONTH_YEAR.split("-")[0], 10);
                province = entry.PROVINCE ? entry.PROVINCE.trim().toLowerCase() : "";
                totalValue = entry.TOTAL_LABNO || 0;
            } else if (entry.month_year) {
                // New format
                year = parseInt(entry.month_year.split("-")[0], 10);
                province = entry.province ? entry.province.trim().toLowerCase() : "";
                totalValue = entry.total_labno || 0;
            } else {
                // Monthly data format
                year = entry.year;
                province = entry.province ? entry.province.trim().toLowerCase() : "";
                totalValue = entry.total_samples || entry.total_labno || 0;
            }

            console.log(`📅 Year: ${year}, Province: ${province}, Screened Total: ${totalValue}`);

            if (province === selectedProvince2.trim().toLowerCase()) {
                if (year === selectedYearA) totalYearA += totalValue;
                if (year === selectedYearB) totalYearB += totalValue;
            }
        });

        console.log(`📊 Final Screened Data for Chart -> ${selectedYearA}: ${totalYearA}, ${selectedYearB}: ${totalYearB}`);

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
                labels: [""],  // ✅ Keep label
                datasets: [
                    {
                        label: selectedYearA.toString(),  // ✅ Keep legend label
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
                scales: {
                    x: {
                        beginAtZero: true,
                        max: 60000,          // ✅ Set max value
                        ticks: {
                            stepSize: 4000  // ✅ Step interval
                        }
                    }
                },
                plugins: {
                    legend: { display: true },  // ✅ Show legend
                    datalabels: {
                        anchor: 'end',
                        align: 'right',
                        color: '#000',
                        font: { weight: 'bold', size: 14 },
                        formatter: (value) => value.toLocaleString()
                    }
                }
            },
            plugins: [ChartDataLabels]
        });

        updateTable2(totalYearA, totalYearB);
    }

    function fetchChartData2() {
        // ✅ Updated to use 'type=Screened' parameter instead of screened array
        let apiUrl = `http://localhost:3001/api/inc-dec/monthly-labno-count?from=${selectedYearA}-01-01&to=${selectedYearB}-12-31&province=${encodeURIComponent(selectedProvince2)}&type=Screened`;
        console.log("🚀 Fetching screened sample data from:", apiUrl);

        fetch(apiUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("✅ API Response Data:", data);

                if (!data) {
                    console.warn("⚠️ No data received! Check API response.");
                    return;
                }

                // ✅ Handle the new API response structure
                let dataToProcess = data;
                
                // Log the parameters returned by API for debugging
                if (data.parameters) {
                    console.log("🔧 API Parameters:", data.parameters);
                }

                // Log summary if available
                if (data.summary) {
                    console.log("📊 Data Summary:", data.summary);
                }

                // Use monthlyData if available, otherwise fall back to rawData
                let filteredData;
                if (data.monthlyData && Array.isArray(data.monthlyData)) {
                    console.log("📅 Using monthlyData for processing");
                    filteredData = filterDataByMonthRange(data, selectedMonthRange);
                } else if (data.rawData && Array.isArray(data.rawData)) {
                    console.log("📊 Using rawData for processing");
                    // Transform rawData to match expected format
                    dataToProcess = { monthlyData: data.rawData };
                    filteredData = filterDataByMonthRange(dataToProcess, selectedMonthRange);
                } else {
                    console.warn("⚠️ No valid data structure found in API response");
                    return;
                }

                console.table(filteredData);
                updateChart2(filteredData);
            })
            .catch(error => {
                console.error("❌ Error fetching chart data:", error);
                // Optionally show user-friendly error message
                alert("Failed to fetch chart data. Please check your connection and try again.");
            });
    }

    // ✅ Event Listeners for Dropdowns
    document.getElementById("yearDropdownA").addEventListener("click", function (event) {
        event.preventDefault(); // ⛔ Prevents page jump
        let selected = event.target.getAttribute("data-year");
        if (selected) { 
            selectedYearA = parseInt(selected, 10); 
            updateDropdownText2(); 
            fetchChartData2(); 
        }
    });

    document.getElementById("yearDropdownB").addEventListener("click", function (event) {
        event.preventDefault(); // ⛔ Prevents page jump
        let selected = event.target.getAttribute("data-year");
        if (selected) { 
            selectedYearB = parseInt(selected, 10); 
            updateDropdownText2(); 
            fetchChartData2();
        }
    });

    document.getElementById("provinceDropdown2").addEventListener("click", function (event) {
        event.preventDefault(); // ⛔ Prevents page jump
        let selected = event.target.getAttribute("data-province");
        if (selected) { 
            selectedProvince2 = selected; 
            updateDropdownText2(); 
            fetchChartData2(); 
        }
    });

    document.getElementById("monthDropdown2").addEventListener("click", function (event) {
        event.preventDefault(); // ⛔ Prevents page jump
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

    document.getElementById("downloadCumulativeChart").addEventListener("click", function () {
        const chart = Chart.getChart("marketingOverview2"); // Replace "myChart" with your chart ID
        const originalCanvas = chart.canvas;
        
        // Create high-resolution canvas
        const highResCanvas = document.createElement('canvas');
        const ctx = highResCanvas.getContext('2d');
        
        // Set high resolution (3x for better quality)
        const scaleFactor = 3;
        const width = originalCanvas.width;
        const height = originalCanvas.height;
        
        // Set canvas size with scale factor
        highResCanvas.width = width * scaleFactor;
        highResCanvas.height = height * scaleFactor;
        
        // Scale the context to match
        ctx.scale(scaleFactor, scaleFactor);
        
        // Set high quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Add white background first
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        
        // Draw the chart on top of white background
        ctx.drawImage(originalCanvas, 0, 0, width, height);
        
        // Create download link
        const link = document.createElement('a');
        link.download = 'cumulative_screened_samples_chart.png';
        link.href = highResCanvas.toDataURL('image/png', 1.0);
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    document.getElementById("downloadMonthlyTotalScreened").addEventListener("click", function () {
        const chart = Chart.getChart("marketingOverview"); // Replace "myChart" with your chart ID
        const originalCanvas = chart.canvas;
        
        // Create high-resolution canvas
        const highResCanvas = document.createElement('canvas');
        const ctx = highResCanvas.getContext('2d');
        
        // Set high resolution (3x for better quality)
        const scaleFactor = 3;
        const width = originalCanvas.width;
        const height = originalCanvas.height;
        
        // Set canvas size with scale factor
        highResCanvas.width = width * scaleFactor;
        highResCanvas.height = height * scaleFactor;
        
        // Scale the context to match
        ctx.scale(scaleFactor, scaleFactor);
        
        // Set high quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Add white background first
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        
        // Draw the chart on top of white background
        ctx.drawImage(originalCanvas, 0, 0, width, height);
        
        // Create download link
        const link = document.createElement('a');
        link.download = 'monthly_screened_samples_chart.png';
        link.href = highResCanvas.toDataURL('image/png', 1.0);
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
});