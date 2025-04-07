let currentMode = "entry"; // Default mode is "entry"

async function fetchSummaryData() {
    try {
        const response = await fetch("http://localhost:3000/api/demog-summary-count");

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Fetched Data:", data); // Debugging

        // Use the current mode to decide which data to display
        const selectedData = data[currentMode];

        // Populate the frontend with the selected data
        document.querySelector(".jay-arr-value").textContent = selectedData["Jay Arr Apelado"] || 0;
        document.querySelector(".angge-value").textContent = selectedData["Angelica Brutas"] || 0;
        document.querySelector(".rose-value").textContent = selectedData["Mary Rose Gomez"] || 0;
        document.querySelector(".abi-value").textContent = selectedData["Abigail Morfe"] || 0;
    } catch (error) {
        console.error("Error fetching summary data:", error);
    }
}

// ✅ Fetch on page load and every 5 minutes
fetchSummaryData();
setInterval(fetchSummaryData, 300000); // 5 minutes

// ✅ Function to toggle between Entry and Verification
function toggleMode() {
    currentMode = (currentMode === "entry") ? "verification" : "entry"; // Toggle the mode
    fetchSummaryData(); // Re-fetch and update the displayed data
}

// Event listener for the switch icon
document.querySelector(".switch-icon").addEventListener("click", toggleMode);
