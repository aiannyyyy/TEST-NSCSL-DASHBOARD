//total sample per day

// Get today's date
const today = new Date();
const currentYear = today.getFullYear();
const currentMonth = today.toLocaleString("default", { month: "long" }); // Example: "March"

// Set default values
let selectedYear = currentYear.toString();
let selectedMonth = currentMonth;

document.addEventListener("DOMContentLoaded", function () {
    const ctx = document.getElementById("labTotalSamplesPerDay").getContext("2d");

    const data = {
        labels: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        datasets: [
            {
                label: "Total Samples Per Day",
                data: [12, 19, 3, 5, 2, 3, 7], // Sample data, replace with dynamic values
                borderColor: "rgba(54, 162, 235, 1)", // Blue border
                backgroundColor: "rgba(54, 162, 235, 0.5)", // Transparent blue
                borderWidth: 2,
                borderRadius: 5, // 🔹 Small radius
                borderSkipped: false, // Ensures border rounding
            },
        ],
    };

    const config = {
        type: "bar",
        data: data,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                },
            },
        },
    };

    new Chart(ctx, config);
});

//end total samples per day