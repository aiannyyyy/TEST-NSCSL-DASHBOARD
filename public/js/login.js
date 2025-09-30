/*
document.addEventListener("DOMContentLoaded", function () {
    const loginButton = document.getElementById("loginButton");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");

    // Focus username input on load
    usernameInput.focus();

    // Floating label logic
    function handleFloatingLabel(inputId, wrapperId) {
        const input = document.getElementById(inputId);
        const wrapper = document.getElementById(wrapperId);

        input.addEventListener('input', function () {
            wrapper.classList.toggle('has-value', this.value.length > 0);
        });

        input.addEventListener('focus', function () {
            wrapper.classList.add('has-value');
        });

        input.addEventListener('blur', function () {
            if (this.value.length === 0) {
                wrapper.classList.remove('has-value');
            }
        });
    }

    handleFloatingLabel('username', 'usernameWrapper');
    handleFloatingLabel('password', 'passwordWrapper');

    // Enter key triggers login
    document.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            loginButton.click();
        }
    });

    // Login process
    loginButton.addEventListener("click", async function (event) {
        event.preventDefault();

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        if (!username || !password) {
            alert("Please fill in both fields.");
            return;
        }

        loginButton.classList.add('loading');
        loginButton.disabled = true;

        try {
            const response = await fetch("http://localhost:3001/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });

            const result = await response.json();

            loginButton.classList.remove('loading');
            loginButton.disabled = false;

            if (response.ok && result.success) {
                const { id, name, dept, username: userUsername, position } = result.user;

                // 🔧 FIXED: Store user_id in localStorage
                localStorage.setItem("user_id", id.toString());
                localStorage.setItem("username", name);
                localStorage.setItem("dept", dept);
                localStorage.setItem("user_username", userUsername);
                localStorage.setItem("position", position);

                console.log("✅ Stored user_id:", id); // Debug log

                const redirectMap = {
                    "Admin": "/public/admin.html",
                    "Laboratory": "/public/labindex.html",
                    "Program": "/public/index.html",
                    "Follow Up": "/public/followup.html"
                };

                window.location.href = redirectMap[dept] || "/public/admin.html";
            } else {
                alert(result.message || "Invalid login credentials.");
            }

        } catch (error) {
            console.error("Login error:", error);
            loginButton.classList.remove('loading');
            loginButton.disabled = false;
            alert("Something went wrong. Please try again.");
        }
    });

    // Mouse parallax effect
    document.addEventListener('mousemove', function (e) {
        const shapes = document.querySelectorAll('.shape');
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;

        shapes.forEach((shape, index) => {
            const speed = (index + 1) * 0.5;
            const xOffset = (x - 0.5) * speed;
            const yOffset = (y - 0.5) * speed;

            shape.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
        });
    });
});

// Toggle password visibility
function togglePassword() {
    const passwordInput = document.getElementById("password");
    const eyeIcon = document.getElementById("eye-icon");

    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        eyeIcon.className = "fas fa-eye-slash";
    } else {
        passwordInput.type = "password";
        eyeIcon.className = "fas fa-eye";
    }
}

// Forgot password
function forgotPassword() {
    alert("Please contact your administrator to reset your password.");
}

// Social login (future implementation)
function socialLogin(platform) {
    alert(`${platform.charAt(0).toUpperCase() + platform.slice(1)} login would be implemented here.`);
}

// Sign up
function signUp() {
    alert("Please contact your administrator.");
}
*/
document.addEventListener("DOMContentLoaded", function () {
    const loginButton = document.getElementById("loginButton");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");

    // Focus username input on load
    usernameInput.focus();

    // Floating label logic
    function handleFloatingLabel(inputId, wrapperId) {
        const input = document.getElementById(inputId);
        const wrapper = document.getElementById(wrapperId);

        input.addEventListener('input', function () {
            wrapper.classList.toggle('has-value', this.value.length > 0);
        });

        input.addEventListener('focus', function () {
            wrapper.classList.add('has-value');
        });

        input.addEventListener('blur', function () {
            if (this.value.length === 0) {
                wrapper.classList.remove('has-value');
            }
        });
    }

    handleFloatingLabel('username', 'usernameWrapper');
    handleFloatingLabel('password', 'passwordWrapper');

    // Enter key triggers login
    document.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            loginButton.click();
        }
    });

    // Login process
    loginButton.addEventListener("click", async function (event) {
        event.preventDefault();

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        if (!username || !password) {
            alert("Please fill in both fields.");
            return;
        }

        loginButton.classList.add('loading');
        loginButton.disabled = true;

        try {
            const response = await fetch("http://localhost:3001/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
                credentials: 'include' // Include cookies for session management
            });

            const result = await response.json();

            loginButton.classList.remove('loading');
            loginButton.disabled = false;

            if (response.ok && result.success) {
                const { id, name, dept, username: userUsername, position, role } = result.user;
                const permissions = result.permissions;

                // Store comprehensive user data and permissions
                localStorage.setItem("user_id", id.toString());
                localStorage.setItem("username", name);
                localStorage.setItem("user_username", userUsername);
                localStorage.setItem("dept", dept);
                localStorage.setItem("position", position);
                localStorage.setItem("role", role);
                localStorage.setItem("permissions", JSON.stringify(permissions));
                localStorage.setItem("loginTime", new Date().toISOString());

                console.log("✅ Login successful for:", userUsername);
                console.log("✅ Permissions:", permissions);

                // Get primary page based on user's highest access level
                const primaryPage = getPrimaryPageForUser(userUsername, role, dept, permissions);
                
                console.log("🔄 Redirecting to:", primaryPage);
                window.location.href = primaryPage;

            } else {
                console.error("❌ Login failed:", result.message);
                alert(result.message || "Invalid login credentials.");
            }

        } catch (error) {
            console.error("❌ Login error:", error);
            loginButton.classList.remove('loading');
            loginButton.disabled = false;
            alert("Connection error. Please check your internet connection and try again.");
        }
    });

    // Determine primary page for user based on their permissions
    function getPrimaryPageForUser(username, role, dept, permissions) {
        // Priority mapping for different users
        const userPrimaryPages = {
            'admin': '/public/admin.html',
            'ahdeyto': '/public/admin.html',
            'jmticatic': '/public/admin.html',
            'auvanguardia': '/public/admin.html',
            'apandal': '/public/admin.html',
            'rppenaranada': '/public/admin.html',
            'somicosa': '/public/index.html',
            'poreyes': '/public/index.html',
            'muestolas': '/public/index.html',
            'ccmacaraig': '/public/labindex.html',
            'kgstarosa': '/public/followup.html'
        };

        // Return user-specific page if defined
        if (userPrimaryPages[username]) {
            return userPrimaryPages[username];
        }

        // Fallback based on role and department
        if (role === 'admin') {
            return '/public/admin.html';
        }

        // Check which pages user can edit (their primary access)
        if (permissions.canEdit && permissions.canEdit.length > 0) {
            const editablePages = permissions.canEdit;
            
            // Priority order for page selection
            if (editablePages.includes('admin.html')) return '/public/admin.html';
            if (editablePages.includes('index.html')) return '/public/index.html';
            if (editablePages.includes('labindex.html')) return '/public/labindex.html';
            if (editablePages.includes('followup.html')) return '/public/followup.html';
        }

        // Final fallback based on department
        const departmentFallback = {
            'Admin': '/public/admin.html',
            'Program': '/public/index.html',
            'Laboratory': '/public/labindex.html',
            'Follow Up': '/public/followup.html'
        };

        return departmentFallback[dept] || '/public/index.html';
    }

    // Mouse parallax effect
    document.addEventListener('mousemove', function (e) {
        const shapes = document.querySelectorAll('.shape');
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;

        shapes.forEach((shape, index) => {
            const speed = (index + 1) * 0.5;
            const xOffset = (x - 0.5) * speed;
            const yOffset = (y - 0.5) * speed;

            shape.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
        });
    });
});

// Toggle password visibility
function togglePassword() {
    const passwordInput = document.getElementById("password");
    const passwordText = document.getElementById("password-text");

    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        passwordText.textContent = "HIDE";
    } else {
        passwordInput.type = "password";
        passwordText.textContent = "SHOW";
    }
}

// Forgot password
function forgotPassword() {
    alert("Please contact your administrator to reset your password.");
}

// Sign up
function signUp() {
    alert("Please contact your administrator to create an account.");
}