(function() {
    'use strict';

    console.log("Enhanced Universal Authentication System Loading...");

    // Configuration - Easy to modify
    const CONFIG = {
        LOGIN_URL: '/login.html',
        API_BASE: 'http://localhost:3001/api/auth',
        SESSION_TIMEOUT_HOURS: 24,
        
        // User Permissions Configuration
        USER_PERMISSIONS: {
            // ADMIN USERS - Full access
            'admin': {
                canEdit: ['admin.html', 'index.html', 'labindex.html', 'followup.html', 
                        'sample_screened.html', 'sample_receive.html', 'pdo_endorsements.html', 
                        'nsfperformance.html', 'demographics.html', 'it-job-order.html', 
                        'list-of-car.html', 'pdo-job-order-tracker.html', 'screen_received.html'],
                readOnly: [],
                primaryPage: '/public/admin.html'
            },
            
            'ahdeyto': {
                canEdit: ['admin.html', 'index.html', 'labindex.html', 'followup.html', 
                        'sample_screened.html', 'sample_receive.html', 'pdo_endorsements.html', 
                        'nsfperformance.html', 'demographics.html', 'it-job-order.html', 
                        'list-of-car.html', 'pdo-job-order-tracker.html', 'screen_received.html'],
                readOnly: [],
                primaryPage: '/public/admin.html'
            },

            'jmticatic': {
                canEdit: ['admin.html', 'index.html', 'labindex.html', 'followup.html', 
                        'sample_screened.html', 'sample_receive.html', 'pdo_endorsements.html', 
                        'nsfperformance.html', 'demographics.html', 'it-job-order.html', 
                        'list-of-car.html', 'pdo-job-order-tracker.html', 'screen_received.html'],
                readOnly: [],
                primaryPage: '/public/admin.html'
            },

            'auvanguardia': {
                canEdit: ['admin.html', 'index.html', 'labindex.html', 'followup.html', 
                        'sample_screened.html', 'sample_receive.html', 'pdo_endorsements.html', 
                        'nsfperformance.html', 'demographics.html', 'it-job-order.html', 
                        'list-of-car.html', 'pdo-job-order-tracker.html', 'screen_received.html'],
                readOnly: [],
                primaryPage: '/public/admin.html'
            },

            'apandal': {
                canEdit: ['admin.html', 'index.html', 'labindex.html', 'followup.html', 
                        'sample_screened.html', 'sample_receive.html', 'pdo_endorsements.html', 
                        'nsfperformance.html', 'demographics.html', 'it-job-order.html', 
                        'list-of-car.html', 'pdo-job-order-tracker.html', 'screen_received.html'],
                readOnly: [],
                primaryPage: '/public/admin.html'
            },

            'rppenaranada': {
                canEdit: ['admin.html'],
                readOnly: ['index.html', 'labindex.html', 'followup.html', 'sample_screened.html', 
                        'sample_receive.html', 'pdo_endorsements.html', 'nsfperformance.html', 
                        'demographics.html', 'it-job-order.html', 'list-of-car.html', 
                        'pdo-job-order-tracker.html', 'screen_received.html'],
                primaryPage: '/public/admin.html'
            },

            // PROGRAM USERS
            'somicosa': {
                canEdit: ['index.html', 'sample_screened.html', 'sample_receieve.html', 'sample_receive.html',
                        'pdo_endorsements.html', 'nsfperformance.html', 'pdo-job-order-tracker.html', 
                        'list-of-car.html'],
                readOnly: ['admin.html', 'labindex.html', 'followup.html', 'demographics.html', 
                        'it-job-order.html', 'screen_received.html'],
                primaryPage: '/public/index.html'
            },

            'poreyes': {
                canEdit: ['index.html', 'sample_screened.html', 'sample_receieve.html', 'sample_receive.html',
                        'pdo_endorsements.html', 'nsfperformance.html', 'pdo-job-order-tracker.html', 
                        'list-of-car.html'],
                readOnly: ['admin.html', 'labindex.html', 'followup.html', 'demographics.html', 
                        'it-job-order.html', 'screen_received.html'],
                primaryPage: '/public/index.html'
            },

            'muestolas': {
                canEdit: ['index.html', 'sample_screened.html', 'sample_receieve.html', 'sample_receive.html',
                        'pdo_endorsements.html', 'nsfperformance.html', 'pdo-job-order-tracker.html', 
                        'list-of-car.html'],
                readOnly: ['admin.html', 'labindex.html', 'followup.html', 'demographics.html', 
                        'it-job-order.html', 'screen_received.html'],
                primaryPage: '/public/index.html'
            },

            // LABORATORY USER
            'ccmacaraig': {
                canEdit: ['labindex.html', 'demographics.html'],
                readOnly: ['admin.html', 'index.html', 'followup.html', 'sample_screened.html', 
                        'sample_receive.html', 'pdo_endorsements.html', 'nsfperformance.html', 
                        'it-job-order.html', 'list-of-car.html', 'pdo-job-order-tracker.html',
                        'screen_received.html'],
                primaryPage: '/public/labindex.html'
            },

            // FOLLOW UP USER
            'kgstarosa': {
                canEdit: ['followup.html'],
                readOnly: ['admin.html', 'index.html', 'labindex.html', 'sample_screened.html', 
                        'sample_receive.html', 'pdo_endorsements.html', 'nsfperformance.html', 
                        'demographics.html', 'it-job-order.html', 'list-of-car.html', 
                        'pdo-job-order-tracker.html', 'screen_received.html'],
                primaryPage: '/public/followup.html'
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

    // MAIN INITIALIZATION FUNCTION - UNCOMMENTED AND FIXED
    function initialize() {
        if (authInitialized) return;
        authInitialized = true;

        const currentPath = window.location.pathname;
        
        console.log("Initializing auth system for:", currentPath);
        
        // Skip authentication for login page
        if (currentPath.includes('login.html') || currentPath.includes('/login')) {
            console.log("Login page detected, skipping protection");
            return;
        }

        // Initialize authentication for all other pages
        initializeProtectedPage();
    }

    function initializeProtectedPage() {
        console.log("Initializing protected page...");
        
        // Check authentication
        const userData = getUserData();
        if (!userData.isValid) {
            console.log("Invalid user data, redirecting to login");
            redirectToLogin('Authentication required');
            return;
        }

        console.log("User authenticated:", userData.userUsername);

        // Check page access
        const currentPage = getCurrentPageName();
        const hasAccess = checkPageAccess(userData.userUsername, currentPage, userData.permissions);
        
        console.log("Page access check:", currentPage, hasAccess);

        if (!hasAccess.canView) {
            console.log("Access denied to page:", currentPage);
            redirectToUserHome(userData, 'Access denied to this page');
            return;
        }

        // Initialize page with user permissions
        initializePageUI(userData, hasAccess.canEdit);
        
        console.log(`Page initialized for ${userData.userUsername} - ${hasAccess.canEdit ? 'EDIT' : 'READ-ONLY'} access`);
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
                console.log("Missing required user data");
                return { isValid: false };
            }

            // Check session timeout
            if (loginTime) {
                const loginDate = new Date(loginTime);
                const hoursDiff = (new Date() - loginDate) / (1000 * 60 * 60);
                if (hoursDiff > CONFIG.SESSION_TIMEOUT_HOURS) {
                    console.log("Session expired");
                    clearUserData();
                    return { isValid: false, reason: 'Session expired' };
                }
            }

            let permissions = CONFIG.USER_PERMISSIONS[userUsername];
            if (!permissions && permissionsStr) {
                try {
                    permissions = JSON.parse(permissionsStr);
                } catch (e) {
                    console.error("Error parsing permissions:", e);
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

        console.log("User auth object created:", window.userAuth);

        // Apply UI modifications
        if (!canEdit) {
            console.log("Applying read-only mode...");
            applyReadOnlyMode();
        } else {
            console.log("Edit mode enabled");
        }

        // Update user interface elements
        updateUserInterface(userData, canEdit);
        
        // Setup global utilities
        setupGlobalUtilities();
    }

    function applyReadOnlyMode() {
        console.log("Applying read-only mode restrictions...");
        
        // Add CSS for read-only mode
        injectReadOnlyCSS();
        
        // Add read-only banner
        addReadOnlyBanner();
        
        // Apply restrictions immediately
        applyReadOnlyRestrictions();
        
        // Set up observer for dynamically added content
        setupDynamicContentObserver();
        
        // Apply restrictions again after delays for dynamic content
        setTimeout(() => {
            console.log("Re-applying restrictions (500ms)");
            applyReadOnlyRestrictions();
        }, 500);
        
        setTimeout(() => {
            console.log("Re-applying restrictions (1000ms)");
            applyReadOnlyRestrictions();
        }, 1000);
        
        setTimeout(() => {
            console.log("Re-applying restrictions (2000ms)");
            applyReadOnlyRestrictions();
        }, 2000);
    }

    function applyReadOnlyRestrictions() {
        console.log("Executing read-only restrictions...");
        
        // Disable form inputs
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
            'input[type="checkbox"]:not(.readonly-exception)',
            'input[type="radio"]:not(.readonly-exception)',
            'textarea:not(.readonly-exception)',
            'select:not(.readonly-exception)'
        ];

        const inputs = document.querySelectorAll(inputSelectors.join(', '));
        console.log(`Found ${inputs.length} input elements to disable`);
        
        inputs.forEach(input => {
            if (!input.classList.contains('search-input') && 
                !input.classList.contains('filter-input') &&
                !input.classList.contains('readonly-exception')) {
                input.disabled = true;
                input.readOnly = true;
                input.style.opacity = '0.6';
                input.style.cursor = 'not-allowed';
                input.title = 'Read-only access - Contact administrator for edit permissions';
                
                // Prevent any input changes
                input.addEventListener('input', preventEvent, true);
                input.addEventListener('change', preventEvent, true);
            }
        });

        // Disable action buttons
        const buttonSelectors = [
            'button:not(.readonly-allowed)',
            'input[type="submit"]:not(.readonly-allowed)',
            'input[type="button"]:not(.readonly-allowed)',
            '.btn:not(.readonly-allowed)',
            '[onclick]:not(.readonly-allowed)'
        ];

        const actionElements = document.querySelectorAll(buttonSelectors.join(', '));
        console.log(`Found ${actionElements.length} buttons to check`);
        
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
                
                // Remove and prevent clicks
                element.addEventListener('click', preventEvent, true);
            }
        });

        // Prevent form submissions
        const forms = document.querySelectorAll('form');
        console.log(`Found ${forms.length} forms to protect`);
        
        forms.forEach(form => {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                e.stopPropagation();
                showNotification('Form submission disabled - Read-only access', 'warning');
                return false;
            }, true);
        });

        // Prevent contenteditable elements
        const editableElements = document.querySelectorAll('[contenteditable="true"]');
        editableElements.forEach(element => {
            element.contentEditable = 'false';
            element.style.opacity = '0.6';
        });

        // Disable drag and drop
        document.addEventListener('drop', preventDragDrop, true);
        document.addEventListener('dragover', function(e) { e.preventDefault(); }, true);
        
        console.log("Read-only restrictions applied successfully");
    }

    function preventEvent(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
    }

    function preventDragDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        showNotification('File operations disabled - Read-only access', 'warning');
        return false;
    }

    function setupDynamicContentObserver() {
        if (readOnlyObserver) {
            readOnlyObserver.disconnect();
        }

        console.log("Setting up mutation observer for dynamic content");

        readOnlyObserver = new MutationObserver(function(mutations) {
            let shouldReapplyRestrictions = false;
            
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const hasInputs = node.querySelectorAll && 
                                            node.querySelectorAll('input, textarea, select, button, form').length > 0;
                            const isInput = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'FORM'].includes(node.tagName);
                            
                            if (hasInputs || isInput) {
                                shouldReapplyRestrictions = true;
                            }
                        }
                    });
                }
            });

            if (shouldReapplyRestrictions) {
                console.log("Dynamic content detected, reapplying restrictions");
                setTimeout(applyReadOnlyRestrictions, 100);
            }
        });

        readOnlyObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    function injectReadOnlyCSS() {
        const existingStyle = document.getElementById('universal-auth-styles');
        if (existingStyle) {
            existingStyle.remove();
        }

        const style = document.createElement('style');
        style.id = 'universal-auth-styles';
        style.textContent = `
            /* Read-only mode styling */
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

            .read-only-mode button:not(.readonly-allowed),
            .read-only-mode .btn:not(.readonly-allowed),
            .read-only-mode input[type="submit"]:not(.readonly-allowed),
            .read-only-mode input[type="button"]:not(.readonly-allowed) {
                opacity: 0.6 !important;
                cursor: not-allowed !important;
                pointer-events: none !important;
                background-color: #f5f5f5 !important;
                color: #666 !important;
                border-color: #ddd !important;
            }

            #read-only-banner {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: linear-gradient(90deg, #ff6b6b, #ffa726);
                color: white;
                padding: 12px 20px;
                text-align: center;
                font-weight: bold;
                font-size: 14px;
                z-index: 999999;
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
                z-index: 999998;
                animation: slideIn 0.3s ease-out;
                max-width: 300px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
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
                padding-top: 45px !important;
            }
        `;
        document.head.appendChild(style);
        console.log("Read-only CSS injected");
    }

    function addReadOnlyBanner() {
        const existingBanner = document.getElementById('read-only-banner');
        if (existingBanner) {
            existingBanner.remove();
        }

        const banner = document.createElement('div');
        banner.id = 'read-only-banner';
        banner.innerHTML = 'READ-ONLY MODE - You have view access only. Contact administrator for edit permissions.';
        
        document.body.insertBefore(banner, document.body.firstChild);
        document.body.classList.add('read-only-mode');
        
        console.log("Read-only banner added");
    }

    function updateUserInterface(userData, canEdit) {
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

    function clearUserData() {
        const keys = ['user_id', 'username', 'user_username', 'dept', 'role', 'position', 'permissions', 'loginTime'];
        keys.forEach(key => localStorage.removeItem(key));
    }

    function getCurrentPageName() {
        const path = window.location.pathname;
        const pageName = path.split('/').pop() || 'index.html';
        return pageName;
    }

    function getDefaultPermissions(userData) {
        const { role, dept } = userData;
        
        if (role === 'admin') {
            return {
                canEdit: ['admin.html', 'index.html', 'labindex.html', 'followup.html'],
                readOnly: [],
                primaryPage: '/public/admin.html'
            };
        }

        const deptPermissions = {
            'Program': {
                canEdit: ['index.html', 'sample_screened.html', 'sample_receieve.html', 'pdo_endorsements.html', 'nsfperformance.html'],
                readOnly: ['admin.html', 'labindex.html', 'followup.html'],
                primaryPage: '/public/index.html'
            },
            'Laboratory': {
                canEdit: ['labindex.html', 'demographics.html'],
                readOnly: ['admin.html', 'index.html', 'followup.html'],
                primaryPage: '/public/labindex.html'
            },
            'Follow Up': {
                canEdit: ['followup.html'],
                readOnly: ['admin.html', 'index.html', 'labindex.html'],
                primaryPage: '/public/followup.html'
            }
        };

        return deptPermissions[dept] || { canEdit: [], readOnly: [], primaryPage: '/public/index.html' };
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
        
        const homeUrl = userData.permissions.primaryPage || '/public/index.html';
        setTimeout(() => {
            window.location.href = homeUrl;
        }, 1500);
    }

    function showNotification(message, type = 'info') {
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

    console.log("Enhanced Universal Authentication System Ready");

})();