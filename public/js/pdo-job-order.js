// Enhanced IT Job Order Management Script with Form Submission
class ITJobOrderManager {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3001/api'; // Adjust this to your API base URL
        this.userDepartment = 'Program'; // Hardcoded default department
        this.userName = null;
        this.init();
    }

    async init() {
        this.loadJobOrdersForAllTabs();
        this.setupEventListeners();
        this.setupFormHandlers(); // Add form handling
        this.updateTabBadges();
    }

    // Setup form submission handlers
    setupFormHandlers() {
        const form = document.getElementById('jobOrderForm');
        if (!form) {
            console.log('Job order form not found');
            return;
        }

        // Handle form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmission();
        });

        // Setup modal event handlers
        const modal = document.getElementById('addDocumentModal');
        if (modal) {
            // Reset form when modal opens
            modal.addEventListener('show.bs.modal', () => {
                this.resetForm();
                this.generatePreviewWorkOrderNo();
            });

            // Clear form when modal closes
            modal.addEventListener('hidden.bs.modal', () => {
                this.resetForm();
            });
        }
    }

    // Generate preview work order number (automatically increments)
    async generatePreviewWorkOrderNo() {
        try {
            const currentYear = new Date().getFullYear();
            const response = await fetch(`${this.apiBaseUrl}/get-next-work-order-no?year=${currentYear}`);
            
            if (response.ok) {
                const data = await response.json();
                const workOrderNoInput = document.getElementById('workOrderNo');
                if (workOrderNoInput) {
                    // This will show the NEXT number (e.g., if last is 0002, this shows 0003)
                    workOrderNoInput.value = data.next_work_order_no || `WORK-${currentYear}-0001`;
                    console.log('Generated next work order number:', data.next_work_order_no);
                }
            } else {
                // Fallback if API call fails - will be replaced with actual number on submit
                const workOrderNoInput = document.getElementById('workOrderNo');
                if (workOrderNoInput) {
                    workOrderNoInput.value = `WORK-${new Date().getFullYear()}-[AUTO]`;
                }
            }
        } catch (error) {
            console.error('Error generating work order number:', error);
            const workOrderNoInput = document.getElementById('workOrderNo');
            if (workOrderNoInput) {
                workOrderNoInput.value = `WORK-${new Date().getFullYear()}-[AUTO]`;
            }
        }
    }

    // Determine department based on requester name
    getDepartmentByRequester(requesterName) {
        const programDepartmentUsers = [
            'Patrick Reyes',
            'Angelita Vanguardia', 
            'Shirleen Micosa',
            'Marc Kevin Estolas'
        ];
        
        return programDepartmentUsers.includes(requesterName) ? 'Program' : 'Other';
    }


    // FIXED: Proper datetime formatting for MySQL
    getCurrentDateTime() {
        const now = new Date();
        // Convert to local time and format for MySQL
        const localDateTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
        return localDateTime.toISOString().slice(0, 19).replace('T', ' ');
    }

    // Form submission method that matches your database structure
    async handleFormSubmission() {
        const form = document.getElementById('jobOrderForm');
        
        try {
            console.log('🚀 Starting form submission...');
            
            // Set loading state
            this.setLoadingState(true);

            // Validate form
            if (!this.validateForm()) {
                console.log('❌ Form validation failed');
                this.setLoadingState(false);
                return;
            }

            console.log('✅ Form validation passed');

            // Prepare form data
            const formData = new FormData();
            
            // Get form values
            const title = document.getElementById('title').value.trim();
            const description = document.getElementById('description').value.trim();
            const type = document.getElementById('type').value;
            const priority = document.getElementById('priority').value || 'LOW';
            const attachment = document.getElementById('attachment').files[0];
            const userName = document.getElementById('user-name')?.textContent.trim() || 'System';
            
            console.log('📋 Form Values:', {
                title,
                description,
                type,
                priority,
                attachment: attachment ? attachment.name : 'No attachment',
                userName: this.userName
            });
            
            // Determine department based on current user
            const department = this.getDepartmentByRequester(this.userName);
            
            // FIXED: Use consistent datetime format
            const mysqlDateTime = this.getCurrentDateTime();
            
            console.log('🏢 Department determined:', department);
            console.log('🕐 Current DateTime:', mysqlDateTime);
            
            // Append form data - ONLY the fields that should have values initially
            formData.append('title', title);
            formData.append('description', description);
            formData.append('date_issued', mysqlDateTime);
            formData.append('requester', userName);
            formData.append('department', this.userDepartment);
            formData.append('status', 'Pending'); // Default status
            formData.append('type', type);
            formData.append('priority', priority);
            
            // Fields that should be NULL initially (don't send empty strings)
            // date_resolved, tech, reason, approved_by, approved_date, action_taken will remain NULL
            
            // Handle approved field correctly - set to 'No' by default
            formData.append('approved', 'No');
            
            // Handle attachment
            if (attachment) {
                formData.append('attachment', attachment);
                console.log(`📎 Added attachment: ${attachment.name} (${attachment.size} bytes)`);
            }

            // Log all form data
            for (let [key, value] of formData.entries()) {
                console.log(`📝 FormData: ${key} = "${value}"`);
            }

            // Submit to API
            const endpoint = `${this.apiBaseUrl}/add-it-job-order`;
            console.log('🌐 Submitting to endpoint:', endpoint);

            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData
            });

            console.log('📥 Response status:', response.status);
            console.log('📥 Response ok:', response.ok);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Server response:', errorText);
                
                try {
                    const errorData = JSON.parse(errorText);
                    throw new Error(errorData.error || errorData.message || `Server error: ${response.status}`);
                } catch (parseError) {
                    throw new Error(`Server error (${response.status}): ${errorText}`);
                }
            }

            const result = await response.json();
            console.log('🎉 Success response:', result);
            
            // Show success message
            this.showSuccessMessage(`Job order ${result.work_order_no} created successfully!`);
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('addDocumentModal'));
            if (modal) {
                modal.hide();
                console.log('✅ Modal closed');
            }
            
            // Refresh data to show new record
            console.log('🔄 Refreshing job orders...');
            await this.loadJobOrdersForAllTabs();
            
            // Reset form
            this.resetForm();
            console.log('✅ Form submission completed successfully');

        } catch (error) {
            console.error('💥 Error submitting job order:', error);
            console.error('💥 Error stack:', error.stack);
            this.showError(`Failed to create job order: ${error.message}`);
        } finally {
            this.setLoadingState(false);
            console.log('🏁 Form submission process completed');
        }
    }

    // Enhanced validation with database constraints
    validateForm() {
        console.log('🔍 Starting form validation...');
        
        const title = document.getElementById('title').value.trim();
        const description = document.getElementById('description').value.trim();
        const type = document.getElementById('type').value;
        
        console.log('🔍 Validation data:', { title, description, type });
        
        // Check title (required, max 100 chars based on your DB)
        if (!title) {
            console.log('❌ Validation failed: No title');
            this.showError('Please enter a job title.');
            document.getElementById('title').focus();
            return false;
        }
        
        if (title.length > 100) {
            console.log('❌ Validation failed: Title too long');
            this.showError('Job title must be 100 characters or less.');
            document.getElementById('title').focus();
            return false;
        }
        
        // Check description (required)
        if (!description) {
            console.log('❌ Validation failed: No description');
            this.showError('Please enter a job description.');
            document.getElementById('description').focus();
            return false;
        }
        
        // Check type (required, max 25 chars based on your DB)
        if (!type) {
            console.log('❌ Validation failed: No type selected');
            this.showError('Please select a job type.');
            document.getElementById('type').focus();
            return false;
        }
        
        // Check requester name length (max 50 chars based on your DB)
        if (this.userName && this.userName.length > 50) {
            console.log('❌ Validation failed: Requester name too long');
            this.showError('Requester name is too long.');
            return false;
        }
        
        console.log('✅ Form validation passed');
        return true;
    }

    // Set loading state for form submission
    setLoadingState(isLoading) {
        const submitBtn = document.querySelector('button[form="jobOrderForm"]') ||
                         document.querySelector('#jobOrderForm button[type="submit"]');
        
        if (submitBtn) {
            if (isLoading) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Saving...';
            } else {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Save';
            }
        }
    }

    // Reset form to initial state
    resetForm() {
        const form = document.getElementById('jobOrderForm');
        if (form) {
            form.reset();
            
            // Set default values
            const prioritySelect = document.getElementById('priority');
            if (prioritySelect) {
                prioritySelect.value = 'Low';
            }
            
            // Clear work order number
            const workOrderNoInput = document.getElementById('workOrderNo');
            if (workOrderNoInput) {
                workOrderNoInput.value = '';
            }
        }
        
        // Clear any error messages
        this.clearMessages();
    }

    // Show success message
    showSuccessMessage(message) {
        // Remove existing messages
        this.clearMessages();
        
        const successDiv = document.createElement('div');
        successDiv.className = 'alert alert-success alert-dismissible fade show';
        successDiv.innerHTML = `
            <strong>Success:</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const contentWrapper = document.querySelector('.content-wrapper');
        if (contentWrapper) {
            contentWrapper.insertBefore(successDiv, contentWrapper.firstChild);
        }
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.remove();
            }
        }, 5000);
    }

    // Clear all messages
    clearMessages() {
        const existingMessages = document.querySelectorAll('#error-message, .alert-success, .alert-danger');
        existingMessages.forEach(msg => msg.remove());
    }

    // Setup event listeners for tabs and refresh
    setupEventListeners() {
        // Setup tab change listeners to reload data when switching tabs
        const tabButtons = document.querySelectorAll('[data-bs-toggle="tab"]');
        tabButtons.forEach(button => {
            button.addEventListener('shown.bs.tab', (event) => {
                const targetTab = event.target.getAttribute('data-bs-target');
                this.loadJobOrdersForTab(targetTab);
            });
        });

        // Setup refresh functionality
        document.addEventListener('DOMContentLoaded', () => {
            this.loadJobOrdersForAllTabs();
        });
    }

    // Load job orders for all tabs
    async loadJobOrdersForAllTabs() {
        await Promise.all([
            this.loadJobOrdersForTab('#pending'),
            this.loadJobOrdersForTab('#approved'),
            this.loadJobOrdersForTab('#closed')
        ]);
    }

    // Load job orders for specific tab with Program department filtering
    async loadJobOrdersForTab(tabId) {
        try {
            // Get all job orders for Program department first
            let params = new URLSearchParams();
            params.append('department', this.userDepartment);

            const response = await fetch(`${this.apiBaseUrl}/it-job-order-bydept?${params}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const jobOrders = await response.json();
            
            // Filter data based on specific tab requirements - ALL tabs filter by Program department
            let filteredOrders;
            switch (tabId) {
                case '#pending':
                    // Pending/Queued items that are approved and ready to work on
                    filteredOrders = jobOrders.filter(order => 
                        order.department === 'Program' &&
                        (order.status === 'Pending' || order.status === 'Queued' || order.status === 'Hold') &&
                        (order.approved === 'yes' || order.approved === 'Yes' || order.approved === '1' || order.approved === 1 || order.approved === true)
                    );
                    break;
                case '#approved':
                    // Items awaiting approval - Program department, Pending status, not yet approved
                    filteredOrders = jobOrders.filter(order => {
                        console.log('Checking order for approval tab:', {
                            work_order_no: order.work_order_no,
                            department: order.department,
                            status: order.status,
                            approved: order.approved
                        });
                        return order.department === 'Program' &&
                               order.status === 'Pending' &&
                               (order.approved === 'no' || order.approved === 'No' || 
                                order.approved === '0' || order.approved === 0 || 
                                order.approved === false || order.approved === null || 
                                order.approved === '' || !order.approved);
                    });
                    console.log(`Found ${filteredOrders.length} orders for approval tab`);
                    break;
                case '#closed':
                    // Completed/Closed items - Program department, Closed status, approved
                    filteredOrders = jobOrders.filter(order => 
                        order.department === 'Program' &&
                        order.status === 'Closed' &&
                        (order.approved === 'yes' || order.approved === 'Yes' || order.approved === '1' || order.approved === 1 || order.approved === true)
                    );
                    break;
                default:
                    // Default case - show all Program department orders
                    filteredOrders = jobOrders.filter(order => order.department === 'Program');
            }

            // Populate the appropriate table
            this.populateTableForTab(tabId, filteredOrders);
            
            // Update tab badge count
            this.updateTabBadge(tabId, filteredOrders.length);

        } catch (error) {
            console.error(`Error loading job orders for tab ${tabId}:`, error);
            this.showError('Failed to load job orders. Please try again.');
        }
    }

    // Populate table for specific tab
    populateTableForTab(tabId, orders) {
        // Find the table body within the specific tab
        const tabPane = document.querySelector(tabId);
        if (!tabPane) {
            console.error(`Tab pane ${tabId} not found`);
            return;
        }

        const tbody = tabPane.querySelector('table tbody');
        if (!tbody) {
            console.error(`Table body not found in tab ${tabId}`);
            return;
        }

        // Clear existing rows
        tbody.innerHTML = '';

        // Add rows for each order
        orders.forEach(order => {
            const row = this.createTableRow(order, tabId);
            tbody.appendChild(row);
        });

        // Show message if no data
        if (orders.length === 0) {
            const row = document.createElement('tr');
            const colSpan = tbody.closest('table').querySelectorAll('thead th').length;
            row.innerHTML = `
                <td colspan="${colSpan}" class="text-center py-4">
                    <em>No job orders found for Program department</em>
                </td>
            `;
            tbody.appendChild(row);
        }
    }

    // Create table row for job order
    createTableRow(order, tabId) {
        const row = document.createElement('tr');
        
        // Format dates
        const requestedDate = this.formatDate(order.date_issued);
        const resolvedDate = this.formatDate(order.date_resolved);
        const approvedDate = this.formatDate(order.approved_date);

        const requestedInfo = order.requester ? 
                `${order.requester}<br><small class="text-muted">${requestedDate}</small>` : 
                requestedDate;
        
        // Create different row content based on tab
        if (tabId === '#approved') {
            // Approval tab has different columns
            row.innerHTML = `
                <td><strong>${order.work_order_no || `WO-${order.id}`}</strong></td>
                <td>${order.title || '-'}</td>
                <td class="text-wrap">${order.description || '-'}</td>
                <td>${requestedInfo}</td>
                <td>${order.department || '-'}</td>
                <td>${this.createStatusBadge(order.status)}</td>
                <td>${order.type || '-'}</td>
                <td>${this.createPriorityBadge(order.priority)}</td>
                <td>
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-success" title="Approve" onclick="setApproval('${order.work_order_no}', true)">
                            <i class="bi bi-check-circle"></i> Approve
                        </button>
                        <button class="btn btn-sm btn-danger" title="Reject" onclick="setApproval('${order.work_order_no}', false)">
                            <i class="bi bi-x-circle"></i> Reject
                        </button>
                    </div>
                </td>
                <td class="fixed-column">
                    ${this.createAttachmentButton(order)}
                </td>
            `;
        } else {
            // Full row for pending and closed tabs
            const requestedInfo = order.requester ? 
                `${order.requester}<br><small class="text-muted">${requestedDate}</small>` : 
                requestedDate;
                
            const resolvedInfo = order.tech && resolvedDate ? 
                `${order.tech}<br><small class="text-muted">${resolvedDate}</small>` : 
                (resolvedDate || '-');
                
            const approvedInfo = order.approved_by ? 
                `${order.approved_by}<br><small class="text-muted">${approvedDate || ''}</small>` : 
                (order.approved === 'yes' || order.approved === '1' || order.approved === 1 || order.approved === true ? '✅ Yes' : '❌ No');

            row.innerHTML = `
                <td><strong>${order.work_order_no || `WO-${order.id}`}</strong></td>
                <td>${order.title || '-'}</td>
                <td class="text-wrap">${order.description || '-'}</td>
                <td>${requestedInfo}</td>
                <td>${order.department || '-'}</td>
                <td>${this.createStatusBadge(order.status)}</td>
                <td>${order.type || '-'}</td>
                <td>${this.createPriorityBadge(order.priority)}</td>
                <td>${resolvedInfo}</td>
                <td>${approvedInfo}</td>
                <td class="text-wrap">${order.action_taken || '-'}</td>
                <td class="fixed-column">
                    ${this.createAttachmentButton(order)}
                </td>
            `;
        }

        return row;
    }

    // Update tab badges
    updateTabBadges() {
        // This will be called after all tabs are loaded
        // The individual badge updates happen in updateTabBadge()
    }

    // Update badge count for specific tab
    updateTabBadge(tabId, count) {
        let badgeSelector;
        switch (tabId) {
            case '#pending':
                badgeSelector = '#pending-tab .tab-badge';
                break;
            case '#approved':
                badgeSelector = '#approved-tab .tab-badge';
                break;
            case '#closed':
                badgeSelector = '#closed-tab .tab-badge';
                break;
        }

        if (badgeSelector) {
            const badge = document.querySelector(badgeSelector);
            if (badge) {
                badge.textContent = count;
            }
        }
    }

    // Format date for display
    formatDate(dateString) {
        if (!dateString) return '-';
        
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';
        
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    }

    // Create status badge
    createStatusBadge(status) {
        if (!status) return '<span class="status-badge">-</span>';
        
        const statusClass = this.getStatusClass(status);
        return `<span class="status-badge ${statusClass}">${status}</span>`;
    }

    // Get CSS class for status
    getStatusClass(status) {
        const statusLower = status.toLowerCase();

        if (statusLower.includes('pending') || statusLower.includes('queued')) {
            return 'status-pending';
        } else if (statusLower.includes('hold')) {
            return 'status-hold';
        } else if (statusLower.includes('progress') || statusLower.includes('active')) {
            return 'status-in-progress';
        } else if (statusLower.includes('completed') || statusLower.includes('closed') || statusLower.includes('resolved')) {
            return 'status-completed';
        }
        return 'status-default';
    }


    // Create priority badge
    createPriorityBadge(priority) {
        if (!priority) return '<span class="priority-badge">-</span>';
        
        const priorityClass = this.getPriorityClass(priority);
        return `<span class="priority-badge ${priorityClass}">${priority}</span>`;
    }

    // Get CSS class for priority - FIXED VERSION
    getPriorityClass(priority) {
        if (!priority) return 'priority-default';
        
        const priorityLower = priority.toLowerCase();
        
        // Handle variations of HIGH priority
        if (priorityLower.includes('high') || priorityLower.includes('urgent')) {
            return 'priority-high';
        } 
        // Handle variations of MEDIUM priority - FIXED
        else if (priorityLower.includes('medium') || priorityLower.includes('normal') || 
                priorityLower.includes('mid') || priorityLower === 'mid') {
            return 'priority-medium';
        } 
        // Handle variations of LOW priority
        else if (priorityLower.includes('low')) {
            return 'priority-low';
        }
        
        return 'priority-default';
    }

    // Create attachment button
    createAttachmentButton(order) {
        if (order.attachment_path) {
            return `
                <button class="btn-attachment" onclick="viewAttachment('${order.work_order_no || order.id}', '${order.attachment_path}')">
                    <i class="mdi mdi-paperclip"></i> View
                </button>
            `;
        } else {
            return `
                <button class="btn-attachment" disabled>
                    <i class="mdi mdi-paperclip"></i> None
                </button>
            `;
        }
    }

    // Show error message
    showError(message) {
        // Remove existing error messages
        this.clearMessages();
        
        const errorDiv = document.createElement('div');
        errorDiv.id = 'error-message';
        errorDiv.className = 'alert alert-danger alert-dismissible fade show';
        errorDiv.innerHTML = `
            <strong>Error:</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const contentWrapper = document.querySelector('.content-wrapper');
        if (contentWrapper) {
            contentWrapper.insertBefore(errorDiv, contentWrapper.firstChild);
        }
        
        // Auto-dismiss after 8 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 8000);
    }

    // Public methods
    refresh() {
        this.loadJobOrdersForAllTabs();
    }

    async refreshTab(tabId) {
        await this.loadJobOrdersForTab(tabId);
    }
}

// Global functions for onclick handlers
function viewAttachment(workOrderNo, attachmentPath) {
    if (attachmentPath) {
        const baseUrl = 'http://localhost:3001/api'; // Adjust this to match your API base URL
        window.open(`${baseUrl}/uploads/${attachmentPath}`, '_blank');
    } else {
        alert(`No attachment available for ${workOrderNo}`);
    }
}

function setApproval(workOrderNo, approved) {
    if (window.jobOrderManager) {
        const confirmation = confirm(`Are you sure you want to ${approved ? 'approve' : 'reject'} ${workOrderNo}?`);
        if (confirmation) {
            updateJobOrderApproval(workOrderNo, approved);
        }
    }
}

// FIXED updateJobOrderApproval function
async function updateJobOrderApproval(workOrderNo, approved) {
    try {
        console.log(`🔄 Updating approval for ${workOrderNo} to ${approved ? 'approved' : 'rejected'}`);
        
        // FIXED: Get current datetime properly (moved the method outside class or create here)
        const getCurrentDateTime = () => {
            const now = new Date();
            // Convert to local time and format for MySQL
            const localDateTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
            return localDateTime.toISOString().slice(0, 19).replace('T', ' ');
        };
        
        const approvalDateTime = getCurrentDateTime();
        
        // FIXED: Get username properly
        const userName = document.getElementById('user-name')?.textContent.trim() || 'System';
        
        console.log('📝 Approval data:', {
            work_order_no: workOrderNo,
            approved: approved ? 'yes' : 'no',
            approved_by: userName,
            approved_date: approved ? approvalDateTime : null
        });
        
        // FIXED: Use the same API base URL pattern
        const apiBaseUrl = window.jobOrderManager?.apiBaseUrl || 'http://localhost:3001/api';
        
        const response = await fetch(`${apiBaseUrl}/update-approval`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                work_order_no: workOrderNo,
                approved: approved ? 'yes' : 'no',
                approved_by: userName,
                approved_date: approved ? approvalDateTime : null // Only set date if approving
            })
        });

        console.log('📡 API Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API Error response:', errorText);
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ API Success response:', result);

        // FIXED: Check if jobOrderManager exists before calling refresh
        if (window.jobOrderManager) {
            await window.jobOrderManager.refresh();
            console.log('🔄 Data refreshed');
        } else {
            console.warn('⚠️ jobOrderManager not found, manual page refresh may be needed');
        }
        
        // Show success message
        const message = `Job order ${workOrderNo} has been ${approved ? 'approved' : 'rejected'} successfully.`;
        
        // FIXED: Use the class method if available, otherwise use alert
        if (window.jobOrderManager && window.jobOrderManager.showSuccessMessage) {
            window.jobOrderManager.showSuccessMessage(message);
        } else {
            alert(message);
        }
        
        console.log('✅ Approval update completed successfully');
        
    } catch (error) {
        console.error('💥 Error updating approval:', error);
        console.error('💥 Error stack:', error.stack);
        
        // FIXED: Use the class method if available, otherwise use alert
        const errorMessage = `Failed to update approval status: ${error.message}`;
        if (window.jobOrderManager && window.jobOrderManager.showError) {
            window.jobOrderManager.showError(errorMessage);
        } else {
            alert(errorMessage);
        }
    }
}

// Initialize the manager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.jobOrderManager = new ITJobOrderManager();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ITJobOrderManager;
}