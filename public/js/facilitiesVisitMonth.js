
/*
$(document).ready(function () {
    if ($("#doughnutChart").length) {
        const doughnutChartCanvas = document.getElementById("doughnutChart").getContext("2d");

        // ✅ Register ChartDataLabels plugin once
        if (typeof ChartDataLabels !== "undefined") {
            Chart.register(ChartDataLabels);
        } else {
            console.error("ChartDataLabels plugin is missing!");
            return; // Stop further execution if plugin is missing
        }

        // ✅ Fetch facility status via AJAX
        $.ajax({
            url: "http://localhost:3000/api/facility-visits/facility-status-count",
            method: "GET",
            success: function (data) {
                // ✅ Destroy any previous instance
                if (window.doughnutChartInstance) {
                    window.doughnutChartInstance.destroy();
                }

                // ✅ Create doughnut chart
                window.doughnutChartInstance = new Chart(doughnutChartCanvas, {
                    type: "doughnut",
                    data: {
                        labels: ["Active", "Inactive", "Closed"],
                        datasets: [{
                            data: [data.active, data.inactive, data.closed],
                            backgroundColor: ["#1F3BB3", "#FDD0C7", "#52CDFF"],
                        }]
                    },
                    options: {
                        cutout: 70, // Adjusted for a larger doughnut
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: true,
                                position: "bottom",
                                labels: {
                                    color: "#6B778C",
                                    font: { size: 12 }
                                }
                            },
                            datalabels: {
                                display: true, // Ensure data labels are displayed
                                color: "#000", // Black color for data labels
                                anchor: "end",  // Anchor label at the segment’s end
                                align: "start",   // Align label to the start outside
                                clamp: true,    // Keep labels outside the segments
                                font: {
                                    weight: "bold",
                                    size: 25 // Make the label text bigger
                                },
                                offset: 30, // Adjust to move labels outside the doughnut
                                formatter: (value) => {
                                    return value; // Show the actual count (not percentage)
                                }
                            }
                        },
                        layout: {
                            padding: 20 // Optional: add space around the chart
                        }
                    },
                    plugins: [ChartDataLabels] // Ensure plugin is applied to the chart
                });
            },
            error: function (xhr, status, error) {
                console.error("Error fetching facility status data:", error);
            }
        });
    }
});
*/

