// Enhanced Notification System Frontend JavaScript
class NotificationManager {
    constructor() {
        this.notifications = [];
        this.userId = null;
        this.isLoading = false;
        this.pollingInterval = null;
        this.elements = {};
        
        this.init();
    }

    init() {
        // Get user ID from localStorage, sessionStorage, or data attribute 
        this.userId = this.getUserId();
        
        if (!this.userId) {
            console.error('No user ID found. Please ensure user is logged in.');
            return;
        }

        // Cache DOM elements
        this.cacheElements();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initial load
        this.fetchNotifications();
        
        // Start polling for new notifications (every 30 seconds)
        this.startPolling();
    }

    getUserId() {
        // Try multiple sources for user ID
        return localStorage.getItem("user_id") || 
               sessionStorage.getItem("user_id") || 
               document.querySelector('[data-user-id]')?.getAttribute('data-user-id') ||
               window.currentUserId || 
               "3"; // Changed to match your database user ID
    }

    cacheElements() {
        this.elements = {
            notificationBell: document.getElementById('notificationBell'),
            notificationBadge: document.getElementById('notificationBadge'),
            notificationDropdown: document.getElementById('notificationDropdown'),
            notificationList: document.getElementById('notificationList'),
            clearAllBtn: document.getElementById('clearAllBtn')
        };

        console.log('Cached elements:', this.elements);

        // Check if required elements exist
        const requiredElements = ['notificationBell', 'notificationBadge', 'notificationDropdown', 'notificationList'];
        const missingElements = requiredElements.filter(id => !this.elements[id]);
        
        if (missingElements.length > 0) {
            console.error('Missing required elements:', missingElements);
            return false;
        }
        
        // Add necessary CSS if not already present
        this.addNotificationStyles();
        
        return true;
    }

    addNotificationStyles() {
        if (document.querySelector('#notification-styles')) return;

        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification-dropdown {
                position: relative;
                display: inline-block;
            }

            .notification-bell {
                background: none;
                border: none;
                cursor: pointer;
                position: relative;
                padding: 8px;
                border-radius: 50%;
                transition: background-color 0.2s;
            }

            .notification-bell:hover {
                background-color: rgba(0, 0, 0, 0.1);
            }

            .notification-bell i {
                font-size: 20px;
                color: #666;
            }

            .notification-badge {
                position: absolute;
                top: 0;
                right: 0;
                background: #dc3545;
                color: white;
                border-radius: 50%;
                width: 18px;
                height: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                font-weight: bold;
                transform: translate(25%, -25%);
            }

            .notification-dropdown-menu {
                position: absolute;
                top: 100%;
                right: 0;
                background: white;
                border: 1px solid #ddd;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                width: 350px;
                max-height: 500px;
                overflow-y: auto;
                z-index: 1000;
                opacity: 0;
                visibility: hidden;
                transform: translateY(-10px);
                transition: all 0.3s ease;
            }

            .notification-dropdown-menu.show {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
            }

            .notification-header {
                padding: 15px 20px 10px;
                border-bottom: 1px solid #eee;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .notification-header h6 {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
                color: #333;
            }

            .clear-all-btn {
                background: none;
                border: none;
                color: #007bff;
                cursor: pointer;
                font-size: 12px;
                padding: 4px 8px;
                border-radius: 4px;
                transition: background-color 0.2s;
            }

            .clear-all-btn:hover {
                background-color: #f8f9fa;
            }

            .clear-all-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            #notificationList {
                max-height: 400px;
                overflow-y: auto;
            }

            .notification-item {
                padding: 12px 20px;
                border-bottom: 1px solid #f0f0f0;
                cursor: pointer;
                display: flex;
                align-items: flex-start;
                gap: 12px;
                transition: background-color 0.2s;
                position: relative;
            }

            .notification-item:hover {
                background-color: #f8f9fa;
            }

            .notification-item.unread {
                background-color: #f0f8ff;
                border-left: 3px solid #007bff;
            }

            .notification-icon {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }

            .notification-icon.info {
                background-color: #e3f2fd;
                color: #1976d2;
            }

            .notification-icon.success {
                background-color: #e8f5e8;
                color: #2e7d32;
            }

            .notification-icon.warning {
                background-color: #fff3e0;
                color: #f57c00;
            }

            .notification-icon.danger {
                background-color: #ffebee;
                color: #d32f2f;
            }

            .notification-content {
                flex: 1;
                min-width: 0;
            }

            .notification-title {
                font-weight: 600;
                color: #333;
                margin-bottom: 4px;
                font-size: 14px;
                line-height: 1.3;
            }

