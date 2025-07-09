// ===== ENHANCED FRONTEND with Better Debugging and Table Updates =====

// Global configuration
const API_BASE_URL = 'http://localhost:3001/api';

// Focus on the lab number input when the modal is shown
document.getElementById('endorseModal').addEventListener('shown.bs.modal', function () {
    const labnoInput = document.getElementById('labnoratoryNumber');
    if (labnoInput) {
        labnoInput.focus();
        labnoInput.value = ''; // Clear previous value
    }
    // Clear all form fields when modal opens
    clearForm();
});

// Listen for "Enter" key press in the lab number input
document.getElementById('labnoratoryNumber').addEventListener('keydown', async function (event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        await searchLabData();
    }
});

// File input validation with enhanced feedback
document.getElementById('attachment').addEventListener('change', function(event) {
    const file = event.target.files[0];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
        'application/pdf', 
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    const filePreview = document.getElementById('filePreview');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    
    if (file) {
        console.log('File selected:', file.name, file.type, file.size);
        
        // Check file size
        if (file.size > maxSize) {
            showAlert('File size must be less than 10MB', 'error');
            event.target.value = '';
            hideFilePreview();
            return;
        }
        
        // Check file type
        if (!allowedTypes.includes(file.type)) {
            showAlert('Only PDF, Images (JPG, PNG, GIF), and Word documents are allowed', 'error');
            event.target.value = '';
            hideFilePreview();
            return;
        }
        
        // Show file preview
        if (fileName && fileSize && filePreview) {
            fileName.textContent = file.name;
            fileSize.textContent = `(${(file.size / 1024 / 1024).toFixed(2)} MB)`;
            filePreview.style.display = 'block';
        }
        
        console.log('File validation passed');
    } else {
        hideFilePreview();
    }
});

function hideFilePreview() {
    const filePreview = document.getElementById('filePreview');
    if (filePreview) {
        filePreview.style.display = 'none';
    }
}

function clearFileSelection() {
    const attachmentInput = document.getElementById('attachment');
    if (attachmentInput) {
        attachmentInput.value = '';
    }
    hideFilePreview();
}

// Separate function for searching lab data
async function searchLabData() {
    const labnoInput = document.getElementById('labnoratoryNumber');
    const labno = labnoInput.value.trim();

    if (!labno) {
        showAlert("Please enter a Laboratory Number.", 'warning');
        return;
    }

    // Show loading state
    showLoadingState(true);

    try {
        console.log(`Searching for labno: ${labno}`);
        
        const response = await fetch(`${API_BASE_URL}/endorsement-details?labno=${encodeURIComponent(labno)}`);
        
        if (!response.ok) {
            let errorMessage = `HTTP error! status: ${response.status}`;
            
            try {
                const errorData = await response.json();
                if (errorData.message) {
                    errorMessage += ` - ${errorData.message}`;
                }
                if (errorData.code) {
                    errorMessage += ` (${errorData.code})`;
                }
                console.error('Server error details:', errorData);
            } catch (parseError) {
                console.error('Could not parse error response:', parseError);
            }
            
            throw new Error(errorMessage);
        }
        
        const result = await response.json();
        console.log('API Response:', result);

        if (result.debug) {
            console.log('Debug info:', result.debug);
        }

        if (result.success && result.data && result.data.length > 0) {
            const record = result.data[0];
            console.log('Record found:', record);
            
            populateForm(record);
            showAlert(`Record found! ${result.count} Result Loaded.`, 'success');
        } else if (result.success && result.count === 0) {
            showAlert("No record found for the given Laboratory Number.", 'info');
            clearForm();
        } else {
            throw new Error(result.message || result.error || 'Unknown error occurred');
        }
    } catch (err) {
        console.error('Error fetching lab data:', err);
        showAlert(`Error: ${err.message}`, 'error');
        clearForm();
    } finally {
        showLoadingState(false);
    }
}

// Function to populate form fields
function populateForm(record) {
    console.log('Populating form with record:', record);
    
    if (Array.isArray(record)) {
        const fieldMappings = {
            'fname': record[2] || '',           // FNAME
            'lname': record[1] || '',           // LNAME  
            'facilityCode': record[4] || '',    // SUBMID
            'facilityName': record[6] || '',    // FACILITY_NAME
            'testResult': record[7] || ''       // TEST_RESULT
        };
        
        Object.entries(fieldMappings).forEach(([fieldId, value]) => {
            const element = document.getElementById(fieldId);
            if (element) {
                element.value = value;
                console.log(`Set ${fieldId} to: ${value}`);
            } else {
                console.warn(`Element with ID '${fieldId}' not found`);
            }
        });
    } else {
        const fieldMappings = {
            'fname': record.FNAME || '',
            'lname': record.LNAME || '',
            'facilityCode': record.SUBMID || '',
            'facilityName': record.FACILITY_NAME || record.DESCR1 || '',
            'testResult': record.TEST_RESULT || ''
        };

        Object.entries(fieldMappings).forEach(([fieldId, value]) => {
            const element = document.getElementById(fieldId);
            if (element) {
                element.value = value;
                console.log(`Set ${fieldId} to: ${value}`);
            } else {
                console.warn(`Element with ID '${fieldId}' not found`);
            }
        });
    }
}

