document.addEventListener("DOMContentLoaded", function () {
    const ctx = document.getElementById("cumulativeAnnualSamples").getContext("2d");
    let chartInstance;
    let selectedType = "Received";
    let selectedMonth = "January";

    // Cumulative month mappings
    const monthsIndex = {
        "January": 1, "January-February": 2, "January-March": 3, "January-April": 4,
        "January-May": 5, "January-June": 6, "January-July": 7, "January-August": 8,
        "January-September": 9, "January-October": 10, "January-November": 11, "January-December": 12
    };

    async function fetchDataAndRenderChart() {
        try {
            const response = await fetch(`http://localhost:3000/api/cumulative-annual-samples`);
            const data = await response.json();
            console.log("Fetched Data:", data); 
    
            if (!data || !data.yearlyData) {
                console.error("Invalid data structure:", data);
                return;
            }
    
            let monthIdx = monthsIndex[selectedMonth];
            let labels = [], barData5Test = [], barDataENBS = [];
    
            data.yearlyData.forEach(entry => {
                let total5Test = 0;
                let totalENBS = 0;
    
                for (let i = 1; i <= monthIdx; i++) {
                    total5Test += entry[`test_6_${i}`] || 0;
                    totalENBS += entry[`enbs_${i}`] || 0;
                }
    
                if (total5Test > 0 || totalENBS > 0) {
                    labels.push(entry.year);
                    barData5Test.push(total5Test);
                    barDataENBS.push(totalENBS);
                }
            });
    
            if (chartInstance) {
                chartInstance.data.labels = labels;
                chartInstance.data.datasets[0].data = barData5Test;
                chartInstance.data.datasets[1].data = barDataENBS;
                chartInstance.update();
            } else {
                chartInstance = new Chart(ctx, {
                    type: "bar",
                    data: {
                        labels: labels,
                        datasets: [
                            { label: "6-test", data: barData5Test, backgroundColor: "gray", stack: "Stack 0" },
                            { label: "ENBS", data: barDataENBS, backgroundColor: "orange", stack: "Stack 0" }
                        ]
                    },
                    options: {
                        responsive: true,
                        scales: {
                            x: { stacked: true },
                            y: { stacked: true, beginAtZero: true }
                        },
                        plugins: {
                            datalabels: { anchor: "end", align: "top", color: "#000", font: { weight: "bold", size: 12 } }
                        }
                    }
                });
            }
        } catch (error) {
            console.error("❌ Error fetching chart data:", error);
        }
    }    

    // Dropdown: Type Selection (Received, Released, etc.)
    document.getElementById("cumulativeAnnualDropdown").addEventListener("click", function (e) {
        if (e.target.matches(".dropdown-item")) {
            e.preventDefault();
            selectedType = e.target.dataset.type;
            document.getElementById("cumulativeAnnualButton").textContent = selectedType;
            document.querySelector(".card-title-dash4").textContent = `Cumulative Annual Census of Samples ${selectedType}`;
            fetchDataAndRenderChart();
        }
    });

    // Dropdown: Cumulative Month Selection
    document.getElementById("monthDropdown2").addEventListener("click", function (e) {
        if (e.target.matches(".dropdown-item")) {
            e.preventDefault();
            selectedMonth = e.target.dataset.month;
            document.getElementById("monthDropdownBtn2").textContent = selectedMonth;
            fetchDataAndRenderChart();
        }
    });

    // Initial chart render
    fetchDataAndRenderChart();
});
