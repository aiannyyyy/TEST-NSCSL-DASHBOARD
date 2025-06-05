document.addEventListener("DOMContentLoaded", () => {
    const tableContainer = document.getElementById("kitsSOldTableContainer");
    const chartWrapper = document.querySelector(".chartjs-bar-wrapper");
    const showTableButton = document.getElementById("showTableButton");

    fetch("http://localhost:3001/api/kits-sold")
        .then(res => res.json())
        .then(rawData => {
            const monthLabels = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
            const dataPerYear = {};

            rawData.forEach(entry => {
                const [year, monthNum] = entry.month.split("-");
                const monthIndex = parseInt(monthNum) - 1;
                const monthName = monthLabels[monthIndex];

                if (!dataPerYear[year]) {
                    dataPerYear[year] = new Array(12).fill(0);
                }

                dataPerYear[year][monthIndex] = entry.total_qty;
            });

            const fixedColors = ["#1abc9c", "#f5cd79", "#6ab04c", "##fed330", "#f8a5c2", "#3dc1d3"];

            const datasets = Object.entries(dataPerYear).map(([year, data], index) => {
                const color = fixedColors[index % fixedColors.length];
                return {
                    label: year,
                    data: data,
                    backgroundColor: color
                };
            });

            const chart = new Chart(document.getElementById("totalKitsSold"), {
                type: "bar",
                data: {
                    labels: monthLabels,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: { display: true },
                        legend: {
                            position: 'top',
                            padding: { top: 20, bottom: 20, left: 10, right: 10 }
                        },
                        tooltip: { mode: 'index', intersect: false }
                    },
                    interaction: {
                        mode: 'nearest',
                        axis: 'x',
                        intersect: false
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: "Quantity Sold"
                            }
                        }
                    }
                }
            });

            // Toggle Button Logic
            showTableButton.addEventListener("click", () => {
                if (tableContainer.style.display === "none" || tableContainer.style.display === "") {
                    tableContainer.style.display = "block";
                    chartWrapper.style.display = "none";
                    showTableButton.textContent = "Show Graph";
                    generateTable(dataPerYear, monthLabels);
                } else {
                    tableContainer.style.display = "none";
                    chartWrapper.style.display = "block";
                    showTableButton.textContent = "Show Table";
                }
            });
        });
});

// Generate Table Function
function generateTable(data, months) {
    const tableHeader = document.getElementById("tableHeader");
    const tableBody = document.getElementById("tableBody");

    tableHeader.innerHTML = `<th>Year</th>` + months.map(m => `<th>${m}</th>`).join("");
    tableBody.innerHTML = "";

    Object.keys(data).forEach(year => {
        const row = document.createElement("tr");
        row.innerHTML = `<td>${year}</td>` + data[year].map(v => `<td>${v ?? '-'}</td>`).join("");
        tableBody.appendChild(row);
    });
}