/*
$(document).ready(function () {
  if ($("#doughnutChart").length) {
    const doughnutChartCanvas = document.getElementById("doughnutChart").getContext("2d");

    if (typeof ChartDataLabels !== "undefined") {
      Chart.register(ChartDataLabels);
    } else {
      console.error("ChartDataLabels plugin is missing!");
      return;
    }

    $.ajax({
      url: "http://localhost:3001/api/facility-visits/facility-status-count",
      method: "GET",
      success: function (data) {
        if (window.doughnutChartInstance) {
          window.doughnutChartInstance.destroy();
        }

        window.doughnutChartInstance = new Chart(doughnutChartCanvas, {
          type: "doughnut",
          data: {
            labels: ["Active", "Inactive", "Closed"],
            datasets: [{
              data: [data.active, data.inactive, data.closed],
              backgroundColor: ["#1F3BB3", "#FDD0C7", "#52CDFF"],
            }]
          },
          options: {
            cutout: 70,
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                position: "bottom",
                labels: {
                  color: "#6B778C",
                  font: { size: 12 }
                }
              },
              datalabels: {
                display: true,
                color: "#000",
                anchor: "end",
                align: "start",
                clamp: true,
                font: {
                  weight: "bold",
                  size: 15
                },
                offset: 30,
                formatter: (value) => value
              }
            },
            layout: {
              padding: 20
            },
            onClick: function (event, elements) {
              if (elements.length > 0) {
                const index = elements[0].index;
                console.log("Clicked index:", index);
                
                // Fixed status mapping to match chart labels order
                const statusMap = { 0: "1", 1: "0", 2: "2" }; // Active, Inactive, Closed
                const status = statusMap[index];
                
                console.log("Status code:", status);

                $.ajax({
                  url: `http://localhost:3001/api/facility-visits/facilities-by-status/${status}`,
                  method: "GET",
                  success: function (facilities) {
                    console.log("API Response:", facilities);
                    console.log("Response type:", typeof facilities);
                    console.log("Is array:", Array.isArray(facilities));
                    
                    const tbody = $("#facilityTableBody");
                    tbody.empty();

                    // Handle different response structures
                    let facilitiesArray = facilities;
                    if (facilities.data) {
                      facilitiesArray = facilities.data;
                    }

                    if (!Array.isArray(facilitiesArray)) {
                      console.error("Facilities is not an array:", facilitiesArray);
                      tbody.append('<tr><td colspan="4">Invalid data format</td></tr>');
                    } else if (facilitiesArray.length === 0) {
                      tbody.append('<tr><td colspan="4">No facilities found for this status</td></tr>');
                    } else {
                      facilitiesArray.forEach(fac => {
                        console.log("Processing facility:", fac);
                        const dateFormatted = fac.date_visited ? 
                          new Date(fac.date_visited).toLocaleDateString() : 'N/A';
                        
                        tbody.append(`
                          <tr>
                            <td>${fac.facility_code || 'N/A'}</td>
                            <td>${fac.facility_name || 'N/A'}</td>
                            <td>${dateFormatted}</td>
                            <td>${fac.province || 'N/A'}</td>
                          </tr>
                        `);
                      });
                    }

                    // Show the modal
                    const modal = new bootstrap.Modal(document.getElementById('facilitiesModal'));
                    modal.show();
                  },
                  error: function (xhr, status, error) {
                    console.error("AJAX Error:", error);
                    console.error("Status:", status);
                    console.error("Response:", xhr.responseText);
                    alert("Failed to fetch facilities. Check console for details.");
                  }
                });
              }
            }
          },
          plugins: [ChartDataLabels]
        });
      },
      error: function (xhr, status, error) {
        console.error("Error fetching facility status data:", error);
      }
    });
  }
});

*/

