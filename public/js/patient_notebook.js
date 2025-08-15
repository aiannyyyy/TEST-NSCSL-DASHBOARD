/*
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("notebookForm");
  const searchFields = document.querySelectorAll(".search-field");
  const tableBody = document.querySelector("#notebookTable tbody");
  const searchButton = document.querySelector(".search-button");
  const resetButton = document.querySelector(".reset-button");
  const backToSearchBtn = document.getElementById("backToSearchBtn");
  const backToTableBtn = document.getElementById("backToTableBtn");
  const backToSearchFromDetailsBtn = document.getElementById("backToSearchFromDetailsBtn");

  const searchModalEl = document.getElementById("addEventModal");
  const resultsModalEl = document.getElementById("resultsModal");
  const detailsModalEl = document.getElementById("detailsModal");

  // Detail elements
  const detailLabNo = document.getElementById("detailLabNo");
  const detailLabId = document.getElementById("detailLabId");
  const detailFName = document.getElementById("detailFName");
  const detailLName = document.getElementById("detailLName");
  const detailSex = document.getElementById("detailSex");
  const detailDOB = document.getElementById("detailDOB");
  const detailBirthWt = document.getElementById("detailBirthWt");
  const detailSubmId = document.getElementById("detailSubmId");

  // Bootstrap modal instances
  let searchModal = bootstrap.Modal.getInstance(searchModalEl) || new bootstrap.Modal(searchModalEl);
  let resultsModal = bootstrap.Modal.getInstance(resultsModalEl) || new bootstrap.Modal(resultsModalEl);
  let detailsModal = bootstrap.Modal.getInstance(detailsModalEl) || new bootstrap.Modal(detailsModalEl);

  // Enable or disable search button based on whether any field has a value
  function updateSearchButtonState() {
    const hasValue = Array.from(searchFields).some(field => field.value.trim() !== "");
    searchButton.disabled = !hasValue;
  }

  searchFields.forEach(field => {
    field.addEventListener("input", updateSearchButtonState);
  });

  resetButton.addEventListener("click", () => {
    searchFields.forEach(field => field.value = "");
    searchButton.disabled = true;
    tableBody.innerHTML = "";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const queryParams = new URLSearchParams();
    let hasSearchCriteria = false;

    searchFields.forEach(field => {
      const value = field.value.trim();
      if (value) {
        queryParams.append(field.id, value);
        hasSearchCriteria = true;
      }
    });

    if (!hasSearchCriteria) {
      alert("Please enter at least one search criterion.");
      return;
    }

    tableBody.innerHTML = `<tr><td colspan='8' class='text-center'>
      <div class='spinner-border text-primary' role='status'><span class='visually-hidden'>Searching...</span></div>
      <div>Searching...</div></td></tr>`;

    try {
      const response = await fetch(`http://localhost:3001/api/patient-info?${queryParams.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "An error occurred during search");
      }

      const data = await response.json();

      tableBody.innerHTML = "";

      if (data.length === 0) {
        tableBody.innerHTML = "<tr><td colspan='8' class='text-center'>No records found.</td></tr>";
        return;
      }

      data.forEach(row => {
        const tr = document.createElement("tr");
        tr.style.cursor = "pointer";  // visually indicate row is clickable
        tr.innerHTML = `
          <td>${row.LABNO || ""}</td>
          <td>${row.LABID || ""}</td>
          <td>${row.FNAME || ""}</td>
          <td>${row.LNAME || ""}</td>
          <td>${row.SEX === "1" ? "Male" : row.SEX === "2" ? "Female" : ""}</td>
          <td>${row.BIRTHDT ? new Date(row.BIRTHDT).toLocaleDateString() : ""}</td>
          <td>${row.BIRTHWT || ""}</td>
          <td>${row.SUBMID || ""}</td>
        `;

        // Double click opens details modal
        tr.addEventListener("dblclick", () => {
          // Fill details modal fields
          detailLabNo.textContent = row.LABNO || "";
          detailLabId.textContent = row.LABID || "";
          detailFName.textContent = row.FNAME || "";
          detailLName.textContent = row.LNAME || "";
          detailSex.textContent = row.SEX === "1" ? "Male" : row.SEX === "2" ? "Female" : "";
          detailDOB.textContent = row.BIRTHDT ? new Date(row.BIRTHDT).toLocaleDateString() : "";
          detailBirthWt.textContent = row.BIRTHWT || "";
          detailSubmId.textContent = row.SUBMID || "";

          // Hide results modal and show details modal
          resultsModal.hide();
          detailsModal.show();
        });

        tableBody.appendChild(tr);
      });

      // Show results modal and hide search modal
      searchModal.hide();
      resultsModal.show();

    } catch (error) {
      console.error("Fetch error:", error);
      tableBody.innerHTML = `<tr><td colspan='8' class='text-center'>Error: ${error.message || "Failed to load results"}</td></tr>`;
    }
  });

  backToSearchBtn.addEventListener("click", () => {
    resultsModal.hide();
    setTimeout(() => {
      searchModal.show();
    }, 300);
  });

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
*/
// patient_notebook.js - Updated to use Modal Manager
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("notebookForm");
  const searchFields = document.querySelectorAll(".search-field");
  const tableBody = document.querySelector("#notebookTable tbody");
  const searchButton = document.querySelector(".search-button");
  const resetButton = document.querySelector(".reset-button");
  const backToSearchBtn = document.getElementById("backToSearchBtn");
  const backToTableBtn = document.getElementById("backToTableBtn");
  const backToSearchFromDetailsBtn = document.getElementById("backToSearchFromDetailsBtn");

  // Detail elements
  const detailLabNo = document.getElementById("detailLabNo");
  const detailLabId = document.getElementById("detailLabId");
  const detailFName = document.getElementById("detailFName");
  const detailLName = document.getElementById("detailLName");
  const detailSex = document.getElementById("detailSex");
  const detailDOB = document.getElementById("detailDOB");
  const detailBirthWt = document.getElementById("detailBirthWt");
  const detailSubmId = document.getElementById("detailSubmId");

  // Enable or disable search button based on whether any field has a value
  function updateSearchButtonState() {
    const hasValue = Array.from(searchFields).some(field => field.value.trim() !== "");
    searchButton.disabled = !hasValue;
  }

  searchFields.forEach(field => {
    field.addEventListener("input", updateSearchButtonState);
  });

  resetButton.addEventListener("click", () => {
    searchFields.forEach(field => field.value = "");
    searchButton.disabled = true;
    tableBody.innerHTML = "";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const queryParams = new URLSearchParams();
    let hasSearchCriteria = false;

    searchFields.forEach(field => {
      const value = field.value.trim();
      if (value) {
        queryParams.append(field.id, value);
        hasSearchCriteria = true;
      }
    });

    if (!hasSearchCriteria) {
      alert("Please enter at least one search criterion.");
      return;
    }

    tableBody.innerHTML = `<tr><td colspan='8' class='text-center'>
      <div class='spinner-border text-primary' role='status'><span class='visually-hidden'>Searching...</span></div>
      <div>Searching...</div></td></tr>`;

    try {
      const response = await fetch(`http://localhost:3001/api/patient-info?${queryParams.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "An error occurred during search");
      }

      const data = await response.json();
      tableBody.innerHTML = "";

      if (data.length === 0) {
        tableBody.innerHTML = "<tr><td colspan='8' class='text-center'>No records found.</td></tr>";
        return;
      }

      data.forEach(row => {
        const tr = document.createElement("tr");
        tr.style.cursor = "pointer";
        tr.innerHTML = `
          <td>${row.LABNO || ""}</td>
          <td>${row.LABID || ""}</td>
          <td>${row.FNAME || ""}</td>
          <td>${row.LNAME || ""}</td>
          <td>${row.SEX === "1" ? "Male" : row.SEX === "2" ? "Female" : ""}</td>
          <td>${row.BIRTHDT ? new Date(row.BIRTHDT).toLocaleDateString() : ""}</td>
          <td>${row.BIRTHWT || ""}</td>
          <td>${row.SUBMID || ""}</td>
        `;

        // Single click to highlight row
        tr.addEventListener("click", () => {
          // Remove previous selection
          tableBody.querySelectorAll('tr').forEach(r => r.classList.remove('table-active'));
          tr.classList.add('table-active');
        });

        // Double click opens details modal using Modal Manager
        tr.addEventListener("dblclick", () => {
          // Fill details modal fields
          detailLabNo.textContent = row.LABNO || "";
          detailLabId.textContent = row.LABID || "";
          detailFName.textContent = row.FNAME || "";
          detailLName.textContent = row.LNAME || "";
          detailSex.textContent = row.SEX === "1" ? "Male" : row.SEX === "2" ? "Female" : "";
          detailDOB.textContent = row.BIRTHDT ? new Date(row.BIRTHDT).toLocaleDateString() : "";
          detailBirthWt.textContent = row.BIRTHWT || "";
          detailSubmId.textContent = row.SUBMID || "";

          // Use Modal Manager for smooth transition
          window.modalManager.show('detailsModal');
          
          // Fetch detailed patient information after modal is shown
          setTimeout(() => {
            if (typeof fetchPatientDetails === 'function') {
              fetchPatientDetails(row.LABNO, row.LABID);
            }
          }, 500);
        });

        tableBody.appendChild(tr);
      });

      // Show results modal using Modal Manager
      window.modalManager.show('resultsModal');

    } catch (error) {
      console.error("Fetch error:", error);
      tableBody.innerHTML = `<tr><td colspan='8' class='text-center'>Error: ${error.message || "Failed to load results"}</td></tr>`;
    }
  });

  // Navigation event listeners using Modal Manager
  backToSearchBtn.addEventListener("click", () => {
    window.modalManager.show('addEventModal');
  });

  backToTableBtn.addEventListener("click", () => {
    window.modalManager.show('resultsModal');
  });

  backToSearchFromDetailsBtn.addEventListener("click", () => {
    window.modalManager.show('addEventModal');
  });

  console.log("✅ Patient notebook script initialized with Modal Manager");
});