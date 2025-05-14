document.addEventListener("DOMContentLoaded", function () {
    const yearDropdownA = document.querySelectorAll("#yearDropdownAAA .dropdown-item");
    const yearDropdownB = document.querySelectorAll("#yearDropdownBB .dropdown-item");
    const monthDropdown = document.querySelectorAll("#monthDropdown22 .dropdown-item");

    const yearDropdownBtnA = document.getElementById("yearDropdownBtnAA");
    const yearDropdownBtnB = document.getElementById("yearDropdownBtnB");
    const monthDropdownBtn = document.getElementById("monthDropdownBtn22");

    const cardTitle = document.querySelector(".card-title-dash1");

    const monthNames = ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"];
    let selectedMonth = monthNames[new Date().getMonth()]; // ← auto set to current month

    let selectedYearA = new Date().getFullYear() - 1; // last year
    let selectedYearB = new Date().getFullYear();     // current year



    function updateTitle() {
        cardTitle.innerHTML = `Comparison of Trend for Daily Received Samples <br> (${selectedMonth} ${selectedYearA} vs. ${selectedMonth} ${selectedYearB})`;
        monthDropdownBtn.innerText = `${selectedMonth} ${selectedYearA} vs. ${selectedMonth} ${selectedYearB}`;
    }

    async function fetchData() {
        try {
            const urls = [
                `http://localhost:3000/api/lab-comparison-samples-per-day?year=${selectedYearA}&month=${selectedMonth}`,
                `http://localhost:3000/api/lab-comparison-samples-per-day?year=${selectedYearB}&month=${selectedMonth}`
            ];

            const [responseA, responseB] = await Promise.all(urls.map(url => fetch(url)));
            
            if (!responseA.ok || !responseB.ok) throw new Error("Failed to fetch data");

            const [dataA, dataB] = await Promise.all([responseA.json(), responseB.json()]);

            updateChart(dataA, dataB);
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    }

    function updateChart(dataA = [], dataB = []) {
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
                    days[dayIndex] += entry.TOTAL_SAMPLES || 0;
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
                backgroundColor: "rgba(0, 153, 255, 0.5)",
                borderColor: "rgb(0, 153, 255)",
                borderWidth: 1
            },
            {
                label: selectedYearB,
                data: dailyDataB,
                backgroundColor: "rgba(255, 153, 0, 0.9)",
                borderColor: "rgba(255, 153, 0, 0.9)",
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

    function attachDropdownHandlers(dropdownItems, callback) {
        dropdownItems.forEach(item => {
            item.addEventListener("click", function (event) {
                event.preventDefault();
                callback(this);
                fetchData();
            });
        });
    }

    attachDropdownHandlers(yearDropdownA, item => {
        selectedYearA = item.getAttribute("data-year");
        yearDropdownBtnA.innerText = selectedYearA;
        updateTitle();
    });

    attachDropdownHandlers(yearDropdownB, item => {
        selectedYearB = item.getAttribute("data-year");
        yearDropdownBtnB.innerText = selectedYearB;
        updateTitle();
    });

    attachDropdownHandlers(monthDropdown, item => {
        selectedMonth = item.getAttribute("data-month");
        monthDropdownBtn.innerText = `${selectedMonth} ${selectedYearA} vs. ${selectedMonth} ${selectedYearB}`;
        updateTitle();
    });

    updateTitle();
    fetchData();
});
