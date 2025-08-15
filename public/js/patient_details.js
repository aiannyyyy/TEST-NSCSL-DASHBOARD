
// Function to fetch and display patient details
async function fetchPatientDetails(labno, labid) {
  console.log("🔍 fetchPatientDetails called with:", { labno, labid });
  
  const detailsBody = document.querySelector("#detailsModal .modal-body");
  const originalContent = detailsBody.innerHTML;

  detailsBody.innerHTML = `
    <div class="d-flex justify-content-center align-items-center" style="height: 200px;">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <div class="ms-3">Loading patient details...</div>
    </div>
  `;

  try {
    const response = await fetch(`http://localhost:3001/api/patient-details?labno=${labno}&labid=${labid}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch patient details");
    }

    const data = await response.json();
    console.log("📋 Patient data received:", data);

    if (data.length === 0) {
      detailsBody.innerHTML = originalContent;
      alert("No details found for this patient.");
      return;
    }

    const patientInfo = data[0];
    console.log("👤 Patient info:", { 
      fname: patientInfo.FNAME, 
      lname: patientInfo.LNAME,
      labno: patientInfo.LABNO 
    });
    
    detailsBody.innerHTML = originalContent;

    // Basic Info
    document.getElementById("detailLabNo").textContent = patientInfo.LABNO || "";
    document.getElementById("detailFormNo").textContent = patientInfo.LABID || "";
    document.getElementById("detailLName").textContent = patientInfo.LNAME || "";
    document.getElementById("detailFName").textContent = patientInfo.FNAME || "";

    const birthDate = patientInfo.BIRTHDT ? new Date(patientInfo.BIRTHDT).toLocaleDateString() : "";
    const birthTime = patientInfo.BIRTHTM || "";
    document.getElementById("detailDOB").textContent = birthTime ? `${birthDate} ${birthTime}` : birthDate;

    const collectionDate = patientInfo.DTCOLL ? new Date(patientInfo.DTCOLL).toLocaleDateString() : "";
    const collectionTime = patientInfo.TMCOLL || "";
    document.getElementById("detailDOC").textContent = collectionTime ? `${collectionDate} ${collectionTime}` : collectionDate;

    document.getElementById("detailSpectype").textContent = {
      "1": "NBS-5 test", "2": "Repeat Unsat", "3": "Repeat Abnormal", "4": "Repeat Normal",
      "5": "Monitoring", "6": "ARCHIVED", "8": "QC (G6PD)", "9": "PT Samples (CDC)",
      "18": "NBS 5 +LEU", "20": "ENBS", "21": "Other Disorders", "22": "Rpt-ENBS",
      "87": "Unfit", "96": "Serum"
    }[patientInfo.SPECTYPE] || "";

    document.getElementById("detailMilkType").textContent = patientInfo.MILKTYPE || "";
    document.getElementById("detailSex").textContent = patientInfo.SEX === "1" ? "Male" : patientInfo.SEX === "2" ? "Female" : "";
    document.getElementById("detailBirthWt").textContent = patientInfo.BIRTHWT || "";
    document.getElementById("detailBirthOrder").textContent = patientInfo.BIRTHORDER || "";
    document.getElementById("detailBloodTransfused").textContent = patientInfo.TRANSFUS ? "Yes" : "No";
    document.getElementById("detailTransfusedDate").textContent = patientInfo.TRANSFUSDT ? new Date(patientInfo.TRANSFUSDT).toLocaleDateString() : "";
    document.getElementById("detailGestationAge").textContent = patientInfo.GESTAGE || "";

    let specimenAge = "";
    if (patientInfo.DTRECV && patientInfo.DTCOLL) {
      const receivedDate = new Date(patientInfo.DTRECV);
      const collectionDate = new Date(patientInfo.DTCOLL);
      const diffTime = Math.abs(receivedDate - collectionDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      specimenAge = `${diffDays} days`;
    }
    document.getElementById("detailSpecimenAge").textContent = specimenAge;

    document.getElementById("detailAgeAtCollection").textContent = patientInfo.AGECOLL || "";
    document.getElementById("detailDateReceived").textContent = patientInfo.DTRECV ? new Date(patientInfo.DTRECV).toLocaleDateString() : "";
    document.getElementById("detailDateReported").textContent = patientInfo.DTRPTD ? new Date(patientInfo.DTRPTD).toLocaleDateString() : "";
    document.getElementById("detailClinicalStatus").textContent = patientInfo.CLINSTAT || "";
    document.getElementById("detailPhysicianId").textContent = patientInfo.PHYSID || "";
    document.getElementById("detailBirthHospId").textContent = patientInfo.BIRTHHOSP || "";
    document.getElementById("detailBirthHospName").textContent = patientInfo.PROVIDER_DESCR1 || "";
    document.getElementById("detailSubmId").textContent = patientInfo.SUBMID || "";

    // Populate results table
    const resultTableBody = document.querySelector("#resultsDetailsTable tbody");
    if (resultTableBody) {
      resultTableBody.innerHTML = "";

      data.forEach((item) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${item.GROUP_NAME || ""}</td>
          <td>${item.DISORDER_NAME || ""}</td>
          <td>${item.MNEMONIC || ""}</td>
          <td>${item.DESCR1 || ""}</td>
          <td>${item.DISORDERRESULTTEXT || ""}</td>
        `;
        resultTableBody.appendChild(row);
      });
    }

    // Fetch Notebook details with a small delay to ensure modal is fully rendered
    console.log("📔 About to fetch notebook details...");
    setTimeout(async () => {
      await fetchNotebookDetails(patientInfo.FNAME, patientInfo.LNAME);
      await fetchAddedNotebookDetails(patientInfo.FNAME, patientInfo.LNAME); // 👈 Add this line
    }, 200);

  } catch (error) {
    console.error("❌ Error fetching patient details:", error);
    detailsBody.innerHTML = originalContent;
    alert(`Error: ${error.message || "Failed to load patient details"}`);
  }
}

