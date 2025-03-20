// ✅ Ensure ChartDataLabels is registered before creating the chart
Chart.register(ChartDataLabels);

function fetchFacilityStatus() {
    $.get("http://localhost:3000/api/facility-visits/facility-status-count", function (data) {
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
                    legend: { display: true, position: "bottom" },
                    datalabels: {  // ✅ Show Data Labels
                        color: "#fff",
                        font: { weight: "bold", size: 14 },
                        anchor: "end",
                        align: "start",
                        formatter: (value, ctx) => {
                            let total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            let percentage = ((value / total) * 100).toFixed(1);
                            return `${percentage}%`; // Show percentage
                        }
                    }
                }
            }
        });

    }).fail(function (err) {
        console.error("Error fetching facility status data!", err);
    });
}
