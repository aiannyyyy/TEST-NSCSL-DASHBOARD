document.addEventListener('DOMContentLoaded', function () {
    const saveBtn = document.getElementById('saveNotebookBtn');
    const closeBtn = document.getElementById('closeAddNotebookBtn');
    const cancelBtn = document.getElementById('cancelAddNotebookBtn');
    const modalElement = document.getElementById('addNotebookModal');
    const saveButtonText = document.getElementById('saveButtonText');
    const saveButtonSpinner = document.getElementById('saveButtonSpinner');

    if (!saveBtn || !modalElement) return;

    const modal = new bootstrap.Modal(modalElement);

    // Function to close the addNotebookModal and reopen detailsModal
    function goBackToDetailsModal() {
    const addNotebookModal = bootstrap.Modal.getInstance(document.getElementById('addNotebookModal'));
    const detailsModal = new bootstrap.Modal(document.getElementById('detailsModal'));

    addNotebookModal.hide();
    detailsModal.show();
    }

    // Attach event listeners
    closeBtn.addEventListener('click', goBackToDetailsModal);
    cancelBtn.addEventListener('click', goBackToDetailsModal);

    function setLoading(loading) {
        saveBtn.disabled = loading;
        if (saveButtonText) saveButtonText.textContent = loading ? 'Saving...' : 'Save Changes';
        if (saveButtonSpinner) saveButtonSpinner.style.display = loading ? 'inline-block' : 'none';
    }

    function getText(id) {
        const el = document.getElementById(id);
        return el ? (el.textContent || el.innerText || '') : '';
    }

    function showNotification(message) {
        const notif = document.createElement('div');
        notif.className = 'alert alert-success alert-dismissible fade show position-fixed';
        notif.style.cssText = 'top: 20px; right: 20px; z-index: 9999;';
        notif.innerHTML = `
            <i class="fas fa-check-circle me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(notif);
        setTimeout(() => notif.remove(), 4000);
    }

    // Function to load notebook entries for a specific patient by fname and lname
    async function loadNotebookEntries(fname, lname) {
        try {
            const response = await fetch(`http://localhost:3000/api/notebook-query?fname=${encodeURIComponent(fname)}&lname=${encodeURIComponent(lname)}`);
            if (response.ok) {
                const entries = await response.json();
                renderNotebookEntries(entries);
            } else {
                console.error('Failed to load notebook entries');
            }
        } catch (error) {
            console.error('Error loading notebook entries:', error);
        }
    }

    // Function to render notebook entries in the container
    function renderNotebookEntries(entries) {
        const container = document.getElementById('addednotebookContainer');
        if (!container) return;

        if (!entries || entries.length === 0) {
            container.innerHTML = `
                <h4>PDO Notebook</h4>
                <p class="text-muted">No notebook entries found.</p>
            `;
            return;
        }

        let entriesHTML = `
            <div class="list-group">
        `;

        entries.forEach((entry) => {
            // Format created date/time
            let createdDate = "N/A", createdTime = "N/A";
            if (entry.createDate) {
                const dt = new Date(entry.createDate);
                createdDate = dt.toLocaleDateString('en-US');
                createdTime = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            }

            // Format modified date/time
            let modifiedDate = "N/A", modifiedTime = "N/A";
            if (entry.modDate) {
                const dtMod = new Date(entry.modDate);
                modifiedDate = dtMod.toLocaleDateString('en-US');
                modifiedTime = dtMod.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            }

            // Format and escape remarks
            let remarks = entry.notes || 'No remarks recorded';
            if (remarks.length > 300) remarks = remarks.substring(0, 300) + '...';
            remarks = remarks.replace(/&/g, '&amp;')
                           .replace(/</g, '&lt;')
                           .replace(/>/g, '&gt;')
                           .replace(/"/g, '&quot;')
                           .replace(/'/g, '&#39;');

            entriesHTML += `
                <div class="list-group-item mb-2 shadow-sm rounded border">
                <p class="mb-1"><strong>📄 Specimen No.:</strong> ${entry.labno || 'N/A'}</p>
                <p class="mb-1"><strong>🕒 Date Created:</strong> ${createdDate} - ${createdTime}</p>
                <p class="mb-1"><strong>👤 Created By:</strong> ${entry.techCreate || 'N/A'}</p>
                <p class="mb-1"><strong>📆 Date Modified:</strong> ${modifiedDate} - ${modifiedTime}</p>
                <p class="mb-1"><strong>👤 Modified By:</strong> ${entry.techMod || 'N/A'}</p>
                <p class="mb-1"><strong>💬 Remarks:</strong> <span style="white-space: pre-line">${remarks}</span></p>
                </div>
            `;
        });

        entriesHTML += `</div>`; // close the list-group
        container.innerHTML = entriesHTML;
    }

    function getManilaDateTime() {
    const now = new Date();
    const options = {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };

    const [
        { value: month },,
        { value: day },,
        { value: year },,
        { value: hour },,
        { value: minute },,
        { value: second }
    ] = new Intl.DateTimeFormat('en-PH', options).formatToParts(now);

    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
    }


    saveBtn.addEventListener('click', async () => {
        const notes = document.getElementById('notebookNotes').value.trim();
        if (!notes) return alert('Please enter some notes before saving.');

        const data = {
            labno: getText('detailLabNo'),
            fname: getText('detailFName'),
            lname: getText('detailLName'),
            code: getText('detailSubmId'),
            facility_name: getText('detailBirthHospName'),
            notes,
            createDate: getManilaDateTime(),
            techCreate: getText('user-name') || 'Current User',
            modDate: getManilaDateTime(),
            techMod: getText('user-name') || 'Current User'
        };

        if (!data.labno || !data.fname || !data.lname) {
            return alert('Missing patient information. Please load the details modal properly.');
        }

        setLoading(true);

        try {
            const response = await fetch('http://localhost:3000/api/notebook-query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                // Reset form and close add notebook modal
                document.getElementById('addNotebookForm').reset();
                modal.hide();

                // Show success notification
                showNotification('Notebook entry added successfully!');

                // Reopen the details modal and refresh notebook entries
                setTimeout(() => {
                    const detailsModalElement = document.getElementById('detailsModal');
                    if (detailsModalElement) {
                        const detailsModal = new bootstrap.Modal(detailsModalElement);
                        detailsModal.show();
                        
                        // Load updated notebook entries
                        loadNotebookEntries(data.fname, data.lname);
                    }
                }, 500);

            } else {
                alert('Error: ' + (result.error || 'Unknown error occurred'));
            }
        } catch (err) {
            console.error('Notebook save failed:', err);
            alert('Failed to save notebook entry.');
        } finally {
            setLoading(false);
        }
    });

    [closeBtn, cancelBtn].forEach(btn => {
        if (btn) btn.addEventListener('click', () => modal.hide());
    });

    modalElement.addEventListener('hidden.bs.modal', () => {
        const form = document.getElementById('addNotebookForm');
        if (form) form.reset();
        setLoading(false);
    });

    modalElement.addEventListener('shown.bs.modal', () => {
        const patientInfo = {
            labno: getText('detailLabNo'),
            fname: getText('detailFName'),
            lname: getText('detailLName')
        };

        if (!patientInfo.labno || !patientInfo.fname || !patientInfo.lname) {
            alert('Patient information is not available. Please load the details modal first.');
            modal.hide();
        } else {
            const notesField = document.getElementById('notebookNotes');
            if (notesField) setTimeout(() => notesField.focus(), 300);
        }
    });

    // Make loadNotebookEntries globally available
    window.loadNotebookEntries = loadNotebookEntries;
});

// Global delete function
async function deleteNotebookEntry(noteID) {
    if (!confirm('Are you sure you want to delete this notebook entry?')) return;

    try {
        const response = await fetch(`http://localhost:3000/api/notebook/${noteID}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            const element = document.querySelector(`[data-entry-id="${noteID}"]`);
            if (element) element.remove();

            // Check if there are any remaining entries
            const container = document.getElementById('addednotebookContainer');
            const listGroup = container.querySelector('.list-group');
            if (container && (!listGroup || listGroup.children.length === 0)) {
                container.innerHTML = `
                    <h4>PDO Notebook</h4>
                    <p class="text-muted">No notebook entries found.</p>
                `;
            }

            showSuccessNotification('Notebook entry deleted successfully!');
        } else {
            const result = await response.json();
            alert('Error deleting entry: ' + (result.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Delete error:', error);
        alert('Failed to delete notebook entry.');
    }
}

// Helper function for success notifications (make it global)
function showSuccessNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'alert alert-success alert-dismissible fade show position-fixed';
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    notification.innerHTML = `
        <i class="fas fa-check-circle me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 4000);
}

// Function to edit patient notebooks
// Function to populate the patient notebooks table
function populatePatientNotebooksTable(notebooks) {
  const tbody = document.getElementById('patientNotebooksTableBody');
  
  if (!notebooks || notebooks.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" class="text-center text-muted py-4">
          <i class="fas fa-book me-2"></i>
          No notebook entries found
        </td>
      </tr>
    `;
    return;
  }

  // Group notebooks by patient (fname + lname combination)
  const patientGroups = {};
  notebooks.forEach(notebook => {
    const key = `${notebook.fname}_${notebook.lname}`;
    if (!patientGroups[key]) {
      patientGroups[key] = {
        fname: notebook.fname,
        lname: notebook.lname,
        entries: []
      };
    }
    patientGroups[key].entries.push(notebook);
  });

  let tableHTML = '';
  Object.values(patientGroups).forEach((patient, index) => {
    tableHTML += `
      <tr data-patient-index="${index}">
        <td>
          <div class="d-flex align-items-center">
            <i class="fas fa-user-circle me-2 text-primary"></i>
            <span class="fw-medium">${patient.fname || 'N/A'}</span>
          </div>
        </td>
        <td>
          <span class="fw-medium">${patient.lname || 'N/A'}</span>
          <small class="text-muted d-block">${patient.entries.length} ${patient.entries.length === 1 ? 'entry' : 'entries'}</small>
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-action btn-view" onclick="viewNotebookEntries('${patient.fname}', '${patient.lname}')" title="View Entries">
              <i class="fas fa-eye me-1"></i>View
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = tableHTML;
}

function viewNotebookEntries(fname, lname, labid, labno) {
  console.log(`Viewing notebooks for: ${fname} ${lname}`);
  
  if (typeof loadNotebookEntries === 'function') {
    const detailFName = document.getElementById('detailFName');
    const detailLName = document.getElementById('detailLName');
    const detailLabNo = document.getElementById('detailLabNo');
    const detailFormNo = document.getElementById('detailFormNo');

    if (detailFName) detailFName.textContent = fname;
    if (detailLName) detailLName.textContent = lname;
    if (detailLabNo) detailLabNo.textContent = labno;
    if (detailFormNo) detailFormNo.textContent = labid;

    const detailsModal = new bootstrap.Modal(document.getElementById('detailsModal'));
    detailsModal.show();

    loadNotebookEntries(fname, lname);
    fetchPatientDetails(labno, labid);
    fetchNotebookDetails(fname, lname);
    fetchAddedNotebookDetails(fname, lname);
  }
}

// Remove sample data - now using real data from server

// Initialize table with real data from server
document.addEventListener('DOMContentLoaded', function() {
  loadInitialNotebooksData();
});

// Function to refresh the patient notebooks table (call this after adding new notebooks)
function refreshPatientNotebooksTable() {
  // Fetch all notebook entries from server (without filters to get all patients)
  fetch('http://localhost:3000/api/notebook-query')
    .then(response => response.json())
    .then(notebooks => {
      populatePatientNotebooksTable(notebooks);
    })
    .catch(error => {
      console.error('Error fetching notebooks:', error);
      // Show empty state on error
      const tbody = document.getElementById('patientNotebooksTableBody');
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="3" class="text-center text-muted py-4">
              <i class="fas fa-exclamation-triangle me-2"></i>
              Error loading notebook entries
            </td>
          </tr>
        `;
      }
    });
}

// Function to load notebook entries on page load
function loadInitialNotebooksData() {
  // Load all notebook entries when page loads
  fetch('http://localhost:3000/api/notebook-query')
    .then(response => response.json())
    .then(notebooks => {
      populatePatientNotebooksTable(notebooks);
    })
    .catch(error => {
      console.error('Error loading initial notebook data:', error);
      // Show empty state on error
      const tbody = document.getElementById('patientNotebooksTableBody');
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="3" class="text-center text-muted py-4">
              <i class="fas fa-exclamation-triangle me-2"></i>
              Error loading notebook entries
            </td>
          </tr>
        `;
      }
    });
}