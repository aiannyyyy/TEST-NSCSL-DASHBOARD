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
