// Function to fetch and display patient details
async function fetchPatientDetails(labno, labid) {
  // Show loading state
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
    // Fetch patient details using your existing route with labno and labid params
    const response = await fetch(`http://localhost:3000/api/patient-details?labno=${labno}&labid=${labid}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch patient details");
    }
    
    const data = await response.json();
    
    if (data.length === 0) {
      detailsBody.innerHTML = originalContent;
      alert("No details found for this patient.");
      return;
    }
    
    // Use the first record for general patient info
    const patientInfo = data[0];
    
    // Restore original content first
    detailsBody.innerHTML = originalContent;
    
    // Update all the detail fields
    document.getElementById("detailLabNo").textContent = patientInfo.LABNO || "";
    document.getElementById("detailFormNo").textContent = patientInfo.LABID || "";
    document.getElementById("detailLName").textContent = patientInfo.LNAME || "";
    document.getElementById("detailFName").textContent = patientInfo.FNAME || "";
    
    // Format date of birth (combine BIRTHDT and BIRTHTM)
    const birthDate = patientInfo.BIRTHDT ? new Date(patientInfo.BIRTHDT).toLocaleDateString() : "";
    const birthTime = patientInfo.BIRTHTM || "";
    document.getElementById("detailDOB").textContent = birthTime ? `${birthDate} ${birthTime}` : birthDate;
    
    // Format date of collection (combine DTCOLL and TMCOLL)
    const collectionDate = patientInfo.DTCOLL ? new Date(patientInfo.DTCOLL).toLocaleDateString() : "";
    const collectionTime = patientInfo.TMCOLL || "";
    document.getElementById("detailDOC").textContent = collectionTime ? `${collectionDate} ${collectionTime}` : collectionDate;
    
    document.getElementById("detailSpectype").textContent = patientInfo.SPECTYPE === "1" ? "NBS-5 test" : patientInfo.SPECTYPE === "2" ? "Repeat Unsat" : patientInfo.SPECTYPE === "3" ? "Repeat Abnormal" : patientInfo.SPECTYPE === "4" ? "Repeat Normal" : patientInfo.SPECTYPE === "5" ? "Monitoring" : patientInfo.SPECTYPE === "6" ? "ARCHIVED" : patientInfo.SPECTYPE === "8" ? "QC (G6PD)" : patientInfo.SPECTYPE === "9" ? "PT Samples (CDC)" : patientInfo.SPECTYPE === "18" ? "NBS 5 +LEU" : patientInfo.SPECTYPE === "20" ? "ENBS" : patientInfo.SPECTYPE === "21" ? "Other Disorders" : patientInfo.SPECTYPE === "22" ? "Rpt-ENBS" : patientInfo.SPECTYPE === "87" ? "Unfit" : patientInfo.SPECTYPE === "96" ? "Serum": "";
    document.getElementById("detailMilkType").textContent = patientInfo.MILKTYPE || "";
    document.getElementById("detailSex").textContent = patientInfo.SEX === "1" ? "Male" : patientInfo.SEX === "2" ? "Female" : "";
    document.getElementById("detailBirthWt").textContent = patientInfo.BIRTHWT || "";
    
    // Handle birth order - might not be in your data
    document.getElementById("detailBirthOrder").textContent = patientInfo.BIRTHORDER || "";
    
    // Handle transfusion info
    document.getElementById("detailBloodTransfused").textContent = patientInfo.TRANSFUS ? "Yes" : "No";
    document.getElementById("detailTransfusedDate").textContent = patientInfo.TRANSFUSDT ? new Date(patientInfo.TRANSFUSDT).toLocaleDateString() : "";
    
    document.getElementById("detailGestationAge").textContent = patientInfo.GESTAGE || "";
    
    // Calculate specimen age if both dates are available
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

    // Populate the result details table
    const resultTableBody = document.querySelector("#resultsDetailsTable tbody");
    resultTableBody.innerHTML = ""; // Clear existing rows

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

    
  } catch (error) {
    console.error("Error fetching patient details:", error);
    detailsBody.innerHTML = originalContent;
    alert(`Error: ${error.message || "Failed to load patient details"}`);
  }
}

// Modify the existing table row click handler
document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.querySelector("#notebookTable tbody");
  const resultsModalEl = document.getElementById("resultsModal");
  const detailsModalEl = document.getElementById("detailsModal");
  
  // Bootstrap modal instances
  let resultsModal = bootstrap.Modal.getInstance(resultsModalEl) || new bootstrap.Modal(resultsModalEl);
  let detailsModal = bootstrap.Modal.getInstance(detailsModalEl) || new bootstrap.Modal(detailsModalEl);
  
  // Delegation pattern - listen for clicks on the table body
  tableBody.addEventListener("click", (event) => {
    // Find closest row if the click happened on a child element
    const row = event.target.closest("tr");
    if (!row) return; // Exit if no row was clicked
    
    // Get the required data from the row cells
    const labno = row.cells[0].textContent;
    const labid = row.cells[1].textContent;
    
    if (!labno || !labid) {
      alert("Missing required information to fetch details");
      return;
    }
    
    // Fetch and display patient details
    fetchPatientDetails(labno, labid);
    
    // Hide results modal and show details modal
    resultsModal.hide();
    detailsModal.show();
  });
  
  // Existing button handlers
  const backToTableBtn = document.getElementById("backToTableBtn");
  const backToSearchFromDetailsBtn = document.getElementById("backToSearchFromDetailsBtn");
  const searchModalEl = document.getElementById("addEventModal");
  let searchModal = bootstrap.Modal.getInstance(searchModalEl) || new bootstrap.Modal(searchModalEl);
  
  backToTableBtn.addEventListener("click", () => {
    detailsModal.hide();
    setTimeout(() => {
      resultsModal.show();
    }, 300);
  });
  
  backToSearchFromDetailsBtn.addEventListener("click", () => {
    detailsModal.hide();
    setTimeout(() => {
      searchModal.show();
    }, 300);
  });
});