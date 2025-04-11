document.addEventListener("DOMContentLoaded", function () {
    let selectedYear1 = 2024; // Default previous year
    let selectedYear2 = 2025; // Default current year
    let selectedProvince = "Batangas"; // Default province
    let selectedMonth = 1; // Default month as a number (1 = January)

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
            const url = `http://localhost:3000/api/timeliness?year1=${selectedYear1}&year2=${selectedYear2}&month=${selectedMonth}&province=${selectedProvince}`;
            
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