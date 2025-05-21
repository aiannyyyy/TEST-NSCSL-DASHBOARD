document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("notebookForm");
  const searchFields = document.querySelectorAll(".search-field");
  const tableBody = document.querySelector("#notebookTable tbody");
  const searchButton = document.querySelector(".search-button");
  const resetButton = document.querySelector(".reset-button");
  
  // Enable or disable search button based on whether any field has a value
  function updateSearchButtonState() {
    const hasValue = Array.from(searchFields).some(field => field.value.trim() !== "");
    searchButton.disabled = !hasValue;
  }
  
  // Add input listeners to all search fields
  searchFields.forEach(field => {
    field.addEventListener("input", updateSearchButtonState);
  });

  // Reset button functionality
  resetButton.addEventListener("click", () => {
    searchFields.forEach(field => {
      field.value = "";
    });
    searchButton.disabled = true;
    tableBody.innerHTML = "";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    // Build query parameters from non-empty fields
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

    tableBody.innerHTML = "<tr><td colspan='8' class='text-center'><div class='spinner-border text-primary' role='status'><span class='visually-hidden'>Searching...</span></div><div>Searching...</div></td></tr>";

    try {
      const response = await fetch(`http://localhost:3000/api/patient-info?${queryParams.toString()}`);
      
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

        tableBody.appendChild(tr);
      });

    } catch (error) {
      console.error("Fetch error:", error);
      tableBody.innerHTML = `<tr><td colspan='8' class='text-center'>Error: ${error.message || "Failed to load results"}</td></tr>`;
    }
  });
});