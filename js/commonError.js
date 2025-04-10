document.addEventListener("DOMContentLoaded", function () {
    let selectYear = 2025;
    let selectMonth = "January";
    let selectEncoder = "Jay Arr Apelado"

    // Function to update dropdown button text
    function updateDropdownText() {
        // Update the button text for year and month
        document.getElementById("error-year-dropdown").textContent = selectYear;
        document.getElementById("error-month-dropdown").textContent = selectMonth;
        document.getElementById("error-encoder-dropdown").textContent = selectEncoder;
    }

    // Event listener for Year selection
    document.querySelectorAll("#error-year-dropdown .dropdown-item").forEach(item => {
        item.addEventListener("click", function (event) {
            event.preventDefault();  // prevent default link behavior
            selectYear = this.textContent.trim();  // update the selected year
            updateDropdownText();  // update button text
        });
    });

    // Event listener for Month selection
    document.querySelectorAll("#error-month-dropdown .dropdown-item").forEach(item => {
        item.addEventListener("click", function (event) {
            event.preventDefault();  // prevent default link behavior
            selectMonth = this.textContent.trim();  // update the selected month
            updateDropdownText();  // update button text
        });
    });

    //event listener for encoder selection
    document.querySelectorAll("#error-encoder-dropdown .dropdown-item").forEach(item => {
        item.addEventListener("click", function (event) {
            event.preventDefault();
            selectEncoder = this.textContent.trim();
            updateDropdownText();
        });
    });
    
});
