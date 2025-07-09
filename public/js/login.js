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