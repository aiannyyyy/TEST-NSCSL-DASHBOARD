// Global variables for modal state
let currentWorkOrder = null;
let currentOrderId = null;
let currentAction = null;

// Function to fetch and populate job orders
async function loadJobOrders() {
    try {
        const response = await fetch('http://localhost:3001/api/it-job-order');
        const jobOrders = await response.json();
        
        const tableBody = document.getElementById('jobOrdersTableBody');
        tableBody.innerHTML = ''; // Clear existing content
        
        jobOrders.forEach(order => {
            const row = createJobOrderRow(order);
            tableBody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error loading job orders:', error);
        showErrorMessage('Failed to load job orders');
    }
}

// Updated createJobOrderRow function to use the new action buttons logic
function createJobOrderRow(order) {
    const row = document.createElement('tr');
    
    // Format dates
    const dateIssued = formatDate(order.date_issued);
    const dateResolved = order.date_resolved ? formatDate(order.date_resolved) : '-';
    const approvedDate = order.approved_date ? formatDate(order.approved_date) : '-';
    
    // Create requested column (requester + date)
    const requestedInfo = `${order.requester || 'Unknown'}<br><small>${dateIssued}</small>`;
    
    // Create resolved column (tech + date)
    const resolvedInfo = order.tech ? 
        `${order.tech}<br><small>${dateResolved}</small>` : 
        '<span class="text-muted">Not assigned</span>';
    
    // Create approved column (approved_by + date)
    const approvedInfo = order.approved_by ? 
        `${order.approved_by}<br><small>${approvedDate}</small>` : 
        '<span class="text-muted">Pending approval</span>';
    
    row.innerHTML = `
        <td><strong>${order.work_order_no || `WO-${order.id}`}</strong></td>
        <td>${order.title || '-'}</td>
        <td class="text-wrap">${order.description || '-'}</td>
        <td>${requestedInfo}</td>
        <td>${order.department || '-'}</td>
        <td>${createStatusBadge(order.status)}</td>
        <td>${order.type || '-'}</td>
        <td>${createPriorityBadge(order.priority)}</td>
        <td>${resolvedInfo}</td>
        <td class="text-wrap">${order.reason || '-'}</td>
        <td>${approvedInfo}</td>
        <td class="text-wrap">${order.action_taken || '-'}</td>
        <td>
            ${createActionButtons(order)}
        </td>
        <td class="fixed-column">
            ${createAttachmentButton(order.work_order_no || `WO-${order.id}`, order.attachment_path)}
        </td>
    `;
    
    return row;
}

// Function to create status badge
function createStatusBadge(status) {
    const statusLower = status?.toLowerCase() || 'pending';
    const statusClass = `status-${statusLower}`;
    
    // Handle different status types with appropriate styling
    let badgeClass = 'status-badge';
    let displayText = status || 'Pending';
    
    switch (statusLower) {
        case 'completed':
        case 'closed':
            badgeClass += ' bg-success text-white';
            break;
        case 'on hold':
        case 'hold':
            badgeClass += ' bg-warning text-dark';
            break;
        case 'pending':
        case 'open':
            badgeClass += ' bg-secondary text-white';
            break;
        case 'in progress':
        case 'assigned':
            badgeClass += ' bg-primary text-white';
            break;
        case 'cancelled':
        case 'rejected':
            badgeClass += ' bg-danger text-white';
            break;
        default:
            badgeClass += ' bg-light text-dark';
    }
    
    return `<span class="${badgeClass} ${statusClass}">${displayText}</span>`;
}

// Updated Priority Badge function with proper handling
function createPriorityBadge(priority) {
    if (!priority) {
        return '<span class="priority-badge priority-default">LOW</span>';
    }
    
    const priorityLower = priority.toLowerCase();
    let priorityClass = 'priority-default';
    let displayText = priority.toUpperCase();
    
    // Handle variations of HIGH priority
    if (priorityLower.includes('high') || priorityLower.includes('urgent')) {
        priorityClass = 'priority-high';
    } 
    // Handle variations of MEDIUM priority - includes "mid"
    else if (priorityLower.includes('medium') || priorityLower.includes('normal') || 
             priorityLower.includes('mid') || priorityLower === 'mid') {
        priorityClass = 'priority-medium';
    } 
    // Handle variations of LOW priority
    else if (priorityLower.includes('low')) {
        priorityClass = 'priority-low';
    }
    
    return `<span class="priority-badge ${priorityClass}">${displayText}</span>`;
}

// Function to create action buttons based on status
function createActionButtons(order) {
    const status = order.status?.toLowerCase() || 'pending';
    const workOrderNo = order.work_order_no || `WO-${order.id}`;
    const orderId = order.id;
    const dateIssued = order.date_issued;
    
    // If status is closed/completed, show blank
    if (status === 'closed' || status === 'completed') {
        return '';
    }
    
    // If status is on hold, show only Done button
    if (status === 'hold' || status === 'on hold') {
        return `
            <div class="btn-group" role="group">
                <button class="btn btn-sm btn-success" title="Mark as Done" onclick="openActionModal('${workOrderNo}', ${orderId}, 'done', '${dateIssued}')">
                    <i class="bi bi-check-circle"></i> Done
                </button>
                <span class="text-warning small ms-2">
                    <i class="bi bi-pause-circle-fill"></i>
                    On Hold
                </span>
            </div>
        `;
    }
    
    // For all other statuses (pending, in progress, etc.), show both buttons
    return `
        <div class="btn-group" role="group">
            <button class="btn btn-sm btn-success" title="Mark as Done" onclick="openActionModal('${workOrderNo}', ${orderId}, 'done', '${dateIssued}')">
                <i class="bi bi-check-circle"></i> Done
            </button>
            <button class="btn btn-sm btn-warning" title="Put on Hold" onclick="openActionModal('${workOrderNo}', ${orderId}, 'hold', '${dateIssued}')">
                <i class="bi bi-pause-circle"></i> Hold
            </button>
        </div>
    `;
}


// Function to create attachment button
function createAttachmentButton(workOrder, attachmentPath) {
    if (attachmentPath) {
        return `
            <button class="btn-attachment" onclick="viewAttachment('${workOrder}', '${attachmentPath}')">
                <i class="mdi mdi-paperclip"></i> View
            </button>
        `;
    } else {
        return `
            <button class="btn-attachment" disabled style="opacity: 0.5;">
                <i class="mdi mdi-paperclip"></i> No File
            </button>
        `;
    }
}

// Function to format dates
function formatDate(dateString) {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    return date.toLocaleDateString('en-US', options);
}

// Function to calculate time elapsed in hours
function calculateTimeElapsed(dateIssued, dateResolved) {
    if (!dateIssued || !dateResolved) return null;
    
    const issued = new Date(dateIssued);
    const resolved = new Date(dateResolved);
    const diffInMs = resolved - issued;
    const diffInHours = Math.round(diffInMs / (1000 * 60 * 60) * 100) / 100; // Round to 2 decimal places
    
    return diffInHours;
}

// Function to get current username (updated with better error handling)
function getCurrentUsername() {
    // Try multiple ways to get the username
    const userNameElement = document.getElementById('user-name');
    if (userNameElement && userNameElement.textContent.trim()) {
        return userNameElement.textContent.trim();
    }
    
    // Fallback: check for other common username elements
    const userDisplayElement = document.querySelector('.user-display, .username, [data-username]');
    if (userDisplayElement && userDisplayElement.textContent.trim()) {
        return userDisplayElement.textContent.trim();
    }
    
    // Last resort: prompt user or use default
    return prompt('Please enter your username:') || 'System User';
}

// Function to handle attachment viewing (updated)
function viewAttachment(workOrder, attachmentPath) {
    if (attachmentPath) {
        // Open the actual file
        window.open(`/uploads/${attachmentPath}`, '_blank');
    } else {
        alert(`No attachment available for ${workOrder}`);
    }
}

// Function to show error messages
function showErrorMessage(message) {
    const tableBody = document.getElementById('jobOrdersTableBody');
    tableBody.innerHTML = `
        <tr>
            <td colspan="14" class="text-center text-danger">
                <i class="mdi mdi-alert-circle"></i> ${message}
            </td>
        </tr>
    `;
}

// Function to show loading state
function showLoadingState() {
    const tableBody = document.getElementById('jobOrdersTableBody');
    tableBody.innerHTML = `
        <tr>
            <td colspan="14" class="text-center">
                <i class="mdi mdi-loading mdi-spin"></i> Loading job orders...
            </td>
        </tr>
    `;
}

// Open action modal (updated to include date_issued)
function openActionModal(workOrderNo, orderId, action, dateIssued = null) {
    currentWorkOrder = workOrderNo;
    currentOrderId = orderId;
    currentAction = action;
    
    // Store date_issued for time calculation
    window.currentDateIssued = dateIssued;
    
    // Update modal content based on action
    const modalTitle = document.getElementById('modalActionTitle');
    const actionType = document.getElementById('modalActionType');
    const confirmBtn = document.getElementById('confirmActionBtn');
    const confirmBtnText = document.getElementById('confirmButtonText');
    
    if (action === 'done') {
        modalTitle.innerHTML = '<i class="bi bi-check-circle me-2"></i>Complete Work Order';
        actionType.value = 'Mark as Done';
        confirmBtn.className = 'btn btn-success';
        confirmBtnText.textContent = 'Mark as Done';
    } else if (action === 'hold') {
        modalTitle.innerHTML = '<i class="bi bi-pause-circle me-2"></i>Put Work Order on Hold';
        actionType.value = 'Put on Hold';
        confirmBtn.className = 'btn btn-warning';
        confirmBtnText.textContent = 'Put on Hold';
    }
    
    // Set work order number
    document.getElementById('modalWorkOrder').value = workOrderNo;
    
    // Clear form
    document.getElementById('actionForm').reset();
    document.getElementById('modalActionType').value = actionType.value;
    document.getElementById('modalWorkOrder').value = workOrderNo;
    
    // Remove validation classes
    const form = document.getElementById('actionForm');
    form.classList.remove('was-validated');
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('actionModal'));
    modal.show();
}

// Confirm action (updated to match backend requirements)
function confirmAction() {
    const form = document.getElementById('actionForm');
    const reasonInput = document.getElementById('reasonInput');
    const actionTakenInput = document.getElementById('actionTakenInput');
    
    // Validate required fields
    if (!reasonInput.value.trim() || !actionTakenInput.value.trim()) {
        form.classList.add('was-validated');
        return;
    }
    
    // Get current username
    const currentUser = getCurrentUsername();
    
    // Prepare data to send (matching backend route structure)
    // Note: time_elapsed is auto-calculated by database, so we don't send it
    const actionData = {
        work_order_no: currentWorkOrder,
        tech: currentUser,
        reason: reasonInput.value.trim(),
        action_taken: actionTakenInput.value.trim()
    };
    
    // Process the action
    processAction(actionData);
}

// Process the action (updated API call to match backend route)
async function processAction(actionData) {
    const confirmBtn = document.getElementById('confirmActionBtn');
    const originalText = confirmBtn.innerHTML;
    
    // Show loading state
    confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing...';
    confirmBtn.disabled = true;
    
    try {
        let endpoint;
        let method;
        
        // Determine endpoint based on action
        if (currentAction === 'done') {
            endpoint = 'http://localhost:3001/api/work-done';
            method = 'POST';
        } else if (currentAction === 'hold') {
            // You'll need to create a similar route for hold action
            // For now, using the same endpoint but you should create a separate one
            endpoint = 'http://localhost:3001/api/work-hold';
            method = 'POST';
        }
        
        // Make API call to update the job order
        const response = await fetch(endpoint, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(actionData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update job order');
        }
        
        const result = await response.json();
        
        // Hide modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('actionModal'));
        modal.hide();
        
        // Show success toast
        showToast(
            `Work Order ${actionData.work_order_no} has been ${currentAction === 'done' ? 'completed' : 'put on hold'} successfully!`,
            'success'
        );
        
        // Refresh the table to show updated data
        loadJobOrders();
        
    } catch (error) {
        console.error('Error processing action:', error);
        
        // Show error toast
        showToast(
            `Failed to update Work Order ${actionData.work_order_no}. Error: ${error.message}`,
            'error'
        );
        
    } finally {
        // Reset button
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
    }
}

// Show success/error toast
function showToast(message, type = 'success') {
    const toastMessage = document.getElementById('toastMessage');
    const toastHeader = document.querySelector('#successToast .toast-header');
    
    toastMessage.textContent = message;
    
    if (type === 'error') {
        toastHeader.className = 'toast-header bg-danger text-white';
        toastHeader.querySelector('i').className = 'bi bi-x-circle me-2';
        toastHeader.querySelector('strong').textContent = 'Error';
    } else {
        toastHeader.className = 'toast-header bg-success text-white';
        toastHeader.querySelector('i').className = 'bi bi-check-circle me-2';
        toastHeader.querySelector('strong').textContent = 'Success';
    }
    
    const toast = new bootstrap.Toast(document.getElementById('successToast'));
    toast.show();
}

// Enhanced DOMContentLoaded event
document.addEventListener('DOMContentLoaded', function() {
    // Show loading state
    showLoadingState();
    
    // Load job orders
    loadJobOrders();
    
    // Set up table interactions
    const table = document.querySelector('.scrollable-table');
    
    if (table) {
        table.addEventListener('click', function(e) {
            if (e.target.tagName === 'TD' && !e.target.classList.contains('fixed-column')) {
                const row = e.target.parentNode;
                const workOrderElement = row.querySelector('td:first-child strong');
                if (workOrderElement) {
                    const workOrder = workOrderElement.textContent;
                    console.log(`Clicked on ${workOrder}`);
                    // You can add more interaction logic here
                    // Example: showJobOrderDetails(workOrder);
                }
            }
        });
    }
    
    // Add refresh functionality (optional)
    const refreshButton = document.getElementById('refreshButton');
    if (refreshButton) {
        refreshButton.addEventListener('click', function() {
            showLoadingState();
            loadJobOrders();
        });
    }
});

// Function to refresh table data
function refreshJobOrders() {
    showLoadingState();
    loadJobOrders();
}

// Optional: Auto-refresh every 5 minutes
setInterval(loadJobOrders, 300000);