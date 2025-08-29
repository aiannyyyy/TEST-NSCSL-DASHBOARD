// IT Job Order Management Script
class ITJobOrderManager {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3001/api'; // Adjust this to your API base URL
        this.init();
    }

    init() {
        this.loadJobOrders();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Add refresh button functionality if needed
        document.addEventListener('DOMContentLoaded', () => {
            this.loadJobOrders();
        });

        // Setup filter functionality if you have filters
        const departmentFilter = document.getElementById('departmentFilter');
        const statusFilter = document.getElementById('statusFilter');
        
        if (departmentFilter) {
            departmentFilter.addEventListener('change', () => this.loadJobOrders());
        }
        
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.loadJobOrders());
        }
    }

    async loadJobOrders() {
        try {
            // Get filter values
            const department = this.getFilterValue('departmentFilter');
            const status = this.getFilterValue('statusFilter');

            // Build query parameters
            const params = new URLSearchParams();
            if (department) params.append('department', department);
            if (status) params.append('status', status);

            // Fetch data from API
            const response = await fetch(`${this.apiBaseUrl}/it-job-order-bydept?${params}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const jobOrders = await response.json();
            
            // Separate pending and closed orders
            const pendingOrders = jobOrders.filter(order => 
                order.status === 'Pending' || order.status === 'In Progress' || order.status === 'Queued'
            );
            const closedOrders = jobOrders.filter(order => 
                order.status === 'Closed' || order.status === 'Completed' || order.status === 'Resolved'
            );

            // Populate tables
            this.populateTable('pending-table-body', pendingOrders);
            this.populateTable('closed-table-body', closedOrders);

        } catch (error) {
            console.error('Error loading job orders:', error);
            this.showError('Failed to load job orders. Please try again.');
        }
    }

    getFilterValue(filterId) {
        const element = document.getElementById(filterId);
        return element ? element.value : null;
    }

    populateTable(tableBodyId, orders) {
        const tbody = document.querySelector(`#${tableBodyId}`) || 
                     document.querySelector(`[data-table="${tableBodyId}"]`) ||
                     this.findTableBody(tableBodyId);
        
        if (!tbody) {
            console.warn(`Table body with ID '${tableBodyId}' not found`);
            return;
        }

        // Clear existing rows
        tbody.innerHTML = '';

        // Add rows for each order
        orders.forEach(order => {
            const row = this.createTableRow(order);
            tbody.appendChild(row);
        });

        // Show message if no data
        if (orders.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="13" class="text-center py-4">
                    <em>No job orders found</em>
                </td>
            `;
            tbody.appendChild(row);
        }
    }

    findTableBody(identifier) {
        // Try to find table body by looking for tables and checking context
        const tables = document.querySelectorAll('table tbody');
        const pendingSection = document.querySelector('h5').textContent.includes('Pending');
        
        if (identifier.includes('pending')) {
            return tables[0]; // First table for pending
        } else if (identifier.includes('closed')) {
            return tables[1]; // Second table for closed
        }
        
        return tables[0]; // Fallback
    }

    createTableRow(order) {
        const row = document.createElement('tr');
        
        // Format dates
        const requestedDate = this.formatDate(order.date_issued);
        const resolvedDate = this.formatDate(order.date_resolved);
        const approvedDate = this.formatDate(order.approved_date);
        
        // Create requested info (requester + date)
        const requestedInfo = order.requester ? 
            `${order.requester}<br><small class="text-muted">${requestedDate}</small>` : 
            requestedDate;
            
        // Create resolved info (tech + date)
        const resolvedInfo = order.tech && resolvedDate ? 
            `${order.tech}<br><small class="text-muted">${resolvedDate}</small>` : 
            (resolvedDate || '-');
            
        // Create approved info (approved_by + date)
        const approvedInfo = order.approved_by ? 
            `${order.approved_by}<br><small class="text-muted">${approvedDate || ''}</small>` : 
            (order.approved_date ? '✅ Yes' : '❌ No');

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
            <td class="text-wrap">${order.reason || '-'}</td>
            <td>${approvedInfo}</td>
            <td class="text-wrap">${order.action_taken || '-'}</td>
            <td class="fixed-column">
                ${this.createAttachmentButton(order)}
            </td>
        `;

        return row;
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';
        
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }

    createStatusBadge(status) {
        if (!status) return '<span class="status-badge">-</span>';
        
        const statusClass = this.getStatusClass(status);
        return `<span class="status-badge ${statusClass}">${status}</span>`;
    }

    getStatusClass(status) {
        const statusLower = status.toLowerCase();
        if (statusLower.includes('pending') || statusLower.includes('queued')) {
            return 'status-pending';
        } else if (statusLower.includes('progress') || statusLower.includes('active')) {
            return 'status-in-progress';
        } else if (statusLower.includes('completed') || statusLower.includes('closed') || statusLower.includes('resolved')) {
            return 'status-completed';
        }
        return 'status-default';
    }

    createPriorityBadge(priority) {
        if (!priority) return '<span class="priority-badge">-</span>';
        
        const priorityClass = this.getPriorityClass(priority);
        return `<span class="priority-badge ${priorityClass}">${priority}</span>`;
    }

    getPriorityClass(priority) {
        const priorityLower = priority.toLowerCase();
        if (priorityLower.includes('high') || priorityLower.includes('urgent')) {
            return 'priority-high';
        } else if (priorityLower.includes('medium') || priorityLower.includes('normal')) {
            return 'priority-medium';
        } else if (priorityLower.includes('low')) {
            return 'priority-low';
        }
        return 'priority-default';
    }

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

    showError(message) {
        // Create or update error message
        let errorDiv = document.getElementById('error-message');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'error-message';
            errorDiv.className = 'alert alert-danger alert-dismissible fade show';
            
            const contentWrapper = document.querySelector('.content-wrapper');
            if (contentWrapper) {
                contentWrapper.insertBefore(errorDiv, contentWrapper.firstChild);
            }
        }

        errorDiv.innerHTML = `
            <strong>Error:</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
    }

    // Public method to refresh data
    refresh() {
        this.loadJobOrders();
    }

    // Public method to filter by department
    filterByDepartment(department) {
        const departmentFilter = document.getElementById('departmentFilter');
        if (departmentFilter) {
            departmentFilter.value = department;
        }
        this.loadJobOrders();
    }

    // Public method to filter by status
    filterByStatus(status) {
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.value = status;
        }
        this.loadJobOrders();
    }
}

// Global function for attachment viewing (used by the onclick handlers)
function viewAttachment(workOrderNo, attachmentPath) {
    if (attachmentPath) {
        // Open attachment in new window/tab
        window.open(`/attachments/${attachmentPath}`, '_blank');
    } else {
        alert(`No attachment available for ${workOrderNo}`);
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