// Clear the form fields
function clearForm() {
    const fieldIds = ['labnoratoryNumber', 'fname', 'lname', 'facilityCode', 'facilityName', 'testResult', 'remarks'];
    
    fieldIds.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            element.value = '';
        }
    });
    
    // Clear file input
    clearFileSelection();
    
    console.log('Form cleared');
}

// Show loading state
function showLoadingState(isLoading) {
    const labnoInput = document.getElementById('labnoratoryNumber');
    const saveBtn = document.querySelector('#endorseModal button[onclick="saveEndorsement()"]');
    
    if (isLoading) {
        if (labnoInput) labnoInput.disabled = true;
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Searching...';
        }
    } else {
        if (labnoInput) labnoInput.disabled = false;
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="mdi mdi-content-save me-1"></i>Save Endorsement';
        }
    }
}

function getCurrentLocalDateTime() {
    const now = new Date();
    const pad = num => String(num).padStart(2, '0');
    
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
           `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}



// ENHANCED: Save endorsement function with better error handling and debugging
async function saveEndorsement() {
    console.log('=== SAVE ENDORSEMENT STARTED ===');
    
    // Get form data
    const labno = document.getElementById('labnoratoryNumber').value.trim();
    const fname = document.getElementById('fname').value.trim();
    const lname = document.getElementById('lname').value.trim();
    const facilityCode = document.getElementById('facilityCode').value.trim();
    const facilityName = document.getElementById('facilityName').value.trim();
    const testResult = document.getElementById('testResult').value.trim();
    const remarks = document.getElementById('remarks').value.trim();
    const attachmentFile = document.getElementById('attachment').files[0];
    const endorsed_by = document.getElementById('user-name')?.textContent.trim() || 'System'; // Replace with actual user if available

    // Log all form data for debugging
    console.log('Form Data:', {
        labno,
        fname,
        lname,
        facilityCode,
        facilityName,
        testResult,
        remarks,
        attachmentFile: attachmentFile ? {
            name: attachmentFile.name,
            size: attachmentFile.size,
            type: attachmentFile.type
        } : null,
        endorsed_by
    });

    // Enhanced validation
    const validationErrors = [];
    if (!labno) validationErrors.push('Laboratory Number is required');
    if (!fname) validationErrors.push('First name is required');
    if (!lname) validationErrors.push('Last name is required');
    if (!remarks) validationErrors.push('Remarks are required');
    
    if (validationErrors.length > 0) {
        showAlert(validationErrors.join('<br>'), 'error');
        return;
    }

    // Show loading state
    const saveBtn = document.querySelector('#endorseModal button[onclick="saveEndorsement()"]');
    const originalBtnText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Saving...';

    try {
        // Create FormData object for file upload
        const formData = new FormData();
        formData.append('labno', labno);
        formData.append('fname', fname);
        formData.append('lname', lname);
        formData.append('facility_code', facilityCode);
        formData.append('facility_name', facilityName);
        formData.append('test_result', testResult);
        formData.append('remarks', remarks);
        formData.append('date_endorsed', getCurrentLocalDateTime());
        formData.append('endorsed_by', endorsed_by); // Replace with actual user

        // Add file if selected
        if (attachmentFile) {
            formData.append('endorsementFile', attachmentFile);
            console.log('File attached to FormData');
        }

        // Log FormData contents (for debugging)
        console.log('FormData contents:');
        for (let [key, value] of formData.entries()) {
            if (value instanceof File) {
                console.log(`${key}: File - ${value.name} (${value.size} bytes)`);
            } else {
                console.log(`${key}: ${value}`);
            }
        }

        const apiUrl = `${API_BASE_URL}/endorsement`;
        console.log('Sending POST request to:', apiUrl);

        // Send POST request with detailed error handling
        const response = await fetch(apiUrl, {
            method: 'POST',
            body: formData
        });

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);

        // Get response text first to handle both JSON and non-JSON responses
        const responseText = await response.text();
        console.log('Raw response:', responseText);

        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Failed to parse JSON response:', parseError);
            throw new Error(`Server returned invalid response. Status: ${response.status}. Response: ${responseText.substring(0, 200)}...`);
        }

        console.log('Parsed response:', result);

        if (!response.ok) {
            const errorMessage = result.error || result.message || `HTTP error! status: ${response.status}`;
            console.error('Server error:', errorMessage);
            
            // Show detailed error if available
            if (result.details) {
                console.error('Error details:', result.details);
                throw new Error(`${errorMessage}: ${Array.isArray(result.details) ? result.details.join(', ') : result.details}`);
            }
            
            throw new Error(errorMessage);
        }

        if (!result.success) {
            const errorMessage = result.error || result.message || 'Unknown error occurred';
            console.error('Save failed:', errorMessage);
            
            // Show detailed error if available
            if (result.details) {
                console.error('Error details:', result.details);
                throw new Error(`${errorMessage}: ${Array.isArray(result.details) ? result.details.join(', ') : result.details}`);
            }
            
            throw new Error(errorMessage);
        }

        console.log('=== SAVE SUCCESSFUL ===');
        console.log('Save result:', result);

        // Show success message
        showAlert('Endorsement saved successfully! The endorsement has been sent to the PDO.', 'success');
        
        // Update the table immediately with the new data
        await refreshEndorsementTable();
        
        // Clear form and close modal after showing success
        setTimeout(() => {
            clearForm();
            const modal = bootstrap.Modal.getInstance(document.getElementById('endorseModal'));
            if (modal) {
                modal.hide();
            }
        }, 2000);

    } catch (error) {
        console.error('=== SAVE FAILED ===');
        console.error('Error details:', error);
        console.error('Error stack:', error.stack);
        showAlert(`Error saving endorsement: ${error.message}`, 'error');
    } finally {
        // Reset button state
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalBtnText;
        console.log('=== SAVE ENDORSEMENT ENDED ===');
    }
}

// Enhanced alert function with better styling
function showAlert(message, type = 'info') {
    console.log(`Alert: ${type.toUpperCase()} - ${message}`);
    
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert-temp');
    existingAlerts.forEach(alert => alert.remove());
    
    const alertClass = {
        'success': 'alert-success',
        'error': 'alert-danger',
        'warning': 'alert-warning',
        'info': 'alert-info'
    }[type] || 'alert-info';
    
    const alertIcon = {
        'success': 'mdi-check-circle',
        'error': 'mdi-alert-circle',
        'warning': 'mdi-alert',
        'info': 'mdi-information'
    }[type] || 'mdi-information';
    
    const alertHtml = `
        <div class="alert ${alertClass} alert-dismissible fade show alert-temp" role="alert">
            <i class="mdi ${alertIcon} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    // Insert alert at the top of the modal body
    const modalBody = document.querySelector('#endorseModal .modal-body');
    if (modalBody) {
        modalBody.insertAdjacentHTML('afterbegin', alertHtml);
        
        // Auto-dismiss after 5 seconds for non-error messages
        if (type !== 'error') {
            setTimeout(() => {
                const alert = document.querySelector('.alert-temp');
                if (alert) {
                    alert.classList.remove('show');
                    setTimeout(() => alert.remove(), 150);
                }
            }, 5000);
        }
    } else {
        // Fallback to regular alert if modal not found
        alert(message);
    }
}

