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

// Function to create a table row for each job order
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
            <div class="btn-group" role="group">
                <button class="btn btn-sm btn-success" title="Mark as Done" onclick="openActionModal('${order.work_order_no || `WO-${order.id}`}', ${order.id}, 'done')">
                    <i class="bi bi-check-circle"></i> Done
                </button>
                <button class="btn btn-sm btn-warning" title="Put on Hold" onclick="openActionModal('${order.work_order_no || `WO-${order.id}`}', ${order.id}, 'hold')">
                    <i class="bi bi-pause-circle"></i> Hold
                </button>
            </div>
        </td>
        <td class="fixed-column">
            ${createAttachmentButton(order.work_order_no || `WO-${order.id}`, order.attachment_path)}
        </td>
    `;
    
    return row;
}

// Function to create status badge
function createStatusBadge(status) {
    const statusClass = `status-${status?.toLowerCase() || 'pending'}`;
    return `<span class="status-badge ${statusClass}">${status || 'Pending'}</span>`;
}

// Function to create priority badge
function createPriorityBadge(priority) {
    const priorityClass = `priority-${priority?.toLowerCase() || 'low'}`;
    return `<span class="priority-badge ${priorityClass}">${priority || 'LOW'}</span>`;
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

// Open action modal
function openActionModal(workOrderNo, orderId, action) {
    currentWorkOrder = workOrderNo;
    currentOrderId = orderId;
    currentAction = action;
    
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

// Confirm action
function confirmAction() {
    const form = document.getElementById('actionForm');
    const reasonInput = document.getElementById('reasonInput');
    const actionTakenInput = document.getElementById('actionTakenInput');
    const notesInput = document.getElementById('notesInput');
    
    // Validate required fields
    if (!reasonInput.value.trim() || !actionTakenInput.value.trim()) {
        form.classList.add('was-validated');
        return;
    }
    
    // Prepare data to send
    const actionData = {
        id: currentOrderId,
        workOrderNo: currentWorkOrder,
        action: currentAction,
        reason: reasonInput.value.trim(),
        action_taken: actionTakenInput.value.trim(),
        notes: notesInput.value.trim(),
        status: currentAction === 'done' ? 'Completed' : 'On Hold',
        tech: 'Current User', // You should get this from your auth system
        date_resolved: new Date().toISOString()
    };
    
    // Process the action
    processAction(actionData);
}

// Process the action (API call to backend)
async function processAction(actionData) {
    const confirmBtn = document.getElementById('confirmActionBtn');
    const originalText = confirmBtn.innerHTML;
    
    // Show loading state
    confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing...';
    confirmBtn.disabled = true;
    
    try {
        // Make API call to update the job order
        const response = await fetch(`http://localhost:3001/api/it-job-order/${actionData.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(actionData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to update job order');
        }
        
        const result = await response.json();
        
        // Hide modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('actionModal'));
        modal.hide();
        
        // Show success toast
        const toastMessage = document.getElementById('toastMessage');
        toastMessage.textContent = `Work Order ${actionData.workOrderNo} has been ${actionData.action === 'done' ? 'completed' : 'put on hold'} successfully!`;
        
        const toast = new bootstrap.Toast(document.getElementById('successToast'));
        toast.show();
        
        // Refresh the table to show updated data
        loadJobOrders();
        
    } catch (error) {
        console.error('Error processing action:', error);
        
        // Show error toast
        const toastMessage = document.getElementById('toastMessage');
        toastMessage.textContent = `Failed to update Work Order ${actionData.workOrderNo}. Please try again.`;
        
        // Change toast to error style
        const toastHeader = document.querySelector('#successToast .toast-header');
        toastHeader.className = 'toast-header bg-danger text-white';
        toastHeader.querySelector('i').className = 'bi bi-x-circle me-2';
        toastHeader.querySelector('strong').textContent = 'Error';
        
        const toast = new bootstrap.Toast(document.getElementById('successToast'));
        toast.show();
        
        // Reset toast style after showing
        setTimeout(() => {
            toastHeader.className = 'toast-header bg-success text-white';
            toastHeader.querySelector('i').className = 'bi bi-check-circle me-2';
            toastHeader.querySelector('strong').textContent = 'Success';
        }, 5000);
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