
/*
$(document).ready(function () {
    // Default view: By Numbers
    fetchTopUnsatisfactoryContributors("2025-01-01 00:00", "2025-01-31 23:59", "numbers");

    // Event listeners for radio buttons
    $("input[name='btnradio']").change(function () {
        let selectedType = $(this).attr("id") === "btnradio1" ? "numbers" : "percentages";
        fetchTopUnsatisfactoryContributors("2025-01-01 00:00", "2025-01-31 23:59", selectedType);
    });
});

*/

$(document).ready(function () {
    const { from, to } = getDefaultDateRange();
    fetchTopUnsatisfactoryContributors(from, to, "numbers");

    $("input[name='btnradio']").change(function () {
        let selectedType = $(this).attr("id") === "btnradio1" ? "numbers" : "percentages";
        fetchTopUnsatisfactoryContributors(from, to, selectedType);
    });
});


function fetchTopUnsatisfactoryContributors(fromDate, toDate, type) {
    let requestUrl =
        type === "numbers"
            ? `http://localhost:3000/api/unsat/top-unsatisfactory?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`
            : `http://localhost:3000/api/unsat/rate-unsatisfactory?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`;

    console.log("🔹 Fetching data from:", requestUrl);

    $.get(requestUrl, function (data) {
        let container = $(".scrollable-container");
        container.html(""); // Clear previous content

        if (!data || data.length === 0) {
            container.append(`<p class="text-muted text-center">No data available</p>`);
            return;
        }

        // Dynamically render either 'by numbers' or 'by percentages'
        data.slice(0, 20).forEach((visit) => {
            let facilityName = visit.FACILITY_NAME || visit.facility_name || "Unknown Facility";
            let province = visit.PROVINCE || visit.province || "Unknown Province";

            let value = type === "numbers" 
                ? visit.UNSATISFACTORY_COUNT || visit.unsatisfactory_count || 0 
                : (visit.UNSAT_RATE || visit.unsat_rate || 0) + "%";

            container.append(`
                <div class="wrapper d-flex align-items-center justify-content-between py-2 border-bottom">
                    <div class="d-flex">
                        <img class="img-sm rounded-10" src="/routes/hospital.png" alt="Hospital">
                        <div class="wrapper ms-3">
                            <p class="ms-1 mb-1 fw-bold">${facilityName}</p>
                            <small class="text-muted mb-0">${province}</small>
                        </div>
                    </div>
                    <div class="text-muted text-big fw-bold">${value}</div>
                </div>
            `);
        });
    }).fail(function (err) {
        console.error("❌ Error fetching top unsatisfactory contributors!", err);
        $(".scrollable-container").html(`<p class="text-danger text-center">Error loading data</p>`);
    });
}
