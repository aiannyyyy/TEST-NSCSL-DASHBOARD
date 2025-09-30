
/*
$(document).ready(function () {
    fetchVisits();
});

let doughnutChart; // Global variable to store the chart instance

// Fetch facility visits
// Fetch facility visits and update chart
function fetchVisits() {
    $.get("http://localhost:3001/api/facility-visits", function (data) {
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
                        <span class="badge badge-${statusClass}">
                            ${statusText}
                        </span>
                    </td>
                    
                    <td>
                        <button class="btn btn-sm btn-warning" 
                                onclick="openModal(${visit.id}, '${visit.facility_code}', '${visit.facility_name}', '${visit.date_visited}', '${visit.province}', '${visit.status}', '${remarks.replace(/'/g, "\\'")}')">
                            Edit
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

// Function to refresh the monthly chart if it exists
function refreshMonthlyChart() {
    // Check if the monthly chart functionality exists
    if (typeof window.fetchAndRenderChart === 'function') {
        // Call the monthly chart refresh function
        window.fetchAndRenderChart();
    }
}

function updateDoughnutChart(active, inactive, closed) {
    // If monthly chart exists, refresh it instead of updating with all data
    if (window.doughnutChartInstance && typeof window.fetchAndRenderChart === 'function') {
        // Use the monthly chart's refresh function to maintain date filtering
        refreshMonthlyChart();
        return;
    }
    
    // Check if element exists before creating
    const chartElement = document.getElementById("doughnutChart");
    if (!chartElement) {
        console.log("Chart element not found");
        return;
    }
    
    const ctx = chartElement.getContext("2d");

    // Destroy local chart if it exists
    if (doughnutChart) {
        doughnutChart.destroy();
        doughnutChart = null;
    }

    // Create new chart only if no monthly chart exists
    const newChart = new Chart(ctx, {
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
            maintainAspectRatio: true,
            layout: {
                padding: {
                    top: 30,
                    bottom: 70,
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
                        padding: 40,
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
    
    // Store chart reference
    doughnutChart = newChart;
}

$("#facilityCode").off("keypress").on("keypress", function (e) {
    if (e.key === "Enter") {
        e.preventDefault(); // Prevent form submission
        const facilityCode = $(this).val().trim();

        if (facilityCode) {
            fetch(`http://localhost:3001/api/list-facilities?facilitycode=${encodeURIComponent(facilityCode)}`)
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
    // Clear all form fields first to ensure clean state
    clearModalForm();
    
    // Check if we have a valid ID (not null, undefined, or empty string)
    if (id && id !== "" && id !== "undefined" && id !== "null") {
        // We're editing - populate the fields
        $("#visitId").val(id);
        $("#facilityCode").val(facilityCode || "");
        $("#facilityName").val(facilityName || "");
        
        // Format date for datetime-local input
        if (dateVisited) {
            const date = new Date(dateVisited);
            const formattedDate = date.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:MM
            $("#dateVisited").val(formattedDate);
        }
        
        $("#province").val(province || "");
        $("#status").val(status || "");
        $("#remarks").val(remarks || "");
        
        $("#visitModalLabel").text("Edit Facility Visit");
    } else {
        // For new entries, explicitly set the modal title
        $("#visitModalLabel").text("Add Facility Visit");
    }
    
    $("#visitModal").modal("show");
}

// Clear all modal form fields
function clearModalForm() {
    $("#visitId").val("");
    $("#facilityCode").val("");
    $("#facilityName").val("");
    $("#dateVisited").val("");
    $("#province").val("");
    $("#status").val("");
    $("#remarks").val("");
    // Also reset the modal title to default
    $("#visitModalLabel").text("Add Facility Visit");
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

    let url = id ? `http://localhost:3001/api/facility-visits/${id}` : "http://localhost:3001/api/facility-visits";
    let method = id ? "PUT" : "POST";
    
    // Debug logging to verify operation type
    console.log(id ? `Updating facility visit ID: ${id}` : "Adding new facility visit");
    console.log("URL:", url, "Method:", method);

    $.ajax({
        url: url,
        type: method,
        contentType: "application/json",
        data: JSON.stringify(visitData),
        success: function (response) {
            alert(response.message);
            $("#visitModal").modal("hide");
            clearModalForm(); // Clear form after successful save
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
        url: `http://localhost:3001/api/facility-visits/${id}`,
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
        url: `http://localhost:3001/api/facility-visits/${id}/status`,
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
        $.get("http://localhost:3001/api/facility-visits", function(data) {
            resolve(data);
        }).fail(function(error) {
            reject(error);
        });
    });
}

$(document).ready(function () {
    $("#exportModal").on("show.bs.modal", function () {
        const today = new Date();

        const startDate = new Date(today);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(today);
        endDate.setHours(23, 59, 0, 0);

        const formatDateForInput = (date) => {
            const pad = (n) => n.toString().padStart(2, '0');
            return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
        };

        $("#exportStartDate").val(formatDateForInput(startDate));
        $("#exportEndDate").val(formatDateForInput(endDate));
    });
    
    // Clear form when modal is closed
    $("#visitModal").on("hidden.bs.modal", function () {
        clearModalForm();
    });
});

*/
$(document).ready(function () {
    fetchVisits();
});