// ENHANCED: Function to refresh the endorsement table
async function refreshEndorsementTable() {
    console.log('=== REFRESHING ENDORSEMENT TABLE ===');
    
    try {
        const response = await fetch(`${API_BASE_URL}/endorsement`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Table data fetched:', result);
        
        if (result.success && result.data) {
            updateTableWithData(result.data);
            console.log(`Table refreshed with ${result.data.length} records`);
        } else {
            console.error('Failed to fetch table data:', result);
            throw new Error(result.error || 'Failed to fetch table data');
        }
    } catch (error) {
        console.error('Error refreshing table:', error);
        // Show a non-intrusive notification for table refresh errors
        showTableRefreshError();
    }
}

// Function to show table refresh error (less intrusive)
function showTableRefreshError() {
    const tableContainer = document.getElementById('visitTable')?.closest('.table-responsive');
    if (tableContainer) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-warning alert-dismissible fade show mt-2';
        errorDiv.innerHTML = `
            <i class="mdi mdi-refresh me-2"></i>
            Unable to refresh table data. Please refresh the page.
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        tableContainer.appendChild(errorDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }
}

// Function to update table with new data
function updateTableWithData(data) {
    const tableBody = document.getElementById('visitTable');
    if (!tableBody) {
        console.error('Table body element not found');
        return;
    }
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    if (data.length === 0) {
        // Show empty state
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="9" class="text-center py-4">
                <div class="text-muted">
                    <i class="mdi mdi-folder-open-outline mb-2" style="font-size: 2rem;"></i>
                    <p class="mb-0">No endorsements found</p>
                </div>
            </td>
        `;
        tableBody.appendChild(emptyRow);
        return;
    }
    
    // Add new rows
    data.forEach((record, index) => {
        const row = createTableRow(record, index + 1);
        tableBody.appendChild(row);
    });
    
    console.log(`Table updated with ${data.length} records`);
}

