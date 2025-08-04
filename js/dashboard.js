// Dashboard Management
class DashboardManager {
    constructor() {
        this.components = [];
        this.stats = {};
        this.charts = {};
        this.init();
    }

    init() {
        // Check authentication
        if (!auth.currentUser) {
            auth.redirectToLogin();
            return;
        }

        // Initialize dashboard
        this.loadData();
        this.setupEventListeners();
        this.updateUserInfo();
        this.renderDashboard();
        this.initializeCharts();
        this.loadNotifications();
        
        // Show admin features if user is admin
        if (auth.isAdmin()) {
            this.showAdminFeatures();
        }
    }

    loadData() {
        // Load components from localStorage
        const savedComponents = localStorage.getItem('inventoryComponents');
        this.components = savedComponents ? JSON.parse(savedComponents) : mockData.components;
        
        // Calculate real-time stats
        this.calculateStats();
    }

    calculateStats() {
        this.stats = {
            totalComponents: this.components.length,
            totalQuantity: this.components.reduce((sum, comp) => sum + comp.quantity, 0),
            lowStockItems: this.components.filter(comp => comp.quantity <= comp.criticalLowThreshold).length,
            oldStockItems: this.components.filter(comp => Utils.isOldStock(comp.addedDate)).length,
            totalValue: this.components.reduce((sum, comp) => sum + (comp.quantity * comp.unitPrice), 0)
        };
    }

