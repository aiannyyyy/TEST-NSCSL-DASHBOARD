$(document).ready(function () {
    fetchVisits();
});

let doughnutChart; // Global variable to store the chart instance

// Fetch facility visits
// Fetch facility visits and update chart
function fetchVisits() {
    $.get("http://localhost:3000/api/facility-visits", function (data) {
        let container = $(".scrollable-container");
        $("#visitTable").html("");

        let activeCount = 0, inactiveCount = 0, closedCount = 0;

        data.forEach((visit) => {
            if (visit.status == "1") activeCount++;
            else if (visit.status == "0") inactiveCount++;
            else closedCount++;

            let statusText = visit.status == "1" ? "✅ Active" 
                            : visit.status == "0" ? "❌ Inactive" 
                            : "⚫ Closed";

            let statusClass = visit.status == "1" ? "success" 
                            : visit.status == "0" ? "danger" 
                            : "secondary";

            $("#visitTable").append(`
                <tr id="row-${visit.id}">
                    <td>${visit.facility_code}</td>
                    <td>${visit.facility_name}</td>
                    <td>${new Date(visit.date_visited).toLocaleString()}</td>
                    <td>${visit.province}</td>
                    <td>
                        <button class="btn btn-sm btn-${statusClass}"
                                onclick="toggleStatus(${visit.id}, '${visit.status}')">
                            ${statusText}
                        </button>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-warning" 
                                onclick="openModal(${visit.id}, '${visit.facility_code}', '${visit.facility_name}', '${visit.date_visited}', '${visit.province}', '${visit.status}')">
                            Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteVisit(${visit.id})">
                            Delete
                        </button>
                    </td>
                </tr>
            `);
        });

        updateDoughnutChart(activeCount, inactiveCount, closedCount);
    }).fail(function () {
        alert("Error fetching data from server!");
    });
}

function updateDoughnutChart(active, inactive, closed) {
    const ctx = document.getElementById("doughnutChart").getContext("2d");

    if (doughnutChart) {
        doughnutChart.destroy(); // Destroy previous chart before updating
    }

    doughnutChart = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: ["Active", "Inactive", "Closed"],
            datasets: [{
                data: [active, inactive, closed],
                backgroundColor: ["#1F3BB3", "#FDD0C7", "#52CDFF"],
                borderColor: ["#1F3BB3", "#FDD0C7", "#52CDFF"],
            }]
        },
        options: {
            cutout: 90,
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true, // Show legend for Active, Inactive, and Closed
                }
            }
        }
    });
}

// Open modal for adding/editing visits
function openModal(id = "", code = "", name = "", date = "", province = "", status = "1") {
    $("#visitId").val(id);
    $("#facilityCode").val(code);
    $("#facilityName").val(name);
    $("#dateVisited").val(date ? new Date(date).toISOString().slice(0, 16) : "");
    $("#province").val(province);
    $("#status").val(status);  

    let modal = new bootstrap.Modal(document.getElementById("visitModal"));
    modal.show();
}

// Save visit (Add or Edit)
function saveFacilityVisit() {
    let id = $("#visitId").val();
    let facilityCode = $("#facilityCode").val();
    let facilityName = $("#facilityName").val();
    let dateVisited = $("#dateVisited").val();
    let province = $("#province").val();
    let status = $("#status").val();

    if (!facilityCode || !facilityName || !dateVisited || !province || status === "") {
        alert("Please fill in all required fields!");
        return;
    }

    let visitData = {
        facility_code: facilityCode,
        facility_name: facilityName,
        date_visited: dateVisited,
        province: province,
        status: status,
        remarks: "No remarks",
        mark: null
    };

    let url = id ? `http://localhost:3000/api/facility-visits/${id}` : "http://localhost:3000/api/facility-visits";
    let method = id ? "PUT" : "POST";

    $.ajax({
        url: url,
        type: method,
        contentType: "application/json",
        data: JSON.stringify(visitData),
        success: function (response) {
            alert(response.message);
            $("#visitModal").modal("hide");
            fetchVisits();
        },
        error: function () {
            alert("Error saving facility visit!");
        }
    });
}

// Delete facility visit
function deleteVisit(id) {
    if (!confirm("Are you sure you want to delete this facility visit?")) return;

    $.ajax({
        url: `http://localhost:3000/api/facility-visits/${id}`,
        type: "DELETE",
        success: function (response) {
            alert(response.message);
            fetchVisits();
        },
        error: function () {
            alert("Error deleting facility visit!");
        }
    });
}

// Toggle status (Active/Inactive/Closed)
function toggleStatus(id, currentStatus) {
    let newStatus = currentStatus === "1" ? "0" 
                  : currentStatus === "0" ? "2" 
                  : "1"; // Cycle: Active → Inactive → Closed → Active

    $.ajax({
        url: `http://localhost:3000/api/facility-visits/${id}/status`,
        type: "PATCH",
        contentType: "application/json",
        data: JSON.stringify({ status: newStatus }),
        success: function (response) {
            alert(response.message);
            fetchVisits();
        },
        error: function () {
            alert("Error updating status!");
        }
    });
}
