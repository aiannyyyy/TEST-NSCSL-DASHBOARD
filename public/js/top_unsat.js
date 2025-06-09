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
