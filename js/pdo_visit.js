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
                            
            // Handle null or empty remarks with a default message
            let remarks = visit.remarks ? visit.remarks : "No remarks";

            // Then modify your table row generation code
            $("#visitTable").append(`
                <tr id="row-${visit.id}">
                    <td class="color">${visit.facility_code}</td>
                    <td class="limited-width color" title="${visit.facility_name}">${visit.facility_name}</td>
                    <td class="color">${new Date(visit.date_visited).toLocaleString()}</td>
                    <td class="color">${visit.province}</td>
                    <td class="limited-width-wrap color" title="${remarks}">${remarks}</td>
                    <td>
                        <button class="btn btn-sm btn-${statusClass}"
                                onclick="toggleStatus(${visit.id}, '${visit.status}')">
                            ${statusText}
                        </button>
                    </td>
                    
                    <td>
                        <button class="btn btn-sm btn-warning" 
                                onclick="openModal(${visit.id}, '${visit.facility_code}', '${visit.facility_name}', '${visit.date_visited}', '${visit.province}', '${visit.status}', '${remarks.replace(/'/g, "\\'")}')">
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
            maintainAspectRatio: true, // Set to true since you have fixed dimensions
            layout: {
                padding: {
                    top: 30,
                    bottom: 70, // Significantly increased to move legend down
                    left: 20,
                    right: 20
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    align: 'center',
                    labels: {
                        padding: 40, // Increased padding between chart and legend
                        boxWidth: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                datalabels: {
                    color: '#000',
                    font: {
                        weight: 'bold',
                        size: 14
                    },
                    anchor: 'end',
                    align: 'end',
                    offset: 15,
                    formatter: (value) => `${value}`
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}

$("#facilityCode").off("keypress").on("keypress", function (e) {
    if (e.key === "Enter") {
        e.preventDefault(); // Prevent form submission
        const facilityCode = $(this).val().trim();

        if (facilityCode) {
            fetch(`http://localhost:3000/api/list-facilities?facilitycode=${encodeURIComponent(facilityCode)}`)
                .then(res => res.json())
                .then(data => {
                    console.log("API Response Data:", data); // Keep for debugging
                    
                    if (data && data.length > 0 && data[0].length >= 3) {
                        // Access the facility name at index 2 of the first array
                        $("#facilityName").val(data[0][2]);
                    } else {
                        $("#facilityName").val("");
                        alert("Facility code not found.");
                    }
                })
                .catch(err => {
                    console.error("Fetch facility name error:", err);
                    $("#facilityName").val("");
                    alert("Error fetching facility name.");
                });
        } else {
            $("#facilityName").val("");
        }
    }
});

// Open modal for adding or editing visit
function openModal(id, facilityCode, facilityName, dateVisited, province, status, remarks) {
    $("#visitId").val(id || "");
    $("#facilityCode").val(facilityCode || "");
    $("#facilityName").val(facilityName || "");
    
    // Format date for datetime-local input
    if (dateVisited) {
        const date = new Date(dateVisited);
        const formattedDate = date.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:MM
        $("#dateVisited").val(formattedDate);
    } else {
        $("#dateVisited").val("");
    }
    
    $("#province").val(province || "");
    $("#status").val(status || "");
    $("#remarks").val(remarks || "");
    
    $("#visitModalLabel").text(id ? "Edit Facility Visit" : "Add Facility Visit");
    $("#visitModal").modal("show");
}

// Save visit (Add or Edit)
function saveFacilityVisit() {
    let id = $("#visitId").val();
    let facilityCode = $("#facilityCode").val();
    let facilityName = $("#facilityName").val();
    let dateVisited = $("#dateVisited").val();
    let province = $("#province").val();
    let status = $("#status").val();
    let remarks = $("#remarks").val().trim();
    
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
        remarks: remarks || "No remarks",
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

/* Export to excel funtion */
async function exportToExcel() {
    try {
        // Get date range values
        const startDate = new Date($("#exportStartDate").val());
        const endDate = new Date($("#exportEndDate").val());
        
        // Validate date inputs
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            alert("Please select valid start and end dates.");
            return;
        }
        
        if (startDate > endDate) {
            alert("Start date must be before end date.");
            return;
        }
        
        // Fetch all facility visits
        const allVisits = await getAllFacilityVisits();
        
        // Filter visits by date range
        const filteredVisits = allVisits.filter(visit => {
            const visitDate = new Date(visit.date_visited);
            return visitDate >= startDate && visitDate <= endDate;
        });
        
        if (filteredVisits.length === 0) {
            alert("No facility visits found within the selected date range.");
            return;
        }
        
        // Prepare data for Excel export
        const workbookData = filteredVisits.map(visit => ({
            'Facility Code': visit.facility_code,
            'Facility Name': visit.facility_name,
            'Date and Time Visited': new Date(visit.date_visited).toLocaleString(),
            'Province': visit.province,
            'Status': visit.status == "1" ? "Active" : visit.status == "0" ? "Inactive" : "Closed",
            'Remarks': visit.remarks || "No remarks"
        }));
        
        // Create worksheet
        const worksheet = XLSX.utils.json_to_sheet(workbookData);
        
        // Set column widths
        const columnWidths = [
            { wch: 15 }, // Facility Code
            { wch: 25 }, // Facility Name
            { wch: 25 }, // Date and Time Visited
            { wch: 15 }, // Province
            { wch: 10 }, // Status
            { wch: 40 }  // Remarks
        ];
        worksheet['!cols'] = columnWidths;
        
        // Create workbook
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Facility Visits");
        
        // Generate filename with date range
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        const filename = `Facility_Visits_${startDateStr}_to_${endDateStr}.xlsx`;
        
        // Export file
        XLSX.writeFile(workbook, filename);
        
        // Close modal after export
        $("#exportModal").modal("hide");
        
    } catch (error) {
        console.error("Export error:", error);
        alert("Error exporting data. Please try again.");
    }
}

// Get all facility visits for export
function getAllFacilityVisits() {
    return new Promise((resolve, reject) => {
        $.get("http://localhost:3000/api/facility-visits", function(data) {
            resolve(data);
        }).fail(function(error) {
            reject(error);
        });
    });
}

// Initialize date inputs with current date range when opening the export modal
$("#exportModal").on("show.bs.modal", function() {
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(today.getMonth() - 1);
    
    // Format dates for datetime-local input
    const formatDateForInput = (date) => {
        return date.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:MM
    };
    
    $("#exportStartDate").val(formatDateForInput(oneMonthAgo));
    $("#exportEndDate").val(formatDateForInput(today));
});