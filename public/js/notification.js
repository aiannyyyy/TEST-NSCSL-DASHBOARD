 // Sample notification data
        let notifications = [
            {
                id: 1,
                type: 'info',
                title: 'New Sample Received',
                message: 'Sample #12345 has been received and is ready for processing.',
                time: '2 minutes ago',
                read: false
            },
            {
                id: 2,
                type: 'success',
                title: 'Analysis Complete',
                message: 'Laboratory analysis for sample #12340 has been completed.',
                time: '1 hour ago',
                read: false
            },
            {
                id: 3,
                type: 'warning',
                title: 'Follow-up Required',
                message: 'Patient follow-up is needed for case #98765.',
                time: '3 hours ago',
                read: false
            },
            {
                id: 4,
                type: 'danger',
                title: 'Urgent: Critical Result',
                message: 'Critical result detected for sample #12338. Immediate action required.',
                time: '1 day ago',
                read: true
            }
        ];

        // Function to render notifications
        function renderNotifications() {
            const notificationList = document.getElementById('notificationList');
            const notificationBadge = document.getElementById('notificationBadge');
            
            // Count unread notifications
            const unreadCount = notifications.filter(n => !n.read).length;
            
            // Update badge
            if (unreadCount > 0) {
                notificationBadge.textContent = unreadCount;
                notificationBadge.style.display = 'flex';
            } else {
                notificationBadge.style.display = 'none';
            }

            // Render notification list
            if (notifications.length === 0) {
                notificationList.innerHTML = `
                    <div class="no-notifications">
                        <i class="mdi mdi-bell-off-outline"></i>
                        <div>No notifications</div>
                    </div>
                `;
                return;
            }

            notificationList.innerHTML = notifications.map(notification => `
                <div class="notification-item ${!notification.read ? 'unread' : ''}" data-id="${notification.id}">
                    <div class="notification-icon ${notification.type}">
                        <i class="mdi ${getNotificationIcon(notification.type)}"></i>
                    </div>
                    <div class="notification-content">
                        <div class="notification-title">${notification.title}</div>
                        <div class="notification-message">${notification.message}</div>
                        <div class="notification-time">${notification.time}</div>
                    </div>
                </div>
            `).join('');

            // Add click event to mark as read
            document.querySelectorAll('.notification-item').forEach(item => {
                item.addEventListener('click', function() {
                    const id = parseInt(this.dataset.id);
                    markAsRead(id);
                });
            });
        }

        // Function to get notification icon based on type
        function getNotificationIcon(type) {
            switch(type) {
                case 'info': return 'mdi-information';
                case 'success': return 'mdi-check-circle';
                case 'warning': return 'mdi-alert';
                case 'danger': return 'mdi-alert-circle';
                default: return 'mdi-bell';
            }
        }

        // Function to mark notification as read
        function markAsRead(id) {
            notifications = notifications.map(n => 
                n.id === id ? { ...n, read: true } : n
            );
            renderNotifications();
        }

        // Function to clear all notifications
        function clearAllNotifications() {
            notifications = [];
            renderNotifications();
        }

        // Function to add new notification (for demo purposes)
        function addNotification(type, title, message) {
            const newNotification = {
                id: Date.now(),
                type: type,
                title: title,
                message: message,
                time: 'Just now',
                read: false
            };
            notifications.unshift(newNotification);
            renderNotifications();
        }

        // Toggle notification dropdown
        document.addEventListener('DOMContentLoaded', function() {
            const notificationBell = document.getElementById('notificationBell');
            const notificationDropdown = document.getElementById('notificationDropdown');
            const clearAllBtn = document.getElementById('clearAllBtn');

            // Render initial notifications
            renderNotifications();

            // Toggle dropdown
            notificationBell.addEventListener('click', function(e) {
                e.stopPropagation();
                notificationDropdown.classList.toggle('show');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', function(e) {
                if (!notificationDropdown.contains(e.target) && !notificationBell.contains(e.target)) {
                    notificationDropdown.classList.remove('show');
                }
            });

            // Prevent dropdown from closing when clicking inside
            notificationDropdown.addEventListener('click', function(e) {
                e.stopPropagation();
            });

            // Clear all notifications
            clearAllBtn.addEventListener('click', function() {
                clearAllNotifications();
            });

            // Demo: Add a new notification every 30 seconds
            setInterval(() => {
                const demoNotifications = [
                    { type: 'info', title: 'System Update', message: 'System has been updated successfully.' },
                    { type: 'success', title: 'Task Completed', message: 'Your scheduled task has been completed.' },
                    { type: 'warning', title: 'Maintenance Scheduled', message: 'System maintenance is scheduled for tonight.' }
                ];
                const randomNotif = demoNotifications[Math.floor(Math.random() * demoNotifications.length)];
                addNotification(randomNotif.type, randomNotif.title, randomNotif.message);
            }, 30000); // 30 seconds
        });