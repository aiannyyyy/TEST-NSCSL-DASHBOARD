document.addEventListener("DOMContentLoaded", function () {
    const yearDropdownA = document.querySelectorAll("#yearDropdownAA .dropdown-item");
    const yearDropdownB = document.querySelectorAll("#yearDropdownBB .dropdown-item");
    const monthDropdown = document.querySelectorAll("#monthDropdown22 .dropdown-item");

    const yearDropdownBtnA = document.getElementById("yearDropdownBtnA");
    const yearDropdownBtnB = document.getElementById("yearDropdownBtnB");
    const monthDropdownBtn = document.getElementById("monthDropdownBtn2");

    const cardTitle = document.querySelector(".card-title-dash");

    let selectedYearA = "2024";
    let selectedYearB = "2025";
    let selectedMonth = "March";

    function updateTitle() {
        cardTitle.innerHTML = `Comparison of Trend for Daily Received Samples <br> (${selectedMonth} ${selectedYearA} vs. ${selectedMonth} ${selectedYearB})`;
        monthDropdownBtn.textContent = `${selectedMonth} ${selectedYearA} vs. ${selectedMonth} ${selectedYearB}`;
    }

    async function fetchData() {
        try {
            const responseA = await fetch(`http://localhost:3000/api/lab-comparison-samples-per-day?year=${selectedYearA}&month=${selectedMonth}`);
            const responseB = await fetch(`http://localhost:3000/api/lab-comparison-samples-per-day?year=${selectedYearB}&month=${selectedMonth}`);

            const dataA = await responseA.json();
            const dataB = await responseB.json();

            updateChart(dataA, dataB);
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    }

    function updateChart(dataA, dataB) {
        const ctx = document.getElementById("labComparisonOfDailySamples").getContext("2d");

        if (window.labChart) {
            window.labChart.destroy();
        }

        function groupByDate(data) {
            let days = Array(31).fill(0);
            data.forEach(entry => {
                let date = new Date(entry.RECEIVED_DATE);
                let dayIndex = date.getDate() - 1;
                if (dayIndex >= 0 && dayIndex < 31) {
                    days[dayIndex] += entry.TOTAL_SAMPLES;
                }
            });
            return days;
        }

        const dailyDataA = groupByDate(dataA);
        const dailyDataB = groupByDate(dataB);
        const labels = Array.from({ length: 31 }, (_, i) => `${selectedMonth} ${i + 1}`);

        const datasets = [
            {
                label: selectedYearA,
                data: dailyDataA,
                backgroundColor: "rgba(54, 162, 235, 0.5)",
                borderColor: "rgba(54, 162, 235, 1)",
                borderWidth: 1
            },
            {
                label: selectedYearB,
                data: dailyDataB,
                backgroundColor: "rgba(255, 99, 132, 0.5)",
                borderColor: "rgba(255, 99, 132, 1)",
                borderWidth: 1
            }
        ];

        window.labChart = new Chart(ctx, {
            type: "bar",
            data: { labels: labels, datasets: datasets },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true },
                    tooltip: { enabled: true },
                    datalabels: {
                        anchor: "end",
                        align: "top",
                        color: "black",
                        font: { weight: "bold" },
                        formatter: value => (value > 0 ? value : "")
                    }
                },
                scales: {
                    y: { beginAtZero: true },
                    x: { stacked: false }
                }
            },
            plugins: [ChartDataLabels]
        });

        updateTitle();
    }

    // Handle Year A Selection
    yearDropdownA.forEach(item => {
        item.addEventListener("click", function (event) {
            event.preventDefault();
            selectedYearA = this.getAttribute("data-year");
            yearDropdownBtnA.textContent = selectedYearA; // Update dropdown text
            updateTitle();
            fetchData();
        });
    });

    // Handle Year B Selection
    yearDropdownB.forEach(item => {
        item.addEventListener("click", function (event) {
            event.preventDefault();
            selectedYearB = this.getAttribute("data-year");
            yearDropdownBtnB.textContent = selectedYearB; // Update dropdown text
            updateTitle();
            fetchData();
        });
    });

    // Handle Month Selection
    monthDropdown.forEach(item => {
        item.addEventListener("click", function (event) {
            event.preventDefault();
            selectedMonth = this.getAttribute("data-month");
            monthDropdownBtn.textContent = `${selectedMonth} ${selectedYearA} vs. ${selectedMonth} ${selectedYearB}`; // Update dropdown text
            updateTitle();
            fetchData();
        });
    });

    // Initial Fetch
    updateTitle();
    fetchData();
});
