let currentMode = "entry"; // Default mode is "entry"

async function fetchSummaryData() {
    try {
        // Get first and last day of current month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        // Format dates to ISO
        const startISO = startOfMonth.toISOString();
        const endISO = endOfMonth.toISOString();

        // Construct the API URL with formatted start and end dates
        const response = await fetch(`http://localhost:3001/api/demog-summary-count?start=${startISO}&end=${endISO}`);

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        const selectedData = data[currentMode];

        // Populate the data based on the current mode (entry or verification)
        if (currentMode === "entry") {
            document.querySelector(".jay-arr-value").textContent = selectedData["Jay Arr Apelado"] || 0;
            document.querySelector(".angge-value").textContent = selectedData["Angelica Brutas"] || 0;
            document.querySelector(".rose-value").textContent = selectedData["Mary Rose Gomez"] || 0;
            document.querySelector(".abi-value").textContent = selectedData["Abigail Morfe"] || 0;
        } else if (currentMode === "verification") {
            document.querySelector(".jay-arr-value").textContent = selectedData["Apelado Jay Arr"] || 0;
            document.querySelector(".angge-value").textContent = selectedData["Brutas Angelica"] || 0;
            document.querySelector(".rose-value").textContent = selectedData["Gomez Mary Rose"] || 0;
            document.querySelector(".abi-value").textContent = selectedData["Morfe Abigail"] || 0;
        }

        // Update the title and icon
        const title = document.getElementById("summary-title");
        title.innerHTML = `
            Summary of Total Data ${currentMode === "entry" ? "Entry" : "Verification"} of the Encoders this Month
            <img src="/src/assets/images/programation.png" alt="Change Data Icon" class="switch-icon" style="width: 30px; margin-left: 10px; cursor: pointer;">
        `;

        document.querySelector(".switch-icon").addEventListener("click", toggleMode);

    } catch (error) {
        console.error("Error fetching summary data:", error);
    }
}

// Toggle between entry and verification
function toggleMode() {
    currentMode = (currentMode === "entry") ? "verification" : "entry";
    fetchSummaryData(); // Refresh data and update title
}

// Fetch initially and every 5 minutes
fetchSummaryData();
setInterval(fetchSummaryData, 300100); // 5 minutes