let doughnutChart; // Global variable to store the chart instance

// Fetch facility visits
// Fetch facility visits and update chart
function fetchVisits() {
    $.get("http://localhost:3001/api/facility-visits", function (data) {
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

            // Handle attachment display with single button for all files
            let attachmentDisplay = "";
            if (visit.attachment_path) {
                // Just show one button regardless of number of files
                attachmentDisplay = `<button class="btn btn-sm btn-info" onclick="showAttachmentOptions('${visit.id}', '${visit.attachment_path.replace(/'/g, "\\'")}')">
                    <i class="mdi mdi-file-document"></i>
                </button>`;
            } else {
                attachmentDisplay = '<span class="text-muted">No file</span>';
            }

            // Escape quotes properly for the onclick function
            const escapedRemarks = remarks.replace(/'/g, "\\'").replace(/"/g, '\\"');
            const escapedFacilityName = visit.facility_name.replace(/'/g, "\\'").replace(/"/g, '\\"');

            // Then modify your table row generation code
            $("#visitTable").append(`
                <tr id="row-${visit.id}">
                    <td class="color">${visit.facility_code}</td>
                    <td class="limited-width color" title="${visit.facility_name}">${visit.facility_name}</td>
                    <td class="color">${new Date(visit.date_visited).toLocaleString()}</td>
                    <td class="color">${visit.province}</td>
                    <td class="limited-width-wrap color" title="${remarks}">${remarks}</td>
                    <td>${attachmentDisplay}</td>
                    <td>
                        <span class="badge badge-${statusClass}">
                            ${statusText}
                        </span>
                    </td>
                    <!--
                    <td>
                        <button class="btn btn-sm btn-warning" 
                                onclick="openModal('${visit.id}', '${visit.facility_code}', '${escapedFacilityName}', '${visit.date_visited}', '${visit.province}', '${visit.status}', '${escapedRemarks}')">
                            Edit
                        </button>
                    </td>
                    --!>
                </tr>
`);
        });

        updateDoughnutChart(activeCount, inactiveCount, closedCount);
    }).fail(function () {
        alert("Error fetching data from server!");
    });
}

// New function to handle showing attachment options
function showAttachmentOptions(visitId, attachmentPath) {
    if (!attachmentPath) {
        alert('No attachments found');
        return;
    }
    
    const attachments = attachmentPath.split(',');
    
    if (attachments.length === 1) {
        // Single file - directly open/download
        const path = attachments[0];
        const fileName = path.split('/').pop();
        const fileExtension = fileName.split('.').pop().toLowerCase();
        const viewableTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'gif', 'txt', 'csv'];
        
        if (viewableTypes.includes(fileExtension)) {
            window.open(`http://localhost:3001/${path}`, '_blank');
        } else {
            downloadFileDirectly(path, fileName);
        }
    } else {
        // Multiple files - show selection modal
        showMultipleFilesModal(attachments);
    }
}

