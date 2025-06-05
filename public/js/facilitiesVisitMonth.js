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
