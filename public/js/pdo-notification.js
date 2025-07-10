class NotificationManager {
    constructor() {
        this.notifications = [];
        this.userId = null;
        this.isLoading = false;
        this.pollingInterval = null;
        this.refreshInterval = null;
        this.elements = {};

        this.init();
    }

    init() {
        this.userId = this.getUserId();

        if (!this.userId) {
            console.error('❌ No user ID found. Please ensure user is logged in.');
            this.showError('User not logged in. Please login first.');
            return;
        }

        console.log('✅ Initialized NotificationManager for user_id:', this.userId);

        this.cacheElements();
        this.setupEventListeners();
        this.fetchNotifications(); // Initial load
        this.startPolling();       // Start background fetching
    }

    getUserId() {
        // 🔧 FIXED: Removed hardcoded fallback and improved user ID retrieval
        const userId = localStorage.getItem("user_id") ||
                    sessionStorage.getItem("user_id") ||
                    document.querySelector('[data-user-id]')?.getAttribute('data-user-id') ||
                    window.currentUserId;

        if (!userId) {
            console.error('❌ No user_id found in localStorage, sessionStorage, or data attributes');
            return null;
        }

        // Ensure it's a valid number
        const numericUserId = parseInt(userId);
        if (isNaN(numericUserId)) {
            console.error('❌ Invalid user_id format:', userId);
            return null;
        }

        return numericUserId.toString(); // Return as string for consistency
    }

    getUserName() {
        // Get user's name from localStorage (stored during login)
        return localStorage.getItem("username") || 
            sessionStorage.getItem("username") || 
            "User";
    }

    cacheElements() {
        this.elements = {
            notificationBell: document.getElementById('notificationBell'),
            notificationBadge: document.getElementById('notificationBadge'),
            notificationDropdown: document.getElementById('notificationDropdown'),
            notificationList: document.getElementById('notificationList'),
            clearAllBtn: document.getElementById('clearAllBtn')
        };
    }

    setupEventListeners() {
        const { notificationBell, notificationDropdown, clearAllBtn } = this.elements;

        notificationBell?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleDropdown();
        });

        document.addEventListener('click', (e) => {
            if (!notificationDropdown?.contains(e.target) && !notificationBell?.contains(e.target)) {
                this.closeDropdown();
            }
        });

        notificationDropdown?.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        clearAllBtn?.addEventListener('click', () => {
            this.clearAllNotifications();
        });

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.fetchNotifications();
            }
        });
    }

    async fetchNotifications() {
        if (this.isLoading || !this.userId) return;
        this.isLoading = true;

        this.showLoadingState();

        try {
            console.log('🔍 Fetching notifications for user_id:', this.userId);
            
            const response = await fetch(`http://localhost:3001/api/pdo-notification/${this.userId}`);
            const data = await response.json();

            if (data.success) {
                console.log('✅ Received notifications:', data.data.length);
                
                this.notifications = data.data.map(n => ({
                    id: n.notification_id,
                    type: this.getTypeFromTitle(n.title),
                    title: n.title,
                    message: n.message,
                    time: this.formatTimeAgo(n.created_at),
                    read: n.is_read === 1,
                    createdAt: new Date(n.created_at),
                    endorsedBy: n.endorsed_by || 'System'
                }));

                this.renderNotifications();
                this.updateBadge();
            } else {
                console.error('❌ Failed to fetch notifications:', data.message);
                this.showError(data.message || 'Failed to fetch notifications');
            }
        } catch (err) {
            console.error('❌ Fetch error:', err);
            this.showError('Unable to load notifications. Please try again.');
        } finally {
            this.isLoading = false;
        }
    }

    async fetchUnreadCount() {
        if (!this.userId) return;
        
        try {
            const response = await fetch(`http://localhost:3001/api/pdo-notification/${this.userId}/unread-count`);
            const data = await response.json();

            if (data.success) {
                this.updateBadge(data.count);
            }
        } catch (err) {
            console.error('Unread count error:', err);
        }
    }

    getTypeFromTitle(title) {
        const lower = title.toLowerCase();
        if (lower.includes('urgent') || lower.includes('critical') || lower.includes('error')) return 'danger';
        if (lower.includes('success') || lower.includes('complete') || lower.includes('approved')) return 'success';
        if (lower.includes('pending') || lower.includes('reminder')) return 'warning';
        return 'info';
    }

    formatTimeAgo(dateStr) {
        const then = new Date(dateStr);
        const now = new Date();
        const diff = Math.floor((now - then) / 60000);

        if (diff < 1) return "just now";
        if (diff < 60) return `${diff} minute${diff !== 1 ? 's' : ''} ago`;
        const hours = Math.floor(diff / 60);
        if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        const days = Math.floor(hours / 24);
        return `${days} day${days !== 1 ? 's' : ''} ago`;
    }

    renderNotifications() {
        const { notificationList } = this.elements;
        if (!notificationList) return;

        if (this.notifications.length === 0) {
            const userName = this.getUserName();
            notificationList.innerHTML = `
                <div class="no-notifications">
                    <i class="mdi mdi-bell-off-outline"></i>
                    <div>No notifications found for ${userName}</div>
                </div>
            `;
            return;
        }

        const sorted = this.notifications.sort((a, b) => b.createdAt - a.createdAt);

        notificationList.innerHTML = sorted.map(n => `
            <div class="notification-item ${!n.read ? 'unread' : ''}" data-id="${n.id}" style="cursor: pointer;">
                <div class="notification-icon ${n.type}">
                    <i class="mdi ${this.getNotificationIcon(n.type)}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${this.escapeHtml(n.title)}</div>
                    <div class="notification-message">${this.escapeHtml(n.message)}</div>
                    <div class="notification-time">${n.time}</div>
                    ${n.endorsedBy !== 'System' ? `<div class="notification-endorser">From: ${this.escapeHtml(n.endorsedBy)}</div>` : ''}
                </div>
                ${!n.read ? '<div class="unread-indicator"></div>' : ''}
            </div>
        `).join('');

        this.setupNotificationItemListeners();
    }

    setupNotificationItemListeners() {
        document.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = parseInt(item.dataset.id);
                this.handleNotificationClick(id);
            });
        });
    }

    // 🆕 NEW: Handle notification click with navigation
    async handleNotificationClick(id) {
        try {
            // Mark as read first
            await this.markAsRead(id);
            
            // Close the notification dropdown
            this.closeDropdown();
            
            // Navigate to PDO endorsements page
            this.navigateToPDOEndorsements();
            
        } catch (err) {
            console.error('❌ Error handling notification click:', err);
        }
    }

    // 🆕 NEW: Navigate to PDO endorsements page
    navigateToPDOEndorsements() {
        try {
            console.log('🔗 Navigating to PDO endorsements page...');
            console.log('📍 Current location:', window.location.href);
            
            // Since server.js serves files from public folder, use direct filename
            const targetPath = 'pdo_endorsements.html';
            
            console.log('🎯 Attempting navigation to:', targetPath);
            
            // Primary navigation attempt
            window.location.href = targetPath;
            
        } catch (err) {
            console.error('❌ Navigation error:', err);
            
            // Fallback: Try alternative navigation methods
            this.tryAlternativePaths();
        }
    }

    // 🆕 NEW: Try alternative paths if primary navigation fails
    tryAlternativePaths() {
        const fallbackPaths = [
            '/pdo_endorsements.html',           // Root path
            './pdo_endorsements.html',          // Explicit relative path
            window.location.origin + '/pdo_endorsements.html'  // Full URL
        ];
        
        console.log('🔄 Trying alternative paths...');
        
        // Try each path with a small delay
        let pathIndex = 0;
        const tryNextPath = () => {
            if (pathIndex < fallbackPaths.length) {
                const path = fallbackPaths[pathIndex];
                console.log(`🔍 Trying path ${pathIndex + 1}/${fallbackPaths.length}:`, path);
                
                try {
                    window.location.href = path;
                } catch (err) {
                    console.error(`❌ Failed to navigate to ${path}:`, err);
                    pathIndex++;
                    setTimeout(tryNextPath, 100); // Small delay before next attempt
                }
            } else {
                // All paths failed, show user-friendly message
                this.showNavigationError();
            }
        };
        
        tryNextPath();
    }

    // 🆕 NEW: Show navigation error to user
    showNavigationError() {
        console.error('❌ All navigation attempts failed');
        
        // Show user-friendly error message
        const errorMessage = `
            <div class="navigation-error" style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: #ff4444;
                color: white;
                padding: 15px 20px;
                border-radius: 5px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                z-index: 10000;
                max-width: 300px;
            ">
                <div style="font-weight: bold; margin-bottom: 5px;">
                    <i class="mdi mdi-alert-circle"></i>
                    Navigation Error
                </div>
                <div style="font-size: 14px;">
                    Could not find PDO endorsements page. Please check if the file exists.
                </div>
                <button onclick="this.parentElement.remove()" style="
                    background: none;
                    border: none;
                    color: white;
                    float: right;
                    cursor: pointer;
                    font-size: 18px;
                    margin-top: 5px;
                ">×</button>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', errorMessage);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            const errorEl = document.querySelector('.navigation-error');
            if (errorEl) {
                errorEl.remove();
            }
        }, 10000);
    }

    getNotificationIcon(type) {
        const icons = {
            info: 'mdi-information',
            success: 'mdi-check-circle',
            warning: 'mdi-alert',
            danger: 'mdi-alert-circle'
        };
        return icons[type] || 'mdi-bell';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateBadge(count = null) {
        const { notificationBadge } = this.elements;
        if (!notificationBadge) return;

        const unreadCount = count !== null ? count : this.notifications.filter(n => !n.read).length;

        notificationBadge.textContent = unreadCount;
        notificationBadge.style.display = unreadCount > 0 ? 'flex' : 'none';

        this.updateDocumentTitle(unreadCount);
    }

    updateDocumentTitle(unreadCount) {
        const base = document.title.replace(/^\(\d+\) /, '');
        document.title = unreadCount > 0 ? `(${unreadCount}) ${base}` : base;
    }

    async markAsRead(id) {
        try {
            const response = await fetch(`http://localhost:3001/api/pdo-notification/${id}/read`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();

            if (data.success) {
                this.notifications = this.notifications.map(n => n.id === id ? { ...n, read: true } : n);
                this.renderNotifications();
                this.updateBadge();
                console.log('✅ Notification marked as read:', id);
            } else {
                console.error('❌ Failed to mark notification as read:', data.message);
            }
        } catch (err) {
            console.error('❌ Mark as read error:', err);
        }
    }

    async clearAllNotifications() {
        if (!this.userId) return;

        const { clearAllBtn } = this.elements;
        if (clearAllBtn) {
            clearAllBtn.disabled = true;
            clearAllBtn.textContent = 'Clearing...';
        }

        try {
            const response = await fetch(`http://localhost:3001/api/pdo-notification/${this.userId}/mark-all-read`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();

            if (data.success) {
                this.notifications = this.notifications.map(n => ({ ...n, read: true }));
                this.renderNotifications();
                this.updateBadge();
            }
        } catch (err) {
            console.error('Clear error:', err);
        } finally {
            if (clearAllBtn) {
                clearAllBtn.disabled = false;
                clearAllBtn.textContent = 'Clear All';
            }
        }
    }

    toggleDropdown() {
        const { notificationDropdown } = this.elements;
        if (!notificationDropdown) return;

        const isOpen = notificationDropdown.classList.contains('show');
        if (isOpen) {
            this.closeDropdown();
        } else {
            this.openDropdown();
        }
    }

    openDropdown() {
        const { notificationDropdown } = this.elements;
        if (!notificationDropdown) return;

        notificationDropdown.classList.add('show');
        this.fetchNotifications(); // Refresh when opened
    }

    closeDropdown() {
        const { notificationDropdown } = this.elements;
        if (!notificationDropdown) return;

        notificationDropdown.classList.remove('show');
    }

    showLoadingState() {
        const { notificationList } = this.elements;
        if (!notificationList) return;

        notificationList.innerHTML = `
            <div class="loading">
                <i class="mdi mdi-loading mdi-spin"></i>
                <div>Loading notifications...</div>
            </div>
        `;
    }

    showError(message) {
        const { notificationList } = this.elements;
        if (!notificationList) return;

        notificationList.innerHTML = `
            <div class="error-message">
                <i class="mdi mdi-alert-circle"></i>
                ${this.escapeHtml(message)}
            </div>
        `;
    }

    startPolling() {
        if (!this.userId) return;

        // 🔁 30-second badge count refresh
        this.pollingInterval = setInterval(() => {
            if (!document.hidden) {
                this.fetchUnreadCount();
            }
        }, 30000);

        // 🔄 30-second full notification refresh
        this.refreshInterval = setInterval(() => {
            if (!document.hidden) {
                this.fetchNotifications();
            }
        }, 30000);
    }

    stopPolling() {
        clearInterval(this.pollingInterval);
        clearInterval(this.refreshInterval);
    }

    refresh() {
        this.fetchNotifications();
    }

    destroy() {
        this.stopPolling();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.notificationManager = new NotificationManager();
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationManager;
}