async function fetchNotebookDetails(fname, lname) {
  console.log("=== NOTEBOOK FETCH START ===");
  console.log("1. Function called with:", { fname, lname });

  const notebookContainer = document.getElementById("notebookContainer");
  if (!notebookContainer) {
    console.error("ERROR: notebookContainer element not found!");
    return;
  }

  notebookContainer.innerHTML = `
    <div class="d-flex justify-content-center align-items-center py-3">
      <div class="spinner-border spinner-border-sm text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <div class="ms-2">Loading notebook entries...</div>
    </div>
  `;

  try {
    const encodedFname = encodeURIComponent(fname || '');
    const encodedLname = encodeURIComponent(lname || '');
    const url = `http://localhost:3001/api/notebook-details?fname=${encodedFname}&lname=${encodedLname}`;

    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
      throw new Error(errorData.error || `Failed to fetch notebook details (${response.status})`);
    }

    const responseData = await response.json();

    let data = Array.isArray(responseData?.data) ? responseData.data : (Array.isArray(responseData) ? responseData : []);
    if (data.length === 0) {
      notebookContainer.innerHTML = `
        <div class="text-center py-4 text-muted">
          <i class="fas fa-book-open fa-2x mb-2"></i>
          <p class="mb-0">No notebook entries found for <strong>${fname} ${lname}</strong></p>
        </div>
      `;
      return;
    }

        let entriesHTML = `
      <div class="list-group">
    `;

    data.forEach((entry, index) => {
      let createdDate = "N/A", createdTime = "N/A", modifiedDateTime = "N/A";

      if (entry.CREATE_DT) {
        const dt = new Date(entry.CREATE_DT);
        createdDate = dt.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
        createdTime = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      }

      if (entry.LASTMOD) {
        const mod = new Date(entry.LASTMOD);
        modifiedDateTime = mod.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }) + ' ' +
          mod.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      }

      let remarks = entry.NOTES || 'No remarks recorded';
      if (remarks.length > 300) remarks = remarks.substring(0, 300) + '...';
      remarks = remarks.replace(/&/g, '&amp;')
                      .replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;')
                      .replace(/"/g, '&quot;')
                      .replace(/'/g, '&#39;');

      entriesHTML += `
        <div class="list-group-item mb-2 shadow-sm rounded border">
          <p class="mb-1"><strong>📄 Specimen No.:</strong> ${entry.LABNO || 'N/A'}</p>
          <p class="mb-1"><strong>🕒 Date Created:</strong> ${createdDate} - ${createdTime}</p>
          <p class="mb-1"><strong>👤 Tech:</strong> ${
            (() => {
              const techs = {
                "222": "AAMORFE",
                "202": "ABBRUTAS",
                "223": "ATDELEON",
                "148": "GEYEDRA",
                "87":  "MCDIMAILIG",
                "145": "KGSTAROSA",
                "210": "MRGOMEZ",
                "86":  "VMWAGAN",
                "129": "JMAPELADO"
              };
              return techs[entry.USER_ID] || 'N/A';
            })()
          }</p>
          <p class="mb-1"><strong>✏️ Last Modified:</strong> ${modifiedDateTime}</p>
          <p class="mb-1"><strong>💬 Remarks:</strong> <span style="white-space: pre-line">${remarks}</span></p>
        </div>
      `;
    });

    entriesHTML += `
      <div class="text-end mt-3">
        <small class="text-muted">Total entries: ${data.length}</small>
      </div>
    </div>`;

    notebookContainer.innerHTML = entriesHTML;
    console.log("✅ Notebook table loaded");

  } catch (error) {
    console.error("❌ Error in fetchNotebookDetails:", error);
    notebookContainer.innerHTML = `
      <div class="alert alert-danger mb-0">
        <i class="fas fa-exclamation-triangle"></i>
        <strong>Error Loading Notebook:</strong> ${error.message}
        <details class="mt-2">
          <summary style="cursor: pointer;">Technical Details</summary>
          <pre style="font-size: 11px; margin-top: 10px;">${error.stack || error.toString()}</pre>
        </details>
      </div>
    `;
  }
}

