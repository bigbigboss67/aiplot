// app.js – Main application logic for AI-Plot

const DataStore = {
    cis: [],
    leads: [],
    deals: [],
    plots: [],
    activities: [],

    // NEW: Add a plot to the store
    addPlot(plotData) {
        if (!plotData.id) {
            plotData.id = 'plot-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        }
        this.plots.push(plotData);
        // Refresh UI if possible
        if (typeof UI !== 'undefined') {
            if (UI.refreshPlotsTable) UI.refreshPlotsTable();
            if (UI.refreshDashboard) UI.refreshDashboard();
        }
        // Auto-save to localStorage
        this.saveToLocalStorage();
    },

    init() {
        const saved = localStorage.getItem('aiplot_data');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.cis = data.cis || [];
                this.leads = data.leads || [];
                this.deals = data.deals || [];
                this.plots = data.plots || [];
                this.activities = data.activities || [];
            } catch (e) {
                console.error('Load error, starting fresh', e);
                this.seedDemoData();
            }
        } else {
            this.seedDemoData();
        }
    },

    saveToLocalStorage() {
        localStorage.setItem('aiplot_data', JSON.stringify({
            cis: this.cis,
            leads: this.leads,
            deals: this.deals,
            plots: this.plots,
            activities: this.activities
        }));
    },

    async syncFromFirebase() {
        // Placeholder – implement Firebase sync if desired
    },

    async saveToFirebase() {
        // Placeholder
    },

    seedDemoData() {
        this.cis = [
            { id: 'ci-1', name: 'Acme Corp', sector: 'Tech', contact: 'john@acme.com' },
            { id: 'ci-2', name: 'Globex Inc', sector: 'Finance', contact: 'jane@globex.com' }
        ];
        this.leads = [
            { id: 'ld-1', name: 'Alice Smith', company: 'StartupX', status: 'Qualified', source: 'Website' },
            { id: 'ld-2', name: 'Bob Johnson', company: 'MegaCorp', status: 'New', source: 'Referral' }
        ];
        this.deals = [
            { id: 'dl-1', title: 'Software License', amount: 15000, stage: 'Proposal', ciId: 'ci-1' },
            { id: 'dl-2', title: 'Consulting', amount: 8000, stage: 'Negotiation', ciId: 'ci-2' }
        ];
        this.plots = [
            {
                id: 'plot-1',
                title: 'Q3 Growth Strategy',
                description: 'Sample plot – imported files will appear here.',
                plotType: 'scatter',
                dataPoints: [
                    { x: 1, y: 10 },
                    { x: 2, y: 20 },
                    { x: 3, y: 15 }
                ],
                created: new Date().toISOString()
            }
        ];
        this.activities = [
            { id: 'act-1', type: 'Call', description: 'Follow-up with Acme', timestamp: new Date().toISOString() }
        ];
        this.saveToLocalStorage();
    }
};

// UI Controller
const UI = {
    refreshPlotsTable() {
        const tbody = document.querySelector('#plots-table tbody');
        if (!tbody) return;
        tbody.innerHTML = DataStore.plots.map(plot => `
            <tr>
                <td>${plot.title}</td>
                <td>${plot.plotType}</td>
                <td>${plot.created ? new Date(plot.created).toLocaleDateString() : 'N/A'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary view-plot" data-id="${plot.id}">
                        <i class="bi bi-eye"></i> View
                    </button>
                </td>
            </tr>
        `).join('');
        // Attach view handlers
        tbody.querySelectorAll('.view-plot').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const plot = DataStore.plots.find(p => p.id === id);
                if (plot) UI.showPlotDetail(plot);
            });
        });
    },

    refreshDashboard() {
        const plotCount = document.getElementById('plot-count');
        if (plotCount) plotCount.textContent = DataStore.plots.length;
        const leadCount = document.getElementById('lead-count');
        if (leadCount) leadCount.textContent = DataStore.leads.length;
        const dealCount = document.getElementById('deal-count');
        if (dealCount) dealCount.textContent = DataStore.deals.length;
    },

    showPlotDetail(plot) {
        const modal = document.getElementById('plot-detail-modal');
        if (!modal) return;
        modal.querySelector('.modal-title').textContent = plot.title;
        modal.querySelector('.modal-body').innerHTML = `
            <p>${plot.description || ''}</p>
            <canvas id="plot-canvas" width="400" height="300"></canvas>
        `;
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
        // Draw chart after modal is shown
        modal.addEventListener('shown.bs.modal', () => {
            if (typeof Chart !== 'undefined' && plot.dataPoints && plot.dataPoints.length > 0) {
                const ctx = document.getElementById('plot-canvas').getContext('2d');
                new Chart(ctx, {
                    type: plot.plotType || 'scatter',
                    data: {
                        datasets: [{
                            label: plot.title,
                            data: plot.dataPoints.map(p => ({ x: p.x, y: p.y }))
                        }]
                    },
                    options: {
                        scales: {
                            x: { type: 'linear', position: 'bottom' }
                        }
                    }
                });
            }
        }, { once: true });
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-bg-${type} border-0`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        container.appendChild(toast);
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        toast.addEventListener('hidden.bs.toast', () => toast.remove());
    }
};

// Router & Auth
const Router = {
    currentUser: null,
    init() {
        this.currentUser = JSON.parse(localStorage.getItem('aiplot_user'));
        const path = window.location.pathname.split('/').pop();
        if (!this.currentUser && path !== 'login.html' && path !== 'register.html') {
            window.location.href = 'login.html';
        }
    },
    login(email, password) {
        if (email && password) {
            const user = { email, name: email.split('@')[0] };
            localStorage.setItem('aiplot_user', JSON.stringify(user));
            window.location.href = 'index.html';
        }
    },
    register(name, email, password) {
        if (name && email && password) {
            const user = { email, name };
            localStorage.setItem('aiplot_user', JSON.stringify(user));
            window.location.href = 'index.html';
        }
    },
    logout() {
        localStorage.removeItem('aiplot_user');
        window.location.href = 'login.html';
    }
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    DataStore.init();
    Router.init();

    // Logout buttons
    document.querySelectorAll('.logout-btn').forEach(btn => {
        btn.addEventListener('click', Router.logout);
    });

    // If on dashboard, populate UI
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        UI.refreshDashboard();
        UI.refreshPlotsTable();
    }
});

// Expose globally
window.DataStore = DataStore;
window.UI = UI;
window.Router = Router;