// Function to download file directly
function downloadFileDirectly(filePath, fileName) {
    const link = document.createElement('a');
    link.href = `http://localhost:3001/${filePath}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Function to show multiple files selection modal
function showMultipleFilesModal(attachments) {
    let modalContent = `
        <div class="modal fade" id="attachmentSelectionModal" tabindex="-1" aria-labelledby="attachmentSelectionModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="attachmentSelectionModalLabel">Select File to View/Download</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
    `;
    
    attachments.forEach((path, index) => {
        const fileName = path.split('/').pop();
        const fileExtension = fileName.split('.').pop().toLowerCase();
        const viewableTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'gif', 'txt', 'csv'];
        
        modalContent += `
            <div class="d-flex justify-content-between align-items-center mb-3 p-2 border rounded">
                <div class="flex-grow-1">
                    <i class="mdi mdi-file-document me-2"></i>
                    <span>${fileName}</span>
                </div>
                <div>
        `;
        
        if (viewableTypes.includes(fileExtension)) {
            modalContent += `
                <button class="btn btn-sm btn-primary me-1" onclick="window.open('http://localhost:3001/${path}', '_blank')" title="View File">
                    <i class="mdi mdi-eye"></i> View
                </button>
            `;
        } else {
            modalContent += `
                <button class="btn btn-sm btn-primary me-1" onclick="downloadFileDirectly('${path}', '${fileName}')" title="Download File">
                    <i class="mdi mdi-download"></i> Download
                </button>
            `;
        }
        
        modalContent += `
                </div>
            </div>
        `;
    });
    
    modalContent += `
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    $('#attachmentSelectionModal').remove();
    
    // Add modal to body and show it
    $('body').append(modalContent);
    $('#attachmentSelectionModal').modal('show');
    
    // Clean up modal after it's hidden
    $('#attachmentSelectionModal').on('hidden.bs.modal', function () {
        $(this).remove();
    });
}

// Function to refresh the monthly chart if it exists
function refreshMonthlyChart() {
    // Check if the monthly chart functionality exists
    if (typeof window.fetchAndRenderChart === 'function') {
        // Call the monthly chart refresh function
        window.fetchAndRenderChart();
    }
}