// Function to create a table row
function createTableRow(record, rowNumber) {
    const row = document.createElement('tr');
    row.className = 'table-row';
    
    // Format date
    const dateEndorsed = record.date_endorsed ? 
        new Date(record.date_endorsed).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }) : 'N/A';
    
    // Format test result badge
    const getTestResultBadge = (result) => {
        if (!result) return '<span class="badge bg-secondary">N/A</span>';
        const lowerResult = result.toLowerCase();
        if (lowerResult.includes('positive')) return '<span class="badge bg-success">Positive</span>';
        if (lowerResult.includes('negative')) return '<span class="badge bg-danger">Negative</span>';
        if (lowerResult.includes('pending')) return '<span class="badge bg-warning text-dark">Pending</span>';
        return `<span class="badge bg-info">${result}</span>`;
    };
    
    // Safely get full name
    const fullName = `${record.fname || ''} ${record.lname || ''}`.trim() || 'N/A';
    
    row.innerHTML = `
        <td class="text-center fw-bold">${rowNumber}</td>
        <td><span class="badge bg-light text-dark">${record.labno || 'N/A'}</span></td>
        <td>
            <div>
                <div class="fw-semibold">${fullName}</div>
            </div>
        </td>
        <td class="text-center">
            <span class="badge bg-secondary">${record.facility_code || 'N/A'}</span>
        </td>
        <td>
            <div class="text-truncate" style="max-width: 150px;" title="${record.facility_name || 'N/A'}">
                ${record.facility_name || 'N/A'}
            </div>
        </td>
        <td class="text-center">
            ${getTestResultBadge(record.test_result)}
        </td>
        <td>
            <span class="text-truncate d-inline-block" style="max-width: 200px;" title="${record.remarks || 'N/A'}">
                ${record.remarks || 'N/A'}
            </span>
        </td>
        <td class="text-center">
            <div class="btn-group" role="group">
                ${record.attachment_path ? 
                    `<button class="btn btn-sm btn-outline-primary" onclick="viewAttachment(${record.id})" title="View Attachment">
                    <i class="mdi mdi-eye"></i>
                    </button>
                    ` : 
                    `<button class="btn btn-sm btn-outline-secondary" disabled title="No Attachment">
                        <i class="mdi mdi-file-outline"></i>
                    </button>`
                }
            </div>
        </td>
        <td class="text-center">
            <small class="d-block">${dateEndorsed}</small>
            <small class="text-muted">${record.endorsed_by || 'System'}</small>
        </td>
    `;
    
    return row;
}

// Function to download attachment
function downloadAttachment(endorsementId) {
    console.log('Downloading attachment for endorsement:', endorsementId);
    
    if (!endorsementId) {
        showAlert('Invalid endorsement ID', 'error');
        return;
    }
    
    const downloadUrl = `${API_BASE_URL}/endorsement/download/${endorsementId}`;
    console.log('Download URL:', downloadUrl);
    
    // Create a temporary link and click it
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.target = '_blank';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function viewAttachment(endorsementId) {
    console.log('Viewing attachment for endorsement:', endorsementId);
    
    if (!endorsementId) {
        showAlert('Invalid endorsement ID', 'error');
        return;
    }
    
    const viewUrl = `${API_BASE_URL}/endorsement/view/${endorsementId}`;
    window.open(viewUrl, '_blank');
}


// Function to handle connection errors
function handleConnectionError() {
    console.error('Connection error detected');
    showAlert('Unable to connect to the server. Please check your connection and try again.', 'error');
}

// Initialize table on page load with retry mechanism
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== PAGE LOADED ===');
    console.log('Initializing endorsement table...');
    
    // Add a small delay to ensure all elements are loaded
    setTimeout(() => {
        refreshEndorsementTable();
    }, 500);
});

// Add periodic table refresh (optional - every 30 seconds)
setInterval(() => {
    // Only refresh if not currently in a modal
    const modal = document.querySelector('.modal.show');
    if (!modal) {
        refreshEndorsementTable();
    }
}, 30000); // 30 seconds

// Add event listener for page visibility change to refresh when tab becomes active
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        // Page became visible, refresh table
        setTimeout(() => {
            refreshEndorsementTable();
        }, 1000);
    }
});

// Export functions for testing (if needed)
window.saveEndorsement = saveEndorsement;
window.refreshEndorsementTable = refreshEndorsementTable;
window.downloadAttachment = downloadAttachment;