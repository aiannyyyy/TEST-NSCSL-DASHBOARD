/*
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
        markAllReadBtn: document.getElementById('markAllReadBtn') // 🔄 Changed from clearAllBtn
    };
}

setupEventListeners() {
    const { notificationBell, notificationDropdown, markAllReadBtn } = this.elements;

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

    // 🔄 Changed from clearAllNotifications to markAllAsRead
    markAllReadBtn?.addEventListener('click', () => {
        this.markAllAsRead();
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

    // 🔢 Limit to 10 notifications only
    const sorted = this.notifications
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 10); // Only show first 10 notifications

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

// 🔄 Changed function name from clearAllNotifications to markAllAsRead
async markAllAsRead() {
    if (!this.userId) return;

    const { markAllReadBtn } = this.elements;
    if (markAllReadBtn) {
        markAllReadBtn.disabled = true;
        markAllReadBtn.textContent = 'Marking...';
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
            console.log('✅ All notifications marked as read');
        }
    } catch (err) {
        console.error('❌ Mark all as read error:', err);
    } finally {
        if (markAllReadBtn) {
            markAllReadBtn.disabled = false;
            markAllReadBtn.textContent = 'Mark All as Read';
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
*/

/*

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
        this.fetchNotifications();
        this.startPolling();
    }

    getUserId() {
        const userId = localStorage.getItem("user_id") ||
                    sessionStorage.getItem("user_id") ||
                    document.querySelector('[data-user-id]')?.getAttribute('data-user-id') ||
                    window.currentUserId;

        if (!userId) {
            console.error('❌ No user_id found in localStorage, sessionStorage, or data attributes');
            return null;
        }

        const numericUserId = parseInt(userId);
        if (isNaN(numericUserId)) {
            console.error('❌ Invalid user_id format:', userId);
            return null;
        }

        return numericUserId.toString();
    }

    getUserName() {
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
            markAllReadBtn: document.getElementById('markAllReadBtn')
        };
    }

    setupEventListeners() {
        const { notificationBell, notificationDropdown, markAllReadBtn } = this.elements;

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

        markAllReadBtn?.addEventListener('click', () => {
            this.markAllAsRead();
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
                
                this.notifications = data.data.map(n => {
                    // Parse endorsement_data JSON to get labno
                    let labno = null;
                    try {
                        if (n.endorsement_data) {
                            const endorsementData = typeof n.endorsement_data === 'string' 
                                ? JSON.parse(n.endorsement_data) 
                                : n.endorsement_data;
                            
                            labno = endorsementData.labno || null;
                            console.log('📋 Parsed labno from endorsement_data:', labno);
                        }
                    } catch (e) {
                        console.error('❌ Error parsing endorsement_data:', e);
                    }

                    return {
                        id: n.notification_id,
                        type: this.getTypeFromTitle(n.title),
                        title: n.title,
                        message: n.message,
                        time: this.formatTimeAgo(n.created_at),
                        read: n.is_read === 1,
                        createdAt: new Date(n.created_at),
                        endorsedBy: n.endorsed_by || 'System',
                        labno: labno
                    };
                });

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
            console.error('❌ Unread count error:', err);
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

        const sorted = this.notifications
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 10);

        notificationList.innerHTML = sorted.map(n => `
            <div class="notification-item ${!n.read ? 'unread' : ''}" 
                 data-id="${n.id}"
                 data-labno="${n.labno || ''}"
                 style="cursor: pointer;">
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
                const labno = item.dataset.labno;
                this.handleNotificationClick(id, labno);
            });
        });
    }

    async handleNotificationClick(id, labno) {
        try {
            console.log('📋 Notification clicked:', { id, labno });
            
            const notification = this.notifications.find(n => n.id === id);
            
            if (!notification) {
                console.error('❌ Notification not found:', id);
                return;
            }
            
            await this.markAsRead(id);
            this.closeDropdown();
            
            if (!labno) {
                alert('Unable to find patient lab number in notification.');
                return;
            }
            
            if (!document.getElementById('detailsModal')) {
                alert('Patient details not available on this page.');
                return;
            }
            
            if (!window.modalManager || !window.showModal) {
                alert('System not ready. Please refresh the page.');
                return;
            }
            
            if (!window.fetchPatientDetails) {
                alert('Patient details system not loaded. Please refresh the page.');
                return;
            }
            
            console.log('🔍 Fetching patient details for labno:', labno);
            
            // Use existing patient-details endpoint with just labno
            const response = await fetch(`http://localhost:3001/api/patient-details?labno=${encodeURIComponent(labno)}&labid=`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch patient record');
            }
            
            const patientData = await response.json();
            
            if (!patientData || patientData.length === 0) {
                alert('Patient record not found in database.');
                return;
            }
            
            const patient = patientData[0];
            const labid = patient.LABID;
            const fname = patient.FNAME;
            const lname = patient.LNAME;
            
            console.log('✅ Found patient:', { fname, lname, labno, labid });
            
            const fields = {
                'detailFName': fname,
                'detailLName': lname,
                'detailLabNo': labno,
                'detailFormNo': labid
            };

            Object.entries(fields).forEach(([elementId, value]) => {
                const el = document.getElementById(elementId);
                if (el) el.textContent = value || '';
            });
            
            console.log('🎯 Opening patient details modal...');
            window.showModal('detailsModal');
            
            setTimeout(() => {
                console.log('📊 Loading patient details...');
                window.fetchPatientDetails(labno, labid);
            }, 350);
            
        } catch (err) {
            console.error('❌ Error handling notification click:', err);
            alert('Error opening patient details: ' + err.message);
        }
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

    async markAllAsRead() {
        if (!this.userId) return;

        const { markAllReadBtn } = this.elements;
        if (markAllReadBtn) {
            markAllReadBtn.disabled = true;
            markAllReadBtn.textContent = 'Marking...';
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
                console.log('✅ All notifications marked as read');
            }
        } catch (err) {
            console.error('❌ Mark all as read error:', err);
        } finally {
            if (markAllReadBtn) {
                markAllReadBtn.disabled = false;
                markAllReadBtn.textContent = 'Mark All as Read';
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
        this.fetchNotifications();
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

        this.pollingInterval = setInterval(() => {
            if (!document.hidden) {
                this.fetchUnreadCount();
            }
        }, 30000);

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

*/
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
        this.fetchNotifications();
        this.startPolling();
    }

    getUserId() {
        const userId = localStorage.getItem("user_id") ||
                    sessionStorage.getItem("user_id") ||
                    document.querySelector('[data-user-id]')?.getAttribute('data-user-id') ||
                    window.currentUserId;

        if (!userId) {
            console.error('❌ No user_id found in localStorage, sessionStorage, or data attributes');
            return null;
        }

        const numericUserId = parseInt(userId);
        if (isNaN(numericUserId)) {
            console.error('❌ Invalid user_id format:', userId);
            return null;
        }

        return numericUserId.toString();
    }

    getUserName() {
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
            markAllReadBtn: document.getElementById('markAllReadBtn')
        };
    }

    setupEventListeners() {
        const { notificationBell, notificationDropdown, markAllReadBtn } = this.elements;

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

        markAllReadBtn?.addEventListener('click', () => {
            this.markAllAsRead();
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
                
                this.notifications = data.data.map(n => {
                    // Parse endorsement_data JSON
                    let endorsementData = null;
                    try {
                        if (n.endorsement_data) {
                            endorsementData = typeof n.endorsement_data === 'string' 
                                ? JSON.parse(n.endorsement_data) 
                                : n.endorsement_data;
                            
                            console.log('📋 Parsed endorsement_data:', endorsementData);
                        }
                    } catch (e) {
                        console.error('❌ Error parsing endorsement_data:', e);
                    }

                    return {
                        id: n.notification_id,
                        type: this.getTypeFromTitle(n.title),
                        title: n.title,
                        message: n.message,
                        time: this.formatTimeAgo(n.created_at),
                        read: n.is_read === 1,
                        createdAt: new Date(n.created_at),
                        endorsedBy: n.endorsed_by || 'System',
                        endorsementData: endorsementData // Store the full object
                    };
                });

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
            console.error('❌ Unread count error:', err);
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

        const sorted = this.notifications
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 10);

        notificationList.innerHTML = sorted.map(n => {
            const labno = n.endorsementData?.labno || '';
            const fullName = n.endorsementData?.fullName || '';
            
            return `
                <div class="notification-item ${!n.read ? 'unread' : ''}" 
                     data-id="${n.id}"
                     data-labno="${labno}"
                     data-fullname="${this.escapeHtml(fullName)}"
                     style="cursor: pointer;">
                    <div class="notification-icon ${n.type}">
                        <i class="mdi ${this.getNotificationIcon(n.type)}"></i>
                    </div>
                    <div class="notification-content">
                        <div class="notification-title">${this.escapeHtml(n.title)}</div>
                        <div class="notification-message">${this.escapeHtml(n.message)}</div>
                        <div class="notification-time">${n.time}</div>
                        ${n.endorsedBy !== 'System' ? `<div class="notification-endorser">From: ${this.escapeHtml(n.endorsedBy)}</div>` : ''}
                        ${fullName ? `<div class="notification-patient">Patient: ${this.escapeHtml(fullName)}</div>` : ''}
                    </div>
                    ${!n.read ? '<div class="unread-indicator"></div>' : ''}
                </div>
            `;
        }).join('');

        this.setupNotificationItemListeners();
    }

    setupNotificationItemListeners() {
        document.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = parseInt(item.dataset.id);
                const labno = item.dataset.labno;
                const fullName = item.dataset.fullname;
                this.handleNotificationClick(id, labno, fullName);
            });
        });
    }

    async handleNotificationClick(id, labno, fullName) {
        try {
            console.log('📋 Notification clicked:', { id, labno, fullName });
            
            const notification = this.notifications.find(n => n.id === id);
            
            if (!notification) {
                console.error('❌ Notification not found:', id);
                return;
            }
            
            // Mark as read
            await this.markAsRead(id);
            this.closeDropdown();
            
            // Validate data
            if (!labno) {
                alert('Unable to find patient lab number in notification.');
                return;
            }
            
            if (!fullName) {
                alert('Unable to find patient name in notification.');
                return;
            }
            
            // Check if modal system is available
            if (!document.getElementById('detailsModal')) {
                alert('Patient details not available on this page.');
                return;
            }
            
            if (!window.showModal) {
                alert('Modal system not ready. Please refresh the page.');
                return;
            }
            
            if (!window.fetchPatientDetails) {
                alert('Patient details system not loaded. Please refresh the page.');
                return;
            }
            
            console.log('🔍 Fetching patient details for:', { labno, fullName });
            
            // Split fullName into fname and lname
            const nameParts = fullName.trim().split(' ');
            const fname = nameParts[0] || '';
            const lname = nameParts.slice(1).join(' ') || '';
            
            console.log('📝 Name parts:', { fname, lname });
            
            // First, get the patient record to obtain labid
            const response = await fetch(
                `http://localhost:3001/api/patient-details?labno=${encodeURIComponent(labno)}&labid=`
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch patient record');
            }
            
            const patientData = await response.json();
            
            if (!patientData || patientData.length === 0) {
                alert('Patient record not found in database.');
                return;
            }
            
            const patient = patientData[0];
            const labid = patient.LABID;
            
            console.log('✅ Found patient:', { 
                fname: patient.FNAME, 
                lname: patient.LNAME, 
                labno: patient.LABNO, 
                labid 
            });
            
            // Populate modal header fields
            const fields = {
                'detailFName': patient.FNAME,
                'detailLName': patient.LNAME,
                'detailLabNo': patient.LABNO,
                'detailFormNo': labid
            };

            Object.entries(fields).forEach(([elementId, value]) => {
                const el = document.getElementById(elementId);
                if (el) el.textContent = value || '';
            });
            
            console.log('🎯 Opening patient details modal...');
            window.showModal('detailsModal');
            
            // Load patient details with proper delay
            setTimeout(() => {
                console.log('📊 Loading patient details...');
                window.fetchPatientDetails(patient.LABNO, labid);
            }, 350);
            
        } catch (err) {
            console.error('❌ Error handling notification click:', err);
            alert('Error opening patient details: ' + err.message);
        }
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

    async markAllAsRead() {
        if (!this.userId) return;

        const { markAllReadBtn } = this.elements;
        if (markAllReadBtn) {
            markAllReadBtn.disabled = true;
            markAllReadBtn.textContent = 'Marking...';
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
                console.log('✅ All notifications marked as read');
            }
        } catch (err) {
            console.error('❌ Mark all as read error:', err);
        } finally {
            if (markAllReadBtn) {
                markAllReadBtn.disabled = false;
                markAllReadBtn.textContent = 'Mark All as Read';
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
        this.fetchNotifications();
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

        this.pollingInterval = setInterval(() => {
            if (!document.hidden) {
                this.fetchUnreadCount();
            }
        }, 30000);

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