//unsat_modal.js
/*
$(document).ready(function () {
    const { from, to } = getDefaultDateRange();
    setDefaultDates(); // Set default inputs
    fetchTopUnsatisfactoryContributors(from, to, "numbers"); // Default to numbers
});

// ✅ Set default dates into input fields and update label
function setDefaultDates() {
    const now = new Date();
    const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01T00:00`;

    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const lastDayFormatted = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}T23:59`;

    $("#dateTimeFrom").val(firstDay);
    $("#dateTimeTo").val(lastDayFormatted);

    updateMonthYearLabel(firstDay);
}

// ✅ Get default date range formatted as "YYYY-MM-DD HH:MM"
function getDefaultDateRange() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59);

    const formattedFrom = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, "0")}-${String(firstDay.getDate()).padStart(2, "0")} 00:00`;
    const formattedTo = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")} 23:59`;

    return { from: formattedFrom, to: formattedTo };
}

// ✅ Update month/year label based on a date string
function updateMonthYearLabel(dateStr) {
    const date = new Date(dateStr);
    const month = date.toLocaleString("default", { month: "long" });
    const year = date.getFullYear();
    $(".selected-month-year").text(`For the month of ${month} ${year}`);
}

// ✅ Fetch contributors from the appropriate API
function fetchTopUnsatisfactoryContributors(fromDate, toDate, type = "numbers") {
    const apiUrl = type === "numbers"
        ? `http://localhost:3001/api/unsat/top-unsatisfactory?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`
        : `http://localhost:3001/api/unsat/rate-unsatisfactory?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`;

    $.ajax({
        url: apiUrl,
        type: "GET",
        data: { from: fromDate, to: toDate },
        success: function (data) {
            console.log("✅ Data received:", data);
            // TODO: Render chart or data table here
        },
        error: function (error) {
            console.error("❌ Error fetching data:", error);
        }
    });
}

// ✅ Modal initialization — reapply default if empty
$("#dateRangeModal").on("show.bs.modal", function () {
    if (!$("#dateTimeFrom").val() || !$("#dateTimeTo").val()) {
        setDefaultDates();
    }
});

// ✅ Apply date filter button action
function applyDateFilter() {
    const fromDate = $("#dateTimeFrom").val();
    const toDate = $("#dateTimeTo").val();

    if (!fromDate || !toDate) {
        alert("Please select a date range!");
        return;
    }

    const formattedFrom = fromDate.replace("T", " ");
    const formattedTo = toDate.replace("T", " ");

    const selectedType = $("input[name='btnradio']:checked").attr("id") === "btnradio1"
        ? "numbers"
        : "percentages";

    updateMonthYearLabel(fromDate); // Update header
    fetchTopUnsatisfactoryContributors(formattedFrom, formattedTo, selectedType);

    $("#dateRangeModal").modal("hide");
}
*/

// Global variables to track current state
// Global variables to track current state
let currentDateFrom = '';
let currentDateTo = '';
let currentType = 'numbers';

$(document).ready(function () {
    const { from, to } = getDefaultDateRange();
    currentDateFrom = from;
    currentDateTo = to;
    
    setDefaultDates(); // Set default inputs
    fetchTopUnsatisfactoryContributors(from, to, "numbers"); // Default to numbers
    
    // Radio button change handler
    $("input[name='btnradio']").change(function () {
        currentType = $(this).attr("id") === "btnradio1" ? "numbers" : "percentages";
        fetchTopUnsatisfactoryContributors(currentDateFrom, currentDateTo, currentType);
    });
});

// ✅ Set default dates into input fields and update label
function setDefaultDates() {
    const now = new Date();
    const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01T00:00`;

    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const lastDayFormatted = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}T23:59`;

    $("#dateTimeFrom").val(firstDay);
    $("#dateTimeTo").val(lastDayFormatted);

    updateMonthYearLabel(firstDay);
}

// ✅ Get default date range formatted as "YYYY-MM-DD HH:MM"
function getDefaultDateRange() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59);

    const formattedFrom = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, "0")}-${String(firstDay.getDate()).padStart(2, "0")} 00:00`;
    const formattedTo = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")} 23:59`;

    return { from: formattedFrom, to: formattedTo };
}

// ✅ Update month/year label based on a date string
function updateMonthYearLabel(dateStr) {
    const date = new Date(dateStr);
    const month = date.toLocaleString("default", { month: "long" });
    const year = date.getFullYear();
    $(".selected-month-year").text(`For the month of ${month} ${year}`);
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

// ✅ Fetch contributors from the appropriate API and render data
function fetchTopUnsatisfactoryContributors(fromDate, toDate, type = "numbers") {
    const apiUrl = type === "numbers"
        ? `http://localhost:3001/api/unsat/top-unsatisfactory?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`
        : `http://localhost:3001/api/unsat/rate-unsatisfactory?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`;

    const container = $(".scrollable-container");
    container.html(`<p class="text-center text-muted">Loading...</p>`);

    console.log(`🔍 Requesting: ${apiUrl}`); // Debug log

    $.ajax({
        url: apiUrl,
        type: "GET",
        success: function (data) {
            console.log("✅ Data received:", data);
            container.html("");

            if (!data || data.length === 0) {
                container.append(`<p class="text-muted text-center">No data available</p>`);
                return;
            }

            // Render the data
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
        },
        error: function (xhr, status, error) {
            console.error("❌ Error fetching data:", xhr.responseText || error);
            container.html(`<p class="text-danger text-center">Error loading data: ${xhr.status} ${error}</p>`);
        }
    });
}

// ✅ Modal initialization — reapply default if empty
$("#dateRangeModal").on("show.bs.modal", function () {
    if (!$("#dateTimeFrom").val() || !$("#dateTimeTo").val()) {
        setDefaultDates();
    }
});

// Function to update the main page display (if it exists)
function updateMainPageDisplay(fromDate, toDate, type) {
    // Update the month display on main page
    if (typeof updateMonthDisplay === 'function') {
        updateMonthDisplay(fromDate);
    }
    
    // If there's a scrollable container on the main page, update it too
    const mainContainer = $(".scrollable-container");
    if (mainContainer.length && typeof fetchTopUnsatisfactoryContributors === 'function') {
        fetchTopUnsatisfactoryContributors(fromDate, toDate, type);
    }
}

// ✅ Apply date filter button action
function applyDateFilter() {
    const fromDate = $("#dateTimeFrom").val();
    const toDate = $("#dateTimeTo").val();

    if (!fromDate || !toDate) {
        alert("Please select a date range!");
        return;
    }

    const formattedFrom = fromDate.replace("T", " ");
    const formattedTo = toDate.replace("T", " ");

    // Update global state
    currentDateFrom = formattedFrom;
    currentDateTo = formattedTo;

    // Update the global date state (shared with main page)
    if (typeof updateDateState === 'function') {
        updateDateState(formattedFrom, formattedTo);
    }

    const selectedType = $("input[name='btnradio']:checked").attr("id") === "btnradio1"
        ? "numbers"
        : "percentages";
    
    currentType = selectedType;

    // Update global type state
    if (window.currentDateState) {
        window.currentDateState.type = selectedType;
    }

    updateMonthYearLabel(fromDate); // Update header
    fetchTopUnsatisfactoryContributors(formattedFrom, formattedTo, selectedType);
    
    // Also update main page if it exists
    updateMainPageDisplay(formattedFrom, formattedTo, selectedType);

    $("#dateRangeModal").modal("hide");
}