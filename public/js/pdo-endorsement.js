document.addEventListener('DOMContentLoaded', () => {
    const visitTable = document.getElementById('visitTable');
    let currentStatusData = null;
    let allEndorsements = [];
    let pollingInterval = null;
    let isPollingActive = true;
    const POLLING_INTERVAL = 3 * 60 * 1000; // 3 minutes in milliseconds

    if (!visitTable) {
        console.error('visitTable element not found in DOM');
        return;
    }

    // Initial load
    loadEndorsements();
    
    // Start polling
    startPolling();

    function loadEndorsements() {
        fetch('http://localhost:3001/api/pdo-endorsement')
            .then(response => response.json())
            .then(result => {
                if (result.success && Array.isArray(result.data)) {
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

    function startPolling() {
        if (pollingInterval) {
            clearInterval(pollingInterval);
        }
        
        pollingInterval = setInterval(() => {
            if (isPollingActive) {
                console.log('Auto-refreshing data...');
                loadEndorsements();
            }
        }, POLLING_INTERVAL);
    }

    function stopPolling() {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
    }

    function pausePolling() {
        isPollingActive = false;
    }

    function resumePolling() {
        isPollingActive = true;
    }

    // Pause polling when user is interacting with modals
    document.querySelectorAll('[data-bs-toggle="modal"]').forEach(trigger => {
        trigger.addEventListener('click', pausePolling);
    });

    // Resume polling when modals are closed
    document.addEventListener('hidden.bs.modal', () => {
        resumePolling();
    });

    // Pause polling when page is not visible (user switched tabs)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            pausePolling();
        } else {
            resumePolling();
        }
    });

    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
        stopPolling();
    });

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
                <td><div class="text-truncate" style="max-width: 150px;" title="${item.facility_name}">${item.facility_name}</div></td>
                <td class="text-center">${getTestResultBadge(item.test_result)}</td>
                <td><span class="text-truncate d-inline-block" style="max-width: 120px;" title="${item.remarks}">${item.remarks}</span></td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary view-btn" title="View Attachment" data-id="${item.id}">
                        <i class="mdi mdi-eye"></i>
                    </button>
                </td>
                <td class="text-center">
                    <small>${dateTime}</small><br>
                    <small class="text-muted">${item.endorsed_by}</small>
                </td>
                <td class="text-center">${getStatusButton(item)}</td>
            `;
            visitTable.appendChild(row);
        });
    }

    function filterData() {
        const searchValue = document.getElementById('searchLabno').value.toLowerCase();
        const statusFilter = document.querySelector('input[name="statusOptions"]:checked').value;
        let filtered = allEndorsements;

        if (statusFilter !== 'all') {
            filtered = filtered.filter(item => normalizeStatus(item.status) === statusFilter);
        }

        if (searchValue) {
            filtered = filtered.filter(item => item.labno.toLowerCase().includes(searchValue));
        }

        renderTable(filtered);
        attachEventListeners();
    }

    function normalizeStatus(status) {
        if (status === 0 || status === '0') return 'closed';
        if (status === 1 || status === '1') return 'open';
        if (!status) return 'open';
        return typeof status === 'string' ? status.toLowerCase() : 'open';
    }

    function attachEventListeners() {
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                const id = e.currentTarget.dataset.id;
                window.open(`http://localhost:3001/api/pdo-endorsement/view/${id}`, '_blank');
            });
        });

        document.querySelectorAll('.status-btn').forEach(btn => {
            const id = btn.dataset.id;
            const labno = btn.dataset.labno;
            const patientName = btn.dataset.patient;
            const status = btn.dataset.status;
            btn.addEventListener('click', () => showStatusModal({ id, labno, patientName, status }));
        });
    }

    document.getElementById('searchLabno').addEventListener('input', filterData);
    document.querySelectorAll('input[name="statusOptions"]').forEach(radio => {
        radio.addEventListener('change', filterData);
    });

    function showStatusModal(data) {
        currentStatusData = data;
        const modal = new bootstrap.Modal(document.getElementById('statusConfirmationModal'));
        document.getElementById('modalLabNumber').textContent = data.labno;
        document.getElementById('modalPatientName').textContent = data.patientName;

        const currentStatus = normalizeStatus(data.status);
        const modalMessage = document.getElementById('modalMessage');
        const confirmButton = document.getElementById('confirmStatusChange');

        if (currentStatus === 'open') {
            modalMessage.innerHTML = `<div class="alert alert-warning"><i class="mdi mdi-lock me-2"></i>Close this case?</div>`;
            confirmButton.textContent = 'Close Case';
            confirmButton.className = 'btn btn-warning';
        } else {
            modalMessage.innerHTML = `<div class="alert alert-success"><i class="mdi mdi-lock-open-variant me-2"></i>Reopen this case?</div>`;
            confirmButton.textContent = 'Reopen Case';
            confirmButton.className = 'btn btn-success';
        }

        modal.show();
    }

    document.getElementById('confirmStatusChange').addEventListener('click', () => {
        if (!currentStatusData) return;
        const currentStatus = normalizeStatus(currentStatusData.status);
        const newStatus = currentStatus === 'open' ? 'closed' : 'open';

        const confirmBtn = document.getElementById('confirmStatusChange');
        confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Updating...';
        confirmBtn.disabled = true;

        fetch(`http://localhost:3001/api/pdo-endorsement/update-status/${currentStatusData.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        })
        .then(res => res.json())
        .then(result => {
            if (result.success) {
                const index = allEndorsements.findIndex(i => i.id == currentStatusData.id);
                if (index !== -1) {
                    allEndorsements[index].status = newStatus === 'open' ? 1 : 0;
                }
                filterData();
                showToast(`Case ${currentStatusData.labno} ${newStatus}ed successfully.`);
            } else {
                showToast(result.message || 'Failed to update status.', 'error');
            }
        })
        .catch(() => showToast('Failed to update status.', 'error'))
        .finally(() => {
            confirmBtn.textContent = newStatus === 'open' ? 'Reopen Case' : 'Close Case';
            confirmBtn.disabled = false;
            bootstrap.Modal.getInstance(document.getElementById('statusConfirmationModal')).hide();
        });
    });

    function getStatusButton(item) {
        const status = normalizeStatus(item.status);
        const fullName = `${item.fname} ${item.lname}`;
        return `
            <button class="btn btn-sm btn-outline-${status === 'open' ? 'success' : 'danger'} status-btn"
                data-id="${item.id}" data-labno="${item.labno}" data-patient="${fullName}" data-status="${status}">
                <i class="mdi mdi-lock${status === 'open' ? '-open-variant' : ''} me-1"></i>${status.charAt(0).toUpperCase() + status.slice(1)}
            </button>`;
    }

    function formatDateTime(dateStr) {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleString('en-PH', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
        });
    }

    function getTestResultBadge(result) {
        const value = (result || '').toLowerCase();
        let badge = 'bg-secondary';
        if (value === 'positive') badge = 'bg-success';
        else if (value === 'negative') badge = 'bg-danger';
        else if (value === 'pending') badge = 'bg-warning text-dark';
        return `<span class="badge ${badge}">${result || 'N/A'}</span>`;
    }

    function showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer') || createToastContainer();
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="toast-header">
                <i class="mdi mdi-${type === 'success' ? 'check-circle text-success' : 'alert-circle text-danger'} me-2"></i>
                <strong class="me-auto">${type === 'success' ? 'Success' : 'Error'}</strong>
                <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">${message}</div>
        `;
        container.appendChild(toast);
        new bootstrap.Toast(toast).show();
        toast.addEventListener('hidden.bs.toast', () => toast.remove());
    }

    function createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container position-fixed top-0 end-0 p-3';
        container.style.zIndex = 9999;
        document.body.appendChild(container);
        return container;
    }

    // === EXPORT FEATURE ===
    document.getElementById('exportForm').addEventListener('submit', function (e) {
        e.preventDefault();

        const start = new Date(document.getElementById('startDate').value);
        const end = new Date(document.getElementById('endDate').value);
        end.setHours(23, 59, 59); // Include entire end date

        const filtered = allEndorsements.filter(item => {
            const date = new Date(item.date_endorsed);
            return date >= start && date <= end;
        });

        if (filtered.length === 0) {
            showToast('No data in selected date range.', 'error');
            return;
        }

        exportToCSV(filtered);
        bootstrap.Modal.getInstance(document.getElementById('exportModal')).hide();
    });

    function exportToCSV(data) {
        const headers = ['Lab Number', 'Name', 'Facility Code', 'Facility Name', 'Test Result', 'Remarks', 'Date Endorsed', 'Endorsed By', 'Status'];
        const rows = data.map(i => [
            i.labno,
            `${i.fname} ${i.lname}`,
            i.facility_code,
            i.facility_name,
            i.test_result,
            i.remarks,
            formatDateTime(i.date_endorsed),
            i.endorsed_by,
            normalizeStatus(i.status)
        ]);

        const csv = [headers, ...rows].map(r => r.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `PDO_Endorsements_${Date.now()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Auto-fill export modal with full current month (e.g., 2025-07-01 to 2025-07-31)
    const exportModal = document.getElementById('exportModal');
    exportModal.addEventListener('show.bs.modal', () => {
        const today = new Date();

        const year = today.getFullYear();
        const month = today.getMonth(); // 0-indexed

        // Force first and last day of *this* month
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0); // Day 0 of next month = last day of this month

        // Format to YYYY-MM-DD (required for HTML date inputs)
        const formatYYYYMMDD = (date) => {
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        };

        document.getElementById('startDate').value = formatYYYYMMDD(firstDay);
        document.getElementById('endDate').value = formatYYYYMMDD(lastDay);
    });

    // Optional: Add manual refresh button functionality
    // You can add this to your HTML: <button id="manualRefresh" class="btn btn-sm btn-outline-secondary">Refresh</button>
    const manualRefreshBtn = document.getElementById('manualRefresh');
    if (manualRefreshBtn) {
        manualRefreshBtn.addEventListener('click', () => {
            loadEndorsements();
            showToast('Data refreshed manually.');
        });
    }

});