// app.js - Main application logic for AI-Plot

// ========================================
// Configuration & State
// ========================================
const APP_VERSION = '1.0.0';
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyB9Z_NrqCbkHkA4XJ6TZP0kX0rKJ8M2L3Q",
    authDomain: "ai-plot-8844b.firebaseapp.com",
    projectId: "ai-plot-8844b",
    storageBucket: "ai-plot-8844b.appspot.com",
    messagingSenderId: "109876543210",
    appId: "1:109876543210:web:abcdef1234567890abcdef"
};

// ========================================
// Data Store (In-Memory)
// ========================================
const DataStore = {
    cis: [],
    leads: [],
    deals: [],
    plots: [],
    activities: [],

    // NEW FUNCTION: addPlot
    addPlot(plotData) {
        // Assign a unique ID if missing
        if (!plotData.id) {
            plotData.id = `plot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        // Add to the plots array
        this.plots.push(plotData);
        // Refresh UI components if they exist
        if (typeof UI !== 'undefined') {
            if (UI.refreshPlotsTable) UI.refreshPlotsTable();
            if (UI.refreshDashboard) UI.refreshDashboard();
        }
    },

    // Initialize data from localStorage or defaults
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
                console.error('Failed to parse saved data, starting fresh', e);
                this.seedDemoData();
            }
        } else {
            this.seedDemoData();
        }
    },

    // Save all data to localStorage
    saveToLocalStorage() {
        localStorage.setItem('aiplot_data', JSON.stringify({
            cis: this.cis,
            leads: this.leads,
            deals: this.deals,
            plots: this.plots,
            activities: this.activities
        }));
    },

    // Sync data with Firebase (placeholder – implement as needed)
    async syncFromFirebase() {
        // If Firebase is initialized, fetch data and merge
        if (typeof firebase !== 'undefined' && firebase.firestore) {
            const db = firebase.firestore();
            try {
                const snapshot = await db.collection('plots').get();
                const remotePlots = [];
                snapshot.forEach(doc => {
                    remotePlots.push({ id: doc.id, ...doc.data() });
                });
                // Simple merge: replace local plots with remote (you may refine)
                this.plots = remotePlots.length > 0 ? remotePlots : this.plots;
                this.saveToLocalStorage();
            } catch (e) {
                console.warn('Firebase sync failed, using local data', e);
            }
        }
    },

    // Save plots to Firebase (called after import, for example)
    async saveToFirebase() {
        if (typeof firebase !== 'undefined' && firebase.firestore) {
            const db = firebase.firestore();
            const batch = db.batch();
            this.plots.forEach(plot => {
                const ref = db.collection('plots').doc(plot.id);
                batch.set(ref, plot, { merge: true });
            });
            try {
                await batch.commit();
                console.log('Saved to Firebase');
            } catch (e) {
                console.error('Firebase save error', e);
            }
        }
    },

    // Seed with demo data for first-time users
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
                description: 'Aggressive expansion into new markets',
                plotType: 'scatter',
                dataPoints: [{ x: 1, y: 10 }, { x: 2, y: 20 }, { x: 3, y: 15 }],
                created: new Date().toISOString()
            }
        ];
        this.activities = [
            { id: 'act-1', type: 'Call', description: 'Follow-up with Acme', timestamp: new Date().toISOString() }
        ];
        this.saveToLocalStorage();
    }
};

// ========================================
// UI Controller
// ========================================
const UI = {
    // Refresh the plots table on the main dashboard
    refreshPlotsTable() {
        const tbody = document.querySelector('#plots-table tbody');
        if (!tbody) return;
        tbody.innerHTML = DataStore.plots.map(plot => `
            <tr>
                <td>${plot.title}</td>
                <td>${plot.plotType}</td>
                <td>${new Date(plot.created).toLocaleDateString()}</td>
                <td><button class="btn btn-sm btn-outline-primary view-plot" data-id="${plot.id}">View</button></td>
            </tr>
        `).join('');
        // Attach event listeners
        tbody.querySelectorAll('.view-plot').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const plot = DataStore.plots.find(p => p.id === id);
                if (plot) UI.showPlotDetail(plot);
            });
        });
    },

    // Refresh dashboard summary cards
    refreshDashboard() {
        const plotCount = document.getElementById('plot-count');
        if (plotCount) plotCount.textContent = DataStore.plots.length;
        const leadCount = document.getElementById('lead-count');
        if (leadCount) leadCount.textContent = DataStore.leads.length;
        const dealCount = document.getElementById('deal-count');
        if (dealCount) dealCount.textContent = DataStore.deals.length;
    },

    // Show an individual plot detail (modal or inline)
    showPlotDetail(plot) {
        // Simple implementation: show in modal
        const modal = document.getElementById('plot-detail-modal');
        if (modal) {
            modal.querySelector('.modal-title').textContent = plot.title;
            modal.querySelector('.modal-body').innerHTML = `
                <p>${plot.description || ''}</p>
                <canvas id="plot-canvas" width="400" height="300"></canvas>
            `;
            // Draw plot using Chart.js if available
            if (typeof Chart !== 'undefined' && plot.dataPoints) {
                const ctx = document.getElementById('plot-canvas').getContext('2d');
                new Chart(ctx, {
                    type: plot.plotType || 'scatter',
                    data: {
                        datasets: [{
                            label: plot.title,
                            data: plot.dataPoints.map(p => ({ x: p.x, y: p.y }))
                        }]
                    }
                });
            }
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();
        }
    },

    // Display a toast notification
    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-bg-${type} border-0`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        toastContainer.appendChild(toast);
        new bootstrap.Toast(toast).show();
    }
};

// ========================================
// Router & Auth (Simplified)
// ========================================
const Router = {
    currentUser: null,

    // Check login state and redirect
    init() {
        this.currentUser = JSON.parse(localStorage.getItem('aiplot_user'));
        const path = window.location.pathname;
        if (!this.currentUser && !path.includes('login.html') && !path.includes('register.html') && path !== '/') {
            window.location.href = '/login.html';
        } else if (this.currentUser && (path.includes('login.html') || path.includes('register.html') || path === '/')) {
            window.location.href = '/index.html';
        }
        // Listen for hash changes if needed
    },

    login(email, password) {
        // Simple mock login – replace with Firebase Auth
        if (email && password) {
            const user = { email, name: email.split('@')[0] };
            localStorage.setItem('aiplot_user', JSON.stringify(user));
            this.currentUser = user;
            window.location.href = '/index.html';
        } else {
            alert('Please enter email and password');
        }
    },

    register(name, email, password) {
        if (name && email && password) {
            const user = { email, name };
            localStorage.setItem('aiplot_user', JSON.stringify(user));
            this.currentUser = user;
            window.location.href = '/index.html';
        } else {
            alert('All fields are required');
        }
    },

    logout() {
        localStorage.removeItem('aiplot_user');
        this.currentUser = null;
        window.location.href = '/login.html';
    }
};

// ========================================
// Event Handlers & Initialization
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize data store
    DataStore.init();

    // Set up router
    Router.init();

    // Attach global UI events
    document.querySelectorAll('.logout-btn').forEach(btn => {
        btn.addEventListener('click', Router.logout);
    });

    // If on main dashboard, refresh views
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        UI.refreshDashboard();
        UI.refreshPlotsTable();
    }

    // Login form handler
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            Router.login(email, password);
        });
    }

    // Register form handler
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            Router.register(name, email, password);
        });
    }

    // Import file handling (from plot-import.js, if present, else define fallback)
    // This ensures the import button works even if plot-import.js loads later
    setTimeout(() => {
        if (typeof window.setupFileImport === 'function') {
            window.setupFileImport();
        } else {
            console.warn('plot-import.js not loaded, import feature disabled');
        }
    }, 500);
});

// Make store and UI accessible globally for other scripts
window.DataStore = DataStore;
window.UI = UI;
window.Router = Router;