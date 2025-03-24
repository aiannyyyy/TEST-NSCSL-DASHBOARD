document.addEventListener("DOMContentLoaded", function () {
    const yearDropdownBtn = document.getElementById("yearDropdownBtnA");
    const monthDropdownBtn = document.getElementById("monthDropdownBtn2");
    const yearDropdown = document.getElementById("yearDropdownA");
    const monthDropdown = document.getElementById("monthDropdown2");

    let currentChart = null;
    let selectedYear = "2025"; 
    let selectedMonth = "January";

    function fetchAndRenderChart(year, month) {
        fetch(`http://localhost:3000/api/lab-total-samples-per-day?year=${year}&month=${month}`)
            .then(response => response.json())
            .then(data => {
                console.log("📊 API Response:", data);
                if (!Array.isArray(data)) throw new Error("Invalid API response format");
                updateChart(data, month, year);
            })
            .catch(error => console.error("❌ Error fetching lab chart data:", error));
    }

    function updateChart(data, month, year) {
        const canvas = document.getElementById("labTotalSamplesPerDay");
        if (!canvas) {
            console.error("❌ Canvas element 'labTotalSamplesPerDay' not found.");
            return;
        }

        const ctx = canvas.getContext("2d");

        // ✅ Get correct number of days in the selected month
        const monthIndex = new Date(Date.parse(`${month} 1, ${year}`)).getMonth();
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

        // ✅ Generate all days for the selected month
        const allDays = [];
        for (let i = 1; i <= daysInMonth; i++) {
            let date = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
            allDays.push(date);
        }

        // ✅ Create a lookup map for API data
        const dataMap = new Map(data.map(d => [d.RECEIVED_DATE, d.TOTAL_SAMPLES]));

        // ✅ Fill missing days with 0
        const labels = allDays.map(date => 
            new Date(date).toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric' })
        );
        const counts = allDays.map(date => dataMap.get(date) || 0);

        console.log("🗓️ Labels:", labels);
        console.log("📊 Counts:", counts);

        // ✅ Destroy previous chart instance if exists
        if (currentChart) {
            currentChart.destroy();
        }

        // ✅ Create new chart
        currentChart = new Chart(ctx, {
            type: "bar",
            data: {
                labels: labels,
                datasets: [{
                    label: "Total Samples Per Day",
                    data: counts,
                    backgroundColor: "rgba(255, 99, 132, 0.6)",
                    borderColor: "rgba(255, 99, 132, 1)",
                    borderWidth: 1,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        formatter: value => (value > 0 ? value : ''),
                        color: '#000',
                        font: { weight: 'bold' }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { autoSkip: false, maxRotation: 45, minRotation: 45 }
                    },
                    y: {
                        beginAtZero: true,
                        suggestedMax: Math.max(...counts, 2000),
                        ticks: {
                            stepSize: 200,
                            callback: value => value.toLocaleString()
                        }
                    }
                }
            },
            plugins: [ChartDataLabels]
        });

        // ✅ Update chart title
        setTimeout(() => {
            const chartTitle = document.querySelector(".card-title-dash");
            if (chartTitle) {
                chartTitle.textContent = `Total Daily Received Samples - ${month} ${year}`;
            } else {
                console.warn("⚠️ '.card-title-dash' not found.");
            }
        }, 300);
    }

    // ✅ Set default dropdown values
    yearDropdownBtn.textContent = selectedYear;
    monthDropdownBtn.textContent = selectedMonth;

    // ✅ Fetch initial data
    fetchAndRenderChart(selectedYear, selectedMonth);

    // ✅ Handle Year Selection
    yearDropdown.addEventListener("click", event => {
        if (event.target.matches(".dropdown-item")) {
            selectedYear = event.target.dataset.year;
            yearDropdownBtn.textContent = selectedYear;
            fetchAndRenderChart(selectedYear, selectedMonth);
        }
    });

    // ✅ Handle Month Selection
    monthDropdown.addEventListener("click", event => {
        if (event.target.matches(".dropdown-item")) {
            selectedMonth = event.target.dataset.month;
            monthDropdownBtn.textContent = selectedMonth;
            fetchAndRenderChart(selectedYear, selectedMonth);
        }
    });
});
