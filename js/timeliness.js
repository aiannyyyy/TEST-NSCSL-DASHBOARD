document.addEventListener("DOMContentLoaded", function () {
    let selectedYear1 = 2024; // Default previous year
    let selectedYear2 = 2025; // Default current year
    let selectedProvince = "Batangas"; // Default province
    let selectedMonth = "Jan"; // Default month

    // Function to update dropdown button text
    function updateDropdownText() {
        document.getElementById("year1Dropdown").textContent = selectedYear1;
        document.getElementById("year2Dropdown").textContent = selectedYear2;
        document.getElementById("provinceDropdownButton").textContent = selectedProvince;
        document.getElementById("monthDropdownButton").textContent = selectedMonth;

        // Update the card title with the selected province
        let cardTitle = document.querySelector(".province");
        if (cardTitle) {
            cardTitle.textContent = selectedProvince; // Use selectedProvince directly instead of wrapping it in parentheses
        }

        let monthTitle = document.querySelector(".month");
        if (monthTitle){
            monthTitle.textContent = selectedMonth
        }

        let month1Title = document.querySelector(".month1");
        if (month1Title){
            month1Title.textContent = selectedMonth
        }

        let month11Title = document.querySelector(".month11");
        if (month11Title){
            month11Title.textContent = selectedMonth
        }

        let year1Title = document.querySelector("#year1");
        if (year1Title){
            year1Title.textContent = selectedYear1
        }

        let year11Title = document.querySelector("#year11");
        if (year11Title){
            year11Title.textContent = selectedYear1
        }

        let year111Title = document.querySelector("#year111");
        if (year111Title){
            year111Title.textContent = selectedYear1
        }

        let year2Title = document.querySelector("#year2");
        if (year2Title){
            year2Title.textContent = selectedYear2
        }

        let year22Title = document.querySelector("#year22");
        if (year22Title){
            year22Title.textContent = selectedYear2
        }

        let year222Title = document.querySelector("#year222");
        if (year222Title){
            year222Title.textContent = selectedYear2
        }

        // Fetch and populate data based on the updated selections
        fetchData();
    }

    // Function to fetch and populate data
    function fetchData() {
        // Construct the URL with the query parameters
        const url = `http://localhost:3000/api/timeliness?year1=${selectedYear1}&year2=${selectedYear2}&province=${selectedProvince}&month=${selectedMonth}`;
        
        fetch(url)
            .then(response => response.json())
            .then(data => {
                console.log("Fetched Data: ", data); // Log the response to check its structure

                // Check if data exists and has rows
                if (data && Array.isArray(data) && data.length > 0) {
                    // Default values in case data for a specific year or field is missing
                    const year2024Data = data.find(item => item.YEAR === 2024) || {};
                    const year2025Data = data.find(item => item.YEAR === 2025) || {};

                    // Populate table cells based on available data
                    populateTableData(year2024Data, 2024);
                    populateTableData(year2025Data, 2025);
                } else {
                    console.error('No data found for the given parameters');
                    // Optionally handle no data situation, e.g., display a message or reset values
                    const defaultValue = 'N/A';
                    const fields = [
                        'aoc-ave', 'transit-ave', 'age-ave',
                        'aoc-med', 'transit-med', 'age-med',
                        'aoc-mod', 'transit-mod', 'age-mod'
                    ];

                    fields.forEach(field => {
                        document.getElementById(`${field}-2024`).textContent = defaultValue;
                        document.getElementById(`${field}-2025`).textContent = defaultValue;
                    });
                }
            })
            .catch(error => {
                console.error('Error fetching data:', error);
                // Handle errors by displaying a message
                const fields = [
                    'aoc-ave', 'transit-ave', 'age-ave',
                    'aoc-med', 'transit-med', 'age-med',
                    'aoc-mod', 'transit-mod', 'age-mod'
                ];

                fields.forEach(field => {
                    document.getElementById(`${field}-2024`).textContent = 'Error loading data';
                    document.getElementById(`${field}-2025`).textContent = 'Error loading data';
                });
            });
    }

    // Function to populate table data
    function populateTableData(yearData, year) {
        const fields = ['AOC_AVE', 'TRANSIT_AVE', 'AOS_AVE', 'AOC_MED', 'TRANSIT_MED', 'AOS_MED', 'AOC_MOD', 'TRANSIT_MOD', 'AOS_MOD'];
        fields.forEach(field => {
            document.getElementById(`${field.toLowerCase()}-${year}`).textContent = yearData[field] || 'N/A';
        });
    }

    // Year 1
    document.querySelectorAll("#year1Menu .dropdown-item").forEach(item => {
        item.addEventListener("click", function (event) {
            event.preventDefault();
            selectedYear1 = item.getAttribute("data-value");
            updateDropdownText();
        });
    });

    // Year 2
    document.querySelectorAll("#year2Menu .dropdown-item").forEach(item => {
        item.addEventListener("click", function (event) {
            event.preventDefault();
            selectedYear2 = item.getAttribute("data-value");
            updateDropdownText();
        });
    });

    // Month
    document.querySelectorAll("#monthMenu .dropdown-item").forEach(item => {
        item.addEventListener("click", function (event) {
            event.preventDefault();
            selectedMonth = item.getAttribute("data-value");
            updateDropdownText();
        });
    });

    // Province
    document.querySelectorAll(".province-item").forEach(item => {
        item.addEventListener("click", function (event) {
            event.preventDefault();
            selectedProvince = item.getAttribute("data-value");
            updateDropdownText();
        });
    });

    // Initialize the dropdown text on page load
    updateDropdownText();
    fetchData(); // Initial data load
});

// Select the tables and buttons
const aocTable = document.getElementById('aocTable');
const transitTimeTable = document.getElementById('transitTimeTable');
const ageUponReceiptTable = document.getElementById('ageUponReceiptTable');

const prevButton = document.getElementById('prevButton');
const nextButton = document.getElementById('nextButton');

// Variable to track the current state of the tables
let currentTableIndex = 0;
const tables = [aocTable, transitTimeTable, ageUponReceiptTable];

// Function to show the table based on index
function showTable(index) {
    // Hide all tables first
    tables.forEach((table) => {
        table.style.display = 'none';
    });

    // Show the current table
    tables[index].style.display = 'table';
}

// Initial table visibility
showTable(currentTableIndex);

// Event listener for the "Prev" button
prevButton.addEventListener('click', () => {
    if (currentTableIndex > 0) {
        currentTableIndex--;
    }
    showTable(currentTableIndex);
});

// Event listener for the "Next" button
nextButton.addEventListener('click', () => {
    if (currentTableIndex < tables.length - 1) {
        currentTableIndex++;
    }
    showTable(currentTableIndex);
    fetchData();
});

