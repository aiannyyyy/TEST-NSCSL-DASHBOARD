document.addEventListener("DOMContentLoaded", function () {
    let selectedYear = new Date().getFullYear();
    const monthNames = ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"];
    let selectedMonth = monthNames[new Date().getMonth()]; // ← auto set to current month

    // Mapping of month names to month numbers
    const monthMap = {
        "January": 1,
        "February": 2,
        "March": 3,
        "April": 4,
        "May": 5,
        "June": 6,
        "July": 7,
        "August": 8,
        "September": 9,
        "October": 10,
        "November": 11,
        "December": 12
    };

    function updateDropdownText() {
        document.getElementById("lab-year-dropdown").textContent = selectedYear;
        document.getElementById("lab-month-dropdown").textContent = selectedMonth;

        let cardTitle = document.querySelector("#card-title-dash5");
        if (cardTitle) {
            cardTitle.innerHTML = `Tracking System from Date Collection to Release of Result - ${selectedMonth} ${selectedYear}`;
        }

        document.querySelectorAll(".month").forEach(elem => {
            if (elem) elem.textContent = selectedMonth.substring(0, 3);
        });

        // Fetch data from the backend after updating dropdown
        fetchData(selectedYear, selectedMonth);
    }

    // Fetch data from the server
    async function fetchData(year, month) {
        try {
            // Convert month name to month number
            const monthNumber = monthMap[month];

            const response = await fetch(`http://localhost:3001/api/lab-tracking?year=${year}&month=${monthNumber}`);
            const data = await response.json();

            if (data) {
                // Update the table with the data received
                updateTable(data);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    }

    // Update the table with fetched data
    function updateTable(data) {
        // Update the first table (DTCOLL - DTRECV)
        document.getElementById("ave-data").textContent = data.dtcoll_to_dtrecv.average || "-";
        document.getElementById("med-data").textContent = data.dtcoll_to_dtrecv.median || "-";
        document.getElementById("mod-data").textContent = data.dtcoll_to_dtrecv.mode || "-";

        // Update the second table (DTRECV - DTRELEASE)
        document.getElementById("ave-data1").textContent = data.dtrecv_to_dtrptd.average || "-";
        document.getElementById("med-data1").textContent = data.dtrecv_to_dtrptd.median || "-";
        document.getElementById("mod-data1").textContent = data.dtrecv_to_dtrptd.mode || "-";
    }

    // Year selection
    document.querySelectorAll("#lab-year-dropdown .dropdown-item").forEach(item => {
        item.addEventListener("click", function (event) {
            event.preventDefault();
            selectedYear = this.getAttribute("lab-data-year");
            updateDropdownText();
        });
    });

    // Month selection
    document.querySelectorAll("#lab-month-dropdown .dropdown-item").forEach(item => {
        item.addEventListener("click", function (event) {
            event.preventDefault();
            selectedMonth = this.getAttribute("lab-data-month");
            updateDropdownText();
        });
    });

    // Initialize with defaults
    updateDropdownText();
});
