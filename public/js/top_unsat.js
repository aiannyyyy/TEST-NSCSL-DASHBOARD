//top_unsat.js

/*
$(document).ready(function () {
    const { from, to } = getDefaultDateRange();

    updateMonthDisplay(from); // Set the month/year text
    fetchTopUnsatisfactoryContributors(from, to, "numbers");

    $("input[name='btnradio']").change(function () {
        const selectedType = $(this).attr("id") === "btnradio1" ? "numbers" : "percentages";
        fetchTopUnsatisfactoryContributors(from, to, selectedType);
    });
});

// Set default date range: January 1 to January 31 of current year
function getDefaultDateRange() {
    const currentYear = new Date().getFullYear();

    const from = new Date(`${currentYear}-01-01`);
    const to = new Date(`${currentYear}-01-31`);

    function formatDate(d) {
        return d.toISOString().split('T')[0];
    }

    return { from: formatDate(from), to: formatDate(to) };
}

// Dynamically update the text that shows the selected month
function updateMonthDisplay(fromDateStr) {
    const date = new Date(fromDateStr);
    const options = { month: 'long', year: 'numeric' };
    const formattedMonth = date.toLocaleDateString('en-US', options);

    $(".selected-month-year").text(`For the month of ${formattedMonth}`);
}

// Escape HTML to prevent injection
function escapeHtml(text) {
    return $('<div>').text(text).html();
}

// Format the value depending on selected radio type
function formatValue(visit, type) {
    if (type === "numbers") {
        return visit.UNSATISFACTORY_COUNT || visit.unsatisfactory_count || 0;
    } else {
        const rate = visit.UNSAT_RATE || visit.unsat_rate || 0;
        return parseFloat(rate).toFixed(2) + "%";
    }
}

// Fetch top contributors for the selected type (numbers or percentages)
function fetchTopUnsatisfactoryContributors(fromDate, toDate, type) {
    const requestUrl =
        type === "numbers"
            ? `http://localhost:3001/api/unsat/top-unsatisfactory?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`
            : `http://localhost:3001/api/unsat/rate-unsatisfactory?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`;

    const container = $(".scrollable-container");
    container.html(`<p class="text-center text-muted">Loading...</p>`);

    $.get(requestUrl)
        .done(function (data) {
            container.html("");

            if (!data || data.length === 0) {
                container.append(`<p class="text-muted text-center">No data available</p>`);
                return;
            }

            data.slice(0, 20).forEach((visit) => {
                const facilityName = escapeHtml(visit.FACILITY_NAME || visit.facility_name || "Unknown Facility");
                const province = escapeHtml(visit.PROVINCE || visit.province || "Unknown Province");
                const value = formatValue(visit, type);

                container.append(`
                    <div class="wrapper d-flex align-items-center justify-content-between py-2 border-bottom">
                        <div class="d-flex">
                            <img class="img-sm rounded-10" src="assets/images/hospital.png" alt="Hospital">
                            <div class="wrapper ms-3">
                                <p class="ms-1 mb-1 fw-bold">${facilityName}</p>
                                <small class="text-muted mb-0">${province}</small>
                            </div>
                        </div>
                        <div class="text-muted text-big fw-bold">${value}</div>
                    </div>
                `);
            });
        })
        .fail(function () {
            container.html(`<p class="text-danger text-center">Error loading data</p>`);
        });
}

*/
// Global state management
window.currentDateState = {
    from: '',
    to: '',
    type: 'numbers'
};

$(document).ready(function () {
    const { from, to } = getDefaultDateRange();
    
    // Initialize global state
    window.currentDateState.from = from;
    window.currentDateState.to = to;
    window.currentDateState.type = "numbers";

    updateMonthDisplay(from); // Set the month/year text
    fetchTopUnsatisfactoryContributors(from, to, "numbers");

    // Fixed: Radio button change handler - now uses current date state
    $("input[name='btnradio']").change(function () {
        const selectedType = $(this).attr("id") === "btnradio1" ? "numbers" : "percentages";
        window.currentDateState.type = selectedType;
        
        // Use the current date state instead of default range
        fetchTopUnsatisfactoryContributors(
            window.currentDateState.from, 
            window.currentDateState.to, 
            selectedType
        );
    });
});

