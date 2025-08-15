// ===== COMPLETE REFINED FRONTEND SCRIPT WITH MODAL MANAGER INTEGRATION =====
// This script integrates all functionality with the global Modal Manager system

// ===== PATIENT DETAILS FUNCTIONS =====
async function fetchPatientDetails(labno, labid) {
  console.log("🔍 fetchPatientDetails called with:", { labno, labid });
  
  const detailsBody = document.querySelector("#detailsModal .modal-body");
  if (!detailsBody) {
    console.error("❌ Details modal body not found");
    return;
  }

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

    // Basic Info Population
    populateBasicInfo(patientInfo);
    
    // Populate results table
    populateResultsTable(data);

    // Fetch Notebook details with delay for modal rendering
    console.log("📔 About to fetch notebook details...");
    setTimeout(async () => {
      await fetchNotebookDetails(patientInfo.FNAME, patientInfo.LNAME);
      await fetchAddedNotebookDetails(patientInfo.FNAME, patientInfo.LNAME);
    }, 200);

  } catch (error) {
    console.error("❌ Error fetching patient details:", error);
    detailsBody.innerHTML = originalContent;
    showErrorAlert(`Error: ${error.message || "Failed to load patient details"}`);
  }
}

function populateBasicInfo(patientInfo) {
  // Helper function to safely set text content
  const setElementText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value || "";
  };

  // Basic Information
  setElementText("detailLabNo", patientInfo.LABNO);
  setElementText("detailFormNo", patientInfo.LABID);
  setElementText("detailLName", patientInfo.LNAME);
  setElementText("detailFName", patientInfo.FNAME);

  // Date formatting
  const birthDate = patientInfo.BIRTHDT ? new Date(patientInfo.BIRTHDT).toLocaleDateString() : "";
  const birthTime = patientInfo.BIRTHTM || "";
  setElementText("detailDOB", birthTime ? `${birthDate} ${birthTime}` : birthDate);

  const collectionDate = patientInfo.DTCOLL ? new Date(patientInfo.DTCOLL).toLocaleDateString() : "";
  const collectionTime = patientInfo.TMCOLL || "";
  setElementText("detailDOC", collectionTime ? `${collectionDate} ${collectionTime}` : collectionDate);

  // Specimen type mapping
  const specTypes = {
    "1": "NBS-5 test", "2": "Repeat Unsat", "3": "Repeat Abnormal", "4": "Repeat Normal",
    "5": "Monitoring", "6": "ARCHIVED", "8": "QC (G6PD)", "9": "PT Samples (CDC)",
    "18": "NBS 5 +LEU", "20": "ENBS", "21": "Other Disorders", "22": "Rpt-ENBS",
    "87": "Unfit", "96": "Serum"
  };
  setElementText("detailSpectype", specTypes[patientInfo.SPECTYPE] || "");

  // Other fields
  setElementText("detailMilkType", patientInfo.MILKTYPE);
  setElementText("detailSex", patientInfo.SEX === "1" ? "Male" : patientInfo.SEX === "2" ? "Female" : "");
  setElementText("detailBirthWt", patientInfo.BIRTHWT);
  setElementText("detailBirthOrder", patientInfo.BIRTHORDER);
  setElementText("detailBloodTransfused", patientInfo.TRANSFUS ? "Yes" : "No");
  setElementText("detailTransfusedDate", patientInfo.TRANSFUSDT ? new Date(patientInfo.TRANSFUSDT).toLocaleDateString() : "");
  setElementText("detailGestationAge", patientInfo.GESTAGE);

  // Calculate specimen age
  let specimenAge = "";
  if (patientInfo.DTRECV && patientInfo.DTCOLL) {
    const receivedDate = new Date(patientInfo.DTRECV);
    const collectionDate = new Date(patientInfo.DTCOLL);
    const diffTime = Math.abs(receivedDate - collectionDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    specimenAge = `${diffDays} days`;
  }
  setElementText("detailSpecimenAge", specimenAge);

  // Additional fields
  setElementText("detailAgeAtCollection", patientInfo.AGECOLL);
  setElementText("detailDateReceived", patientInfo.DTRECV ? new Date(patientInfo.DTRECV).toLocaleDateString() : "");
  setElementText("detailDateReported", patientInfo.DTRPTD ? new Date(patientInfo.DTRPTD).toLocaleDateString() : "");
  setElementText("detailClinicalStatus", patientInfo.CLINSTAT);
  setElementText("detailPhysicianId", patientInfo.PHYSID);
  setElementText("detailBirthHospId", patientInfo.BIRTHHOSP);
  setElementText("detailBirthHospName", patientInfo.PROVIDER_DESCR1);
  setElementText("detailSubmId", patientInfo.SUBMID);
}

