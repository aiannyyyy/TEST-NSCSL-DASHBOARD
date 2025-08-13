
(function () {
    const userDept = localStorage.getItem("dept");
    const username = localStorage.getItem("username");

    if (!userDept || !username) {
        alert("You must log in first.");
        window.location.href = "/login.html";
        return;
    }

    const currentPath = window.location.pathname.toLowerCase();

    // List of users with full access
    const unrestrictedUsers = ["admin", "jmticatic", "ahdeyto", "auvanguardia", "apandal"];

    // Normalize
    const normalizedUsername = username.toLowerCase();
    const normalizedDept = userDept.toLowerCase();

    // Allow unrestricted users full access
    if (unrestrictedUsers.includes(normalizedUsername)) {
        return;
    }

    // Department-based page access control
    const accessControl = {
        "/index.html": "program",
        "/admin.html": "admin",
        "/labindex.html": "laboratory",
        "/followup.html": "follow up"
    };

    // Enforce access control only if current page is protected
    if (accessControl.hasOwnProperty(currentPath)) {
        const allowedDept = accessControl[currentPath];

        if (allowedDept !== normalizedDept) {
            alert("Access denied. Redirecting to your dashboard...");
            const redirectMap = {
                "admin": "/admin.html",
                "laboratory": "/labindex.html",
                "program": "/index.html",
                "follow up": "/followup.html"
            };
            window.location.href = redirectMap[normalizedDept] || "/login.html";
        }
    }
})();
