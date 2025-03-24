function filterReports(category, event) {
    event.preventDefault(); // Prevent the page from jumping to the top

    // Hide all reports
    document.querySelectorAll(".bullet-line-list li").forEach((item) => {
        item.style.display = "none";
    });

    // Show only selected category
    document.querySelectorAll("." + category).forEach((item) => {
        item.style.display = "block";
    });
}


// Default: Show only "daily" reports on page load
document.addEventListener("DOMContentLoaded", function () {
    filterReports("daily");
});

// Function to run EXE
function runExe(exeName) {
    fetch(`http://localhost:3000/api/run-exe/${exeName}`)  // ✅ Correct API Route
        .then(response => response.text())
        .then(data => alert(data))
        .catch(error => console.error("Error:", error));
}
