/*
document.addEventListener("DOMContentLoaded", function () {
    let selectedYear1 = new Date().getFullYear() - 1; // last year
    let selectedYear2 = new Date().getFullYear();     // current year
    let selectedProvince = "Batangas"; // Default province
    // Set the selected month based on today's date
    let selectedMonth = new Date().getMonth() + 1;

    // Month name to number mapping
    const monthMap = {
        "Jan": 1,
        "Feb": 2,
        "Mar": 3,
        "Apr": 4,
        "May": 5,
        "Jun": 6,
        "Jul": 7,
        "Aug": 8,
        "Sept": 9,
        "Oct": 10,
        "Nov": 11,
        "Dec": 12
    };

    // Number to month name mapping (reverse of monthMap)
    const numberToMonth = {};
    Object.keys(monthMap).forEach(month => {
        numberToMonth[monthMap[month]] = month;
    });

    // Function to update dropdown button text and table headers
    function updateDropdownText() {
        // Update dropdown buttons
        document.getElementById("monthDropdownButton").textContent = numberToMonth[selectedMonth];
        document.getElementById("year1Dropdown").textContent = selectedYear1;
        document.getElementById("year2Dropdown").textContent = selectedYear2;
        document.getElementById("provinceDropdownButton").textContent = selectedProvince;

        // Update card title
        let provinceTitle = document.querySelector(".province");
        if (provinceTitle) {
            provinceTitle.textContent = selectedProvince;
        }

        // Update month in each table
        document.querySelectorAll(".month, .month1, .month11").forEach(elem => {
            if (elem) elem.textContent = numberToMonth[selectedMonth];
        });
        
        // Update year headers in all tables
        document.querySelectorAll("#year1, #year11, #year111").forEach(elem => {
            if (elem) elem.textContent = selectedYear1;
        });

        document.querySelectorAll("#year2, #year22, #year222").forEach(elem => {
            if (elem) elem.textContent = selectedYear2;
        });
    }

    // Clear table data
    function clearTableData() {
        const allCells = [
            // AOC cells
            "aoc-ave-year1", "aoc-ave-year2", "aoc-med-year1", "aoc-med-year2", "aoc-mod-year1", "aoc-mod-year2",
            // Transit cells
            "transit-ave-year1", "transit-ave-year2", "transit-med-year1", "transit-med-year2", "transit-mod-year1", "transit-mod-year2",
            // Age cells
            "age-ave-year1", "age-ave-year2", "age-med-year1", "age-med-year2", "age-mod-year1", "age-mod-year2"
        ];
        
        allCells.forEach(cellId => {
            const cell = document.getElementById(cellId);
            if (cell) {
                cell.textContent = "-";
            }
        });
    }

    async function fetchData() {
        try {
            // Clear existing data
            clearTableData();
            
            // Construct API URL with selected parameters
            const url = `http://localhost:3001/api/timeliness?year1=${selectedYear1}&year2=${selectedYear2}&month=${selectedMonth}&province=${selectedProvince}`;
            
            console.log("Fetching data from:", url);
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            
            const data = await response.json();
            console.log("API response:", data);
            
            if (!data || data.length === 0 || data.message === "No data found") {
                console.warn("No data available for the selected criteria");
                return;
            }
            
            // Process each data item and update the table
            data.forEach(item => {
                const year = item.MONTH_YEAR?.substring(0, 4);
                updateTableForYear(item, year);
            });
            
        } catch (error) {
            console.error("Error fetching data:", error);
            alert("Failed to fetch data. Please check your connection and try again.");
        }
    }
    
    function updateTableForYear(data, year) {
        const yearSuffix = parseInt(year) === parseInt(selectedYear1) ? "year1" : "year2";
        
        // Update AOC cells
        document.getElementById(`aoc-ave-${yearSuffix}`).textContent = data.AOC_AVE || "-";
        document.getElementById(`aoc-med-${yearSuffix}`).textContent = data.AOC_MED || "-";
        document.getElementById(`aoc-mod-${yearSuffix}`).textContent = data.AOC_MOD || "-";
        
        // Update Transit cells
        document.getElementById(`transit-ave-${yearSuffix}`).textContent = data.TRANSIT_AVE || "-";
        document.getElementById(`transit-med-${yearSuffix}`).textContent = data.TRANSIT_MED || "-";
        document.getElementById(`transit-mod-${yearSuffix}`).textContent = data.TRANSIT_MOD || "-";
        
        // Update Age/AOS cells
        document.getElementById(`age-ave-${yearSuffix}`).textContent = data.AOS_AVE || "-";
        document.getElementById(`age-med-${yearSuffix}`).textContent = data.AOS_MED || "-";
        document.getElementById(`age-mod-${yearSuffix}`).textContent = data.AOS_MOD || "-";
    }

    // Year 1 dropdown
    document.querySelectorAll("#year1Menu .dropdown-item").forEach(item => {
        item.addEventListener("click", function(event) {
            event.preventDefault();
            selectedYear1 = parseInt(item.getAttribute("time-year1-value"));
            updateDropdownText();
            fetchData();
        });
    });

    // Year 2 dropdown
    document.querySelectorAll("#year2Menu .dropdown-item").forEach(item => {
        item.addEventListener("click", function(event) {
            event.preventDefault();
            selectedYear2 = parseInt(item.getAttribute("time-year2-value"));
            updateDropdownText();
            fetchData();
        });
    });

    // Month dropdown
    document.querySelectorAll("#monthMenu .dropdown-item").forEach(item => {
        item.addEventListener("click", function(event) {
            event.preventDefault();
            const monthName = item.getAttribute("time-month-value");
            selectedMonth = monthMap[monthName];
            updateDropdownText();
            fetchData();
        });
    });

    // Province dropdown
    document.querySelectorAll(".province-item").forEach(item => {
        item.addEventListener("click", function(event) {
            event.preventDefault();
            selectedProvince = item.getAttribute("time-prov-value");
            updateDropdownText();
            fetchData();
        });
    });
    
    // Table navigation setup
    const tables = [
        document.getElementById('aocTable'),
        document.getElementById('transitTimeTable'),
        document.getElementById('ageUponReceiptTable')
    ];
    let currentTableIndex = 2; // Start with Age Upon Receipt table (index 2)

    function showTable(index) {
        tables.forEach((table, i) => {
            table.style.display = i === index ? 'table' : 'none';
        });
    }

    // Initialize table visibility
    showTable(currentTableIndex);

    // Previous button handler
    document.getElementById('prevButton').addEventListener('click', () => {
        if (currentTableIndex > 0) {
            currentTableIndex--;
            showTable(currentTableIndex);
        }
    });

    // Next button handler
    document.getElementById('nextButton').addEventListener('click', () => {
        if (currentTableIndex < tables.length - 1) {
            currentTableIndex++;
            showTable(currentTableIndex);
        }
    });

    // Initialize dropdown text and fetch initial data
    updateDropdownText();
    fetchData();
});
*/
document.addEventListener("DOMContentLoaded", function () {
    let selectedYear1 = new Date().getFullYear() - 1;
    let selectedYear2 = new Date().getFullYear();
    let selectedProvince = "Batangas";
    let selectedMonth = new Date().getMonth() + 1;

    const monthMap = {
        "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6,
        "Jul": 7, "Aug": 8, "Sept": 9, "Oct": 10, "Nov": 11, "Dec": 12
    };
    const numberToMonth = {};
    Object.keys(monthMap).forEach(month => {
        numberToMonth[monthMap[month]] = month;
    });

    let chartAOC = null;
    let chartTransit = null;
    let chartAOS = null;

    function updateDropdownText() {
        document.getElementById("monthDropdownButton").textContent = numberToMonth[selectedMonth];
        document.getElementById("year1Dropdown").textContent = selectedYear1;
        document.getElementById("year2Dropdown").textContent = selectedYear2;
        document.getElementById("provinceDropdownButton").textContent = selectedProvince;

        const provinceTitle = document.querySelector(".province");
        if (provinceTitle) provinceTitle.textContent = selectedProvince;
    }

    async function fetchChartData() {
        try {
            const url = `http://localhost:3001/api/timeliness?year1=${selectedYear1}&year2=${selectedYear2}&month=${selectedMonth}&province=${selectedProvince}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error ${response.status}`);

            const data = await response.json();
            if (!data || data.length === 0 || data.message === "No data found") {
                console.warn("No data available for selected criteria");
                return;
            }

            const year1Data = data.find(item => item.MONTH_YEAR.startsWith(selectedYear1.toString()));
            const year2Data = data.find(item => item.MONTH_YEAR.startsWith(selectedYear2.toString()));

            if (!year1Data || !year2Data) {
                console.warn("Data incomplete for both years");
                return;
            }

            const commonOptions = {
                responsive: true,
                plugins: {
                    legend: { position: 'top' },
                    title: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Days' }
                    }
                }
            };

            if (chartAOC) chartAOC.destroy();
            if (chartTransit) chartTransit.destroy();
            if (chartAOS) chartAOS.destroy();

            // Chart 1: Age of Collection
            chartAOC = new Chart(document.getElementById('chartAOC'), {
                type: 'bar',
                data: {
                    labels: ['Mean', 'Median', 'Mode'],
                    datasets: [
                        {
                            label: `${selectedYear1}`,
                            backgroundColor: 'rgba(54, 162, 235, 0.6)',
                            data: [year1Data.AOC_AVE, year1Data.AOC_MED, year1Data.AOC_MOD]
                        },
                        {
                            label: `${selectedYear2}`,
                            backgroundColor: 'rgba(255, 99, 132, 0.6)',
                            data: [year2Data.AOC_AVE, year2Data.AOC_MED, year2Data.AOC_MOD]
                        }
                    ]
                },
                options: commonOptions
            });

            // Chart 2: Transit Time
            chartTransit = new Chart(document.getElementById('chartTransit'), {
                type: 'bar',
                data: {
                    labels: ['Mean', 'Median', 'Mode'],
                    datasets: [
                        {
                            label: `${selectedYear1}`,
                            backgroundColor: 'rgba(75, 192, 192, 0.6)',
                            data: [year1Data.TRANSIT_AVE, year1Data.TRANSIT_MED, year1Data.TRANSIT_MOD]
                        },
                        {
                            label: `${selectedYear2}`,
                            backgroundColor: 'rgba(255, 159, 64, 0.6)',
                            data: [year2Data.TRANSIT_AVE, year2Data.TRANSIT_MED, year2Data.TRANSIT_MOD]
                        }
                    ]
                },
                options: commonOptions
            });

            // Chart 3: Age Upon Receipt (AOS)
            chartAOS = new Chart(document.getElementById('chartAOS'), {
                type: 'bar',
                data: {
                    labels: ['Mean', 'Median', 'Mode'],
                    datasets: [
                        {
                            label: `${selectedYear1}`,
                            backgroundColor: 'rgba(153, 102, 255, 0.6)',
                            data: [year1Data.AOS_AVE, year1Data.AOS_MED, year1Data.AOS_MOD]
                        },
                        {
                            label: `${selectedYear2}`,
                            backgroundColor: 'rgba(255, 205, 86, 0.6)',
                            data: [year2Data.AOS_AVE, year2Data.AOS_MED, year2Data.AOS_MOD]
                        }
                    ]
                },
                options: commonOptions
            });

        } catch (error) {
            console.error("Chart fetch error:", error);
            alert("Failed to load chart data.");
        }
    }

    // Year 1 dropdown
    document.querySelectorAll("#year1Menu .dropdown-item").forEach(item => {
        item.addEventListener("click", function (event) {
            event.preventDefault();
            selectedYear1 = parseInt(item.getAttribute("time-year1-value"));
            updateDropdownText();
            fetchChartData();
        });
    });

    // Year 2 dropdown
    document.querySelectorAll("#year2Menu .dropdown-item").forEach(item => {
        item.addEventListener("click", function (event) {
            event.preventDefault();
            selectedYear2 = parseInt(item.getAttribute("time-year2-value"));
            updateDropdownText();
            fetchChartData();
        });
    });

    // Month dropdown
    document.querySelectorAll("#monthMenu .dropdown-item").forEach(item => {
        item.addEventListener("click", function (event) {
            event.preventDefault();
            const monthName = item.getAttribute("time-month-value");
            selectedMonth = monthMap[monthName];
            updateDropdownText();
            fetchChartData();
        });
    });

    // Province dropdown
    document.querySelectorAll(".province-item").forEach(item => {
        item.addEventListener("click", function (event) {
            event.preventDefault();
            selectedProvince = item.getAttribute("time-prov-value");
            updateDropdownText();
            fetchChartData();
        });
    });

    updateDropdownText();
    fetchChartData();
});