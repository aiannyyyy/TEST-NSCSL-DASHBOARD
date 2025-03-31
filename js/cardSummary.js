async function fetchSummaryData() {
    try {
        const response = await fetch("http://localhost:3000/api/total-samples");

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Fetched Data:", data); // Debugging

        document.querySelector(".sample-receieved-value").textContent = data.received || 0;
        document.querySelector(".sample-screened-value").textContent = data.screened || 0;
        document.querySelector(".sample-unfitunst-value").textContent = data.unsat || 0;
    } catch (error) {
        console.error("Error fetching summary data:", error);
    }
}

// ✅ Fetch on page load and every 5 minutes
fetchSummaryData();
setInterval(fetchSummaryData, 300000);
