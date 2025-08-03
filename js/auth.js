// Authentication System
class AuthManager {
    constructor() {
        this.users = this.loadUsers();
        this.currentUser = this.getCurrentUser();
        this.init();
    }

    init() {
        // Check if user is already logged in
        if (this.currentUser && window.location.pathname.includes('index.html')) {
            this.redirectToDashboard();
        } else if (!this.currentUser && !window.location.pathname.includes('index.html')) {
            this.redirectToLogin();
        }

        // Bind login form if it exists
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Bind logout button if it exists
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
    }

    loadUsers() {
        const savedUsers = localStorage.getItem('inventoryUsers');
        if (savedUsers) {
            return JSON.parse(savedUsers);
        }

        // Default users
        const defaultUsers = [
            {
                id: '1',
                username: 'admin',
                password: 'admin123',
                role: 'admin',
                name: 'Admin User',
                email: 'admin@company.com',
                permissions: ['all']
            },
            {
                id: '2',
                username: 'user',
                password: 'user123',
                role: 'user',
                name: 'Lab Technician',
                email: 'tech@company.com',
                permissions: ['view', 'inward', 'outward']
            },
            {
                id: '3',
                username: 'researcher',
                password: 'research123',
                role: 'researcher',
                name: 'Research Scientist',
                email: 'researcher@company.com',
                permissions: ['view', 'search']
            },
            {
                id: '4',
                username: 'engineer',
                password: 'engineer123',
                role: 'engineer',
                name: 'Manufacturing Engineer',
                email: 'engineer@company.com',
                permissions: ['view', 'outward', 'reports']
            }
        ];

        this.saveUsers(defaultUsers);
        return defaultUsers;
    }

    saveUsers(users) {
        localStorage.setItem('inventoryUsers', JSON.stringify(users));
    }

    getCurrentUser() {
        const userData = localStorage.getItem('currentUser');
        return userData ? JSON.parse(userData) : null;
    }

    setCurrentUser(user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.currentUser = user;
    }

    handleLogin(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const username = formData.get('username');
        const password = formData.get('password');
        const role = formData.get('role');

        // Find user
        const user = this.users.find(u => 
            u.username === username && 
            u.password === password && 
            u.role === role
        );

        if (user) {
            this.setCurrentUser(user);
            this.showNotification('Login successful!', 'success');
            
            // Redirect after short delay
            setTimeout(() => {
                this.redirectToDashboard();
            }, 1000);
        } else {
            this.showNotification('Invalid credentials. Please check username, password, and role.', 'error');
        }
    }

    logout() {
        localStorage.removeItem('currentUser');
        this.currentUser = null;
        this.showNotification('Logged out successfully!', 'success');
        
        setTimeout(() => {
            this.redirectToLogin();
        }, 1000);
    }

    redirectToDashboard() {
        window.location.href = 'dashboard.html';
    }

    redirectToLogin() {
        window.location.href = 'index.html';
    }

    hasPermission(permission) {
        if (!this.currentUser) return false;
        
        return this.currentUser.permissions.includes('all') || 
               this.currentUser.permissions.includes(permission);
    }

    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas ${this.getNotificationIcon(type)}"></i>
            ${message}
        `;

        // Add to page
        const container = document.body;
        container.appendChild(notification);

        // Position notification
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.zIndex = '9999';
        notification.style.maxWidth = '350px';

        // Auto remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
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

    // User Management (Admin only)
    addUser(userData) {
        if (!this.isAdmin()) {
            throw new Error('Permission denied');
        }

        const newUser = {
            id: Date.now().toString(),
            ...userData,
            permissions: this.getRolePermissions(userData.role)
        };

        this.users.push(newUser);
        this.saveUsers(this.users);
        return newUser;
    }

    updateUser(userId, userData) {
        if (!this.isAdmin()) {
            throw new Error('Permission denied');
        }

        const userIndex = this.users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            this.users[userIndex] = {
                ...this.users[userIndex],
                ...userData,
                permissions: this.getRolePermissions(userData.role || this.users[userIndex].role)
            };
            this.saveUsers(this.users);
            return this.users[userIndex];
        }
        throw new Error('User not found');
    }

    deleteUser(userId) {
        if (!this.isAdmin()) {
            throw new Error('Permission denied');
        }

        const userIndex = this.users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            this.users.splice(userIndex, 1);
            this.saveUsers(this.users);
            return true;
        }
        throw new Error('User not found');
    }

    getRolePermissions(role) {
        const rolePermissions = {
            admin: ['all'],
            user: ['view', 'inward', 'outward', 'edit'],
            researcher: ['view', 'search'],
            engineer: ['view', 'outward', 'reports']
        };
        return rolePermissions[role] || ['view'];
    }

    getAllUsers() {
        if (!this.isAdmin()) {
            throw new Error('Permission denied');
        }
        return this.users;
    }
}

// Initialize authentication
const auth = new AuthManager();

// Export for use in other files
window.auth = auth;