document.addEventListener("DOMContentLoaded", function () {
    const ctx = document.getElementById("cumulativeSamples").getContext("2d");
    const titleElement = document.querySelector(".card-title-dash3");
    const dropdownButton = document.getElementById("cumulativeTypeButton");
    const dropdownItems = document.querySelectorAll("#cumulativeTypeDropdown .dropdown-item");
    const showTableButton = document.getElementById("showTableButton");
    const tableContainer = document.getElementById("cumulativeTableContainer");
    const chartWrapper = document.getElementById("cumulativeSamples").parentElement;

    let cumulativeChart;
    let selectedType = "Received"; // Default type

    // Fetch & Render Chart or Table based on visibility
    async function fetchAndRender(type) {
        try {
            const response = await fetch(`http://localhost:3000/api/cumulative-census-samples?type=${type}`);
            const data = await response.json();

            console.log("🚀 API Response:", data);

            if (!Array.isArray(data) || data.length === 0) {
                console.error("⚠️ No valid data received.");
                return;
            }

            // Process Data: Group by Year and Month
            const yearlyData = {};
            data.forEach(({ YEAR, MONTH, TOTAL_SAMPLES }) => {
                if (YEAR === null || MONTH === null) return;

                if (!yearlyData[YEAR]) yearlyData[YEAR] = new Array(12).fill(null);
                yearlyData[YEAR][MONTH - 1] = TOTAL_SAMPLES;
            });

            console.log("📊 Processed Data:", yearlyData);

            const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

            // Check visibility and update accordingly
            if (tableContainer.style.display === "block") {
                generateTable(yearlyData, labels); // Update table if visible
            } else {
                renderChart(labels, yearlyData); // Otherwise, update chart
            }

        } catch (error) {
            console.error("❌ Error fetching data:", error);
        }
    }

    // Render Chart
    function renderChart(labels, yearlyData) {
        const datasets = Object.keys(yearlyData).map((year, index) => ({
            label: `Year ${year}`,
            data: yearlyData[year],
            borderColor: `hsl(${(index * 60) % 360}, 70%, 50%)`,
            backgroundColor: "transparent",
            borderWidth: 2,
            tension: 0.4,
            pointRadius: 5,
            pointBackgroundColor: `hsl(${(index * 60) % 360}, 70%, 50%)`
        }));

        if (cumulativeChart) {
            cumulativeChart.destroy();
        }

        cumulativeChart = new Chart(ctx, {
            type: "line",
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: "top" } },
                scales: { 
                    x: { title: { display: true, text: "Month" }, type: "category", offset: true },
                    y: { 
                        title: { display: true, text: "SAMPLE COUNT", font: { size: 14 } },
                        min: 5000,
                        max: 25000,
                        ticks: { stepSize: 1000, callback: (value) => value.toLocaleString() },
                        grid: { drawBorder: false }
                    }
                }
            }
        });
    }

    // Generate Table
    function generateTable(data, months) {
        let tableHTML = `<table class="table table-bordered">
            <thead>
                <tr><th>Year</th>${months.map(m => `<th>${m}</th>`).join("")}</tr>
            </thead>
            <tbody>`;

        Object.keys(data).forEach(year => {
            tableHTML += `<tr><td>${year}</td>${data[year].map(value => `<td>${value !== null ? value : "-"}</td>`).join("")}</tr>`;
        });

        tableHTML += `</tbody></table>`;

        tableContainer.innerHTML = tableHTML;
    }

    // Handle Dropdown Selection
    dropdownItems.forEach(item => {
        item.addEventListener("click", function (event) {
            event.preventDefault();
            selectedType = this.dataset.type;

            dropdownButton.textContent = selectedType;
            titleElement.textContent = `Cumulative Monthly Census of Samples ${selectedType}`;

            fetchAndRender(selectedType); // Update either chart or table
        });
    });

    // Toggle Table & Chart
    showTableButton.addEventListener("click", () => {
        if (tableContainer.style.display === "none" || tableContainer.style.display === "") {
            tableContainer.style.display = "block"; // Show table
            chartWrapper.style.display = "none";   // Hide graph
            showTableButton.textContent = "Show Graph";
            fetchAndRender(selectedType); // Ensure table updates when shown
        } else {
            tableContainer.style.display = "none"; // Hide table
            chartWrapper.style.display = "block";  // Show graph
            showTableButton.textContent = "Show Table";
            fetchAndRender(selectedType); // Ensure chart updates when shown
        }
    });

    // Load Initial Data
    fetchAndRender(selectedType);
});