    setupEventListeners() {
        // Navigation toggle for mobile
        const navToggle = document.getElementById('navToggle');
        const navMenu = document.getElementById('navMenu');
        
        if (navToggle && navMenu) {
            navToggle.addEventListener('click', () => {
                navMenu.classList.toggle('active');
            });
        }

        // User management
        const usersLink = document.getElementById('usersLink');
        if (usersLink) {
            usersLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showUsersModal();
            });
        }

        const addUserBtn = document.getElementById('addUserBtn');
        if (addUserBtn) {
            addUserBtn.addEventListener('click', () => {
                this.showUserForm();
            });
        }

        const userForm = document.getElementById('userForm');
        if (userForm) {
            userForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleUserFormSubmit(e);
            });
        }

        // Initialize modals
        Utils.initializeModal('usersModal');
        Utils.initializeModal('userFormModal');

        // REPORTS TAB EVENT LISTENER
        const reportsLink = document.getElementById('reportsLink');
        if (reportsLink) {
            reportsLink.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = 'reports.html';
            });
        }
    }

    updateUserInfo() {
        const userInfo = document.getElementById('userInfo');
        if (userInfo && auth.currentUser) {
            userInfo.textContent = `${auth.currentUser.name} (${auth.currentUser.role})`;
        }
    }

    renderDashboard() {
        this.renderStats();
        this.renderLowStockAlerts();
        this.renderOldStockAlerts();
        this.renderRecentActivity();
    }

    renderStats() {
        // Update stat cards
        const totalComponents = document.getElementById('totalComponents');
        const totalQuantity = document.getElementById('totalQuantity');
        const lowStockItems = document.getElementById('lowStockItems');
        const oldStockItems = document.getElementById('oldStockItems');

        if (totalComponents) totalComponents.textContent = Utils.formatNumber(this.stats.totalComponents);
        if (totalQuantity) totalQuantity.textContent = Utils.formatNumber(this.stats.totalQuantity);
        if (lowStockItems) lowStockItems.textContent = Utils.formatNumber(this.stats.lowStockItems);
        if (oldStockItems) oldStockItems.textContent = Utils.formatNumber(this.stats.oldStockItems);
    }

    renderLowStockAlerts() {
        const container = document.getElementById('lowStockList');
        if (!container) return;

        const lowStockComponents = this.components.filter(comp => comp.quantity <= comp.criticalLowThreshold);
        
        if (lowStockComponents.length === 0) {
            container.innerHTML = '<p class="text-center">No low stock alerts</p>';
            return;
        }

        const html = lowStockComponents.map(comp => `
            <div class="notification notification-warning">
                <i class="fas fa-exclamation-triangle"></i>
                <div>
                    <strong>${comp.name}</strong><br>
                    <small>${comp.partNumber} - ${comp.quantity} remaining (Threshold: ${comp.criticalLowThreshold})</small>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    renderOldStockAlerts() {
        const container = document.getElementById('oldStockList');
        if (!container) return;

        const oldStockComponents = this.components.filter(comp => Utils.isOldStock(comp.addedDate));
        
        if (oldStockComponents.length === 0) {
            container.innerHTML = '<p class="text-center">No old stock items</p>';
            return;
        }

        const html = oldStockComponents.map(comp => {
            const age = Utils.calculateAge(comp.addedDate);
            return `
                <div class="notification notification-info">
                    <i class="fas fa-clock"></i>
                    <div>
                        <strong>${comp.name}</strong><br>
                        <small>${comp.partNumber} - ${age} days old</small>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    renderRecentActivity() {
        const container = document.getElementById('recentActivity');
        if (!container) return;

        // Get recent movements from all components
        const allMovements = [];
        this.components.forEach(comp => {
            if (comp.movements) {
                comp.movements.forEach(movement => {
                    allMovements.push({
                        ...movement,
                        componentName: comp.name,
                        componentId: comp.id
                    });
                });
            }
        });

        // Sort by date and take last 10
        allMovements.sort((a, b) => new Date(b.date) - new Date(a.date));
        const recentMovements = allMovements.slice(0, 10);

        if (recentMovements.length === 0) {
            container.innerHTML = '<p class="text-center">No recent activity</p>';
            return;
        }

        const html = recentMovements.map(movement => `
            <div class="notification ${movement.type === 'inward' ? 'notification-success' : 'notification-warning'}">
                <i class="fas ${movement.type === 'inward' ? 'fa-arrow-down' : 'fa-arrow-up'}"></i>
                <div>
                    <strong>${movement.type === 'inward' ? 'Inward' : 'Outward'}: ${movement.componentName}</strong><br>
                    <small>
                        ${movement.quantity} units by ${movement.user} - ${Utils.formatDate(movement.date)}<br>
                        Reason: ${movement.reason} | Project: ${movement.project}
                    </small>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    initializeCharts() {
        this.createInwardChart();
        this.createOutwardChart();
    }

    createInwardChart() {
        const ctx = document.getElementById('inwardChart');
        if (!ctx) return;

        // Calculate monthly inward data
        const monthlyData = this.calculateMonthlyMovements('inward');
        
        this.charts.inward = new Chart(ctx, {
            type: 'line',
            data: {
                labels: monthlyData.labels,
                datasets: [{
                    label: 'Inward Items',
                    data: monthlyData.data,
                    borderColor: 'rgb(52, 152, 219)',
                    backgroundColor: 'rgba(52, 152, 219, 0.2)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    createOutwardChart() {
        const ctx = document.getElementById('outwardChart');
        if (!ctx) return;

        // Calculate monthly outward data
        const monthlyData = this.calculateMonthlyMovements('outward');
        
        this.charts.outward = new Chart(ctx, {
            type: 'line',
            data: {
                labels: monthlyData.labels,
                datasets: [{
                    label: 'Outward Items',
                    data: monthlyData.data,
                    borderColor: 'rgb(231, 76, 60)',
                    backgroundColor: 'rgba(231, 76, 60, 0.2)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    calculateMonthlyMovements(type) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentMonth = new Date().getMonth();
        const labels = [];
        const data = [];

        // Get last 6 months
        for (let i = 5; i >= 0; i--) {
            const monthIndex = (currentMonth - i + 12) % 12;
            labels.push(months[monthIndex]);
            
            // Calculate total for this month
            let total = 0;
            this.components.forEach(comp => {
                if (comp.movements) {
                    comp.movements.forEach(movement => {
                        const movementDate = new Date(movement.date);
                        if (movement.type === type && movementDate.getMonth() === monthIndex) {
                            total += movement.quantity;
                        }
                    });
                }
            });
            data.push(total);
        }

        return { labels, data };
    }

    loadNotifications() {
        const savedNotifications = localStorage.getItem('inventoryNotifications');
        const notifications = savedNotifications ? JSON.parse(savedNotifications) : mockData.notifications;
        
        this.renderNotifications(notifications);
    }

    renderNotifications(notifications) {
        const container = document.getElementById('notificationsList');
        if (!container) return;

        if (notifications.length === 0) {
            container.innerHTML = '<p class="text-center">No notifications</p>';
            return;
        }

        const html = notifications.slice(0, 5).map(notification => `
            <div class="notification notification-${notification.type} ${notification.read ? 'read' : ''}">
                <i class="fas ${notification.type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
                <div style="flex: 1;">
                    <strong>${notification.title}</strong><br>
                    <small>${notification.message}</small><br>
                    <small class="text-muted">${Utils.formatDate(notification.date)}</small>
                </div>
                ${!notification.read ? '<span class="badge badge-info">New</span>' : ''}
            </div>
        `).join('');

        container.innerHTML = html;
    }

    showAdminFeatures() {
        const adminNav = document.getElementById('adminNav');
        if (adminNav) {
            adminNav.style.display = 'block';
        }
    }

    showUsersModal() {
        if (!auth.isAdmin()) {
            Utils.showNotification('Access denied. Admin privileges required.', 'error');
            return;
        }

        this.renderUsersTable();
        Utils.showModal('usersModal');
    }

    renderUsersTable() {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        const users = auth.getAllUsers();
        
        const html = users.map(user => `
            <tr>
                <td>${user.username}</td>
                <td>${user.name}</td>
                <td><span class="badge badge-info">${user.role}</span></td>
                <td>${user.email}</td>
                <td>
                    <button class="btn btn-secondary" onclick="dashboard.editUser('${user.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger" onclick="dashboard.deleteUser('${user.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        tbody.innerHTML = html;
    }

    showUserForm(userId = null) {
        const modal = document.getElementById('userFormModal');
        const title = document.getElementById('userFormTitle');
        const form = document.getElementById('userForm');
        const passwordGroup = document.getElementById('passwordGroup');
        
        if (!modal || !title || !form) return;

        // Reset form
        form.reset();
        
        if (userId) {
            // Edit mode
            const user = auth.getAllUsers().find(u => u.id === userId);
            if (user) {
                title.textContent = 'Edit User';
                document.getElementById('userId').value = user.id;
                document.getElementById('formUsername').value = user.username;
                document.getElementById('formName').value = user.name;
                document.getElementById('formEmail').value = user.email;
                document.getElementById('formRole').value = user.role;
                
                // Make password optional for editing
                document.getElementById('formPassword').required = false;
                passwordGroup.querySelector('label').textContent = 'Password (leave blank to keep current)';
            }
        } else {
            // Add mode
            title.textContent = 'Add User';
            document.getElementById('formPassword').required = true;
            passwordGroup.querySelector('label').textContent = 'Password';
        }

        Utils.showModal('userFormModal');
    }

    handleUserFormSubmit(event) {
        const formData = new FormData(event.target);
        const userData = {
            username: formData.get('username'),
            name: formData.get('name'),
            email: formData.get('email'),
            role: formData.get('role')
        };

        const password = formData.get('password');
        if (password) {
            userData.password = password;
        }

        const userId = formData.get('userId');

        try {
            if (userId) {
                // Update user
                auth.updateUser(userId, userData);
                Utils.showNotification('User updated successfully!', 'success');
            } else {
                // Add new user
                if (!password) {
                    Utils.showNotification('Password is required for new users', 'error');
                    return;
                }
                auth.addUser(userData);
                Utils.showNotification('User added successfully!', 'success');
            }

            Utils.hideModal('userFormModal');
            this.renderUsersTable();
        } catch (error) {
            Utils.showNotification(`Error: ${error.message}`, 'error');
        }
    }

    editUser(userId) {
        this.showUserForm(userId);
    }

    deleteUser(userId) {
        if (confirm('Are you sure you want to delete this user?')) {
            try {
                auth.deleteUser(userId);
                Utils.showNotification('User deleted successfully!', 'success');
                this.renderUsersTable();
            } catch (error) {
                Utils.showNotification(`Error: ${error.message}`, 'error');
            }
        }
    }

    downloadInventoryReport() {
        // Prepare CSV header
        const header = ['Name', 'Part Number', 'Quantity', 'Unit Price', 'Critical Low Threshold', 'Added Date'];
        // Prepare CSV rows
        const rows = this.components.map(comp => [
            comp.name,
            comp.partNumber,
            comp.quantity,
            comp.unitPrice,
            comp.criticalLowThreshold,
            comp.addedDate
        ]);
        // Combine header and rows
        const csvContent = [header, ...rows]
            .map(row => row.map(item => '"' + String(item).replace(/"/g, '""') + '"').join(','))
            .join('\n');
        // Create a blob and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'inventory_report.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Initialize dashboard
const dashboard = new DashboardManager();

// Make dashboard available globally for event handlers
window.dashboard = dashboard;