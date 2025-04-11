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

    // Function to clear previous data in the table
    function clearTableData() {
        // Define all the cell ID prefixes we want to clear
        const idPrefixes = ['aoc-ave-', 'aoc-med-', 'aoc-mod-', 
                           'transit-ave-', 'transit-med-', 'transit-mod-', 
                           'age-ave-', 'age-med-', 'age-mod-'];
        
        [selectedYear1, selectedYear2].forEach(year => {
            idPrefixes.forEach(prefix => {
                const cellId = `${prefix}${year}`;
                const cell = document.getElementById(cellId);
                if (cell) {
                    cell.textContent = "N/A";
                }
            });
        });
    }
    
    function populateTableData(data, yearKey) {
        console.log(`Populating table data for ${yearKey}`, data);
    
        const mappings = {
            'AOC_AVE': `aoc-ave-${yearKey}`,
            'AOC_MED': `aoc-med-${yearKey}`,
            'AOC_MOD': `aoc-mod-${yearKey}`,
            'TRANSIT_AVE': `transit-ave-${yearKey}`,
            'TRANSIT_MED': `transit-med-${yearKey}`,
            'TRANSIT_MOD': `transit-mod-${yearKey}`,
            'AOS_AVE': `age-ave-${yearKey}`,
            'AOS_MED': `age-med-${yearKey}`,
            'AOS_MOD': `age-mod-${yearKey}`
        };
    
        for (const [field, elementId] of Object.entries(mappings)) {
            const cell = document.getElementById(elementId);
            if (cell) {
                const value = data[field];
                cell.textContent = value !== undefined && value !== null ? value : 'N/A';
            } else {
                console.warn(`Element with ID '${elementId}' not found.`);
            }
        }
    }
    

    function fetchData() {
        // Construct API URL with selected parameters
        const url = `http://localhost:3000/api/timeliness?year1=${selectedYear1}&year2=${selectedYear2}&month=${selectedMonth}&province=${selectedProvince}`;
        
        console.log("Fetching data from:", url);
        
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("API response:", data);
                
                // Clear existing table data
                clearTableData();

                if (!data || data.length === 0 || data.message === "No data found") {
                    console.warn("No data available for the selected criteria");
                    return;
                }

                data.forEach(item => {
                    const year = item.MONTH_YEAR?.substring(0, 4);
                
                    if (parseInt(year) === selectedYear1) {
                        populateTableData(item, "year1");
                    } else if (parseInt(year) === selectedYear2) {
                        populateTableData(item, "year2");
                    }
                });
            })
            .catch(error => {
                console.error("Error fetching data:", error);
                alert("Failed to fetch data. Please check your connection and try again.");
            });
    }

    // Year 1 dropdown
    document.querySelectorAll("#year1Menu .dropdown-item").forEach(item => {
        item.addEventListener("click", function(event) {
            event.preventDefault();
            selectedYear1 = item.getAttribute("time-year1-value");
            updateDropdownText();
            fetchData();
        });
    });

    // Year 2 dropdown
    document.querySelectorAll("#year2Menu .dropdown-item").forEach(item => {
        item.addEventListener("click", function(event) {
            event.preventDefault();
            selectedYear2 = item.getAttribute("time-year2-value");
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
    let currentTableIndex = 0;

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