/*
$(document).ready(function () {
  if (!$("#doughnutChart").length) return;

  const doughnutChartCanvas = document.getElementById("doughnutChart").getContext("2d");
  if (typeof ChartDataLabels !== "undefined") {
    Chart.register(ChartDataLabels);
  } else {
    console.error("ChartDataLabels plugin is missing!");
    return;
  }

  // Get current date
    const now = new Date();

    // Default selections to current year and month
    let selectedYear = now.getFullYear().toString(); // e.g., "2025"
    let selectedMonth = now.toLocaleString('default', { month: 'long' }); // e.g., "June"


  // Map month name to month number (0-11)
  const monthMap = {
    January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
    July: 6, August: 7, September: 8, October: 9, November: 10, December: 11
  };

  function getDateRange(year, monthName) {
    const month = monthMap[monthName];
    if (month === undefined) return null;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0); // last day of the month


    $("#facilityDropdownBtnA").text(selectedYear);
    $("#facilitymonthDropdownBtn2").text(selectedMonth);

    // Format as YYYY-MM-DD for API
    const pad = (n) => n.toString().padStart(2, '0');
    return {
      date_from: `${firstDay.getFullYear()}-${pad(firstDay.getMonth() + 1)}-${pad(firstDay.getDate())}`,
      date_to: `${lastDay.getFullYear()}-${pad(lastDay.getMonth() + 1)}-${pad(lastDay.getDate())}`
    };
  }

  function fetchAndRenderChart() {
    const { date_from, date_to } = getDateRange(selectedYear, selectedMonth) || {};

    if (!date_from || !date_to) {
      console.error("Invalid date range");
      return;
    }

    // Update the heading text for clarity
    $(".card-title-dash span").text(selectedMonth + " " + selectedYear);

    $.ajax({
      url: `http://localhost:3001/api/facility-visits/facility-status-count`,
      method: "GET",
      data: { date_from, date_to }, // pass date range to API
      success: function (data) {
        if (window.doughnutChartInstance) {
          window.doughnutChartInstance.destroy();
        }

        window.doughnutChartInstance = new Chart(doughnutChartCanvas, {
          type: "doughnut",
          data: {
            labels: ["Active", "Inactive", "Closed"],
            datasets: [{
              data: [data.active, data.inactive, data.closed],
              backgroundColor: ["#1F3BB3", "#FDD0C7", "#52CDFF"],
            }]
          },
          options: {
            cutout: 70,
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                position: "bottom",
                labels: {
                  color: "#6B778C",
                  font: { size: 12 }
                }
              },
              datalabels: {
                display: true,
                color: "#000",
                anchor: "end",
                align: "start",
                clamp: true,
                font: {
                  weight: "bold",
                  size: 15
                },
                offset: 30,
                formatter: (value) => value
              }
            },
            layout: { padding: 20 },
            onClick: function (event, elements) {
              if (elements.length > 0) {
                const index = elements[0].index;
                const statusMap = { 0: "1", 1: "0", 2: "2" }; // Active, Inactive, Closed
                const status = statusMap[index];

                $.ajax({
                  url: `http://localhost:3001/api/facility-visits/facilities-by-status/${status}`,
                  method: "GET",
                  data: { date_from, date_to }, // send date range here too
                  success: function (facilities) {
                    const tbody = $("#facilityTableBody");
                    tbody.empty();

                    let facilitiesArray = facilities.data || facilities;

                    if (!Array.isArray(facilitiesArray)) {
                      tbody.append('<tr><td colspan="4">Invalid data format</td></tr>');
                    } else if (facilitiesArray.length === 0) {
                      tbody.append('<tr><td colspan="4">No facilities found for this status</td></tr>');
                    } else {
                      facilitiesArray.forEach(fac => {
                        const dateFormatted = fac.date_visited ?
                          new Date(fac.date_visited).toLocaleDateString() : 'N/A';

                        tbody.append(`
                          <tr>
                            <td>${fac.facility_code || 'N/A'}</td>
                            <td>${fac.facility_name || 'N/A'}</td>
                            <td>${dateFormatted}</td>
                            <td>${fac.province || 'N/A'}</td>
                          </tr>
                        `);
                      });
                    }

                    const modal = new bootstrap.Modal(document.getElementById('facilitiesModal'));
                    modal.show();
                  },
                  error: function () {
                    alert("Failed to fetch facilities.");
                  }
                });
              }
            }
          },
          plugins: [ChartDataLabels]
        });
      },
      error: function () {
        console.error("Error fetching facility status data");
      }
    });
  }

  // Initialize chart on page load
  fetchAndRenderChart();

  // Handle year dropdown click
  $("#facilityDropdownA a").on("click", function (e) {
    e.preventDefault();
    selectedYear = $(this).data("year");
    $("#facilityDropdownBtnA").text(selectedYear);
    fetchAndRenderChart();
  });

  // Handle month dropdown click
  $("#facilitymonthDropdown2 a").on("click", function (e) {
    e.preventDefault();
    selectedMonth = $(this).data("month");
    $("#facilitymonthDropdownBtn2").text(selectedMonth);
    fetchAndRenderChart();
  });
});
*/
$(document).ready(function () {
  if (!$("#doughnutChart").length) return;

  const doughnutChartCanvas = document.getElementById("doughnutChart").getContext("2d");
  if (typeof ChartDataLabels !== "undefined") {
    Chart.register(ChartDataLabels);
  } else {
    console.error("ChartDataLabels plugin is missing!");
    return;
  }

  // Get current date
    const now = new Date();

    // Default selections to current year and month
    let selectedYear = now.getFullYear().toString(); // e.g., "2025"
    let selectedMonth = now.toLocaleString('default', { month: 'long' }); // e.g., "June"

        // 🔹 SET DEFAULT DROPDOWN TEXT ON PAGE LOAD
    $("#facilityDropdownBtnA").text(selectedYear);
    $("#facilitymonthDropdownBtn2").text(selectedMonth);
    // Map month name to month number (0-11)
    const monthMap = {
        January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
        July: 6, August: 7, September: 8, October: 9, November: 10, December: 11
    };

    // Converts "June" and "2025" into "2025-06-01" and "2025-06-30"
    function getDateRange(year, monthName) {
    const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth(); // 0-based index
    const dateFrom = new Date(year, monthIndex, 1);
    const dateTo = new Date(year, monthIndex + 1, 0); // last day of month

    const formatDate = (date) => date.toISOString().split("T")[0];

    return {
        date_from: formatDate(dateFrom),
        date_to: formatDate(dateTo)
    };
    }


    // 🔹 Global function to fetch chart data and render the doughnut chart
    window.fetchAndRenderChart = function fetchAndRenderChart() {
    const { date_from, date_to } = getDateRange(selectedYear, selectedMonth) || {};

    if (!date_from || !date_to) {
        console.error("Invalid date range");
        return;
    }

    // Set heading label
    $(".card-title-dash7 span").text(`${selectedMonth} ${selectedYear}`);

    // Fetch facility status counts
    $.ajax({
        url: "http://localhost:3001/api/facility-visits/facility-status-count",
        method: "GET",
        data: { date_from, date_to },
        success: function (data) {
        if (window.doughnutChartInstance) {
            window.doughnutChartInstance.destroy();
        }

        window.doughnutChartInstance = new Chart(doughnutChartCanvas, {
            type: "doughnut",
            data: {
            labels: ["Active", "Inactive", "Closed"],
            datasets: [{
                data: [data.active, data.inactive, data.closed],
                backgroundColor: ["#1F3BB3", "#FDD0C7", "#52CDFF"],
            }]
            },
            options: {
            cutout: 70,
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                display: true,
                position: "bottom",
                labels: {
                    color: "#6B778C",
                    font: { size: 12 }
                }
                },
                datalabels: {
                display: true,
                color: "#000",
                anchor: "end",
                align: "start",
                clamp: true,
                font: {
                    weight: "bold",
                    size: 15
                },
                offset: 30,
                formatter: (value) => value
                }
            },
            layout: { padding: 20 },
            onClick: function (event, elements) {
                if (elements.length > 0) {
                const index = elements[0].index;
                const statusMap = { 0: "1", 1: "0", 2: "2" }; // index → status param
                const status = statusMap[index];

                // Fetch detailed facilities based on clicked status
                $.ajax({
                    url: `http://localhost:3001/api/facility-visits/facilities-by-status/${status}`,
                    method: "GET",
                    data: { startDate: date_from, endDate: date_to },
                    success: function (facilities) {
                    const tbody = $("#facilityTableBody");
                    tbody.empty();

                    const facilitiesArray = facilities.data || facilities;

                    if (!Array.isArray(facilitiesArray)) {
                        tbody.append('<tr><td colspan="4">Invalid data format</td></tr>');
                    } else if (facilitiesArray.length === 0) {
                        tbody.append('<tr><td colspan="4">No facilities found for this status</td></tr>');
                    } else {
                        facilitiesArray.forEach(fac => {
                        const dateFormatted = fac.date_visited ?
                            new Date(fac.date_visited).toLocaleDateString() : 'N/A';

                        tbody.append(`
                            <tr>
                            <td>${fac.facility_code || 'N/A'}</td>
                            <td>${fac.facility_name || 'N/A'}</td>
                            <td>${dateFormatted}</td>
                            <td>${fac.province || 'N/A'}</td>
                            </tr>
                        `);
                        });
                    }

                    // Show modal
                    const modal = new bootstrap.Modal(document.getElementById('facilitiesModal'));
                    modal.show();
                    },
                    error: function () {
                    alert("Failed to fetch facilities.");
                    }
                });
                }
            }
            },
            plugins: [ChartDataLabels]
        });
        },
        error: function () {
        console.error("Error fetching facility status data");
        }
    });
    };

  // Initialize chart on page load
  window.fetchAndRenderChart();

  // Handle year dropdown click
  $("#facilityDropdownA a").on("click", function (e) {
    e.preventDefault();
    selectedYear = $(this).data("year");
    $("#facilityDropdownBtnA").text(selectedYear);
    window.fetchAndRenderChart();
  });

  // Handle month dropdown click
  $("#facilitymonthDropdown2 a").on("click", function (e) {
    e.preventDefault();
    selectedMonth = $(this).data("month");
    $("#facilitymonthDropdownBtn2").text(selectedMonth);
    window.fetchAndRenderChart();
  });
});