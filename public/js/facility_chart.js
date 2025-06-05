// ✅ Ensure ChartDataLabels is registered before creating the chart
Chart.register(ChartDataLabels);

function fetchFacilityStatus() {
    $.get("http://localhost:3001/api/facility-visits/facility-status-count", function (data) {
        let ctx = document.getElementById("doughnutChart").getContext("2d");

        if (window.doughnutChartInstance) {
            window.doughnutChartInstance.destroy();
        }

        window.doughnutChartInstance = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: ["Active", "Inactive", "Closed"],
                datasets: [{
                    data: [data.active, data.inactive, data.closed],
                    backgroundColor: ["#28a745", "#dc3545", "#6c757d"]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: "bottom"  // Legend at the bottom
                    }
                }
            }
        });

    }).fail(function (err) {
        console.error("Error fetching facility status data!", err);
    });
}