function populateResultsTable(data) {
  const resultTableBody = document.querySelector("#resultsDetailsTable tbody");
  if (!resultTableBody) {
    console.warn("⚠️ Results table body not found");
    return;
  }

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

// ===== NOTEBOOK DETAILS FUNCTIONS =====
async function fetchNotebookDetails(fname, lname) {
  console.log("=== NOTEBOOK FETCH START ===");
  console.log("1. Function called with:", { fname, lname });

  const notebookContainer = document.getElementById("notebookContainer");
  if (!notebookContainer) {
    console.error("ERROR: notebookContainer element not found!");
    return;
  }

  showLoadingSpinner(notebookContainer, "Loading notebook entries...");

  try {
    const encodedFname = encodeURIComponent(fname || '');
    const encodedLname = encodeURIComponent(lname || '');
    const url = `http://localhost:3001/api/notebook-details?fname=${encodedFname}&lname=${encodedLname}`;

    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        error: `HTTP ${response.status}: ${response.statusText}` 
      }));
      throw new Error(errorData.error || `Failed to fetch notebook details (${response.status})`);
    }

    const responseData = await response.json();
    let data = Array.isArray(responseData?.data) ? responseData.data : 
               (Array.isArray(responseData) ? responseData : []);

    if (data.length === 0) {
      showEmptyState(notebookContainer, `No notebook entries found for <strong>${fname} ${lname}</strong>`);
      return;
    }

    displayNotebookEntries(notebookContainer, data, "notebook");
    console.log("✅ Notebook table loaded");

  } catch (error) {
    console.error("❌ Error in fetchNotebookDetails:", error);
    showErrorInContainer(notebookContainer, "Error Loading Notebook", error);
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

  showLoadingSpinner(notebookContainer, "Loading additional notebook entries...");

  try {
    const encodedFname = encodeURIComponent(fname || '');
    const encodedLname = encodeURIComponent(lname || '');
    const url = `http://localhost:3001/api/notebook-query?fname=${encodedFname}&lname=${encodedLname}`;

    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        error: `HTTP ${response.status}: ${response.statusText}` 
      }));
      throw new Error(errorData.error || `Failed to fetch added notebook details (${response.status})`);
    }

    const responseData = await response.json();
    let data = Array.isArray(responseData?.data) ? responseData.data : 
               (Array.isArray(responseData) ? responseData : []);

    if (data.length === 0) {
      showEmptyState(notebookContainer, `No additional notebook entries found for <strong>${fname} ${lname}</strong>`);
      return;
    }

    displayNotebookEntries(notebookContainer, data, "added", fname, lname);
    console.log("✅ Added notebook entries loaded");

  } catch (error) {
    console.error("❌ Error in fetchAddedNotebookDetails:", error);
    showErrorInContainer(notebookContainer, "Error Loading Added Notebook", error);
  }
}

// ===== UI HELPER FUNCTIONS =====
function showLoadingSpinner(container, message) {
  container.innerHTML = `
    <div class="d-flex justify-content-center align-items-center py-3">
      <div class="spinner-border spinner-border-sm text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <div class="ms-2">${message}</div>
    </div>
  `;
}

