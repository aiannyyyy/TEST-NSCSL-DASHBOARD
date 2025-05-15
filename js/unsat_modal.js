$(document).ready(function () {
    setDefaultDates(); // ✅ Set default values on page load
    fetchTopUnsatisfactoryContributors("2025-01-01 00:00", "2025-01-31 23:59");
});

/* ✅ Function to set default dates
function setDefaultDates() {
    let defaultFrom = "2025-01-01T00:00";
    let defaultTo = "2025-01-31T23:59";
    
    $("#dateTimeFrom").val(defaultFrom);
    $("#dateTimeTo").val(defaultTo);
}

*/

function updateMonthYearLabel(dateStr) {
    const date = new Date(dateStr);
    const month = date.toLocaleString("default", { month: "long" });
    const year = date.getFullYear();
    $(".selected-month-year").text(`For the month of ${month} ${year}`);
}


function setDefaultDates() {
    const now = new Date();
    const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01T00:00`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0); // last day of the month
    const lastDayFormatted = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}T23:59`;

    $("#dateTimeFrom").val(firstDay);
    $("#dateTimeTo").val(lastDayFormatted);

    // ✅ Update header text
    updateMonthYearLabel(firstDay);
}



function getDefaultDateRange() {
    let now = new Date();
    let firstDay = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0);
    let lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59);

    let formattedFrom = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-${String(firstDay.getDate()).padStart(2, '0')} 00:00`;
    let formattedTo = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')} 23:59`;

    return { from: formattedFrom, to: formattedTo };
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
    updateMonthYearLabel(fromDate);


    // ✅ Get selected radio button (numbers or percentages)
    let selectedType = $("input[name='btnradio']:checked").attr("id") === "btnradio1" ? "numbers" : "percentages";

    // Fetch updated data
    fetchTopUnsatisfactoryContributors(formattedFrom, formattedTo, selectedType);

    // ✅ Close the modal after applying the filter
    $("#dateRangeModal").modal("hide");
}

