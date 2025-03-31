function runNeometrics(exeName) {
    fetch(`http://localhost:3000/api/neometrics/execute/${exeName}`)  // ✅ Corrected API Route
        .then(response => response.json()) // Expect JSON response
        .then(data => alert(data.message)) // Show success message
        .catch(error => console.error("Error:", error));
}