// Set default date range: January 1 to January 31 of current year
function getDefaultDateRange() {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // Get current month (0-11)

    // Use current month instead of hardcoded January
    const from = new Date(currentYear, currentMonth, 1); // First day of current month
    const to = new Date(currentYear, currentMonth + 1, 0); // Last day of current month

    function formatDate(d) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day} 00:00`; // Fixed: Add time format to match backend
    }

    return { 
        from: formatDate(from), 
        to: formatDate(to).replace(' 00:00', ' 23:59') // End of day for 'to' date
    };
}

// Dynamically update the text that shows the selected month
function updateMonthDisplay(fromDateStr) {
    const date = new Date(fromDateStr);
    const options = { month: 'long', year: 'numeric' };
    const formattedMonth = date.toLocaleDateString('en-US', options);

    $(".selected-month-year").text(`For the month of ${formattedMonth}`);
}

// Escape HTML to prevent injection
function escapeHtml(text) {
    return $('<div>').text(text).html();
}

// Format the value depending on selected radio type
function formatValue(visit, type) {
    if (type === "numbers") {
        return visit.UNSATISFACTORY_COUNT || visit.unsatisfactory_count || 0;
    } else {
        const rate = visit.UNSAT_RATE || visit.unsat_rate || 0;
        return parseFloat(rate).toFixed(2) + "%";
    }
}

// Function to update global date state (called from modal)
function updateDateState(fromDate, toDate) {
    window.currentDateState.from = fromDate;
    window.currentDateState.to = toDate;
    console.log("🔄 Date state updated:", window.currentDateState);
}

// NEW: Function to handle facility click and show details modal
function showFacilityDetails(facilityName) {
    console.log(`🏥 Showing details for facility: ${facilityName}`);
    
    // Set the modal title
    $('#facilityDetailsModal .modal-title').text(`Unsatisfactory Results - ${facilityName}`);
    
    // Show loading state
    $('#facilityDetailsModalBody').html(`
        <div class="text-center p-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Loading facility details...</p>
        </div>
    `);
    
    // Show the modal
    $('#facilityDetailsModal').modal('show');
    
    // Fetch facility details
    fetchFacilityDetails(facilityName);
}

// NEW: Function to fetch detailed unsatisfactory results for a facility
function fetchFacilityDetails(facilityName) {
    // Extract just the date part (YYYY-MM-DD) from the datetime string
    const fromDate = window.currentDateState.from.split(' ')[0];
    const toDate = window.currentDateState.to.split(' ')[0];
    
    const requestUrl = `http://localhost:3001/api/unsat/details-unsatisfactory?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}&facility_name=${encodeURIComponent(facilityName)}`;
    
    console.log(`🔍 Fetching facility details: ${requestUrl}`);
    console.log(`📅 Date range: ${fromDate} to ${toDate}`);
    
    $.get(requestUrl)
        .done(function (data) {
            console.log("✅ Facility details received:", data);
            
            if (!data || data.length === 0) {
                $('#facilityDetailsModalBody').html(`
                    <div class="alert alert-info text-center">
                        <i class="mdi mdi-information-outline me-2"></i>
                        No unsatisfactory results found for this facility in the selected date range.
                    </div>
                `);
                return;
            }
            
            // Build the details table
            let tableHtml = `
                <div class="table-responsive">
                    <table class="table table-striped table-hover">
                        <thead class="table-dark">
                            <tr>
                                <th>Lab No</th>
                                <th>Patient Name</th>
                                <th>Test Result</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            data.forEach((record) => {
                const labNo = escapeHtml(record.LABNO || record.labno || 'N/A');
                const firstName = escapeHtml(record.FIRST_NAME || record.first_name || '');
                const lastName = escapeHtml(record.LAST_NAME || record.last_name || '');
                const fullName = `${firstName} ${lastName}`.trim() || 'N/A';
                const testResult = escapeHtml(record.TEST_RESULT || record.test_result || 'N/A');
                
                tableHtml += `
                    <tr>
                        <td><strong>${labNo}</strong></td>
                        <td>${fullName}</td>
                        <td>
                            <span class="badge bg-danger">${testResult}</span>
                        </td>
                    </tr>
                `;
            });
            
            tableHtml += `
                        </tbody>
                    </table>
                </div>
                <div class="mt-3">
                    <small class="text-muted">
                        <i class="mdi mdi-information-outline me-1"></i>
                        Total unsatisfactory results: <strong>${data.length}</strong>
                    </small>
                </div>
            `;
            
            $('#facilityDetailsModalBody').html(tableHtml);
        })
        .fail(function (xhr, status, error) {
            console.error("❌ Error loading facility details:", xhr.responseText || error);
            $('#facilityDetailsModalBody').html(`
                <div class="alert alert-danger text-center">
                    <i class="mdi mdi-alert-circle-outline me-2"></i>
                    Error loading facility details: ${xhr.status} ${error}
                </div>
            `);
        });
}

function fetchTopUnsatisfactoryContributors(fromDate, toDate, type) {
    const requestUrl =
        type === "numbers"
            ? `http://localhost:3001/api/unsat/top-unsatisfactory?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`
            : `http://localhost:3001/api/unsat/rate-unsatisfactory?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`;

    const container = $(".scrollable-container");
    container.html(`<p class="text-center text-muted">Loading...</p>`);

    console.log(`🔍 Requesting: ${requestUrl}`); // Debug log

    $.get(requestUrl)
        .done(function (data) {
            console.log("✅ Data received:", data); // Debug log
            container.html("");

            if (!data || data.length === 0) {
                container.append(`<p class="text-muted text-center">No data available</p>`);
                return;
            }
            
            data.slice(0, 20).forEach((visit) => {
                const facilityName = escapeHtml(visit.FACILITY_NAME || visit.facility_name || "Unknown Facility");
                const province = escapeHtml(visit.PROVINCE || visit.province || "Unknown Province");
                const value = formatValue(visit, type);
                
                // ENHANCED: Make each facility row clickable
                container.append(`
                    <div class="wrapper d-flex align-items-center justify-content-between py-2 border-bottom facility-row" 
                         style="cursor: pointer; transition: background-color 0.2s ease;" 
                         data-facility-name="${facilityName}"
                         onmouseover="this.style.backgroundColor='#f8f9fa'" 
                         onmouseout="this.style.backgroundColor='transparent'">
                        <div class="d-flex">
                            <img class="img-sm rounded-10" src="assets/images/hospital.png" alt="Hospital">
                            <div class="wrapper ms-3">
                                <p class="ms-1 mb-1 fw-bold">${facilityName}</p>
                                <small class="text-muted mb-0">${province}</small>
                            </div>
                        </div>
                        <div class="d-flex align-items-center">
                            <div class="text-muted text-big fw-bold me-2">${value}</div>
                            <i class="mdi mdi-chevron-right text-muted"></i>
                        </div>
                    </div>
                `);
            });
            
            // NEW: Add click event handler for facility rows
            $('.facility-row').on('click', function() {
                const facilityName = $(this).data('facility-name');
                showFacilityDetails(facilityName);
            });
        })
        .fail(function (xhr, status, error) {
            console.error("❌ Error loading data:", xhr.responseText || error); // Better error logging
            container.html(`<p class="text-danger text-center">Error loading data: ${xhr.status} ${error}</p>`);
        });
}