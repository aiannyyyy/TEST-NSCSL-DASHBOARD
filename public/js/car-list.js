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

                // Initialize filters after table is loaded
                setTimeout(() => {
                    FilterManager.initializeFilters();
                }, 100);
                
            } catch (error) {
                console.error('Error loading car list:', error);
                if (loadingElement) loadingElement.classList.add('d-none');
                if (errorElement) errorElement.classList.remove('d-none');
                
                Utils.showAlert(`Error loading records: ${error.message}`, 'danger');
            }
        }
    };

    // ========== FILTER MANAGER - INTEGRATED ==========
    const FilterManager = {
        filters: {
            status: null,
            subCode: null,
            dateStart: null,
            dateEnd: null,
            facility: null,
            province: null
        },

        initializeFilters() {
            console.log('Initializing filter system...');
            
            // Get filter elements
            this.filters = {
                status: document.getElementById("filterStatus"),
                subCode: document.getElementById("filterSubCode"), 
                dateStart: document.getElementById("filterDateStart"),
                dateEnd: document.getElementById("filterDateEnd"),
                facility: document.getElementById("filterFacility"),
                province: document.getElementById("filterProvince")
            };

            // Check if filters exist
            const missingFilters = Object.entries(this.filters).filter(([key, el]) => !el);
            if (missingFilters.length > 0) {
                console.warn('Missing filter elements:', missingFilters.map(([key]) => key));
            }

            // Add event listeners for all filters
            Object.entries(this.filters).forEach(([key, element]) => {
                if (element) {
                    element.addEventListener("change", () => this.applyFilters());
                    element.addEventListener("input", Utils.debounce(() => this.applyFilters(), 300));
                }
            });

            // Reset button
            const resetButton = document.getElementById("resetFilters");
            if (resetButton) {
                resetButton.addEventListener("click", () => this.resetFilters());
            }

            console.log('Filter system initialized successfully');
        },

        applyFilters() {
            const filterValues = {
                status: this.filters.status?.value?.toLowerCase() || "",
                subCode: this.filters.subCode?.value || "",
                dateStart: this.filters.dateStart?.value || "",
                dateEnd: this.filters.dateEnd?.value || "",
                facility: this.filters.facility?.value?.toLowerCase() || "",
                province: this.filters.province?.value?.toLowerCase() || ""
            };

            console.log("Applying filters:", filterValues);

            // Get table body
            const tableBody = document.getElementById("carTableBody") || 
                             document.querySelector("#myTable tbody") ||
                             document.querySelector("table tbody");

            if (!tableBody) {
                console.error('Table body not found');
                return;
            }

            const rows = tableBody.querySelectorAll("tr");
            let visibleCount = 0;
            let totalCount = rows.length;

            rows.forEach((row, index) => {
                let show = true;
                const cells = row.querySelectorAll("td, th");

                try {
                    // Status filter (column 7 - status button)
                    if (filterValues.status && show) {
                        const statusCell = cells[7]; // Status column
                        if (statusCell) {
                            const statusText = statusCell.textContent.toLowerCase().trim();
                            // Handle "close" vs "closed" matching
                            if (filterValues.status === 'close') {
                                show = statusText.includes('close') || statusText.includes('closed');
                            } else {
                                show = statusText.includes(filterValues.status);
                            }
                        }
                    }

                    // Sub Code filter (columns 10-13)
                    if (filterValues.subCode && show) {
                        const subCodeCells = [cells[10], cells[11], cells[12], cells[13]]; // sub_code1 to sub_code4
                        const hasSubCode = subCodeCells.some(cell => {
                            if (cell) {
                                return cell.textContent.toUpperCase().includes(filterValues.subCode.toUpperCase());
                            }
                            return false;
                        });
                        show = hasSubCode;
                    }

                    // Date range filter (column 2)
                    if ((filterValues.dateStart || filterValues.dateEnd) && show) {
                        const dateCell = cells[2]; // Date endorsed column
                        if (dateCell) {
                            const dateText = dateCell.textContent.trim();
                            const rowDate = this.parseDateFromCell(dateText);
                            
                            if (rowDate) {
                                if (filterValues.dateStart) {
                                    const startDate = new Date(filterValues.dateStart);
                                    if (rowDate < startDate) show = false;
                                }
                                if (filterValues.dateEnd && show) {
                                    const endDate = new Date(filterValues.dateEnd);
                                    endDate.setHours(23, 59, 59); // End of day
                                    if (rowDate > endDate) show = false;
                                }
                            }
                        }
                    }

                    // Facility filter (column 3)
                    if (filterValues.facility && show) {
                        const facilityCell = cells[3]; // Facility code/name column
                        if (facilityCell) {
                            const facilityText = facilityCell.textContent.toLowerCase();
                            show = facilityText.includes(filterValues.facility);
                        }
                    }

                    // Province filter (column 4)
                    if (filterValues.province && show) {
                        const locationCell = cells[4]; // Location column
                        if (locationCell) {
                            const locationText = locationCell.textContent.toLowerCase();
                            show = locationText.includes(filterValues.province);
                        }
                    }

                } catch (error) {
                    console.warn(`Error filtering row ${index}:`, error);
                    show = true; // Keep row visible if there's an error
                }

                // Apply visibility
                row.style.display = show ? "" : "none";
                if (show) visibleCount++;
            });

            // Update filter information
            this.updateFilterInfo(visibleCount, totalCount);
            
            console.log(`Filtered: ${visibleCount}/${totalCount} rows visible`);
        },

        resetFilters() {
            console.log('Resetting filters...');
            
            // Clear all filter values
            Object.values(this.filters).forEach(el => {
                if (el) el.value = "";
            });
            
            // Show all rows
            this.showAllRows();
            
            // Update filter info
            this.updateFilterInfo(0);
        },

        showAllRows() {
            const tableBody = document.getElementById("carTableBody") || 
                             document.querySelector("#myTable tbody") ||
                             document.querySelector("table tbody");
            
            if (tableBody) {
                const rows = tableBody.querySelectorAll("tr");
                rows.forEach(row => {
                    row.style.display = "";
                });
                this.updateFilterInfo(0, rows.length);
            }
        },

        updateFilterInfo(visibleCount, totalCount = null) {
            // Try to find or create filter info display
            let filterInfo = document.getElementById('filterInfo');
            
            if (!filterInfo) {
                // Create filter info element
                filterInfo = document.createElement('div');
                filterInfo.id = 'filterInfo';
                filterInfo.className = 'alert alert-info d-none';
                
                // Try to insert it near the table
                const tableContainer = document.getElementById('tableContainer') || 
                                     document.querySelector('.table-responsive') ||
                                     document.querySelector('table')?.parentNode;
                
                if (tableContainer) {
                    tableContainer.insertBefore(filterInfo, tableContainer.firstChild);
                }
            }

            if (visibleCount === 0 && totalCount > 0) {
                // No results
                filterInfo.className = 'alert alert-warning';
                filterInfo.innerHTML = '<i class="bi bi-exclamation-triangle"></i> No records match the current filters.';
            } else if (visibleCount > 0 && totalCount && visibleCount < totalCount) {
                // Filtered results
                filterInfo.className = 'alert alert-info';
                filterInfo.innerHTML = `<i class="bi bi-funnel"></i> Showing ${visibleCount} of ${totalCount} records.`;
            } else {
                // All results or no filter
                filterInfo.className = 'alert alert-info d-none';
                filterInfo.innerHTML = '';
            }
        },

        parseDateFromCell(dateText) {
            try {
                // Remove extra whitespace and HTML
                const cleanText = dateText.replace(/<[^>]*>/g, '').trim();
                
                // Try different date formats
                const dateFormats = [
                    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // MM/DD/YYYY or M/D/YYYY
                    /(\d{4})-(\d{2})-(\d{2})/,        // YYYY-MM-DD
                    /(\d{2})-(\d{2})-(\d{4})/         // DD-MM-YYYY
                ];

                for (const format of dateFormats) {
                    const match = cleanText.match(format);
                    if (match) {
                        // Handle different format interpretations
                        if (format === dateFormats[1]) { // YYYY-MM-DD
                            return new Date(match[1], match[2] - 1, match[3]);
                        } else if (format === dateFormats[2]) { // DD-MM-YYYY
                            return new Date(match[3], match[2] - 1, match[1]);
                        } else { // MM/DD/YYYY
                            return new Date(match[3], match[1] - 1, match[2]);
                        }
                    }
                }

                // Fallback: try native Date parsing
                const fallbackDate = new Date(cleanText);
                return isNaN(fallbackDate.getTime()) ? null : fallbackDate;
                
            } catch (error) {
                console.warn('Date parsing error:', error, dateText);
                return null;
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
    window.Utils = Utils;
    window.CONFIG = CONFIG;
    window.APIManager = APIManager;
    window.FilterManager = FilterManager;
    
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

// ========== GLOBAL STATUS MODAL FUNCTIONS ==========
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
                    
                    // Refresh table and chart - use async/await to ensure proper timing
                    setTimeout(async () => {
                        if (typeof loadCarList === 'function') {
                            await loadCarList();
                        }
                        // Refresh chart after table has loaded
                        if (window.ChartManager) {
                            setTimeout(() => {
                                window.ChartManager.refresh();
                            }, 300);
                        }
                    }, 500);
                    
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
                
                const carList = result.data || result;
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

                // Initialize filters after table is loaded
                setTimeout(() => {
                    FilterManager.initializeFilters();
                }, 100);
                
            } catch (error) {
                console.error('Error loading car list:', error);
                if (loadingElement) loadingElement.classList.add('d-none');
                if (errorElement) errorElement.classList.remove('d-none');
                
                Utils.showAlert(`Error loading records: ${error.message}`, 'danger');
            }
        }
    };

    // ========== FILTER MANAGER ==========
    const FilterManager = {
        filters: {
            status: null,
            subCode: null,
            dateStart: null,
            dateEnd: null,
            facility: null,
            province: null
        },

        initializeFilters() {
            console.log('Initializing filter system...');
            
            // Get filter elements
            this.filters = {
                status: document.getElementById("filterStatus"),
                subCode: document.getElementById("filterSubCode"), 
                dateStart: document.getElementById("filterDateStart"),
                dateEnd: document.getElementById("filterDateEnd"),
                facility: document.getElementById("filterFacility"),
                province: document.getElementById("filterProvince")
            };

            // Check if filters exist
            const missingFilters = Object.entries(this.filters).filter(([key, el]) => !el);
            if (missingFilters.length > 0) {
                console.warn('Missing filter elements:', missingFilters.map(([key]) => key));
            }

            // Add event listeners for all filters
            Object.entries(this.filters).forEach(([key, element]) => {
                if (element) {
                    element.addEventListener("change", () => this.applyFilters());
                    element.addEventListener("input", Utils.debounce(() => this.applyFilters(), 300));
                }
            });

            // Reset button
            const resetButton = document.getElementById("resetFilters");
            if (resetButton) {
                resetButton.addEventListener("click", () => this.resetFilters());
            }

            console.log('Filter system initialized successfully');
        },

        applyFilters() {
            const filterValues = {
                status: this.filters.status?.value?.toLowerCase() || "",
                subCode: this.filters.subCode?.value || "",
                dateStart: this.filters.dateStart?.value || "",
                dateEnd: this.filters.dateEnd?.value || "",
                facility: this.filters.facility?.value?.toLowerCase() || "",
                province: this.filters.province?.value?.toLowerCase() || ""
            };

            console.log("Applying filters:", filterValues);

            // Get table body
            const tableBody = document.getElementById("carTableBody") || 
                             document.querySelector("#myTable tbody") ||
                             document.querySelector("table tbody");

            if (!tableBody) {
                console.error('Table body not found');
                return;
            }

            const rows = tableBody.querySelectorAll("tr");
            let visibleCount = 0;
            let totalCount = rows.length;

            rows.forEach((row, index) => {
                let show = true;
                const cells = row.querySelectorAll("td, th");

                try {
                    // Status filter (column 7)
                    if (filterValues.status && show) {
                        const statusCell = cells[7];
                        if (statusCell) {
                            const statusText = statusCell.textContent.toLowerCase().trim();
                            if (filterValues.status === 'close') {
                                show = statusText.includes('close') || statusText.includes('closed');
                            } else {
                                show = statusText.includes(filterValues.status);
                            }
                        }
                    }

                    // Sub Code filter (columns 10-13)
                    if (filterValues.subCode && show) {
                        const subCodeCells = [cells[10], cells[11], cells[12], cells[13]];
                        const hasSubCode = subCodeCells.some(cell => {
                            if (cell) {
                                return cell.textContent.toUpperCase().includes(filterValues.subCode.toUpperCase());
                            }
                            return false;
                        });
                        show = hasSubCode;
                    }

                    // Date range filter (column 2)
                    if ((filterValues.dateStart || filterValues.dateEnd) && show) {
                        const dateCell = cells[2];
                        if (dateCell) {
                            const dateText = dateCell.textContent.trim();
                            const rowDate = this.parseDateFromCell(dateText);
                            
                            if (rowDate) {
                                if (filterValues.dateStart) {
                                    const startDate = new Date(filterValues.dateStart);
                                    if (rowDate < startDate) show = false;
                                }
                                if (filterValues.dateEnd && show) {
                                    const endDate = new Date(filterValues.dateEnd);
                                    endDate.setHours(23, 59, 59);
                                    if (rowDate > endDate) show = false;
                                }
                            }
                        }
                    }

                    // Facility filter (column 3)
                    if (filterValues.facility && show) {
                        const facilityCell = cells[3];
                        if (facilityCell) {
                            const facilityText = facilityCell.textContent.toLowerCase();
                            show = facilityText.includes(filterValues.facility);
                        }
                    }

                    // Province filter (column 4)
                    if (filterValues.province && show) {
                        const locationCell = cells[4];
                        if (locationCell) {
                            const locationText = locationCell.textContent.toLowerCase();
                            show = locationText.includes(filterValues.province);
                        }
                    }

                } catch (error) {
                    console.warn(`Error filtering row ${index}:`, error);
                    show = true;
                }

                row.style.display = show ? "" : "none";
                if (show) visibleCount++;
            });

            this.updateFilterInfo(visibleCount, totalCount);
            console.log(`Filtered: ${visibleCount}/${totalCount} rows visible`);
        },

        resetFilters() {
            console.log('Resetting filters...');
            Object.values(this.filters).forEach(el => {
                if (el) el.value = "";
            });
            this.showAllRows();
            this.updateFilterInfo(0);
        },

        showAllRows() {
            const tableBody = document.getElementById("carTableBody") || 
                             document.querySelector("#myTable tbody") ||
                             document.querySelector("table tbody");
            
            if (tableBody) {
                const rows = tableBody.querySelectorAll("tr");
                rows.forEach(row => {
                    row.style.display = "";
                });
                this.updateFilterInfo(0, rows.length);
            }
        },

        updateFilterInfo(visibleCount, totalCount = null) {
            let filterInfo = document.getElementById('filterInfo');
            
            if (!filterInfo) {
                filterInfo = document.createElement('div');
                filterInfo.id = 'filterInfo';
                filterInfo.className = 'alert alert-info d-none';
                
                const tableContainer = document.getElementById('tableContainer') || 
                                     document.querySelector('.table-responsive') ||
                                     document.querySelector('table')?.parentNode;
                
                if (tableContainer) {
                    tableContainer.insertBefore(filterInfo, tableContainer.firstChild);
                }
            }

            if (visibleCount === 0 && totalCount > 0) {
                filterInfo.className = 'alert alert-warning';
                filterInfo.innerHTML = '<i class="bi bi-exclamation-triangle"></i> No records match the current filters.';
            } else if (visibleCount > 0 && totalCount && visibleCount < totalCount) {
                filterInfo.className = 'alert alert-info';
                filterInfo.innerHTML = `<i class="bi bi-funnel"></i> Showing ${visibleCount} of ${totalCount} records.`;
            } else {
                filterInfo.className = 'alert alert-info d-none';
                filterInfo.innerHTML = '';
            }
        },

        parseDateFromCell(dateText) {
            try {
                const cleanText = dateText.replace(/<[^>]*>/g, '').trim();
                
                const dateFormats = [
                    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
                    /(\d{4})-(\d{2})-(\d{2})/,
                    /(\d{2})-(\d{2})-(\d{4})/
                ];

                for (const format of dateFormats) {
                    const match = cleanText.match(format);
                    if (match) {
                        if (format === dateFormats[1]) {
                            return new Date(match[1], match[2] - 1, match[3]);
                        } else if (format === dateFormats[2]) {
                            return new Date(match[3], match[2] - 1, match[1]);
                        } else {
                            return new Date(match[3], match[1] - 1, match[2]);
                        }
                    }
                }

                const fallbackDate = new Date(cleanText);
                return isNaN(fallbackDate.getTime()) ? null : fallbackDate;
                
            } catch (error) {
                console.warn('Date parsing error:', error, dateText);
                return null;
            }
        }
    };

    // ========== PIE CHART MANAGER ==========
    const ChartManager = {
        chart: null,
        chartCanvas: null,

        colors: [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
            '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF9F40',
            '#36A2EB', '#FFCE56', '#9966FF', '#FF6384', '#4BC0C0'
        ],

        init() {
            console.log('Initializing Chart Manager...');
            
            this.chartCanvas = document.getElementById('carPieChart');
            if (!this.chartCanvas) {
                console.error('Chart canvas element with id "carPieChart" not found!');
                return;
            }

            // Check if Chart.js is loaded
            if (typeof Chart === 'undefined') {
                console.error('Chart.js is not loaded! Please include Chart.js CDN in your HTML.');
                return;
            }

            // Check if ChartDataLabels plugin is available
            if (typeof ChartDataLabels === 'undefined') {
                console.warn('ChartDataLabels plugin not found - labels will be shown without outside positioning');
            }

            console.log('Chart canvas found:', this.chartCanvas);
            
            this.populateYearDropdown();
            this.setDefaultFilters();

            const monthFilter = document.getElementById('chartMonthFilter');
            const yearFilter = document.getElementById('chartYearFilter');

            if (monthFilter) {
                monthFilter.addEventListener('change', () => this.loadChartData());
            }
            if (yearFilter) {
                yearFilter.addEventListener('change', () => this.loadChartData());
            }

            // Load chart data
            setTimeout(() => {
                this.loadChartData();
            }, 500);
            
            console.log('Chart Manager initialized successfully');
        },

        populateYearDropdown() {
            const yearFilter = document.getElementById('chartYearFilter');
            if (!yearFilter) return;

            const currentYear = new Date().getFullYear();
            const startYear = 2020;

            yearFilter.innerHTML = '';
            for (let year = currentYear; year >= startYear; year--) {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                yearFilter.appendChild(option);
            }
        },

        setDefaultFilters() {
            const now = new Date();
            const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
            const currentYear = now.getFullYear();

            const monthFilter = document.getElementById('chartMonthFilter');
            const yearFilter = document.getElementById('chartYearFilter');

            if (monthFilter) monthFilter.value = currentMonth;
            if (yearFilter) yearFilter.value = currentYear;

            this.updateFilterDisplay();
        },

        updateFilterDisplay() {
            const monthFilter = document.getElementById('chartMonthFilter');
            const yearFilter = document.getElementById('chartYearFilter');
            const displayElement = document.getElementById('currentFilterDisplay');

            if (displayElement && monthFilter && yearFilter) {
                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                                  'July', 'August', 'September', 'October', 'November', 'December'];
                const monthIndex = parseInt(monthFilter.value) - 1;
                displayElement.textContent = `${monthNames[monthIndex]} ${yearFilter.value}`;
            }
        },

        async loadChartData() {
            const monthFilter = document.getElementById('chartMonthFilter');
            const yearFilter = document.getElementById('chartYearFilter');

            if (!monthFilter || !yearFilter) {
                console.error('Filter elements not found');
                return;
            }

            const selectedMonth = monthFilter.value;
            const selectedYear = yearFilter.value;

            // Set start date to first day of month at 00:00:00
            const fromDate = `${selectedYear}-${selectedMonth}-01 00:00:00`;

            // Set end date to last day of month at 23:59:59
            const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
            const toDate = `${selectedYear}-${selectedMonth}-${lastDay} 23:59:59`;

            console.log('Loading chart data for:', fromDate, 'to', toDate);

            try {
                const response = await fetch(
                    `${CONFIG.API_BASE_URL}/api/car-list/grouped?from=${fromDate}&to=${toDate}`
                );

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();
                console.log('Chart data received:', result);

                if (result.success && result.data) {
                    this.renderChart(result.data);
                    this.updateFilterDisplay();
                } else {
                    console.warn('No data received');
                    this.renderChart([]);
                }
            } catch (error) {
                console.error('Error loading chart data:', error);
                if (window.Utils) {
                    Utils.showAlert('Error loading chart data: ' + error.message, 'danger');
                }
                this.renderChart([]);
            }
        },

        renderChart(data) {
            if (!this.chartCanvas) {
                console.error('Cannot render chart: canvas not found');
                return;
            }

            console.log('Rendering chart with data:', data);

            const totalCount = data.reduce((sum, item) => sum + parseInt(item.count || 0), 0);
            
            const totalRecordsEl = document.getElementById('totalRecords');
            if (totalRecordsEl) {
                totalRecordsEl.textContent = totalCount;
            }

            if (this.chart) {
                console.log('Destroying existing chart');
                this.chart.destroy();
            }

            if (!data || data.length === 0) {
                console.log('No data to display');
                const ctx = this.chartCanvas.getContext('2d');
                ctx.clearRect(0, 0, this.chartCanvas.width, this.chartCanvas.height);
                ctx.font = '16px Arial';
                ctx.fillStyle = '#666';
                ctx.textAlign = 'center';
                ctx.fillText('No data available for selected period', 
                            this.chartCanvas.width / 2, 
                            this.chartCanvas.height / 2);
                return;
            }

            const labels = data.map(item => item.sub_code1 || 'Unknown');
            const counts = data.map(item => parseInt(item.count || 0));
            const backgroundColors = this.colors.slice(0, data.length);

            console.log('Chart labels:', labels);
            console.log('Chart counts:', counts);

            // Check if ChartDataLabels is available
            const plugins = typeof ChartDataLabels !== 'undefined' ? [ChartDataLabels] : [];

            const chartConfig = {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: counts,
                        backgroundColor: backgroundColors,
                        borderColor: '#fff',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 15,
                                font: {
                                    size: 12
                                },
                                generateLabels: (chart) => {
                                    const data = chart.data;
                                    if (data.labels.length && data.datasets.length) {
                                        return data.labels.map((label, i) => {
                                            const value = data.datasets[0].data[i];
                                            const percentage = ((value / totalCount) * 100).toFixed(1);
                                            return {
                                                text: `${label}: ${value} (${percentage}%)`,
                                                fillStyle: data.datasets[0].backgroundColor[i],
                                                hidden: false,
                                                index: i
                                            };
                                        });
                                    }
                                    return [];
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const label = context.label || '';
                                    const value = context.parsed || 0;
                                    const percentage = ((value / totalCount) * 100).toFixed(1);
                                    return `${label}: ${value} (${percentage}%)`;
                                }
                            }
                        }
                    }
                },
                plugins: plugins
            };

            // Add datalabels config only if plugin is available
            if (typeof ChartDataLabels !== 'undefined') {
                chartConfig.options.plugins.datalabels = {
                    color: '#000',
                    font: {
                        weight: 'bold',
                        size: 11
                    },
                    formatter: (value, context) => {
                        const percentage = ((value / totalCount) * 100).toFixed(1);
                        return `${percentage}%`;
                    },
                    anchor: 'end',
                    align: 'end',
                    offset: 10,
                    borderWidth: 2,
                    borderColor: '#fff',
                    borderRadius: 4,
                    backgroundColor: (context) => {
                        return context.dataset.backgroundColor[context.dataIndex];
                    },
                    padding: 4
                };
            }

            try {
                this.chart = new Chart(this.chartCanvas, chartConfig);
                console.log('Chart created successfully with', data.length, 'segments');
            } catch (error) {
                console.error('Error creating chart:', error);
                Utils.showAlert('Error creating chart: ' + error.message, 'danger');
            }
        },

        refresh() {
            console.log('Refreshing chart...');
            this.loadChartData();
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
    
    APIManager.testConnection();

    // Expose global utilities
    window.Utils = Utils;
    window.CONFIG = CONFIG;
    window.APIManager = APIManager;
    window.FilterManager = FilterManager;
    window.ChartManager = ChartManager;
    
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

    window.loadCarList = APIManager.loadCarList;
    window.refreshData = APIManager.loadCarList;
    window.viewAttachment = window.DocumentManager.viewAttachment;

    // Auto-load table and chart
    setTimeout(() => {
        APIManager.loadCarList();
    }, 500);

    // Initialize chart separately with delay to ensure DOM is ready
    setTimeout(() => {
        console.log('Attempting to initialize chart...');
        if (document.getElementById('carPieChart')) {
            ChartManager.init();
        } else {
            console.warn('Chart canvas not found in DOM. Make sure you have added the pie chart HTML to your page.');
        }
    }, 1000);
});

// ========== GLOBAL STATUS MODAL FUNCTIONS ==========
let currentStatusRecordId = null;
let statusModal = null;

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
        if (window.Utils) {
            window.Utils.showAlert('No record selected', 'danger');
        } else {
            alert('No record selected');
        }
        return;
    }

    console.log('Updating status to:', newStatus, 'for record:', currentStatusRecordId);

    if (window.Utils) {
        window.Utils.setLoading(true);
    }

    const apiBaseUrl = window.CONFIG?.API_BASE_URL || 'http://localhost:3001';

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
            
            setTimeout(() => {
                if (window.APIManager && window.APIManager.loadCarList) {
                    window.APIManager.loadCarList();
                } else if (window.loadCarList) {
                    window.loadCarList();
                }
                
                // Refresh chart
                if (window.ChartManager) {
                    setTimeout(() => {
                        window.ChartManager.refresh();
                    }, 500);
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