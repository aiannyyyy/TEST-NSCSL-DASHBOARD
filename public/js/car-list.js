/*
$(document).ready(function() {
    // Configuration - centralized and easy to modify
    const CONFIG = {
        API_BASE_URL: 'http://localhost:3001',
        FACILITY_LOOKUP_DELAY: 800,
        AUTO_REFRESH_MINUTES: 5,
        MIN_FACILITY_CODE_LENGTH: 3,
        MAX_FILE_SIZE: 10 * 1024 * 1024 // 10MB
    };

    // DOM Elements - cached for better performance
    const DOM = {
        documentForm: document.getElementById('documentForm'),
        facilityCodeInput: document.getElementById('facilityCode'),
        facilityNameInput: document.getElementById('facilityName'),
        cityInput: document.getElementById('city'),
        provinceInput: document.getElementById('province'),
        saveButton: document.getElementById('saveButton') || document.querySelector('button[form="documentForm"]'),
        alertContainer: document.getElementById('alertContainer'),
        modal: null
    };

    // Initialize Bootstrap modal
    if (document.getElementById('addDocumentModal')) {
        DOM.modal = new bootstrap.Modal(document.getElementById('addDocumentModal'));
    }

    // Utility Functions
    const Utils = {
        showAlert(message, type = 'info') {
            if (!DOM.alertContainer) {
                console.error('Alert container not found');
                alert(`${type.toUpperCase()}: ${message}`);
                return;
            }
            
            // Clear existing alerts of same type to prevent spam
            const existingAlerts = DOM.alertContainer.querySelectorAll(`.alert-${type}`);
            existingAlerts.forEach(alert => alert.remove());
            
            const alertDiv = document.createElement('div');
            alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
            
            const iconMap = {
                'success': 'check-circle',
                'danger': 'exclamation-triangle',
                'warning': 'exclamation-triangle',
                'info': 'info-circle'
            };
            
            alertDiv.innerHTML = `
                <i class="bi bi-${iconMap[type] || 'info-circle'}"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            
            DOM.alertContainer.appendChild(alertDiv);
            
            // Auto remove after 5 seconds
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, 5000);
        },

        setLoading(isLoading) {
            if (DOM.saveButton) {
                if (isLoading) {
                    document.body.classList.add('loading');
                    DOM.saveButton.disabled = true;
                    DOM.saveButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
                } else {
                    document.body.classList.remove('loading');
                    DOM.saveButton.disabled = false;
                    DOM.saveButton.innerHTML = '<i class="bi bi-check-lg"></i> Save Document';
                }
            }
        },

        clearFacilityDetails() {
            const facilityFields = ['facilityName', 'city', 'province'];
            facilityFields.forEach(fieldId => {
                const element = document.getElementById(fieldId);
                if (element) {
                    element.removeAttribute('readonly');
                    element.value = '';
                    element.setAttribute('readonly', 'readonly');
                }
            });
        },

        updateFacilityField(fieldId, value) {
            const element = document.getElementById(fieldId);
            if (element) {
                element.removeAttribute('readonly');
                element.value = value || '';
                element.setAttribute('readonly', 'readonly');
            }
        },

        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        validateForm(formData) {
            const errors = [];
            
            // Required field validation
            if (!formData.get('caseNo')?.trim()) {
                errors.push('Case Number is required');
            }
            if (!formData.get('endorsedDate')) {
                errors.push('Date Endorsed is required');
            }
            if (!formData.get('facilityCode')?.trim()) {
                errors.push('Facility Code is required');
            }
            
            // File size validation
            const attachment = formData.get('attachment');
            if (attachment && attachment.size > CONFIG.MAX_FILE_SIZE) {
                errors.push(`File size must be less than ${CONFIG.MAX_FILE_SIZE / (1024*1024)}MB`);
            }
            
            return errors;
        }
    };

    // Facility Management
    const FacilityManager = {
        async fetchFacilityDetails(facilityCode) {
            if (!facilityCode || facilityCode.trim() === '') {
                Utils.clearFacilityDetails();
                return;
            }
            
            // Show loading state
            const facilityFields = ['facilityName', 'city', 'province'];
            facilityFields.forEach(fieldId => {
                const element = document.getElementById(fieldId);
                if (element) {
                    element.removeAttribute('readonly');
                    element.value = 'Loading...';
                    element.setAttribute('readonly', 'readonly');
                }
            });
            
            try {
                console.log('Fetching facility details for:', facilityCode);
                const response = await fetch(`${CONFIG.API_BASE_URL}/api/getFacilityDetails?facilitycode=${encodeURIComponent(facilityCode.trim())}`);
                
                const data = await response.json();
                console.log('Facility details response:', data);
                
                if (!response.ok) {
                    throw new Error(data.message || `HTTP error! status: ${response.status}`);
                }
                
                if (data.success && data.data && data.data.length > 0) {
                    const facility = data.data[0];
                    
                    // Handle both array and object formats
                    let facilityName, city, county;
                    
                    if (Array.isArray(facility)) {
                        [, facilityName, city, county] = facility;
                    } else {
                        facilityName = facility.DESCR1;
                        city = facility.CITY;
                        county = facility.COUNTY;
                    }

                    // Update fields
                    Utils.updateFacilityField('facilityName', facilityName);
                    Utils.updateFacilityField('city', city);
                    Utils.updateFacilityField('province', county);
                    
                } else {
                    Utils.clearFacilityDetails();
                    Utils.showAlert('Facility code not found in database', 'warning');
                }
            } catch (error) {
                console.error('Error fetching facility details:', error);
                Utils.clearFacilityDetails();
                Utils.showAlert(`Error loading facility details: ${error.message}`, 'danger');
            }
        }
    };

    // Create debounced facility lookup
    const debouncedFacilityLookup = Utils.debounce(
        FacilityManager.fetchFacilityDetails, 
        CONFIG.FACILITY_LOOKUP_DELAY
    );

    // Event Listeners
    const EventManager = {
        init() {
            this.setupFacilityCodeHandlers();
            this.setupFormSubmission();
            this.setupModalHandlers();
        },

        setupFacilityCodeHandlers() {
            if (!DOM.facilityCodeInput) return;

            // Input event for real-time lookup
            DOM.facilityCodeInput.addEventListener('input', (e) => {
                const facilityCode = e.target.value.trim();
                if (facilityCode.length >= CONFIG.MIN_FACILITY_CODE_LENGTH) {
                    debouncedFacilityLookup(facilityCode);
                } else {
                    Utils.clearFacilityDetails();
                }
            });

            // Blur event for final validation
            DOM.facilityCodeInput.addEventListener('blur', (e) => {
                const facilityCode = e.target.value.trim();
                if (facilityCode) {
                    FacilityManager.fetchFacilityDetails(facilityCode);
                }
            });

            // Enter key handling
            DOM.facilityCodeInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.keyCode === 13) {
                    e.preventDefault();
                    const facilityCode = e.target.value.trim();
                    if (facilityCode) {
                        FacilityManager.fetchFacilityDetails(facilityCode);
                    } else {
                        Utils.clearFacilityDetails();
                    }
                }
            });
        },

        setupFormSubmission() {
            if (!DOM.documentForm) return;

            DOM.documentForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                try {
                    Utils.setLoading(true);
                    console.log('Starting form submission...');

                    // Create FormData from form
                    const formData = new FormData(DOM.documentForm);
                    
                    // Validate form data
                    const validationErrors = Utils.validateForm(formData);
                    if (validationErrors.length > 0) {
                        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
                    }

                    // Log form data for debugging
                    console.log('Form data being submitted:');
                    for (const [key, value] of formData.entries()) {
                        if (key !== 'attachment') {
                            console.log(`  ${key}: ${value}`);
                        } else if (value && value.size > 0) {
                            console.log(`  ${key}: ${value.name} (${(value.size/1024).toFixed(2)} KB)`);
                        }
                    }

                    // Create backend-compatible FormData
                    const backendFormData = new FormData();
                    
                    // Field mapping to match backend expectations
                    const fieldMapping = {
                        'caseNo': 'case_no',
                        'endorsedDate': 'date_endorsed', 
                        'endorsedBy': 'endorsed_by',
                        'facilityCode': 'facility_code',
                        'facilityName': 'facility_name',
                        'city': 'city',
                        'province': 'province',
                        'labNo': 'labno',
                        'repeat': 'repeat_field',
                        'status': 'status',
                        'numSamples': 'number_sample',
                        'caseCode': 'case_code',
                        'subCode1': 'sub_code1',
                        'subCode2': 'sub_code2',
                        'subCode3': 'sub_code3',
                        'subCode4': 'sub_code4',
                        'remarks': 'remarks',
                        'frc': 'frc',
                        'wrc': 'wrc',
                        'preparedBy': 'prepared_by',
                        'followupOn': 'followup_on',
                        'reviewedOn': 'reviewed_on',
                        'closedOn': 'closed_on',
                        'attachment': 'attachment'
                    };

                    // Map form data to backend format
                    for (const [key, value] of formData.entries()) {
                        const backendKey = fieldMapping[key] || key;
                        
                        if (key === 'attachment') {
                            if (value && value.size > 0) {
                                backendFormData.append('attachment', value);
                            }
                        } else {
                            const cleanValue = (value === '' || value === null) ? '' : value;
                            backendFormData.append(backendKey, cleanValue);
                        }
                    }

                    // Submit to backend
                    const response = await fetch(`${CONFIG.API_BASE_URL}/api/add-car`, {
                        method: 'POST',
                        body: backendFormData
                    });

                    const result = await response.json();

                    if (!response.ok) {
                        throw new Error(result.message || result.error || `Server error: ${response.status}`);
                    }

                    console.log('Success:', result);
                    
                    Utils.showAlert(
                        `Document saved successfully! Record ID: ${result.id}`, 
                        'success'
                    );
                    
                    // Reset form and close modal
                    DOM.documentForm.reset();
                    Utils.clearFacilityDetails();
                    if (DOM.modal) DOM.modal.hide();
                    
                    // Refresh table if available
                    if (typeof loadCarList === 'function') {
                        setTimeout(loadCarList, 1000);
                    }
                    
                } catch (error) {
                    console.error('Form submission error:', error);
                    Utils.showAlert(`Error saving document: ${error.message}`, 'danger');
                } finally {
                    Utils.setLoading(false);
                }
            });
        },

        setupModalHandlers() {
            // Modal reset on close
            $("#addDocumentModal").on("hidden.bs.modal", () => {
                if (DOM.documentForm) {
                    DOM.documentForm.reset();
                    $("#documentForm select").prop("selectedIndex", 0);
                }
                
                Utils.clearFacilityDetails();
                
                if (DOM.alertContainer) {
                    DOM.alertContainer.innerHTML = '';
                }
                
                Utils.setLoading(false);
            });

            // Clear button functionality for select elements
            $(document).on("click", ".clear-select", function () {
                $(this).siblings("select").val("").prop("selectedIndex", 0).trigger('change');
            });
        }
    };

    // Table Management
    const TableManager = {
        formatDate(dateString) {
            if (!dateString) return '-';
            try {
                const date = new Date(dateString);
                return date.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: '2-digit', 
                    day: '2-digit' 
                });
            } catch (error) {
                return '-';
            }
        },

        getStatusBadge(status) {
            if (!status) return '<span class="badge bg-secondary">Unknown</span>';
            
            const statusLower = status.toLowerCase();
            const badges = {
                'open': '<span class="badge bg-success"><i class="bi bi-unlock"></i> Open</span>',
                'closed': '<span class="badge bg-secondary"><i class="bi bi-lock"></i> Closed</span>',
                'pending': '<span class="badge bg-warning text-dark"><i class="bi bi-clock"></i> Pending</span>',
                'review': '<span class="badge bg-info"><i class="bi bi-eye"></i> Review</span>'
            };
            
            return badges[statusLower] || `<span class="badge bg-primary">${status}</span>`;
        },

        getYesNoBadge(value) {
            if (value === 'Yes' || value === 'yes' || value === 1 || value === '1') {
                return '<span class="badge bg-success"><i class="bi bi-check"></i> Yes</span>';
            } else if (value === 'No' || value === 'no' || value === 0 || value === '0') {
                return '<span class="badge bg-danger"><i class="bi bi-x"></i> No</span>';
            } else {
                return '<span class="badge bg-secondary">-</span>';
            }
        },

        truncateText(text, maxLength = 30) {
            if (!text) return '-';
            const cleanText = String(text).trim();
            return cleanText.length > maxLength ? cleanText.substring(0, maxLength) + '...' : cleanText;
        },

        getStatusButtonClass(status) {
            if (!status) return 'btn-secondary';
            
            const statusLower = status.toLowerCase();
            const classes = {
                'open': 'btn-success',
                'closed': 'btn-secondary', 
                'pending': 'btn-warning'
            };
            
            return classes[statusLower] || 'btn-primary';
        },

        getStatusIcon(status) {
            if (!status) return '<i class="bi bi-question-circle"></i>';
            
            const statusLower = status.toLowerCase();
            const icons = {
                'open': '<i class="bi bi-unlock"></i>',
                'closed': '<i class="bi bi-lock"></i>',
                'pending': '<i class="bi bi-clock"></i>'
            };
            
            return icons[statusLower] || '<i class="bi bi-circle"></i>';
        }
    };

    // API Manager
    const APIManager = {
        async testConnection() {
            try {
                const response = await fetch(`${CONFIG.API_BASE_URL}/api/test-db`);
                const data = await response.json();
                console.log('Database connection test:', data);
                return data;
            } catch (error) {
                console.error('Connection test failed:', error);
                Utils.showAlert('Database connection test failed', 'warning');
                throw error;
            }
        },

        async loadCarList() {
            const loadingElement = document.getElementById('loadingMessage');
            const errorElement = document.getElementById('errorMessage');
            const tableContainer = document.getElementById('tableContainer');
            const emptyState = document.getElementById('emptyState');
            const tableBody = document.getElementById('carTableBody');

            // Show loading state
            if (loadingElement) loadingElement.classList.remove('d-none');
            if (errorElement) errorElement.classList.add('d-none');
            if (tableContainer) tableContainer.classList.add('d-none');
            if (emptyState) emptyState.classList.add('d-none');

            try {
                console.log('Loading car list...');
                const response = await fetch(`${CONFIG.API_BASE_URL}/api/car-list`);
                
                const result = await response.json();
                
                if (!response.ok) {
                    throw new Error(result.message || `HTTP error! status: ${response.status}`);
                }
                
                const carList = result.data || result; // Handle both response formats
                console.log(`Loaded ${carList.length} records`);
                
                if (loadingElement) loadingElement.classList.add('d-none');
                
                if (!carList || carList.length === 0) {
                    if (emptyState) emptyState.classList.remove('d-none');
                    return;
                }

                // Populate table
                if (tableBody) {
                    tableBody.innerHTML = '';
                    
                    carList.forEach((car, index) => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <th scope="row">${index + 1}</th>
                            <td class="case-no-col"><strong>${car.case_no || '-'}</strong></td>
                            <td>
                                ${TableManager.formatDate(car.date_endorsed)}
                                ${car.endorsed_by ? `<br><small class="text-muted"><i class="bi bi-person"></i> ${car.endorsed_by}</small>` : ''}
                            </td>
                            <td>
                                <span class="expandable-text" title="${car.facility_name || ''}" data-bs-toggle="tooltip">
                                    <strong>${car.facility_code || '-'}</strong>
                                    ${car.facility_name ? `<br><small class="text-muted">${TableManager.truncateText(car.facility_name, 25)}</small>` : ''}
                                </span>
                            </td>
                            <td>
                                <i class="bi bi-geo-alt"></i> ${car.city || '-'}${car.province ? `, ${car.province}` : ''}
                            </td>
                            <td><code>${car.labno || '-'}</code></td>
                            <td>${TableManager.getYesNoBadge(car.repeat_field)}</td>
                            <td>
                                <button class="btn btn-sm status-btn ${TableManager.getStatusButtonClass(car.status)}" 
                                        onclick="showStatusModal(${car.id}, '${car.status}', '${car.case_no}')" 
                                        title="Click to change status">
                                    ${TableManager.getStatusIcon(car.status)} ${car.status || 'Unknown'}
                                </button>
                            </td>
                            
                            <td><span class="badge bg-light text-dark">${car.number_sample || '-'}</span></td>
                            <td><code>${car.case_code || '-'}</code></td>
                            <td><code>${car.sub_code1 || '-'}</code></td>
                            <td><code>${car.sub_code2 || '-'}</code></td>
                            <td><code>${car.sub_code3 || '-'}</code></td>
                            <td><code>${car.sub_code4 || '-'}</code></td>
                            <td>
                                <span class="expandable-text" title="${car.remarks || 'No remarks'}" data-bs-toggle="tooltip">
                                    ${TableManager.truncateText(car.remarks, 25)}
                                </span>
                            </td>
                            <td>${TableManager.getYesNoBadge(car.frc)}</td>
                            <td>${TableManager.getYesNoBadge(car.wrc)}</td>
                            <td><i class="bi bi-person-check"></i> ${car.prepared_by || '-'}</td>
                            <td>${TableManager.formatDate(car.followup_on)}</td>
                            <td>${TableManager.formatDate(car.reviewed_on)}</td>
                            <td>${TableManager.formatDate(car.closed_on)}</td>
                            <td class="sticky-col">
                                ${car.attachment_path ? `
                                <button class="btn btn-success btn-sm" onclick="window.DocumentManager.viewAttachment('${car.attachment_path}')" title="View Attachment: ${car.attachment_path.split('/').pop()}">
                                    <i class="bi bi-paperclip"></i> View
                                </button>
                                ` : '<span class="text-muted">No attachment</span>'}
                            </td>
                        `;
                        tableBody.appendChild(row);
                    });
                }
                
                // Show table
                if (tableContainer) tableContainer.classList.remove('d-none');
                
                // Initialize tooltips
                const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
                tooltipTriggerList.map(function (tooltipTriggerEl) {
                    return new bootstrap.Tooltip(tooltipTriggerEl);
                });
                
            } catch (error) {
                console.error('Error loading car list:', error);
                if (loadingElement) loadingElement.classList.add('d-none');
                if (errorElement) errorElement.classList.remove('d-none');
                
                Utils.showAlert(`Error loading records: ${error.message}`, 'danger');
            }
        }
    };

    // Initialize everything
    EventManager.init();
    
    // Add select clear buttons
    $("#documentForm select").each(function () {
        const $select = $(this);
        if (!$select.parent().hasClass('input-group')) {
            $select.wrap('<div class="input-group"></div>');
            $select.after('<button class="btn btn-outline-secondary clear-select" type="button" title="Clear selection"><i class="bi bi-x"></i></button>');
        }
    });

    console.log('Car Management System initialized');
    
    // Test database connection on startup
    APIManager.testConnection();

    // Expose global utilities
    window.DocumentManager = {
        API_BASE_URL: CONFIG.API_BASE_URL,
        showAlert: Utils.showAlert,
        clearForm() {
            if (DOM.documentForm) {
                DOM.documentForm.reset();
                $("#documentForm select").prop("selectedIndex", 0);
            }
            Utils.clearFacilityDetails();
        },
        testConnection: APIManager.testConnection,
        refreshTable: APIManager.loadCarList,
        viewAttachment(attachmentPath) {
            console.log('View attachment:', attachmentPath);
            const fullPath = attachmentPath.startsWith('/') ? `${CONFIG.API_BASE_URL}${attachmentPath}` : attachmentPath;
            window.open(fullPath, '_blank');
        }
    };

    // Make table functions globally available
    window.loadCarList = APIManager.loadCarList;
    window.refreshData = APIManager.loadCarList;
    window.viewAttachment = window.DocumentManager.viewAttachment;

    // Auto-load table data
    setTimeout(() => {
        APIManager.loadCarList();
    }, 500);
});

// Add these global functions
let currentStatusRecordId = null;
let statusModal = null;

// Initialize status modal
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('statusModal')) {
        statusModal = new bootstrap.Modal(document.getElementById('statusModal'));
    }
});

function showStatusModal(recordId, currentStatus, caseNo) {
    console.log('Showing status modal for record:', recordId, currentStatus, caseNo);
    currentStatusRecordId = recordId;
    document.getElementById('statusCaseNo').textContent = caseNo || 'Unknown';
    
    if (statusModal) {
        statusModal.show();
    }
}

function updateStatus(newStatus) {
    if (!currentStatusRecordId) {
        Utils.showAlert('No record selected', 'error');
        return;
    }

    console.log('Updating status to:', newStatus, 'for record:', currentStatusRecordId);

    // Show loading state
    Utils.setLoading(true);

    // Make API call to update status
    fetch(`${CONFIG.API_BASE_URL}/api/update-status`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            id: currentStatusRecordId,
            status: newStatus
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            Utils.showAlert(`Status updated to ${newStatus}`, 'success');
            statusModal.hide();
            // Refresh the table
            setTimeout(() => APIManager.loadCarList(), 500);
        } else {
            throw new Error(data.message || 'Failed to update status');
        }
    })
    .catch(error => {
        console.error('Error updating status:', error);
        Utils.showAlert(`Error updating status: ${error.message}`, 'danger');
    })
    .finally(() => {
        Utils.setLoading(false);
        currentStatusRecordId = null;
    });
}
*/
$(document).ready(function() {
    // Configuration - centralized and easy to modify
    const CONFIG = {
        API_BASE_URL: 'http://localhost:3001',
        FACILITY_LOOKUP_DELAY: 800,
        AUTO_REFRESH_MINUTES: 5,
        MIN_FACILITY_CODE_LENGTH: 3,
        MAX_FILE_SIZE: 10 * 1024 * 1024 // 10MB
    };

    // DOM Elements - cached for better performance
    const DOM = {
        documentForm: document.getElementById('documentForm'),
        facilityCodeInput: document.getElementById('facilityCode'),
        facilityNameInput: document.getElementById('facilityName'),
        cityInput: document.getElementById('city'),
        provinceInput: document.getElementById('province'),
        saveButton: document.getElementById('saveButton') || document.querySelector('button[form="documentForm"]'),
        alertContainer: document.getElementById('alertContainer'),
        modal: null
    };

    // Initialize Bootstrap modal
    if (document.getElementById('addDocumentModal')) {
        DOM.modal = new bootstrap.Modal(document.getElementById('addDocumentModal'));
    }

    // Utility Functions - Move to global scope
    const Utils = {
        showAlert(message, type = 'info') {
            if (!DOM.alertContainer) {
                console.error('Alert container not found');
                alert(`${type.toUpperCase()}: ${message}`);
                return;
            }
            
            // Clear existing alerts of same type to prevent spam
            const existingAlerts = DOM.alertContainer.querySelectorAll(`.alert-${type}`);
            existingAlerts.forEach(alert => alert.remove());
            
            const alertDiv = document.createElement('div');
            alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
            
            const iconMap = {
                'success': 'check-circle',
                'danger': 'exclamation-triangle',
                'warning': 'exclamation-triangle',
                'info': 'info-circle'
            };
            
            alertDiv.innerHTML = `
                <i class="bi bi-${iconMap[type] || 'info-circle'}"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            
            DOM.alertContainer.appendChild(alertDiv);
            
            // Auto remove after 5 seconds
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, 5000);
        },

        setLoading(isLoading) {
            if (DOM.saveButton) {
                if (isLoading) {
                    document.body.classList.add('loading');
                    DOM.saveButton.disabled = true;
                    DOM.saveButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
                } else {
                    document.body.classList.remove('loading');
                    DOM.saveButton.disabled = false;
                    DOM.saveButton.innerHTML = '<i class="bi bi-check-lg"></i> Save Document';
                }
            }
        },

        clearFacilityDetails() {
            const facilityFields = ['facilityName', 'city', 'province'];
            facilityFields.forEach(fieldId => {
                const element = document.getElementById(fieldId);
                if (element) {
                    element.removeAttribute('readonly');
                    element.value = '';
                    element.setAttribute('readonly', 'readonly');
                }
            });
        },

        updateFacilityField(fieldId, value) {
            const element = document.getElementById(fieldId);
            if (element) {
                element.removeAttribute('readonly');
                element.value = value || '';
                element.setAttribute('readonly', 'readonly');
            }
        },

        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        validateForm(formData) {
            const errors = [];
            
            // Required field validation
            if (!formData.get('caseNo')?.trim()) {
                errors.push('Case Number is required');
            }
            if (!formData.get('endorsedDate')) {
                errors.push('Date Endorsed is required');
            }
            if (!formData.get('facilityCode')?.trim()) {
                errors.push('Facility Code is required');
            }
            
            // File size validation
            const attachment = formData.get('attachment');
            if (attachment && attachment.size > CONFIG.MAX_FILE_SIZE) {
                errors.push(`File size must be less than ${CONFIG.MAX_FILE_SIZE / (1024*1024)}MB`);
            }
            
            return errors;
        }
    };

    // Facility Management
    const FacilityManager = {
        async fetchFacilityDetails(facilityCode) {
            if (!facilityCode || facilityCode.trim() === '') {
                Utils.clearFacilityDetails();
                return;
            }
            
            // Show loading state
            const facilityFields = ['facilityName', 'city', 'province'];
            facilityFields.forEach(fieldId => {
                const element = document.getElementById(fieldId);
                if (element) {
                    element.removeAttribute('readonly');
                    element.value = 'Loading...';
                    element.setAttribute('readonly', 'readonly');
                }
            });
            
            try {
                console.log('Fetching facility details for:', facilityCode);
                const response = await fetch(`${CONFIG.API_BASE_URL}/api/getFacilityDetails?facilitycode=${encodeURIComponent(facilityCode.trim())}`);
                
                const data = await response.json();
                console.log('Facility details response:', data);
                
                if (!response.ok) {
                    throw new Error(data.message || `HTTP error! status: ${response.status}`);
                }
                
                if (data.success && data.data && data.data.length > 0) {
                    const facility = data.data[0];
                    
                    // Handle both array and object formats
                    let facilityName, city, county;
                    
                    if (Array.isArray(facility)) {
                        [, facilityName, city, county] = facility;
                    } else {
                        facilityName = facility.DESCR1;
                        city = facility.CITY;
                        county = facility.COUNTY;
                    }

                    // Update fields
                    Utils.updateFacilityField('facilityName', facilityName);
                    Utils.updateFacilityField('city', city);
                    Utils.updateFacilityField('province', county);
                    
                } else {
                    Utils.clearFacilityDetails();
                    Utils.showAlert('Facility code not found in database', 'warning');
                }
            } catch (error) {
                console.error('Error fetching facility details:', error);
                Utils.clearFacilityDetails();
                Utils.showAlert(`Error loading facility details: ${error.message}`, 'danger');
            }
        }
    };

    // Create debounced facility lookup
    const debouncedFacilityLookup = Utils.debounce(
        FacilityManager.fetchFacilityDetails, 
        CONFIG.FACILITY_LOOKUP_DELAY
    );

    // Event Listeners
    const EventManager = {
        init() {
            this.setupFacilityCodeHandlers();
            this.setupFormSubmission();
            this.setupModalHandlers();
        },

        setupFacilityCodeHandlers() {
            if (!DOM.facilityCodeInput) return;

            // Input event for real-time lookup
            DOM.facilityCodeInput.addEventListener('input', (e) => {
                const facilityCode = e.target.value.trim();
                if (facilityCode.length >= CONFIG.MIN_FACILITY_CODE_LENGTH) {
                    debouncedFacilityLookup(facilityCode);
                } else {
                    Utils.clearFacilityDetails();
                }
            });

            // Blur event for final validation
            DOM.facilityCodeInput.addEventListener('blur', (e) => {
                const facilityCode = e.target.value.trim();
                if (facilityCode) {
                    FacilityManager.fetchFacilityDetails(facilityCode);
                }
            });

            // Enter key handling
            DOM.facilityCodeInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.keyCode === 13) {
                    e.preventDefault();
                    const facilityCode = e.target.value.trim();
                    if (facilityCode) {
                        FacilityManager.fetchFacilityDetails(facilityCode);
                    } else {
                        Utils.clearFacilityDetails();
                    }
                }
            });
        },

        setupFormSubmission() {
            if (!DOM.documentForm) return;

            DOM.documentForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                try {
                    Utils.setLoading(true);
                    console.log('Starting form submission...');

                    // Create FormData from form
                    const formData = new FormData(DOM.documentForm);
                    
                    // Validate form data
                    const validationErrors = Utils.validateForm(formData);
                    if (validationErrors.length > 0) {
                        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
                    }

                    // Log form data for debugging
                    console.log('Form data being submitted:');
                    for (const [key, value] of formData.entries()) {
                        if (key !== 'attachment') {
                            console.log(`  ${key}: ${value}`);
                        } else if (value && value.size > 0) {
                            console.log(`  ${key}: ${value.name} (${(value.size/1024).toFixed(2)} KB)`);
                        }
                    }

                    // Create backend-compatible FormData
                    const backendFormData = new FormData();
                    
                    // Field mapping to match backend expectations
                    const fieldMapping = {
                        'caseNo': 'case_no',
                        'endorsedDate': 'date_endorsed', 
                        'endorsedBy': 'endorsed_by',
                        'facilityCode': 'facility_code',
                        'facilityName': 'facility_name',
                        'city': 'city',
                        'province': 'province',
                        'labNo': 'labno',
                        'repeat': 'repeat_field',
                        'status': 'status',
                        'numSamples': 'number_sample',
                        'caseCode': 'case_code',
                        'subCode1': 'sub_code1',
                        'subCode2': 'sub_code2',
                        'subCode3': 'sub_code3',
                        'subCode4': 'sub_code4',
                        'remarks': 'remarks',
                        'frc': 'frc',
                        'wrc': 'wrc',
                        'preparedBy': 'prepared_by',
                        'followupOn': 'followup_on',
                        'reviewedOn': 'reviewed_on',
                        'closedOn': 'closed_on',
                        'attachment': 'attachment'
                    };

                    // Map form data to backend format
                    for (const [key, value] of formData.entries()) {
                        const backendKey = fieldMapping[key] || key;
                        
                        if (key === 'attachment') {
                            if (value && value.size > 0) {
                                backendFormData.append('attachment', value);
                            }
                        } else {
                            const cleanValue = (value === '' || value === null) ? '' : value;
                            backendFormData.append(backendKey, cleanValue);
                        }
                    }

                    // Submit to backend
                    const response = await fetch(`${CONFIG.API_BASE_URL}/api/add-car`, {
                        method: 'POST',
                        body: backendFormData
                    });

                    const result = await response.json();

                    if (!response.ok) {
                        throw new Error(result.message || result.error || `Server error: ${response.status}`);
                    }

                    console.log('Success:', result);
                    
                    Utils.showAlert(
                        `Document saved successfully! Record ID: ${result.id}`, 
                        'success'
                    );
                    
                    // Reset form and close modal
                    DOM.documentForm.reset();
                    Utils.clearFacilityDetails();
                    if (DOM.modal) DOM.modal.hide();
                    
                    // Refresh table if available
                    if (typeof loadCarList === 'function') {
                        setTimeout(loadCarList, 1000);
                    }
                    
                } catch (error) {
                    console.error('Form submission error:', error);
                    Utils.showAlert(`Error saving document: ${error.message}`, 'danger');
                } finally {
                    Utils.setLoading(false);
                }
            });
        },

        setupModalHandlers() {
            // Modal reset on close
            $("#addDocumentModal").on("hidden.bs.modal", () => {
                if (DOM.documentForm) {
                    DOM.documentForm.reset();
                    $("#documentForm select").prop("selectedIndex", 0);
                }
                
                Utils.clearFacilityDetails();
                
                if (DOM.alertContainer) {
                    DOM.alertContainer.innerHTML = '';
                }
                
                Utils.setLoading(false);
            });

            // Clear button functionality for select elements
            $(document).on("click", ".clear-select", function () {
                $(this).siblings("select").val("").prop("selectedIndex", 0).trigger('change');
            });
        }
    };

    // Table Management
    const TableManager = {
        formatDate(dateString) {
            if (!dateString) return '-';
            try {
                const date = new Date(dateString);
                return date.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: '2-digit', 
                    day: '2-digit' 
                });
            } catch (error) {
                return '-';
            }
        },

        getStatusBadge(status) {
            if (!status) return '<span class="badge bg-secondary">Unknown</span>';
            
            const statusLower = status.toLowerCase();
            const badges = {
                'open': '<span class="badge bg-success"><i class="bi bi-unlock"></i> Open</span>',
                'closed': '<span class="badge bg-secondary"><i class="bi bi-lock"></i> Closed</span>',
                'pending': '<span class="badge bg-warning text-dark"><i class="bi bi-clock"></i> Pending</span>',
                'review': '<span class="badge bg-info"><i class="bi bi-eye"></i> Review</span>'
            };
            
            return badges[statusLower] || `<span class="badge bg-primary">${status}</span>`;
        },

        getYesNoBadge(value) {
            if (value === 'Yes' || value === 'yes' || value === 1 || value === '1') {
                return '<span class="badge bg-success"><i class="bi bi-check"></i> Yes</span>';
            } else if (value === 'No' || value === 'no' || value === 0 || value === '0') {
                return '<span class="badge bg-danger"><i class="bi bi-x"></i> No</span>';
            } else {
                return '<span class="badge bg-secondary">-</span>';
            }
        },

        truncateText(text, maxLength = 30) {
            if (!text) return '-';
            const cleanText = String(text).trim();
            return cleanText.length > maxLength ? cleanText.substring(0, maxLength) + '...' : cleanText;
        },

        getStatusButtonClass(status) {
            if (!status) return 'btn-secondary';
            
            const statusLower = status.toLowerCase();
            const classes = {
                'open': 'btn-success',
                'closed': 'btn-secondary', 
                'pending': 'btn-warning'
            };
            
            return classes[statusLower] || 'btn-primary';
        },

        getStatusIcon(status) {
            if (!status) return '<i class="bi bi-question-circle"></i>';
            
            const statusLower = status.toLowerCase();
            const icons = {
                'open': '<i class="bi bi-unlock"></i>',
                'closed': '<i class="bi bi-lock"></i>',
                'pending': '<i class="bi bi-clock"></i>'
            };
            
            return icons[statusLower] || '<i class="bi bi-circle"></i>';
        }
    };

    // API Manager
    const APIManager = {
        async testConnection() {
            try {
                const response = await fetch(`${CONFIG.API_BASE_URL}/api/test-db`);
                const data = await response.json();
                console.log('Database connection test:', data);
                return data;
            } catch (error) {
                console.error('Connection test failed:', error);
                Utils.showAlert('Database connection test failed', 'warning');
                throw error;
            }
        },

        async loadCarList() {
            const loadingElement = document.getElementById('loadingMessage');
            const errorElement = document.getElementById('errorMessage');
            const tableContainer = document.getElementById('tableContainer');
            const emptyState = document.getElementById('emptyState');
            const tableBody = document.getElementById('carTableBody');

            // Show loading state
            if (loadingElement) loadingElement.classList.remove('d-none');
            if (errorElement) errorElement.classList.add('d-none');
            if (tableContainer) tableContainer.classList.add('d-none');
            if (emptyState) emptyState.classList.add('d-none');

            try {
                console.log('Loading car list...');
                const response = await fetch(`${CONFIG.API_BASE_URL}/api/car-list`);
                
                const result = await response.json();
                
                if (!response.ok) {
                    throw new Error(result.message || `HTTP error! status: ${response.status}`);
                }
                
                const carList = result.data || result; // Handle both response formats
                console.log(`Loaded ${carList.length} records`);
                
                if (loadingElement) loadingElement.classList.add('d-none');
                
                if (!carList || carList.length === 0) {
                    if (emptyState) emptyState.classList.remove('d-none');
                    return;
                }

                // Populate table
                if (tableBody) {
                    tableBody.innerHTML = '';
                    
                    carList.forEach((car, index) => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <th scope="row">${index + 1}</th>
                            <td class="case-no-col"><strong>${car.case_no || '-'}</strong></td>
                            <td>
                                ${TableManager.formatDate(car.date_endorsed)}
                                ${car.endorsed_by ? `<br><small class="text-muted"><i class="bi bi-person"></i> ${car.endorsed_by}</small>` : ''}
                            </td>
                            <td>
                                <span class="expandable-text" title="${car.facility_name || ''}" data-bs-toggle="tooltip">
                                    <strong>${car.facility_code || '-'}</strong>
                                    ${car.facility_name ? `<br><small class="text-muted">${TableManager.truncateText(car.facility_name, 25)}</small>` : ''}
                                </span>
                            </td>
                            <td>
                                <i class="bi bi-geo-alt"></i> ${car.city || '-'}${car.province ? `, ${car.province}` : ''}
                            </td>
                            <td><code>${car.labno || '-'}</code></td>
                            <td>${TableManager.getYesNoBadge(car.repeat_field)}</td>
                            <td>
                                <button class="btn btn-sm status-btn ${TableManager.getStatusButtonClass(car.status)}" 
                                        onclick="showStatusModal(${car.id}, '${car.status}', '${car.case_no}')" 
                                        title="Click to change status">
                                    ${TableManager.getStatusIcon(car.status)} ${car.status || 'Unknown'}
                                </button>
                            </td>
                            
                            <td><span class="badge bg-light text-dark">${car.number_sample || '-'}</span></td>
                            <td><code>${car.case_code || '-'}</code></td>
                            <td><code>${car.sub_code1 || '-'}</code></td>
                            <td><code>${car.sub_code2 || '-'}</code></td>
                            <td><code>${car.sub_code3 || '-'}</code></td>
                            <td><code>${car.sub_code4 || '-'}</code></td>
                            <td>
                                <span class="expandable-text" title="${car.remarks || 'No remarks'}" data-bs-toggle="tooltip">
                                    ${TableManager.truncateText(car.remarks, 25)}
                                </span>
                            </td>
                            <td>${TableManager.getYesNoBadge(car.frc)}</td>
                            <td>${TableManager.getYesNoBadge(car.wrc)}</td>
                            <td><i class="bi bi-person-check"></i> ${car.prepared_by || '-'}</td>
                            <td>${TableManager.formatDate(car.followup_on)}</td>
                            <td>${TableManager.formatDate(car.reviewed_on)}</td>
                            <td>${TableManager.formatDate(car.closed_on)}</td>
                            <td class="sticky-col">
                                ${car.attachment_path ? `
                                <button class="btn btn-success btn-sm" onclick="window.DocumentManager.viewAttachment('${car.attachment_path}')" title="View Attachment: ${car.attachment_path.split('/').pop()}">
                                    <i class="bi bi-paperclip"></i> View
                                </button>
                                ` : '<span class="text-muted">No attachment</span>'}
                            </td>
                        `;
                        tableBody.appendChild(row);
                    });
                }
                
                // Show table
                if (tableContainer) tableContainer.classList.remove('d-none');
                
                // Initialize tooltips
                const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
                tooltipTriggerList.map(function (tooltipTriggerEl) {
                    return new bootstrap.Tooltip(tooltipTriggerEl);
                });
                
            } catch (error) {
                console.error('Error loading car list:', error);
                if (loadingElement) loadingElement.classList.add('d-none');
                if (errorElement) errorElement.classList.remove('d-none');
                
                Utils.showAlert(`Error loading records: ${error.message}`, 'danger');
            }
        }
    };

    // Initialize everything
    EventManager.init();
    
    // Add select clear buttons
    $("#documentForm select").each(function () {
        const $select = $(this);
        if (!$select.parent().hasClass('input-group')) {
            $select.wrap('<div class="input-group"></div>');
            $select.after('<button class="btn btn-outline-secondary clear-select" type="button" title="Clear selection"><i class="bi bi-x"></i></button>');
        }
    });

    console.log('Car Management System initialized');
    
    // Test database connection on startup
    APIManager.testConnection();

    // Expose global utilities - THIS IS THE FIX
    window.Utils = Utils; // Make Utils globally available
    window.CONFIG = CONFIG; // Make CONFIG globally available  
    window.APIManager = APIManager; // Make APIManager globally available
    
    window.DocumentManager = {
        API_BASE_URL: CONFIG.API_BASE_URL,
        showAlert: Utils.showAlert,
        clearForm() {
            if (DOM.documentForm) {
                DOM.documentForm.reset();
                $("#documentForm select").prop("selectedIndex", 0);
            }
            Utils.clearFacilityDetails();
        },
        testConnection: APIManager.testConnection,
        refreshTable: APIManager.loadCarList,
        viewAttachment(attachmentPath) {
            console.log('View attachment:', attachmentPath);
            const fullPath = attachmentPath.startsWith('/') ? `${CONFIG.API_BASE_URL}${attachmentPath}` : attachmentPath;
            window.open(fullPath, '_blank');
        }
    };

    // Make table functions globally available
    window.loadCarList = APIManager.loadCarList;
    window.refreshData = APIManager.loadCarList;
    window.viewAttachment = window.DocumentManager.viewAttachment;

    // Auto-load table data
    setTimeout(() => {
        APIManager.loadCarList();
    }, 500);
});

