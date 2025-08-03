// Utility Functions
class Utils {
    static formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    static formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    }

    static formatNumber(number) {
        return new Intl.NumberFormat('en-IN').format(number);
    }

    static generateId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static showLoading(element) {
        if (element) {
            element.innerHTML = '<div class="spinner"></div>';
        }
    }

    static hideLoading(element, originalContent) {
        if (element) {
            element.innerHTML = originalContent;
        }
    }

    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static validateRequired(value) {
        return value !== null && value !== undefined && value.toString().trim() !== '';
    }

    static validateNumber(value, min = null, max = null) {
        const num = parseFloat(value);
        if (isNaN(num)) return false;
        if (min !== null && num < min) return false;
        if (max !== null && num > max) return false;
        return true;
    }

    static searchArray(array, searchTerm, fields = []) {
        if (!searchTerm) return array;
        
        const term = searchTerm.toLowerCase();
        return array.filter(item => {
            if (fields.length === 0) {
                // Search all string fields
                return Object.values(item).some(value => 
                    typeof value === 'string' && value.toLowerCase().includes(term)
                );
            } else {
                // Search specific fields
                return fields.some(field => {
                    const value = this.getNestedProperty(item, field);
                    return typeof value === 'string' && value.toLowerCase().includes(term);
                });
            }
        });
    }

    static filterArray(array, filters) {
        return array.filter(item => {
            return Object.entries(filters).every(([key, value]) => {
                if (!value) return true;
                
                const itemValue = this.getNestedProperty(item, key);
                
                if (typeof value === 'object' && value.min !== undefined && value.max !== undefined) {
                    // Range filter
                    const numValue = parseFloat(itemValue);
                    return numValue >= value.min && numValue <= value.max;
                } else if (Array.isArray(value)) {
                    // Multiple choice filter
                    return value.includes(itemValue);
                } else {
                    // Exact match or contains
                    if (typeof itemValue === 'string') {
                        return itemValue.toLowerCase().includes(value.toLowerCase());
                    }
                    return itemValue === value;
                }
            });
        });
    }

    static sortArray(array, field, direction = 'asc') {
        return [...array].sort((a, b) => {
            const valueA = this.getNestedProperty(a, field);
            const valueB = this.getNestedProperty(b, field);
            
            let comparison = 0;
            
            if (typeof valueA === 'string' && typeof valueB === 'string') {
                comparison = valueA.localeCompare(valueB);
            } else if (typeof valueA === 'number' && typeof valueB === 'number') {
                comparison = valueA - valueB;
            } else if (valueA instanceof Date && valueB instanceof Date) {
                comparison = valueA.getTime() - valueB.getTime();
            } else {
                comparison = String(valueA).localeCompare(String(valueB));
            }
            
            return direction === 'desc' ? -comparison : comparison;
        });
    }

    static getNestedProperty(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    static setNestedProperty(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (!(key in current)) current[key] = {};
            return current[key];
        }, obj);
        target[lastKey] = value;
    }

    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const clonedObj = {};
            for (const key in obj) {
                clonedObj[key] = this.deepClone(obj[key]);
            }
            return clonedObj;
        }
    }

    static exportToCSV(data, filename = 'export.csv') {
        if (!data.length) return;
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => {
                    const value = row[header];
                    // Escape commas and quotes
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                }).join(',')
            )
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    static importFromCSV(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const csv = e.target.result;
                    const lines = csv.split('\n');
                    const headers = lines[0].split(',').map(h => h.trim());
                    
                    const data = lines.slice(1)
                        .filter(line => line.trim())
                        .map(line => {
                            const values = line.split(',');
                            const obj = {};
                            headers.forEach((header, index) => {
                                obj[header] = values[index]?.trim() || '';
                            });
                            return obj;
                        });
                    
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    static createChart(canvasId, type, data, options = {}) {
        // This would integrate with Chart.js when available
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;
        
        // For now, create a simple text representation
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '16px Arial';
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.fillText(`${type} Chart: ${data.datasets?.[0]?.label || 'Data'}`, canvas.width / 2, canvas.height / 2);
        
        return { canvas, type, data, options };
    }

    static showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }

    static hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    static initializeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideModal(modalId);
            }
        });
        
        // Close modal with close button
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideModal(modalId);
            });
        }
        
        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'block') {
                this.hideModal(modalId);
            }
        });
    }

    static showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas ${this.getNotificationIcon(type)}"></i>
            ${message}
        `;

        // Style and position
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.zIndex = '9999';
        notification.style.maxWidth = '350px';

        document.body.appendChild(notification);

        // Auto remove
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, duration);

        return notification;
    }

    static getNotificationIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    static calculateAge(date) {
        const now = new Date();
        const itemDate = new Date(date);
        const diffTime = Math.abs(now - itemDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }

    static isOldStock(date, thresholdDays = 90) {
        return this.calculateAge(date) > thresholdDays;
    }

    static isLowStock(quantity, threshold) {
        return quantity <= threshold;
    }
}

// Make Utils available globally
window.Utils = Utils;