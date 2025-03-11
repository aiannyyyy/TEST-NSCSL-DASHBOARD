$(document).ready(function () {
    setDefaultDates(); // ✅ Set default values on page load
    fetchTopUnsatisfactoryContributors("2025-01-01 00:00", "2025-01-31 23:59");
});

// ✅ Function to set default dates
function setDefaultDates() {
    let defaultFrom = "2025-01-01T00:00";
    let defaultTo = "2025-01-31T23:59";
    
    $("#dateTimeFrom").val(defaultFrom);
    $("#dateTimeTo").val(defaultTo);
}

// ✅ Reset defaults when modal is opened
$("#dateRangeModal").on("show.bs.modal", function () {
    if (!$("#dateTimeFrom").val() || !$("#dateTimeTo").val()) {
        setDefaultDates(); // Ensure fields have values when modal opens
    }
});

function applyDateFilter() {
    let fromDate = $("#dateTimeFrom").val();
    let toDate = $("#dateTimeTo").val();

    if (!fromDate || !toDate) {
        alert("Please select a date range!");
        return;
    }

    // Convert to correct format (YYYY-MM-DD HH:MM)
    let formattedFrom = fromDate.replace("T", " ");
    let formattedTo = toDate.replace("T", " ");

    console.log("🔹 Applying filter with:", formattedFrom, formattedTo);

    // ✅ Extract Month & Year
    let fromDateObj = new Date(fromDate);
    let month = fromDateObj.toLocaleString("default", { month: "long" });
    let year = fromDateObj.getFullYear();

    // ✅ Update the header text dynamically
    $(".selected-month-year").text(`For the month of ${month} ${year}`);

    // ✅ Get selected radio button (numbers or percentages)
    let selectedType = $("input[name='btnradio']:checked").attr("id") === "btnradio1" ? "numbers" : "percentages";

    // Fetch updated data
    fetchTopUnsatisfactoryContributors(formattedFrom, formattedTo, selectedType);

    // ✅ Close the modal after applying the filter
    $("#dateRangeModal").modal("hide");
}

