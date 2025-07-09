document.addEventListener('DOMContentLoaded', () => {
    const visitTable = document.getElementById('visitTable');
    let currentStatusData = null;
    let allEndorsements = []; // Store all data for filtering

    if (!visitTable) {
        console.error('visitTable element not found in DOM');
        return;
    }

    // Load all endorsements initially
    loadEndorsements();

    function loadEndorsements() {
        fetch('http://localhost:3001/api/pdo-endorsement')
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.json();
            })
            .then(result => {
                if (result.success && Array.isArray(result.data) && result.data.length > 0) {
                    allEndorsements = result.data;
                    renderTable(allEndorsements);
                    attachEventListeners();
                } else {
                    visitTable.innerHTML = `<tr><td colspan="9" class="text-center text-muted">No endorsements found</td></tr>`;
                }
            })
            .catch(error => {
                console.error('Error fetching endorsements:', error);
                visitTable.innerHTML = `<tr><td colspan="9" class="text-center text-danger">Failed to load data</td></tr>`;
            });
    }

    function renderTable(data) {
        visitTable.innerHTML = '';
        
        if (data.length === 0) {
            visitTable.innerHTML = `<tr><td colspan="9" class="text-center text-muted">No matching endorsements found</td></tr>`;
            return;
        }

        data.forEach(item => {
            const fullName = `${item.fname} ${item.lname}`;
            const dateTime = formatDateTime(item.date_endorsed);

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><span class="badge bg-light text-dark">${item.labno}</span></td>
                <td><div class="fw-semibold">${fullName}</div></td>
                <td class="text-center"><span class="badge bg-secondary">${item.facility_code}</span></td>
                <td>
                    <div class="text-truncate" style="max-width: 150px;" title="${item.facility_name}">
                        ${item.facility_name}
                    </div>
                </td>
                <td class="text-center">${getTestResultBadge(item.test_result)}</td>
                <td>
                    <span class="text-truncate d-inline-block" style="max-width: 120px;" title="${item.remarks}">
                        ${item.remarks}
                    </span>
                </td>
                <td class="text-center">
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-outline-primary view-btn" title="View Attachment" data-id="${item.id}">
                            <i class="mdi mdi-eye"></i>
                        </button>
                    </div>
                </td>
                <td class="text-center">
                    <small>${dateTime}</small><br>
                    <small class="text-muted">${item.endorsed_by}</small>
                </td>
                <td class="text-center">
                    ${getStatusButton(item)}
                </td>
            `;
            visitTable.appendChild(row);
        });
    }

    function filterData() {
        const searchValue = document.getElementById('searchLabno').value.toLowerCase();
        const statusFilter = document.querySelector('input[name="statusOptions"]:checked').value;
        
        let filteredData = allEndorsements;

        // Filter by status
        if (statusFilter !== 'all') {
            filteredData = filteredData.filter(item => {
                // Convert database status to string format
                let itemStatus;
                if (item.status === 0 || item.status === '0') {
                    itemStatus = 'closed';
                } else if (item.status === 1 || item.status === '1') {
                    itemStatus = 'open';
                } else if (item.status === null || item.status === undefined || item.status === '') {
                    itemStatus = 'open'; // Default to 'open' for null/undefined
                } else if (typeof item.status === 'string') {
                    itemStatus = item.status.toLowerCase();
                } else {
                    itemStatus = 'open'; // Default fallback
                }
                return itemStatus === statusFilter;
            });
        }

        // Filter by lab number
        if (searchValue) {
            filteredData = filteredData.filter(item => 
                item.labno.toLowerCase().includes(searchValue)
            );
        }

        renderTable(filteredData);
        attachEventListeners();
    }

    function attachEventListeners() {
        // View button listeners
        document.querySelectorAll('.view-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                window.open(`http://localhost:3001/api/pdo-endorsement/view/${id}`, '_blank');
            });
        });

        // Status button listeners
        document.querySelectorAll('.status-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const labno = e.currentTarget.getAttribute('data-labno');
                const patientName = e.currentTarget.getAttribute('data-patient');
                const currentStatus = e.currentTarget.getAttribute('data-status');
                
                showStatusModal({ id, labno, patientName, status: currentStatus });
            });
        });
    }

    // Search functionality
    document.getElementById('searchLabno').addEventListener('input', filterData);

    // Status filter functionality
    document.querySelectorAll('input[name="statusOptions"]').forEach(radio => {
        radio.addEventListener('change', filterData);
    });

    function showStatusModal(item) {
        currentStatusData = item;
        const modal = new bootstrap.Modal(document.getElementById('statusConfirmationModal'));

        document.getElementById('modalLabNumber').textContent = item.labno;
        document.getElementById('modalPatientName').textContent = item.patientName;

        const modalMessage = document.getElementById('modalMessage');
        const confirmButton = document.getElementById('confirmStatusChange');

        const currentStatus = typeof item.status === 'string' ? item.status.toLowerCase() : 'open';

        if (currentStatus === 'open') {
            modalMessage.innerHTML = `
                <div class="alert alert-warning">
                    <i class="mdi mdi-lock me-2"></i>
                    Are you sure you want to <strong>close</strong> this case?
                </div>
                <small class="text-muted">This action will mark the case as closed and may restrict further modifications.</small>
            `;
            confirmButton.innerHTML = '<i class="mdi mdi-lock me-1"></i>Close Case';
            confirmButton.className = 'btn btn-warning';
        } else {
            modalMessage.innerHTML = `
                <div class="alert alert-success">
                    <i class="mdi mdi-lock-open-variant me-2"></i>
                    Are you sure you want to <strong>reopen</strong> this case?
                </div>
                <small class="text-muted">This action will mark the case as open and allow further modifications.</small>
            `;
            confirmButton.innerHTML = '<i class="mdi mdi-lock-open-variant me-1"></i>Reopen Case';
            confirmButton.className = 'btn btn-success';
        }

        modal.show();
    }

    document.getElementById('confirmStatusChange').addEventListener('click', () => {
        if (currentStatusData) {
            const currentStatus = typeof currentStatusData.status === 'string' ? currentStatusData.status.toLowerCase() : 'open';
            const newStatus = currentStatus === 'open' ? 'closed' : 'open';

            fetch(`http://localhost:3001/api/pdo-endorsement/update-status/${currentStatusData.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus })
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    // Update the local data and re-render instead of full page reload
                    const itemIndex = allEndorsements.findIndex(item => item.id == currentStatusData.id);
                    if (itemIndex !== -1) {
                        allEndorsements[itemIndex].status = newStatus;
                        filterData(); // Re-apply current filters
                    }
                    showToast(`Case ${currentStatusData.labno} has been ${newStatus}ed successfully.`);
                } else {
                    showToast('Failed to update status. Please try again.', 'error');
                }
            })
            .catch(error => {
                console.error('Error updating status:', error);
                showToast('Failed to update status. Please try again.', 'error');
            });

            const modal = bootstrap.Modal.getInstance(document.getElementById('statusConfirmationModal'));
            modal.hide();
            currentStatusData = null;
        }
    });

    function getStatusButton(item) {
        // Convert database status to string format
        let status;
        if (item.status === 0 || item.status === '0') {
            status = 'closed';
        } else if (item.status === 1 || item.status === '1') {
            status = 'open';
        } else if (item.status === null || item.status === undefined || item.status === '') {
            status = 'open'; // Default to 'open' for null/undefined
        } else if (typeof item.status === 'string') {
            status = item.status.toLowerCase();
        } else {
            status = 'open'; // Default fallback
        }
        
        const fullName = `${item.fname} ${item.lname}`;

        if (status === 'open') {
            return `
                <button class="btn btn-sm btn-outline-success status-btn" 
                        data-id="${item.id}" 
                        data-labno="${item.labno}"
                        data-patient="${fullName}"
                        data-status="open"
                        title="Click to close case">
                    <i class="mdi mdi-lock-open-variant me-1"></i>Open
                </button>
            `;
        } else {
            return `
                <button class="btn btn-sm btn-outline-danger status-btn" 
                        data-id="${item.id}" 
                        data-labno="${item.labno}"
                        data-patient="${fullName}"
                        data-status="closed"
                        title="Click to reopen case">
                    <i class="mdi mdi-lock me-1"></i>Closed
                </button>
            `;
        }
    }

    function formatDateTime(dateStr) {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleString('en-PH', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    }

    function getTestResultBadge(result) {
        let badgeClass = 'bg-secondary';
        if (typeof result === 'string') {
            const val = result.toLowerCase();
            if (val === 'positive') badgeClass = 'bg-success';
            else if (val === 'negative') badgeClass = 'bg-danger';
            else if (val === 'pending') badgeClass = 'bg-warning text-dark';
        }
        return `<span class="badge ${badgeClass}">${result || 'N/A'}</span>`;
    }

    function showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toastContainer') || createToastContainer();
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.setAttribute('role', 'alert');

        const iconClass = type === 'success' ? 'mdi-check-circle text-success' : 'mdi-alert-circle text-danger';
        const titleText = type === 'success' ? 'Success' : 'Error';

        toast.innerHTML = `
            <div class="toast-header">
                <i class="mdi ${iconClass} me-2"></i>
                <strong class="me-auto">${titleText}</strong>
                <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">${message}</div>
        `;

        toastContainer.appendChild(toast);
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();

        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }

    function createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container position-fixed top-0 end-0 p-3';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
        return container;
    }
});