            .notification-message {
                color: #666;
                font-size: 13px;
                line-height: 1.4;
                margin-bottom: 6px;
                word-break: break-word;
            }

            .notification-time {
                font-size: 11px;
                color: #999;
            }

            .notification-endorser {
                font-size: 11px;
                color: #007bff;
                margin-top: 2px;
            }

            .unread-indicator {
                width: 8px;
                height: 8px;
                background-color: #007bff;
                border-radius: 50%;
                position: absolute;
                top: 12px;
                right: 12px;
            }

            .no-notifications, .loading, .error-message {
                padding: 40px 20px;
                text-align: center;
                color: #666;
            }

            .no-notifications i, .loading i, .error-message i {
                font-size: 24px;
                margin-bottom: 10px;
                display: block;
            }

            .loading i {
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .notification-footer {
                padding: 10px 20px;
                border-top: 1px solid #eee;
                text-align: center;
            }

            .view-all-link {
                color: #007bff;
                text-decoration: none;
                font-size: 13px;
                font-weight: 500;
            }

            .view-all-link:hover {
                text-decoration: underline;
            }

            .toast {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 6px;
                color: white;
                z-index: 10000;
                display: flex;
                align-items: center;
                gap: 10px;
                animation: slideIn 0.3s ease;
            }
            .toast-info { background: #007bff; }
            .toast-success { background: #28a745; }
            .toast-warning { background: #ffc107; color: #212529; }
            .toast-danger { background: #dc3545; }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    setupEventListeners() {
        const { notificationBell, notificationDropdown, clearAllBtn } = this.elements;

        // Toggle dropdown
        notificationBell?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Notification bell clicked');
            this.toggleDropdown();
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!notificationDropdown?.contains(e.target) && !notificationBell?.contains(e.target)) {
                this.closeDropdown();
            }
        });

        // Prevent dropdown from closing when clicking inside
        notificationDropdown?.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Clear all notifications
        clearAllBtn?.addEventListener('click', () => {
            this.clearAllNotifications();
        });

        // Handle visibility change (refresh when tab becomes visible)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.fetchNotifications();
            }
        });
    }

    async fetchNotifications() {
        if (this.isLoading) return;

        this.isLoading = true;
        this.showLoadingState();

        try {
            console.log(`Fetching notifications for user: ${this.userId}`);
            
            const response = await fetch(`http://localhost:3001/api/pdo-notification/${this.userId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    // Add any auth headers if needed
                    // 'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Notifications response:', data);
            console.log('Response data array:', data.data);
            console.log('Response data length:', data.data ? data.data.length : 'undefined');

            if (data.success) {
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
                
                console.log('Processed notifications:', this.notifications);
                this.renderNotifications();
                this.updateBadge();
            } else {
                console.error('API returned error:', data);
                this.showError(data.message || 'Failed to fetch notifications');
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
            this.showError('Unable to load notifications. Please try again.');
        } finally {
            this.isLoading = false;
        }
    }

    async fetchUnreadCount() {
        try {
            const response = await fetch(`http://localhost:3001/api/pdo-notification/${this.userId}/unread-count`);
            const data = await response.json();
            
            if (data.success) {
                this.updateBadge(data.count);
            }
        } catch (error) {
            console.error('Error fetching unread count:', error);
        }
    }

    getTypeFromTitle(title) {
        const lowerTitle = title.toLowerCase();
        
        if (lowerTitle.includes('urgent') || lowerTitle.includes('critical') || lowerTitle.includes('error')) {
            return 'danger';
        }
        if (lowerTitle.includes('complete') || lowerTitle.includes('success') || lowerTitle.includes('approved')) {
            return 'success';
        }
        if (lowerTitle.includes('follow') || lowerTitle.includes('reminder') || lowerTitle.includes('pending')) {
            return 'warning';
        }
        return 'info';
    }

    formatTimeAgo(dateStr) {
        const then = new Date(dateStr);
        const now = new Date();
        const diffMs = now - then;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return "just now";
        if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
        
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        
        const diffMonths = Math.floor(diffDays / 30);
        if (diffMonths < 12) return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
        
        const diffYears = Math.floor(diffMonths / 12);
        return `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`;
    }

    renderNotifications() {
        const { notificationList } = this.elements;
        
        if (!notificationList) return;

        if (this.notifications.length === 0) {
            notificationList.innerHTML = `
                <div class="no-notifications">
                    <i class="mdi mdi-bell-off-outline"></i>
                    <div>No notifications</div>
                </div>
            `;
            return;
        }

        // Sort notifications by creation date (newest first)
        const sortedNotifications = this.notifications.sort((a, b) => b.createdAt - a.createdAt);

        notificationList.innerHTML = sortedNotifications.map(notification => `
            <div class="notification-item ${!notification.read ? 'unread' : ''}" 
                 data-id="${notification.id}"
                 role="button"
                 tabindex="0"
                 aria-label="Notification: ${notification.title}">
                <div class="notification-icon ${notification.type}">
                    <i class="mdi ${this.getNotificationIcon(notification.type)}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${this.escapeHtml(notification.title)}</div>
                    <div class="notification-message">${this.escapeHtml(notification.message)}</div>
                    <div class="notification-time">${notification.time}</div>
                    ${notification.endorsedBy !== 'System' ? `<div class="notification-endorser">From: ${this.escapeHtml(notification.endorsedBy)}</div>` : ''}
                </div>
                ${!notification.read ? '<div class="unread-indicator"></div>' : ''}
            </div>
        `).join('');

        // Add click and keyboard event listeners
        this.setupNotificationItemListeners();
    }

    setupNotificationItemListeners() {
        const items = document.querySelectorAll('.notification-item');
        
        items.forEach(item => {
            const clickHandler = () => {
                const id = parseInt(item.dataset.id);
                this.markAsRead(id);
            };

            item.addEventListener('click', clickHandler);
            
            // Keyboard accessibility
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    clickHandler();
                }
            });
        });
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
        
        console.log('Updated badge with count:', unreadCount);
        
        // Update document title if there are unread notifications
        this.updateDocumentTitle(unreadCount);
    }

    updateDocumentTitle(unreadCount) {
        const baseTitle = document.title.replace(/^\(\d+\) /, '');
        document.title = unreadCount > 0 ? `(${unreadCount}) ${baseTitle}` : baseTitle;
    }

    async markAsRead(id) {
        try {
            const response = await fetch(`http://localhost:3001/api/pdo-notification/${id}/read`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                // Update local state
                this.notifications = this.notifications.map(n =>
                    n.id === id ? { ...n, read: true } : n
                );
                
                this.renderNotifications();
                this.updateBadge();
                
                // Show success feedback
                this.showToast('Notification marked as read', 'success');
            } else {
                this.showError(data.message || 'Failed to mark notification as read');
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
            this.showError('Unable to mark notification as read');
        }
    }

    async clearAllNotifications() {
        const { clearAllBtn } = this.elements;
        
        if (clearAllBtn) {
            clearAllBtn.disabled = true;
            clearAllBtn.textContent = 'Clearing...';
        }

        try {
            const response = await fetch(`http://localhost:3001/api/pdo-notification/${this.userId}/mark-all-read`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                // Update local state
                this.notifications = this.notifications.map(n => ({ ...n, read: true }));
                
                this.renderNotifications();
                this.updateBadge();
                
                this.showToast(`${data.count} notifications marked as read`, 'success');
            } else {
                this.showError(data.message || 'Failed to clear notifications');
            }
        } catch (error) {
            console.error('Error clearing notifications:', error);
            this.showError('Unable to clear notifications');
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
        
        console.log('Toggling dropdown. Currently open:', isOpen);
        
        if (isOpen) {
            this.closeDropdown();
        } else {
            this.openDropdown();
        }
    }

    openDropdown() {
        const { notificationDropdown } = this.elements;
        
        if (!notificationDropdown) return;

        console.log('Opening dropdown');
        notificationDropdown.classList.add('show');
        
        // Refresh notifications when opening
        this.fetchNotifications();
    }

    closeDropdown() {
        const { notificationDropdown } = this.elements;
        
        if (!notificationDropdown) return;

        console.log('Closing dropdown');
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

    showToast(message, type = 'info') {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="mdi ${this.getNotificationIcon(type)}"></i>
            <span>${this.escapeHtml(message)}</span>
        `;

        document.body.appendChild(toast);

        // Remove toast after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    startPolling() {
        // Poll for new notifications every 30 seconds
        this.pollingInterval = setInterval(() => {
            if (!document.hidden) {
                this.fetchUnreadCount();
            }
        }, 30000);
    }

    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    // Public methods for external use
    refresh() {
        this.fetchNotifications();
    }

    addNotification(notification) {
        // Add new notification to the beginning of the array
        this.notifications.unshift({
            id: Date.now(), // Temporary ID
            type: notification.type || 'info',
            title: notification.title,
            message: notification.message,
            time: 'just now',
            read: false,
            createdAt: new Date()
        });

        this.renderNotifications();
        this.updateBadge();
    }

    destroy() {
        this.stopPolling();
        // Remove event listeners if needed
    }
}

// Initialize the notification manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing notification manager...');
    // Create global instance
    window.notificationManager = new NotificationManager();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationManager;
}