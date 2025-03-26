let myChart;
let yearA = 2024;
let yearB = 2025;
let sampleType = "Received";

document.addEventListener("DOMContentLoaded", function () {
    const canvas = document.getElementById("ytdSampleComparison");
    if (!canvas) {
        console.error("Canvas element not found!");
        return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
        console.error("Could not get 2D context from canvas!");
        return;
    }

    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ],
            datasets: [
                {
                    label: `Year ${yearA}`,
                    data: new Array(12).fill(0),
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                },
                {
                    label: `Year ${yearB}`,
                    data: new Array(12).fill(0),
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    onClick: function (e, legendItem) {
                        const index = legendItem.datasetIndex;
                        myChart.setDatasetVisibility(index, !myChart.isDatasetVisible(index));
                        myChart.update();
                        updateTable(myChart.data.datasets[0].data, myChart.data.datasets[1].data);
                    }
                },
                tooltip: { enabled: true },
                datalabels: {
                    anchor: 'end',
                    align: 'top',
                    formatter: (value) => value || '',
                    color: '#000',
                    font: { weight: 'bold' }
                }
            }
        },
        plugins: [ChartDataLabels]
    });

    fetchData();
});

// ✅ Fetch Data and Update Chart & Table
function fetchData() {
    fetch(`http://localhost:3000/api/ytd-sample-comparison?year1=${yearA}&year2=${yearB}&type=${sampleType}`)
        .then(response => response.json())
        .then(data => {
            console.log("API Data:", data);

            const dataA = new Array(12).fill(0);
            const dataB = new Array(12).fill(0);

            data.forEach(entry => {
                const monthIndex = entry.MONTH - 1;
                if (entry.YEAR === yearA) {
                    dataA[monthIndex] = entry.TOTAL_SAMPLES;
                } else if (entry.YEAR === yearB) {
                    dataB[monthIndex] = entry.TOTAL_SAMPLES;
                }
            });

            myChart.data.datasets[0].label = `Year ${yearA}`;
            myChart.data.datasets[0].data = dataA;
            myChart.data.datasets[1].label = `Year ${yearB}`;
            myChart.data.datasets[1].data = dataB;
            myChart.update();

            updateTable(dataA, dataB);
            updateTitle();
        })
        .catch(error => console.error("Error fetching data:", error));
}

// ✅ Update the chart title dynamically
function updateTitle() {
    document.querySelector(".card-title-dash2").textContent = 
        `Year to Date Comparison of Total ${sampleType} Samples (${yearA} vs ${yearB})`;
}

// ✅ Handle dropdown selection & prevent page from scrolling up
function handleDropdownSelection(event, type, buttonId) {
    event.preventDefault();
    event.stopPropagation();

    if (type === "yearA") {
        yearA = parseInt(event.target.dataset.year);
    } else if (type === "yearB") {
        yearB = parseInt(event.target.dataset.year);
    } else if (type === "sampleType") {
        sampleType = event.target.dataset.type;
    }

    document.getElementById(buttonId).textContent = event.target.textContent;
    const dropdownMenu = event.target.closest(".dropdown-menu");
    if (dropdownMenu) dropdownMenu.classList.remove("show");

    fetchData();
}

document.querySelectorAll("#yearADropdown .dropdown-item").forEach(item => {
    item.addEventListener("click", event => handleDropdownSelection(event, "yearA", "yearAButton"));
});

document.querySelectorAll("#yearBDropdown .dropdown-item").forEach(item => {
    item.addEventListener("click", event => handleDropdownSelection(event, "yearB", "yearBButton"));
});

document.querySelectorAll("#sampleTypeDropdown .dropdown-item").forEach(item => {
    item.addEventListener("click", event => handleDropdownSelection(event, "sampleType", "sampleTypeButton"));
});



// ✅ Update Table Data Based on Chart Visibility
function updateTable(dataA, dataB) {
    const yearARow = document.getElementById("year1row");
    const yearBRow = document.getElementById("year2row");
    const percentDiffRow = document.getElementById("percentDiffRow");

    if (yearARow) yearARow.textContent = yearA;
    if (yearBRow) yearBRow.textContent = yearB;

    const isYearAHidden = !myChart.isDatasetVisible(0);
    const isYearBHidden = !myChart.isDatasetVisible(1);

    for (let i = 0; i < 12; i++) {
        let finalValue = dataB[i];
        let startingValue = dataA[i];
        let percentageChange = "---";

        if (startingValue !== 0 && finalValue !== 0) {
            percentageChange = ((finalValue - startingValue) / Math.abs(startingValue)) * 100;
            percentageChange = percentageChange.toFixed(2) + "%";
        }

        const colorClass = percentageChange.includes('-') ? "text-danger" : "text-success";

        document.querySelector(`#year2024Row td:nth-child(${i + 2})`).textContent = isYearAHidden ? "---" : dataA[i];
        document.querySelector(`#year2025Row td:nth-child(${i + 2})`).textContent = isYearBHidden ? "---" : dataB[i];
        document.querySelector(`#percentDiffRow td:nth-child(${i + 2})`).innerHTML =
            isYearAHidden || isYearBHidden ? "---" : `<span class="${colorClass}">${percentageChange}</span>`;
    }
}


// ✅ Listen for Legend Click (Toggling Visibility)
document.getElementById("ytdSampleComparison").addEventListener("click", function () {
    updateTable(myChart.data.datasets[0].data, myChart.data.datasets[1].data);
});
