/*
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
*/
// universal-auth.js - Single file that handles everything automatically
// Just include this ONE script in your main template or layout file
(function() {
    'use strict';

    console.log("🔐 Enhanced Universal Authentication System Loading...");

    // Configuration - Easy to modify
    const CONFIG = {
        LOGIN_URL: 'index.html',
        API_BASE: 'http://localhost:3001/api/auth',
        SESSION_TIMEOUT_HOURS: 24,
        
        // 🎯 ADD/MODIFY USER PERMISSIONS HERE
        USER_PERMISSIONS: {
        // ADMIN USERS - Full access
        'admin': {
            canEdit: ['admin.html', 'index.html', 'labindex.html', 'followup.html', 
                    'sample_screened.html', 'sample_receive.html', 'pdo_endorsements.html', 
                    'nsfperformance.html', 'demographics.html', 'it-job-order.html', 
                    'list-of-car.html', 'pdo-job-order-tracker.html', 'screen_received.html'],
            readOnly: [],
            primaryPage: 'admin.html'
        },
        
        'ahdeyto': {
            canEdit: ['admin.html', 'index.html', 'labindex.html', 'followup.html', 
                    'sample_screened.html', 'sample_receive.html', 'pdo_endorsements.html', 
                    'nsfperformance.html', 'demographics.html', 'it-job-order.html', 
                    'list-of-car.html', 'pdo-job-order-tracker.html', 'screen_received.html'],
            readOnly: [],
            primaryPage: 'admin.html'
        },

        'jmticatic': {
            canEdit: ['admin.html', 'index.html', 'labindex.html', 'followup.html', 
                    'sample_screened.html', 'sample_receive.html', 'pdo_endorsements.html', 
                    'nsfperformance.html', 'demographics.html', 'it-job-order.html', 
                    'list-of-car.html', 'pdo-job-order-tracker.html', 'screen_received.html'],
            readOnly: [],
            primaryPage: 'admin.html'
        },

        'auvanguardia': {
            canEdit: ['admin.html', 'index.html', 'labindex.html', 'followup.html', 
                    'sample_screened.html', 'sample_receive.html', 'pdo_endorsements.html', 
                    'nsfperformance.html', 'demographics.html', 'it-job-order.html', 
                    'list-of-car.html', 'pdo-job-order-tracker.html', 'screen_received.html'],
            readOnly: [],
            primaryPage: 'admin.html'
        },

        'apandal': {
            canEdit: ['admin.html', 'index.html', 'labindex.html', 'followup.html', 
                    'sample_screened.html', 'sample_receive.html', 'pdo_endorsements.html', 
                    'nsfperformance.html', 'demographics.html', 'it-job-order.html', 
                    'list-of-car.html', 'pdo-job-order-tracker.html', 'screen_received.html'],
            readOnly: [],
            primaryPage: 'admin.html'
        },

        'rppenaranada': {
            canEdit: ['admin.html'],
            readOnly: ['index.html', 'labindex.html', 'followup.html', 'sample_screened.html', 
                    'sample_receive.html', 'pdo_endorsements.html', 'nsfperformance.html', 
                    'demographics.html', 'it-job-order.html', 'list-of-car.html', 
                    'pdo-job-order-tracker.html', 'screen_received.html'],
            primaryPage: 'admin.html'
        },

        // PROGRAM USERS
        'somicosa': {
            canEdit: ['index.html', 'sample_screened.html', 'sample_receieve.html', 'sample_receive.html',
                    'pdo_endorsements.html', 'nsfperformance.html', 'pdo-job-order-tracker.html', 
                    'list-of-car.html'],
            readOnly: ['admin.html', 'labindex.html', 'followup.html', 'demographics.html', 
                    'it-job-order.html', 'screen_received.html'],
            primaryPage: 'index.html'
        },

        'poreyes': {
            canEdit: ['index.html', 'sample_screened.html', 'sample_receieve.html', 'sample_receive.html',
                    'pdo_endorsements.html', 'nsfperformance.html', 'pdo-job-order-tracker.html', 
                    'list-of-car.html'],
            readOnly: ['admin.html', 'labindex.html', 'followup.html', 'demographics.html', 
                    'it-job-order.html', 'screen_received.html'],
            primaryPage: 'index.html'
        },

        'muestolas': {
            canEdit: ['index.html', 'sample_screened.html', 'sample_receieve.html', 'sample_receive.html',
                    'pdo_endorsements.html', 'nsfperformance.html', 'pdo-job-order-tracker.html', 
                    'list-of-car.html'],
            readOnly: ['admin.html', 'labindex.html', 'followup.html', 'demographics.html', 
                    'it-job-order.html', 'screen_received.html'],
            primaryPage: 'index.html'
        },

        // LABORATORY USER
        'ccmacaraig': {
            canEdit: ['labindex.html', 'demographics.html'],
            readOnly: ['admin.html', 'index.html', 'followup.html', 'sample_screened.html', 
                    'sample_receive.html', 'pdo_endorsements.html', 'nsfperformance.html', 
                    'it-job-order.html', 'list-of-car.html', 'pdo-job-order-tracker.html',
                    'screen_received.html'],
            primaryPage: 'labindex.html'
        },

        // FOLLOW UP USER
        'kgstarosa': {
            canEdit: ['followup.html'],
            readOnly: ['admin.html', 'index.html', 'labindex.html', 'sample_screened.html', 
                    'sample_receive.html', 'pdo_endorsements.html', 'nsfperformance.html', 
                    'demographics.html', 'it-job-order.html', 'list-of-car.html', 
                    'pdo-job-order-tracker.html', 'screen_received.html'],
            primaryPage: 'followup.html'
        }
    }
    };

    // State management
    let authInitialized = false;
    let readOnlyObserver = null;

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    /*
    function initialize() {
        if (authInitialized) return;
        authInitialized = true;
E
        const currentPath = window.location.pathname;
        
        // Skip authentication for login page
        if (currentPath.includes('login.html')) {
            initializeLoginPage();
            return;
        }

        // Initialize authentication for protected pages
        initializeProtectedPage();
    }
    */
   
    function initializeLoginPage() {
        console.log("🔑 Initializing login page...");
        
        // Enhanced login functionality
        const loginForm = document.getElementById('loginForm');
        if (!loginForm) return;

        loginForm.addEventListener('submit', handleLogin);
        
        // Auto-focus username field
        const usernameField = document.getElementById('username');
        if (usernameField) {
            usernameField.focus();
        }
    }

    async function handleLogin(event) {
        event.preventDefault();
        
        const username = document.getElementById('username')?.value.trim();
        const password = document.getElementById('password')?.value.trim();
        const loginButton = document.getElementById('loginButton');

        if (!username || !password) {
            showNotification('Please fill in both fields', 'error');
            return;
        }

        if (loginButton) {
            loginButton.disabled = true;
            loginButton.textContent = 'Logging in...';
        }

        try {
            const response = await fetch(`${CONFIG.API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                const userData = result.user;
                const permissions = result.permissions || CONFIG.USER_PERMISSIONS[userData.username] || getDefaultPermissions(userData);

                // Store user data
                storeUserData(userData, permissions);

                // Redirect to appropriate page
                const redirectUrl = getRedirectUrl(userData.username, userData.role, userData.dept, permissions);
                window.location.href = redirectUrl;
            } else {
                showNotification(result.message || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showNotification('Connection error. Please try again.', 'error');
        } finally {
            if (loginButton) {
                loginButton.disabled = false;
                loginButton.textContent = 'LOGIN';
            }
        }
    }

    function initializeProtectedPage() {
        console.log("🛡️ Initializing protected page...");
        
        // Check authentication
        const userData = getUserData();
        if (!userData.isValid) {
            redirectToLogin('Authentication required');
            return;
        }

        // Check page access
        const currentPage = getCurrentPageName();
        const hasAccess = checkPageAccess(userData.userUsername, currentPage, userData.permissions);
        
        if (!hasAccess.canView) {
            redirectToUserHome(userData, 'Access denied to this page');
            return;
        }

        // Initialize page with user permissions
        initializePageUI(userData, hasAccess.canEdit);
        
        console.log(`✅ Page initialized for ${userData.userUsername} - ${hasAccess.canEdit ? 'EDIT' : 'READ-ONLY'} access`);
    }

    function getUserData() {
        try {
            const userUsername = localStorage.getItem('user_username');
            const username = localStorage.getItem('username');
            const userId = localStorage.getItem('user_id');
            const dept = localStorage.getItem('dept');
            const role = localStorage.getItem('role');
            const permissionsStr = localStorage.getItem('permissions');
            const loginTime = localStorage.getItem('loginTime');

            if (!userUsername || !username || !userId || !dept || !role) {
                return { isValid: false };
            }

            // Check session timeout
            if (loginTime) {
                const loginDate = new Date(loginTime);
                const hoursDiff = (new Date() - loginDate) / (1000 * 60 * 60);
                if (hoursDiff > CONFIG.SESSION_TIMEOUT_HOURS) {
                    clearUserData();
                    return { isValid: false, reason: 'Session expired' };
                }
            }

            let permissions = CONFIG.USER_PERMISSIONS[userUsername];
            if (!permissions && permissionsStr) {
                try {
                    permissions = JSON.parse(permissionsStr);
                } catch (e) {
                    permissions = getDefaultPermissions({ role, dept });
                }
            }

            return {
                isValid: true,
                userUsername,
                username,
                userId,
                dept,
                role,
                permissions: permissions || getDefaultPermissions({ role, dept }),
                loginTime
            };
        } catch (error) {
            console.error('Error getting user data:', error);
            return { isValid: false };
        }
    }

    function checkPageAccess(username, pageName, permissions) {
        const canEdit = permissions.canEdit.includes(pageName);
        const canView = canEdit || permissions.readOnly.includes(pageName);
        
        return { canEdit, canView };
    }

    function initializePageUI(userData, canEdit) {
        // Add global user auth object
        window.userAuth = {
            username: userData.userUsername,
            name: userData.username,
            userId: userData.userId,
            dept: userData.dept,
            role: userData.role,
            permissions: userData.permissions,
            isReadOnly: !canEdit,
            hasEditAccess: canEdit
        };

        // Apply UI modifications
        if (!canEdit) {
            applyReadOnlyMode();
        }

        // Update user interface elements
        updateUserInterface(userData, canEdit);
        
        // Setup global utilities
        setupGlobalUtilities();
    }

    function applyReadOnlyMode() {
        console.log("🔒 Applying read-only mode...");
        
        // Add CSS for read-only mode
        injectReadOnlyCSS();
        
        // Add read-only banner
        addReadOnlyBanner();
        
        // Apply restrictions with multiple attempts to ensure they stick
        applyReadOnlyRestrictions();
        
        // Set up observer for dynamically added content
        setupDynamicContentObserver();
        
        // Apply restrictions again after a short delay for dynamic content
        setTimeout(applyReadOnlyRestrictions, 500);
        setTimeout(applyReadOnlyRestrictions, 1000);
        setTimeout(applyReadOnlyRestrictions, 2000);
    }

    function applyReadOnlyRestrictions() {
        // Disable form inputs with comprehensive selector
        const inputSelectors = [
            'input[type="text"]',
            'input[type="number"]',
            'input[type="email"]',
            'input[type="tel"]',
            'input[type="url"]',
            'input[type="password"]',
            'input[type="date"]',
            'input[type="datetime-local"]',
            'input[type="month"]',
            'input[type="week"]',
            'input[type="time"]',
            'input[type="search"]',
            'input[type="color"]',
            'input[type="range"]',
            'input[type="file"]',
            'input[type="hidden"]',
            'input[type="checkbox"]:not(.readonly-exception)',
            'input[type="radio"]:not(.readonly-exception)',
            'textarea:not(.readonly-exception)',
            'select:not(.readonly-exception)'
        ];

        const inputs = document.querySelectorAll(inputSelectors.join(', '));
        inputs.forEach(input => {
            if (!input.classList.contains('search-input') && !input.classList.contains('filter-input')) {
                input.disabled = true;
                input.readOnly = true;
                input.style.opacity = '0.6';
                input.style.cursor = 'not-allowed';
                input.title = 'Read-only access - Contact administrator for edit permissions';
                
                // Prevent any input changes
                input.addEventListener('input', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                });
                
                input.addEventListener('change', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                });
            }
        });

        // Disable action buttons with comprehensive approach
        const buttonSelectors = [
            'button:not(.readonly-allowed)',
            'input[type="submit"]:not(.readonly-allowed)',
            'input[type="button"]:not(.readonly-allowed)',
            '.btn:not(.readonly-allowed)',
            '[onclick]:not(.readonly-allowed)'
        ];

        const actionElements = document.querySelectorAll(buttonSelectors.join(', '));
        actionElements.forEach(element => {
            const elementText = (element.textContent || element.value || '').toLowerCase();
            const isAllowedAction = [
                'view', 'show', 'display', 'search', 'filter', 'export', 'print', 
                'close', 'cancel', 'back', 'logout', 'refresh', 'reload', 'download',
                'preview', 'navigate', 'go', 'next', 'previous', 'home'
            ].some(allowed => elementText.includes(allowed));

            if (!isAllowedAction && !element.classList.contains('readonly-allowed')) {
                element.disabled = true;
                element.style.opacity = '0.6';
                element.style.cursor = 'not-allowed';
                element.title = 'Action disabled - Read-only access';
                
                // Remove existing click handlers and add prevention
                const newElement = element.cloneNode(true);
                element.parentNode.replaceChild(newElement, element);
                
                newElement.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    showNotification('Action disabled - Read-only access', 'warning');
                    return false;
                });
            }
        });

        // Prevent form submissions
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                e.stopPropagation();
                showNotification('Form submission disabled - Read-only access', 'warning');
                return false;
            });
        });

        // Prevent contenteditable elements
        const editableElements = document.querySelectorAll('[contenteditable="true"]');
        editableElements.forEach(element => {
            element.contentEditable = 'false';
            element.style.opacity = '0.6';
        });

        // Disable drag and drop
        document.addEventListener('drop', function(e) {
            e.preventDefault();
            showNotification('File operations disabled - Read-only access', 'warning');
        });

        document.addEventListener('dragover', function(e) {
            e.preventDefault();
        });
    }

    function setupDynamicContentObserver() {
        if (readOnlyObserver) {
            readOnlyObserver.disconnect();
        }

        readOnlyObserver = new MutationObserver(function(mutations) {
            let shouldReapplyRestrictions = false;
            
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const hasInputs = node.querySelectorAll && node.querySelectorAll('input, textarea, select, button, form').length > 0;
                            const isInput = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'FORM'].includes(node.tagName);
                            
                            if (hasInputs || isInput) {
                                shouldReapplyRestrictions = true;
                            }
                        }
                    });
                }
            });

            if (shouldReapplyRestrictions) {
                setTimeout(applyReadOnlyRestrictions, 100);
            }
        });

        readOnlyObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    function injectReadOnlyCSS() {
        // Remove existing styles
        const existingStyle = document.getElementById('universal-auth-styles');
        if (existingStyle) {
            existingStyle.remove();
        }

        const style = document.createElement('style');
        style.id = 'universal-auth-styles';
        style.textContent = `
            /* ULTRA AGGRESSIVE Read-only mode styling */
            .read-only-mode input:not(.search-input):not(.filter-input):not(.readonly-exception),
            .read-only-mode textarea:not(.readonly-exception),
            .read-only-mode select:not(.readonly-exception) {
                background-color: #f5f5f5 !important;
                color: #666 !important;
                cursor: not-allowed !important;
                border: 1px solid #ddd !important;
                opacity: 0.6 !important;
                pointer-events: none !important;
            }

            /* Disable ALL buttons except allowed ones - INCLUDING SPAN/DIV BUTTONS */
            .read-only-mode button:not(.readonly-allowed):not(.readonly-allowed-auto),
            .read-only-mode .btn:not(.readonly-allowed):not(.readonly-allowed-auto),
            .read-only-mode input[type="submit"]:not(.readonly-allowed):not(.readonly-allowed-auto),
            .read-only-mode input[type="button"]:not(.readonly-allowed):not(.readonly-allowed-auto),
            .read-only-mode input[type="reset"]:not(.readonly-allowed):not(.readonly-allowed-auto),
            .read-only-mode [onclick]:not(.readonly-allowed):not(.readonly-allowed-auto),
            .read-only-mode [role="button"]:not(.readonly-allowed):not(.readonly-allowed-auto),
            .read-only-mode .close-btn:not(.readonly-allowed):not(.readonly-allowed-auto),
            .read-only-mode .close-button:not(.readonly-allowed):not(.readonly-allowed-auto),
            .read-only-mode .delete-btn:not(.readonly-allowed):not(.readonly-allowed-auto),
            .read-only-mode .remove-btn:not(.readonly-allowed):not(.readonly-allowed-auto),
            .read-only-mode .edit-btn:not(.readonly-allowed):not(.readonly-allowed-auto),
            .read-only-mode .save-btn:not(.readonly-allowed):not(.readonly-allowed-auto),
            .read-only-mode .update-btn:not(.readonly-allowed):not(.readonly-allowed-auto),
            .read-only-mode .add-btn:not(.readonly-allowed):not(.readonly-allowed-auto),
            .read-only-mode .create-btn:not(.readonly-allowed):not(.readonly-allowed-auto),
            .read-only-mode span[class*="btn"]:not(.readonly-allowed):not(.readonly-allowed-auto),
            .read-only-mode span[class*="close"]:not(.readonly-allowed):not(.readonly-allowed-auto),
            .read-only-mode span[class*="delete"]:not(.readonly-allowed):not(.readonly-allowed-auto),
            .read-only-mode span[class*="remove"]:not(.readonly-allowed):not(.readonly-allowed-auto),
            .read-only-mode span[class*="edit"]:not(.readonly-allowed):not(.readonly-allowed-auto),
            .read-only-mode span[class*="save"]:not(.readonly-allowed):not(.readonly-allowed-auto),
            .read-only-mode span[class*="add"]:not(.readonly-allowed):not(.readonly-allowed-auto),
            .read-only-mode div[class*="btn"]:not(.readonly-allowed):not(.readonly-allowed-auto),
            .read-only-mode div[class*="close"]:not(.readonly-allowed):not(.readonly-allowed-auto),
            .read-only-mode div[class*="delete"]:not(.readonly-allowed):not(.readonly-allowed-auto),
            .read-only-mode div[class*="remove"]:not(.readonly-allowed):not(.readonly-allowed-auto),
            .read-only-mode div[class*="edit"]:not(.readonly-allowed):not(.readonly-allowed-auto),
            .read-only-mode div[class*="save"]:not(.readonly-allowed):not(.readonly-allowed-auto),
            .read-only-mode div[class*="add"]:not(.readonly-allowed):not(.readonly-allowed-auto) {
                opacity: 0.6 !important;
                cursor: not-allowed !important;
                pointer-events: none !important;
                background-color: #f5f5f5 !important;
                color: #666 !important;
                border-color: #ddd !important;
                user-select: none !important;
            }

            /* Additional safety nets */
            .read-only-mode *[disabled] {
                pointer-events: none !important;
                opacity: 0.6 !important;
                cursor: not-allowed !important;
            }

            .read-only-mode form {
                pointer-events: none !important;
            }

            .read-only-mode form input.search-input,
            .read-only-mode form input.readonly-exception,
            .read-only-mode form .readonly-allowed {
                pointer-events: auto !important;
            }

            /* Override any hover effects on disabled elements */
            .read-only-mode *[disabled]:hover,
            .read-only-mode button:not(.readonly-allowed):not(.readonly-allowed-auto):hover {
                opacity: 0.6 !important;
                cursor: not-allowed !important;
                transform: none !important;
                box-shadow: none !important;
            }

            #read-only-banner {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: linear-gradient(90deg, #ff6b6b, #ffa726);
                color: white;
                padding: 8px 15px;
                text-align: center;
                font-weight: bold;
                font-size: 14px;
                z-index: 10000;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                animation: slideDown 0.3s ease-out;
            }

            @keyframes slideDown {
                from { transform: translateY(-100%); }
                to { transform: translateY(0); }
            }

            .auth-notification {
                position: fixed;
                top: 60px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 5px;
                color: white;
                font-weight: bold;
                z-index: 9999;
                animation: slideIn 0.3s ease-out;
                max-width: 300px;
                word-wrap: break-word;
            }

            .auth-notification.success { background: #51cf66; }
            .auth-notification.error { background: #ff6b6b; }
            .auth-notification.warning { background: #ffa726; }
            .auth-notification.info { background: #339af0; }

            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }

            body.read-only-mode {
                margin-top: 40px !important;
            }

            /* Prevent text selection on disabled elements */
            .read-only-mode *[disabled] {
                user-select: none !important;
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
            }

            /* Style for automatically detected allowed buttons */
            .read-only-mode .readonly-allowed-auto {
                opacity: 1 !important;
                cursor: pointer !important;
                pointer-events: auto !important;
            }
        `;
        document.head.appendChild(style);
    }

    function addReadOnlyBanner() {
        // Remove existing banner
        const existingBanner = document.getElementById('read-only-banner');
        if (existingBanner) {
            existingBanner.remove();
        }

        const banner = document.createElement('div');
        banner.id = 'read-only-banner';
        banner.innerHTML = '🔒 READ-ONLY MODE - You have view access only. Contact administrator for edit permissions.';
        
        document.body.appendChild(banner);
        document.body.classList.add('read-only-mode');
    }

    function updateUserInterface(userData, canEdit) {
        // Update any existing user info elements
        const userInfoElements = document.querySelectorAll('#user-info, .user-info');
        userInfoElements.forEach(element => {
            element.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                    <span style="font-weight: bold;">${userData.username}</span>
                    <span style="color: #666; font-size: 0.9em;">${userData.dept}</span>
                    <span style="color: #666; font-size: 0.9em;">${userData.role}</span>
                    <span style="background: ${canEdit ? '#51cf66' : '#ff6b6b'}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold;">
                        ${canEdit ? 'EDIT ACCESS' : 'READ ONLY'}
                    </span>
                </div>
            `;
        });
    }

    function setupGlobalUtilities() {
        // Global authentication utilities
        window.authUtils = {
            canEditPage: (pageName) => window.userAuth?.permissions.canEdit.includes(pageName) || false,
            canViewPage: (pageName) => {
                if (!window.userAuth) return false;
                const perms = window.userAuth.permissions;
                return perms.canEdit.includes(pageName) || perms.readOnly.includes(pageName);
            },
            getCurrentUser: () => window.userAuth || null,
            hasRole: (roleName) => window.userAuth?.role === roleName || false,
            isReadOnly: () => window.userAuth?.isReadOnly || false,
            logout: async () => {
                if (confirm('Are you sure you want to logout?')) {
                    try {
                        await fetch(`${CONFIG.API_BASE}/logout`, { 
                            method: 'POST',
                            credentials: 'include'
                        });
                    } catch (e) {
                        console.error('Logout request failed:', e);
                    }
                    clearUserData();
                    window.location.href = CONFIG.LOGIN_URL;
                }
            }
        };
    }

    // Utility functions
    function storeUserData(userData, permissions) {
        localStorage.setItem('user_id', userData.id.toString());
        localStorage.setItem('username', userData.name);
        localStorage.setItem('user_username', userData.username);
        localStorage.setItem('dept', userData.dept);
        localStorage.setItem('position', userData.position);
        localStorage.setItem('role', userData.role);
        localStorage.setItem('permissions', JSON.stringify(permissions));
        localStorage.setItem('loginTime', new Date().toISOString());
    }

    function clearUserData() {
        const keys = ['user_id', 'username', 'user_username', 'dept', 'role', 'position', 'permissions', 'loginTime'];
        keys.forEach(key => localStorage.removeItem(key));
    }

    function getCurrentPageName() {
        return window.location.pathname.split('/').pop() || 'index.html';
    }

    function getRedirectUrl(username, role, dept, permissions) {
        const userConfig = CONFIG.USER_PERMISSIONS[username];
        if (userConfig?.primaryPage) {
            return userConfig.primaryPage;
        }

        const deptMap = {
            'Admin': 'admin.html',
            'Program': 'index.html',
            'Laboratory': 'labindex.html',
            'Follow Up': 'followup.html'
        };

        return deptMap[dept] || 'index.html';
    }

    function getDefaultPermissions(userData) {
        // Fallback permissions based on role and department
        const { role, dept } = userData;
        
        if (role === 'admin') {
            return {
                canEdit: ['admin.html', 'index.html', 'labindex.html', 'followup.html'],
                readOnly: [],
                primaryPage: 'admin.html'
            };
        }

        const deptPermissions = {
            'Program': {
                canEdit: ['index.html', 'sample_screened.html', 'sample_receieve.html', 'pdo_endorsements.html', 'nsfperformance.html'],
                readOnly: ['admin.html', 'labindex.html', 'followup.html'],
                primaryPage: 'index.html'
            },
            'Laboratory': {
                canEdit: ['labindex.html', 'demographics.html'],
                readOnly: ['admin.html', 'index.html', 'followup.html'],
                primaryPage: 'labindex.html'
            },
            'Follow Up': {
                canEdit: ['followup.html'],
                readOnly: ['admin.html', 'index.html', 'labindex.html'],
                primaryPage: 'followup.html'
            }
        };

        return deptPermissions[dept] || { canEdit: [], readOnly: [], primaryPage: 'index.html' };
    }

    function redirectToLogin(message) {
        if (message) {
            showNotification(message, 'warning');
        }
        setTimeout(() => {
            window.location.href = CONFIG.LOGIN_URL;
        }, 1000);
    }

    function redirectToUserHome(userData, message) {
        if (message) {
            showNotification(message, 'warning');
        }
        
        const homeUrl = getRedirectUrl(userData.userUsername, userData.role, userData.dept, userData.permissions);
        setTimeout(() => {
            window.location.href = homeUrl;
        }, 1500);
    }

    function showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.auth-notification');
        existingNotifications.forEach(notif => notif.remove());

        const notification = document.createElement('div');
        notification.className = `auth-notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    // Public API
    window.UniversalAuth = {
        getCurrentUser: () => window.userAuth,
        isReadOnly: () => window.userAuth?.isReadOnly || false,
        canEdit: (page) => window.userAuth?.permissions.canEdit.includes(page) || false,
        logout: () => window.authUtils?.logout()
    };

    console.log("✅ Enhanced Universal Authentication System Ready");

})();