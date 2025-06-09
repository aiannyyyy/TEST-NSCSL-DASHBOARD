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
            url: "http://localhost:3001/api/facility-visits/facility-status-count",
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
                                anchor: "end",  // Anchor label at the segment's end
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
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return context.label + ': ' + context.parsed + ' facilities';
                                    }
                                }
                            }
                        },
                        layout: {
                            padding: 20 // Optional: add space around the chart
                        },
                        // ✅ Add click event handler
                        onClick: function(event, elements) {
                            if (elements.length > 0) {
                                const elementIndex = elements[0].index;
                                const label = this.data.labels[elementIndex];
                                
                                // Map chart index to API status values
                                // Chart: [Active, Inactive, Closed] = [0, 1, 2]
                                // API:   [Inactive, Active, Closed] = [0, 1, 2]
                                let statusValue;
                                if (elementIndex === 0) statusValue = 1; // Active in chart = 1 in API
                                else if (elementIndex === 1) statusValue = 0; // Inactive in chart = 0 in API
                                else if (elementIndex === 2) statusValue = 2; // Closed in chart = 2 in API
                                
                                // Fetch facilities by status and show modal
                                fetchFacilitiesByStatus(statusValue, label);
                            }
                        },
                        // ✅ Add hover cursor
                        onHover: function(event, elements) {
                            event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
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

// ✅ Function to fetch facilities by status
function fetchFacilitiesByStatus(status, statusLabel) {
    // Show loading in modal
    $('#facilitiesModalLabel').text(statusLabel + ' Facilities');
    $('#facilitiesTableContainer').html('<div class="text-center"><div class="spinner-border" role="status"><span class="sr-only">Loading...</span></div></div>');
    $('#facilitiesModal').modal('show');

    // Make API call to get facilities by status
    $.ajax({
        url: `http://localhost:3001/api/facility-visits/facilities-by-status/${status}`,
        method: "GET",
        success: function(data) {
            displayFacilitiesTable(data, statusLabel);
        },
        error: function(xhr, status, error) {
            console.error("Error fetching facilities by status:", error);
            $('#facilitiesTableContainer').html('<div class="alert alert-danger">Error loading facilities data. Please try again.</div>');
        }
    });
}

// ✅ Function to display facilities in table
function displayFacilitiesTable(facilities, statusLabel) {
    if (facilities.length === 0) {
        $('#facilitiesTableContainer').html(`<div class="alert alert-info">No ${statusLabel.toLowerCase()} facilities found.</div>`);
        return;
    }

    let tableHtml = `
        <div class="table-responsive">
            <table class="table table-striped table-bordered">
                <thead class="thead-dark">
                    <tr>
                        <th>Facility Code</th>
                        <th>Facility Name</th>
                        <th>Date Visited</th>
                        <th>Province</th>
                    </tr>
                </thead>
                <tbody>
    `;

    facilities.forEach(facility => {
        const dateVisited = new Date(facility.date_visited).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        tableHtml += `
            <tr>
                <td>${facility.facility_code}</td>
                <td>${facility.facility_name}</td>
                <td>${dateVisited}</td>
                <td>${facility.province}</td>
            </tr>
        `;
    });

    tableHtml += `
                </tbody>
            </table>
        </div>
        <div class="mt-3">
            <small class="text-muted">Total ${statusLabel.toLowerCase()} facilities: ${facilities.length}</small>
        </div>
    `;

    $('#facilitiesTableContainer').html(tableHtml);
}