function showEmptyState(container, message) {
  container.innerHTML = `
    <div class="text-center py-4 text-muted">
      <i class="fas fa-book-open fa-2x mb-2"></i>
      <p class="mb-0">${message}</p>
    </div>
  `;
}

function showErrorInContainer(container, title, error) {
  container.innerHTML = `
    <div class="alert alert-danger mb-0">
      <i class="fas fa-exclamation-triangle"></i>
      <strong>${title}:</strong> ${error.message}
      <details class="mt-2">
        <summary style="cursor: pointer;">Technical Details</summary>
        <pre style="font-size: 11px; margin-top: 10px;">${error.stack || error.toString()}</pre>
      </details>
    </div>
  `;
}

function showErrorAlert(message) {
  // Could be replaced with a nicer modal or toast notification
  alert(message);
}

function displayNotebookEntries(container, data, type, fname, lname) {
  const techMapping = {
    "222": "AAMORFE", "202": "ABBRUTAS", "223": "ATDELEON", "148": "GEYEDRA",
    "87": "MCDIMAILIG", "145": "KGSTAROSA", "210": "MRGOMEZ", 
    "86": "VMWAGAN", "129": "JMAPELADO"
  };

  let entriesHTML = `<div class="list-group">`;

  data.forEach((entry) => {
    let entryHTML = `<div class="list-group-item mb-2 shadow-sm rounded border">`;
    
    if (type === "notebook") {
      // Original notebook format
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
      remarks = escapeHtml(remarks);

      entryHTML += `
        <p class="mb-1"><strong>📄 Specimen No.:</strong> ${entry.LABNO || 'N/A'}</p>
        <p class="mb-1"><strong>🕒 Date Created:</strong> ${createdDate} - ${createdTime}</p>
        <p class="mb-1"><strong>👤 Tech:</strong> ${techMapping[entry.USER_ID] || 'N/A'}</p>
        <p class="mb-1"><strong>✏️ Last Modified:</strong> ${modifiedDateTime}</p>
        <p class="mb-1"><strong>💬 Remarks:</strong> <span style="white-space: pre-line">${remarks}</span></p>
      `;
    } else {
      // Added notebook format
      let createdDate = "N/A", createdTime = "N/A";
      if (entry.createDate) {
        const dt = new Date(entry.createDate);
        createdDate = dt.toLocaleDateString('en-US');
        createdTime = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      }

      let modifiedDate = "N/A", modifiedTime = "N/A";
      if (entry.modDate) {
        const dtMod = new Date(entry.modDate);
        modifiedDate = dtMod.toLocaleDateString('en-US');
        modifiedTime = dtMod.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      }

      let remarks = entry.notes || 'No remarks recorded';
      if (remarks.length > 300) remarks = remarks.substring(0, 300) + '...';
      remarks = escapeHtml(remarks);

      entryHTML += `
        <p class="mb-1"><strong>📄 Specimen No.:</strong> ${entry.labno || 'N/A'}</p>
        <p class="mb-1"><strong>🕒 Date Created:</strong> ${createdDate} - ${createdTime}</p>
        <p class="mb-1"><strong>👤 Created By:</strong> ${entry.techCreate || 'N/A'}</p>
        <p class="mb-1"><strong>📆 Date Modified:</strong> ${modifiedDate} - ${modifiedTime}</p>
        <p class="mb-1"><strong>👤 Modified By:</strong> ${entry.techMod || 'N/A'}</p>
        <p class="mb-1"><strong>💬 Remarks:</strong> <span style="white-space: pre-line">${remarks}</span></p>
      `;
    }

    entryHTML += `</div>`;
    entriesHTML += entryHTML;
  });

  entriesHTML += `
    <div class="text-end mt-3">
      <small class="text-muted">Total ${type === 'added' ? 'added ' : ''}entries: ${data.length}</small>
    </div>
  </div>`;

  container.innerHTML = entriesHTML;
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;')
             .replace(/</g, '&lt;')
             .replace(/>/g, '&gt;')
             .replace(/"/g, '&quot;')
             .replace(/'/g, '&#39;');
}

// ===== PATIENT NOTEBOOKS TABLE FUNCTIONS =====
function populatePatientNotebooksTable(notebooks) {
  const tbody = document.getElementById('patientNotebooksTableBody');
  
  if (!tbody) {
    console.error("❌ Patient notebooks table body not found");
    return;
  }

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
            <button class="btn btn-action btn-view" onclick="viewNotebookEntries('${patient.fname}', '${patient.lname}', '${patient.labid}', '${patient.labno}')" title="View Entries">
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
  console.log(`📖 Viewing notebooks for: ${fname} ${lname} using Modal Manager`);
  
  // Update detail fields
  const fieldMappings = {
    'detailFName': fname,
    'detailLName': lname,
    'detailLabNo': labno,
    'detailFormNo': labid
  };

  Object.entries(fieldMappings).forEach(([elementId, value]) => {
    const element = document.getElementById(elementId);
    if (element) element.textContent = value || '';
  });

  // Use Modal Manager to show details modal
  showModal('detailsModal');

  // Load data after modal is shown with proper delay
  setTimeout(() => {
    fetchPatientDetails(labno, labid);
    fetchNotebookDetails(fname, lname);
    fetchAddedNotebookDetails(fname, lname);
  }, 350); // Increased delay to ensure modal transition completes
}

function refreshPatientNotebooksTable() {
  console.log("🔄 Refreshing patient notebooks table...");
  
  fetch('http://localhost:3001/api/notebook-query')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(notebooks => {
      populatePatientNotebooksTable(notebooks);
      console.log("✅ Patient notebooks table refreshed");
    })
    .catch(error => {
      console.error('❌ Error fetching notebooks:', error);
      showTableError('patientNotebooksTableBody', "Error loading notebook entries");
    });
}

function loadInitialNotebooksData() {
  console.log("📊 Loading initial notebooks data...");
  
  fetch('http://localhost:3001/api/notebook-query')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(notebooks => {
      populatePatientNotebooksTable(notebooks);
      console.log("✅ Initial notebook data loaded");
    })
    .catch(error => {
      console.error('❌ Error loading initial notebook data:', error);
      showTableError('patientNotebooksTableBody', "Error loading notebook entries");
    });
}

function showTableError(tbodyId, message) {
  const tbody = document.getElementById(tbodyId);
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" class="text-center text-muted py-4">
          <i class="fas fa-exclamation-triangle me-2"></i>
          ${message}
        </td>
      </tr>
    `;
  }
}

// ===== EVENT HANDLERS AND MODAL MANAGER INTEGRATION =====
function initializeEventHandlers() {
  console.log("🚀 Initializing event handlers with Modal Manager integration");
  
  const tableBody = document.querySelector("#notebookTable tbody");
  
  if (!tableBody) {
    console.error("❌ Table body not found (#notebookTable tbody)");
    return;
  }
  
  console.log("✅ Table body found, setting up event delegation");
  
  // Table row click handler using Modal Manager
  tableBody.addEventListener("click", handleTableRowClick);
  
  // Back button handlers using Modal Manager
  setupBackButtonHandlers();
  
  console.log("✅ All event handlers initialized with Modal Manager integration");
}

function handleTableRowClick(event) {
  console.log("🖱️ Table click detected");
  
  const row = event.target.closest("tr");
  if (!row) {
    console.log("No row found for click event");
    return;
  }
  
  const labno = row.cells[0]?.textContent?.trim();
  const labid = row.cells[1]?.textContent?.trim();
  
  console.log("Row data extracted:", { labno, labid });
  
  if (!labno || !labid) {
    console.error("❌ Missing required data from row");
    showErrorAlert("Missing required information to fetch details");
    return;
  }
  
  console.log("🔄 Using Modal Manager: Showing details modal");
  
  // Use Modal Manager to handle modal transitions
  showModal('detailsModal');
  
  // Fetch patient details after modal transition
  setTimeout(() => {
    fetchPatientDetails(labno, labid);
  }, 350);
}

function setupBackButtonHandlers() {
  const backToTableBtn = document.getElementById("backToTableBtn");
  const backToSearchFromDetailsBtn = document.getElementById("backToSearchFromDetailsBtn");
  
  if (backToTableBtn) {
    backToTableBtn.addEventListener("click", () => {
      console.log("🔄 Back to table clicked - Using Modal Manager");
      showModal('resultsModal');
    });
  }
  
  if (backToSearchFromDetailsBtn) {
    backToSearchFromDetailsBtn.addEventListener("click", () => {
      console.log("🔄 Back to search clicked - Using Modal Manager");
      showModal('addEventModal');
    });
  }
}

// ===== INITIALIZATION =====
function initializeApplication() {
  console.log("🚀 Initializing application with Modal Manager integration");
  
  // Wait for Modal Manager to be ready
  const waitForModalManager = () => {
    if (window.modalManager && window.modalManager.isInitialized) {
      console.log("✅ Modal Manager detected and initialized");
      initializeEventHandlers();
      loadInitialNotebooksData();
    } else {
      console.log("⏳ Waiting for Modal Manager initialization...");
      setTimeout(waitForModalManager, 100);
    }
  };
  
  waitForModalManager();
}

// Enhanced DOMContentLoaded handler
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 DOM Content Loaded - Starting application initialization");
  initializeApplication();
});

// ===== UTILITY FUNCTIONS =====
function openAddNotebookModal() {
  console.log("📝 Opening add notebook modal using Modal Manager");
  showModal('addNotebookModal');
}

function closeCurrentModal() {
  console.log("❌ Closing current modal using Modal Manager");
  const currentModal = window.modalManager?.getCurrentModal();
  if (currentModal) {
    hideModal(currentModal);
  } else {
    console.warn("⚠️ No current modal to close");
  }
}

function emergencyCleanupAndRefresh() {
  console.log("🚨 Emergency cleanup and refresh");
  if (window.emergencyModalCleanup) {
    window.emergencyModalCleanup();
  }
  setTimeout(() => {
    location.reload();
  }, 1000);
}

// ===== TEST FUNCTIONS =====
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
    showErrorAlert("❌ Notebook container not found in DOM!");
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

function checkIntegrationStatus() {
  console.log("📊 Integration Status Check:");
  console.log("- Modal Manager Available:", !!window.modalManager);
  console.log("- Modal Manager Initialized:", window.modalManager?.isInitialized);
  console.log("- Current Modal:", window.modalManager?.getCurrentModal());
  console.log("- Available Global Functions:", {
    showModal: typeof showModal,
    hideModal: typeof hideModal,
    closeAllModals: typeof closeAllModals
  });
}

// ===== GLOBAL EXPORTS =====
// Export functions to global scope for external access
window.fetchPatientDetails = fetchPatientDetails;
window.fetchNotebookDetails = fetchNotebookDetails;
window.fetchAddedNotebookDetails = fetchAddedNotebookDetails;
window.viewNotebookEntries = viewNotebookEntries;
window.refreshPatientNotebooksTable = refreshPatientNotebooksTable;
window.openAddNotebookModal = openAddNotebookModal;
window.closeCurrentModal = closeCurrentModal;
window.emergencyCleanupAndRefresh = emergencyCleanupAndRefresh;

// Test functions
window.testNotebookContainer = testNotebookContainer;
window.testNotebookAPI = testNotebookAPI;
window.checkIntegrationStatus = checkIntegrationStatus;

console.log("✅ Complete refined frontend script with Modal Manager integration loaded successfully");