// Add these global functions
let currentStatusRecordId = null;
let statusModal = null;

// Initialize status modal
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('statusModal')) {
        statusModal = new bootstrap.Modal(document.getElementById('statusModal'));
    }
});

function showStatusModal(recordId, currentStatus, caseNo) {
    console.log('Showing status modal for record:', recordId, currentStatus, caseNo);
    currentStatusRecordId = recordId;
    document.getElementById('statusCaseNo').textContent = caseNo || 'Unknown';
    
    if (statusModal) {
        statusModal.show();
    }
}

function updateStatus(newStatus) {
    if (!currentStatusRecordId) {
        // Use fallback if Utils is not available
        if (window.Utils) {
            window.Utils.showAlert('No record selected', 'danger');
        } else {
            alert('No record selected');
        }
        return;
    }

    console.log('Updating status to:', newStatus, 'for record:', currentStatusRecordId);

    // Show loading state
    if (window.Utils) {
        window.Utils.setLoading(true);
    }

    // Get API base URL
    const apiBaseUrl = window.CONFIG?.API_BASE_URL || 'http://localhost:3001';

    // Make API call to update status
    fetch(`${apiBaseUrl}/api/update-status`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            id: currentStatusRecordId,
            status: newStatus
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            if (window.Utils) {
                window.Utils.showAlert(`Status updated to ${newStatus}`, 'success');
            } else {
                alert(`Status updated to ${newStatus}`);
            }
            
            if (statusModal) {
                statusModal.hide();
            }
            
            // Refresh the table
            setTimeout(() => {
                if (window.APIManager && window.APIManager.loadCarList) {
                    window.APIManager.loadCarList();
                } else if (window.loadCarList) {
                    window.loadCarList();
                }
            }, 500);
        } else {
            throw new Error(data.message || 'Failed to update status');
        }
    })
    .catch(error => {
        console.error('Error updating status:', error);
        if (window.Utils) {
            window.Utils.showAlert(`Error updating status: ${error.message}`, 'danger');
        } else {
            alert(`Error updating status: ${error.message}`);
        }
    })
    .finally(() => {
        if (window.Utils) {
            window.Utils.setLoading(false);
        }
        currentStatusRecordId = null;
    });
}