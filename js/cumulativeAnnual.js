document.addEventListener("DOMContentLoaded", function () {
    const ctx = document.getElementById("cumulativeAnnualSamples").getContext("2d");
    let chartInstance;
    let selectedType = "Received";
    let selectedMonth = "January";

    async function fetchDataAndRenderChart() {
        try {
            const response = await fetch(`http://localhost:3000/api/cumulative-annual-samples?type=${selectedType}`);
            const data = await response.json();
            console.log("Fetched Data:", data);

            const monthsIndex = {
                "January": 1, "January-February": 2, "January-March": 3, "January-April": 4,
                "January-May": 5, "January-June": 6, "January-July": 7, "January-August": 8,
                "January-September": 9, "January-October": 10, "January-November": 11, "January-December": 12
            };
            let monthIdx = monthsIndex[selectedMonth];

            let labels = [], barData5Test = [], barDataENBS = [];

            data.yearlyData.forEach(entry => {
                let total5Test = entry.test_5 || 0;
                let totalENBS = entry.enbs || 0;

                // **Hide years where both values are 0**
                if (total5Test > 0 || totalENBS > 0) {
                    labels.push(entry.year);
                    barData5Test.push(total5Test);
                    barDataENBS.push(totalENBS);
                }
            });

            if (chartInstance) {
                chartInstance.destroy();
            }

            chartInstance = new Chart(ctx, {
                type: "bar",
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: "6-test",
                            data: barData5Test,
                            backgroundColor: "gray",
                            stack: "Stack 0"
                        },
                        {
                            label: "ENBS",
                            data: barDataENBS,
                            backgroundColor: "orange",
                            stack: "Stack 0"
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false, // **Prevents the chart from shifting up**
                    scales: {
                        x: { stacked: true },
                        y: { 
                            stacked: true,
                            beginAtZero: true,
                            ticks: { callback: value => value.toLocaleString() }
                        }
                    },
                    plugins: {
                        legend: { position: "top" },
                        datalabels: {
                            anchor: function(context) {
                                return context.dataset.label === "6-test" ? "center" : "end"; 
                            },
                            align: function(context) {
                                return context.dataset.label === "6-test" ? "center" : "top"; 
                            },
                            color: function(context) {
                                return context.dataset.label === "6-test" ? "white" : "#000";
                            },
                            font: { weight: "bold", size: 12 },
                            formatter: value => (value !== 0 ? value.toLocaleString() : "") // **Hide 0 labels**
                        }
                    }
                },
                plugins: [ChartDataLabels]
            });
        } catch (error) {
            console.error("❌ Error fetching chart data:", error);
        }
    }

    document.getElementById("cumulativeAnnualDropdown").addEventListener("click", function (e) {
        if (e.target.matches(".dropdown-item")) {
            selectedType = e.target.dataset.type;
            document.getElementById("cumulativeAnnualButton").textContent = selectedType;
            document.querySelector(".card-title-dash4").textContent = `Cumulative Annual Census of Samples ${selectedType}`;
            fetchDataAndRenderChart();
        }
    });

    document.getElementById("monthDropdown2").addEventListener("click", function (e) {
        if (e.target.matches(".dropdown-item")) {
            selectedMonth = e.target.dataset.month;
            document.getElementById("monthDropdownBtn2").textContent = selectedMonth;
            fetchDataAndRenderChart();
        }
    });

    fetchDataAndRenderChart();
});
