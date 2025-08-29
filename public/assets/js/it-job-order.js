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
            <td colspan="13" class="text-center text-danger">
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
            <td colspan="13" class="text-center">
                <i class="mdi mdi-loading mdi-spin"></i> Loading job orders...
            </td>
        </tr>
    `;
}

// Enhanced DOMContentLoaded event
document.addEventListener('DOMContentLoaded', function() {
    // Show loading state
    showLoadingState();
    
    // Load job orders
    loadJobOrders();
    
    // Set up table interactions
    const table = document.querySelector('.scrollable-table');
    
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