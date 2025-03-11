function applyDateFilter() {
    // ✅ Use correct IDs from modal inputs
    let fromDate = $("#dateTimeFrom").val() || "2025-01-01T00:00";
    let toDate = $("#dateTimeTo").val() || "2025-01-31T23:59";

    if (!fromDate || !toDate) {
        alert("Please select a date range!");
        return;
    }

    // Convert to correct format (YYYY-MM-DD HH:MM)
    let formattedFrom = fromDate.replace("T", " "); // Replace 'T' with space
    let formattedTo = toDate.replace("T", " ");

    console.log("🔹 Applying filter with:", formattedFrom, formattedTo);

    // Fetch updated data for both table and top contributors section
    fetchTopUnsatisfactoryContributors(formattedFrom, formattedTo);
}

// ✅ Set default values in modal on page load
$(document).ready(function () {
    $("#dateTimeFrom").val("2025-01-01T00:00");
    $("#dateTimeTo").val("2025-01-31T23:59");

    // Fetch data on load using the default date range
    fetchTopUnsatisfactoryContributors("2025-01-01 00:00", "2025-01-31 23:59");
});
