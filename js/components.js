// Components Management
class ComponentsManager {
    constructor() {
        this.components = [];
        this.filteredComponents = [];
        this.editingComponent = null;
        this.init();
    }

    init() {
        // Check authentication
        if (!auth.currentUser) {
            auth.redirectToLogin();
            return;
        }

        this.loadComponents();
        this.setupEventListeners();
        this.updateUserInfo();
        this.populateFilters();
        this.renderComponents();
        
        // Show admin features if user is admin
        if (auth.isAdmin()) {
            this.showAdminFeatures();
        }
    }

    loadComponents() {
        const savedComponents = localStorage.getItem('inventoryComponents');
        this.components = savedComponents ? JSON.parse(savedComponents) : mockData.components;
        this.filteredComponents = [...this.components];
    }

    saveComponents() {
        localStorage.setItem('inventoryComponents', JSON.stringify(this.components));
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

        // Component management buttons
        document.getElementById('addComponentBtn')?.addEventListener('click', () => {
            this.showComponentModal();
        });

        document.getElementById('inwardBtn')?.addEventListener('click', () => {
            this.showStockMovementModal('inward');
        });

        document.getElementById('outwardBtn')?.addEventListener('click', () => {
            this.showStockMovementModal('outward');
        });

        document.getElementById('exportBtn')?.addEventListener('click', () => {
            this.exportToCSV();
        });

        document.getElementById('importBtn')?.addEventListener('click', () => {
            document.getElementById('importFile').click();
        });

        document.getElementById('importFile')?.addEventListener('change', (e) => {
            this.handleImport(e);
        });

        // Search and filter
        document.getElementById('searchInput')?.addEventListener('input', 
            Utils.debounce(() => this.applyFilters(), 300)
        );

        ['categoryFilter', 'locationFilter', 'stockFilter', 'quantityMin', 'quantityMax', 'sortBy'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => this.applyFilters());
        });

        document.getElementById('clearFiltersBtn')?.addEventListener('click', () => {
            this.clearFilters();
        });

        // Forms
        document.getElementById('componentForm')?.addEventListener('submit', (e) => {
            this.handleComponentFormSubmit(e);
        });

        document.getElementById('stockMovementForm')?.addEventListener('submit', (e) => {
            this.handleStockMovementSubmit(e);
        });

        document.getElementById('selectedComponent')?.addEventListener('change', (e) => {
            this.updateCurrentStockInfo(e.target.value);
        });

        // Initialize modals
        Utils.initializeModal('componentModal');
        Utils.initializeModal('stockMovementModal');
        Utils.initializeModal('componentDetailsModal');
    }

    updateUserInfo() {
        const userInfo = document.getElementById('userInfo');
        if (userInfo && auth.currentUser) {
            userInfo.textContent = `${auth.currentUser.name} (${auth.currentUser.role})`;
        }
    }

    showAdminFeatures() {
        const adminNav = document.getElementById('adminNav');
        if (adminNav) {
            adminNav.style.display = 'block';
        }
    }

    populateFilters() {
        this.populateCategoryFilter();
        this.populateLocationFilter();
        this.populateComponentSelect();
    }

    populateCategoryFilter() {
        const select = document.getElementById('categoryFilter');
        if (!select) return;

        const categories = [...new Set(this.components.map(c => c.category))].sort();
        
        select.innerHTML = '<option value="">All Categories</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            select.appendChild(option);
        });
    }

    populateLocationFilter() {
        const select = document.getElementById('locationFilter');
        if (!select) return;

        const locations = [...new Set(this.components.map(c => c.location))].sort();
        
        select.innerHTML = '<option value="">All Locations</option>';
        locations.forEach(location => {
            const option = document.createElement('option');
            option.value = location;
            option.textContent = location;
            select.appendChild(option);
        });
    }

    populateComponentSelect() {
        const select = document.getElementById('selectedComponent');
        if (!select) return;

        select.innerHTML = '<option value="">Select Component</option>';
        this.components.forEach(component => {
            const option = document.createElement('option');
            option.value = component.id;
            option.textContent = `${component.name} (${component.partNumber}) - ${component.quantity} available`;
            select.appendChild(option);
        });
    }

    applyFilters() {
        const searchTerm = document.getElementById('searchInput')?.value || '';
        const categoryFilter = document.getElementById('categoryFilter')?.value || '';
        const locationFilter = document.getElementById('locationFilter')?.value || '';
        const stockFilter = document.getElementById('stockFilter')?.value || '';
        const quantityMin = parseInt(document.getElementById('quantityMin')?.value) || 0;
        const quantityMax = parseInt(document.getElementById('quantityMax')?.value) || Infinity;
        const sortBy = document.getElementById('sortBy')?.value || 'name';

        let filtered = [...this.components];

        // Search filter
        if (searchTerm) {
            filtered = Utils.searchArray(filtered, searchTerm, ['name', 'partNumber', 'manufacturer', 'description']);
        }

        // Category filter
        if (categoryFilter) {
            filtered = filtered.filter(c => c.category === categoryFilter);
        }

        // Location filter
        if (locationFilter) {
            filtered = filtered.filter(c => c.location === locationFilter);
        }

        // Stock status filter
        if (stockFilter) {
            switch (stockFilter) {
                case 'low':
                    filtered = filtered.filter(c => c.quantity <= c.criticalLowThreshold);
                    break;
                case 'normal':
                    filtered = filtered.filter(c => c.quantity > c.criticalLowThreshold);
                    break;
                case 'old':
                    filtered = filtered.filter(c => Utils.isOldStock(c.addedDate));
                    break;
            }
        }

        // Quantity range filter
        filtered = filtered.filter(c => c.quantity >= quantityMin && c.quantity <= quantityMax);

        // Sort
        filtered = Utils.sortArray(filtered, sortBy);

        this.filteredComponents = filtered;
        this.renderComponents();
    }

    clearFilters() {
        document.getElementById('searchInput').value = '';
        document.getElementById('categoryFilter').value = '';
        document.getElementById('locationFilter').value = '';
        document.getElementById('stockFilter').value = '';
        document.getElementById('quantityMin').value = '';
        document.getElementById('quantityMax').value = '';
        document.getElementById('sortBy').value = 'name';
        
        this.filteredComponents = [...this.components];
        this.renderComponents();
    }

    renderComponents() {
        const tbody = document.getElementById('componentsTableBody');
        const countElement = document.getElementById('componentCount');
        
        if (!tbody) return;

        if (countElement) {
            countElement.textContent = `${this.filteredComponents.length} components`;
        }

        if (this.filteredComponents.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center">No components found</td>
                </tr>
            `;
            return;
        }

        const html = this.filteredComponents.map(component => {
            const stockStatus = this.getStockStatus(component);
            const totalValue = component.quantity * component.unitPrice;
            
            return `
                <tr>
                    <td>
                        <strong>${component.name}</strong>
                        ${component.description ? `<br><small class="text-muted">${component.description}</small>` : ''}
                    </td>
                    <td>
                        <code>${component.partNumber}</code>
                        ${component.datasheetLink ? `<br><a href="${component.datasheetLink}" target="_blank"><i class="fas fa-external-link-alt"></i> Datasheet</a>` : ''}
                    </td>
                    <td>${component.manufacturer}</td>
                    <td><span class="badge badge-info">${component.category}</span></td>
                    <td>
                        <strong>${Utils.formatNumber(component.quantity)}</strong>
                        <br><small>Threshold: ${component.criticalLowThreshold}</small>
                    </td>
                    <td>
                        <i class="fas fa-map-marker-alt"></i>
                        ${component.location}
                    </td>
                    <td>
                        ${Utils.formatCurrency(component.unitPrice)}
                        <br><small>Total: ${Utils.formatCurrency(totalValue)}</small>
                    </td>
                    <td>
                        <span class="badge badge-${stockStatus.class}">${stockStatus.text}</span>
                        ${Utils.isOldStock(component.addedDate) ? '<br><span class="badge badge-warning">Old Stock</span>' : ''}
                    </td>
                    <td>
                        <button class="btn btn-secondary" onclick="componentsManager.viewComponent('${component.id}')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${auth.hasPermission('edit') ? `
                        <button class="btn btn-primary" onclick="componentsManager.editComponent('${component.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>` : ''}
                        ${auth.hasPermission('inward') ? `
                        <button class="btn btn-success" onclick="componentsManager.quickInward('${component.id}')" title="Quick Inward">
                            <i class="fas fa-arrow-down"></i>
                        </button>` : ''}
                        ${auth.hasPermission('outward') ? `
                        <button class="btn btn-warning" onclick="componentsManager.quickOutward('${component.id}')" title="Quick Outward">
                            <i class="fas fa-arrow-up"></i>
                        </button>` : ''}
                        ${auth.isAdmin() ? `
                        <button class="btn btn-danger" onclick="componentsManager.deleteComponent('${component.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>` : ''}
                    </td>
                </tr>
            `;
        }).join('');

        tbody.innerHTML = html;
    }

    getStockStatus(component) {
        if (component.quantity <= 0) {
            return { class: 'danger', text: 'Out of Stock' };
        } else if (component.quantity <= component.criticalLowThreshold) {
            return { class: 'warning', text: 'Low Stock' };
        } else {
            return { class: 'success', text: 'In Stock' };
        }
    }

    showComponentModal(componentId = null) {
        if (componentId && !auth.hasPermission('edit')) {
            Utils.showNotification('Permission denied. You cannot edit components.', 'error');
            return;
        }

        if (!componentId && !auth.hasPermission('edit')) {
            Utils.showNotification('Permission denied. You cannot add components.', 'error');
            return;
        }

        const modal = document.getElementById('componentModal');
        const title = document.getElementById('componentModalTitle');
        const form = document.getElementById('componentForm');
        
        if (!modal || !title || !form) return;

        form.reset();
        this.editingComponent = null;

        if (componentId) {
            // Edit mode
            const component = this.components.find(c => c.id === componentId);
            if (component) {
                this.editingComponent = component;
                title.textContent = 'Edit Component';
                
                // Populate form
                document.getElementById('componentId').value = component.id;
                document.getElementById('componentName').value = component.name;
                document.getElementById('partNumber').value = component.partNumber;
                document.getElementById('manufacturer').value = component.manufacturer;
                document.getElementById('category').value = component.category;
                document.getElementById('quantity').value = component.quantity;
                document.getElementById('location').value = component.location;
                document.getElementById('unitPrice').value = component.unitPrice;
                document.getElementById('criticalLowThreshold').value = component.criticalLowThreshold;
                document.getElementById('description').value = component.description || '';
                document.getElementById('datasheetLink').value = component.datasheetLink || '';
            }
        } else {
            // Add mode
            title.textContent = 'Add Component';
        }

        Utils.showModal('componentModal');
    }

    handleComponentFormSubmit(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const componentData = {
            name: formData.get('name'),
            partNumber: formData.get('partNumber'),
            manufacturer: formData.get('manufacturer'),
            category: formData.get('category'),
            quantity: parseInt(formData.get('quantity')),
            location: formData.get('location'),
            unitPrice: parseFloat(formData.get('unitPrice')),
            criticalLowThreshold: parseInt(formData.get('criticalLowThreshold')),
            description: formData.get('description') || '',
            datasheetLink: formData.get('datasheetLink') || ''
        };

        const componentId = formData.get('componentId');

        try {
            if (componentId) {
                // Update component
                const index = this.components.findIndex(c => c.id === componentId);
                if (index !== -1) {
                    this.components[index] = {
                        ...this.components[index],
                        ...componentData,
                        lastUpdated: new Date()
                    };
                    Utils.showNotification('Component updated successfully!', 'success');
                }
            } else {
                // Add new component
                const newComponent = {
                    id: Utils.generateId(),
                    ...componentData,
                    addedDate: new Date(),
                    lastUpdated: new Date(),
                    movements: []
                };
                this.components.push(newComponent);
                Utils.showNotification('Component added successfully!', 'success');
            }

            this.saveComponents();
            this.populateFilters();
            this.applyFilters();
            Utils.hideModal('componentModal');
        } catch (error) {
            Utils.showNotification(`Error: ${error.message}`, 'error');
        }
    }

    editComponent(componentId) {
        this.showComponentModal(componentId);
    }

    deleteComponent(componentId) {
        if (!auth.isAdmin()) {
            Utils.showNotification('Permission denied. Admin privileges required.', 'error');
            return;
        }

        if (confirm('Are you sure you want to delete this component? This action cannot be undone.')) {
            const index = this.components.findIndex(c => c.id === componentId);
            if (index !== -1) {
                this.components.splice(index, 1);
                this.saveComponents();
                this.populateFilters();
                this.applyFilters();
                Utils.showNotification('Component deleted successfully!', 'success');
            }
        }
    }

    viewComponent(componentId) {
        const component = this.components.find(c => c.id === componentId);
        if (!component) return;

        const modal = document.getElementById('componentDetailsModal');
        const body = document.getElementById('componentDetailsBody');
        
        if (!modal || !body) return;

        const age = Utils.calculateAge(component.addedDate);
        const totalValue = component.quantity * component.unitPrice;
        const stockStatus = this.getStockStatus(component);

        body.innerHTML = `
            <div class="form-grid">
                <div class="form-group">
                    <label>Component Name</label>
                    <p><strong>${component.name}</strong></p>
                </div>
                
                <div class="form-group">
                    <label>Part Number</label>
                    <p><code>${component.partNumber}</code></p>
                </div>
                
                <div class="form-group">
                    <label>Manufacturer</label>
                    <p>${component.manufacturer}</p>
                </div>
                
                <div class="form-group">
                    <label>Category</label>
                    <p><span class="badge badge-info">${component.category}</span></p>
                </div>
                
                <div class="form-group">
                    <label>Current Stock</label>
                    <p>
                        <strong>${Utils.formatNumber(component.quantity)} units</strong>
                        <br><span class="badge badge-${stockStatus.class}">${stockStatus.text}</span>
                    </p>
                </div>
                
                <div class="form-group">
                    <label>Location</label>
                    <p><i class="fas fa-map-marker-alt"></i> ${component.location}</p>
                </div>
                
                <div class="form-group">
                    <label>Unit Price</label>
                    <p>${Utils.formatCurrency(component.unitPrice)}</p>
                </div>
                
                <div class="form-group">
                    <label>Total Value</label>
                    <p><strong>${Utils.formatCurrency(totalValue)}</strong></p>
                </div>
                
                <div class="form-group">
                    <label>Critical Low Threshold</label>
                    <p>${component.criticalLowThreshold} units</p>
                </div>
                
                <div class="form-group">
                    <label>Age</label>
                    <p>${age} days ${Utils.isOldStock(component.addedDate) ? '<span class="badge badge-warning">Old Stock</span>' : ''}</p>
                </div>
                
                ${component.description ? `
                <div class="form-group form-group-full">
                    <label>Description</label>
                    <p>${component.description}</p>
                </div>` : ''}
                
                ${component.datasheetLink ? `
                <div class="form-group form-group-full">
                    <label>Datasheet</label>
                    <p><a href="${component.datasheetLink}" target="_blank"><i class="fas fa-external-link-alt"></i> View Datasheet</a></p>
                </div>` : ''}
                
                <div class="form-group form-group-full">
                    <label>Last Updated</label>
                    <p>${Utils.formatDate(component.lastUpdated)}</p>
                </div>
            </div>
            
            ${component.movements && component.movements.length > 0 ? `
            <div class="mt-20">
                <h4><i class="fas fa-history"></i> Recent Movements</h4>
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Quantity</th>
                                <th>User</th>
                                <th>Date</th>
                                <th>Reason</th>
                                <th>Project</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${component.movements.slice(0, 10).map(movement => `
                                <tr>
                                    <td><span class="badge badge-${movement.type === 'inward' ? 'success' : 'warning'}">${movement.type}</span></td>
                                    <td>${Utils.formatNumber(movement.quantity)}</td>
                                    <td>${movement.user}</td>
                                    <td>${Utils.formatDate(movement.date)}</td>
                                    <td>${movement.reason}</td>
                                    <td>${movement.project}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>` : ''}
        `;

        Utils.showModal('componentDetailsModal');
    }

    showStockMovementModal(type, componentId = null) {
        if (type === 'inward' && !auth.hasPermission('inward')) {
            Utils.showNotification('Permission denied. You cannot perform inward operations.', 'error');
            return;
        }

        if (type === 'outward' && !auth.hasPermission('outward')) {
            Utils.showNotification('Permission denied. You cannot perform outward operations.', 'error');
            return;
        }

        const modal = document.getElementById('stockMovementModal');
        const title = document.getElementById('stockMovementTitle');
        const form = document.getElementById('stockMovementForm');
        const submitBtn = document.getElementById('submitMovementBtn');
        
        if (!modal || !title || !form) return;

        form.reset();
        document.getElementById('movementType').value = type;
        
        title.textContent = type === 'inward' ? 'Inward Stock' : 'Outward Stock';
        submitBtn.textContent = type === 'inward' ? 'Add Stock' : 'Remove Stock';
        submitBtn.className = `btn ${type === 'inward' ? 'btn-success' : 'btn-warning'}`;

        if (componentId) {
            document.getElementById('selectedComponent').value = componentId;
            this.updateCurrentStockInfo(componentId);
        }

        Utils.showModal('stockMovementModal');
    }

    updateCurrentStockInfo(componentId) {
        const infoDiv = document.getElementById('currentStockInfo');
        const infoText = document.getElementById('currentStockText');
        
        if (!componentId) {
            infoDiv.style.display = 'none';
            return;
        }

        const component = this.components.find(c => c.id === componentId);
        if (component) {
            infoText.textContent = `Current stock: ${Utils.formatNumber(component.quantity)} units | Location: ${component.location}`;
            infoDiv.style.display = 'block';
        } else {
            infoDiv.style.display = 'none';
        }
    }

    handleStockMovementSubmit(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const componentId = formData.get('selectedComponent');
        const movementType = formData.get('movementType');
        const quantity = parseInt(formData.get('quantity'));
        const reason = formData.get('reason');
        const project = formData.get('project');

        if (!componentId || !quantity || !reason || !project) {
            Utils.showNotification('Please fill in all required fields.', 'error');
            return;
        }

        const componentIndex = this.components.findIndex(c => c.id === componentId);
        if (componentIndex === -1) {
            Utils.showNotification('Component not found.', 'error');
            return;
        }

        const component = this.components[componentIndex];

        // Validate outward movement
        if (movementType === 'outward' && quantity > component.quantity) {
            Utils.showNotification(`Insufficient stock. Available: ${component.quantity} units.`, 'error');
            return;
        }

        try {
            // Create movement record
            const movement = {
                id: Utils.generateId(),
                type: movementType,
                quantity: quantity,
                user: auth.currentUser.name,
                date: new Date(),
                reason: reason,
                project: project
            };

            // Update component quantity and movements
            if (movementType === 'inward') {
                this.components[componentIndex].quantity += quantity;
            } else {
                this.components[componentIndex].quantity -= quantity;
            }

            this.components[componentIndex].lastUpdated = new Date();
            
            if (!this.components[componentIndex].movements) {
                this.components[componentIndex].movements = [];
            }
            this.components[componentIndex].movements.push(movement);

            this.saveComponents();
            this.populateFilters();
            this.applyFilters();
            Utils.hideModal('stockMovementModal');
            
            Utils.showNotification(
                `${movementType === 'inward' ? 'Stock added' : 'Stock removed'} successfully!`,
                'success'
            );

            // Check for low stock after outward movement
            if (movementType === 'outward' && this.components[componentIndex].quantity <= this.components[componentIndex].criticalLowThreshold) {
                setTimeout(() => {
                    Utils.showNotification(
                        `Warning: ${component.name} is now below the critical threshold (${this.components[componentIndex].quantity} remaining)`,
                        'warning',
                        5000
                    );
                }, 1000);
            }
        } catch (error) {
            Utils.showNotification(`Error: ${error.message}`, 'error');
        }
    }

    quickInward(componentId) {
        this.showStockMovementModal('inward', componentId);
    }

    quickOutward(componentId) {
        this.showStockMovementModal('outward', componentId);
    }

    exportToCSV() {
        const exportData = this.filteredComponents.map(component => ({
            'Component Name': component.name,
            'Part Number': component.partNumber,
            'Manufacturer': component.manufacturer,
            'Category': component.category,
            'Description': component.description,
            'Quantity': component.quantity,
            'Location': component.location,
            'Unit Price': component.unitPrice,
            'Critical Low Threshold': component.criticalLowThreshold,
            'Datasheet Link': component.datasheetLink,
            'Added Date': Utils.formatDate(component.addedDate),
            'Last Updated': Utils.formatDate(component.lastUpdated)
        }));

        Utils.exportToCSV(exportData, `inventory_components_${new Date().toISOString().split('T')[0]}.csv`);
        Utils.showNotification('Components exported successfully!', 'success');
    }

    async handleImport(event) {
        if (!auth.hasPermission('edit')) {
            Utils.showNotification('Permission denied. You cannot import components.', 'error');
            return;
        }

        const file = event.target.files[0];
        if (!file) return;

        try {
            const importedData = await Utils.importFromCSV(file);
            let successCount = 0;
            let errorCount = 0;

            importedData.forEach((row, index) => {
                try {
                    const component = {
                        id: Utils.generateId(),
                        name: row['Component Name'] || '',
                        partNumber: row['Part Number'] || '',
                        manufacturer: row['Manufacturer'] || '',
                        category: row['Category'] || 'Other',
                        description: row['Description'] || '',
                        quantity: parseInt(row['Quantity']) || 0,
                        location: row['Location'] || '',
                        unitPrice: parseFloat(row['Unit Price']) || 0,
                        criticalLowThreshold: parseInt(row['Critical Low Threshold']) || 0,
                        datasheetLink: row['Datasheet Link'] || '',
                        addedDate: new Date(),
                        lastUpdated: new Date(),
                        movements: []
                    };

                    // Basic validation
                    if (!component.name || !component.partNumber || !component.manufacturer) {
                        throw new Error('Missing required fields');
                    }

                    this.components.push(component);
                    successCount++;
                } catch (error) {
                    console.error(`Error importing row ${index + 1}:`, error);
                    errorCount++;
                }
            });

            this.saveComponents();
            this.populateFilters();
            this.applyFilters();

            Utils.showNotification(
                `Import completed! ${successCount} components imported successfully${errorCount > 0 ? `, ${errorCount} errors` : ''}.`,
                errorCount > 0 ? 'warning' : 'success'
            );
        } catch (error) {
            Utils.showNotification(`Import failed: ${error.message}`, 'error');
        }

        // Reset file input
        event.target.value = '';
    }
}

// Initialize components manager
const componentsManager = new ComponentsManager();

// Make it available globally for event handlers
window.componentsManager = componentsManager;