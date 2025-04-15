let selectedYear1 = 2024;
let selectedYear2 = 2025;
let unsatChart = null;

document.addEventListener("DOMContentLoaded", function () {
    updateDropdownText();
    fetchAndRenderChart();

    document.querySelectorAll("#unsat-year1-dropdown .dropdown-item").forEach(item => {
        item.addEventListener("click", function (event) {
            event.preventDefault();
            selectedYear1 = this.getAttribute("data-year");
            updateDropdownText();
            fetchAndRenderChart();
        });
    });

    document.querySelectorAll("#unsat-year2-dropdown .dropdown-item").forEach(item => {
        item.addEventListener("click", function (event) {
            event.preventDefault();
            selectedYear2 = this.getAttribute("data-year");
            updateDropdownText();
            fetchAndRenderChart();
        });
    });
});

function updateDropdownText() {
    document.getElementById('unsat-year1-dropdown').textContent = selectedYear1;
    document.getElementById('unsat-year2-dropdown').textContent = selectedYear2;

    let cardTitle = document.querySelector(".card-title-dash5");
    if (cardTitle) {
        cardTitle.innerHTML = `Year to Date Comparison of Unsat Rate (${selectedYear1} VS ${selectedYear2})`;
    }
}

async function fetchAndRenderChart() {
    try {
        const res = await fetch(`http://localhost:3000/api/unsat-rate?year1=${selectedYear1}&year2=${selectedYear2}`);
        const data = await res.json();

        const monthsSet = new Set();
        const year1Map = new Map();
        const year2Map = new Map();

        data.forEach(item => {
            const [year, month] = item.month.split('-');
            const label = monthName(month);
            monthsSet.add(label);

            if (parseInt(year) === parseInt(selectedYear1)) {
                year1Map.set(label, item.percent_unsat || 0);
            } else if (parseInt(year) === parseInt(selectedYear2)) {
                year2Map.set(label, item.percent_unsat || 0);
            }
        });

        const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const months = Array.from(monthsSet).sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b));

        const year1Data = months.map(month => year1Map.get(month) || 0);
        const year2Data = months.map(month => year2Map.get(month) || 0);

        renderChart(months, year1Data, year2Data);
    } catch (err) {
        console.error("Error fetching chart data:", err);
    }
}

function renderChart(months, year1Data, year2Data) {
    const ctx = document.getElementById("unsatRate").getContext("2d");

    if (unsatChart) {
        unsatChart.destroy(); // destroy previous chart
    }

    unsatChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: months,
            datasets: [
                {
                    label: selectedYear1,
                    data: year1Data,
                    backgroundColor: "rgba(54, 162, 235, 0.6)",
                    borderColor: "rgba(54, 162, 235, 1)",
                    borderWidth: 1,
                },
                {
                    label: selectedYear2,
                    data: year2Data,
                    backgroundColor: "rgba(255, 99, 132, 0.6)",
                    borderColor: "rgba(255, 99, 132, 1)",
                    borderWidth: 1,
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Unsat Rate (%)'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                },
                datalabels: {
                    anchor: 'end',
                    align: 'top',
                    formatter: (value) => `${value}%`, // Remove .toFixed(1) to show the exact value
                    color: '#000',
                }                
            }
        },
        plugins: [ChartDataLabels] // 👈 enable datalabels
    });
}

function monthName(numStr) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const index = parseInt(numStr) - 1;
    return months[index] || numStr;
}
