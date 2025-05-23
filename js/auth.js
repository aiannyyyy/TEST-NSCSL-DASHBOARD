(function () {
    const userDept = localStorage.getItem("dept");

    if (!userDept) {
        alert("You must log in first.");
        window.location.href = "/login.html";
        return;
    }

    // Map each page to the allowed department
    const accessControl = {
        "/src/index.html": "Program",
        "/src/admin.html": "Admin",
        "/src/labindex.html": "Laboratory",
        "/src/followup.html": "Follow Up"
    };

    const currentPath = window.location.pathname;
    const allowedDept = accessControl[currentPath];

    if (allowedDept && allowedDept !== userDept) {
        alert("Access denied. Redirecting to your dashboard...");
        const redirectMap = {
            "Admin": "/src/admin.html",
            "Laboratory": "/src/labindex.html",
            "Program": "/src/index.html",
            "Follow Up": "/src/followup.html"
        };
        window.location.href = redirectMap[userDept] || "/login.html";
    }
})();
