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
                color: "#fff",
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
                const statusLabels = { 0: "Active", 1: "Inactive", 2: "Closed" }; // index → display label
                
                const status = statusMap[index];
                const statusLabel = statusLabels[index];

                // Update modal title to show the clicked status
                const modalTitle = document.querySelector('#facilitiesModal .modal-title');
                if (modalTitle) {
                  modalTitle.textContent = `${statusLabel} Facilities - ${selectedMonth} ${selectedYear}`;
                }

                // Show loading state
                const tbody = $("#facilityTableBody");
                tbody.html('<tr><td colspan="4" class="text-center">Loading...</td></tr>');

                // Show modal immediately with loading state
                const modal = new bootstrap.Modal(document.getElementById('facilitiesModal'));
                modal.show();

                // Fetch detailed facilities based on clicked status
                $.ajax({
                  url: `http://localhost:3001/api/facility-visits/facilities-by-status/${status}`,
                  method: "GET",
                  data: { 
                    startDate: date_from, 
                    endDate: date_to 
                  },
                  timeout: 10000, // 10 second timeout
                  beforeSend: function() {
                    console.log(`Fetching ${statusLabel.toLowerCase()} facilities...`);
                  },
                  success: function (facilities) {
                    tbody.empty();

                    const facilitiesArray = facilities.data || facilities;

                    if (!Array.isArray(facilitiesArray)) {
                      tbody.append('<tr><td colspan="4" class="text-center text-danger">Invalid data format received</td></tr>');
                      console.error('Invalid data format:', facilities);
                    } else if (facilitiesArray.length === 0) {
                      tbody.append(`<tr><td colspan="4" class="text-center text-muted">No ${statusLabel.toLowerCase()} facilities found for ${selectedMonth} ${selectedYear}</td></tr>`);
                    } else {
                      facilitiesArray.forEach((fac, index) => {
                        const dateFormatted = fac.date_visited ?
                          new Date(fac.date_visited).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : 'N/A';

                        tbody.append(`
                          <tr>
                            <td>${fac.facility_code || 'N/A'}</td>
                            <td>${fac.facility_name || 'N/A'}</td>
                            <td>${dateFormatted}</td>
                            <td>${fac.province || 'N/A'}</td>
                          </tr>
                        `);
                      });

                      // Add count to modal title
                      if (modalTitle) {
                        modalTitle.textContent = `${statusLabel} Facilities (${facilitiesArray.length}) - ${selectedMonth} ${selectedYear}`;
                      }
                    }
                  },
                  error: function (xhr, status, error) {
                    console.error('AJAX Error:', {
                      status: xhr.status,
                      statusText: xhr.statusText,
                      error: error,
                      response: xhr.responseText
                    });

                    tbody.empty();
                    
                    let errorMessage = `Failed to load ${statusLabel.toLowerCase()} facilities`;
                    
                    if (xhr.status === 404) {
                      errorMessage = `No ${statusLabel.toLowerCase()} facilities data available`;
                    } else if (xhr.status === 500) {
                      errorMessage = 'Server error occurred. Please try again later.';
                    } else if (status === 'timeout') {
                      errorMessage = 'Request timed out. Please try again.';
                    } else if (status === 'error' && xhr.status === 0) {
                      errorMessage = 'Network error. Please check your connection.';
                    }

                    tbody.append(`<tr><td colspan="4" class="text-center text-danger">${errorMessage}</td></tr>`);
                  },
                  complete: function() {
                    console.log('Request completed');
                  }
                });
              }
            }
          },
          plugins: [ChartDataLabels]
        });
      },
      error: function (xhr, status, error) {
        console.error("Error fetching facility status data:", {
          status: xhr.status,
          statusText: xhr.statusText,
          error: error,
          response: xhr.responseText
        });
        
        // Optional: Show error message to user
        alert('Failed to load chart data. Please refresh the page and try again.');
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