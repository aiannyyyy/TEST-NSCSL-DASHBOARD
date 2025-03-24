document.addEventListener("DOMContentLoaded", function () {
    const year1Select = document.getElementById("year1");
    const year2Select = document.getElementById("year2");
    const monthSelect = document.getElementById("month");

    function fetchTimelinessData() {
        const year1 = year1Select.value;
        const year2 = year2Select.value;
        const month = monthSelect.value;

        if (!year1 || !year2 || !month) {
            console.warn("⚠️ Please select all filters");
            return;
        }

        console.log(`📌 Fetching Data for: Year1: ${year1}, Year2: ${year2}, Month: ${month}`);

        fetch(`/api/timeliness?year1=${year1}&year2=${year2}&month=${month}`)
            .then(response => response.json())
            .then(data => {
                console.log("✅ Data received:", data);
                updateTable(data, year1, year2);
            })
            .catch(error => {
                console.error("❌ Error fetching data:", error);
            });
    }

    function updateTable(data, year1, year2) {
        // Update AOC values
        document.getElementById(`aoc-ave-${year1}`).textContent = data[`aoc_ave_${year1}`] || "N/A";
        document.getElementById(`aoc-ave-${year2}`).textContent = data[`aoc_ave_${year2}`] || "N/A";
        document.getElementById(`aoc-med-${year1}`).textContent = data[`aoc_med_${year1}`] || "N/A";
        document.getElementById(`aoc-med-${year2}`).textContent = data[`aoc_med_${year2}`] || "N/A";
        document.getElementById(`aoc-mod-${year1}`).textContent = data[`aoc_mod_${year1}`] || "N/A";
        document.getElementById(`aoc-mod-${year2}`).textContent = data[`aoc_mod_${year2}`] || "N/A";

        // Update Transit Time values
        document.getElementById(`transit-ave-${year1}`).textContent = data[`transit_ave_${year1}`] || "N/A";
        document.getElementById(`transit-ave-${year2}`).textContent = data[`transit_ave_${year2}`] || "N/A";
        document.getElementById(`transit-med-${year1}`).textContent = data[`transit_med_${year1}`] || "N/A";
        document.getElementById(`transit-med-${year2}`).textContent = data[`transit_med_${year2}`] || "N/A";
        document.getElementById(`transit-mod-${year1}`).textContent = data[`transit_mod_${year1}`] || "N/A";
        document.getElementById(`transit-mod-${year2}`).textContent = data[`transit_mod_${year2}`] || "N/A";

        // Update Age Upon Receipt values
        document.getElementById(`age-ave-${year1}`).textContent = data[`age_ave_${year1}`] || "N/A";
        document.getElementById(`age-ave-${year2}`).textContent = data[`age_ave_${year2}`] || "N/A";
        document.getElementById(`age-med-${year1}`).textContent = data[`age_med_${year1}`] || "N/A";
        document.getElementById(`age-med-${year2}`).textContent = data[`age_med_${year2}`] || "N/A";
        document.getElementById(`age-mod-${year1}`).textContent = data[`age_mod_${year1}`] || "N/A";
        document.getElementById(`age-mod-${year2}`).textContent = data[`age_mod_${year2}`] || "N/A";
    }

    // Attach event listeners
    year1Select.addEventListener("change", fetchTimelinessData);
    year2Select.addEventListener("change", fetchTimelinessData);
    monthSelect.addEventListener("change", fetchTimelinessData);

    // Fetch data on page load
    fetchTimelinessData();
});