function updateDoughnutChart(active, inactive, closed) {
    // If monthly chart exists, refresh it instead of updating with all data
    if (window.doughnutChartInstance && typeof window.fetchAndRenderChart === 'function') {
        // Use the monthly chart's refresh function to maintain date filtering
        refreshMonthlyChart();
        return;
    }
    
    // Check if element exists before creating
    const chartElement = document.getElementById("doughnutChart");
    if (!chartElement) {
        console.log("Chart element not found");
        return;
    }
    
    const ctx = chartElement.getContext("2d");

    // Destroy local chart if it exists
    if (doughnutChart) {
        doughnutChart.destroy();
        doughnutChart = null;
    }

    // Create new chart only if no monthly chart exists
    const newChart = new Chart(ctx, {
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
            maintainAspectRatio: true,
            layout: {
                padding: {
                    top: 30,
                    bottom: 70,
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
                        padding: 40,
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
    
    // Store chart reference
    doughnutChart = newChart;
}

$("#facilityCode").off("keypress").on("keypress", function (e) {
    if (e.key === "Enter") {
        e.preventDefault(); // Prevent form submission
        const facilityCode = $(this).val().trim();

        if (facilityCode) {
            fetch(`http://localhost:3001/api/list-facilities?facilitycode=${encodeURIComponent(facilityCode)}`)
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

// Enhanced openModal function with proper attachment path handling
function openModal(id, facilityCode, facilityName, dateVisited, province, status, remarks, attachmentPath) {
    // Always clear the form first
    clearModalForm();
    
    // Check if we have a valid ID for editing
    if (id && id !== "" && id !== "undefined" && id !== "null" && id !== undefined) {
        // We're editing - populate the fields
        $("#visitId").val(id);
        $("#facilityCode").val(facilityCode || "");
        $("#facilityName").val(facilityName || "");
        
        // Format date for datetime-local input
        if (dateVisited) {
            const date = new Date(dateVisited);
            const formattedDate = date.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:MM
            $("#dateVisited").val(formattedDate);
        }
        
        $("#province").val(province || "");
        $("#status").val(status || "");
        $("#remarks").val(remarks || "");
        
        // Store the original attachment path for reference
        $("#visitModal").data("originalAttachmentPath", attachmentPath || "");
        
        // Handle existing attachments
        displayExistingAttachments(attachmentPath);
        
        $("#visitModalLabel").text("Edit Facility Visit");
        $("#saveButton").text("Update Visit");
    } else {
        // For new entries
        $("#visitModalLabel").text("Add Facility Visit");
        $("#saveButton").text("Add Visit");
        
        // Clear original attachment path data
        $("#visitModal").removeData("originalAttachmentPath");
        
        // Hide existing attachments section for new entries
        $("#existingAttachments").hide();
    }
    
    $("#visitModal").modal("show");
}

// Function to display existing attachments in the modal
function displayExistingAttachments(attachmentPath) {
    const existingAttachmentsDiv = $("#existingAttachments");
    
    if (!attachmentPath) {
        existingAttachmentsDiv.hide();
        return;
    }
    
    const attachments = attachmentPath.split(',');
    let attachmentHtml = '<div class="mb-3"><label class="form-label"><strong>Current Attachments:</strong></label><div class="existing-files">';
    
    attachments.forEach((path, index) => {
        const fileName = path.split('/').pop();
        const fileExtension = fileName.split('.').pop().toLowerCase();
        const viewableTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'gif', 'txt', 'csv'];
        
        attachmentHtml += `
            <div class="attachment-item d-flex align-items-center mb-2 p-2 border rounded" data-file-path="${path}">
                <div class="flex-grow-1">
                    <i class="mdi mdi-file-document me-2"></i>
                    <span class="filename">${fileName}</span>
                </div>
                <div class="attachment-actions">
                    ${viewableTypes.includes(fileExtension) ? 
                        `<button type="button" class="btn btn-sm btn-info me-1" onclick="viewFile('${path}')" title="View File">
                            <i class="mdi mdi-eye"></i>
                        </button>` : 
                        `<button type="button" class="btn btn-sm btn-info me-1" onclick="downloadFile('${path}', '${fileName}')" title="Download File">
                            <i class="mdi mdi-download"></i>
                        </button>`
                    }
                    <button type="button" class="btn btn-sm btn-danger" onclick="markFileForDeletion('${path}')" title="Remove File">
                        <i class="mdi mdi-delete"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    attachmentHtml += '</div></div>';
    existingAttachmentsDiv.html(attachmentHtml).show();
}

// Function to view a file
function viewFile(filePath) {
    window.open(`http://localhost:3001/${filePath}`, '_blank');
}

// Function to download a file
function downloadFile(filePath, fileName) {
    const link = document.createElement('a');
    link.href = `http://localhost:3001/${filePath}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Add button to trigger add modal (make sure this is called when Add button is clicked)
function openAddModal() {
    openModal(); // Call without parameters for new entry
}

// Enhanced clear modal form function
function clearModalForm() {
    $("#visitId").val("");
    $("#facilityCode").val("");
    $("#facilityName").val("");
    $("#dateVisited").val("");
    $("#province").val("");
    $("#status").val("");
    $("#remarks").val("");
    
    // Clear file input properly
    const fileInput = $("#attachment")[0];
    if (fileInput) {
        fileInput.value = "";
    }
    
    // Hide existing attachments
    $("#existingAttachments").hide().empty();
    
    // Reset modal title and button text to default
    $("#visitModalLabel").text("Add Facility Visit");
    $("#saveButton").text("Add Visit");
}

// Function to mark file for deletion
function markFileForDeletion(filePath) {
    const attachmentItem = $(`.attachment-item[data-file-path="${filePath}"]`);
    
    if (attachmentItem.hasClass('marked-for-deletion')) {
        // Unmark for deletion
        attachmentItem.removeClass('marked-for-deletion').removeClass('bg-light text-muted');
        attachmentItem.find('.filename').removeClass('text-decoration-line-through');
        attachmentItem.find('.btn-success').removeClass('btn-success').addClass('btn-danger')
            .html('<i class="mdi mdi-delete"></i>').attr('title', 'Remove File');
    } else {
        // Mark for deletion
        attachmentItem.addClass('marked-for-deletion bg-light text-muted');
        attachmentItem.find('.filename').addClass('text-decoration-line-through');
        attachmentItem.find('.btn-danger').removeClass('btn-danger').addClass('btn-success')
            .html('<i class="mdi mdi-restore"></i>').attr('title', 'Keep File');
    }
}

// Enhanced save function with better attachment management
function saveFacilityVisit() {
    let id = $("#visitId").val();
    let facilityCode = $("#facilityCode").val().trim();
    let facilityName = $("#facilityName").val().trim();
    let dateVisited = $("#dateVisited").val();
    let province = $("#province").val().trim();
    let status = $("#status").val();
    let remarks = $("#remarks").val().trim() || "No remarks";
    
    // Validation
    if (!facilityCode || !facilityName || !dateVisited || !province || status === "") {
        alert("Please fill in all required fields!");
        return;
    }

    const fileInput = $("#attachment")[0];
    const hasNewFiles = fileInput && fileInput.files.length > 0;
    const isEditing = id && id !== "" && id !== "undefined" && id !== "null";
    
    // Prepare URL and method
    let url = isEditing ? `http://localhost:3001/api/facility-visits/${id}` : "http://localhost:3001/api/facility-visits";
    let method = isEditing ? "PUT" : "POST";

    // Use FormData for all requests
    let formData = new FormData();
    formData.append('facility_code', facilityCode);
    formData.append('facility_name', facilityName);
    formData.append('date_visited', dateVisited);
    formData.append('province', province);
    formData.append('status', status);
    formData.append('remarks', remarks);
    formData.append('mark', null);

    // Add file management data for editing
    if (isEditing) {
        // Check if any attachment management was done
        const hasAttachmentSection = $("#existingAttachments").is(":visible") && $("#existingAttachments .attachment-item").length > 0;
        
        if (hasAttachmentSection) {
            // Get files marked for deletion
            const filesToDelete = [];
            $('.attachment-item.marked-for-deletion').each(function() {
                filesToDelete.push($(this).data('file-path'));
            });
            
            // Get files to keep
            const filesToKeep = [];
            $('.attachment-item:not(.marked-for-deletion)').each(function() {
                filesToKeep.push($(this).data('file-path'));
            });
            
            formData.append('files_to_keep', JSON.stringify(filesToKeep));
            formData.append('files_to_delete', JSON.stringify(filesToDelete));
            
            console.log("Files to keep:", filesToKeep);
            console.log("Files to delete:", filesToDelete);
        } else {
            // No attachment management UI was shown, but we might have original attachments
            const originalAttachmentPath = $("#visitModal").data("originalAttachmentPath");
            if (originalAttachmentPath) {
                // Keep all original attachments
                const originalFiles = originalAttachmentPath.split(',').filter(path => path.trim() !== '');
                formData.append('files_to_keep', JSON.stringify(originalFiles));
                formData.append('files_to_delete', JSON.stringify([]));
                console.log("Preserving original attachments:", originalFiles);
            }
        }
    }

    // Add new file attachments if present
    if (hasNewFiles) {
        for (let i = 0; i < fileInput.files.length; i++) {
            formData.append('attachments', fileInput.files[i]);
        }
        console.log("Adding new files:", fileInput.files.length);
    }

    $.ajax({
        url: url,
        type: method,
        data: formData,
        processData: false,
        contentType: false,
        success: function (response) {
            alert(response.message || (isEditing ? "Visit updated successfully!" : "Visit added successfully!"));
            $("#visitModal").modal("hide");
            clearModalForm();
            fetchVisits();
        },
        error: function (xhr, status, error) {
            console.error("Error details:", xhr.responseText);
            console.error("Status:", status);
            console.error("Error:", error);
            
            let errorMessage = "Error saving facility visit!";
            if (xhr.responseJSON && xhr.responseJSON.error) {
                errorMessage += " " + xhr.responseJSON.error;
            } else if (xhr.responseText) {
                errorMessage += " " + xhr.responseText;
            }
            
            alert(errorMessage);
        }
    });
}

// Delete facility visit
function deleteVisit(id) {
    if (!confirm("Are you sure you want to delete this facility visit?")) return;

    $.ajax({
        url: `http://localhost:3001/api/facility-visits/${id}`,
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
        url: `http://localhost:3001/api/facility-visits/${id}/status`,
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
            'Remarks': visit.remarks || "No remarks",
            'Attachments': visit.attachment_path ? 'Yes' : 'No'
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
            { wch: 40 }, // Remarks
            { wch: 12 }  // Attachments
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
        $.get("http://localhost:3001/api/facility-visits", function(data) {
            resolve(data);
        }).fail(function(error) {
            reject(error);
        });
    });
}

$(document).ready(function () {
    $("#exportModal").on("show.bs.modal", function () {
        const today = new Date();

        const startDate = new Date(today);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(today);
        endDate.setHours(23, 59, 0, 0);

        const formatDateForInput = (date) => {
            const pad = (n) => n.toString().padStart(2, '0');
            return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
        };

        $("#exportStartDate").val(formatDateForInput(startDate));
        $("#exportEndDate").val(formatDateForInput(endDate));
    });
    
    // Clear form when modal is closed
    $("#visitModal").on("hidden.bs.modal", function () {
        clearModalForm();
    });
    
    // Ensure modal is properly cleared when opened
    $("#visitModal").on("show.bs.modal", function () {
        // Only clear if no ID is present (meaning it's a new entry)
        if (!$("#visitId").val()) {
            clearModalForm();
        }
    });
});