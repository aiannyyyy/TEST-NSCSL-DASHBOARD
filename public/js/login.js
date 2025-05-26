document.addEventListener("DOMContentLoaded", function () {
    const loginButton = document.getElementById("loginButton");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");

    // ✅ Set focus to username field on page load
    usernameInput.focus();

    // ✅ Allow Enter key to trigger login
    document.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            loginButton.click(); // Simulate button click
        }
    });

    loginButton.addEventListener("click", async function (event) {
        event.preventDefault(); // Prevent form refresh

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        if (!username || !password) {
            alert("Please fill in both fields.");
            return;
        }

        try {
            const response = await fetch("http://localhost:3000/api/auth/login", { 
                method: "POST", 
                headers: { "Content-Type": "application/json" }, 
                body: JSON.stringify({ username, password }) 
            });
            
            const result = await response.json();

            /*

            if (response.ok && result.success) {
                localStorage.setItem("username", result.user.name); 
                localStorage.setItem("dept", result.user.dept); // Save dept in localStorage if needed
                

                // Redirect based on department
                switch (result.user.dept) {
                    case "Admin":
                        window.location.href = "/src/admin.html";
                        break;
                    case "Laboratory":
                        window.location.href = "/src/labindex.html";
                        break;
                    case "Program":
                        window.location.href = "/src/index.html";
                        break;
                    case "Follow Up":
                        window.location.href = "/src/followup.html";
                        break;
                    default:
                        window.location.href = "/src/admin.html"; // fallback
                        break;
                }
            } else {
                alert(result.message);
            }
            
            */
           if (response.ok && result.success) {
                const { name, dept } = result.user;
                localStorage.setItem("username", name);
                localStorage.setItem("dept", dept);

                const redirectMap = {
                    "Admin": "/public/admin.html",
                    "Laboratory": "/public/labindex.html",
                    "Program": "/public/index.html",
                    "Follow Up": "/public/followup.html"
                };

                window.location.href = redirectMap[dept] || "/public/admin.html";
            } else {
                alert(result.message);
            }

        } catch (error) {
            console.error("Login error:", error);
            alert("Something went wrong. Please try again.");
        }
    });
});

function togglePassword() {
    const passwordInput = document.getElementById("password");
    const eyeIcon = document.getElementById("eye-icon");

    if (passwordInput.type === "password") {
        passwordInput.type = "text"; // Show password
        eyeIcon.src = "https://cdn-icons-png.flaticon.com/512/2767/2767146.png"; // Change icon (open eye)
    } else {
        passwordInput.type = "password"; // Hide password
        eyeIcon.src = "https://cdn-icons-png.flaticon.com/512/709/709612.png"; // Change icon (closed eye)
    }
}