async function fetchAddedNotebookDetails(fname, lname) {
  console.log("=== ADDED NOTEBOOK FETCH START ===");
  console.log("Function called with:", { fname, lname });

  const notebookContainer = document.getElementById("addednotebookContainer");
  if (!notebookContainer) {
    console.error("ERROR: addednotebookContainer element not found!");
    return;
  }

  notebookContainer.innerHTML = `
    <div class="d-flex justify-content-center align-items-center py-3">
      <div class="spinner-border spinner-border-sm text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <div class="ms-2">Loading additional notebook entries...</div>
    </div>
  `;

  try {
    const encodedFname = encodeURIComponent(fname || '');
    const encodedLname = encodeURIComponent(lname || '');
    const url = `http://localhost:3001/api/notebook-query?fname=${encodedFname}&lname=${encodedLname}`;

    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
      throw new Error(errorData.error || `Failed to fetch added notebook details (${response.status})`);
    }

    const responseData = await response.json();
    let data = Array.isArray(responseData?.data) ? responseData.data : (Array.isArray(responseData) ? responseData : []);

    if (data.length === 0) {
      notebookContainer.innerHTML = `
        <div class="text-center py-4 text-muted">
          <i class="fas fa-book-open fa-2x mb-2"></i>
          <p class="mb-0">No additional notebook entries found for <strong>${fname} ${lname}</strong></p>
        </div>
      `;
      return;
    }

    let entriesHTML = `<div class="list-group">`;

    data.forEach((entry) => {
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

    entriesHTML += `</div>`;


    entriesHTML += `
      <div class="text-end mt-3">
        <small class="text-muted">Total added entries: ${data.length}</small>
      </div>
    </div>`;

    notebookContainer.innerHTML = entriesHTML;
    console.log("✅ Added notebook entries loaded");

  } catch (error) {
    console.error("❌ Error in fetchAddedNotebookDetails:", error);
    notebookContainer.innerHTML = `
      <div class="alert alert-danger mb-0">
        <i class="fas fa-exclamation-triangle"></i>
        <strong>Error Loading Added Notebook:</strong> ${error.message}
        <details class="mt-2">
          <summary style="cursor: pointer;">Technical Details</summary>
          <pre style="font-size: 11px; margin-top: 10px;">${error.stack || error.toString()}</pre>
        </details>
      </div>
    `;
  }
}

// Test functions for debugging
function testNotebookContainer() {
  console.log("🧪 Testing notebook container...");
  const container = document.getElementById("notebookContainer");
  
  if (container) {
    container.innerHTML = `
      <div class="alert alert-success mb-0">
        <i class="fas fa-check-circle"></i> 
        <strong>Container Test Successful!</strong><br>
        <small>Time: ${new Date().toLocaleTimeString()}</small>
      </div>
    `;
    console.log("✅ Notebook container test PASSED");
    return true;
  } else {
    console.error("❌ Notebook container test FAILED - Element not found");
    alert("❌ Notebook container not found in DOM!");
    return false;
  }
}

async function testNotebookAPI(fname = "TEST", lname = "USER") {
  console.log("🧪 Testing notebook API...");
  
  try {
    const url = `http://localhost:3001/api/notebook-details?fname=${fname}&lname=${lname}`;
    console.log("Testing URL:", url);
    
    const response = await fetch(url);
    const responseData = {
      status: response.status,
      ok: response.ok,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    };
    
    console.log("API Response Info:", responseData);
    
    if (!response.ok) {
      console.error("❌ API test FAILED - Response not OK");
      return null;
    }
    
    const data = await response.json();
    console.log("API Response Data:", data);
    console.log("✅ API test PASSED");
    
    return data;
  } catch (error) {
    console.error("❌ API test FAILED:", error);
    return null;
  }
}

// Enhanced table row click handler with better debugging
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 DOM Content Loaded - Initializing event listeners");
  
  const tableBody = document.querySelector("#notebookTable tbody");
  const resultsModalEl = document.getElementById("resultsModal");
  const detailsModalEl = document.getElementById("detailsModal");
  
  if (!tableBody) {
    console.error("❌ Table body not found (#notebookTable tbody)");
    return;
  }
  
  if (!resultsModalEl || !detailsModalEl) {
    console.error("❌ Modal elements not found", { 
      resultsModal: !!resultsModalEl, 
      detailsModal: !!detailsModalEl 
    });
    return;
  }
  
  // Bootstrap modal instances
  let resultsModal = bootstrap.Modal.getInstance(resultsModalEl) || new bootstrap.Modal(resultsModalEl);
  let detailsModal = bootstrap.Modal.getInstance(detailsModalEl) || new bootstrap.Modal(detailsModalEl);
  
  console.log("✅ Modal instances created");
  
  // Table row click handler with event delegation
  tableBody.addEventListener("click", (event) => {
    console.log("🖱️ Table click detected");
    
    // Find the closest row
    const row = event.target.closest("tr");
    if (!row) {
      console.log("No row found for click event");
      return;
    }
    
    // Extract data from row cells
    const labno = row.cells[0]?.textContent?.trim();
    const labid = row.cells[1]?.textContent?.trim();
    
    console.log("Row data extracted:", { labno, labid });
    
    if (!labno || !labid) {
      console.error("❌ Missing required data from row");
      alert("Missing required information to fetch details");
      return;
    }
    
    console.log("🔄 Hiding results modal and showing details modal");
    
    // Hide results modal and show details modal
    resultsModal.hide();
    
    // Small delay to ensure modal transition is smooth
    setTimeout(() => {
      detailsModal.show();
      
      // Fetch patient details after modal is shown
      setTimeout(() => {
        fetchPatientDetails(labno, labid);
      }, 100);
    }, 300);
  });
  
  // Back button handlers
  const backToTableBtn = document.getElementById("backToTableBtn");
  const backToSearchFromDetailsBtn = document.getElementById("backToSearchFromDetailsBtn");
  const searchModalEl = document.getElementById("addEventModal");
  
  if (searchModalEl) {
    let searchModal = bootstrap.Modal.getInstance(searchModalEl) || new bootstrap.Modal(searchModalEl);
    
    if (backToTableBtn) {
      backToTableBtn.addEventListener("click", () => {
        console.log("🔄 Back to table clicked");
        detailsModal.hide();
        setTimeout(() => {
          resultsModal.show();
        }, 300);
      });
    }
    
    if (backToSearchFromDetailsBtn) {
      backToSearchFromDetailsBtn.addEventListener("click", () => {
        console.log("🔄 Back to search clicked");
        detailsModal.hide();
        setTimeout(() => {
          searchModal.show();
        }, 300);
      });
    }
  }
  
  console.log("✅ All event handlers initialized successfully");
});

// Global functions for manual testing (accessible from console)
window.testNotebookContainer = testNotebookContainer;
window.testNotebookAPI = testNotebookAPI;
window.fetchNotebookDetails = fetchNotebookDetails;
window.fetchAddedNotebookDetails = fetchAddedNotebookDetails;


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
        labno: notebook.labno,
        labid: notebook.labid,
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
            <button class="btn btn-action btn-view" onclick="viewNotebookEntries('${patient.fname}', '${patient.lname}', '${patient.labid}', '${patient.labno}')"
" title="View Entries">
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
  fetch('http://localhost:3001/api/notebook-query')
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
  fetch('http://localhost:3001/api/notebook-query')
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