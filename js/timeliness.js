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
        "Sep": 9,
        "Oct": 10,
        "Nov": 11,
        "Dec": 12
    };

    // Function to update dropdown button text
    function updateDropdownText() {
        // Map selectedMonth to its string equivalent
        const monthNames = Object.keys(monthMap);
        document.getElementById("monthDropdownButton").textContent = monthNames[selectedMonth - 1];

        document.getElementById("year1Dropdown").textContent = selectedYear1;
        document.getElementById("year2Dropdown").textContent = selectedYear2;
        document.getElementById("provinceDropdownButton").textContent = selectedProvince;

        // Update the card titles
        let cardTitle = document.querySelector(".province");
        if (cardTitle) {
            cardTitle.textContent = selectedProvince; // Use selectedProvince directly
        }

        let monthTitle = document.querySelector(".month");
        if (monthTitle) {
            monthTitle.textContent = monthNames[selectedMonth - 1];
        }
        // Other month/year titles
        let month1Title = document.querySelector(".month1");
        if (month1Title) {
            month1Title.textContent = monthNames[selectedMonth - 1];
        }

        let year1Title = document.querySelector("#year1");
        if (year1Title) {
            year1Title.textContent = selectedYear1;
        }

        let year2Title = document.querySelector("#year2");
        if (year2Title) {
            year2Title.textContent = selectedYear2;
        }
    }

    // Function to fetch data from the API and populate the table
    function fetchData() {
        // Construct the URL with query parameters based on the selected values
        const url = `http://localhost:3000/api/timeliness?year1=${selectedYear1}&year2=${selectedYear2}&month=${selectedMonth}&province=${selectedProvince}`;

        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.message === "No data found") {
                    // Handle no data scenario
                    alert("No data found for the selected criteria.");
                    return;
                }

                // Inside fetchData function
                data.forEach(yearData => {
                    // Ensure yearData.month_year is defined and a string before calling startsWith
                    if (yearData.month_year && typeof yearData.month_year === "string") {
                        if (yearData.month_year.startsWith(selectedYear1)) {
                            populateTableData(yearData, selectedYear1);
                        } else if (yearData.month_year.startsWith(selectedYear2)) {
                            populateTableData(yearData, selectedYear2);
                        }
                    } else {
                        console.warn('Invalid or missing month_year in data:', yearData);
                    }
                });
            })
            .catch(error => {
                console.error('Error fetching data:', error);
                alert('Error fetching data. Please try again later.');
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
            fetchData();
        });
    });

    // Year 2
    document.querySelectorAll("#year2Menu .dropdown-item").forEach(item => {
        item.addEventListener("click", function (event) {
            event.preventDefault();
            selectedYear2 = item.getAttribute("data-value");
            updateDropdownText();
            fetchData();
        });
    });

    // Month
    document.querySelectorAll("#monthMenu .dropdown-item").forEach(item => {
        item.addEventListener("click", function (event) {
            event.preventDefault();
            selectedMonth = monthMap[item.getAttribute("data-value")]; // Convert selected month to number
            updateDropdownText();
            fetchData();
        });
    });

    // Province
    document.querySelectorAll(".province-item").forEach(item => {
        item.addEventListener("click", function (event) {
            event.preventDefault();
            selectedProvince = item.getAttribute("data-value");
            updateDropdownText();
            fetchData();
        });
    });

    // Initialize the dropdown text on page load
    updateDropdownText();

    // Initial data fetch
    fetchData();
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
});

