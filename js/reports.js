// Load inventory data (from localStorage or mockData)
const savedComponents = localStorage.getItem('inventoryComponents');
const components = savedComponents ? JSON.parse(savedComponents) : (window.mockData ? window.mockData.components : []);

// Render Bar Chart (Quantity by Component)
function renderBarChart() {
    const ctx = document.getElementById('barChart');
    if (!ctx) return;
    const labels = components.map(comp => comp.name);
    const data = components.map(comp => comp.quantity);
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Quantity',
                data: data,
                backgroundColor: 'rgba(52, 152, 219, 0.7)'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// Render Pie Chart (Distribution)
function renderPieChart() {
    const ctx = document.getElementById('pieChart');
    if (!ctx) return;
    const labels = components.map(comp => comp.name);
    const data = components.map(comp => comp.quantity);
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: labels.map((_, i) => `hsl(${i * 360 / labels.length}, 70%, 60%)`)
            }]
        },
        options: {
            responsive: true
        }
    });
}

// Populate Table
function populateTable() {
    const tbody = document.getElementById('inventoryTable').querySelector('tbody');
    if (!tbody) return;
    tbody.innerHTML = components.map(comp => `
        <tr>
            <td>${comp.name}</td>
            <td>${comp.partNumber}</td>
            <td>${comp.quantity}</td>
            <td>${comp.unitPrice}</td>
            <td>${comp.criticalLowThreshold}</td>
            <td>${comp.addedDate}</td>
        </tr>
    `).join('');
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Render charts and table
    renderBarChart();
    renderPieChart();
    populateTable();

    // Add navigation event listeners for Reports and Users tabs
    const reportsLink = document.getElementById('reportsLink');
    if (reportsLink) {
        reportsLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'reports.html';
        });
    }
    const usersLink = document.getElementById('usersLink');
    if (usersLink) {
        usersLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (auth.isAdmin() && window.dashboard && window.dashboard.showUsersModal) {
                window.dashboard.showUsersModal();
            } else {
                Utils.showNotification('Access denied. Admin privileges required.', 'error');
            }
        });
    }
});