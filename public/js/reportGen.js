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

function handleDropdownSelection(element, event) {
    event.preventDefault(); // Prevent default link behavior

    const category = element.getAttribute("data-value");
    const button = document.getElementById("dropdownMenuButton3");

    // Update button text
    button.textContent = element.textContent;

    // Filter reports
    filterReports(category, event);
}



// Default: Show only "daily" reports on page load
document.addEventListener("DOMContentLoaded", function () {
    filterReports("daily");
});

// Function to run EXE
function runExe(exeName) {
    fetch(`http://localhost:3001/api/run-exe/${exeName}`)  // ✅ Correct API Route
        .then(response => response.text())
        .then(data => alert(data))
        .catch(error => console.error("Error:", error));
}
