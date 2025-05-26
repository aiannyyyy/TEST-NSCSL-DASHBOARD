// Set default value of Date Visited field to current date & time
document.addEventListener("DOMContentLoaded", function () {
    function setCurrentDateTime() {
      let now = new Date();
      let year = now.getFullYear();
      let month = String(now.getMonth() + 1).padStart(2, "0");
      let day = String(now.getDate()).padStart(2, "0");
      let hours = String(now.getHours()).padStart(2, "0");
      let minutes = String(now.getMinutes()).padStart(2, "0");

      let formattedDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
      document.getElementById("dateVisited").value = formattedDateTime;
    }

    // Set the date when modal opens
    let visitModal = document.getElementById("visitModal");
    visitModal.addEventListener("shown.bs.modal", setCurrentDateTime);
  });