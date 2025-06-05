(function () {
    const userDept = localStorage.getItem("dept");

    if (!userDept) {
        alert("You must log in first.");
        window.location.href = "/login.html";
        return;
    }

    // Normalize pathname: remove query and hash, keep only the filename
    const currentPath = window.location.pathname.toLowerCase();

    // Adjust accessControl keys to match your actual URL paths exactly
    // Example assumes pages are directly in /src/ folder.
    const accessControl = {
        "/index.html": "program",
        "/admin.html": "admin",
        "/labindex.html": "laboratory",
        "/followup.html": "follow up"
    };

    // Also normalize userDept for case-insensitive matching
    const userDeptNormalized = userDept.toLowerCase();

    // Check if current path is protected
    if (accessControl.hasOwnProperty(currentPath)) {
        const allowedDept = accessControl[currentPath];

        if (allowedDept !== userDeptNormalized) {
            alert("Access denied. Redirecting to your dashboard...");
            const redirectMap = {
                "admin": "/admin.html",
                "laboratory": "/labindex.html",
                "program": "/index.html",
                "follow up": "/followup.html"
            };
            // Redirect to the proper dashboard based on department
            window.location.href = redirectMap[userDeptNormalized] || "/login.html";
        }
    } else {
        // Optional: redirect to login if page not listed in accessControl
        // or allow public pages to be accessed.
        // window.location.href = "/login.html";
    }
})();
