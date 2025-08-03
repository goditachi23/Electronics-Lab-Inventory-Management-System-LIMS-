// Notifications Management
class NotificationManager {
    constructor() {
        this.notifications = [];
        this.checkInterval = 60000; // Check every minute
        this.init();
    }

    init() {
        this.loadNotifications();
        this.startPeriodicChecks();
        this.checkStockAlerts();
    }

    loadNotifications() {
        const savedNotifications = localStorage.getItem('inventoryNotifications');
        this.notifications = savedNotifications ? JSON.parse(savedNotifications) : mockData.notifications || [];
    }

    saveNotifications() {
        localStorage.setItem('inventoryNotifications', JSON.stringify(this.notifications));
    }

    startPeriodicChecks() {
        // Check immediately
        this.checkStockAlerts();
        
        // Then check periodically
        setInterval(() => {
            this.checkStockAlerts();
        }, this.checkInterval);
    }

    checkStockAlerts() {
        const components = this.getComponents();
        if (!components.length) return;

        this.checkLowStockAlerts(components);
        this.checkOldStockAlerts(components);
        this.cleanupOldNotifications();
    }

    getComponents() {
        const savedComponents = localStorage.getItem('inventoryComponents');
        return savedComponents ? JSON.parse(savedComponents) : [];
    }

    checkLowStockAlerts(components) {
        components.forEach(component => {
            if (component.quantity <= component.criticalLowThreshold) {
                const existingNotification = this.notifications.find(n => 
                    n.type === 'warning' && 
                    n.component === component.id && 
                    n.title.includes('Low Stock Alert') &&
                    !this.isNotificationOld(n.date)
                );

                if (!existingNotification) {
                    this.createNotification({
                        type: 'warning',
                        title: 'Low Stock Alert',
                        message: `${component.name} (${component.partNumber}) is running low (${component.quantity} remaining, threshold: ${component.criticalLowThreshold})`,
                        component: component.id,
                        priority: component.quantity === 0 ? 'high' : 'medium'
                    });
                }
            }
        });
    }

    checkOldStockAlerts(components) {
        const thresholdDays = 90; // 3 months
        
        components.forEach(component => {
            if (Utils.isOldStock(component.addedDate, thresholdDays)) {
                // Check if component has had any outward movement recently
                const hasRecentMovement = component.movements && component.movements.some(movement => 
                    movement.type === 'outward' && 
                    Utils.calculateAge(movement.date) <= thresholdDays
                );

                if (!hasRecentMovement) {
                    const existingNotification = this.notifications.find(n => 
                        n.type === 'info' && 
                        n.component === component.id && 
                        n.title.includes('Old Stock Notice') &&
                        !this.isNotificationOld(n.date, 7) // Don't repeat for 7 days
                    );

                    if (!existingNotification) {
                        const age = Utils.calculateAge(component.addedDate);
                        this.createNotification({
                            type: 'info',
                            title: 'Old Stock Notice',
                            message: `${component.name} (${component.partNumber}) has been in stock for ${age} days without outward movement`,
                            component: component.id,
                            priority: 'low'
                        });
                    }
                }
            }
        });
    }

    createNotification(notificationData) {
        const notification = {
            id: Utils.generateId(),
            date: new Date(),
            read: false,
            priority: 'medium',
            ...notificationData
        };

        this.notifications.unshift(notification); // Add to beginning
        this.saveNotifications();
        
        // Show in-app notification
        this.showInAppNotification(notification);
        
        // Update notification count in UI if visible
        this.updateNotificationBadge();

        return notification;
    }

    showInAppNotification(notification) {
        const priority = notification.priority || 'medium';
        const duration = {
            high: 8000,
            medium: 5000,
            low: 3000
        }[priority];

        Utils.showNotification(
            `${notification.title}: ${notification.message}`,
            notification.type,
            duration
        );
    }

    markAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
            this.saveNotifications();
            this.updateNotificationBadge();
        }
    }

    markAllAsRead() {
        this.notifications.forEach(n => n.read = true);
        this.saveNotifications();
        this.updateNotificationBadge();
    }

    deleteNotification(notificationId) {
        const index = this.notifications.findIndex(n => n.id === notificationId);
        if (index !== -1) {
            this.notifications.splice(index, 1);
            this.saveNotifications();
            this.updateNotificationBadge();
        }
    }

    cleanupOldNotifications() {
        const maxAge = 30; // Keep notifications for 30 days
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - maxAge);

        const oldCount = this.notifications.length;
        this.notifications = this.notifications.filter(n => new Date(n.date) > cutoffDate);
        
        if (this.notifications.length < oldCount) {
            this.saveNotifications();
        }
    }

    isNotificationOld(date, daysThreshold = 1) {
        const age = Utils.calculateAge(date);
        return age > daysThreshold;
    }

    updateNotificationBadge() {
        const unreadCount = this.getUnreadCount();
        const badges = document.querySelectorAll('.notification-badge');
        
        badges.forEach(badge => {
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount.toString();
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        });
    }

    getUnreadCount() {
        return this.notifications.filter(n => !n.read).length;
    }

    getNotifications(limit = null, unreadOnly = false) {
        let filtered = [...this.notifications];
        
        if (unreadOnly) {
            filtered = filtered.filter(n => !n.read);
        }
        
        // Sort by date (newest first) and priority
        filtered.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            const priorityDiff = (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2);
            
            if (priorityDiff !== 0) return priorityDiff;
            
            return new Date(b.date) - new Date(a.date);
        });
        
        return limit ? filtered.slice(0, limit) : filtered;
    }

    renderNotifications(container, limit = 10) {
        if (!container) return;

        const notifications = this.getNotifications(limit);
        
        if (notifications.length === 0) {
            container.innerHTML = '<p class="text-center">No notifications</p>';
            return;
        }

        const html = notifications.map(notification => `
            <div class="notification notification-${notification.type} ${notification.read ? 'read' : ''}" data-notification-id="${notification.id}">
                <i class="fas ${this.getNotificationIcon(notification.type)}"></i>
                <div style="flex: 1;">
                    <strong>${notification.title}</strong><br>
                    <span>${notification.message}</span><br>
                    <small class="text-muted">${Utils.formatDate(notification.date)}</small>
                </div>
                <div class="notification-actions">
                    ${!notification.read ? `
                    <button class="btn btn-secondary btn-sm" onclick="notificationManager.markAsRead('${notification.id}')" title="Mark as read">
                        <i class="fas fa-check"></i>
                    </button>` : ''}
                    <button class="btn btn-danger btn-sm" onclick="notificationManager.deleteNotification('${notification.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    // Email notification simulation (would integrate with actual email service)
    sendEmailNotification(notification) {
        console.log('Email notification would be sent:', {
            to: auth.currentUser?.email,
            subject: notification.title,
            body: notification.message,
            type: notification.type
        });
        
        // In a real implementation, this would call an email service API
        return Promise.resolve();
    }

    // Create notifications for specific events
    createStockMovementNotification(component, movement) {
        let message = '';
        let type = 'info';

        if (movement.type === 'inward') {
            message = `${movement.quantity} units of ${component.name} added to inventory by ${movement.user}`;
            type = 'success';
        } else {
            message = `${movement.quantity} units of ${component.name} removed from inventory by ${movement.user} for ${movement.project}`;
            type = 'info';
        }

        this.createNotification({
            type: type,
            title: 'Stock Movement',
            message: message,
            component: component.id,
            priority: 'low'
        });
    }

    createComponentAddedNotification(component) {
        this.createNotification({
            type: 'success',
            title: 'New Component Added',
            message: `${component.name} (${component.partNumber}) has been added to inventory`,
            component: component.id,
            priority: 'low'
        });
    }

    createUserActivityNotification(activity, user) {
        this.createNotification({
            type: 'info',
            title: 'User Activity',
            message: `${user.name} ${activity}`,
            priority: 'low'
        });
    }

    // Settings for notification preferences (would be stored per user)
    getNotificationSettings() {
        const saved = localStorage.getItem('notificationSettings');
        return saved ? JSON.parse(saved) : {
            lowStockAlerts: true,
            oldStockAlerts: true,
            stockMovements: false,
            userActivity: false,
            emailNotifications: false,
            inAppNotifications: true,
            soundNotifications: false
        };
    }

    updateNotificationSettings(settings) {
        localStorage.setItem('notificationSettings', JSON.stringify(settings));
    }

    shouldSendNotification(type) {
        const settings = this.getNotificationSettings();
        
        switch (type) {
            case 'lowStock':
                return settings.lowStockAlerts;
            case 'oldStock':
                return settings.oldStockAlerts;
            case 'stockMovement':
                return settings.stockMovements;
            case 'userActivity':
                return settings.userActivity;
            default:
                return true;
        }
    }
}

// Initialize notification manager
const notificationManager = new NotificationManager();

// Make it available globally
window.notificationManager = notificationManager;