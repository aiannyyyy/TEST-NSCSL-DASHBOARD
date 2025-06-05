  document.addEventListener("DOMContentLoaded", function () {
            const loginButton = document.getElementById("loginButton");
            const usernameInput = document.getElementById("username");
            const passwordInput = document.getElementById("password");

            // ✅ Set focus to username field on page load
            usernameInput.focus();

            // Handle floating labels
            function handleFloatingLabel(inputId, wrapperId) {
                const input = document.getElementById(inputId);
                const wrapper = document.getElementById(wrapperId);
                
                input.addEventListener('input', function() {
                    if (this.value.length > 0) {
                        wrapper.classList.add('has-value');
                    } else {
                        wrapper.classList.remove('has-value');
                    }
                });
                
                input.addEventListener('focus', function() {
                    wrapper.classList.add('has-value');
                });
                
                input.addEventListener('blur', function() {
                    if (this.value.length === 0) {
                        wrapper.classList.remove('has-value');
                    }
                });
            }

            // Initialize floating labels
            handleFloatingLabel('username', 'usernameWrapper');
            handleFloatingLabel('password', 'passwordWrapper');

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

                // Add loading state
                loginButton.classList.add('loading');
                loginButton.disabled = true;

                try {
                    const response = await fetch("http://localhost:3001/api/auth/login", { 
                        method: "POST", 
                        headers: { "Content-Type": "application/json" }, 
                        body: JSON.stringify({ username, password }) 
                    });
                    
                    const result = await response.json();

                    if (response.ok && result.success) {
                        const { name, dept } = result.user;
                        
                        // Store user data in localStorage for your implementation
                        localStorage.setItem("username", name);
                        localStorage.setItem("dept", dept);
                        
                        const redirectMap = {
                            "Admin": "/public/admin.html",
                            "Laboratory": "/public/labindex.html",
                            "Program": "/public/index.html",
                            "Follow Up": "/public/followup.html"
                        };

                        // Remove loading state before redirect
                        loginButton.classList.remove('loading');
                        loginButton.disabled = false;

                        window.location.href = redirectMap[dept] || "/public/admin.html";
                    } else {
                        // Remove loading state on error
                        loginButton.classList.remove('loading');
                        loginButton.disabled = false;
                        alert(result.message);
                    }

                } catch (error) {
                    console.error("Login error:", error);
                    // Remove loading state on error
                    loginButton.classList.remove('loading');
                    loginButton.disabled = false;
                    alert("Something went wrong. Please try again.");
                }
            });

            // Add some interactive effects
            document.addEventListener('mousemove', function(e) {
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
                passwordInput.type = "text"; // Show password
                eyeIcon.className = "fas fa-eye-slash"; // Change icon (open eye)
            } else {
                passwordInput.type = "password"; // Hide password
                eyeIcon.className = "fas fa-eye"; // Change icon (closed eye)
            }
        }

        // Forgot password functionality
        function forgotPassword() {
            alert('Please contact your administrator');
        }