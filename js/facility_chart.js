function fetchFacilityStatus() {
    $.get("http://localhost:3000/api/facility-visits/facility-status-count", function (data) {
        let ctx = document.getElementById("doughnutChart").getContext("2d");

        if (doughnutChartInstance) {
            // 🔹 Destroy previous chart instance before creating a new one
            doughnutChartInstance.destroy();
        }

        // 🔹 Create a new chart
        doughnutChartInstance = new Chart(ctx, {
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
                        position: "bottom"
                    }
                }
            }
        });

    }).fail(function (err) {
        console.error("Error fetching facility status data!", err);
    });
}
