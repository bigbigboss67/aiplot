/**
 * AI PLOT PORTAL - Main Application
 * Replicates VBA CRM functionality in a web-based portal
 * With Firebase Real-time Database & Agent Portal
 */

// ============================================================================
// Firebase Configuration
// ============================================================================

// Your Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyDKthkVZLmK5Y_wT0Jmx90UEkzJs_Pz9-I",
    authDomain: "plot-ai-87781.firebaseapp.com",
    databaseURL: "https://plot-ai-87781-default-rtdb.firebaseio.com",
    projectId: "plot-ai-87781",
    storageBucket: "plot-ai-87781.firebasestorage.app",
    messagingSenderId: "723228647195",
    appId: "1:723228647195:web:00693e31e923014e1efdbe"
};

// Initialize Firebase (if available)
let firebaseApp = null;
let firebaseDB = null;
let firebaseAuth = null;
let isOnline = false;

// ============================================================================
// File Upload Manager
// ============================================================================

const FileManager = {
    // Temporary storage for files before save
    tempImages: [],
    tempDocuments: [],
    
    // File type configurations
    config: {
        images: {
            accept: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
            maxSize: 5 * 1024 * 1024, // 5MB
            extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp']
        },
        documents: {
            accept: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
                     'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
            maxSize: 10 * 1024 * 1024, // 10MB
            extensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx']
        }
    },
    
    // Initialize file upload handlers
    init() {
        this.setupImageUpload();
        this.setupDocumentUpload();
    },
    
    setupImageUpload() {
        const uploadZone = document.getElementById('plot-images-upload');
        const fileInput = document.getElementById('plot-images-input');
        
        if (!uploadZone || !fileInput) return;
        
        // Click to browse
        uploadZone.addEventListener('click', () => fileInput.click());
        
        // File selection
        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files, 'images');
        });
        
        // Drag and drop
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });
        
        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('dragover');
        });
        
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files, 'images');
        });
    },
    
    setupDocumentUpload() {
        const uploadZone = document.getElementById('plot-docs-upload');
        const fileInput = document.getElementById('plot-docs-input');
        
        if (!uploadZone || !fileInput) return;
        
        uploadZone.addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files, 'documents');
        });
        
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });
        
        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('dragover');
        });
        
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files, 'documents');
        });
    },
    
    handleFiles(files, type) {
        const config = this.config[type];
        const validFiles = [];
        
        Array.from(files).forEach(file => {
            // Validate file type
            if (!config.accept.includes(file.type)) {
                UI.showToast(`Invalid file type: ${file.name}. Allowed: ${config.extensions.join(', ')}`, 'error');
                return;
            }
            
            // Validate file size
            if (file.size > config.maxSize) {
                UI.showToast(`File too large: ${file.name}. Max size: ${this.formatFileSize(config.maxSize)}`, 'error');
                return;
            }
            
            validFiles.push(file);
        });
        
        // Process valid files
        validFiles.forEach(file => {
            this.processFile(file, type);
        });
    },
    
    processFile(file, type) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const fileData = {
                id: this.generateFileId(),
                name: file.name,
                type: file.type,
                size: file.size,
                data: e.target.result,
                uploadedAt: new Date().toISOString()
            };
            
            if (type === 'images') {
                this.tempImages.push(fileData);
                this.renderFileList('images');
            } else {
                this.tempDocuments.push(fileData);
                this.renderFileList('documents');
            }
            
            UI.showToast(`${file.name} uploaded successfully`, 'success');
        };
        
        reader.readAsDataURL(file);
    },
    
    renderFileList(type) {
        const container = document.getElementById(type === 'images' ? 'plot-images-list' : 'plot-docs-list');
        const files = type === 'images' ? this.tempImages : this.tempDocuments;
        
        if (!container) return;
        
        container.innerHTML = files.map(file => this.createFileItemHTML(file, type)).join('');
    },
    
    createFileItemHTML(file, type) {
        const isImage = type === 'images';
        const iconClass = isImage ? 'fa-image' : this.getDocumentIcon(file.name);
        const preview = isImage ? `<img src="${file.data}" class="file-item-preview" alt="${file.name}">` : '';
        
        return `
            <div class="file-item file-item-${isImage ? 'image' : 'document'}" data-file-id="${file.id}">
                <div class="file-item-icon">
                    <i class="fas ${iconClass}"></i>
                </div>
                ${preview}
                <div class="file-item-info">
                    <span class="file-item-name">${file.name}</span>
                    <div class="file-item-meta">
                        <span class="file-item-type">${this.getFileExtension(file.name).toUpperCase()}</span>
                        <span class="file-item-size">${this.formatFileSize(file.size)}</span>
                    </div>
                </div>
                <div class="file-item-actions">
                    ${isImage ? `<button class="file-item-btn view" onclick="FileManager.viewFile('${file.id}', '${type}')" title="View">
                        <i class="fas fa-eye"></i>
                    </button>` : ''}
                    <button class="file-item-btn download" onclick="FileManager.downloadFile('${file.id}', '${type}')" title="Download">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="file-item-btn delete" onclick="FileManager.removeFile('${file.id}', '${type}')" title="Remove">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    },
    
    getDocumentIcon(filename) {
        const ext = this.getFileExtension(filename).toLowerCase();
        const iconMap = {
            'pdf': 'fa-file-pdf',
            'doc': 'fa-file-word',
            'docx': 'fa-file-word',
            'xls': 'fa-file-excel',
            'xlsx': 'fa-file-excel'
        };
        return iconMap[ext] || 'fa-file';
    },
    
    getFileExtension(filename) {
        return filename.split('.').pop();
    },
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    generateFileId() {
        return 'file-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    },
    
    removeFile(fileId, type) {
        if (type === 'images') {
            this.tempImages = this.tempImages.filter(f => f.id !== fileId);
            this.renderFileList('images');
        } else {
            this.tempDocuments = this.tempDocuments.filter(f => f.id !== fileId);
            this.renderFileList('documents');
        }
        UI.showToast('File removed', 'info');
    },
    
    viewFile(fileId, type) {
        const files = type === 'images' ? this.tempImages : this.tempDocuments;
        const file = files.find(f => f.id === fileId);
        if (file && file.data) {
            window.open(file.data, '_blank');
        }
    },
    
    downloadFile(fileId, type) {
        const files = type === 'images' ? this.tempImages : this.tempDocuments;
        const file = files.find(f => f.id === fileId);
        if (file && file.data) {
            const link = document.createElement('a');
            link.href = file.data;
            link.download = file.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    },
    
    // Get files for saving to plot
    getFilesForSave() {
        return {
            images: [...this.tempImages],
            documents: [...this.tempDocuments]
        };
    },
    
    // Load files from existing plot
    loadFiles(plot) {
        this.tempImages = plot.images || [];
        this.tempDocuments = plot.documents || [];
        this.renderFileList('images');
        this.renderFileList('documents');
    },
    
    // Clear temporary files
    clear() {
        this.tempImages = [];
        this.tempDocuments = [];
        this.renderFileList('images');
        this.renderFileList('documents');
    },
    
    // Render file badges for table view
    renderFileBadges(plot) {
        const images = plot.images || [];
        const documents = plot.documents || [];
        
        let html = '';
        
        if (images.length > 0) {
            html += `<span class="file-badge file-badge-image" onclick="FileManager.showGallery('${plot.id}')">
                <i class="fas fa-image"></i> ${images.length}
            </span>`;
        }
        
        if (documents.length > 0) {
            html += `<span class="file-badge file-badge-document" onclick="FileManager.showDocuments('${plot.id}')">
                <i class="fas fa-file"></i> ${documents.length}
            </span>`;
        }
        
        return html || '-';
    },
    
    // Show image gallery modal
    showGallery(plotId) {
        const plot = DataStore.plots.find(p => p.id === plotId);
        if (!plot || !plot.images || plot.images.length === 0) return;
        
        const galleryHTML = `
            <div class="modal active" id="gallery-modal">
                <div class="modal-content large">
                    <div class="modal-header">
                        <h3><i class="fas fa-images"></i> Plot Images - ${plot.plotNo}</h3>
                        <button class="btn-close" onclick="closeModal('gallery-modal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="file-gallery">
                            ${plot.images.map(img => `
                                <div class="file-gallery-item">
                                    <img src="${img.data}" alt="${img.name}">
                                    <div class="file-overlay">
                                        <button onclick="window.open('${img.data}', '_blank')" title="View">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        <button onclick="FileManager.downloadFileByData('${img.data}', '${img.name}')" title="Download">
                                            <i class="fas fa-download"></i>
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', galleryHTML);
    },
    
    // Show documents modal
    showDocuments(plotId) {
        const plot = DataStore.plots.find(p => p.id === plotId);
        if (!plot || !plot.documents || plot.documents.length === 0) return;
        
        const docsHTML = `
            <div class="modal active" id="docs-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-file-alt"></i> Plot Documents - ${plot.plotNo}</h3>
                        <button class="btn-close" onclick="closeModal('docs-modal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="file-list">
                            ${plot.documents.map(doc => `
                                <div class="file-item file-item-document">
                                    <div class="file-item-icon">
                                        <i class="fas ${this.getDocumentIcon(doc.name)}"></i>
                                    </div>
                                    <div class="file-item-info">
                                        <span class="file-item-name">${doc.name}</span>
                                        <div class="file-item-meta">
                                            <span>${this.getFileExtension(doc.name).toUpperCase()}</span>
                                            <span class="file-item-size">${this.formatFileSize(doc.size)}</span>
                                        </div>
                                    </div>
                                    <div class="file-item-actions">
                                        <button class="file-item-btn download" onclick="FileManager.downloadFileByData('${doc.data}', '${doc.name}')" title="Download">
                                            <i class="fas fa-download"></i>
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', docsHTML);
    },
    
    downloadFileByData(data, filename) {
        const link = document.createElement('a');
        link.href = data;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

try {
    if (typeof firebase !== 'undefined') {
        firebaseApp = firebase.initializeApp(firebaseConfig);
        firebaseDB = firebase.database();
        firebaseAuth = firebase.auth();
        isOnline = true;
        console.log('Firebase initialized successfully');
    }
} catch (e) {
    console.warn('Firebase not available, using localStorage mode:', e);
    isOnline = false;
}

// ============================================================================
// Authentication & User Management
// ============================================================================

const Auth = {
    currentUser: null,
    users: [], // Demo accounts removed - only Firebase users will be loaded

    init() {
        console.log('🔧 Auth.init() called');
        this.loadUsers();
        this.checkSession();
        
        // Setup Firebase auth listener if available
        if (firebaseAuth) {
            firebaseAuth.onAuthStateChanged((user) => {
                if (user) {
                    console.log('✅ Firebase Auth state changed: User logged in');
                    // User is signed in via Firebase, load their data
                    this.loadFirebaseUser(user);
                } else {
                    console.log('ℹ️ Firebase Auth state changed: No user');
                }
            });
        }
    },

    async loadFirebaseUser(firebaseUser) {
        try {
            const userRef = firebaseDB.ref('users/' + firebaseUser.uid);
            const snapshot = await userRef.once('value');
            const userData = snapshot.val();
            
            if (userData) {
                // Check if user is approved
                if (userData.status === 'pending') {
                    console.warn('⚠️ User account pending approval');
                    alert('Your account is pending admin approval. Please contact administrator.');
                    this.logout();
                    return;
                }
                
                if (userData.status !== 'active') {
                    console.warn('⚠️ User account is not active');
                    alert('Your account is not active. Please contact administrator.');
                    this.logout();
                    return;
                }
                
                this.currentUser = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    name: userData.name || firebaseUser.email,
                    role: userData.role || 'agent',
                    firebaseAuth: true
                };
                this.updateUIForUser();
            }
        } catch (error) {
            console.error('Error loading Firebase user:', error);
        }
    },

    async loadUsers() {
        const saved = localStorage.getItem('aiplot_users');
        if (saved) {
            this.users = JSON.parse(saved);
        } else {
            this.saveUsers();
        }
        
        // Load Firebase users if available
        if (firebaseDB) {
            try {
                console.log('🔄 Loading users from Firebase...');
                const snapshot = await firebaseDB.ref('users').once('value');
                if (snapshot.exists()) {
                    const firebaseUsers = snapshot.val();
                    Object.entries(firebaseUsers).forEach(([uid, user]) => {
                        // Check if user already exists
                        const exists = this.users.find(u => u.email === user.email);
                        if (!exists && user.email) {
                            // Add Firebase user to local users array
                            this.users.push({
                                id: uid,
                                name: user.name || user.email,
                                email: user.email,
                                role: user.role || 'agent',
                                status: user.status || 'pending',
                                password: '', // No password for Firebase users
                                firebaseUser: true
                            });
                            console.log('✅ Added Firebase user:', user.email);
                        }
                    });
                }
            } catch (error) {
                console.error('Error loading Firebase users:', error);
            }
        }
    },

    saveUsers() {
        localStorage.setItem('aiplot_users', JSON.stringify(this.users));
    },

    checkSession() {
        console.log('🔍 checkSession() called');
        const session = localStorage.getItem('aiplot_session') || sessionStorage.getItem('aiplot_session');
        console.log('📦 Session data:', session);
        
        if (session) {
            try {
                this.currentUser = JSON.parse(session);
                console.log('✅ Session loaded:', this.currentUser);
                
                // Wait for DOM to be ready before updating UI
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', () => {
                        console.log('🔄 DOM loaded, calling updateUIForUser');
                        this.updateUIForUser();
                    });
                } else {
                    console.log('🔄 DOM already ready, calling updateUIForUser immediately');
                    this.updateUIForUser();
                }
            } catch (error) {
                console.error('❌ Error parsing session:', error);
                localStorage.removeItem('aiplot_session');
                sessionStorage.removeItem('aiplot_session');
                // Redirect to login if session was corrupted
                if (!window.location.pathname.includes('login.html')) {
                    window.location.href = 'login.html';
                }
            }
        } else {
            console.log('⚠️ No session found - redirecting to login');
            // Only redirect if we're not already on login page
            if (!window.location.pathname.includes('login.html')) {
                window.location.href = 'login.html';
            }
        }
    },

    login(email, password, role) {
        const user = this.users.find(u => 
            u.email === email && 
            u.password === password && 
            u.role === role &&
            u.status === 'active'
        );

        if (user) {
            this.currentUser = { ...user, password: undefined };
            localStorage.setItem('aiplot_session', JSON.stringify(this.currentUser));
            this.updateUIForUser();
            UI.showToast(`Welcome back, ${user.name}!`);
            return true;
        }
        
        UI.showToast('Invalid credentials or user not found!', 'error');
        return false;
    },

    loginAsGuest() {
        this.currentUser = { id: 'guest', name: 'Guest User', email: 'guest@aiplot.com', role: 'guest' };
        sessionStorage.setItem('aiplot_session', JSON.stringify(this.currentUser));
        this.updateUIForUser();
        UI.showToast('Logged in as Guest - Data is local only');
    },

    logout() {
        // Sign out from Firebase if authenticated
        if (firebaseAuth) {
            firebaseAuth.signOut().then(() => {
                console.log('✅ Firebase sign out successful');
            }).catch((error) => {
                console.error('Firebase sign out error:', error);
            });
        }
        
        this.currentUser = null;
        localStorage.removeItem('aiplot_session');
        sessionStorage.removeItem('aiplot_session');
        
        // Hide admin nav on logout
        const adminNav = document.getElementById('admin-nav');
        if (adminNav) adminNav.style.display = 'none';
        
        // Redirect to login page
        console.log('🚪 Logout complete, redirecting to login.html');
        window.location.href = 'login.html';
    },

    updateUIForUser() {
        const userInfo = document.getElementById('user-info');
        const currentUserSpan = document.getElementById('current-user');
        const adminNav = document.getElementById('admin-nav');
        const addAgentBtn = document.getElementById('agent-portal-add-agent-btn');

        console.log('🔄 updateUIForUser called, currentUser:', this.currentUser);

        if (this.currentUser) {
            currentUserSpan.textContent = this.currentUser.name || this.currentUser.email || 'User';
            userInfo.classList.add('logged-in');
            console.log('✅ User display updated to:', this.currentUser.name);

            // Show admin nav for admin users
            if (this.currentUser.role === 'admin') {
                if (adminNav) {
                    adminNav.style.display = 'flex';
                    console.log('✅ Admin nav shown');
                }
                // Show Add Agent button in Agent Portal
                if (addAgentBtn) {
                    addAgentBtn.style.display = 'block';
                    console.log('✅ Add Agent button shown for admin');
                }
            } else {
                if (adminNav) adminNav.style.display = 'none';
            }

            // Load agent-specific data if agent
            if (this.currentUser.role === 'agent') {
                this.loadAgentDashboard();
            }
        } else {
            console.log('⚠️ No currentUser found');
            currentUserSpan.textContent = 'Not logged in';
        }
    },

    loadAgentDashboard() {
        // Filter data for current agent
        const agentLeads = DataStore.leads.filter(l => l.assignedTo === this.currentUser.name);
        const agentDeals = DataStore.deals.filter(d => d.agent === this.currentUser.name);
        
        // Update agent stats
        document.getElementById('agent-name').textContent = this.currentUser.name;
        document.getElementById('agent-role').textContent = this.currentUser.role === 'admin' ? 'Administrator' : 'Sales Agent';
        document.getElementById('agent-leads-count').textContent = agentLeads.length;
        document.getElementById('agent-deals-count').textContent = agentDeals.length;
        
        const totalCommission = agentDeals.reduce((sum, d) => sum + (d.commission || 0), 0);
        document.getElementById('agent-commission').textContent = `AED ${totalCommission.toLocaleString()}`;

        // Render agent leads table
        const leadsTbody = document.getElementById('agent-leads-tbody');
        leadsTbody.innerHTML = agentLeads.map(lead => `
            <tr>
                <td><span class="badge badge-new">${lead.id}</span></td>
                <td><strong>${lead.name}</strong></td>
                <td><span class="badge badge-${lead.status.toLowerCase().replace(/\s+/g, '-')}">${lead.status}</span></td>
                <td><span class="badge badge-priority-${lead.priority.toLowerCase()}">${lead.priority}</span></td>
                <td>${UI.formatDate(lead.lastContact)}</td>
                <td>
                    <div class="comm-buttons">
                        <button class="btn-email" onclick="openEmailModal('${lead.email || ''}', 'Follow-up - ${lead.name}', '')" title="Send Email">
                            <i class="fas fa-envelope"></i>
                        </button>
                        <button class="btn-whatsapp" onclick="sendWhatsAppLead('${lead.id}')" title="Send WhatsApp">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                        <button class="btn-video" onclick="startVideoCallLead('${lead.id}')" title="Start Video Call">
                            <i class="fas fa-video"></i>
                        </button>
                        <button class="btn-action edit" onclick="editLead('${lead.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="6" class="empty-state">No leads assigned</td></tr>';

        // Render agent deals table
        const dealsTbody = document.getElementById('agent-deals-tbody');
        dealsTbody.innerHTML = agentDeals.map(deal => `
            <tr>
                <td><span class="badge badge-active">${deal.id}</span></td>
                <td>${deal.clientName}</td>
                <td>${deal.plotId || '-'}</td>
                <td>AED ${deal.finalPrice.toLocaleString()}</td>
                <td><span class="badge badge-${deal.status.toLowerCase()}">${deal.status}</span></td>
                <td>AED ${deal.commission.toLocaleString()}</td>
                <td>
                    <div class="comm-buttons">
                        <button class="btn-email" onclick="openEmailModal('${deal.email || ''}', 'Deal Update - ${deal.id}', '')" title="Send Email">
                            <i class="fas fa-envelope"></i>
                        </button>
                        <button class="btn-whatsapp" onclick="sendWhatsAppDeal('${deal.id}')" title="Send WhatsApp">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                        <button class="btn-video" onclick="startVideoCallDeal('${deal.id}')" title="Start Video Call">
                            <i class="fas fa-video"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="6" class="empty-state">No deals yet</td></tr>';

        // Render agent follow-ups
        const followups = UI.calculateFollowUps().filter(f => f.agent === this.currentUser.name);
        const followupContainer = document.getElementById('agent-followups');
        followupContainer.innerHTML = followups.map(fu => `
            <div class="followup-item">
                <div class="activity-icon ${fu.statusClass}">
                    <i class="fas fa-${fu.status === 'OVERDUE' ? 'exclamation-circle' : 'clock'}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${fu.clientName}</div>
                    <div class="activity-description">
                        <span class="status-indicator status-${fu.statusClass.toLowerCase()}">${fu.status}</span>
                        - Due: ${fu.dueDate}
                    </div>
                </div>
            </div>
        `).join('') || '<div class="empty-state"><p>No follow-ups due</p></div>';
        
        // Render activity timeline
        Tracker.renderAgentTimeline();
    },

    addUser(name, email, password, role) {
        const newUser = {
            id: `user-${Date.now()}`,
            name,
            email,
            password,
            role,
            status: 'active'
        };
        this.users.push(newUser);
        this.saveUsers();
        
        // Sync to Firebase if online
        if (isOnline && firebaseDB) {
            firebaseDB.ref('users/' + newUser.id).set(newUser);
        }
        
        return newUser;
    }
};

// ============================================================================
// Data Store (In-memory database with localStorage + Firebase persistence)
// ============================================================================

const DataStore = {
    cis: [],
    leads: [],
    deals: [],
    plots: [],
    activities: [],

    init() {
        this.loadFromStorage();
        this.repairDataLinks();

        // Try to sync with Firebase if online
        if (isOnline && firebaseDB) {
            this.syncFromFirebase();
        } else if (this.cis.length === 0) {
            this.seedSampleData();
        }
    },

    syncFromFirebase() {
        if (!firebaseDB) return;
        
        // Listen for real-time updates
        firebaseDB.ref('cis').on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                this.cis = Object.values(data);
                UI.refreshCISTable();
                UI.refreshDashboard();
            }
        });

        firebaseDB.ref('leads').on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                this.leads = Object.values(data);
                this.repairDataLinks();
                UI.refreshLeadsTable();
                UI.refreshCISTable();
                UI.refreshDashboard();
            }
        });

        firebaseDB.ref('deals').on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                this.deals = Object.values(data);
                UI.refreshDealsTable();
                UI.refreshDashboard();
            }
        });

        firebaseDB.ref('plots').on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                this.plots = Object.values(data);
                UI.refreshPlotsTable();
                UI.refreshMap();
                UI.refreshDashboard();
            }
        });
    },

    saveToFirebase() {
        if (!firebaseDB) return;
        
        // Convert arrays to objects for Firebase
        const cisObj = {};
        this.cis.forEach(item => cisObj[item.id] = item);
        
        const leadsObj = {};
        this.leads.forEach(item => leadsObj[item.id] = item);
        
        const dealsObj = {};
        this.deals.forEach(item => dealsObj[item.id] = item);
        
        const plotsObj = {};
        this.plots.forEach(item => plotsObj[item.id] = item);

        firebaseDB.ref().update({
            cis: cisObj,
            leads: leadsObj,
            deals: dealsObj,
            plots: plotsObj
        });
    },

    loadFromStorage() {
        const data = localStorage.getItem('aiplot_data');
        if (data) {
            const parsed = JSON.parse(data);
            this.cis = parsed.cis || [];
            this.leads = parsed.leads || [];
            this.deals = parsed.deals || [];
            this.plots = parsed.plots || [];
            this.activities = parsed.activities || [];
        }
    },

    saveToStorage() {
        const data = {
            cis: this.cis,
            leads: this.leads,
            deals: this.deals,
            plots: this.plots,
            activities: this.activities
        };
        localStorage.setItem('aiplot_data', JSON.stringify(data));
        
        // Also sync to Firebase for real-time collaboration
        this.saveToFirebase();
    },

    seedSampleData() {
        // Sample CIS records
        this.cis = [
            { id: 'CIS-001', date: '2024-01-15', name: 'Ahmed Hassan', phone: '+971501234567', email: 'ahmed@example.com', nationality: 'UAE', budget: 2500000, plotType: 'Residential', location: 'Dubai Marina', source: 'Website', status: 'Active', notes: 'Interested in 3BR apartment', createLead: 'YES', leadId: 'LEAD-001', conversionDate: '2024-01-15' },
            { id: 'CIS-002', date: '2024-01-18', name: 'Sarah Johnson', phone: '+971502345678', email: 'sarah@example.com', nationality: 'UK', budget: 1800000, plotType: 'Commercial', location: 'Business Bay', source: 'Referral', status: 'Active', notes: 'Looking for office space', createLead: 'YES', leadId: 'LEAD-002', conversionDate: '2024-01-18' },
            { id: 'CIS-003', date: '2024-01-20', name: 'Mohammed Ali', phone: '+971503456789', email: 'mohammed@example.com', nationality: 'Egypt', budget: 3200000, plotType: 'Residential', location: 'Palm Jumeirah', source: 'Walk-in', status: 'New', notes: 'VIP client', createLead: '', leadId: '', conversionDate: '' }
        ];

        // Sample Leads
        this.leads = [
            { id: 'LEAD-001', cisId: 'CIS-001', date: '2024-01-15', name: 'Ahmed Hassan', phone: '+971501234567', email: 'ahmed@example.com', nationality: 'UAE', budget: 2500000, plotType: 'Residential', location: 'Dubai Marina', source: 'Website', status: 'Converted to Deal', priority: 'High', assignedTo: 'John Smith', notes: 'Interested in 3BR apartment', lastContact: '2024-01-20', daysSinceContact: 5, makeDeal: 'YES', dealId: 'DEAL-001' },
            { id: 'LEAD-002', cisId: 'CIS-002', date: '2024-01-18', name: 'Sarah Johnson', phone: '+971502345678', email: 'sarah@example.com', nationality: 'UK', budget: 1800000, plotType: 'Commercial', location: 'Business Bay', source: 'Referral', status: 'Hot', priority: 'High', assignedTo: 'Emma Wilson', notes: 'Looking for office space', lastContact: '2024-01-19', daysSinceContact: 6, makeDeal: '', dealId: '' }
        ];

        // Sample Deals
        this.deals = [
            { id: 'DEAL-001', leadId: 'LEAD-001', cisId: 'CIS-001', date: '2024-01-22', clientName: 'Ahmed Hassan', phone: '+971501234567', email: 'ahmed@example.com', plotId: 'PLOT-001', plotType: 'Residential', location: 'Dubai Marina', area: 150, priceSqm: 15000, totalPrice: 2250000, discount: 5, finalPrice: 2137500, downPaymentPct: 20, downPayment: 427500, months: 60, monthly: 28475, status: 'Active', agent: 'John Smith', commissionPct: 2, commission: 42750, notes: 'Premium client', contractDate: '2024-01-25', deliveryDate: '2026-01-25' }
        ];

        // Sample Plots with coordinates (Dubai area)
        this.plots = [
            { id: 'PLOT-001', plotNo: 'A-101', development: 'Marina Towers', zone: 'A', plotType: 'Residential', zoning: 'R-1', size: 150, view: 'Sea View', status: 'Reserved', handoverDate: '2026-01-01', website: 'https://example.com/marina', image: '', linkedDeal: 'DEAL-001', docsFolder: '', photosFolder: '', notes: 'Premium unit', createdDate: '2024-01-01', createdBy: 'Admin', modifiedDate: '2024-01-22', modifiedBy: 'Admin', lat: 25.0772, lng: 55.1334 },
            { id: 'PLOT-002', plotNo: 'B-205', development: 'Business Hub', zone: 'B', plotType: 'Commercial', zoning: 'C-1', size: 200, view: 'City View', status: 'Available', handoverDate: '2025-06-01', website: '', image: '', linkedDeal: '', docsFolder: '', photosFolder: '', notes: 'Corner office', createdDate: '2024-01-01', createdBy: 'Admin', modifiedDate: '', modifiedBy: '', lat: 25.1853, lng: 55.2616 },
            { id: 'PLOT-003', plotNo: 'C-301', development: 'Palm Residences', zone: 'C', plotType: 'Residential', zoning: 'R-2', size: 300, view: 'Garden View', status: 'Available', handoverDate: '2025-12-01', website: '', image: '', linkedDeal: '', docsFolder: '', photosFolder: '', notes: 'Villa unit', createdDate: '2024-01-01', createdBy: 'Admin', modifiedDate: '', modifiedBy: '', lat: 25.1124, lng: 55.1390 },
            { id: 'PLOT-004', plotNo: 'D-102', development: 'Downtown Plaza', zone: 'D', plotType: 'Commercial', zoning: 'C-2', size: 250, view: 'Burj View', status: 'Sold', handoverDate: '2025-03-01', website: '', image: '', linkedDeal: '', docsFolder: '', photosFolder: '', notes: 'Retail space', createdDate: '2024-01-01', createdBy: 'Admin', modifiedDate: '', modifiedBy: '', lat: 25.1972, lng: 55.2744 },
            { id: 'PLOT-005', plotNo: 'E-501', development: 'JBR Walk', zone: 'E', plotType: 'Residential', zoning: 'R-3', size: 180, view: 'Marina View', status: 'Available', handoverDate: '2025-09-01', website: '', image: '', linkedDeal: '', docsFolder: '', photosFolder: '', notes: 'Beach access', createdDate: '2024-01-01', createdBy: 'Admin', modifiedDate: '', modifiedBy: '', lat: 25.0777, lng: 55.1406 }
        ];

        this.activities = [
            { type: 'cis', title: 'New CIS created', description: 'CIS-001 - Ahmed Hassan', time: '2024-01-15 10:30' },
            { type: 'lead', title: 'Lead converted', description: 'LEAD-001 from CIS-001', time: '2024-01-15 11:00' },
            { type: 'deal', title: 'Deal created', description: 'DEAL-001 - AED 2,137,500', time: '2024-01-22 14:00' },
            { type: 'plot', title: 'Plot reserved', description: 'PLOT-001 linked to DEAL-001', time: '2024-01-22 14:30' }
        ];

        this.saveToStorage();
    },

    // Repair broken CIS<->Lead links caused by old bug that wiped leadId on CIS edit
    repairDataLinks() {
        let repaired = false;
        this.leads.forEach(lead => {
            if (lead.cisId) {
                const cis = this.cis.find(c => c.id === lead.cisId);
                if (cis && cis.leadId !== lead.id) {
                    cis.leadId = lead.id;
                    if (!cis.conversionDate) cis.conversionDate = lead.date;
                    repaired = true;
                }
            }
        });
        if (repaired) this.saveToStorage();
    },

    // CIS Operations
    getNextCISId() {
        const maxId = this.cis.reduce((max, cis) => {
            const match = cis.id.match(/CIS-(\d+)/);
            return match ? Math.max(max, parseInt(match[1])) : max;
        }, 0);
        return `CIS-${String(maxId + 1).padStart(3, '0')}`;
    },

    addCIS(data) {
        const newCIS = { ...data, id: this.getNextCISId() };
        this.cis.push(newCIS);
        this.addActivity('cis', 'New CIS created', `${newCIS.id} - ${newCIS.name}`);
        this.saveToStorage();
        return newCIS;
    },

    updateCIS(id, data) {
        const index = this.cis.findIndex(c => c.id === id);
        if (index !== -1) {
            this.cis[index] = { ...this.cis[index], ...data };
            this.saveToStorage();
            return this.cis[index];
        }
        return null;
    },

    deleteCIS(id) {
        this.cis = this.cis.filter(c => c.id !== id);
        this.saveToStorage();
    },

    // Lead Operations
    getNextLeadId() {
        const maxId = this.leads.reduce((max, lead) => {
            const match = lead.id.match(/LEAD-(\d+)/);
            return match ? Math.max(max, parseInt(match[1])) : max;
        }, 0);
        return `LEAD-${String(maxId + 1).padStart(3, '0')}`;
    },

    addLead(data) {
        const newLead = { ...data, id: this.getNextLeadId() };
        this.leads.push(newLead);
        this.addActivity('lead', 'New Lead created', `${newLead.id} - ${newLead.name}`);
        this.saveToStorage();
        return newLead;
    },

    updateLead(id, data) {
        const index = this.leads.findIndex(l => l.id === id);
        if (index !== -1) {
            this.leads[index] = { ...this.leads[index], ...data };
            this.saveToStorage();
            return this.leads[index];
        }
        return null;
    },

    deleteLead(id) {
        this.leads = this.leads.filter(l => l.id !== id);
        this.saveToStorage();
    },

    // Deal Operations
    getNextDealId() {
        const maxId = this.deals.reduce((max, deal) => {
            const match = deal.id.match(/DEAL-(\d+)/);
            return match ? Math.max(max, parseInt(match[1])) : max;
        }, 0);
        return `DEAL-${String(maxId + 1).padStart(3, '0')}`;
    },

    addDeal(data) {
        const newDeal = { ...data, id: this.getNextDealId() };
        this.deals.push(newDeal);
        this.addActivity('deal', 'New Deal created', `${newDeal.id} - ${newDeal.clientName}`);
        this.saveToStorage();
        return newDeal;
    },

    updateDeal(id, data) {
        const index = this.deals.findIndex(d => d.id === id);
        if (index !== -1) {
            this.deals[index] = { ...this.deals[index], ...data };
            this.saveToStorage();
            return this.deals[index];
        }
        return null;
    },

    deleteDeal(id) {
        this.deals = this.deals.filter(d => d.id !== id);
        this.saveToStorage();
    },

    // Plot Operations
    getNextPlotId() {
        const maxId = this.plots.reduce((max, plot) => {
            const match = plot.id.match(/PLOT-(\d+)/);
            return match ? Math.max(max, parseInt(match[1])) : max;
        }, 0);
        return `PLOT-${String(maxId + 1).padStart(3, '0')}`;
    },

    addPlot(data) {
        const newPlot = { ...data, id: this.getNextPlotId() };
        this.plots.push(newPlot);
        this.addActivity('plot', 'New Plot added', `${newPlot.id} - ${newPlot.plotNo}`);
        this.saveToStorage();
        return newPlot;
    },

    updatePlot(id, data) {
        const index = this.plots.findIndex(p => p.id === id);
        if (index !== -1) {
            this.plots[index] = { ...this.plots[index], ...data };
            this.saveToStorage();
            return this.plots[index];
        }
        return null;
    },

    deletePlot(id) {
        this.plots = this.plots.filter(p => p.id !== id);
        this.saveToStorage();
    },

    // Activity Log
    addActivity(type, title, description) {
        const now = new Date();
        const time = `${now.toISOString().split('T')[0]} ${now.toTimeString().slice(0, 5)}`;
        this.activities.unshift({ type, title, description, time });
        if (this.activities.length > 50) this.activities.pop();
        this.saveToStorage();
    },

    // Statistics
    getStats() {
        return {
            totalCIS: this.cis.length,
            totalLeads: this.leads.length,
            totalDeals: this.deals.length,
            activeDeals: this.deals.filter(d => d.status === 'Active').length,
            totalPlots: this.plots.length,
            availablePlots: this.plots.filter(p => p.status === 'Available').length
        };
    }
};

// ============================================================================
// UI Controller
// ============================================================================

const UI = {
    currentPage: 'dashboard',
    map: null,
    mapMarkers: [],

    init() {
        this.setupNavigation();
        this.setupEventListeners();
        this.setDefaultDates();
        this.refreshAll();
        this.initMap();
    },

    initMap() {
        // Wait for DOM to be ready
        setTimeout(() => {
            const mapContainer = document.getElementById('plots-map');
            if (!mapContainer) return;

            // Initialize Leaflet map centered on Dubai
            this.map = L.map('plots-map').setView([25.1254, 55.1800], 11);

            // Add dark-themed tile layer
            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles &copy; Esri',
                maxZoom: 19
            }).addTo(this.map);

            this.renderPlotMarkers();
        }, 100);
    },

    renderPlotMarkers() {
        if (!this.map) return;

        // Clear existing markers
        this.mapMarkers.forEach(marker => this.map.removeLayer(marker));
        this.mapMarkers = [];

        // Add markers for each plot with coordinates
        DataStore.plots.forEach(plot => {
            if (plot.lat && plot.lng) {
                const colorClass = plot.status.toLowerCase();
                const iconHtml = `<div class="marker-pin ${colorClass}">${plot.plotNo}</div>`;

                const customIcon = L.divIcon({
                    className: 'custom-marker',
                    html: iconHtml,
                    iconSize: [36, 42],
                    iconAnchor: [18, 42],
                    popupAnchor: [0, -42]
                });

                const marker = L.marker([plot.lat, plot.lng], { icon: customIcon })
                    .addTo(this.map)
                    .bindPopup(this.createPlotPopup(plot));

                this.mapMarkers.push(marker);
            }
        });
    },

    createPlotPopup(plot) {
        const deal = DataStore.deals.find(d => d.plotId === plot.id);
        return `
            <h4>${plot.id} - ${plot.plotNo}</h4>
            <p><strong>Development:</strong> ${plot.development}</p>
            <p><strong>Type:</strong> ${plot.plotType}</p>
            <p><strong>Size:</strong> ${plot.size} m²</p>
            <p><strong>View:</strong> ${plot.view}</p>
            <p><strong>Status:</strong> <span style="color: ${this.getStatusColor(plot.status)}">${plot.status}</span></p>
            ${deal ? `<p><strong>Deal:</strong> ${deal.id}</p><p><strong>Client:</strong> ${deal.clientName}</p>` : ''}
            ${plot.linkedDeal ? `<p><strong>Linked Deal:</strong> ${plot.linkedDeal}</p>` : ''}
        `;
    },

    getStatusColor(status) {
        const colors = {
            'Available': '#10b981',
            'Reserved': '#f59e0b',
            'Sold': '#ef4444'
        };
        return colors[status] || '#94a3b8';
    },

    refreshMap() {
        this.renderPlotMarkers();
    },

    setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                this.navigateTo(page);
            });
        });
    },

    setupEventListeners() {
        // Global search is handled by oninput="performGlobalSearch(this.value)" in HTML
        // No duplicate listener needed here
    },

    setDefaultDates() {
        const today = new Date().toISOString().split('T')[0];
        document.querySelectorAll('.date-picker').forEach(input => {
            if (!input.value) input.value = today;
        });
    },

    navigateTo(page) {
        // Update nav active state
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        // Update page visibility
        document.querySelectorAll('.page').forEach(p => {
            p.classList.toggle('active', p.id === `${page}-page`);
        });
        
        // Update navigation box active state
        document.querySelectorAll('.nav-box-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('onclick') && item.getAttribute('onclick').includes(`'${page}'`)) {
                item.classList.add('active');
            }
        });

        // Update header title
        const titles = {
            dashboard: 'Dashboard',
            cis: 'Customer Information System',
            leads: 'Lead Management',
            deals: 'Deal Management',
            plots: 'Plot Management',
            followup: 'Follow-up Schedule',
            admin: 'Admin Panel',
            'agent-portal': 'Agent Portal'
        };
        document.getElementById('page-title').textContent = titles[page] || page;

        this.currentPage = page;

        // Refresh page data
        if (page === 'dashboard') this.refreshDashboard();
        else if (page === 'cis') this.refreshCISTable(globalSearchFilter ? globalSearchFilter.cis : null);
        else if (page === 'leads') this.refreshLeadsTable(globalSearchFilter ? globalSearchFilter.leads : null);
        else if (page === 'deals') this.refreshDealsTable(globalSearchFilter ? globalSearchFilter.deals : null);
        else if (page === 'plots') this.refreshPlotsTable(globalSearchFilter ? globalSearchFilter.plots : null);
        else if (page === 'followup') this.refreshFollowUpTable();
        else if (page === 'agent-portal') {
            Auth.loadAgentDashboard();
            // Ensure Add Agent button is visible for admins
            const addAgentBtn = document.getElementById('agent-portal-add-agent-btn');
            if (addAgentBtn && Auth.currentUser && Auth.currentUser.role === 'admin') {
                addAgentBtn.style.display = 'block';
            }
        }
        else if (page === 'admin') { refreshAdminUsersTable(); if (typeof refreshPendingApprovals === 'function') refreshPendingApprovals(); }
    },

    refreshAll() {
        this.refreshDashboard();
        this.refreshCISTable();
        this.refreshLeadsTable();
        this.refreshDealsTable();
        this.refreshPlotsTable();
        this.refreshFollowUpTable();
    },

    // Dashboard
    refreshDashboard() {
        const stats = DataStore.getStats();
        document.getElementById('kpi-cis').textContent = stats.totalCIS;
        document.getElementById('kpi-leads').textContent = stats.totalLeads;
        document.getElementById('kpi-deals').textContent = stats.totalDeals;
        document.getElementById('kpi-active').textContent = stats.activeDeals;
        document.getElementById('kpi-plots').textContent = stats.totalPlots;
        document.getElementById('kpi-available').textContent = stats.availablePlots;

        // Refresh map markers
        this.refreshMap();

        // Generate AI Insights
        this.generateAIInsights();

        // Update Hero Stats
        this.updateHeroStats();

        // Activity list
        const activityList = document.getElementById('activity-list');
        activityList.innerHTML = DataStore.activities.slice(0, 10).map(act => `
            <div class="activity-item">
                <div class="activity-icon ${act.type}">
                    <i class="fas fa-${this.getActivityIcon(act.type)}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${act.title}</div>
                    <div class="activity-description">${act.description}</div>
                    <div class="activity-time">${act.time}</div>
                </div>
            </div>
        `).join('') || '<div class="empty-state"><p>No recent activity</p></div>';

        // Follow-ups
        this.renderDashboardFollowUps();
    },

    // AI Insights Generation
    generateAIInsights() {
        const insightsPanel = document.getElementById('ai-insights-panel');
        const insightsGrid = document.getElementById('ai-insights-grid');
        
        if (!insightsPanel || !insightsGrid) return;
        
        const insights = [];
        
        // 1. Hot Leads Analysis
        const recentLeads = DataStore.leads.filter(l => {
            const daysSinceCreated = Math.floor((Date.now() - new Date(l.date).getTime()) / (1000 * 60 * 60 * 24));
            return daysSinceCreated <= 7 && l.status === 'New';
        });
        
        if (recentLeads.length > 0) {
            insights.push({
                priority: 'high',
                badge: 'hot',
                icon: '🔥',
                title: `${recentLeads.length} Hot Leads Need Attention`,
                description: `You have ${recentLeads.length} new leads created in the last 7 days. Contact them now to increase conversion rates by 65%.`,
                action: 'View Hot Leads',
                actionFn: () => UI.navigateTo('leads')
            });
        }
        
        // 2. Follow-up Overdue
        const overdueFollowUps = DataStore.leads.filter(l => {
            if (!l.lastContact) return false;
            const daysSinceContact = Math.floor((Date.now() - new Date(l.lastContact).getTime()) / (1000 * 60 * 60 * 24));
            return daysSinceContact > 14;
        });
        
        if (overdueFollowUps.length > 0) {
            insights.push({
                priority: 'high',
                badge: 'hot',
                icon: '⏰',
                title: `${overdueFollowUps.length} Leads Need Follow-up`,
                description: `These leads haven't been contacted in over 2 weeks. Re-engage now before they go cold.`,
                action: 'Follow Up Now',
                actionFn: () => UI.navigateTo('followup')
            });
        }
        
        // 3. High-Value Opportunities
        const highValueDeals = DataStore.deals.filter(d => {
            const totalPrice = parseFloat(d.totalPrice) || 0;
            return totalPrice > 1000000 && d.status === 'Active';
        });
        
        if (highValueDeals.length > 0) {
            const totalValue = highValueDeals.reduce((sum, d) => sum + (parseFloat(d.totalPrice) || 0), 0);
            insights.push({
                priority: 'medium',
                badge: 'warm',
                icon: '💰',
                title: `${highValueDeals.length} High-Value Deals Active`,
                description: `Total pipeline value: AED ${totalValue.toLocaleString()}. Focus on closing these premium deals.`,
                action: 'View Deals',
                actionFn: () => UI.navigateTo('deals')
            });
        }
        
        // 4. Available Plots Alert
        const availablePlots = DataStore.plots.filter(p => p.status === 'Available');
        if (availablePlots.length > 10) {
            insights.push({
                priority: 'medium',
                badge: 'warm',
                icon: '🏗️',
                title: `${availablePlots.length} Plots Available`,
                description: `You have ${availablePlots.length} available plots. Consider marketing them to active leads.`,
                action: 'View Plots',
                actionFn: () => UI.navigateTo('plots')
            });
        }
        
        // 5. Conversion Rate Insight
        const totalLeads = DataStore.leads.length;
        const totalDeals = DataStore.deals.length;
        if (totalLeads > 0) {
            const conversionRate = ((totalDeals / totalLeads) * 100).toFixed(1);
            if (conversionRate < 20) {
                insights.push({
                    priority: 'low',
                    badge: 'cool',
                    icon: '📊',
                    title: `Conversion Rate: ${conversionRate}%`,
                    description: `Your conversion rate is below industry average (25-30%). Focus on qualifying leads better.`,
                    action: 'Improve Strategy',
                    actionFn: () => UI.navigateTo('leads')
                });
            } else {
                insights.push({
                    priority: 'low',
                    badge: 'cool',
                    icon: '🎯',
                    title: `Great Conversion Rate: ${conversionRate}%`,
                    description: `Your conversion rate is above average! Keep up the excellent work.`,
                    action: 'View Analytics',
                    actionFn: () => UI.navigateTo('dashboard')
                });
            }
        }
        
        // 6. Unassigned Leads
        const unassignedLeads = DataStore.leads.filter(l => !l.assignedTo || l.assignedTo === '');
        if (unassignedLeads.length > 0) {
            insights.push({
                priority: 'medium',
                badge: 'warm',
                icon: '👤',
                title: `${unassignedLeads.length} Unassigned Leads`,
                description: `These leads need an owner. Assign them to agents for better tracking.`,
                action: 'Assign Now',
                actionFn: () => UI.navigateTo('leads')
            });
        }
        
        // Render insights
        if (insights.length > 0) {
            insightsPanel.style.display = 'block';
            insightsGrid.innerHTML = insights.map(insight => `
                <div class="ai-insight-card ${insight.priority}-priority">
                    <span class="ai-insight-badge ${insight.badge}">${insight.badge}</span>
                    <div class="ai-insight-icon">${insight.icon}</div>
                    <h4 class="ai-insight-title">${insight.title}</h4>
                    <p class="ai-insight-description">${insight.description}</p>
                    <button class="ai-insight-action" onclick="(${insight.actionFn.toString()})()">
                        <i class="fas fa-arrow-right"></i> ${insight.action}
                    </button>
                </div>
            `).join('');
        } else {
            insightsPanel.style.display = 'none';
        }
    },

    getActivityIcon(type) {
        const icons = { cis: 'id-card', lead: 'users', deal: 'handshake', plot: 'map-marked-alt' };
        return icons[type] || 'info-circle';
    },

    renderDashboardFollowUps() {
        const container = document.getElementById('dashboard-followups');
        const followUps = this.calculateFollowUps().slice(0, 5);

        if (followUps.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No follow-ups due</p></div>';
            return;
        }

        container.innerHTML = followUps.map(fu => `
            <div class="followup-item">
                <div class="activity-icon ${fu.statusClass}">
                    <i class="fas fa-${fu.status === 'OVERDUE' ? 'exclamation-circle' : 'clock'}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${fu.clientName}</div>
                    <div class="activity-description">
                        <span class="status-indicator status-${fu.statusClass.toLowerCase()}">${fu.status}</span>
                        - Due: ${fu.dueDate}
                    </div>
                    <div class="activity-time">Agent: ${fu.agent}</div>
                </div>
            </div>
        `).join('');
    },

    // CIS Table
    refreshCISTable(data) {
        const source = data || DataStore.cis;
        const tbody = document.getElementById('cis-tbody');
        
        // Find plots linked to this CIS
        const getPlotLink = (cisId) => {
            const plotAsOwner = DataStore.plots.find(p => p.ownerCisId === cisId);
            const plotAsAgent = DataStore.plots.find(p => p.agentCisId === cisId);
            
            if (plotAsOwner && plotAsAgent) {
                return `<span class="badge badge-converted" title="Owner: ${plotAsOwner.id}, Agent: ${plotAsAgent.id}">🏠 ${plotAsOwner.id} + ${plotAsAgent.id}</span>`;
            } else if (plotAsOwner) {
                return `<span class="badge badge-success" title="Owner of ${plotAsOwner.id}">🏠 Owner: ${plotAsOwner.id}</span>`;
            } else if (plotAsAgent) {
                return `<span class="badge badge-info" title="Agent for ${plotAsAgent.id}">🤝 Agent: ${plotAsAgent.id}</span>`;
            }
            return '-';
        };
        
        tbody.innerHTML = source.map(cis => `
            <tr>
                <td><input type="checkbox" data-id="${cis.id}" onchange="toggleItemSelection('cis', '${cis.id}', this.checked)"></td>
                <td><span class="badge badge-new">${cis.id}</span></td>
                <td>${this.formatDate(cis.date)}</td>
                <td><strong>${cis.name}</strong></td>
                <td>${cis.phone || '-'}</td>
                <td>${cis.email || '-'}</td>
                <td>${cis.nationality || '-'}</td>
                <td>${cis.budget ? 'AED ' + this.formatNumber(cis.budget) : '-'}</td>
                <td>${cis.plotType || '-'}</td>
                <td>${cis.location || '-'}</td>
                <td>${cis.source || '-'}</td>
                <td><span class="badge badge-${cis.status.toLowerCase()}">${cis.status}</span></td>
                <td>${getPlotLink(cis.id)}</td>
                <td>${cis.createLead === 'YES' ? '<i class="fas fa-check text-success"></i>' : '-'}</td>
                <td>${cis.leadId ? `<span class="badge badge-converted">${cis.leadId}</span>` : '-'}</td>
                <td>
                    <button class="btn-send-to" onclick="openSendToModal('cis', '${cis.id}', '${cis.name}')" title="Send To">
                        <i class="fas fa-paper-plane"></i> Send
                    </button>
                </td>
                <td>
                    <div class="comm-buttons">
                        <button class="btn-email" onclick="openEmailModal('${cis.email || ''}', 'Follow-up - ${cis.name}', '')" title="Send Email">
                            <i class="fas fa-envelope"></i>
                        </button>
                        <button class="btn-whatsapp" onclick="sendWhatsApp('${cis.phone}', 'Hello ${cis.name}, this is AI Plot Team following up on your inquiry.')" title="Send WhatsApp">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                        <button class="btn-video" onclick="startVideoCallCIS('${cis.phone}', '${cis.name}')" title="Start Video Call">
                            <i class="fas fa-video"></i>
                        </button>
                        <button class="btn-action edit" onclick="editCIS('${cis.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action delete" onclick="deleteCIS('${cis.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="15" class="empty-state"><p>No CIS records found</p></td></tr>';
        
        // Reset select-all checkbox
        const selectAll = document.getElementById('select-all-cis');
        if (selectAll) selectAll.checked = false;
    },

    // Leads Table
    refreshLeadsTable(data) {
        const source = data || DataStore.leads;
        const tbody = document.getElementById('leads-tbody');
        tbody.innerHTML = source.map(lead => `
            <tr>
                <td><input type="checkbox" data-id="${lead.id}" onchange="toggleItemSelection('leads', '${lead.id}', this.checked)"></td>
                <td><span class="badge badge-${lead.status === 'Converted to Deal' ? 'converted' : 'new'}">${lead.id}</span></td>
                <td>${lead.cisId || '-'}</td>
                <td>${this.formatDate(lead.date)}</td>
                <td><strong>${lead.name}</strong></td>
                <td>${lead.phone || '-'}</td>
                <td>${lead.email || '-'}</td>
                <td>${lead.nationality || '-'}</td>
                <td>${lead.budget ? 'AED ' + this.formatNumber(lead.budget) : '-'}</td>
                <td>${lead.plotType || '-'}</td>
                <td>${lead.location || '-'}</td>
                <td>${lead.source || '-'}</td>
                <td><span class="badge badge-${lead.status.toLowerCase().replace(/\s+/g, '-')}">${lead.status}</span></td>
                <td><span class="badge badge-priority-${lead.priority.toLowerCase()}">${lead.priority}</span></td>
                <td>${lead.assignedTo || '-'}</td>
                <td>${this.formatDate(lead.lastContact)}</td>
                <td>${lead.daysSinceContact || 0}</td>
                <td>${lead.makeDeal === 'YES' ? '<i class="fas fa-check text-success"></i>' : '-'}</td>
                <td>${lead.dealId ? `<span class="badge badge-converted">${lead.dealId}</span>` : '-'}</td>
                <td>
                    <button class="btn-send-to" onclick="openSendToModal('leads', '${lead.id}', '${lead.name}')" title="Send To">
                        <i class="fas fa-paper-plane"></i> Send
                    </button>
                </td>
                <td>
                    <div class="comm-buttons">
                        <button class="btn-email" onclick="openEmailModal('${lead.email || ''}', 'Follow-up - ${lead.name}', '')" title="Send Email">
                            <i class="fas fa-envelope"></i>
                        </button>
                        <button class="btn-whatsapp" onclick="sendWhatsAppLead('${lead.id}')" title="Send WhatsApp">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                        <button class="btn-video" onclick="startVideoCallLead('${lead.id}')" title="Start Video Call">
                            <i class="fas fa-video"></i>
                        </button>
                        <button class="btn-action edit" onclick="editLead('${lead.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action delete" onclick="deleteLead('${lead.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="btn-icon" onclick="openFeasibilityWithData(DataStore.leads.find(l => l.id === '${lead.id}'))" title="Open Feasibility Site" style="color:#667eea;">
                            <i class="fas fa-external-link-alt"></i>
                        </button>
                        <button class="btn-icon" onclick="openFeasibilityTemplate(DataStore.leads.find(l => l.id === '${lead.id}'))" title="Generate Feasibility PDF" style="color:#764ba2;">
                            <i class="fas fa-file-pdf"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="19" class="empty-state"><p>No leads found</p></td></tr>';
        
        // Reset select-all checkbox
        const selectAll = document.getElementById('select-all-leads');
        if (selectAll) selectAll.checked = false;
    },

    // Deals Table
    refreshDealsTable(data) {
        const source = data || DataStore.deals;
        const tbody = document.getElementById('deals-tbody');
        tbody.innerHTML = source.map(deal => `
            <tr>
                <td><input type="checkbox" data-id="${deal.id}" onchange="toggleItemSelection('deals', '${deal.id}', this.checked)"></td>
                <td><span class="badge badge-active">${deal.id}</span></td>
                <td>${deal.leadId || '-'}</td>
                <td>${deal.cisId || '-'}</td>
                <td>${this.formatDate(deal.date)}</td>
                <td><strong>${deal.clientName}</strong></td>
                <td>${deal.phone || '-'}</td>
                <td>${deal.email || '-'}</td>
                <td>${deal.plotId || '-'}</td>
                <td>${deal.plotType || '-'}</td>
                <td>${deal.location || '-'}</td>
                <td>${deal.area || 0}</td>
                <td>${deal.priceSqm ? 'AED ' + this.formatNumber(deal.priceSqm) : '-'}</td>
                <td><strong>AED ${this.formatNumber(deal.totalPrice)}</strong></td>
                <td>${deal.discount}%</td>
                <td><strong class="text-success">AED ${this.formatNumber(deal.finalPrice)}</strong></td>
                <td>${deal.downPaymentPct}%</td>
                <td>AED ${this.formatNumber(deal.downPayment)}</td>
                <td>${deal.months}</td>
                <td>AED ${this.formatNumber(deal.monthly)}</td>
                <td><span class="badge badge-${deal.status.toLowerCase()}">${deal.status}</span></td>
                <td>${deal.agent || '-'}</td>
                <td>${deal.commissionPct}%</td>
                <td>AED ${this.formatNumber(deal.commission)}</td>
                <td>
                    <button class="btn-send-to" onclick="openSendToModal('deals', '${deal.id}', '${deal.clientName}')" title="Send To">
                        <i class="fas fa-paper-plane"></i> Send
                    </button>
                </td>
                <td>
                    <div class="comm-buttons">
                        <button class="btn-email" onclick="openEmailModal('${deal.email || ''}', 'Deal Update - ${deal.id}', '')" title="Send Email">
                            <i class="fas fa-envelope"></i>
                        </button>
                        <button class="btn-whatsapp" onclick="sendWhatsAppDeal('${deal.id}')" title="Send WhatsApp">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                        <button class="btn-video" onclick="startVideoCallDeal('${deal.id}')" title="Start Video Call">
                            <i class="fas fa-video"></i>
                        </button>
                        <button class="btn-action edit" onclick="editDeal('${deal.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action delete" onclick="deleteDeal('${deal.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="24" class="empty-state"><p>No deals found</p></td></tr>';
        
        // Reset select-all checkbox
        const selectAll = document.getElementById('select-all-deals');
        if (selectAll) selectAll.checked = false;
    },

    // Plots Table
    refreshPlotsTable(data) {
        const source = data || DataStore.plots;
        const tbody = document.getElementById('plots-tbody');
        tbody.innerHTML = source.map(plot => `
            <tr>
                <td><input type="checkbox" data-id="${plot.id}" onchange="toggleItemSelection('plots', '${plot.id}', this.checked)"></td>
                <td><span class="badge badge-${plot.status.toLowerCase()}">${plot.id}</span></td>
                <td><strong>${plot.plotNo}</strong></td>
                <td>${plot.city || '-'}</td>
                <td>${plot.district || '-'}</td>
                <td>${plot.development || '-'}</td>
                <td>${plot.zone || '-'}</td>
                <td>${plot.plotType || '-'}</td>
                <td>${plot.plotFor || '-'}</td>
                <td>${plot.zoning || '-'}</td>
                <td>${plot.gfa || '-'}</td>
                <td>${plot.nfa || '-'}</td>
                <td>${plot.bua || '-'}</td>
                <td>${plot.far || '-'}</td>
                <td>${plot.height || '-'}</td>
                <td>${plot.size || '-'}</td>
                <td>${plot.view || '-'}</td>
                <td><span class="badge badge-${plot.status.toLowerCase()}">${plot.status}</span></td>
                <td>${this.formatDate(plot.handoverDate)}</td>
                <td>${FileManager.renderFileBadges(plot)}</td>
                <td>
                    <button class="btn-send-to" onclick="openSendToModal('plots', '${plot.id}', '${plot.plotNo}')" title="Send To">
                        <i class="fas fa-paper-plane"></i> Send
                    </button>
                </td>
                <td>
                    <button class="btn-action edit" onclick="editPlot('${plot.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action delete" onclick="deletePlot('${plot.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="21" class="empty-state"><p>No plots found</p></td></tr>';
        
        // Reset select-all checkbox
        const selectAll = document.getElementById('select-all-plots');
        if (selectAll) selectAll.checked = false;
        updateBulkDeleteButton('plots');
    },

    // Follow-up Table
    refreshFollowUpTable() {
        const tbody = document.getElementById('followup-tbody');
        const followUps = this.calculateFollowUps();

        tbody.innerHTML = followUps.map(fu => `
            <tr>
                <td><span class="status-indicator status-${fu.statusClass.toLowerCase()}">${fu.status}</span></td>
                <td>${fu.dueDate}</td>
                <td>${fu.daysOverdue > 0 ? fu.daysOverdue : 0}</td>
                <td><strong>${fu.clientName}</strong></td>
                <td>${fu.leadId}</td>
                <td>${fu.agent}</td>
                <td>${fu.method}</td>
                <td>${fu.nextAction}</td>
                <td><span class="badge badge-priority-${fu.risk.toLowerCase() === 'high' ? 'high' : 'medium'}">${fu.risk}</span></td>
                <td><span class="badge badge-${fu.leadStatus.toLowerCase().replace(/\s+/g, '-')}">${fu.leadStatus}</span></td>
                <td>${fu.phone}</td>
                <td>
                    <div class="comm-buttons">
                        <button class="btn-email" onclick="openEmailModal('', 'Follow-up - ${fu.clientName}', '')" title="Send Email">
                            <i class="fas fa-envelope"></i>
                        </button>
                        <button class="btn-whatsapp" onclick="sendWhatsApp('${fu.phone}', 'Hello ${fu.clientName}, following up on your inquiry.')" title="Send WhatsApp">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                        <button class="btn-video" onclick="startVideoCall('${fu.clientName}', '${fu.phone}')" title="Start Video Call">
                            <i class="fas fa-video"></i>
                        </button>
                        <button class="btn-action edit" onclick="markContacted('${fu.leadId}')" title="Mark Contacted">
                            <i class="fas fa-phone"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="12" class="empty-state"><p>No follow-ups due</p></td></tr>';
    },

    calculateFollowUps() {
        const followUps = [];
        const today = new Date();

        DataStore.leads.forEach(lead => {
            if (lead.status === 'Converted to Deal') return;
            if (!lead.lastContact) return;

            const lastContact = new Date(lead.lastContact);
            const daysSince = Math.floor((today - lastContact) / (1000 * 60 * 60 * 24));

            if (daysSince >= 3) {
                const dueDate = new Date(lastContact);
                dueDate.setDate(dueDate.getDate() + 3);

                let status, statusClass, risk;
                if (daysSince > 7) {
                    status = 'OVERDUE';
                    statusClass = 'overdue';
                    risk = 'HIGH';
                } else if (daysSince > 3) {
                    status = 'DUE';
                    statusClass = 'due';
                    risk = 'MED';
                } else {
                    status = 'OK';
                    statusClass = 'ok';
                    risk = 'LOW';
                }

                followUps.push({
                    status,
                    statusClass,
                    dueDate: dueDate.toISOString().split('T')[0],
                    daysOverdue: daysSince - 3,
                    clientName: lead.name,
                    leadId: lead.id,
                    agent: lead.assignedTo || 'Unassigned',
                    method: 'Call',
                    nextAction: 'Follow up',
                    risk,
                    leadStatus: lead.status,
                    phone: lead.phone || '-'
                });
            }
        });

        return followUps.sort((a, b) => b.daysOverdue - a.daysOverdue);
    },

    // Helpers
    formatDate(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB');
    },

    formatNumber(num) {
        return num.toLocaleString('en-US');
    },

    showToast(message) {
        const toast = document.getElementById('toast');
        document.getElementById('toast-message').textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    },

    handleGlobalSearch(query) {
        // Delegate to the global performGlobalSearch function
        performGlobalSearch(query);
    }
};

// ============================================================================
// Modal Functions
// ============================================================================

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    // Reset form
    const form = document.querySelector(`#${modalId} form`);
    if (form) form.reset();
}

// CIS Functions
function openCISModal() {
    document.getElementById('cis-modal-title').textContent = 'Add New Client';
    document.getElementById('cis-id-hidden').value = '';
    UI.setDefaultDates();
    openModal('cis-modal');
}

function generateCISID() {
    const nameInput = document.getElementById('cis-name');
    if (nameInput.value.trim() && !document.getElementById('cis-id-hidden').value) {
        // ID will be auto-generated on save
    }
}

function toggleCreateLead() {
    const select = document.getElementById('cis-create-lead');
    if (select.value === 'YES') {
        // Will auto-create lead on save
    }
}

function saveCIS() {
    const id = document.getElementById('cis-id-hidden').value;
    const data = {
        date: document.getElementById('cis-date').value,
        name: document.getElementById('cis-name').value,
        phone: document.getElementById('cis-phone').value,
        email: document.getElementById('cis-email').value,
        nationality: document.getElementById('cis-nationality').value,
        budget: parseFloat(document.getElementById('cis-budget').value) || 0,
        plotType: document.getElementById('cis-plot-type').value,
        location: document.getElementById('cis-location').value,
        source: document.getElementById('cis-source').value,
        status: document.getElementById('cis-status').value,
        notes: document.getElementById('cis-notes').value,
        createLead: document.getElementById('cis-create-lead').value,
    };

    // Preserve existing leadId and conversionDate when editing
    if (!id) {
        data.leadId = '';
        data.conversionDate = '';
    }

    if (!data.name) {
        alert('Name is required!');
        return;
    }

    let cis;
    if (id) {
        cis = DataStore.updateCIS(id, data);
        // Sync shared fields to linked lead if one exists
        if (cis && cis.leadId) {
            DataStore.updateLead(cis.leadId, {
                name: cis.name,
                phone: cis.phone,
                email: cis.email,
                nationality: cis.nationality,
                budget: cis.budget,
                plotType: cis.plotType,
                location: cis.location,
                source: cis.source,
                notes: cis.notes
            });
        }
    } else {
        cis = DataStore.addCIS(data);
    }

    // Auto-create lead if requested (only for new records)
    if (data.createLead === 'YES' && cis && !id) {
        createLeadFromCIS(cis);
    }

    closeModal('cis-modal');
    UI.refreshCISTable();
    UI.refreshDashboard();
    UI.showToast(id ? 'Client updated successfully!' : 'Client created successfully!');
}

function createLeadFromCIS(cis) {
    const leadData = {
        cisId: cis.id,
        date: new Date().toISOString().split('T')[0],
        name: cis.name,
        phone: cis.phone,
        email: cis.email,
        nationality: cis.nationality,
        budget: cis.budget,
        plotType: cis.plotType,
        location: cis.location,
        source: cis.source,
        status: 'New',
        priority: 'Medium',
        assignedTo: '',
        notes: cis.notes,
        lastContact: new Date().toISOString().split('T')[0],
        daysSinceContact: 0,
        makeDeal: '',
        dealId: ''
    };

    const lead = DataStore.addLead(leadData);
    DataStore.updateCIS(cis.id, { leadId: lead.id, conversionDate: new Date().toISOString().split('T')[0] });
    UI.showToast(`Lead ${lead.id} auto-created!`);

    // Show feasibility study prompt
    showFeasibilityPrompt(lead);
}

function editCIS(id) {
    const cis = DataStore.cis.find(c => c.id === id);
    if (!cis) return;

    document.getElementById('cis-modal-title').textContent = 'Edit Client';
    document.getElementById('cis-id-hidden').value = cis.id;
    document.getElementById('cis-date').value = cis.date;
    document.getElementById('cis-name').value = cis.name;
    document.getElementById('cis-phone').value = cis.phone;
    document.getElementById('cis-email').value = cis.email;
    document.getElementById('cis-nationality').value = cis.nationality;
    document.getElementById('cis-budget').value = cis.budget;
    document.getElementById('cis-plot-type').value = cis.plotType;
    document.getElementById('cis-location').value = cis.location;
    document.getElementById('cis-source').value = cis.source;
    document.getElementById('cis-status').value = cis.status;
    document.getElementById('cis-notes').value = cis.notes;
    document.getElementById('cis-create-lead').value = '';

    openModal('cis-modal');
}

function deleteCIS(id) {
    if (confirm('Are you sure you want to delete this client?')) {
        DataStore.deleteCIS(id);
        UI.refreshCISTable();
        UI.refreshDashboard();
        UI.showToast('Client deleted successfully!');
    }
}

// Lead Functions
function openLeadModal() {
    document.getElementById('lead-modal-title').textContent = 'Add New Lead';
    document.getElementById('lead-id-hidden').value = '';

    // Populate CIS dropdown
    const cisSelect = document.getElementById('lead-cis-id');
    cisSelect.innerHTML = '<option value="">Select CIS...</option>' +
        DataStore.cis.filter(c => !c.leadId).map(c =>
            `<option value="${c.id}">${c.id} - ${c.name}</option>`
        ).join('');

    UI.setDefaultDates();
    openModal('lead-modal');
}

function autoFillFromCIS() {
    const cisId = document.getElementById('lead-cis-id').value;
    if (!cisId) return;

    const cis = DataStore.cis.find(c => c.id === cisId);
    if (cis) {
        document.getElementById('lead-name').value = cis.name;
        document.getElementById('lead-phone').value = cis.phone;
        document.getElementById('lead-email').value = cis.email;
        document.getElementById('lead-nationality').value = cis.nationality;
        document.getElementById('lead-budget').value = cis.budget;
        document.getElementById('lead-plot-type').value = cis.plotType;
        document.getElementById('lead-location').value = cis.location;
        document.getElementById('lead-source').value = cis.source;
        document.getElementById('lead-notes').value = cis.notes;
    }
}

function toggleMakeDeal() {
    const select = document.getElementById('lead-make-deal');
    if (select.value === 'YES') {
        // Will auto-create deal on save
    }
}

function saveLead() {
    const id = document.getElementById('lead-id-hidden').value;
    const data = {
        cisId: document.getElementById('lead-cis-id').value,
        date: document.getElementById('lead-date').value,
        name: document.getElementById('lead-name').value,
        phone: document.getElementById('lead-phone').value,
        email: document.getElementById('lead-email').value,
        nationality: document.getElementById('lead-nationality').value,
        budget: parseFloat(document.getElementById('lead-budget').value) || 0,
        plotType: document.getElementById('lead-plot-type').value,
        location: document.getElementById('lead-location').value,
        source: document.getElementById('lead-source').value,
        status: document.getElementById('lead-status').value,
        priority: document.getElementById('lead-priority').value,
        assignedTo: document.getElementById('lead-assigned').value,
        notes: document.getElementById('lead-notes').value,
        lastContact: document.getElementById('lead-last-contact').value,
        daysSinceContact: 0,
        makeDeal: document.getElementById('lead-make-deal').value,
        dealId: ''
    };

    if (!data.name) {
        alert('Name is required!');
        return;
    }

    let lead;
    if (id) {
        lead = DataStore.updateLead(id, data);
        // Sync shared fields back to linked CIS if one exists
        if (lead && lead.cisId) {
            DataStore.updateCIS(lead.cisId, {
                name: lead.name,
                phone: lead.phone,
                email: lead.email,
                nationality: lead.nationality,
                budget: lead.budget,
                plotType: lead.plotType,
                location: lead.location,
                source: lead.source,
                notes: lead.notes
            });
        }
        Tracker.addActivity('status_change', `Lead ${lead.id} Updated`, `Status: ${data.status}`, lead.id, 'lead');
    } else {
        lead = DataStore.addLead(data);
        Tracker.addActivity('lead_created', `New Lead Created`, `${data.name} - ${data.plotType}`, lead.id, 'lead');
    }

    // Auto-create deal if requested
    if (data.makeDeal === 'YES' && lead) {
        createDealFromLead(lead);
    }

    closeModal('lead-modal');
    UI.refreshLeadsTable();
    UI.refreshDashboard();
    
    // Refresh agent dashboard if user is an agent
    if (Auth.currentUser && Auth.currentUser.role === 'agent') {
        Auth.loadAgentDashboard();
    }
    
    UI.showToast(id ? 'Lead updated successfully!' : 'Lead created successfully!');

    // Show feasibility study prompt for new leads
    if (!id && lead) {
        showFeasibilityPrompt(lead);
    }
}

function createDealFromLead(lead) {
    const dealData = {
        leadId: lead.id,
        cisId: lead.cisId,
        date: new Date().toISOString().split('T')[0],
        clientName: lead.name,
        phone: lead.phone,
        email: lead.email,
        plotId: '',
        plotType: lead.plotType,
        location: lead.location,
        area: 0,
        priceSqm: 0,
        totalPrice: 0,
        discount: 0,
        finalPrice: 0,
        downPaymentPct: 20,
        downPayment: 0,
        months: 60,
        monthly: 0,
        status: 'Active',
        agent: lead.assignedTo,
        commissionPct: 2,
        commission: 0,
        notes: lead.notes,
        contractDate: new Date().toISOString().split('T')[0],
        deliveryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split('T')[0]
    };

    const deal = DataStore.addDeal(dealData);
    DataStore.updateLead(lead.id, { dealId: deal.id, status: 'Converted to Deal' });
    UI.showToast(`Deal ${deal.id} auto-created!`);
}

function editLead(id) {
    const lead = DataStore.leads.find(l => l.id === id);
    if (!lead) return;

    document.getElementById('lead-modal-title').textContent = 'Edit Lead';
    document.getElementById('lead-id-hidden').value = lead.id;
    document.getElementById('lead-cis-id').value = lead.cisId;
    document.getElementById('lead-name').value = lead.name;
    document.getElementById('lead-date').value = lead.date;
    document.getElementById('lead-phone').value = lead.phone;
    document.getElementById('lead-email').value = lead.email;
    document.getElementById('lead-nationality').value = lead.nationality;
    document.getElementById('lead-budget').value = lead.budget;
    document.getElementById('lead-plot-type').value = lead.plotType;
    document.getElementById('lead-location').value = lead.location;
    document.getElementById('lead-source').value = lead.source;
    document.getElementById('lead-status').value = lead.status;
    document.getElementById('lead-priority').value = lead.priority;
    document.getElementById('lead-assigned').value = lead.assignedTo;
    document.getElementById('lead-notes').value = lead.notes;
    document.getElementById('lead-last-contact').value = lead.lastContact;
    document.getElementById('lead-make-deal').value = '';

    openModal('lead-modal');
}

function deleteLead(id) {
    if (confirm('Are you sure you want to delete this lead?')) {
        DataStore.deleteLead(id);
        UI.refreshLeadsTable();
        UI.refreshDashboard();
        UI.showToast('Lead deleted successfully!');
    }
}

// Deal Functions
function openDealModal() {
    document.getElementById('deal-modal-title').textContent = 'Add New Deal';
    document.getElementById('deal-id-hidden').value = '';

    // Populate Lead dropdown
    const leadSelect = document.getElementById('deal-lead-id');
    leadSelect.innerHTML = '<option value="">Select Lead...</option>' +
        DataStore.leads.filter(l => !l.dealId).map(l =>
            `<option value="${l.id}">${l.id} - ${l.name}</option>`
        ).join('');

    // Populate Plot dropdown
    const plotSelect = document.getElementById('deal-plot-id');
    plotSelect.innerHTML = '<option value="">Select Plot...</option>' +
        DataStore.plots.filter(p => p.status === 'Available').map(p =>
            `<option value="${p.id}">${p.id} - ${p.plotNo}</option>`
        ).join('');

    UI.setDefaultDates();
    openModal('deal-modal');
}

function autoFillFromLead() {
    const leadId = document.getElementById('deal-lead-id').value;
    if (!leadId) return;

    const lead = DataStore.leads.find(l => l.id === leadId);
    if (lead) {
        document.getElementById('deal-client-name').value = lead.name;
        document.getElementById('deal-phone').value = lead.phone;
        document.getElementById('deal-email').value = lead.email;
        document.getElementById('deal-plot-type').value = lead.plotType;
        document.getElementById('deal-location').value = lead.location;
        document.getElementById('deal-agent').value = lead.assignedTo;
        document.getElementById('deal-notes').value = lead.notes;
    }
}

function autoFillFromPlot() {
    const plotId = document.getElementById('deal-plot-id').value;
    if (!plotId) return;

    const plot = DataStore.plots.find(p => p.id === plotId);
    if (plot) {
        document.getElementById('deal-plot-type').value = plot.plotType;
        document.getElementById('deal-location').value = `${plot.development}, ${plot.zone}`;
        document.getElementById('deal-area').value = plot.size;
    }
}

function calculateDealTotals() {
    const area = parseFloat(document.getElementById('deal-area').value) || 0;
    const priceSqm = parseFloat(document.getElementById('deal-price-sqm').value) || 0;
    const discount = parseFloat(document.getElementById('deal-discount').value) || 0;
    const downPaymentPct = parseFloat(document.getElementById('deal-down-payment-pct').value) || 0;
    const months = parseFloat(document.getElementById('deal-months').value) || 0;
    const commissionPct = parseFloat(document.getElementById('deal-commission-pct').value) || 0;

    const totalPrice = area * priceSqm;
    const finalPrice = totalPrice * (1 - discount / 100);
    const downPayment = finalPrice * downPaymentPct / 100;
    const monthly = months > 0 ? (finalPrice - downPayment) / months : 0;
    const commission = finalPrice * commissionPct / 100;

    document.getElementById('deal-total-price').value = 'AED ' + totalPrice.toLocaleString();
    document.getElementById('deal-final-price').value = 'AED ' + finalPrice.toLocaleString();
    document.getElementById('deal-down-payment').value = 'AED ' + downPayment.toLocaleString();
    document.getElementById('deal-monthly').value = 'AED ' + monthly.toLocaleString();
    document.getElementById('deal-commission').value = 'AED ' + commission.toLocaleString();
}

function saveDeal() {
    const id = document.getElementById('deal-id-hidden').value;
    const data = {
        leadId: document.getElementById('deal-lead-id').value,
        cisId: '',
        date: new Date().toISOString().split('T')[0],
        clientName: document.getElementById('deal-client-name').value,
        phone: document.getElementById('deal-phone').value,
        email: document.getElementById('deal-email').value,
        plotId: document.getElementById('deal-plot-id').value,
        plotType: document.getElementById('deal-plot-type').value,
        location: document.getElementById('deal-location').value,
        area: parseFloat(document.getElementById('deal-area').value) || 0,
        priceSqm: parseFloat(document.getElementById('deal-price-sqm').value) || 0,
        totalPrice: parseFloat(document.getElementById('deal-total-price').value.replace(/[^0-9]/g, '')) || 0,
        discount: parseFloat(document.getElementById('deal-discount').value) || 0,
        finalPrice: parseFloat(document.getElementById('deal-final-price').value.replace(/[^0-9]/g, '')) || 0,
        downPaymentPct: parseFloat(document.getElementById('deal-down-payment-pct').value) || 0,
        downPayment: parseFloat(document.getElementById('deal-down-payment').value.replace(/[^0-9]/g, '')) || 0,
        months: parseFloat(document.getElementById('deal-months').value) || 0,
        monthly: parseFloat(document.getElementById('deal-monthly').value.replace(/[^0-9]/g, '')) || 0,
        status: document.getElementById('deal-status').value,
        agent: document.getElementById('deal-agent').value,
        commissionPct: parseFloat(document.getElementById('deal-commission-pct').value) || 0,
        commission: parseFloat(document.getElementById('deal-commission').value.replace(/[^0-9]/g, '')) || 0,
        notes: document.getElementById('deal-notes').value,
        contractDate: document.getElementById('deal-contract-date').value,
        deliveryDate: document.getElementById('deal-delivery-date').value
    };

    // Get CIS ID from lead
    const lead = DataStore.leads.find(l => l.id === data.leadId);
    if (lead) data.cisId = lead.cisId;

    if (!data.clientName) {
        alert('Client name is required!');
        return;
    }

    let deal;
    if (id) {
        deal = DataStore.updateDeal(id, data);
        Tracker.addActivity('deal_progress', `Deal ${deal.id} Updated`, `Status: ${data.status} - AED ${data.finalPrice.toLocaleString()}`, deal.id, 'deal');
    } else {
        deal = DataStore.addDeal(data);
        Tracker.addActivity('deal_created', `New Deal Created`, `${data.clientName} - ${data.plotType} - AED ${data.finalPrice.toLocaleString()}`, deal.id, 'deal');
    }

    // Update plot status if plot selected
    if (data.plotId) {
        DataStore.updatePlot(data.plotId, { status: 'Reserved', linkedDeal: deal.id });
    }

    closeModal('deal-modal');
    UI.refreshDealsTable();
    UI.refreshPlotsTable();
    UI.refreshDashboard();
    
    // Refresh linked deal dropdown if plot modal is open
    if (document.getElementById('plot-modal').classList.contains('active')) {
        populateLinkedDealDropdown();
        // Select the newly created deal
        if (deal && deal.id) {
            document.getElementById('plot-linked-deal').value = deal.id;
        }
    }
    
    UI.showToast(id ? 'Deal updated successfully!' : 'Deal created successfully!');
}

// Agent Registration Function
function registerAgent() {
    const name = document.getElementById('agent-reg-name').value.trim();
    const email = document.getElementById('agent-reg-email').value.trim();
    const phone = document.getElementById('agent-reg-phone').value.trim();
    const password = document.getElementById('agent-reg-password').value;
    const passwordConfirm = document.getElementById('agent-reg-password-confirm').value;
    
    // Validation
    if (!name || !email || !phone) {
        UI.showToast('Please fill in all required fields', 'error');
        return;
    }
    
    if (password !== passwordConfirm) {
        UI.showToast('Passwords do not match', 'error');
        return;
    }
    
    if (password.length < 6) {
        UI.showToast('Password must be at least 6 characters', 'error');
        return;
    }
    
    // Check if email already exists
    const existingUser = Auth.users.find(u => u.email === email);
    if (existingUser) {
        UI.showToast('Email already registered', 'error');
        return;
    }
    
    // Create new agent
    const newAgent = {
        id: 'user-' + Date.now(),
        name: name,
        email: email,
        password: password,
        phone: phone,
        mobile: document.getElementById('agent-reg-mobile').value,
        nationality: document.getElementById('agent-reg-nationality').value,
        dob: document.getElementById('agent-reg-dob').value,
        gender: document.getElementById('agent-reg-gender').value,
        emiratesId: document.getElementById('agent-reg-emirates-id').value,
        reraCard: document.getElementById('agent-reg-rera').value,
        license: document.getElementById('agent-reg-license').value,
        agency: document.getElementById('agent-reg-agency').value,
        experience: document.getElementById('agent-reg-experience').value,
        specialization: document.getElementById('agent-reg-specialization').value,
        primaryArea: document.getElementById('agent-reg-area').value,
        languages: document.getElementById('agent-reg-languages').value,
        commissionRate: parseFloat(document.getElementById('agent-reg-commission').value) || 2,
        address: document.getElementById('agent-reg-address').value,
        city: document.getElementById('agent-reg-city').value,
        country: document.getElementById('agent-reg-country').value,
        role: document.getElementById('agent-reg-role').value,
        status: document.getElementById('agent-reg-status').value,
        notes: document.getElementById('agent-reg-notes').value,
        createdAt: new Date().toISOString(),
        leads: 0,
        deals: 0
    };
    
    // Add to users
    Auth.users.push(newAgent);
    
    // Save to localStorage
    localStorage.setItem('aipiot_agents', JSON.stringify(Auth.users));
    
    // Clear form
    document.getElementById('agent-registration-form').reset();
    
    // Close modal
    closeModal('agent-registration-modal');
    
    // Refresh admin table
    if (Auth.isAdmin()) {
        Auth.loadAdminPanel();
    }
    
    UI.showToast(`Agent ${name} registered successfully!`, 'success');
}

function openAgentRegistration() {
    document.getElementById('agent-registration-form').reset();
    openModal('agent-registration-modal');
}

// Load saved agents on startup
function loadSavedAgents() {
    const savedAgents = localStorage.getItem('aiplot_agents');
    if (savedAgents) {
        try {
            const agents = JSON.parse(savedAgents);
            // Merge with default users, avoiding duplicates
            agents.forEach(agent => {
                const exists = Auth.users.find(u => u.id === agent.id);
                if (!exists) {
                    Auth.users.push(agent);
                }
            });
        } catch (e) {
            console.error('Error loading agents:', e);
        }
    }
}

// Call on startup
loadSavedAgents();

// Show admin nav for admin users
function updateAdminNavVisibility() {
    const adminNav = document.getElementById('admin-nav');
    if (adminNav && Auth.currentUser && Auth.currentUser.role === 'admin') {
        adminNav.style.display = 'flex';
    }
    
    // Show Add Agent button in Agent Portal for admins
    const addAgentBtn = document.getElementById('agent-portal-add-agent-btn');
    if (addAgentBtn && Auth.currentUser && Auth.currentUser.role === 'admin') {
        addAgentBtn.style.display = 'block';
    }
}

// Update on login
const originalPerformLogin = window.performLogin;
if (originalPerformLogin) {
    window.performLogin = function() {
        originalPerformLogin();
        setTimeout(updateAdminNavVisibility, 100);
    };
}

// ============================================================================
// Advanced Search & Filters
// ============================================================================

function toggleAdvancedSearch() {
    const panel = document.getElementById('advanced-search-panel');
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
    } else {
        panel.style.display = 'none';
    }
}

function clearAdvancedSearch() {
    document.getElementById('adv-search-module').value = 'all';
    document.getElementById('adv-search-status').value = '';
    document.getElementById('adv-search-date-from').value = '';
    document.getElementById('adv-search-date-to').value = '';
    document.getElementById('adv-search-assigned').value = '';
    document.getElementById('adv-search-sort').value = 'date-desc';
}

function executeAdvancedSearch() {
    const module = document.getElementById('adv-search-module').value;
    const status = document.getElementById('adv-search-status').value;
    const dateFrom = document.getElementById('adv-search-date-from').value;
    const dateTo = document.getElementById('adv-search-date-to').value;
    const assigned = document.getElementById('adv-search-assigned').value.toLowerCase();
    const sortBy = document.getElementById('adv-search-sort').value;
    
    // Filter based on module
    if (module === 'all' || module === 'leads') {
        let filtered = DataStore.leads;
        
        if (status) {
            filtered = filtered.filter(l => l.status.toLowerCase().includes(status));
        }
        if (dateFrom) {
            filtered = filtered.filter(l => l.date >= dateFrom);
        }
        if (dateTo) {
            filtered = filtered.filter(l => l.date <= dateTo);
        }
        if (assigned) {
            filtered = filtered.filter(l => 
                (l.assignedTo && l.assignedTo.toLowerCase().includes(assigned)) ||
                (l.notes && l.notes.toLowerCase().includes(assigned))
            );
        }
        
        // Sort
        filtered.sort((a, b) => {
            if (sortBy === 'date-desc') return new Date(b.date) - new Date(a.date);
            if (sortBy === 'date-asc') return new Date(a.date) - new Date(b.date);
            if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
            if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
        });
        
        if (module === 'leads') {
            UI.refreshLeadsTable(filtered);
        }
    }
    
    if (module === 'plots' || module === 'all') {
        let filtered = DataStore.plots;
        
        if (status) {
            filtered = filtered.filter(p => p.status.toLowerCase() === status);
        }
        
        if (module === 'plots') {
            UI.refreshPlotsTable(filtered);
        }
    }
    
    toggleAdvancedSearch();
    UI.showToast(`Found ${module === 'all' ? 'results' : 'records'} matching your criteria`, 'success');
}

// Global search filter state
let globalSearchFilter = null;
let _searchDebounceTimer = null;

// ============================================================================
// AI Search Suggestions
// ============================================================================

function getAISearchSuggestions(query) {
    const container = document.getElementById('ai-search-suggestions');
    if (!container) return;

    if (!query || query.trim().length < 2) {
        container.style.display = 'none';
        return;
    }

    const q = query.toLowerCase().trim();
    let html = '';

    // --- (a) Check AILocationDB for location matches ---
    const locationAliases = {
        'downtown': 'downtown dubai',
        'marina': 'dubai marina',
        'palm': 'palm jumeirah',
        'jbr': 'dubai marina',
        'business bay': 'business bay',
        'jvc': 'jvc',
        'jumeirah village': 'jvc',
        'dubai hills': 'dubai hills',
        'hills estate': 'dubai hills',
        'deira': 'deira',
        'sharjah': 'sharjah'
    };

    let matchedLocationKey = null;
    // Direct key match in AILocationDB
    for (const key of Object.keys(AILocationDB)) {
        if (key.includes(q) || q.includes(key)) {
            matchedLocationKey = key;
            break;
        }
    }
    // Alias match
    if (!matchedLocationKey) {
        for (const [alias, dbKey] of Object.entries(locationAliases)) {
            if (q.includes(alias) || alias.includes(q)) {
                if (AILocationDB[dbKey]) {
                    matchedLocationKey = dbKey;
                    break;
                }
            }
        }
    }

    if (matchedLocationKey) {
        const loc = AILocationDB[matchedLocationKey];
        const displayName = matchedLocationKey.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        const roiMatch = loc.insights.match(/(\d+[\-–]\d+%)/);  
        const roiText = roiMatch ? roiMatch[1] : '—';
        const descSnippet = loc.overview.length > 80 ? loc.overview.substring(0, 80) + '…' : loc.overview;
        const stars = '⭐'.repeat(loc.investment);

        html = _buildAISuggestionHTML(
            `<strong>${displayName}</strong> — ${descSnippet}` +
            `<div class="ai-location-card" onclick="_aiSuggestionLocationClick('${matchedLocationKey}')" title="Click to filter by this location">` +
                `<div class="ai-loc-main">` +
                    `<div class="ai-loc-name">${displayName} ${stars}</div>` +
                    `<div class="ai-loc-desc">${loc.insights}</div>` +
                `</div>` +
                `<div class="ai-loc-stats">` +
                    `<div class="ai-loc-stat"><div class="ai-loc-stat-value">${loc.avgPrice.split('-')[0].trim()}</div><div class="ai-loc-stat-label">From</div></div>` +
                    `<div class="ai-loc-stat"><div class="ai-loc-stat-value">${roiText}</div><div class="ai-loc-stat-label">Yield</div></div>` +
                    `<div class="ai-loc-stat"><div class="ai-loc-stat-value">${loc.trend.split(' ')[0]}</div><div class="ai-loc-stat-label">Growth</div></div>` +
                `</div>` +
            `</div>`
        );
        container.innerHTML = html;
        container.style.display = 'flex';
        return;
    }

    // --- (c) Natural language / question detection (check before keywords so questions get richer answers) ---
    const questionPatterns = /\?|\b(where|what|how|which|best|top|recommend|should|can i|tell me|suggest)\b/;
    if (questionPatterns.test(q)) {
        const aiAnswer = _getInlineAIAnswer(q);
        if (aiAnswer) {
            html = _buildAISuggestionHTML(aiAnswer);
            container.innerHTML = html;
            container.style.display = 'flex';
            return;
        }
    }

    // --- (b) Real estate keyword tips ---
    const keywordTips = [
        { keys: ['invest', 'roi', 'return', 'profit'], tip: 'For <strong>best ROI</strong>, check <strong>JVC</strong> (8-9% yield) and <strong>Deira</strong> (8-10% yield). For appreciation, <strong>Palm Jumeirah</strong> leads at +18% YoY.' },
        { keys: ['rent', 'rental', 'tenant', 'lease'], tip: '<strong>Top rental yields:</strong> Deira 8-10%, JVC 8-9%, Sports City 8%. Marina &amp; Downtown offer 6-8% with stronger tenant demand.' },
        { keys: ['villa', 'house', 'townhouse'], tip: '<strong>Villas available in:</strong> Palm Jumeirah (luxury beachfront), Dubai Hills (golf &amp; parks), JVC (affordable family villas).' },
        { keys: ['apartment', 'flat', 'studio', 'unit'], tip: '<strong>Apartments:</strong> Downtown &amp; Marina for premium, Business Bay for mid-range, JVC &amp; Deira for budget-friendly options.' },
        { keys: ['luxury', 'premium', 'high-end', 'exclusive'], tip: '<strong>Luxury hotspots:</strong> Palm Jumeirah (AED 3,000-4,500/sqft), Downtown Dubai (AED 2,500-3,200/sqft) — both with 5-star investment ratings.' },
        { keys: ['budget', 'affordable', 'cheap', 'low cost', 'value'], tip: '<strong>Best value areas:</strong> JVC from AED 850/sqft, Deira from AED 600/sqft, Sharjah from AED 400/sqft — all with solid rental yields.' },
        { keys: ['price', 'cost', 'rates', 'how much'], tip: '<strong>Price overview:</strong> Premium AED 2,500-4,500/sqft (Downtown, Palm) · Mid AED 1,400-2,400/sqft (Marina, Hills) · Value AED 400-1,200/sqft (JVC, Deira, Sharjah).' },
        { keys: ['buy', 'purchase', 'acquire'], tip: '<strong>Buying tip:</strong> Off-plan offers 15-25% appreciation potential. Ready properties give immediate rental income (6-10% yield). DLD transfer fee is 4%.' },
        { keys: ['family', 'kid', 'child', 'school'], tip: '<strong>Family-friendly:</strong> Dubai Hills (parks, schools, golf), JVC (affordable, community feel), Arabian Ranches. All have excellent school access.' },
        { keys: ['beach', 'sea', 'waterfront', 'ocean'], tip: '<strong>Waterfront living:</strong> Palm Jumeirah (exclusive beach), Dubai Marina (marina walk), JBR (beach lifestyle) — all premium coastal communities.' },
        { keys: ['visa', 'golden visa', 'residency'], tip: '<strong>Golden Visa:</strong> AED 2M+ property investment → 10-year residency. AED 1M+ → 2-year investor visa. No income tax, family sponsorship included.' },
        { keys: ['off-plan', 'offplan', 'new project', 'under construction'], tip: '<strong>Off-plan advantage:</strong> 60/40 or 50/50 payment plans, 15-25% appreciation on completion. Check developer reputation &amp; RERA registration.' }
    ];

    for (const kt of keywordTips) {
        if (kt.keys.some(k => q.includes(k))) {
            html = _buildAISuggestionHTML(kt.tip);
            container.innerHTML = html;
            container.style.display = 'flex';
            return;
        }
    }

    // No AI insight for this query
    container.style.display = 'none';
}

// Build the standard suggestion HTML wrapper
function _buildAISuggestionHTML(contentHTML) {
    return `<div class="ai-suggestion-icon">✨</div>` +
           `<div class="ai-suggestion-body">` +
               `<div class="ai-suggestion-label">AI Insight</div>` +
               `<div class="ai-suggestion-text">${contentHTML}</div>` +
           `</div>`;
}

// Generate inline AI answer for natural-language questions (reuses patterns from generateAIResponse)
function _getInlineAIAnswer(q) {
    // Location questions
    const locKeywords = {
        'downtown': 'Downtown Dubai',
        'marina': 'Dubai Marina',
        'palm': 'Palm Jumeirah',
        'jvc': 'JVC',
        'business bay': 'Business Bay',
        'dubai hills': 'Dubai Hills',
        'deira': 'Deira',
        'sharjah': 'Sharjah'
    };
    for (const [key, name] of Object.entries(locKeywords)) {
        if (q.includes(key)) {
            const dbKey = Object.keys(AILocationDB).find(k => k.includes(key));
            if (dbKey) {
                const d = AILocationDB[dbKey];
                return `<strong>${name}:</strong> ${d.avgPrice}, ${d.trend} growth. ${d.insights}`;
            }
        }
    }

    // Investment / best questions
    if (q.match(/\b(best|top|recommend|should|where.*(invest|buy))\b/)) {
        if (q.includes('rent') || q.includes('yield')) {
            return '<strong>Best rental yields:</strong> Deira (8-10%), JVC (8-9%), Sports City (8%). These offer the strongest cash-flow returns in Dubai.';
        }
        if (q.includes('luxury') || q.includes('premium')) {
            return '<strong>Top luxury picks:</strong> Palm Jumeirah (+18% growth, AED 3,000-4,500/sqft) and Downtown Dubai (+15%, AED 2,500-3,200/sqft).';
        }
        if (q.includes('budget') || q.includes('cheap') || q.includes('afford')) {
            return '<strong>Best value:</strong> JVC from AED 850/sqft (8-9% yield), Deira from AED 600/sqft (8-10% yield), Sharjah from AED 400/sqft.';
        }
        if (q.includes('family') || q.includes('families')) {
            return '<strong>Best for families:</strong> Dubai Hills (parks, golf, schools), JVC (affordable, community), Arabian Ranches — all family-oriented.';
        }
        return '<strong>Top investments 2024:</strong> Palm Jumeirah (highest appreciation +18%), JVC (best yield 8-9%), Dubai Marina (strong all-round at 6-7% yield + 12% growth).';
    }

    // Price questions
    if (q.match(/\b(how much|price|cost|rate|expensive)\b/)) {
        return '<strong>Dubai prices:</strong> Premium AED 2,500-4,500/sqft (Downtown, Palm) · Mid AED 1,400-2,400/sqft (Marina, Hills, Business Bay) · Affordable AED 400-1,200/sqft (JVC, Deira, Sharjah).';
    }

    // Comparison questions
    if (q.match(/\b(compare|vs|versus|difference|better)\b/)) {
        return '<strong>Quick compare:</strong> Downtown (luxury, +15%) vs Marina (waterfront, +12%). Palm (exclusive, +18%) vs JVC (value, 8-9% yield). Business Bay (urban) vs Dubai Hills (family).';
    }

    // Market / trend questions
    if (q.match(/\b(market|trend|growth|future|outlook)\b/)) {
        return '<strong>Market 2024:</strong> +10-12% overall growth, transactions up 25% vs 2023. Palm Jumeirah and Downtown lead appreciation. Continued growth expected through 2025.';
    }

    // Generic question fallback
    if (q.includes('?') || q.match(/\b(what|where|how|which|when)\b/)) {
        return 'Try asking about <strong>locations</strong> (Downtown, Marina, Palm), <strong>prices</strong>, <strong>investment</strong> tips, <strong>rental yields</strong>, or <strong>visa</strong> info — I can help with all Dubai real estate topics!';
    }

    return null;
}

// When user clicks a location card, put location name in search box
function _aiSuggestionLocationClick(locationKey) {
    const searchInput = document.getElementById('global-search');
    if (searchInput) {
        const displayName = locationKey.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        searchInput.value = displayName;
        // Bypass debounce — execute search immediately on direct user click
        clearTimeout(_searchDebounceTimer);
        _executeGlobalSearch(displayName);
    }
}
window._aiSuggestionLocationClick = _aiSuggestionLocationClick;

function performGlobalSearch(query) {
    console.log('[Search] performGlobalSearch called with:', query);
    clearTimeout(_searchDebounceTimer);
    _searchDebounceTimer = setTimeout(() => _executeGlobalSearch(query), 250);
}
window.performGlobalSearch = performGlobalSearch;
console.log('[Search] performGlobalSearch exposed to window:', typeof window.performGlobalSearch === 'function');

function _executeGlobalSearch(query) {
    const bar = document.getElementById('search-results-bar');

    // Clear search when query is too short
    if (!query || query.trim().length < 2) {
        globalSearchFilter = null;
        if (bar) bar.style.display = 'none';
        getAISearchSuggestions('');  // Hide AI suggestions
        // Refresh current table to show all records
        _refreshActiveTable();
        return;
    }

    const lq = query.toLowerCase().trim();

    // Helper: safely check if a field includes the query
    const has = (val) => val && String(val).toLowerCase().includes(lq);

    // Search across all modules with broad field coverage
    const results = {
        cis: DataStore.cis.filter(c =>
            has(c.name) || has(c.phone) || has(c.email) || has(c.id) ||
            has(c.nationality) || has(c.location) || has(c.source) ||
            has(c.status) || has(c.plotType) || has(c.notes) || has(c.budget)
        ),
        leads: DataStore.leads.filter(l =>
            has(l.name) || has(l.phone) || has(l.email) || has(l.id) ||
            has(l.nationality) || has(l.location) || has(l.source) ||
            has(l.status) || has(l.plotType) || has(l.notes) ||
            has(l.priority) || has(l.assignedTo) || has(l.budget)
        ),
        deals: DataStore.deals.filter(d =>
            has(d.clientName) || has(d.phone) || has(d.email) || has(d.id) ||
            has(d.location) || has(d.plotType) || has(d.status) ||
            has(d.agent) || has(d.plotId) || has(d.notes) || has(d.leadId)
        ),
        plots: DataStore.plots.filter(p =>
            has(p.plotNo) || has(p.development) || has(p.district) || has(p.id) ||
            has(p.city) || has(p.zone) || has(p.plotType) || has(p.zoning) ||
            has(p.status) || has(p.view) || has(p.notes)
        )
    };

    // Store filter state
    globalSearchFilter = results;

    const total = results.cis.length + results.leads.length + results.deals.length + results.plots.length;

    // Build results summary bar
    if (bar) {
        const modules = [
            { key: 'cis', label: 'CIS', page: 'cis', icon: 'fa-id-card' },
            { key: 'leads', label: 'Leads', page: 'leads', icon: 'fa-funnel-dollar' },
            { key: 'deals', label: 'Deals', page: 'deals', icon: 'fa-handshake' },
            { key: 'plots', label: 'Plots', page: 'plots', icon: 'fa-map-marked-alt' }
        ];

        bar.innerHTML = `<span class="search-results-label"><i class="fas fa-search"></i> ${total} result${total !== 1 ? 's' : ''}</span>` +
            modules.map(m => {
                const count = results[m.key].length;
                const cls = count > 0 ? 'search-badge active' : 'search-badge empty';
                return `<button class="${cls}" onclick="_searchNavigateTo('${m.page}')" ${count === 0 ? 'disabled' : ''}>
                    <i class="fas ${m.icon}"></i> ${m.label} <span class="search-badge-count">${count}</span>
                </button>`;
            }).join('');
        bar.style.display = 'flex';
    }

    // Refresh the currently active table with filtered data
    _refreshActiveTable();

    // Show AI-powered suggestions
    getAISearchSuggestions(query);
}

// Navigate to a module tab and apply the current search filter
function _searchNavigateTo(page) {
    // Clear any pending search debounce to prevent it from re-executing
    // and rebuilding the badge bar after navigation
    clearTimeout(_searchDebounceTimer);
    // navigateTo already refreshes the target table with globalSearchFilter applied
    UI.navigateTo(page);
}
window._searchNavigateTo = _searchNavigateTo;

// Refresh the active (or specified) table, using search filter if active
function _refreshActiveTable(page) {
    const current = page || UI.currentPage;
    if (current === 'cis') {
        UI.refreshCISTable(globalSearchFilter ? globalSearchFilter.cis : null);
    } else if (current === 'leads') {
        UI.refreshLeadsTable(globalSearchFilter ? globalSearchFilter.leads : null);
    } else if (current === 'deals') {
        UI.refreshDealsTable(globalSearchFilter ? globalSearchFilter.deals : null);
    } else if (current === 'plots') {
        UI.refreshPlotsTable(globalSearchFilter ? globalSearchFilter.plots : null);
    }
}

// ============================================================================
// Email Automation Templates
// ============================================================================

const EmailTemplates = {
    followUp: (lead) => ({
        subject: `Follow-up: ${lead.name} - AI Plot`,
        body: `Dear ${lead.name},\n\nI hope this email finds you well. I wanted to follow up regarding your interest in plots.\n\nBest regards,\n${Auth.currentUser.name}`
    }),
    newListing: (plot, lead) => ({
        subject: `New Plot Available: ${plot.plotNo} in ${plot.district || plot.city}`,
        body: `Dear ${lead.name},\n\nWe have a new plot that matches your criteria:\n\nPlot: ${plot.plotNo}\nLocation: ${plot.district || plot.city}\nSize: ${plot.size}\nPrice: ${plot.totalPrice ? 'AED ' + plot.totalPrice.toLocaleString() : 'Contact for price'}\n\nWould you like to schedule a viewing?\n\nBest regards,\n${Auth.currentUser.name}`
    }),
    dealConfirmation: (deal) => ({
        subject: `Deal Confirmation - ${deal.id}`,
        body: `Dear ${deal.clientName},\n\nThank you for your purchase. Here are the details:\n\nDeal ID: ${deal.id}\nPlot: ${deal.plotId}\nFinal Price: AED ${deal.finalPrice.toLocaleString()}\n\nWe will contact you shortly with next steps.\n\nBest regards,\nAI Plot Team`
    }),
    priceReduction: (plot, leads) => ({
        subject: `Price Reduction: ${plot.plotNo} - Great Opportunity!`,
        body: `Dear [Client Name],\n\nGreat news! The plot ${plot.plotNo} in ${plot.district} has a price reduction.\n\nNew Price: AED ${plot.totalPrice ? plot.totalPrice.toLocaleString() : 'Contact us'}\n\nThis is a limited-time offer. Contact us today!\n\nBest regards,\nAI Plot Team`
    })
};

function sendEmail(template, recipient) {
    // In production, integrate with email service (SendGrid, Mailgun)
    // For now, show email content in modal or console
    console.log('Email Template:', template);
    console.log('Recipient:', recipient);
    UI.showToast('Email queued for sending (integrate email service)', 'success');
}

// ============================================================================
// Performance Analytics
// ============================================================================

const Analytics = {
    getAgentPerformance(agentName) {
        const leads = DataStore.leads.filter(l => l.assignedTo === agentName);
        const deals = DataStore.deals.filter(d => d.agent === agentName);
        
        const totalLeads = leads.length;
        const convertedDeals = deals.length;
        const conversionRate = totalLeads > 0 ? (convertedDeals / totalLeads * 100).toFixed(1) : 0;
        const totalRevenue = deals.reduce((sum, d) => sum + (d.finalPrice || 0), 0);
        const avgDealSize = convertedDeals > 0 ? totalRevenue / convertedDeals : 0;
        
        return {
            name: agentName,
            totalLeads,
            totalDeals: convertedDeals,
            conversionRate: conversionRate + '%',
            totalRevenue,
            avgDealSize,
            commission: deals.reduce((sum, d) => sum + (d.commission || 0), 0)
        };
    },
    
    getTopPerformers() {
        const agents = Auth.users.filter(u => u.role.includes('agent'));
        return agents.map(a => this.getAgentPerformance(a.name))
            .sort((a, b) => b.totalRevenue - a.totalRevenue)
            .slice(0, 5);
    },
    
    getMarketTrends() {
        const deals = DataStore.deals.filter(d => d.finalPrice > 0);
        const plots = DataStore.plots.filter(p => p.totalPrice > 0);
        
        const avgPricePerSqm = deals.length > 0 
            ? deals.reduce((sum, d) => sum + (d.priceSqm || 0), 0) / deals.length 
            : 0;
        
        return {
            totalDeals: deals.length,
            avgDealValue: deals.length > 0 ? deals.reduce((sum, d) => sum + d.finalPrice, 0) / deals.length : 0,
            avgPricePerSqm,
            totalPlots: plots.length,
            availablePlots: plots.filter(p => p.status === 'Available').length
        };
    }
};

// Performance Dashboard Modal
function showPerformanceDashboard() {
    const topPerformers = Analytics.getTopPerformers();
    const marketTrends = Analytics.getMarketTrends();
    
    const dashboardHTML = `
        <div class="modal active" id="performance-dashboard-modal">
            <div class="modal-content large">
                <div class="modal-header">
                    <h3><i class="fas fa-chart-line"></i> Performance Dashboard</h3>
                    <button class="btn-close" onclick="closeModal('performance-dashboard-modal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="performance-grid">
                        <div class="card">
                            <div class="card-header">
                                <h4><i class="fas fa-trophy"></i> Top Performers</h4>
                            </div>
                            <div class="table-container">
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>Agent</th>
                                            <th>Leads</th>
                                            <th>Deals</th>
                                            <th>Conv. Rate</th>
                                            <th>Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${topPerformers.map(p => `
                                            <tr>
                                                <td><strong>${p.name}</strong></td>
                                                <td>${p.totalLeads}</td>
                                                <td>${p.totalDeals}</td>
                                                <td>${p.conversionRate}</td>
                                                <td>AED ${p.totalRevenue.toLocaleString()}</td>
                                            </tr>
                                        `).join('') || '<tr><td colspan="5" class="empty-state">No data available</td></tr>'}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        <div class="card">
                            <div class="card-header">
                                <h4><i class="fas fa-chart-bar"></i> Market Trends</h4>
                            </div>
                            <div class="metrics-grid">
                                <div class="metric-card">
                                    <span class="metric-value">${marketTrends.totalDeals}</span>
                                    <span class="metric-label">Total Deals</span>
                                </div>
                                <div class="metric-card">
                                    <span class="metric-value">AED ${marketTrends.avgDealValue.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                                    <span class="metric-label">Avg Deal Value</span>
                                </div>
                                <div class="metric-card">
                                    <span class="metric-value">AED ${marketTrends.avgPricePerSqm.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                                    <span class="metric-label">Price/sqm</span>
                                </div>
                                <div class="metric-card">
                                    <span class="metric-value">${marketTrends.availablePlots}/${marketTrends.totalPlots}</span>
                                    <span class="metric-label">Available Plots</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card" style="margin-top: 20px;">
                        <div class="card-header">
                            <h4><i class="fas fa-envelope"></i> Quick Email Templates</h4>
                        </div>
                        <div class="email-templates-grid">
                            <button class="email-template-btn" onclick="openEmailTemplate('followUp')">
                                <i class="fas fa-phone-alt"></i>
                                <span>Follow-up</span>
                            </button>
                            <button class="email-template-btn" onclick="openEmailTemplate('newListing')">
                                <i class="fas fa-home"></i>
                                <span>New Listing</span>
                            </button>
                            <button class="email-template-btn" onclick="openEmailTemplate('dealConfirmation')">
                                <i class="fas fa-check-circle"></i>
                                <span>Deal Confirm</span>
                            </button>
                            <button class="email-template-btn" onclick="openEmailTemplate('priceReduction')">
                                <i class="fas fa-tag"></i>
                                <span>Price Drop</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', dashboardHTML);
}

function openEmailTemplate(templateName) {
    const template = EmailTemplates[templateName];
    if (!template) {
        UI.showToast('Template not found', 'error');
        return;
    }
    
    // Show template preview modal
    const previewHTML = `
        <div class="modal active" id="email-preview-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-envelope"></i> Email Template Preview</h3>
                    <button class="btn-close" onclick="closeModal('email-preview-modal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Subject</label>
                        <input type="text" id="email-subject" value="Template subject will appear here">
                    </div>
                    <div class="form-group">
                        <label>Body</label>
                        <textarea id="email-body" rows="10">Select a lead or client to auto-fill this template</textarea>
                    </div>
                    <div class="form-group">
                        <label>Recipient Email</label>
                        <input type="email" id="email-recipient" placeholder="client@example.com">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeModal('email-preview-modal')">Cancel</button>
                    <button class="btn-primary" onclick="sendQueuedEmail()"><i class="fas fa-paper-plane"></i> Send Email</button>
                </div>
            </div>
        </div>
    `;
    
    closeModal('performance-dashboard-modal');
    document.body.insertAdjacentHTML('beforeend', previewHTML);
    UI.showToast('Email template loaded - integrate with email service to send', 'info');
}

function sendQueuedEmail() {
    const subject = document.getElementById('email-subject').value;
    const body = document.getElementById('email-body').value;
    const recipient = document.getElementById('email-recipient').value;
    
    if (!recipient) {
        UI.showToast('Please enter recipient email', 'error');
        return;
    }
    
    // In production, send via email service API
    console.log('Sending email:', { subject, body, recipient });
    closeModal('email-preview-modal');
    UI.showToast('Email queued for sending', 'success');
}

// ============================================================================
// Tracking System
// ============================================================================

const Tracker = {
    activities: [],
    
    init() {
        this.activities = JSON.parse(localStorage.getItem('aiplot_activities') || '[]');
    },
    
    addActivity(type, title, description, entityId, entityType) {
        const activity = {
            id: 'act-' + Date.now(),
            type: type,
            title: title,
            description: description,
            entityId: entityId,
            entityType: entityType,
            agent: Auth.currentUser ? Auth.currentUser.name : 'Unknown',
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleDateString()
        };
        
        this.activities.unshift(activity);
        localStorage.setItem('aiplot_activities', JSON.stringify(this.activities));
        this.renderAgentTimeline();
        
        return activity;
    },
    
    renderAgentTimeline() {
        const container = document.getElementById('agent-activity-timeline');
        if (!container) return;
        
        const agentActivities = this.activities.filter(a => 
            a.agent === (Auth.currentUser ? Auth.currentUser.name : '')
        ).slice(0, 20);
        
        if (agentActivities.length === 0) {
            container.innerHTML = '<p class="empty-state">No activities yet. Start tracking your interactions!</p>';
            return;
        }
        
        container.innerHTML = agentActivities.map(activity => {
            const iconMap = {
                'call': 'fa-phone',
                'email': 'fa-envelope',
                'meeting': 'fa-handshake',
                'note': 'fa-sticky-note',
                'status_change': 'fa-exchange-alt',
                'deal_progress': 'fa-chart-line',
                'lead_created': 'fa-user-plus',
                'deal_created': 'fa-handshake'
            };
            
            const icon = iconMap[activity.type] || 'fa-circle';
            
            return `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-header">
                            <span class="activity-title">${activity.title}</span>
                            <span class="activity-time">${activity.date}</span>
                        </div>
                        <div class="activity-description">${activity.description}</div>
                        <div class="activity-meta">
                            <span><i class="fas fa-user"></i> ${activity.agent}</span>
                            ${activity.entityType ? `<span><i class="fas fa-tag"></i> ${activity.entityType}: ${activity.entityId}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },
    
    getLeadActivities(leadId) {
        return this.activities.filter(a => a.entityId === leadId && a.entityType === 'lead');
    },
    
    getDealActivities(dealId) {
        return this.activities.filter(a => a.entityId === dealId && a.entityType === 'deal');
    },
    
    getStats() {
        const today = new Date().toDateString();
        const thisWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        return {
            totalActivities: this.activities.length,
            todayActivities: this.activities.filter(a => new Date(a.timestamp).toDateString() === today).length,
            weekActivities: this.activities.filter(a => new Date(a.timestamp) >= thisWeek).length,
            calls: this.activities.filter(a => a.type === 'call').length,
            emails: this.activities.filter(a => a.type === 'email').length,
            meetings: this.activities.filter(a => a.type === 'meeting').length
        };
    }
};

function updateLeadPipeline() {
    const status = document.getElementById('lead-status').value;
    const tracker = document.getElementById('lead-pipeline-tracker');
    if (!tracker) return;
    
    const stages = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won'];
    const currentIndex = stages.indexOf(status) >= 0 ? stages.indexOf(status) : 
                        status === 'Closed Lost' ? 5 : stages.indexOf('New');
    
    const stageElements = tracker.querySelectorAll('.pipeline-stage');
    stageElements.forEach((element, index) => {
        element.classList.remove('active', 'completed');
        if (index < currentIndex) {
            element.classList.add('completed');
        } else if (index === currentIndex) {
            element.classList.add('active');
        }
    });
}

function updateDealTracking() {
    const status = document.getElementById('deal-status').value;
    const probability = document.getElementById('deal-probability').value;
    const expectedClose = document.getElementById('deal-expected-close').value;
    
    // Update deal closing tracker
    const tracker = document.getElementById('deal-closing-tracker');
    if (tracker) {
        const stages = ['Active', 'Pending', 'Approved', 'Contract Signed', 'Payment Received', 'Completed'];
        const currentIndex = stages.indexOf(status);
        
        const stageElements = tracker.querySelectorAll('.deal-stage');
        stageElements.forEach((element, index) => {
            element.classList.remove('active', 'completed');
            if (index < currentIndex) {
                element.classList.add('completed');
            } else if (index === currentIndex) {
                element.classList.add('active');
            }
        });
    }
    
    // Calculate days to close
    if (expectedClose) {
        const today = new Date();
        const closeDate = new Date(expectedClose);
        const daysToClose = Math.ceil((closeDate - today) / (1000 * 60 * 60 * 24));
        const daysElement = document.getElementById('deal-days-to-close');
        if (daysElement) {
            if (daysToClose < 0) {
                daysElement.value = `${Math.abs(daysToClose)} days overdue`;
                daysElement.style.color = 'var(--danger)';
            } else {
                daysElement.value = `${daysToClose} days`;
                daysElement.style.color = 'var(--text-primary)';
            }
        }
    }
    
    // Auto-update probability based on stage
    if (status && !probability) {
        const probabilityMap = {
            'Active': 20,
            'Pending': 40,
            'Under Review': 50,
            'Approved': 70,
            'Contract Signed': 85,
            'Payment Received': 95,
            'Completed': 100,
            'Cancelled': 0
        };
        document.getElementById('deal-probability').value = probabilityMap[status] || 50;
    }
}

function addActivityEntry() {
    const type = prompt('Activity Type (call/email/meeting/note):', 'call');
    if (!type) return;
    
    const title = prompt('Activity Title:');
    if (!title) return;
    
    const description = prompt('Description:');
    
    Tracker.addActivity(type, title, description || '', '', '');
    UI.showToast('Activity logged successfully!', 'success');
}

function editDeal(id) {
    const deal = DataStore.deals.find(d => d.id === id);
    if (!deal) return;

    document.getElementById('deal-modal-title').textContent = 'Edit Deal';
    document.getElementById('deal-id-hidden').value = deal.id;
    document.getElementById('deal-lead-id').value = deal.leadId;
    document.getElementById('deal-client-name').value = deal.clientName;
    document.getElementById('deal-phone').value = deal.phone;
    document.getElementById('deal-email').value = deal.email;
    document.getElementById('deal-plot-id').value = deal.plotId;
    document.getElementById('deal-plot-type').value = deal.plotType;
    document.getElementById('deal-location').value = deal.location;
    document.getElementById('deal-area').value = deal.area;
    document.getElementById('deal-price-sqm').value = deal.priceSqm;
    document.getElementById('deal-discount').value = deal.discount;
    document.getElementById('deal-down-payment-pct').value = deal.downPaymentPct;
    document.getElementById('deal-months').value = deal.months;
    document.getElementById('deal-status').value = deal.status;
    document.getElementById('deal-agent').value = deal.agent;
    document.getElementById('deal-commission-pct').value = deal.commissionPct;
    document.getElementById('deal-notes').value = deal.notes;
    document.getElementById('deal-contract-date').value = deal.contractDate;
    document.getElementById('deal-delivery-date').value = deal.deliveryDate;

    calculateDealTotals();
    openModal('deal-modal');
}

function deleteDeal(id) {
    if (confirm('Are you sure you want to delete this deal?')) {
        DataStore.deleteDeal(id);
        UI.refreshDealsTable();
        UI.refreshDashboard();
        UI.showToast('Deal deleted successfully!');
    }
}

// Plot Functions
function openPlotModal() {
    document.getElementById('plot-modal-title').textContent = 'Add New Plot';
    document.getElementById('plot-id-hidden').value = '';
    document.getElementById('plot-form').reset();
    if (document.getElementById('plot-area-unit')) document.getElementById('plot-area-unit').value = 'sqm';
    UI.setDefaultDates();
    FileManager.clear(); // Clear any previous file uploads
    FileManager.init(); // Initialize file upload handlers
    populateLinkedDealDropdown(); // Populate deals dropdown
    
    // Clear CIS status displays
    const ownerStatusEl = document.getElementById('owner-cis-status');
    const agentStatusEl = document.getElementById('agent-cis-status');
    if (ownerStatusEl) ownerStatusEl.innerHTML = '';
    if (agentStatusEl) agentStatusEl.innerHTML = '';
    
    openModal('plot-modal');
    // Wire up Smart Area Research
    var locationFields = ['plot-city', 'plot-district', 'plot-development', 'plot-zone'];
    locationFields.forEach(function(fieldId) {
        var el = document.getElementById(fieldId);
        if (el) {
            el.addEventListener('input', triggerAreaResearch);
            el.addEventListener('change', triggerAreaResearch);
        }
    });
    // Hide research panel initially
    var researchPanel = document.getElementById('plot-area-research');
    if (researchPanel) researchPanel.style.display = 'none';
    researchDismissed = false;
}

function convertAreaUnits() {
    const unit = document.getElementById('plot-area-unit').value;
    const factor = 10.764; // 1 sqm = 10.764 sqf
    const fields = ['plot-gfa', 'plot-nfa', 'plot-bua', 'plot-size'];
    
    fields.forEach(id => {
        const input = document.getElementById(id);
        if (!input || !input.value || isNaN(parseFloat(input.value))) return;
        const val = parseFloat(input.value);
        if (unit === 'sqf' && input.dataset.lastUnit !== 'sqf') {
            input.value = (val * factor).toFixed(2);
            input.dataset.lastUnit = 'sqf';
        } else if (unit === 'sqm' && input.dataset.lastUnit === 'sqf') {
            input.value = (val / factor).toFixed(2);
            input.dataset.lastUnit = 'sqm';
        }
    });
    
    // Update labels
    const unitLabel = unit === 'sqf' ? 'sqf' : 'sqm';
    fields.forEach(id => {
        const label = document.getElementById(id)?.parentElement?.querySelector('label');
        if (label) {
            label.textContent = label.textContent.replace(/\s*\(sq[mf]\)/, '') + ` (${unitLabel})`;
        }
    });
}

// Populate Linked Deal dropdown with available deals
function populateLinkedDealDropdown() {
    const select = document.getElementById('plot-linked-deal');
    if (!select) return;
    
    // Keep the first option (Select Deal...)
    const firstOption = select.options[0];
    select.innerHTML = '';
    select.appendChild(firstOption);
    
    // Add all deals from DataStore
    DataStore.deals.forEach(deal => {
        const option = document.createElement('option');
        option.value = deal.id;
        option.textContent = `${deal.id} - ${deal.clientName} (${deal.plotId || 'No Plot'})`;
        select.appendChild(option);
    });
}

// Plot Location Helper Functions
async function pasteFromClipboard(fieldId) {
    try {
        const text = await navigator.clipboard.readText();
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = text.trim();
            console.log(`✅ Pasted to ${fieldId}:`, text.trim());
            // Sync with hidden fields
            syncLatLngFields();
        }
    } catch (err) {
        console.error('❌ Clipboard paste failed:', err);
        alert('Unable to access clipboard. Please paste manually using Ctrl+V');
    }
}

function syncLatLngFields() {
    const latVisible = document.getElementById('plot-lat-visible');
    const lngVisible = document.getElementById('plot-lng-visible');
    const latHidden = document.getElementById('plot-lat');
    const lngHidden = document.getElementById('plot-lng');
    
    if (latVisible && latHidden) {
        latHidden.value = latVisible.value;
    }
    if (lngVisible && lngHidden) {
        lngHidden.value = lngVisible.value;
    }
    
    // Update map if values exist
    const lat = parseFloat(latVisible?.value);
    const lng = parseFloat(lngVisible?.value);
    if (!isNaN(lat) && !isNaN(lng) && plotLocationMap) {
        plotLocationMap.setView([lat, lng], 15);
        if (plotLocationMarker) {
            plotLocationMarker.setLatLng([lat, lng]);
        } else {
            plotLocationMarker = L.marker([lat, lng], { draggable: true }).addTo(plotLocationMap);
            plotLocationMarker.on('dragend', function(e) {
                const marker = e.target;
                const position = marker.getLatLng();
                setPlotLocation(position.lat, position.lng);
            });
        }
    }
}

function copyFromWebsite() {
    const instructions = `To copy location from a website:

1. Open the website with the plot location
2. Right-click on the map/location
3. Copy the coordinates (latitude, longitude)
4. Paste them in the Latitude and Longitude fields above

Or use "Use Current Location" button to automatically detect your position.`;
    
    alert(instructions);
}

function useCurrentLocation() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        return;
    }
    
    console.log('📍 Requesting current location...');
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            console.log('✅ Current location found:', lat, lng);
            
            const latVisible = document.getElementById('plot-lat-visible');
            const lngVisible = document.getElementById('plot-lng-visible');
            
            if (latVisible) latVisible.value = lat.toFixed(6);
            if (lngVisible) lngVisible.value = lng.toFixed(6);
            
            // Sync with hidden fields
            syncLatLngFields();
            
            alert(`✅ Location detected!\n\nLatitude: ${lat.toFixed(6)}\nLongitude: ${lng.toFixed(6)}`);
        },
        (error) => {
            console.error('❌ Geolocation error:', error);
            let message = 'Unable to retrieve your location.\n\n';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    message += 'Location permission denied. Please enable location access in your browser settings.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    message += 'Location information unavailable.';
                    break;
                case error.TIMEOUT:
                    message += 'Location request timed out.';
                    break;
                default:
                    message += 'An unknown error occurred.';
            }
            alert(message);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

function initPlotLocationSync() {
    const latVisible = document.getElementById('plot-lat-visible');
    const lngVisible = document.getElementById('plot-lng-visible');
    
    if (latVisible) {
        latVisible.addEventListener('input', syncLatLngFields);
        latVisible.addEventListener('change', syncLatLngFields);
    }
    if (lngVisible) {
        lngVisible.addEventListener('input', syncLatLngFields);
        lngVisible.addEventListener('change', syncLatLngFields);
    }
    
    console.log('✅ Plot location sync initialized');
}

// Create CIS from Plot Owner or Agent
function createCISFromPlot(type) {
    const name = document.getElementById(`plot-${type}-name`).value.trim();
    const phone = document.getElementById(`plot-${type}-phone`).value.trim();
    const email = document.getElementById(`plot-${type}-email`).value.trim();
    const nationality = document.getElementById(`plot-${type}-nationality`).value.trim();
    
    if (!name) {
        UI.showToast(`Please enter ${type} name first`, 'error');
        return;
    }
    
    if (!phone && !email) {
        UI.showToast(`Please enter at least phone or email for ${type}`, 'error');
        return;
    }
    
    // Check for existing CIS with same phone or email
    const existingCIS = DataStore.cis.find(c => 
        (phone && c.phone === phone) || (email && c.email === email)
    );
    
    if (existingCIS) {
        const statusEl = document.getElementById(`${type}-cis-status`);
        statusEl.innerHTML = `<span style="color: #f59e0b;"><i class="fas fa-exclamation-triangle"></i> CIS already exists: <strong>${existingCIS.id}</strong></span>`;
        document.getElementById(`plot-${type}-cis-id`).value = existingCIS.id;
        UI.showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} CIS already exists: ${existingCIS.id}`, 'warning');
        return;
    }
    
    // Get plot information for context
    const plotNo = document.getElementById('plot-no').value;
    const city = document.getElementById('plot-city').value;
    const district = document.getElementById('plot-district').value;
    const development = document.getElementById('plot-development').value;
    
    // Build location string
    const locationParts = [city, district, development].filter(Boolean);
    const location = locationParts.join(', ');
    
    // Create CIS record
    const cisData = {
        name: name,
        date: new Date().toISOString().split('T')[0],
        phone: phone,
        email: email,
        nationality: nationality,
        budget: 0,
        plotType: document.getElementById('plot-type').value || '',
        location: location,
        source: 'Plot',
        status: 'New',
        notes: `${type.charAt(0).toUpperCase() + type.slice(1)} for Plot: ${plotNo}`,
        createLead: '',
        leadId: '',
        contactType: type // Mark as 'owner' or 'agent'
    };
    
    const newCIS = DataStore.addCIS(cisData);
    
    // Update hidden field with CIS ID
    document.getElementById(`plot-${type}-cis-id`).value = newCIS.id;
    
    // Update status display
    const statusEl = document.getElementById(`${type}-cis-status`);
    statusEl.innerHTML = `<span style="color: #10b981;"><i class="fas fa-check-circle"></i> CIS Created: <strong>${newCIS.id}</strong></span>`;
    
    // Refresh CIS table to show new record
    UI.refreshCISTable();
    
    UI.showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} CIS ${newCIS.id} created successfully!`, 'success');
    
    console.log(`✅ CIS created for ${type}:`, newCIS);
}

// Calculate plot financial values
function calculatePlotFinancials() {
    const totalPrice = parseFloat(document.getElementById('plot-total-price').value) || 0;
    const gfa = parseFloat(document.getElementById('plot-gfa').value);
    
    // Extract numeric value from GFA dropdown (e.g., "5,000 - 10,000 sqm" -> use midpoint)
    let gfaValue = 0;
    if (gfa) {
        const gfaStr = gfa.toString().replace(/,/g, '').replace(/ sqm/g, '');
        const match = gfaStr.match(/([0-9.]+)\s*-\s*([0-9.]+)/);
        if (match) {
            // Use midpoint of range
            gfaValue = (parseFloat(match[1]) + parseFloat(match[2])) / 2;
        } else {
            gfaValue = parseFloat(gfaStr.replace(/[<>\s]/g, '')) || 0;
        }
    }
    
    // Calculate Price per GFA
    const priceGfa = gfaValue > 0 ? totalPrice / gfaValue : 0;
    document.getElementById('plot-price-gfa').value = priceGfa > 0 ? priceGfa.toFixed(2) + ' AED/sqm' : '-';
}

// Location map for plot
let plotLocationMap = null;
let plotLocationMarker = null;

function initializePlotMap() {
    const mapContainer = document.getElementById('plot-location-map');
    if (!mapContainer) return;
    
    // Mark as active
    mapContainer.classList.add('active');
    
    // Initialize Leaflet map if not already initialized
    if (!plotLocationMap) {
        // Check visible fields first, then hidden fields, then default to Dubai
        const latVisible = parseFloat(document.getElementById('plot-lat-visible')?.value);
        const lngVisible = parseFloat(document.getElementById('plot-lng-visible')?.value);
        const latHidden = parseFloat(document.getElementById('plot-lat').value);
        const lngHidden = parseFloat(document.getElementById('plot-lng').value);
        
        const lat = !isNaN(latVisible) ? latVisible : (!isNaN(latHidden) ? latHidden : 25.2048);
        const lng = !isNaN(lngVisible) ? lngVisible : (!isNaN(lngHidden) ? lngHidden : 55.2708);
        
        console.log('🗺️ Initializing map with coordinates:', lat, lng);
        
        plotLocationMap = L.map(mapContainer).setView([lat, lng], 15);
        
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri',
            maxZoom: 19
        }).addTo(plotLocationMap);
        
        // Add click handler to set marker
        plotLocationMap.on('click', function(e) {
            setPlotLocation(e.latlng.lat, e.latlng.lng);
        });
        
        // If existing coordinates, add marker
        if ((!isNaN(latVisible) || !isNaN(latHidden)) && (!isNaN(lngVisible) || !isNaN(lngHidden))) {
            plotLocationMarker = L.marker([lat, lng], { draggable: true }).addTo(plotLocationMap);
            plotLocationMarker.on('dragend', function(e) {
                const marker = e.target;
                const position = marker.getLatLng();
                setPlotLocation(position.lat, position.lng);
            });
        }
        
        // Initialize sync between visible and hidden fields
        initPlotLocationSync();
    } else {
        // Invalidate size to fix rendering
        setTimeout(() => {
            plotLocationMap.invalidateSize();
        }, 100);
    }
}

function setPlotLocation(lat, lng) {
    // Update both hidden and visible fields
    document.getElementById('plot-lat').value = lat.toFixed(6);
    document.getElementById('plot-lng').value = lng.toFixed(6);
    
    const latVisible = document.getElementById('plot-lat-visible');
    const lngVisible = document.getElementById('plot-lng-visible');
    if (latVisible) latVisible.value = lat.toFixed(6);
    if (lngVisible) lngVisible.value = lng.toFixed(6);
    
    // Remove existing marker
    if (plotLocationMarker) {
        plotLocationMap.removeLayer(plotLocationMarker);
    }
    
    // Add new marker
    plotLocationMarker = L.marker([lat, lng], { draggable: true }).addTo(plotLocationMap);
    plotLocationMarker.bindPopup(`<b>Plot Location</b><br>Lat: ${lat.toFixed(6)}<br>Lng: ${lng.toFixed(6)}`).openPopup();
    plotLocationMarker.on('dragend', function(e) {
        const marker = e.target;
        const position = marker.getLatLng();
        // Update both hidden and visible fields
        document.getElementById('plot-lat').value = position.lat.toFixed(6);
        document.getElementById('plot-lng').value = position.lng.toFixed(6);
        if (latVisible) latVisible.value = position.lat.toFixed(6);
        if (lngVisible) lngVisible.value = position.lng.toFixed(6);
    });
    
    // Pan to location
    plotLocationMap.setView([lat, lng], 15);
    
    console.log('📍 Plot location set:', lat.toFixed(6), lng.toFixed(6));
    UI.showToast('Location set successfully!', 'success');
}

function generatePlotID() {
    const plotNo = document.getElementById('plot-no').value;
    if (plotNo && !document.getElementById('plot-id-hidden').value) {
        // ID will be auto-generated on save
    }
}

function savePlot() {
    const id = document.getElementById('plot-id-hidden').value;
    const existingPlot = id ? DataStore.plots.find(p => p.id === id) : null;

    // Get files from FileManager
    const files = FileManager.getFilesForSave();

    const data = {
        plotNo: document.getElementById('plot-no').value,
        city: document.getElementById('plot-city').value,
        district: document.getElementById('plot-district').value,
        development: document.getElementById('plot-development').value,
        zone: document.getElementById('plot-zone').value,
        plotType: document.getElementById('plot-type').value,
        plotFor: document.getElementById('plot-for')?.value || '',
        zoning: document.getElementById('plot-zoning').value,
        gfa: document.getElementById('plot-gfa').value,
        nfa: document.getElementById('plot-nfa').value,
        bua: document.getElementById('plot-bua').value,
        far: document.getElementById('plot-far').value,
        height: document.getElementById('plot-height').value,
        size: document.getElementById('plot-size').value,
        view: document.getElementById('plot-view').value,
        status: document.getElementById('plot-status').value,
        handoverDate: document.getElementById('plot-handover').value,
        website: document.getElementById('plot-website').value,
        // Financial details
        totalPrice: parseFloat(document.getElementById('plot-total-price').value) || 0,
        priceGfa: document.getElementById('plot-price-gfa').value,
        source: document.getElementById('plot-source').value,
        // Owner contact
        ownerName: document.getElementById('plot-owner-name').value,
        ownerPhone: document.getElementById('plot-owner-phone').value,
        ownerEmail: document.getElementById('plot-owner-email').value,
        ownerNationality: document.getElementById('plot-owner-nationality').value,
        // Agent contact
        agentName: document.getElementById('plot-agent-name').value,
        agentPhone: document.getElementById('plot-agent-phone').value,
        agentEmail: document.getElementById('plot-agent-email').value,
        agentNationality: document.getElementById('plot-agent-nationality').value,
        // CIS IDs for owner and agent
        ownerCisId: document.getElementById('plot-owner-cis-id').value || '',
        agentCisId: document.getElementById('plot-agent-cis-id').value || '',
        // Location
        lat: parseFloat(document.getElementById('plot-lat').value) || 0,
        lng: parseFloat(document.getElementById('plot-lng').value) || 0,
        linkedDeal: document.getElementById('plot-linked-deal').value,
        notes: document.getElementById('plot-notes').value,
        areaUnit: document.getElementById('plot-area-unit')?.value || 'sqm',
        // File attachments
        images: files.images,
        documents: files.documents,
        createdDate: existingPlot ? existingPlot.createdDate : new Date().toISOString().split('T')[0],
        createdBy: existingPlot ? existingPlot.createdBy : 'Admin',
        modifiedDate: new Date().toISOString().split('T')[0],
        modifiedBy: 'Admin',
        // Generate random coordinates near Dubai for new plots, keep existing for edits
        lat: existingPlot ? existingPlot.lat : generateRandomDubaiLat(),
        lng: existingPlot ? existingPlot.lng : generateRandomDubaiLng()
    };

    if (!data.plotNo) {
        alert('Plot No is required!');
        return;
    }

    if (id) {
        DataStore.updatePlot(id, data);
    } else {
        DataStore.addPlot(data);
    }

    closeModal('plot-modal');
    UI.refreshPlotsTable();
    UI.refreshDashboard();
    UI.showToast(id ? 'Plot updated successfully!' : 'Plot created successfully!');
}

// Helper functions to generate random coordinates in Dubai area
function generateRandomDubaiLat() {
    // Dubai latitude range: ~25.0 to 25.3
    return 25.0 + Math.random() * 0.3;
}

function generateRandomDubaiLng() {
    // Dubai longitude range: ~55.0 to 55.4
    return 55.0 + Math.random() * 0.4;
}

function editPlot(id) {
    const plot = DataStore.plots.find(p => p.id === id);
    if (!plot) return;

    document.getElementById('plot-modal-title').textContent = 'Edit Plot';
    document.getElementById('plot-id-hidden').value = plot.id;
    document.getElementById('plot-no').value = plot.plotNo;
    document.getElementById('plot-city').value = plot.city || '';
    document.getElementById('plot-district').value = plot.district || '';
    document.getElementById('plot-development').value = plot.development || '';
    document.getElementById('plot-zone').value = plot.zone || '';
    document.getElementById('plot-type').value = plot.plotType || '';
    if (document.getElementById('plot-for')) document.getElementById('plot-for').value = plot.plotFor || '';
    document.getElementById('plot-zoning').value = plot.zoning || '';
    document.getElementById('plot-gfa').value = plot.gfa || '';
    document.getElementById('plot-nfa').value = plot.nfa || '';
    document.getElementById('plot-bua').value = plot.bua || '';
    document.getElementById('plot-far').value = plot.far || '';
    document.getElementById('plot-height').value = plot.height || '';
    document.getElementById('plot-size').value = plot.size || '';
    document.getElementById('plot-view').value = plot.view || '';
    document.getElementById('plot-status').value = plot.status || 'Available';
    document.getElementById('plot-handover').value = plot.handoverDate || '';
    document.getElementById('plot-website').value = plot.website || '';
    // Financial details
    document.getElementById('plot-total-price').value = plot.totalPrice || '';
    document.getElementById('plot-price-gfa').value = plot.priceGfa || '';
    document.getElementById('plot-source').value = plot.source || '';
    // Owner contact
    document.getElementById('plot-owner-name').value = plot.ownerName || '';
    document.getElementById('plot-owner-phone').value = plot.ownerPhone || '';
    document.getElementById('plot-owner-email').value = plot.ownerEmail || '';
    document.getElementById('plot-owner-nationality').value = plot.ownerNationality || '';
    // Agent contact
    document.getElementById('plot-agent-name').value = plot.agentName || '';
    document.getElementById('plot-agent-phone').value = plot.agentPhone || '';
    document.getElementById('plot-agent-email').value = plot.agentEmail || '';
    document.getElementById('plot-agent-nationality').value = plot.agentNationality || '';
    
    // Load CIS IDs and display status
    document.getElementById('plot-owner-cis-id').value = plot.ownerCisId || '';
    document.getElementById('plot-agent-cis-id').value = plot.agentCisId || '';
    
    // Show CIS status if they exist
    if (plot.ownerCisId) {
        const ownerStatusEl = document.getElementById('owner-cis-status');
        ownerStatusEl.innerHTML = `<span style="color: #10b981;"><i class="fas fa-check-circle"></i> CIS Linked: <strong>${plot.ownerCisId}</strong></span>`;
    } else {
        const ownerStatusEl = document.getElementById('owner-cis-status');
        ownerStatusEl.innerHTML = '';
    }
    
    if (plot.agentCisId) {
        const agentStatusEl = document.getElementById('agent-cis-status');
        agentStatusEl.innerHTML = `<span style="color: #10b981;"><i class="fas fa-check-circle"></i> CIS Linked: <strong>${plot.agentCisId}</strong></span>`;
    } else {
        const agentStatusEl = document.getElementById('agent-cis-status');
        agentStatusEl.innerHTML = '';
    }
    
    // Location
    document.getElementById('plot-lat').value = plot.lat || '';
    document.getElementById('plot-lng').value = plot.lng || '';
    
    // Also populate visible fields
    const latVisible = document.getElementById('plot-lat-visible');
    const lngVisible = document.getElementById('plot-lng-visible');
    if (latVisible) latVisible.value = plot.lat || '';
    if (lngVisible) lngVisible.value = plot.lng || '';
    
    document.getElementById('plot-linked-deal').value = plot.linkedDeal || '';
    document.getElementById('plot-notes').value = plot.notes || '';

    if (document.getElementById('plot-area-unit')) {
        document.getElementById('plot-area-unit').value = plot.areaUnit || 'sqm';
        ['plot-gfa','plot-nfa','plot-bua','plot-size'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.dataset.lastUnit = plot.areaUnit || 'sqm';
        });
    }

    // Load existing files
    FileManager.loadFiles(plot);
    FileManager.init();
    
    // Populate and set linked deal
    populateLinkedDealDropdown();
    document.getElementById('plot-linked-deal').value = plot.linkedDeal || '';

    openModal('plot-modal');
    
    // Initialize map if coordinates exist
    if (plot.lat && plot.lng) {
        setTimeout(() => {
            initializePlotMap();
        }, 300);
    }
    // Wire up and trigger Smart Area Research for edit mode
    researchDismissed = false;
    var locationFields = ['plot-city', 'plot-district', 'plot-development', 'plot-zone'];
    locationFields.forEach(function(fieldId) {
        var el = document.getElementById(fieldId);
        if (el) {
            el.addEventListener('input', triggerAreaResearch);
            el.addEventListener('change', triggerAreaResearch);
        }
    });
    setTimeout(triggerAreaResearch, 500);
}

function deletePlot(id) {
    console.log('Delete plot clicked, ID:', id);
    if (confirm('Are you sure you want to delete this plot?')) {
        console.log('Deleting plot...');
        DataStore.deletePlot(id);
        UI.refreshPlotsTable();
        UI.refreshDashboard();
        UI.showToast('Plot deleted successfully!');
        console.log('Plot deleted');
    }
}

// Toggle all plots selection
function toggleAllPlots(checked) {
    const checkboxes = document.querySelectorAll('.plot-checkbox');
    checkboxes.forEach(cb => cb.checked = checked);
    updatePlotSelection();
}

// Update plot selection count and show/hide bulk delete button
function updatePlotSelection() {
    const checkboxes = document.querySelectorAll('.plot-checkbox:checked');
    const count = checkboxes.length;
    const bulkDeleteBtn = document.getElementById('bulk-delete-plots-btn');
    const countSpan = document.getElementById('selected-plots-count');
    
    if (countSpan) {
        countSpan.textContent = count;
    }
    
    if (bulkDeleteBtn) {
        if (count > 0) {
            bulkDeleteBtn.style.display = 'inline-flex';
        } else {
            bulkDeleteBtn.style.display = 'none';
        }
    }
}

// Bulk delete selected plots
function bulkDeletePlots() {
    const checkboxes = document.querySelectorAll('.plot-checkbox:checked');
    const selectedIds = Array.from(checkboxes).map(cb => cb.value);
    
    if (selectedIds.length === 0) {
        UI.showToast('No plots selected', 'warning');
        return;
    }
    
    const confirmed = confirm(`Are you sure you want to delete ${selectedIds.length} plot(s)? This action cannot be undone.`);
    
    if (confirmed) {
        console.log('Bulk deleting plots:', selectedIds);
        
        // Delete each selected plot
        selectedIds.forEach(id => {
            DataStore.deletePlot(id);
        });
        
        UI.refreshPlotsTable();
        UI.refreshDashboard();
        UI.showToast(`${selectedIds.length} plot(s) deleted successfully!`);
        console.log(`${selectedIds.length} plots deleted`);
    }
}

// Follow-up Functions
function refreshFollowUps() {
    UI.refreshFollowUpTable();
    UI.showToast('Follow-ups refreshed!');
}

function markContacted(leadId) {
    const lead = DataStore.leads.find(l => l.id === leadId);
    if (lead) {
        lead.lastContact = new Date().toISOString().split('T')[0];
        lead.daysSinceContact = 0;
        DataStore.saveToStorage();
        UI.refreshFollowUpTable();
        UI.showToast('Lead marked as contacted!');
    }
}

// Sync Functions
function syncAllData() {
    // Recalculate all derived values
    DataStore.leads.forEach(lead => {
        if (lead.lastContact) {
            const days = Math.floor((new Date() - new Date(lead.lastContact)) / (1000 * 60 * 60 * 24));
            lead.daysSinceContact = days;
        }
    });

    DataStore.saveToStorage();
    UI.refreshAll();
    UI.showToast('All data synchronized successfully!');
}

// Export/Import Functions
function exportData() {
    const data = {
        cis: DataStore.cis,
        leads: DataStore.leads,
        deals: DataStore.deals,
        plots: DataStore.plots,
        exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aiplot_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    UI.showToast('Data exported successfully!');
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (data.cis) DataStore.cis = data.cis;
                if (data.leads) DataStore.leads = data.leads;
                if (data.deals) DataStore.deals = data.deals;
                if (data.plots) DataStore.plots = data.plots;
                DataStore.saveToStorage();
                UI.refreshAll();
                UI.showToast('Data imported successfully!');
            } catch (err) {
                alert('Invalid file format!');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// ============================================================================
// Authentication Functions
// ============================================================================

function performLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const role = document.getElementById('login-role').value;

    if (!email || !password) {
        alert('Please enter email and password');
        return;
    }

    Auth.login(email, password, role);
}

function loginAsGuest() {
    Auth.loginAsGuest();
}

function showLoginModal() {
    openModal('login-modal');
}

function logout() {
    Auth.logout();
}

function toggleMobileMenu() {
    const navMenu = document.querySelector('.nav-menu');
    navMenu.classList.toggle('open');
}

// ============================================================================
// Admin Functions
// ============================================================================

function openAddUserModal() {
    // Simple prompt for demo - can be enhanced to a full modal
    const name = prompt('Enter agent name:');
    if (!name) return;
    
    const email = prompt('Enter agent email:');
    if (!email) return;
    
    const password = prompt('Enter temporary password:');
    if (!password) return;
    
    const role = confirm('Make this user an admin?\n\nOK = Admin\nCancel = Agent') ? 'admin' : 'agent';
    
    const newUser = Auth.addUser(name, email, password, role);
    UI.showToast(`User ${newUser.name} created successfully!`);
    
    // Refresh admin users table
    refreshAdminUsersTable();
}

// ============================================================================
// AI FEATURES - Location Info & Chat
// ============================================================================

// AI Location Database
const AILocationDB = {
    'downtown dubai': {
        overview: 'Downtown Dubai is the city\'s most prestigious address, home to iconic landmarks and luxury living.',
        avgPrice: 'AED 2,500 - 3,200 per sqft',
        trend: '+15% year-over-year growth',
        investment: 5,
        nearby: ['Burj Khalifa (0.5km)', 'Dubai Mall (0.3km)', 'Dubai Fountain (0.2km)', 'Metro Station (0.4km)'],
        insights: 'High demand area with strong rental yields (7-8%). Premium location with excellent capital appreciation.'
    },
    'dubai marina': {
        overview: 'Dubai Marina offers waterfront living with a vibrant community and stunning skyline views.',
        avgPrice: 'AED 1,800 - 2,400 per sqft',
        trend: '+12% year-over-year growth',
        investment: 4,
        nearby: ['Marina Walk (0.2km)', 'JBR Beach (1km)', 'Metro Station (0.5km)', 'Marina Mall (0.3km)'],
        insights: 'Popular among expats with strong rental demand. Good ROI potential with 6-7% rental yields.'
    },
    'business bay': {
        overview: 'Business Bay is Dubai\'s central business district with modern towers and canal views.',
        avgPrice: 'AED 1,600 - 2,100 per sqft',
        trend: '+10% year-over-year growth',
        investment: 4,
        nearby: ['Dubai Canal (0.1km)', 'Burj Khalifa (2km)', 'Metro Station (0.6km)', 'Business Bay Mall (0.4km)'],
        insights: 'Growing commercial hub with increasing residential demand. Good for both investment and end-use.'
    },
    'palm jumeirah': {
        overview: 'Palm Jumeirah is an iconic man-made island offering exclusive beachfront villas and apartments.',
        avgPrice: 'AED 3,000 - 4,500 per sqft',
        trend: '+18% year-over-year growth',
        investment: 5,
        nearby: ['Atlantis The Palm (1km)', 'Nakheel Mall (2km)', 'Private Beach (0.1km)', 'Monorail Station (0.5km)'],
        insights: 'Ultra-premium location with limited supply. Excellent for luxury investments with high appreciation.'
    },
    'jvc': {
        overview: 'Jumeirah Village Circle is a family-friendly community with affordable housing options.',
        avgPrice: 'AED 850 - 1,200 per sqft',
        trend: '+8% year-over-year growth',
        investment: 3,
        nearby: ['Circle Mall (0.5km)', 'Parks (0.2km)', 'Schools (1km)', 'Supermarkets (0.3km)'],
        insights: 'Affordable entry point with good rental yields (8-9%). Popular among families and young professionals.'
    },
    'dubai hills': {
        overview: 'Dubai Hills Estate is a master-planned community with golf course and park views.',
        avgPrice: 'AED 1,400 - 1,900 per sqft',
        trend: '+11% year-over-year growth',
        investment: 4,
        nearby: ['Dubai Hills Mall (0.8km)', 'Golf Course (0.3km)', 'Central Park (0.5km)', 'Schools (1km)'],
        insights: 'Premium community with excellent amenities. Strong demand from families with good appreciation potential.'
    },
    'deira': {
        overview: 'Deira is one of Dubai\'s oldest commercial districts with traditional souks and affordable housing.',
        avgPrice: 'AED 600 - 900 per sqft',
        trend: '+5% year-over-year growth',
        investment: 3,
        nearby: ['Gold Souk (0.5km)', 'Spice Souk (0.7km)', 'Metro Station (0.3km)', 'Creek Park (1km)'],
        insights: 'Budget-friendly option with steady rental demand. Good for long-term holds with stable returns.'
    },
    'sharjah': {
        overview: 'Sharjah offers affordable living with cultural attractions and family-oriented communities.',
        avgPrice: 'AED 400 - 700 per sqft',
        trend: '+4% year-over-year growth',
        investment: 2,
        nearby: ['Al Majaz Waterfront (1km)', 'University City (2km)', 'Sharjah Airport (5km)', 'Mosques (0.5km)'],
        insights: 'Most affordable option near Dubai. Good for budget-conscious buyers with moderate appreciation.'
    }
};

// Show AI Location Information
function showAILocationInfo(location) {
    const popup = document.getElementById('ai-location-popup');
    const body = document.getElementById('ai-location-body');
    
    if (!popup || !body) return;
    
    const locationKey = location.toLowerCase().trim();
    const data = AILocationDB[locationKey];
    
    if (!data) {
        body.innerHTML = `
            <div class="ai-info-section">
                <h4><i class="fas fa-info-circle"></i> Location: ${location}</h4>
                <p>No specific data available for this location. Contact our team for detailed information.</p>
                <p style="margin-top: 12px;"><strong>Tip:</strong> Try locations like: Downtown Dubai, Dubai Marina, Business Bay, Palm Jumeirah, JVC, Dubai Hills</p>
            </div>
        `;
    } else {
        const stars = Array(5).fill(0).map((_, i) => 
            `<i class="fas fa-star" style="opacity: ${i < data.investment ? 1 : 0.3}"></i>`
        ).join('');
        
        body.innerHTML = `
            <div class="ai-info-section">
                <h4><i class="fas fa-map-marker-alt"></i> Overview</h4>
                <p>${data.overview}</p>
            </div>
            
            <div class="ai-info-section">
                <h4><i class="fas fa-money-bill-wave"></i> Pricing</h4>
                <div class="ai-price-grid">
                    <div class="ai-price-item">
                        <div class="price-value">${data.avgPrice.split('-')[0]}</div>
                        <div class="price-label">Starting Price</div>
                    </div>
                    <div class="ai-price-item">
                        <div class="price-value">${data.avgPrice.split('-')[1] || data.avgPrice}</div>
                        <div class="price-label">Premium Price</div>
                    </div>
                </div>
                <p style="margin-top: 12px;"><strong>Market Trend:</strong> ${data.trend}</p>
            </div>
            
            <div class="ai-info-section">
                <h4><i class="fas fa-building"></i> Nearby Amenities</h4>
                <ul style="margin: 8px 0; padding-left: 20px; line-height: 1.8;">
                    ${data.nearby.map(item => `<li>${item}</li>`).join('')}
                </ul>
            </div>
            
            <div class="ai-info-section">
                <h4><i class="fas fa-chart-line"></i> Investment Rating</h4>
                <div class="ai-rating">${stars}</div>
                <p style="margin-top: 12px;">${data.insights}</p>
            </div>
        `;
    }
    
    popup.classList.add('active');
}

function closeAILocationPopup() {
    const popup = document.getElementById('ai-location-popup');
    if (popup) {
        popup.classList.remove('active');
    }
}

// AI Chat Functions
function toggleAIChat() {
    const chatWindow = document.getElementById('ai-chat-window');
    chatWindow.classList.toggle('active');
}

// Refresh AI Insights
function refreshAIInsights() {
    UI.generateAIInsights();
}
window.refreshAIInsights = refreshAIInsights;

// Update Hero Stats
UI.updateHeroStats = function() {
    const activeDeals = DataStore.deals.filter(d => d.status === 'Active').length;
    const totalLeads = DataStore.leads.length;
    const totalDeals = DataStore.deals.length;
    const conversionRate = totalLeads > 0 ? ((totalDeals / totalLeads) * 100).toFixed(1) : 0;
    const pipelineValue = DataStore.deals
        .filter(d => d.status === 'Active')
        .reduce((sum, d) => sum + (parseFloat(d.finalPrice) || parseFloat(d.totalPrice) || 0), 0);
    
    const heroDeals = document.getElementById('hero-total-deals');
    const heroRate = document.getElementById('hero-conversion-rate');
    const heroValue = document.getElementById('hero-pipeline-value');
    
    if (heroDeals) heroDeals.textContent = activeDeals;
    if (heroRate) heroRate.textContent = conversionRate + '%';
    if (heroValue) heroValue.textContent = 'AED ' + (pipelineValue / 1000000).toFixed(1) + 'M';
};

// Onboarding Modal
function showOnboardingModal() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'onboarding-modal';
    modal.innerHTML = `
        <div class="modal-content large">
            <div class="modal-header" style="background: linear-gradient(135deg, #1e3a8a, #3b82f6); color: white;">
                <h3 style="color: white;"><i class="fas fa-rocket"></i> Welcome to AI Plot CRM!</h3>
                <button class="btn-close" onclick="closeModal('onboarding-modal')" style="color: white;">&times;</button>
            </div>
            <div class="modal-body">
                <div class="onboarding-steps">
                    <div class="onboarding-step active" data-step="1">
                        <div class="step-number">1</div>
                        <h4>Add Your First Client</h4>
                        <p>Start by creating a CIS (Customer Information System) record to track your clients.</p>
                        <button class="btn-primary" onclick="UI.navigateTo('cis'); closeModal('onboarding-modal');">
                            <i class="fas fa-user-plus"></i> Add Client
                        </button>
                    </div>
                    <div class="onboarding-step" data-step="2">
                        <div class="step-number">2</div>
                        <h4>Import Leads</h4>
                        <p>Upload your existing leads from Excel or CSV files to get started quickly.</p>
                        <button class="btn-primary" onclick="openFileImportModal(); closeModal('onboarding-modal');">
                            <i class="fas fa-file-import"></i> Import Leads
                        </button>
                    </div>
                    <div class="onboarding-step" data-step="3">
                        <div class="step-number">3</div>
                        <h4>Browse Available Plots</h4>
                        <p>Explore your plot inventory and link them to leads and deals.</p>
                        <button class="btn-primary" onclick="UI.navigateTo('plots'); closeModal('onboarding-modal');">
                            <i class="fas fa-map-marked-alt"></i> View Plots
                        </button>
                    </div>
                    <div class="onboarding-step" data-step="4">
                        <div class="step-number">4</div>
                        <h4>Track Your Progress</h4>
                        <p>Monitor your performance with AI-powered insights and analytics.</p>
                        <button class="btn-primary" onclick="closeModal('onboarding-modal');">
                            <i class="fas fa-chart-line"></i> View Dashboard
                        </button>
                    </div>
                </div>
                <div class="onboarding-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 25%;"></div>
                    </div>
                    <p style="text-align: center; margin-top: 10px; color: #64748b;">Step 1 of 4</p>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

window.showOnboardingModal = showOnboardingModal;

// Mobile Sidebar Toggle
function toggleMobileSidebar() {
    const sidebar = document.getElementById('vertical-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}
window.toggleMobileSidebar = toggleMobileSidebar;

function handleAIChatInput(event) {
    if (event.key === 'Enter') {
        sendAIMessage();
    }
}

function sendAIMessage() {
    const input = document.getElementById('ai-chat-input-field');
    const messages = document.getElementById('ai-chat-messages');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message
    const userMsg = document.createElement('div');
    userMsg.className = 'ai-message ai-user-message';
    userMsg.innerHTML = `
        <div class="ai-message-icon"><i class="fas fa-user"></i></div>
        <div class="ai-message-content"><p>${message}</p></div>
    `;
    messages.appendChild(userMsg);
    
    input.value = '';
    messages.scrollTop = messages.scrollHeight;
    
    // Show typing indicator
    const typingMsg = document.createElement('div');
    typingMsg.className = 'ai-message ai-bot-message';
    typingMsg.id = 'ai-typing-indicator';
    typingMsg.innerHTML = `
        <div class="ai-message-icon"><i class="fas fa-robot"></i></div>
        <div class="ai-message-content">
            <p><em>🤖 Thinking...</em></p>
        </div>
    `;
    messages.appendChild(typingMsg);
    messages.scrollTop = messages.scrollHeight;
    
    // Generate AI response with delay for realism
    setTimeout(() => {
        // Remove typing indicator
        const typing = document.getElementById('ai-typing-indicator');
        if (typing) typing.remove();
        
        const response = generateAIResponse(message);
        const botMsg = document.createElement('div');
        botMsg.className = 'ai-message ai-bot-message';
        botMsg.innerHTML = `
            <div class="ai-message-icon"><i class="fas fa-robot"></i></div>
            <div class="ai-message-content"><p>${response}</p></div>
        `;
        messages.appendChild(botMsg);
        messages.scrollTop = messages.scrollHeight;
    }, 800 + Math.random() * 700); // Random delay 0.8-1.5s
}

function generateAIResponse(message) {
    const msg = message.toLowerCase();
    
    // Greeting queries
    if (msg.match(/^(hi|hello|hey|good morning|good afternoon|good evening)/)) {
        return '👋 Hello! Welcome to AI Plot Assistant!<br><br>' +
               'I can help you with:<br>' +
               '• 📍 Location information (Downtown, Marina, Palm, etc.)<br>' +
               '• 💰 Property prices and trends<br>' +
               '• 📊 Investment recommendations<br>' +
               '• 🏗️ Area comparisons<br>' +
               '• 🏘️ Community details<br>' +
               '• 📈 Market analysis<br><br>' +
               'What would you like to know?';
    }
    
    // Thank you queries
    if (msg.includes('thank') || msg.includes('thanks')) {
        return '😊 You\'re welcome! Feel free to ask me anything about Dubai real estate. I\'m here to help!';
    }
    
    // Location queries - Extended database
    const locations = {
        'downtown': {
            name: 'Downtown Dubai',
            price: 'AED 2,500-3,200/sqft',
            trend: '+15% YoY',
            rating: 5,
            roi: '7-8% rental yield',
            best: 'Luxury living, high ROI, premium location',
            landmarks: 'Burj Khalifa, Dubai Mall, Dubai Fountain, Opera District',
            description: 'The most prestigious address in Dubai with iconic landmarks'
        },
        'marina': {
            name: 'Dubai Marina',
            price: 'AED 1,800-2,400/sqft',
            trend: '+12% YoY',
            rating: 4,
            roi: '6-7% rental yield',
            best: 'Waterfront living, expat community, vibrant nightlife',
            landmarks: 'Marina Walk, JBR Beach, Marina Mall, Yacht Club',
            description: 'Waterfront community with stunning skyline views'
        },
        'palm': {
            name: 'Palm Jumeirah',
            price: 'AED 3,000-4,500/sqft',
            trend: '+18% YoY',
            rating: 5,
            roi: '5-6% rental yield',
            best: 'Ultra-luxury, exclusivity, beachfront living',
            landmarks: 'Atlantis The Palm, Nakheel Mall, Private Beaches, Monorail',
            description: 'Iconic man-made island with exclusive beachfront properties'
        },
        'jvc': {
            name: 'Jumeirah Village Circle (JVC)',
            price: 'AED 850-1,200/sqft',
            trend: '+8% YoY',
            rating: 3,
            roi: '8-9% rental yield',
            best: 'Affordable investment, family-friendly, high ROI',
            landmarks: 'Circle Mall, Parks, Schools, Supermarkets',
            description: 'Affordable family community with excellent rental yields'
        },
        'business bay': {
            name: 'Business Bay',
            price: 'AED 1,600-2,100/sqft',
            trend: '+10% YoY',
            rating: 4,
            roi: '6-7% rental yield',
            best: 'Professionals, canal views, business hub',
            landmarks: 'Dubai Canal, Burj Khalifa view, Metro Station, Business Bay Mall',
            description: 'Central business district with modern towers and canal views'
        },
        'dubai hills': {
            name: 'Dubai Hills Estate',
            price: 'AED 1,400-1,900/sqft',
            trend: '+11% YoY',
            rating: 4,
            roi: '7% rental yield',
            best: 'Families, golf course, park views',
            landmarks: 'Dubai Hills Mall, Golf Course, Central Park, Schools',
            description: 'Master-planned community with golf course and park views'
        },
        'deira': {
            name: 'Deira',
            price: 'AED 600-900/sqft',
            trend: '+5% YoY',
            rating: 3,
            roi: '8-10% rental yield',
            best: 'Budget-friendly, traditional souks, affordable housing',
            landmarks: 'Gold Souk, Spice Souk, Creek Park, Metro Station',
            description: 'Historic commercial district with traditional markets'
        },
        'sharjah': {
            name: 'Sharjah',
            price: 'AED 400-700/sqft',
            trend: '+4% YoY',
            rating: 2,
            roi: '7-9% rental yield',
            best: 'Most affordable, family-oriented, cultural',
            landmarks: 'Al Majaz Waterfront, University City, Sharjah Airport',
            description: 'Affordable emirate near Dubai with cultural attractions'
        },
        'jlt': {
            name: 'Jumeirah Lake Towers (JLT)',
            price: 'AED 1,300-1,800/sqft',
            trend: '+9% YoY',
            rating: 4,
            roi: '7-8% rental yield',
            best: 'Professionals, lake views, affordable marina alternative',
            landmarks: 'Cluster Towers, Lakes, Metro Station, Retail Centers',
            description: 'Freehold community with 80+ towers around artificial lakes'
        },
        'sports city': {
            name: 'Dubai Sports City',
            price: 'AED 750-1,100/sqft',
            trend: '+7% YoY',
            rating: 3,
            roi: '8% rental yield',
            best: 'Sports enthusiasts, affordable, family community',
            landmarks: 'ICC Academy, Golf Club, Stadium, Sports Retail',
            description: 'Sports-themed community with world-class facilities'
        },
        'dubailand': {
            name: 'Dubailand',
            price: 'AED 700-1,000/sqft',
            trend: '+6% YoY',
            rating: 3,
            roi: '7-8% rental yield',
            best: 'Future growth, affordable, family villas',
            landmarks: 'Theme Parks (planned), Residential Communities, Parks',
            description: 'Massive entertainment and residential development'
        }
    };
    
    // Check for location matches
    for (const [key, data] of Object.entries(locations)) {
        if (msg.includes(key)) {
            const stars = '⭐'.repeat(data.rating);
            return `📍 <strong>${data.name}</strong><br><br>` +
                   `<em>${data.description}</em><br><br>` +
                   `💰 <strong>Price:</strong> ${data.price}<br>` +
                   `📈 <strong>Trend:</strong> ${data.trend}<br>` +
                   `⭐ <strong>Rating:</strong> ${stars}<br>` +
                   `💵 <strong>Rental Yield:</strong> ${data.roi}<br>` +
                   `🎯 <strong>Best For:</strong> ${data.best}<br>` +
                   `🏛️ <strong>Landmarks:</strong> ${data.landmarks}<br><br>` +
                   `Would you like to compare this with another area?`;
        }
    }
    
    // Price queries
    if (msg.includes('price') || msg.includes('cost') || msg.includes('how much') || msg.includes('rates')) {
        return '💰 <strong>Dubai Real Estate Prices (2024):</strong><br><br>' +
               '🏆 <strong>Premium Areas:</strong><br>' +
               '• Palm Jumeirah: AED 3,000-4,500/sqft<br>' +
               '• Downtown Dubai: AED 2,500-3,200/sqft<br>' +
               '• Dubai Marina: AED 1,800-2,400/sqft<br><br>' +
               '📊 <strong>Mid-Range Areas:</strong><br>' +
               '• Business Bay: AED 1,600-2,100/sqft<br>' +
               '• Dubai Hills: AED 1,400-1,900/sqft<br>' +
               '• JLT: AED 1,300-1,800/sqft<br><br>' +
               '💵 <strong>Affordable Areas:</strong><br>' +
               '• JVC: AED 850-1,200/sqft<br>' +
               '• Sports City: AED 750-1,100/sqft<br>' +
               '• Deira: AED 600-900/sqft<br>' +
               '• Sharjah: AED 400-700/sqft<br><br>' +
               'Which area interests you? I can provide detailed insights!';
    }
    
    // Investment queries
    if (msg.includes('invest') || msg.includes('best') || msg.includes('recommend') || msg.includes('advice')) {
        return '📊 <strong>Top Investment Recommendations (2024):</strong><br><br>' +
               '🥇 <strong>Best Appreciation:</strong><br>' +
               '1. Palm Jumeirah (+18% YoY)<br>' +
               '2. Downtown Dubai (+15% YoY)<br>' +
               '3. Dubai Marina (+12% YoY)<br><br>' +
               '💰 <strong>Best Rental Yields:</strong><br>' +
               '1. JVC (8-9%)<br>' +
               '2. Deira (8-10%)<br>' +
               '3. Sports City (8%)<br><br>' +
               '🏆 <strong>Best Overall ROI:</strong><br>' +
               '• JVC - Affordable entry + high yields<br>' +
               '• Dubai Marina - Strong demand + appreciation<br>' +
               '• Business Bay - Growing hub + good returns<br><br>' +
               'What\'s your budget? I can suggest the best option!';
    }
    
    // Comparison queries
    if (msg.includes('compare') || msg.includes('vs') || msg.includes('versus') || msg.includes('difference')) {
        return '🔄 <strong>Popular Area Comparisons:</strong><br><br>' +
               '📍 <strong>Downtown vs Marina:</strong><br>' +
               '• Downtown: More expensive, iconic landmarks, +15% growth<br>' +
               '• Marina: Better value, waterfront lifestyle, +12% growth<br><br>' +
               '📍 <strong>Palm vs JVC:</strong><br>' +
               '• Palm: Ultra-luxury (AED 3,000-4,500), exclusive<br>' +
               '• JVC: Affordable (AED 850-1,200), high ROI<br><br>' +
               '📍 <strong>Business Bay vs Dubai Hills:</strong><br>' +
               '• Business Bay: Urban living, professionals, canal views<br>' +
               '• Dubai Hills: Family community, golf course, parks<br><br>' +
               'Which areas would you like me to compare in detail?';
    }
    
    // Market trends
    if (msg.includes('trend') || msg.includes('market') || msg.includes('growth') || msg.includes('future')) {
        return '📈 <strong>Dubai Real Estate Market Trends 2024:</strong><br><br>' +
               '✅ <strong>Market Overview:</strong><br>' +
               '• Overall Growth: +10-12% across Dubai<br>' +
               '• Transaction Volume: Up 25% vs 2023<br>' +
               '• Foreign Investment: Record levels<br><br>' +
               '🏆 <strong>Top Performing Areas:</strong><br>' +
               '• Palm Jumeirah: +18% (Luxury demand)<br>' +
               '• Downtown Dubai: +15% (Prime location)<br>' +
               '• Dubai Marina: +12% (Expat demand)<br><br>' +
               '🔮 <strong>2024-2025 Outlook:</strong><br>' +
               '• Continued growth expected<br>' +
               '• Expo legacy projects boosting demand<br>' +
               '• New visa policies attracting investors<br>' +
               '• Infrastructure developments in progress<br><br>' +
               'Interested in specific area trends?';
    }
    
    // Rental yield queries
    if (msg.includes('rental') || msg.includes('yield') || msg.includes('rent')) {
        return '💵 <strong>Rental Yields by Area (2024):</strong><br><br>' +
               '🏆 <strong>Highest Yields:</strong><br>' +
               '• Deira: 8-10% (Budget-friendly)<br>' +
               '• JVC: 8-9% (Family community)<br>' +
               '• Sports City: 8% (Affordable)<br>' +
               '• JLT: 7-8% (Professional tenants)<br><br>' +
               '📊 <strong>Mid-Range Yields:</strong><br>' +
               '• Downtown Dubai: 7-8%<br>' +
               '• Dubai Hills: 7%<br>' +
               '• Business Bay: 6-7%<br><br>' +
               '💎 <strong>Premium Areas (Lower Yields):</strong><br>' +
               '• Dubai Marina: 6-7%<br>' +
               '• Palm Jumeirah: 5-6%<br><br>' +
               'Higher yields = Better cash flow<br>' +
               'Lower yields = Better appreciation<br><br>' +
               'What\'s your investment strategy?';
    }
    
    // Payment plans
    if (msg.includes('payment') || msg.includes('installment') || msg.includes('plan')) {
        return '💳 <strong>Common Payment Plans in Dubai:</strong><br><br>' +
               '🏗️ <strong>Off-Plan Properties:</strong><br>' +
               '• 60/40 Plan: 60% during construction, 40% on handover<br>' +
               '• 70/30 Plan: 70% during construction, 30% on handover<br>' +
               '• 50/50 Plan: Equal split<br>' +
               '• Post-Handover: 1-2 years after completion<br><br>' +
               '🏠 <strong>Ready Properties:</strong><br>' +
               '• Cash purchase: Best negotiation power<br>' +
               '• Mortgage: 25% down payment (expats)<br>' +
               '• Developer payment: Some offer 2-3 year plans<br><br>' +
               '💡 <strong>Tips:</strong><br>' +
               '• Off-plan = Lower entry price<br>' +
               '• Post-handover = Cash flow during payment<br>' +
               '• Always check developer reputation<br><br>' +
               'Looking for specific payment plan options?';
    }
    
    // Visa queries
    if (msg.includes('visa') || msg.includes('residency') || msg.includes('golden visa')) {
        return '🛂 <strong>Dubai Property Investor Visas:</strong><br><br>' +
               '🏆 <strong>Golden Visa (10 years):</strong><br>' +
               '• Investment: AED 2 million+ (approx. $545K)<br>' +
               '• Benefits: Long-term residency, family sponsorship<br>' +
               '• No minimum stay requirement<br>' +
               '• Can sponsor family members<br><br>' +
               '📋 <strong>Property Investor Visa (2 years):</strong><br>' +
               '• Investment: AED 1 million+ (approx. $272K)<br>' +
               '• Renewable every 2 years<br>' +
               '• Must retain property ownership<br><br>' +
               '💼 <strong>Benefits:</strong><br>' +
               '• UAE residency for investors<br>' +
               '• Sponsor family (spouse + children)<br>' +
               '• Access to UAE banking<br>' +
               '• No income tax<br><br>' +
               'Interested in visa-eligible properties?';
    }
    
    // Process/How to buy
    if (msg.includes('how to buy') || msg.includes('process') || msg.includes('steps') || msg.includes('procedure')) {
        return '📝 <strong>Property Purchase Process in Dubai:</strong><br><br>' +
               '1️⃣ <strong>Property Search:</strong><br>' +
               '• Browse listings or work with agent<br>' +
               '• Shortlist properties<br><br>' +
               '2️⃣ <strong>Make an Offer:</strong><br>' +
               '• Submit offer through agent<br>' +
               '• Negotiate price<br><br>' +
               '3️⃣ <strong>MOU (Memorandum of Understanding):</strong><br>' +
               '• Sign MOU with seller<br>' +
               '• Pay 10% deposit<br><br>' +
               '4️⃣ <strong>No Objection Certificate (NOC):</strong><br>' +
               '• Developer issues NOC<br>' +
               '• Clear any service charges<br><br>' +
               '5️⃣ <strong>Transfer at DLD:</strong><br>' +
               '• Visit Dubai Land Department<br>' +
               '• Pay 4% DLD fee<br>' +
               '• Receive title deed<br><br>' +
               '⏱️ <strong>Timeline:</strong> 2-4 weeks<br>' +
               '💰 <strong>Additional Costs:</strong> 6-8% of property value<br><br>' +
               'Need help finding properties?';
    }
    
    // Areas/communities
    if (msg.includes('area') || msg.includes('community') || msg.includes('neighborhood') || msg.includes('where')) {
        return '🏘️ <strong>Popular Dubai Communities:</strong><br><br>' +
               '🌆 <strong>Urban/Downtown:</strong><br>' +
               '• Downtown Dubai, Business Bay, DIFC<br>' +
               '• Best for: Professionals, luxury living<br><br>' +
               '🏖️ <strong>Waterfront:</strong><br>' +
               '• Dubai Marina, JBR, Palm Jumeirah<br>' +
               '• Best for: Beach lovers, expats<br><br>' +
               '👨‍👩‍👧‍👦 <strong>Family Communities:</strong><br>' +
               '• Dubai Hills, JVC, Arabian Ranches<br>' +
               '• Best for: Families, parks, schools<br><br>' +
               '💰 <strong>Budget-Friendly:</strong><br>' +
               '• JVC, Deira, Sharjah, Sports City<br>' +
               '• Best for: First-time buyers, investors<br><br>' +
               'What\'s your priority? I can recommend the best area!';
    }
    
    // ROI/Returns
    if (msg.includes('roi') || msg.includes('return') || msg.includes('profit') || msg.includes('make money')) {
        return '💰 <strong>Real Estate ROI in Dubai:</strong><br><br>' +
               '📊 <strong>Total ROI Components:</strong><br>' +
               '• Rental Income: 6-10% annually<br>' +
               '• Capital Appreciation: 5-18% annually<br>' +
               '• <strong>Total ROI: 11-28%</strong> per year!<br><br>' +
               '🏆 <strong>Best ROI Strategies:</strong><br>' +
               '1. Buy off-plan → Sell on completion (15-25% profit)<br>' +
               '2. Buy ready → Rent out (8-10% yield)<br>' +
               '3. Buy undervalued → Renovate → Sell/rent<br><br>' +
               '💡 <strong>ROI by Area:</strong><br>' +
               '• JVC: 8-9% rental + 8% appreciation = 16-17%<br>' +
               '• Marina: 6-7% rental + 12% appreciation = 18-19%<br>' +
               '• Palm: 5-6% rental + 18% appreciation = 23-24%<br><br>' +
               'Want specific ROI calculations?';
    }
    
    // General help
    if (msg.includes('help') || msg.includes('what can') || msg.includes('services')) {
        return '🤖 <strong>I Can Help You With:</strong><br><br>' +
               '📍 <strong>Location Info:</strong><br>' +
               '• Area details, landmarks, lifestyle<br>' +
               '• Ask: "Tell me about Downtown"<br><br>' +
               '💰 <strong>Pricing:</strong><br>' +
               '• Prices by area, payment plans<br>' +
               '• Ask: "What are prices in Marina?"<br><br>' +
               '📊 <strong>Investment:</strong><br>' +
               '• ROI, yields, recommendations<br>' +
               '• Ask: "Best area to invest?"<br><br>' +
               '📈 <strong>Market Trends:</strong><br>' +
               '• Growth, forecasts, analysis<br>' +
               '• Ask: "Market trends 2024?"<br><br>' +
               '🔄 <strong>Comparisons:</strong><br>' +
               '• Area vs area comparisons<br>' +
               '• Ask: "Compare Downtown vs Marina"<br><br>' +
               '🛂 <strong>Visa Info:</strong><br>' +
               '• Golden visa, residency<br>' +
               '• Ask: "How to get golden visa?"<br><br>' +
               'Just ask me anything! 😊';
    }
    
    // Goodbye
    if (msg.includes('bye') || msg.includes('goodbye') || msg.includes('see you')) {
        return '👋 Goodbye! Happy to help anytime. Best of luck with your property search! 🏠✨';
    }
    
    // Default intelligent response
    return '🤔 Interesting question! Let me help you with that.<br><br>' +
           'I specialize in Dubai real estate and can provide information on:<br><br>' +
           '• 📍 Specific locations (try "Tell me about Downtown")<br>' +
           '• 💰 Property prices (try "What are the prices?")<br>' +
           '• 📊 Investment advice (try "Best area to invest")<br>' +
           '• 📈 Market trends (try "Market trends 2024")<br>' +
           '• 🔄 Area comparisons (try "Compare Marina vs JVC")<br>' +
           '• 💵 Rental yields (try "Best rental yields")<br>' +
           '• 🛂 Visa information (try "Golden visa requirements")<br><br>' +
           'What specific information are you looking for?';
}

// Initialize AI Chat functionality
function initAIChat() {
    console.log('=== Initializing AI Chat ===');
    
    const chatWidget = document.getElementById('ai-chat-widget');
    if (!chatWidget) {
        console.error('AI chat widget not found!');
        return false;
    }
    
    console.log('AI chat widget found');
    
    // Get elements
    const chatButton = chatWidget.querySelector('.ai-chat-button');
    const closeButton = chatWidget.querySelector('.ai-chat-close');
    const inputField = document.getElementById('ai-chat-input-field');
    const sendButton = chatWidget.querySelector('.ai-chat-input button');
    
    // Chat button click
    if (chatButton) {
        chatButton.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('AI chat button clicked');
            toggleAIChat();
        };
        console.log('Chat button initialized');
    }
    
    // Close button click
    if (closeButton) {
        closeButton.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('AI chat close clicked');
            toggleAIChat();
        };
        console.log('Close button initialized');
    }
    
    // Input field enter key
    if (inputField) {
        inputField.onkeypress = handleAIChatInput;
        console.log('Input field initialized');
    }
    
    // Send button click
    if (sendButton) {
        sendButton.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('AI chat send button clicked');
            sendAIMessage();
        };
        console.log('Send button initialized');
    }
    
    console.log('=== AI Chat Initialized Successfully ===');
    return true;
}

// Initialize AI Location buttons
function initAILocationButtons() {
    console.log('=== Initializing AI Location Buttons ===');
    
    // Add AI info buttons to location dropdowns and inputs
    const locationSelects = document.querySelectorAll('select[id*="location"], select[id*="district"], select[id*="city"]');
    console.log('Found location selects:', locationSelects.length);
    
    locationSelects.forEach(select => {
        // Check if button already exists
        if (select.parentNode.querySelector('.ai-location-btn')) {
            return;
        }
        
        const aiBtn = document.createElement('button');
        aiBtn.type = 'button';
        aiBtn.className = 'ai-location-btn';
        aiBtn.innerHTML = '<i class="fas fa-robot"></i>';
        aiBtn.title = 'Get AI insights about this location';
        aiBtn.style.cssText = 'margin-left: 8px; padding: 8px 12px; background: var(--primary); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;';
        aiBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const selectedOption = select.options[select.selectedIndex];
            const location = selectedOption.text || select.value;
            console.log('AI location button clicked for:', location);
            showAILocationInfo(location);
        };
        select.parentNode.insertBefore(aiBtn, select.nextSibling);
    });
    
    // Also add to input fields
    const locationInputs = document.querySelectorAll('input[id*="location"], input[id*="district"]');
    console.log('Found location inputs:', locationInputs.length);
    
    locationInputs.forEach(input => {
        // Check if button already exists
        if (input.parentNode.querySelector('.ai-location-btn')) {
            return;
        }
        
        const aiBtn = document.createElement('button');
        aiBtn.type = 'button';
        aiBtn.className = 'ai-location-btn';
        aiBtn.innerHTML = '<i class="fas fa-robot"></i>';
        aiBtn.title = 'Get AI insights about this location';
        aiBtn.style.cssText = 'margin-left: 8px; padding: 8px 12px; background: var(--primary); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;';
        aiBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('AI location button clicked for:', input.value);
            showAILocationInfo(input.value || input.placeholder);
        };
        input.parentNode.insertBefore(aiBtn, input.nextSibling);
    });
    
    // Trigger AI popup on select change
    locationSelects.forEach(select => {
        select.onchange = () => {
            const selectedOption = select.options[select.selectedIndex];
            const location = selectedOption.text || select.value;
            if (location && location !== 'Select...' && location !== '') {
                console.log('Location changed to:', location, '- showing AI popup');
                showAILocationInfo(location);
            }
        };
    });
    
    console.log('=== AI Location Buttons Initialized ===');
}

// Initialize all AI features
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Initializing AI Features...');
    
    // Small delay to ensure all elements are rendered
    setTimeout(() => {
        initAIChat();
        initAILocationButtons();
    }, 500);
});

// ============================================================================
// Initialize Application
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    DataStore.init();
    UI.init();
    Auth.init();
    Tracker.init();
    
    // Ensure Add Agent button visibility is set after DOM loads
    setTimeout(() => {
        if (Auth.currentUser && Auth.currentUser.role === 'admin') {
            const addAgentBtn = document.getElementById('agent-portal-add-agent-btn');
            if (addAgentBtn) {
                addAgentBtn.style.display = 'block';
                console.log('✅ Add Agent button initialized for admin on page load');
            }
        }
    }, 100);
});

// Close modals on outside click
window.onclick = (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
};

// ============================================================================
// SCROLL BUTTONS
// ============================================================================

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

function scrollToBottom() {
    window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth'
    });
}

// Show/hide scroll buttons based on scroll position
window.addEventListener('scroll', () => {
    const scrollTopBtn = document.getElementById('scroll-top-btn');
    const scrollBottomBtn = document.getElementById('scroll-bottom-btn');
    
    if (!scrollTopBtn || !scrollBottomBtn) return;
    
    const scrollPosition = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    // Show top button after scrolling 300px
    if (scrollPosition > 300) {
        scrollTopBtn.classList.add('visible');
    } else {
        scrollTopBtn.classList.remove('visible');
    }
    
    // Show bottom button when not at bottom
    if (scrollPosition + windowHeight < documentHeight - 100) {
        scrollBottomBtn.classList.add('visible');
    } else {
        scrollBottomBtn.classList.remove('visible');
    }
});

// ============================================================================
// ENHANCED SELECT ALL WITH CONFIRMATION
// ============================================================================

// Toggle individual item selection
function toggleItemSelection(type, id, checked) {
    if (checked) {
        selectedItems[type].add(id);
    } else {
        selectedItems[type].delete(id);
    }
    updateBulkDeleteButton(type);
}
window.toggleItemSelection = toggleItemSelection;

function toggleSelectAll(type) {
    const checkbox = document.getElementById(`select-all-${type}`);
    const tbody = document.getElementById(`${type}-tbody`);
    const checkboxes = tbody.querySelectorAll('input[type="checkbox"]');
    
    // If checking all, select all items
    if (checkbox.checked && checkboxes.length > 0) {
        checkboxes.forEach(cb => {
            cb.checked = true;
            const id = cb.dataset.id;
            selectedItems[type].add(id);
        });
        
        updateBulkDeleteButton(type);
        
        // Immediately show custom delete confirmation modal
        showDeleteConfirmation(type);
    } else {
        // Uncheck all
        checkboxes.forEach(cb => {
            cb.checked = false;
            const id = cb.dataset.id;
            selectedItems[type].delete(id);
        });
        
        updateBulkDeleteButton(type);
    }
}

// Show delete confirmation modal
function showDeleteConfirmation(type) {
    const count = selectedItems[type].size;
    
    if (count === 0) {
        UI.showToast('No items selected', 'error');
        return;
    }
    
    const modal = document.getElementById('delete-confirm-modal');
    const confirmText = document.getElementById('delete-confirm-text');
    const confirmDetails = document.getElementById('delete-confirm-details');
    const confirmBtn = document.getElementById('confirm-delete-btn');
    
    // Set confirmation message
    confirmText.innerHTML = `<strong>Are you sure you want to delete ${count} ${type}?</strong>`;
    confirmDetails.innerHTML = `
        <div style="color: #dc3545; font-weight: 600; margin-bottom: 10px;">
            <i class="fas fa-exclamation-circle"></i> This action cannot be undone!
        </div>
        <div style="color: #666; font-size: 0.9rem;">
            <i class="fas fa-trash"></i> ${count} ${type} will be permanently removed
        </div>
    `;
    
    // Set up confirm button
    confirmBtn.onclick = () => {
        executeBulkDelete(type);
        closeModal('delete-confirm-modal');
    };
    
    // Show modal
    openModal('delete-confirm-modal');
}

// Execute the bulk delete
function executeBulkDelete(type) {
    const count = selectedItems[type].size;
    const itemsToDelete = Array.from(selectedItems[type]);
    
    switch(type) {
        case 'cis':
            DataStore.cis = DataStore.cis.filter(c => !itemsToDelete.includes(c.id));
            UI.refreshCISTable();
            break;
        case 'leads':
            DataStore.leads = DataStore.leads.filter(l => !itemsToDelete.includes(l.id));
            UI.refreshLeadsTable();
            break;
        case 'deals':
            DataStore.deals = DataStore.deals.filter(d => !itemsToDelete.includes(d.id));
            UI.refreshDealsTable();
            break;
        case 'plots':
            DataStore.plots = DataStore.plots.filter(p => !itemsToDelete.includes(p.id));
            UI.refreshPlotsTable();
            break;
    }
    
    DataStore.saveToStorage();
    
    // Clear selection
    selectedItems[type].clear();
    
    // Reset select-all checkbox
    const checkbox = document.getElementById(`select-all-${type}`);
    if (checkbox) {
        checkbox.checked = false;
        checkbox.indeterminate = false;
    }
    
    updateBulkDeleteButton(type);
    
    UI.showToast(`${count} ${type} deleted successfully`, 'success');
}

// ============================================================================
// CHAT SYSTEM
// ============================================================================
const ChatSystem = {
    messages: [],
    currentTab: 'team',
    selectedUser: null,
    unreadCount: 0,

    init() {
        this.messages = JSON.parse(localStorage.getItem('aiplot_chat') || '[]');
        this.renderMessages();
        this.loadUserList();
        
        // Listen for Firebase sync if enabled
        if (typeof firebaseEnabled !== 'undefined' && firebaseEnabled && typeof db !== 'undefined' && db) {
            db.ref('chat').on('value', (snapshot) => {
                const data = snapshot.val();
                this.messages = data ? Object.values(data).sort((a, b) => 
                    new Date(a.timestamp) - new Date(b.timestamp)
                ) : [];
                this.renderMessages();
            });
        }
    },

    sendMessage(text, recipient = null) {
        if (!text.trim()) return;

        const message = {
            id: 'msg-' + Date.now(),
            sender: Auth.currentUser ? Auth.currentUser.name : 'Unknown',
            senderId: Auth.currentUser ? Auth.currentUser.id : 'guest',
            text: text.trim(),
            timestamp: new Date().toISOString(),
            time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            date: new Date().toLocaleDateString(),
            type: recipient ? 'direct' : 'team',
            recipient: recipient
        };

        if (typeof firebaseEnabled !== 'undefined' && firebaseEnabled && typeof db !== 'undefined' && db) {
            db.ref('chat/' + message.id).set(message);
        } else {
            this.messages.push(message);
            localStorage.setItem('aiplot_chat', JSON.stringify(this.messages));
        }

        this.renderMessages();
        document.getElementById('chat-input').value = '';
    },

    renderMessages() {
        const container = document.getElementById('chat-messages');
        if (!container) return;

        let filteredMessages = this.currentTab === 'team' 
            ? this.messages.filter(m => m.type === 'team')
            : this.messages.filter(m => 
                m.type === 'direct' && 
                (m.sender === (Auth.currentUser?.name) || m.recipient === (Auth.currentUser?.name))
              );

        if (filteredMessages.length === 0) {
            container.innerHTML = '<p class="empty-state">No messages yet. Start the conversation!</p>';
            return;
        }

        container.innerHTML = filteredMessages.map(msg => {
            const isSent = msg.sender === (Auth.currentUser?.name);
            const initials = msg.sender.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            
            return `
                <div class="chat-message ${isSent ? 'sent' : ''}">
                    <div class="chat-avatar">${initials}</div>
                    <div class="chat-bubble">
                        <div class="chat-sender">${msg.sender}</div>
                        <div class="chat-text">${msg.text}</div>
                        <div class="chat-time">${msg.time}</div>
                    </div>
                </div>
            `;
        }).join('');

        container.scrollTop = container.scrollHeight;
    },

    loadUserList() {
        const userList = document.getElementById('chat-user-list');
        if (!userList) return;

        const users = new Set();
        this.messages.forEach(msg => {
            if (msg.type === 'direct') {
                if (msg.sender !== (Auth.currentUser?.name)) users.add(msg.sender);
                if (msg.recipient !== (Auth.currentUser?.name)) users.add(msg.recipient);
            }
        });

        if (users.size === 0) {
            userList.innerHTML = '<p class="empty-state" style="padding: 12px;">No direct messages yet</p>';
            return;
        }

        userList.innerHTML = Array.from(users).map(user => {
            const initials = user.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            const isActive = this.selectedUser === user;
            
            return `
                <div class="user-item ${isActive ? 'active' : ''}" onclick="selectChatUser('${user}')">
                    <div class="user-avatar-small">${initials}</div>
                    <div class="user-info-small">
                        <div class="user-name-small">${user}</div>
                        <div class="user-status">Click to chat</div>
                    </div>
                </div>
            `;
        }).join('');
    }
};

function toggleChat() {
    const container = document.getElementById('chat-container');
    const toggle = document.getElementById('chat-toggle');
    
    if (container.classList.contains('active')) {
        container.classList.remove('active');
        toggle.classList.remove('hidden');
    } else {
        container.classList.add('active');
        toggle.classList.add('hidden');
        document.getElementById('chat-unread').style.display = 'none';
        ChatSystem.unreadCount = 0;
    }
}

function switchChatTab(tab) {
    ChatSystem.currentTab = tab;
    document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    
    const userList = document.getElementById('chat-user-list');
    userList.style.display = tab === 'direct' ? 'block' : 'none';
    
    ChatSystem.renderMessages();
}

function selectChatUser(user) {
    ChatSystem.selectedUser = user;
    ChatSystem.loadUserList();
    ChatSystem.renderMessages();
}

function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value;
    
    if (!text.trim()) return;

    const recipient = ChatSystem.currentTab === 'direct' ? ChatSystem.selectedUser : null;
    
    if (ChatSystem.currentTab === 'direct' && !recipient) {
        UI.showToast('Please select a user to chat with', 'error');
        return;
    }

    ChatSystem.sendMessage(text, recipient);
}

function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}

// ============================================================================
// USER FILTERING HELPER - Centralized Real User Filter
// ============================================================================

// Get only real active Firebase users (no demo/dummy accounts)
async function getRealActiveUsers() {
    // Reload from Firebase first
    await Auth.loadUsers();
    
    console.log('🔍 Filtering real users...');
    console.log('🔍 Total users in Auth.users:', Auth.users.length);
    
    const realUsers = Auth.users.filter(user => {
        const isActive = user.status === 'active';
        const hasEmail = user.email && user.email.includes('@');
        const notDemo = !user.email.includes('aiplot.com') && 
                        !user.email.includes('demo.com') && 
                        !user.email.includes('example.com');
        const hasName = user.name && user.name.trim() !== '';
        
        console.log(`  👤 ${user.name || 'Unknown'} (${user.email || 'no email'}) - Active: ${isActive}, NotDemo: ${notDemo}`);
        
        return isActive && hasEmail && notDemo && hasName;
    });
    
    console.log(`✅ Found ${realUsers.length} real active users`);
    return realUsers;
}

// Populate any select dropdown with real users only
async function populateUserDropdown(selectId, placeholder = 'Select user...') {
    const select = document.getElementById(selectId);
    if (!select) {
        console.warn(`⚠️ Select element #${selectId} not found`);
        return;
    }
    
    try {
        const realUsers = await getRealActiveUsers();
        
        // Clear and add placeholder
        select.innerHTML = `<option value="">${placeholder}</option>`;
        
        if (realUsers.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No active users found';
            option.disabled = true;
            select.appendChild(option);
        } else {
            realUsers.forEach(user => {
                const option = document.createElement('option');
                option.value = user.email || user.id;
                option.textContent = `${user.name} - ${user.email} (${user.role})`;
                select.appendChild(option);
            });
        }
        
        console.log(`✅ Populated dropdown #${selectId} with ${realUsers.length} users`);
    } catch (error) {
        console.error(`❌ Error populating dropdown #${selectId}:`, error);
        select.innerHTML = `<option value="">Error loading users</option>`;
    }
}

// ============================================================================
// EMAIL & WHATSAPP FUNCTIONS
// ============================================================================

function openEmailModal(recipient, subject, body) {
    document.getElementById('email-to').value = recipient || '';
    document.getElementById('email-subject').value = subject || '';
    document.getElementById('email-body').value = body || '';
    document.getElementById('email-template').value = '';
    
    // Populate user dropdown with real Firebase users
    populateUserEmails();
    
    openModal('email-modal');
}

function applyEmailTemplate() {
    const templateName = document.getElementById('email-template').value;
    const emailBody = document.getElementById('email-body');
    const emailSubject = document.getElementById('email-subject');
    
    if (!templateName) return;
    
    const templates = {
        welcome: {
            subject: 'Welcome to AI Plot Portal!',
            body: `Dear [Name],\n\nWelcome to AI Plot Portal! We're excited to have you on board.\n\nYour account has been successfully created and you now have access to our comprehensive plot management system.\n\nKey Features:\n- Browse available plots\n- Track your leads and deals\n- Access location insights\n- Connect with our team\n\nIf you have any questions, please don't hesitate to reach out.\n\nBest regards,\nAI Plot Team`
        },
        followUp: {
            subject: 'Follow-up on Your Interest',
            body: `Dear [Name],\n\nI hope this message finds you well. I'm following up on your recent interest in our plots.\n\nWould you like to schedule a viewing or discuss any specific requirements?\n\nI'm available to assist you with:\n- Plot details and pricing\n- Site visits\n- Payment plans\n- Any questions you may have\n\nLooking forward to hearing from you.\n\nBest regards,\nAI Plot Team`
        },
        newListing: {
            subject: 'New Plot Listing - Exclusive Opportunity!',
            body: `Dear [Name],\n\nWe're excited to inform you about our latest plot listing!\n\n📍 Location: [Location]\n📐 Size: [Size] sqm\n💰 Price: [Price]\n✨ Features: [Key Features]\n\nThis is a prime opportunity in a highly sought-after area.\n\nWould you like to:\n1. Schedule a site visit?\n2. Receive more details?\n3. Discuss payment options?\n\nPlease let me know your interest level and I'll provide all the information you need.\n\nBest regards,\nAI Plot Team`
        },
        dealConfirmation: {
            subject: 'Deal Confirmation - Plot #[Plot Number]',
            body: `Dear [Name],\n\nThis email confirms your deal for the following plot:\n\nPlot Details:\n- Plot Number: [Number]\n- Location: [Location]\n- Size: [Size] sqm\n- Final Price: [Price]\n- Deal Date: [Date]\n\nNext Steps:\n1. Complete payment as per agreed terms\n2. Sign necessary documentation\n3. Transfer of ownership process\n\nOur team will contact you shortly to finalize the details.\n\nThank you for choosing AI Plot!\n\nBest regards,\nAI Plot Team`
        },
        priceReduction: {
            subject: 'Price Reduction Alert - Great Opportunity!',
            body: `Dear [Name],\n\nGreat news! The plot you were interested in has a new reduced price.\n\nPlot Details:\n- Location: [Location]\n- Size: [Size] sqm\n- Previous Price: [Old Price]\n- New Price: [New Price]\n- Savings: [Amount]\n\nThis is an excellent opportunity to acquire a prime plot at a competitive price.\n\nWould you like to:\n1. Schedule a viewing?\n2. Discuss payment options?\n3. Proceed with the purchase?\n\nPlease respond at your earliest convenience as this offer may not last long.\n\nBest regards,\nAI Plot Team`
        },
        meetingRequest: {
            subject: 'Meeting Request - Plot Discussion',
            body: `Dear [Name],\n\nI would like to schedule a meeting to discuss plot opportunities that match your requirements.\n\nProposed Meeting Details:\n- Date: [Date]\n- Time: [Time]\n- Location: [Office/Site/Online]\n- Duration: Approximately 30 minutes\n\nAgenda:\n1. Understand your requirements\n2. Present suitable options\n3. Discuss pricing and payment plans\n4. Answer your questions\n\nPlease let me know if this works for you or suggest an alternative time.\n\nBest regards,\nAI Plot Team`
        },
        paymentReminder: {
            subject: 'Payment Reminder - Invoice #[Invoice Number]',
            body: `Dear [Name],\n\nThis is a friendly reminder about the upcoming payment for your plot purchase.\n\nPayment Details:\n- Invoice Number: [Number]\n- Amount Due: [Amount]\n- Due Date: [Date]\n- Payment Method: [Method]\n\nTo avoid any delays in the transfer process, please ensure payment is made by the due date.\n\nIf you have already made the payment, please disregard this message.\n\nFor any questions or concerns, please contact us immediately.\n\nBest regards,\nAI Plot Team`
        },
        accountApproved: {
            subject: 'Your AI Plot Account Has Been Approved!',
            body: `Dear [Name],\n\nGreat news! Your account has been approved and is now active.\n\nYou can now:\n- Access all portal features\n- View available plots\n- Manage your leads and deals\n- Use AI-powered insights\n- Communicate with the team\n\nLogin Details:\n- URL: [Portal URL]\n- Email: [Your Email]\n\nIf you need any assistance getting started, our support team is here to help.\n\nWelcome aboard!\n\nBest regards,\nAI Plot Team`
        }
    };
    
    const template = templates[templateName];
    if (template) {
        emailSubject.value = template.subject;
        emailBody.value = template.body;
        UI.showToast(`Template "${templateName}" applied! Customize and send.`, 'success');
    }
}

// Populate email recipient dropdown with real Firebase users only
async function populateUserEmails() {
    const datalist = document.getElementById('user-emails-list');
    if (!datalist) return;
    
    try {
        const realUsers = await getRealActiveUsers();
        
        if (realUsers.length === 0) {
            datalist.innerHTML = '<option value="">No active users found</option>';
        } else {
            datalist.innerHTML = realUsers.map(user => 
                `<option value="${user.email}">${user.name} - ${user.email}</option>`
            ).join('');
        }
        
        console.log(`✅ Populated email datalist with ${realUsers.length} users`);
    } catch (error) {
        console.error('❌ Error populating user emails:', error);
        datalist.innerHTML = '<option value="">Error loading users</option>';
    }
}

function sendEmail() {
    const to = document.getElementById('email-to').value;
    const subject = document.getElementById('email-subject').value;
    const body = document.getElementById('email-body').value;

    if (!to || !subject) {
        UI.showToast('Please fill in recipient and subject', 'error');
        return;
    }

    const mailtoLink = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, '_blank');

    closeModal('email-modal');
    
    if (typeof Auth !== 'undefined' && Auth.currentUser) {
        if (typeof Tracker !== 'undefined') {
            Tracker.addActivity('email', 'Email Sent', `To: ${to} - Subject: ${subject}`, '', '');
        }
    }
    
    UI.showToast('Email client opened!', 'success');
}

// ============================================================================
// WHATSAPP INTEGRATION
// ============================================================================
function sendWhatsApp(phone, message) {
    if (!phone) {
        UI.showToast('Phone number is required', 'error');
        return;
    }

    const cleanPhone = phone.replace(/[\s-]/g, '');
    let formattedPhone = cleanPhone;
    if (!cleanPhone.startsWith('+')) {
        formattedPhone = '+971' + cleanPhone;
    }

    const whatsappPhone = formattedPhone.substring(1);
    const defaultMessage = message || 'Hello! I\'m contacting you from AI Plot Portal regarding a property inquiry.';
    const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(defaultMessage)}`;
    
    window.open(whatsappUrl, '_blank');
    
    if (typeof Auth !== 'undefined' && Auth.currentUser) {
        if (typeof Tracker !== 'undefined') {
            Tracker.addActivity('call', 'WhatsApp Message Sent', `To: ${phone}`, '', '');
        }
    }
}

function sendWhatsAppLead(leadId) {
    const lead = DataStore.leads.find(l => l.id === leadId);
    if (!lead) return;

    const message = `Hello ${lead.name},\n\nThis is ${Auth.currentUser?.name || 'AI Plot Team'} from AI Plot. I'm following up on your inquiry about ${lead.plotType || 'properties'} in ${lead.location || 'Dubai'}.\n\nPlease let me know if you'd like to discuss further.\n\nBest regards`;
    
    sendWhatsApp(lead.phone, message);
}

function sendWhatsAppDeal(dealId) {
    const deal = DataStore.deals.find(d => d.id === dealId);
    if (!deal) return;

    const message = `Hello ${deal.clientName},\n\nThis is ${Auth.currentUser?.name || 'AI Plot Team'} from AI Plot regarding your deal ${deal.id}.\n\nProperty: ${deal.plotType || 'N/A'}\nStatus: ${deal.status}\n\nPlease let me know if you have any questions.\n\nBest regards`;
    
    sendWhatsApp(deal.phone, message);
}

// Initialize Chat on load
if (typeof DataStore !== 'undefined') {
    const originalInit = DataStore.init;
    if (originalInit) {
        DataStore.init = function() {
            originalInit.call(DataStore);
            if (typeof ChatSystem !== 'undefined') {
                ChatSystem.init();
            }
            populateAgentList();
        };
    }
}

async function populateAgentList() {
    const agentList = document.getElementById('agent-list');
    if (!agentList) return;

    const realUsers = await getRealActiveUsers();
    
    agentList.innerHTML = realUsers.map(agent => 
        `<option value="${agent.name}">`
    ).join('');
    
    console.log(`✅ Populated ${realUsers.length} real agents in dropdown`);
}

// ============================================================================
// ADMIN USER MANAGEMENT
// ============================================================================

function openCreateAdminModal() {
    if (!Auth.currentUser || Auth.currentUser.role !== 'admin') {
        UI.showToast('Only admins can create new admins', 'error');
        return;
    }
    openModal('create-admin-modal');
}

function createNewAdmin() {
    const name = document.getElementById('admin-name').value.trim();
    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value;
    const passwordConfirm = document.getElementById('admin-password-confirm').value;

    if (!name || !email || !password) {
        UI.showToast('Please fill in all fields', 'error');
        return;
    }

    if (password.length < 6) {
        UI.showToast('Password must be at least 6 characters', 'error');
        return;
    }

    if (password !== passwordConfirm) {
        UI.showToast('Passwords do not match', 'error');
        return;
    }

    // Check if email already exists
    if (Auth.users.find(u => u.email === email)) {
        UI.showToast('Email already exists', 'error');
        return;
    }

    const newAdmin = {
        id: 'user-' + String(Auth.users.length + 1).padStart(3, '0'),
        name: name,
        email: email,
        password: password,
        role: 'admin',
        status: 'active'
    };

    Auth.users.push(newAdmin);
    Auth.saveUsers();

    closeModal('create-admin-modal');
    document.getElementById('admin-name').value = '';
    document.getElementById('admin-email').value = '';
    document.getElementById('admin-password').value = '';
    document.getElementById('admin-password-confirm').value = '';

    refreshAdminUsersTable();
    UI.showToast(`Admin ${name} created successfully!`, 'success');
}

function deleteUser(userId) {
    const user = Auth.users.find(u => u.id === userId);
    if (!user) {
        UI.showToast('User not found', 'error');
        return;
    }

    if (user.id === Auth.currentUser.id) {
        UI.showToast('You cannot delete yourself', 'error');
        return;
    }

    if (!confirm(`Are you sure you want to delete ${user.name}?`)) {
        return;
    }

    Auth.users = Auth.users.filter(u => u.id !== userId);
    Auth.saveUsers();

    refreshAdminUsersTable();
    UI.showToast(`User ${user.name} deleted`, 'success');
}

function toggleUserStatus(userId) {
    const user = Auth.users.find(u => u.id === userId);
    if (!user) return;

    if (user.id === Auth.currentUser.id) {
        UI.showToast('You cannot deactivate yourself', 'error');
        return;
    }

    user.status = user.status === 'active' ? 'inactive' : 'active';
    Auth.saveUsers();

    refreshAdminUsersTable();
    UI.showToast(`User ${user.name} ${user.status}`, 'success');
}

function promoteToAdmin(userId) {
    if (!Auth.currentUser || Auth.currentUser.role !== 'admin') {
        UI.showToast('Only admins can promote users', 'error');
        return;
    }
    const user = Auth.users.find(u => u.id === userId);
    if (!user) {
        UI.showToast('User not found', 'error');
        return;
    }
    if (user.role === 'admin') {
        UI.showToast('User is already an admin', 'info');
        return;
    }
    if (!confirm(`Promote ${user.name} to Administrator?`)) return;
    user.role = 'admin';
    Auth.saveUsers();
    refreshAdminUsersTable();
    UI.showToast(`${user.name} promoted to Administrator!`, 'success');
}

async function refreshAdminUsersTable() {
    // Reload users from Firebase first
    await Auth.loadUsers();
    
    const tbody = document.getElementById('admin-users-tbody');
    if (!tbody) return;

    const countBadge = document.getElementById('total-users-count');
    if (countBadge) {
        countBadge.textContent = `${Auth.users.length} Users`;
    }

    tbody.innerHTML = Auth.users.map(user => {
        const leadsCount = DataStore.leads.filter(l => l.assignedTo === user.name).length;
        const dealsCount = DataStore.deals.filter(d => d.agent === user.name).length;
        const isAdmin = user.role === 'admin';
        const isCurrentUser = user.id === Auth.currentUser?.id;

        return `
            <tr>
                <td><span class="badge badge-${isAdmin ? 'converted' : 'new'}">${user.id}</span></td>
                <td><strong>${user.name}</strong>${isCurrentUser ? ' (You)' : ''}</td>
                <td>${user.email}</td>
                <td><span class="badge badge-${isAdmin ? 'converted' : 'active'}">${isAdmin ? 'Admin' : 'Agent'}</span></td>
                <td><span class="badge badge-${user.status === 'active' ? 'active' : 'pending'}">${user.status}</span></td>
                <td>${leadsCount}</td>
                <td>${dealsCount}</td>
                <td>
                    <div class="comm-buttons">
                        ${!isCurrentUser ? `
                            <button class="btn-action edit" onclick="toggleUserStatus('${user.id}')" title="${user.status === 'active' ? 'Deactivate' : 'Activate'}">
                                <i class="fas fa-${user.status === 'active' ? 'ban' : 'check'}"></i>
                            </button>
                            <button class="btn-action delete" onclick="deleteUser('${user.id}')" title="Delete User">
                                <i class="fas fa-trash"></i>
                            </button>
                            ${!isAdmin ? `<button class="btn-action edit" onclick="promoteToAdmin('${user.id}')" title="Promote to Admin">
                                <i class="fas fa-arrow-up"></i>
                            </button>` : ''}
                        ` : '<span class="text-muted">Current User</span>'}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ============================================================================
// VIDEO CALLING SYSTEM (Jitsi Meet)
// ============================================================================

let currentJitsiApi = null;
let currentCallRoom = null;

// Show dialog to start a new call
async function populateCallParticipants() {
    const callType = document.getElementById('call-type').value;
    const select = document.getElementById('call-participant');
    if (!select || select.tagName !== 'SELECT') return;
    select.innerHTML = '<option value="">-- Select Participant --</option>';
    
    if (callType === 'internal') {
        // ONLY REAL FIREBASE USERS - No dummies!
        const realUsers = await getRealActiveUsers();
        
        if (realUsers.length === 0) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'No active users found';
            opt.disabled = true;
            select.appendChild(opt);
        } else {
            realUsers.forEach(u => {
                const opt = document.createElement('option');
                opt.value = u.name;
                opt.textContent = `${u.name} - ${u.email} (${u.role})`;
                select.appendChild(opt);
            });
        }
    } else {
        // External - Load from leads/CIS contacts
        try {
            const leads = JSON.parse(localStorage.getItem('leads') || '[]');
            if (leads.length > 0) {
                leads.forEach(lead => {
                    const name = lead.name || lead.clientName || 'Unknown';
                    const phone = lead.phone || '';
                    const opt = document.createElement('option');
                    opt.value = name;
                    opt.textContent = name + (phone ? ' (' + phone + ')' : '');
                    select.appendChild(opt);
                });
            } else {
                const opt = document.createElement('option');
                opt.value = '';
                opt.textContent = 'No leads found - add leads first';
                opt.disabled = true;
                select.appendChild(opt);
            }
        } catch(e) {
            console.warn('Could not load leads for call:', e);
        }
        try {
            const cis = JSON.parse(localStorage.getItem('cisRecords') || '[]');
            if (cis.length > 0) {
                const optGroup = document.createElement('optgroup');
                optGroup.label = 'CIS Contacts';
                cis.forEach(c => {
                    const name = c.name || c.clientName || 'Unknown';
                    const phone = c.phone || '';
                    const opt = document.createElement('option');
                    opt.value = name;
                    opt.textContent = name + (phone ? ' (' + phone + ')' : '');
                    optGroup.appendChild(opt);
                });
                select.appendChild(optGroup);
            }
        } catch(e) {}
    }
    
    const otherOpt = document.createElement('option');
    otherOpt.value = 'custom';
    otherOpt.textContent = '+ Enter Custom Name...';
    select.appendChild(otherOpt);
}
window.populateCallParticipants = populateCallParticipants;

async function showVideoCallDialog(prefillName) {
    const roomId = 'AIPlot-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5);
    document.getElementById('call-room-name').value = roomId;
    document.getElementById('call-type').value = prefillName ? 'external' : 'internal';
    
    // Ensure participant element is a select (restore if previously replaced with input)
    const participantEl = document.getElementById('call-participant');
    if (participantEl && participantEl.tagName !== 'SELECT') {
        const parent = participantEl.parentElement;
        const sel = document.createElement('select');
        sel.id = 'call-participant';
        sel.style.cssText = 'width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;background:white;';
        parent.replaceChild(sel, participantEl);
    }
    
    // Populate with real users (async)
    await populateCallParticipants();
    
    // If prefillName provided, try to select it or fall back to custom input
    if (prefillName) {
        const select = document.getElementById('call-participant');
        let found = false;
        for (let i = 0; i < select.options.length; i++) {
            if (select.options[i].value === prefillName) {
                select.value = prefillName;
                found = true;
                break;
            }
        }
        if (!found) {
            // Switch to text input with prefilled name
            const parent = select.parentElement;
            const input = document.createElement('input');
            input.type = 'text';
            input.id = 'call-participant';
            input.value = prefillName;
            input.style.cssText = 'width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;';
            parent.replaceChild(input, select);
        }
    }
    
    document.getElementById('call-type').onchange = populateCallParticipants;
    
    const partEl = document.getElementById('call-participant');
    if (partEl && partEl.tagName === 'SELECT') {
        partEl.onchange = function() {
            if (this.value === 'custom') {
                const parent = this.parentElement;
                const input = document.createElement('input');
                input.type = 'text';
                input.id = 'call-participant';
                input.placeholder = 'Type participant name...';
                input.style.cssText = 'width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;';
                parent.replaceChild(input, this);
                input.focus();
            }
        };
    }
    
    openModal('video-call-start-modal');
}

// Start call with a specific lead
function startCallWithLead(leadData) {
    const name = leadData.name || leadData.clientName || 'Client';
    showVideoCallDialog(name);
}

// Initiate the actual video call
function initiateVideoCall() {
    const roomName = document.getElementById('call-room-name').value;
    const participant = document.getElementById('call-participant').value || 'Guest';
    const callType = document.getElementById('call-type').value;
    
    closeModal('video-call-start-modal');
    
    // Get current user info
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const displayName = currentUser.name || currentUser.email || 'Agent';
    
    currentCallRoom = roomName;
    
    // Update title
    document.getElementById('video-call-title').innerHTML = '<i class="fas fa-video"></i> ' + 
        (callType === 'internal' ? 'Team Call' : 'Client Call') + ' - ' + participant;
    
    openModal('video-call-modal');
    
    // Small delay to let modal render
    setTimeout(() => {
        startJitsiCall(roomName, displayName);
    }, 300);
}

// Start Jitsi Meet in the container
function startJitsiCall(roomName, displayName) {
    // Clean up any previous call
    if (currentJitsiApi) {
        try { currentJitsiApi.dispose(); } catch(e) {}
        currentJitsiApi = null;
    }
    
    const container = document.getElementById('jitsi-container');
    container.innerHTML = '';
    
    // Try External API first
    if (typeof JitsiMeetExternalAPI !== 'undefined') {
        try {
            const options = {
                roomName: roomName,
                width: '100%',
                height: '100%',
                parentNode: container,
                userInfo: {
                    displayName: displayName
                },
                configOverwrite: {
                    startWithAudioMuted: false,
                    startWithVideoMuted: false,
                    prejoinPageEnabled: false,
                    disableDeepLinking: true
                },
                interfaceConfigOverwrite: {
                    SHOW_JITSI_WATERMARK: false,
                    SHOW_WATERMARK_FOR_GUESTS: false,
                    TOOLBAR_ALWAYS_VISIBLE: true
                }
            };
            
            currentJitsiApi = new JitsiMeetExternalAPI('meet.jit.si', options);
            
            currentJitsiApi.addEventListener('readyToClose', function() {
                endVideoCall();
            });
            
            showToast('Video call started! Share the link to invite others.', 'success');
            return;
        } catch (error) {
            console.warn('Jitsi External API failed, falling back to iframe:', error);
        }
    }
    
    // Fallback: Use direct iframe embedding (more reliable)
    const encodedName = encodeURIComponent(displayName);
    const iframeSrc = 'https://meet.jit.si/' + roomName + '#userInfo.displayName="' + encodedName + '"&config.prejoinPageEnabled=false&config.startWithAudioMuted=0&config.startWithVideoMuted=0';
    
    container.innerHTML = '<iframe id="jitsi-iframe" src="' + iframeSrc + '" style="width:100%;height:100%;border:none;" allow="camera;microphone;display-capture;autoplay;clipboard-write" allowfullscreen></iframe>';
    
    showToast('Video call started! Share the link to invite others.', 'success');
}

// Copy call invite link
function copyCallLink() {
    if (currentCallRoom) {
        const link = 'https://meet.jit.si/' + currentCallRoom;
        navigator.clipboard.writeText(link).then(() => {
            showToast('Call link copied! Share with: ' + link, 'success');
        }).catch(() => {
            // Fallback
            const input = document.createElement('input');
            input.value = link;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            showToast('Call link copied!', 'success');
        });
    }
}

// End video call
function endVideoCall() {
    if (currentJitsiApi) {
        try { currentJitsiApi.dispose(); } catch(e) {}
        currentJitsiApi = null;
    }
    currentCallRoom = null;
    const container = document.getElementById('jitsi-container');
    if (container) {
        // Remove iframe if present
        const iframe = container.querySelector('iframe');
        if (iframe) iframe.src = 'about:blank';
        container.innerHTML = '';
    }
    closeModal('video-call-modal');
    showToast('Call ended.', 'info');
}

// Legacy wrappers for existing video call buttons in tables
function startVideoCall(contactName, phone) {
    showVideoCallDialog(contactName || '');
}

function startVideoCallLead(leadId) {
    const lead = DataStore.leads.find(l => l.id === leadId);
    if (!lead) return;
    showVideoCallDialog(lead.name);
}

function startVideoCallDeal(dealId) {
    const deal = DataStore.deals.find(d => d.id === dealId);
    if (!deal) return;
    showVideoCallDialog(deal.clientName);
}

function startVideoCallCIS(phone, name) {
    showVideoCallDialog(name || '');
}

// Expose to global scope
window.showVideoCallDialog = showVideoCallDialog;
window.startCallWithLead = startCallWithLead;
window.initiateVideoCall = initiateVideoCall;
window.startJitsiCall = startJitsiCall;
window.copyCallLink = copyCallLink;
window.endVideoCall = endVideoCall;

// ============================================================================
// MULTI-SELECT & BULK DELETE
// ============================================================================

const selectedItems = {
    cis: new Set(),
    leads: new Set(),
    deals: new Set(),
    plots: new Set()
};

// toggleSelectAll is defined earlier in the file - do not duplicate

function toggleItemSelect(type, id, isChecked) {
    if (isChecked) {
        selectedItems[type].add(id);
    } else {
        selectedItems[type].delete(id);
    }
    
    updateBulkDeleteButton(type);
    
    // Update select-all checkbox state
    const checkbox = document.getElementById(`select-all-${type}`);
    const tbody = document.getElementById(`${type}-tbody`);
    const checkboxes = tbody.querySelectorAll('input[type="checkbox"]');
    const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
    
    checkbox.checked = checkedCount === checkboxes.length && checkboxes.length > 0;
    checkbox.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
}

function updateBulkDeleteButton(type) {
    const button = document.getElementById(`bulk-delete-${type}`);
    const countSpan = document.getElementById(`selected-${type}-count`);
    const count = selectedItems[type].size;
    
    if (countSpan) {
        countSpan.textContent = count;
    }
    
    if (button) {
        button.style.display = count > 0 ? 'inline-flex' : 'none';
    }
}

function bulkDelete(type) {
    showDeleteConfirmation(type);
}

// ============================================================================
// FILE IMPORT SYSTEM
// ============================================================================

let importedData = [];
let importedFileName = '';

function openFileImportModal() {
    console.log('Opening file import modal...');
    resetFileImport();
    openModal('file-import-modal');
    
    // Initialize file handlers after modal is visible
    setTimeout(() => {
        initFileUploadHandlers();
    }, 100);
}

function resetFileImport() {
    document.getElementById('file-preview').style.display = 'none';
    document.getElementById('import-btn').style.display = 'none';
    document.getElementById('file-input').value = '';
    document.getElementById('manual-text-input').value = '';
    importedData = [];
    importedFileName = '';
}

// Process manually pasted text
function processManualText() {
    const textInput = document.getElementById('manual-text-input');
    const text = textInput.value.trim();
    
    if (!text) {
        UI.showToast('Please paste some text first', 'warning');
        return;
    }
    
    console.log('Processing manual text input...');
    console.log('Text length:', text.length);
    console.log('Text preview:', text.substring(0, 200));
    
    importedFileName = 'manual-text-input';
    parseTextToData(text);
}

// Initialize file upload area
function initFileUploadHandlers() {
    console.log('Initializing file upload handlers...');
    
    const uploadArea = document.getElementById('file-upload-area');
    const fileInput = document.getElementById('file-input');

    if (!uploadArea || !fileInput) {
        console.error('File upload elements not found! uploadArea:', uploadArea, 'fileInput:', fileInput);
        return false;
    }
    
    // Check if handlers are already initialized (prevent duplicate listeners)
    if (uploadArea.dataset.handlersInitialized === 'true') {
        console.log('File upload handlers already initialized, skipping...');
        return true;
    }
    
    console.log('File upload elements found, setting up handlers...');
    
    // Click to upload
    uploadArea.addEventListener('click', (e) => {
        // Prevent the click from firing if they clicked the file input itself
        if (e.target === fileInput) return;
        console.log('Upload area clicked, triggering file input...');
        fileInput.click();
    });

    // File selected
    fileInput.addEventListener('change', (e) => {
        console.log('File input changed, files:', e.target.files.length);
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            console.log('Selected file:', file.name, 'type:', file.type, 'size:', file.size);
            handleFileUpload(file);
        }
    });

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('dragover');
        console.log('File dropped, files:', e.dataTransfer.files.length);
        if (e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            console.log('Dropped file:', file.name, file.type, file.size);
            handleFileUpload(file);
        }
    });
    
    // Mark as initialized
    uploadArea.dataset.handlersInitialized = 'true';
    
    console.log('File upload handlers initialized successfully!');
    return true;
}

function handleFileUpload(file) {
    importedFileName = file.name;
    const fileExtension = file.name.split('.').pop().toLowerCase();

    if (!['xlsx', 'xls', 'csv', 'txt', 'pdf', 'png', 'jpg', 'jpeg'].includes(fileExtension)) {
        UI.showToast('Unsupported file format. Please use Excel, CSV, TXT, PDF, or Image', 'error');
        return;
    }

    UI.showToast('Reading file...', 'info');

    // Handle PDF files
    if (fileExtension === 'pdf') {
        handlePDFUpload(file);
        return;
    }

    // Handle Image files (OCR)
    if (['png', 'jpg', 'jpeg'].includes(fileExtension)) {
        handleImageUpload(file);
        return;
    }

    // Handle Excel/CSV/TXT files
    const reader = new FileReader();

    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {type: 'array'});
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, {header: 1});
                
                parseImportData(jsonData);
            } catch (error) {
                UI.showToast('Error reading Excel file: ' + error.message, 'error');
            }
        };
        reader.readAsArrayBuffer(file);
    } else {
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const lines = text.split('\n');
                const jsonData = lines.map(line => {
                    // Try comma, then tab separation
                    return line.includes(',') ? line.split(',') : line.split('\t');
                }).filter(row => row.length > 1);
                
                parseImportData(jsonData);
            } catch (error) {
                UI.showToast('Error reading file: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    }
}

// Helper: dynamically load PDF.js if CDN script failed
function ensurePdfJsLoaded() {
    return new Promise((resolve, reject) => {
        if (typeof pdfjsLib !== 'undefined') {
            resolve(pdfjsLib);
            return;
        }
        console.log('pdfjsLib not found, dynamically loading PDF.js...');
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
            if (typeof pdfjsLib !== 'undefined') {
                console.log('PDF.js loaded dynamically, version:', pdfjsLib.version);
                resolve(pdfjsLib);
            } else {
                reject(new Error('PDF.js script loaded but pdfjsLib is still undefined'));
            }
        };
        script.onerror = () => reject(new Error('Failed to load PDF.js from CDN'));
        document.head.appendChild(script);
    });
}

function handlePDFUpload(file) {
    console.log('=== PDF UPLOAD STARTED ===');
    console.log('File name:', file.name);
    console.log('File size:', file.size, 'bytes');
    console.log('File type:', file.type);
    
    // Check if PDF.js is available
    if (typeof pdfjsLib === 'undefined') {
        console.error('PDF.js not loaded!');
        UI.showToast('PDF.js library not loaded. Please check your internet connection and refresh the page.', 'error');
        return;
    }
    
    console.log('PDF.js version:', pdfjsLib.version);
    UI.showToast('Reading PDF file...', 'info');

    const fileReader = new FileReader();
    
    fileReader.onload = async function() {
        try {
            console.log('FileReader completed, data size:', this.result.byteLength, 'bytes');
            
            const typedarray = new Uint8Array(this.result);
            console.log('Uint8Array created, length:', typedarray.length);
            
            // Ensure pdfjsLib is available (dynamic fallback if CDN in <head> failed)
            let pdfLib;
            try {
                pdfLib = await ensurePdfJsLoaded();
            } catch (loadErr) {
                console.error('Cannot load PDF.js:', loadErr);
                UI.showToast('PDF.js library could not be loaded. Check your internet connection and refresh.', 'error');
                return;
            }
            
            console.log('PDF.js version:', pdfLib.version);
            
            // Set worker source for PDF.js
            const workerUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            console.log('Setting worker source to:', workerUrl);
            pdfLib.GlobalWorkerOptions.workerSrc = workerUrl;
            
            console.log('Loading PDF document...');
            
            // Try loading with timeout
            const loadingTask = pdfLib.getDocument({
                data: typedarray,
                cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
                cMapPacked: true
            });
            
            // Add timeout to loading
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('PDF loading timeout')), 60000);
            });
            
            const pdf = await Promise.race([loadingTask.promise, timeoutPromise]);
            
            console.log('PDF loaded successfully!');
            console.log('Number of pages:', pdf.numPages);
            
            let fullText = '';
            let extractedPages = 0;
            let ocrPages = 0;
            const MIN_TEXT_THRESHOLD = 50; // chars below which we consider a page image-based
            
            // ── STEP 1 & 2: Hybrid extraction (text + OCR fallback) per page ──
            for (let i = 1; i <= pdf.numPages; i++) {
                try {
                    UI.showToast(`Extracting text from page ${i}/${pdf.numPages}...`, 'info');
                    console.log('Extracting text from page', i);
                    const page = await pdf.getPage(i);
                    
                    // ── Step 1: Direct text extraction ──
                    let pageText = '';
                    try {
                        const textContent = await page.getTextContent();
                        if (textContent && textContent.items) {
                            pageText = textContent.items.map(item => item.str).join(' ').trim();
                            console.log('Page', i, 'direct text length:', pageText.length);
                        }
                    } catch (textErr) {
                        console.warn('Page', i, 'text extraction failed:', textErr.message);
                    }
                    
                    // ── Step 2: If text is insufficient, render to canvas & OCR ──
                    if (pageText.length < MIN_TEXT_THRESHOLD) {
                        console.log('Page', i, 'has insufficient text (' + pageText.length + ' chars). Attempting OCR...');
                        UI.showToast(`Running OCR on page ${i}/${pdf.numPages} (image-based)...`, 'info');
                        
                        try {
                            // Check Tesseract availability
                            if (typeof Tesseract === 'undefined') {
                                console.warn('Tesseract.js not available, skipping OCR for page', i);
                            } else {
                                // Render PDF page to canvas at 2x scale for good OCR quality
                                const viewport = page.getViewport({ scale: 2.0 });
                                const canvas = document.createElement('canvas');
                                canvas.width = viewport.width;
                                canvas.height = viewport.height;
                                const ctx = canvas.getContext('2d');
                                
                                await page.render({ canvasContext: ctx, viewport: viewport }).promise;
                                console.log('Page', i, 'rendered to canvas:', canvas.width, 'x', canvas.height);
                                
                                // Convert canvas to data URL for Tesseract
                                const imageDataUrl = canvas.toDataURL('image/png');
                                
                                // Run OCR with English + Arabic support
                                const worker = await Tesseract.createWorker('eng+ara');
                                const { data: { text: ocrText } } = await worker.recognize(imageDataUrl);
                                await worker.terminate();
                                
                                const ocrClean = (ocrText || '').trim();
                                console.log('Page', i, 'OCR text length:', ocrClean.length);
                                console.log('Page', i, 'OCR preview:', ocrClean.substring(0, 200));
                                
                                // ── Step 3: Use the better/longer result ──
                                if (ocrClean.length > pageText.length) {
                                    pageText = ocrClean;
                                    ocrPages++;
                                    console.log('Page', i, '→ using OCR result (longer)');
                                } else {
                                    console.log('Page', i, '→ keeping direct text (longer or equal)');
                                }
                                
                                // Clean up canvas
                                canvas.width = 0;
                                canvas.height = 0;
                            }
                        } catch (ocrError) {
                            console.error('OCR failed for page', i, ':', ocrError.message);
                            // Graceful fallback: keep whatever direct text we have
                        }
                    }
                    
                    // Add page text to full result
                    if (pageText.length > 0) {
                        fullText += pageText + '\n';
                        extractedPages++;
                        console.log('Page', i, 'final text length:', pageText.length);
                    } else {
                        console.log('Page', i, 'no text recovered (direct or OCR)');
                    }
                    
                } catch (pageError) {
                    console.error('Error processing page', i, ':', pageError);
                    // Continue with other pages
                }
            }
            
            // ── STEP 4 & 5: Summary & progress feedback ──
            console.log('=== EXTRACTION SUMMARY ===');
            console.log('Total pages:', pdf.numPages);
            console.log('Pages with text:', extractedPages);
            console.log('Pages via OCR:', ocrPages);
            console.log('Total text length:', fullText.length);
            console.log('Full text preview:', fullText.substring(0, 500));
            console.log('===========================');
            
            if (!fullText.trim()) {
                console.error('No text extracted from PDF (text extraction + OCR both failed)');
                UI.showToast('Could not extract any text from this PDF. The file may be empty, corrupted, or contain only non-text graphics. Try Excel/CSV format instead.', 'error');
                return;
            }
            
            // Build informative summary message
            let summaryParts = [];
            if (extractedPages - ocrPages > 0) {
                summaryParts.push(`${extractedPages - ocrPages} text page(s)`);
            }
            if (ocrPages > 0) {
                summaryParts.push(`${ocrPages} image page(s) via OCR`);
            }
            const summaryMsg = `Processing complete: extracted ${fullText.trim().length} characters from ${summaryParts.join(' + ')} (${pdf.numPages} total). Parsing data...`;
            console.log(summaryMsg);
            UI.showToast(summaryMsg, 'info');
            
            // Parse extracted text
            parseTextToData(fullText);
            
        } catch (error) {
            console.error('=== PDF ERROR ===');
            console.error('Error type:', error.name);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            console.error('Full error:', error);
            console.error('===================');
            
            let errorMessage = 'Error reading PDF: ';
            if (error.name === 'PasswordException') {
                errorMessage += 'PDF is password protected';
            } else if (error.name === 'InvalidPDFException') {
                errorMessage += 'Invalid or corrupted PDF file';
            } else if (error.name === 'MissingPDFException') {
                errorMessage += 'PDF file not found';
            } else if (error.message && error.message.includes('worker')) {
                errorMessage += 'PDF worker failed to load. Try refreshing the page or use Excel/CSV format.';
            } else if (error.message && error.message.includes('timeout')) {
                errorMessage += 'PDF processing timed out. File may be too large or corrupted.';
            } else {
                errorMessage += error.message || 'Unknown error';
            }
            
            UI.showToast(errorMessage, 'error');
            console.log('PDF extraction failed. Suggest using Excel or CSV format.');
        }
    };
    
    fileReader.onerror = function(error) {
        console.error('FileReader error:', error);
        console.error('FileReader error code:', fileReader.error ? fileReader.error.code : 'unknown');
        UI.showToast('Error reading file. Please try again.', 'error');
    };
    
    fileReader.onabort = function() {
        console.error('FileReader aborted');
        UI.showToast('File reading was aborted', 'error');
    };
    
    try {
        fileReader.readAsArrayBuffer(file);
    } catch (readError) {
        console.error('Error starting FileReader:', readError);
        UI.showToast('Could not start reading file', 'error');
    }
}

function handleImageUpload(file) {
    console.log('=== IMAGE UPLOAD STARTED ===');
    console.log('File name:', file.name);
    console.log('File type:', file.type);
    console.log('File size:', file.size, 'bytes');
    
    UI.showToast('Reading image with OCR... This may take a moment', 'info');

    // Show image preview
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const reader = new FileReader();
    
    reader.onload = (e) => {
        imagePreview.src = e.target.result;
        imagePreviewContainer.style.display = 'block';
    };
    reader.readAsDataURL(file);

    // Check if Tesseract is available
    if (typeof Tesseract === 'undefined') {
        console.error('Tesseract.js not loaded!');
        UI.showToast('OCR library not loaded. Please check your internet connection and refresh the page.', 'error');
        return;
    }
    
    console.log('Tesseract.js version:', Tesseract.version || '5.x');
    console.log('Starting OCR recognition...');

    // Perform OCR using Tesseract.js v5
    Tesseract.recognize(
        file,
        'eng+ara',  // English + Arabic support
        {
            logger: m => {
                console.log('OCR Status:', m.status, 'Progress:', m.progress ? Math.round(m.progress * 100) + '%' : 'N/A');
                if (m.status === 'recognizing text') {
                    UI.showToast(`OCR Progress: ${Math.round(m.progress * 100)}%`, 'info');
                }
            }
        }
    ).then(({ data: { text } }) => {
        console.log('=== OCR COMPLETE ===');
        console.log('Extracted text length:', text.length);
        console.log('Text preview:', text.substring(0, 300));
        
        if (!text || !text.trim()) {
            UI.showToast('No text could be extracted from this image. Try a clearer image or use PDF/Excel format.', 'warning');
            return;
        }
        
        UI.showToast(`OCR complete! Extracted ${text.trim().length} characters. Parsing...`, 'success');
        parseTextToData(text);
    }).catch(err => {
        console.error('=== OCR ERROR ===');
        console.error('Error type:', err.name || 'Unknown');
        console.error('Error message:', err.message);
        console.error('Full error:', err);
        UI.showToast('Error reading image: ' + err.message, 'error');
    });
}

function parseTextToData(text) {
    console.log('Parsing text from PDF, length:', text.length);
    console.log('First 500 chars:', text.substring(0, 500));

    // ── Field mapping used throughout ──
    const FIELD_MAP = {
        'name': 'name',
        'phone': 'phone',
        'mobile': 'phone',
        'email': 'email',
        'company': 'company',
        'nationality': 'nationality',
        'budget': 'budget',
        'location': 'location',
        'address': 'location',
        'plottype': 'plotType',
        'plotno': 'plotNo',
        'plotid': 'plotNo',
        'plot id': 'plotNo',
        'plot type': 'plotType',
        'district': 'district',
        'city': 'city',
        'development': 'development',
        'zone': 'zone',
        'zoning': 'zoning',
        'gfa': 'gfa',
        'nfa': 'nfa',
        'bua': 'bua',
        'far': 'far',
        'height': 'height',
        'size': 'size',
        'view': 'view',
        'status': 'status',
        'handover': 'handoverDate',
        'price': 'budget',
        'area': 'size',
        'type': 'plotType',
        'source': 'source',
        'notes': 'notes',
        'owner': 'name'
    };

    // Keys whose reappearance signals a NEW record
    const RECORD_BOUNDARY_KEYS = new Set(['name', 'plotno', 'plotid', 'plot id']);

    // Regex that captures Key: Value pairs (case-insensitive)
    // Supports keys with spaces like "Plot ID", "Plot Type"
    const KV_KEYS = 'Name|Phone|Mobile|Email|Company|Nationality|Budget|Location|Address|Plot\\s*Type|Plot\\s*No|Plot\\s*ID|District|City|Development|Zone|Zoning|GFA|NFA|BUA|FAR|Height|Size|View|Status|Handover|Source|Notes|Price|Area|Type|Owner';
    const KV_REGEX = new RegExp('(?:^|\\s)(' + KV_KEYS + ')\\s*[:=]\\s*(.+?)(?=\\s+(?:' + KV_KEYS + ')\\s*[:=]|$)', 'gi');

    // ── Step 1: Try tabular (TSV / CSV) detection ──
    const rawLines = text.split('\n');
    const nonEmptyLines = rawLines.filter(l => l.trim());

    const tsvLines = nonEmptyLines.filter(l => l.includes('\t') && l.split('\t').length >= 3);
    if (tsvLines.length >= 2) {
        console.log('Detected TSV table structure');
        const jsonData = tsvLines.map(l => l.split('\t'));
        parseImportData(jsonData);
        return;
    }

    // ── Step 2: Try key-value structured parsing ──
    // Normalise the text: collapse lines so that key-value pairs that
    // span multiple PDF-extracted lines are joined properly.
    // We first try line-by-line, then fall back to full-text scanning.

    function extractKVPairs(inputText) {
        const pairs = [];
        let m;
        KV_REGEX.lastIndex = 0;
        while ((m = KV_REGEX.exec(inputText)) !== null) {
            const rawKey = m[1].trim().toLowerCase().replace(/\s+/g, '');
            const value = m[2].trim();
            const mappedField = FIELD_MAP[rawKey] || rawKey;
            pairs.push({ rawKey, field: mappedField, value });
        }
        return pairs;
    }

    // First try line-by-line KV extraction (handles well-formatted PDFs)
    let allPairs = [];
    const simpleKV = /^\s*(Name|Phone|Mobile|Email|Company|Nationality|Budget|Location|Address|Plot\s*Type|Plot\s*No|Plot\s*ID|District|City|Development|Zone|Zoning|GFA|NFA|BUA|FAR|Height|Size|View|Status|Handover|Source|Notes|Price|Area|Type|Owner)\s*[:=]\s*(.+)$/i;

    nonEmptyLines.forEach(line => {
        const match = line.match(simpleKV);
        if (match) {
            const rawKey = match[1].trim().toLowerCase().replace(/\s+/g, '');
            const value = match[2].trim();
            const mappedField = FIELD_MAP[rawKey] || rawKey;
            allPairs.push({ rawKey, field: mappedField, value });
        }
    });

    // If line-by-line found very few pairs, try full-text scan
    // (handles PDFs where key-value pairs are on the same line)
    if (allPairs.length < 2) {
        const joined = rawLines.join(' ').replace(/\s+/g, ' ');
        allPairs = extractKVPairs(joined);
    }

    console.log('Key-value pairs found:', allPairs.length);

    // ── Step 3: Split pairs into records ──
    if (allPairs.length >= 2) {
        const records = [];
        let currentRecord = {};

        allPairs.forEach(pair => {
            // If this key signals a new record AND current record already has it → push & start new
            if (RECORD_BOUNDARY_KEYS.has(pair.rawKey) && currentRecord[pair.field]) {
                if (Object.keys(currentRecord).length > 0) {
                    records.push(currentRecord);
                }
                currentRecord = {};
            }
            currentRecord[pair.field] = pair.value;
        });
        // Push last record
        if (Object.keys(currentRecord).length > 0) {
            records.push(currentRecord);
        }

        console.log('Structured records parsed:', records.length, records);

        if (records.length > 0) {
            convertRecordsToTable(records);
            return;
        }
    }

    // ── Step 4: Try splitting on blank lines / separators ──
    const blockSplitPattern = new RegExp('\n\\s*\n|\n[-=_*]{3,}\n');
    const blocks = text.split(blockSplitPattern).filter(b => b.trim());
    if (blocks.length > 1) {
        console.log('Trying block-based splitting, blocks:', blocks.length);
        const records = [];
        blocks.forEach(block => {
            const pairs = [];
            block.split('\n').forEach(line => {
                const match = line.match(simpleKV);
                if (match) {
                    const rawKey = match[1].trim().toLowerCase().replace(/\s+/g, '');
                    const value = match[2].trim();
                    const mappedField = FIELD_MAP[rawKey] || rawKey;
                    pairs.push({ field: mappedField, value });
                }
            });
            if (pairs.length > 0) {
                const rec = {};
                pairs.forEach(p => { rec[p.field] = p.value; });
                records.push(rec);
            }
        });
        if (records.length > 0) {
            console.log('Block-based records:', records.length, records);
            convertRecordsToTable(records);
            return;
        }
    }

    // ── Step 5: Fallback – extract whatever we can from unstructured text ──
    console.log('No structured key-value data found. Attempting unstructured extraction...');
    const fallbackRecords = [];

    const phoneRegex = /(\+?\d[\d\s\-().]{7,}\d)/g;
    const emailRegex = /([\w.+-]+@[\w.-]+\.[a-zA-Z]{2,})/g;

    // Try comma-separated contact patterns first: "John Doe, john@test.com, +962-79-5551234"
    const commaPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s*[,;]\s*([\w.+-]+@[\w.-]+\.[a-zA-Z]{2,})\s*[,;]\s*(\+?\d[\d\s\-().]{7,}\d)/g;
    let commaMatch;
    while ((commaMatch = commaPattern.exec(text)) !== null) {
        fallbackRecords.push({
            name: commaMatch[1].trim(),
            email: commaMatch[2].trim(),
            phone: commaMatch[3].trim()
        });
    }
    // Also try phone-before-email order: "Name, +962..., email"
    const commaPattern2 = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s*[,;]\s*(\+?\d[\d\s\-().]{7,}\d)\s*[,;]\s*([\w.+-]+@[\w.-]+\.[a-zA-Z]{2,})/g;
    while ((commaMatch = commaPattern2.exec(text)) !== null) {
        fallbackRecords.push({
            name: commaMatch[1].trim(),
            phone: commaMatch[2].trim(),
            email: commaMatch[3].trim()
        });
    }

    if (fallbackRecords.length === 0) {
        // Extract all phones and emails
        const phones = [...text.matchAll(phoneRegex)].map(m => m[1].trim());
        const emails = [...text.matchAll(emailRegex)].map(m => m[1].trim());

        if (phones.length > 0 || emails.length > 0) {
            // Pair phones with emails
            const count = Math.max(phones.length, emails.length, 1);
            for (let i = 0; i < count; i++) {
                const rec = {};
                if (phones[i]) rec.phone = phones[i];
                if (emails[i]) rec.email = emails[i];
                if (Object.keys(rec).length > 0) fallbackRecords.push(rec);
            }

            // Try to find name-like text: strip phone/email from lines, check what remains
            const nameLines = [];
            const phoneRegexLocal = /(\+?\d[\d\s\-().]{7,}\d)/g;
            const emailRegexLocal = /([\w.+-]+@[\w.-]+\.[a-zA-Z]{2,})/g;
            nonEmptyLines.forEach(l => {
                const t = l.trim();
                // Strip common prefixes
                let cleaned = t.replace(/^(Contact|Client|Person|Name)\s*:\s*/i, '');
                // Remove phone numbers and emails from the line, then check what's left
                cleaned = cleaned.replace(phoneRegexLocal, '').replace(emailRegexLocal, '').replace(/[,;:]/g, '').trim();
                phoneRegexLocal.lastIndex = 0;
                emailRegexLocal.lastIndex = 0;
                if (cleaned.length > 2 && cleaned.length < 60 &&
                    !/^[-=_*]+$/.test(cleaned) &&
                    !/^\d+$/.test(cleaned) &&
                    /[a-zA-Z]/.test(cleaned)) {
                    nameLines.push(cleaned);
                }
            });

            // Assign names to records if counts align
            if (nameLines.length > 0) {
                for (let i = 0; i < Math.min(nameLines.length, fallbackRecords.length); i++) {
                    fallbackRecords[i].name = nameLines[i];
                }
            }
        }
    }

    if (fallbackRecords.length > 0) {
        console.log('Fallback records:', fallbackRecords.length, fallbackRecords);
        convertRecordsToTable(fallbackRecords);
        return;
    }

    // ── Step 6: Nothing found ──
    console.warn('No structured data could be extracted');
    UI.showToast('Could not parse structured data from this PDF. Please use a PDF with labeled fields (Name:, Phone:, Email:, etc.) or try Excel/CSV format.', 'error');
}

// Helper: convert array of record objects into table format for parseImportData()
function convertRecordsToTable(records) {
    const ALL_HEADERS = ['name', 'phone', 'email', 'company', 'nationality', 'budget', 'location',
        'plotType', 'plotNo', 'district', 'city', 'development', 'zone', 'zoning',
        'gfa', 'nfa', 'bua', 'far', 'height', 'size', 'view', 'status',
        'handoverDate', 'price', 'source', 'notes'];

    // Only include headers that have at least one value across all records
    const usedHeaders = ALL_HEADERS.filter(h =>
        records.some(r => r[h] && String(r[h]).trim())
    );
    // Always ensure 'name' header is present
    if (!usedHeaders.includes('name')) {
        usedHeaders.unshift('name');
    }

    const tableData = [usedHeaders];
    records.forEach(record => {
        const row = usedHeaders.map(h => record[h] || '');
        tableData.push(row);
    });

    console.log('Table data for import:', tableData.length - 1, 'rows,', usedHeaders.length, 'columns');
    parseImportData(tableData);
}

function parseImportData(data) {
    if (data.length < 2) {
        UI.showToast('File appears to be empty', 'error');
        return;
    }

    // First row is headers
    const headers = data[0].map(h => String(h).trim());
    const rows = data.slice(1).filter(row => row.some(cell => cell !== '' && cell !== null));

    // Map columns to fields
    const columnMap = mapColumns(headers);

    // Convert rows to objects
    importedData = rows.map(row => {
        const obj = {};
        headers.forEach((header, index) => {
            const field = columnMap[header] || header.toLowerCase();
            obj[field] = row[index] ? String(row[index]).trim() : '';
        });
        return obj;
    }).map(obj => {
        // Generate placeholder name if missing but has other identifying data
        if (!obj.name && (obj.email || obj.phone)) {
            if (obj.email) {
                // Use email username as name: "john.doe@test.com" → "John Doe"
                obj.name = obj.email.split('@')[0]
                    .replace(/[._-]+/g, ' ')
                    .replace(/\b\w/g, c => c.toUpperCase());
            } else if (obj.phone) {
                obj.name = 'Contact ' + obj.phone;
            }
        }
        return obj;
    }).filter(obj => obj.name || obj.phone || obj.email || obj.plotNo); // Keep rows with any useful identifier

    if (importedData.length === 0) {
        UI.showToast('No valid data found in file', 'error');
        return;
    }

    showFilePreview(headers, importedData);
}

function mapColumns(headers) {
    const map = {};
    const fieldMappings = {
        'name': ['name', 'client name', 'customer name', 'full name', 'contact name'],
        'phone': ['phone', 'mobile', 'contact', 'phone number', 'cell'],
        'email': ['email', 'e-mail', 'email address'],
        'nationality': ['nationality', 'country', 'origin'],
        'budget': ['budget', 'price', 'amount', 'max budget', 'budget range'],
        'location': ['location', 'area', 'city', 'preferred location', 'district'],
        'plotType': ['plot type', 'type', 'property type', 'plot'],
        'source': ['source', 'lead source', 'how found', 'referral source'],
        'notes': ['notes', 'comments', 'remarks', 'description']
    };

    headers.forEach(header => {
        const lowerHeader = header.toLowerCase();
        for (const [field, alternatives] of Object.entries(fieldMappings)) {
            if (alternatives.some(alt => lowerHeader.includes(alt))) {
                map[header] = field;
                break;
            }
        }
    });

    return map;
}

function showFilePreview(headers, data) {
    const preview = document.getElementById('file-preview');
    const info = document.getElementById('file-info');
    const thead = document.getElementById('preview-thead');
    const tbody = document.getElementById('preview-tbody');
    const importBtn = document.getElementById('import-btn');

    info.innerHTML = `<strong>${importedFileName}</strong> - ${data.length} records found`;

    // Show first 5 rows in preview
    if (headers && headers.length > 0) {
        thead.innerHTML = '<tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr>';
        tbody.innerHTML = data.slice(0, 5).map(row => 
            '<tr>' + headers.map(h => `<td>${row[h.toLowerCase()] || '-'}</td>`).join('') + '</tr>'
        ).join('');

        if (data.length > 5) {
            tbody.innerHTML += `<tr><td colspan="${headers.length}" class="text-muted">... and ${data.length - 5} more records</td></tr>`;
        }
    } else {
        // For text-based imports, show raw data
        thead.innerHTML = '<tr><th>Extracted Data</th></tr>';
        tbody.innerHTML = data.slice(0, 5).map(row => 
            `<tr><td>${JSON.stringify(row)}</td></tr>`
        ).join('');
    }

    preview.style.display = 'block';
    importBtn.style.display = 'inline-flex';
}

function importFileData() {
    if (importedData.length === 0) {
        UI.showToast('No data to import', 'error');
        return;
    }

    const createLeads = document.getElementById('create-leads').checked;
    const skipDuplicates = document.getElementById('skip-duplicates').checked;
    const assignTo = document.getElementById('import-assign-agent').value.trim();

    let cisCreated = 0;
    let leadsCreated = 0;
    let duplicatesSkipped = 0;

    importedData.forEach(record => {
        // Check for duplicates
        if (skipDuplicates && (record.phone || record.email)) {
            const existingCIS = DataStore.cis.find(c => 
                (record.phone && c.phone === record.phone) || 
                (record.email && c.email === record.email)
            );
            
            if (existingCIS) {
                duplicatesSkipped++;
                return;
            }
        }

        // Create CIS record
        const cis = {
            id: 'CIS-' + String(DataStore.cis.length + 1).padStart(3, '0'),
            name: record.name || 'Unknown',
            date: new Date().toISOString().split('T')[0],
            phone: record.phone || '',
            email: record.email || '',
            nationality: record.nationality || '',
            budget: record.budget ? parseFloat(record.budget.replace(/[^0-9.-]+/g, '')) || 0 : 0,
            plotType: record.plotType || '',
            location: record.location || '',
            source: record.source || '',
            status: 'New',
            notes: record.notes || '',
            createLead: createLeads ? 'YES' : '',
            leadId: ''
        };

        DataStore.cis.push(cis);
        cisCreated++;

        // Create Lead if option selected
        if (createLeads) {
            const lead = {
                id: 'LEAD-' + String(DataStore.leads.length + 1).padStart(3, '0'),
                cisId: cis.id,
                name: cis.name,
                date: cis.date,
                phone: cis.phone,
                email: cis.email,
                nationality: cis.nationality,
                budget: cis.budget,
                plotType: cis.plotType,
                location: cis.location,
                source: cis.source,
                status: 'New',
                priority: 'Medium',
                assignedTo: assignTo || '',
                lastContact: '',
                daysSinceContact: 0,
                notes: cis.notes,
                makeDeal: '',
                dealId: ''
            };

            DataStore.leads.push(lead);
            cis.leadId = lead.id;
            leadsCreated++;
        }
    });

    DataStore.saveToStorage();

    // Show results
    let message = `Imported ${cisCreated} CIS records`;
    if (createLeads) message += ` and ${leadsCreated} Leads`;
    if (duplicatesSkipped > 0) message += ` (${duplicatesSkipped} duplicates skipped)`;

    UI.showToast(message, 'success');
    closeModal('file-import-modal');

    // Refresh tables
    UI.refreshCISTable();
    UI.refreshLeadsTable();

    // Reset
    resetFileImport();
}

// ============================================================================
// SEND TO FUNCTIONALITY
// ============================================================================

let currentSendTo = {
    type: '',
    id: '',
    name: ''
};

// Open Send To Modal
function openSendToModal(type, id, name) {
    currentSendTo = { type, id, name };
    
    // Reset form
    document.getElementById('send-type').value = '';
    document.getElementById('internal-recipient').value = '';
    document.getElementById('external-recipient').value = '';
    document.getElementById('send-message').value = '';
    document.getElementById('internal-recipient-group').style.display = 'none';
    document.getElementById('external-recipient-group').style.display = 'none';
    
    // Load users/agents for internal dropdown
    loadInternalRecipients();
    
    openModal('send-to-modal');
}

// Load internal recipients (users and agents) - ONLY REAL FIREBASE USERS
async function loadInternalRecipients() {
    await populateUserDropdown('internal-recipient', 'Select recipient...');
}

// Update Send To dropdown based on type
function updateSendToDropdown() {
    const sendType = document.getElementById('send-type').value;
    
    document.getElementById('internal-recipient-group').style.display = 
        sendType === 'internal' ? 'block' : 'none';
    document.getElementById('external-recipient-group').style.display = 
        sendType === 'external' ? 'block' : 'none';
}

// Execute Send To
function executeSendTo() {
    const sendType = document.getElementById('send-type').value;
    const message = document.getElementById('send-message').value;
    
    if (!sendType) {
        UI.showToast('Please select send type', 'error');
        return;
    }
    
    let recipient = '';
    let recipientName = '';
    
    if (sendType === 'internal') {
        const select = document.getElementById('internal-recipient');
        recipient = select.value;
        recipientName = select.options[select.selectedIndex]?.text || '';
        
        if (!recipient) {
            UI.showToast('Please select a recipient', 'error');
            return;
        }
    } else if (sendType === 'external') {
        recipientName = document.getElementById('external-recipient').value.trim();
        
        if (!recipientName) {
            UI.showToast('Please enter owner name', 'error');
            return;
        }
    }
    
    // Create send record
    const sendRecord = {
        id: 'send-' + Date.now(),
        type: currentSendTo.type,
        itemId: currentSendTo.id,
        itemName: currentSendTo.name,
        sendType: sendType,
        recipient: recipient,
        recipientName: recipientName,
        message: message,
        sentBy: Auth.currentUser ? Auth.currentUser.name : 'Unknown',
        timestamp: new Date().toISOString()
    };
    
    // Save to localStorage
    const sends = JSON.parse(localStorage.getItem('aiplot_sends') || '[]');
    sends.push(sendRecord);
    localStorage.setItem('aiplot_sends', JSON.stringify(sends));
    
    UI.showToast(`Sent to ${recipientName} successfully!`, 'success');
    closeModal('send-to-modal');
}

// Expose functions to window
window.openSendToModal = openSendToModal;
window.updateSendToDropdown = updateSendToDropdown;
window.executeSendTo = executeSendTo;

// ============ FEASIBILITY STUDY TEMPLATE ============

// Open feasibility template and fill with lead data
function openFeasibilityTemplate(leadData) {
    // Fill form fields from lead data
    const d = leadData || {};
    document.getElementById('fs-client-name').value = d.name || d.clientName || '';
    document.getElementById('fs-date').value = new Date().toISOString().slice(0, 10);
    document.getElementById('fs-location').value = d.location || d.plotLocation || '';
    document.getElementById('fs-plot-type').value = d.plotType || '';
    document.getElementById('fs-phone').value = d.phone || '';
    document.getElementById('fs-email').value = d.email || '';
    document.getElementById('fs-nationality').value = d.nationality || '';
    document.getElementById('fs-notes').value = d.notes || '';
    
    // Try to parse budget as land cost
    const budget = d.budget ? String(d.budget).replace(/[^0-9.]/g, '') : '';
    if (budget) {
        document.getElementById('fs-land-cost').value = budget;
    }
    
    // Reset calculated fields
    document.getElementById('fs-plot-size').value = '';
    document.getElementById('fs-gfa').value = '';
    document.getElementById('fs-construction-cost-sqft').value = '800';
    document.getElementById('fs-selling-price-sqft').value = '1500';
    document.getElementById('fs-duration').value = '24';
    document.getElementById('fs-zoning').value = '';
    
    recalcFeasibility();
    openModal('feasibility-template-modal');
}

// Recalculate all computed fields
function recalcFeasibility() {
    const plotSize = parseFloat(document.getElementById('fs-plot-size').value) || 0;
    const landCost = parseFloat(document.getElementById('fs-land-cost').value) || 0;
    const gfa = parseFloat(document.getElementById('fs-gfa').value) || 0;
    const constCostSqft = parseFloat(document.getElementById('fs-construction-cost-sqft').value) || 0;
    const sellPriceSqft = parseFloat(document.getElementById('fs-selling-price-sqft').value) || 0;
    
    const landCostPerSqft = plotSize > 0 ? (landCost / plotSize) : 0;
    const totalConstruction = gfa * constCostSqft;
    const totalRevenue = gfa * sellPriceSqft;
    const totalProjectCost = landCost + totalConstruction;
    const netProfit = totalRevenue - totalProjectCost;
    const roi = totalProjectCost > 0 ? ((netProfit / totalProjectCost) * 100) : 0;
    const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100) : 0;
    const duration = parseFloat(document.getElementById('fs-duration').value) || 24;
    const payback = netProfit > 0 ? Math.round((totalProjectCost / (netProfit / duration))) : 0;
    
    const fmt = (n) => n.toLocaleString('en-US', {maximumFractionDigits: 0});
    
    document.getElementById('fs-land-cost-sqft').value = landCostPerSqft > 0 ? fmt(landCostPerSqft) + ' AED' : '';
    document.getElementById('fs-total-construction').value = totalConstruction > 0 ? fmt(totalConstruction) + ' AED' : '';
    document.getElementById('fs-total-revenue').value = totalRevenue > 0 ? fmt(totalRevenue) + ' AED' : '';
    document.getElementById('fs-total-project-cost').value = totalProjectCost > 0 ? fmt(totalProjectCost) + ' AED' : '';
    document.getElementById('fs-net-profit').value = netProfit !== 0 ? fmt(netProfit) + ' AED' : '';
    
    document.getElementById('fs-roi').textContent = roi !== 0 ? roi.toFixed(1) + '%' : '--%';
    document.getElementById('fs-profit-margin').textContent = profitMargin !== 0 ? profitMargin.toFixed(1) + '%' : '--%';
    document.getElementById('fs-payback').textContent = payback > 0 ? payback + ' months' : '-- months';
    
    // Color code profit
    const profitEl = document.getElementById('fs-net-profit');
    if (profitEl) profitEl.style.color = netProfit >= 0 ? '#22c55e' : '#ef4444';
}

// Generate PDF from template
function generateStudyFromTemplate() {
    const clientName = document.getElementById('fs-client-name').value || 'Unknown';
    const date = document.getElementById('fs-date').value || new Date().toLocaleDateString();
    const location = document.getElementById('fs-location').value || 'N/A';
    const plotType = document.getElementById('fs-plot-type').value || 'N/A';
    const phone = document.getElementById('fs-phone').value || 'N/A';
    const email = document.getElementById('fs-email').value || 'N/A';
    const nationality = document.getElementById('fs-nationality').value || 'N/A';
    const plotSize = document.getElementById('fs-plot-size').value || 'N/A';
    const landCost = document.getElementById('fs-land-cost').value || 'N/A';
    const landCostSqft = document.getElementById('fs-land-cost-sqft').value || 'N/A';
    const zoning = document.getElementById('fs-zoning').value || 'N/A';
    const gfa = document.getElementById('fs-gfa').value || 'N/A';
    const constCostSqft = document.getElementById('fs-construction-cost-sqft').value || 'N/A';
    const totalConst = document.getElementById('fs-total-construction').value || 'N/A';
    const duration = document.getElementById('fs-duration').value || 'N/A';
    const sellPrice = document.getElementById('fs-selling-price-sqft').value || 'N/A';
    const totalRevenue = document.getElementById('fs-total-revenue').value || 'N/A';
    const totalCost = document.getElementById('fs-total-project-cost').value || 'N/A';
    const netProfit = document.getElementById('fs-net-profit').value || 'N/A';
    const roi = document.getElementById('fs-roi').textContent;
    const margin = document.getElementById('fs-profit-margin').textContent;
    const payback = document.getElementById('fs-payback').textContent;
    const notes = document.getElementById('fs-notes').value || 'No additional notes.';

    const html = `<!DOCTYPE html><html><head><title>Feasibility Study - ${clientName}</title>
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color:#333; padding:40px; max-width:850px; margin:0 auto; }
        .header { text-align:center; margin-bottom:30px; padding-bottom:20px; border-bottom:3px solid #667eea; }
        .header h1 { color:#667eea; font-size:28px; }
        .header h2 { color:#764ba2; font-size:20px; margin-top:5px; }
        .header p { color:#999; font-size:13px; margin-top:5px; }
        .section { margin-bottom:24px; }
        .section h3 { color:#667eea; font-size:16px; border-bottom:2px solid #667eea; padding-bottom:6px; margin-bottom:12px; }
        table { width:100%; border-collapse:collapse; }
        td { padding:8px 10px; border-bottom:1px solid #eee; font-size:14px; }
        td:first-child { font-weight:600; color:#555; width:40%; }
        .metrics { display:flex; gap:16px; justify-content:center; margin:20px 0; }
        .metric-card { flex:1; background:#f0f4ff; padding:20px; border-radius:10px; text-align:center; }
        .metric-card .label { font-size:12px; color:#666; }
        .metric-card .value { font-size:28px; font-weight:bold; color:#667eea; }
        .notes-box { background:#f8fafc; padding:16px; border-radius:8px; border-left:4px solid #667eea; }
        .footer { text-align:center; margin-top:30px; padding-top:20px; border-top:1px solid #eee; color:#999; font-size:11px; }
        @media print { body { padding:20px; } }
    </style></head><body>
    <div class="header">
        <h1>Feasibility Study Report</h1>
        <h2>${clientName}</h2>
        <p>Generated on ${date} | AI Plot Portal</p>
    </div>
    <div class="section"><h3>1. Project Overview</h3>
        <table><tr><td>Client</td><td>${clientName}</td></tr><tr><td>Phone</td><td>${phone}</td></tr><tr><td>Email</td><td>${email}</td></tr><tr><td>Nationality</td><td>${nationality}</td></tr><tr><td>Location</td><td>${location}</td></tr><tr><td>Plot Type</td><td>${plotType}</td></tr></table>
    </div>
    <div class="section"><h3>2. Land Details</h3>
        <table><tr><td>Plot Size</td><td>${plotSize} sqft</td></tr><tr><td>Land Cost</td><td>${landCost} AED</td></tr><tr><td>Cost per sqft</td><td>${landCostSqft}</td></tr><tr><td>Zoning</td><td>${zoning}</td></tr></table>
    </div>
    <div class="section"><h3>3. Construction Estimates</h3>
        <table><tr><td>GFA</td><td>${gfa} sqft</td></tr><tr><td>Cost per sqft</td><td>${constCostSqft} AED</td></tr><tr><td>Total Construction</td><td>${totalConst}</td></tr><tr><td>Duration</td><td>${duration} months</td></tr></table>
    </div>
    <div class="section"><h3>4. Revenue Projections</h3>
        <table><tr><td>Selling Price/sqft</td><td>${sellPrice} AED</td></tr><tr><td>Total Revenue</td><td>${totalRevenue}</td></tr><tr><td>Total Project Cost</td><td>${totalCost}</td></tr><tr><td>Net Profit</td><td style="font-weight:bold;color:${String(netProfit).includes('-') ? '#ef4444' : '#22c55e'};">${netProfit}</td></tr></table>
    </div>
    <div class="section"><h3>5. Financial Analysis</h3>
        <div class="metrics">
            <div class="metric-card"><div class="label">ROI</div><div class="value">${roi}</div></div>
            <div class="metric-card"><div class="label">Profit Margin</div><div class="value">${margin}</div></div>
            <div class="metric-card"><div class="label">Payback Period</div><div class="value">${payback}</div></div>
        </div>
    </div>
    <div class="section"><h3>6. Notes & Remarks</h3><div class="notes-box">${notes}</div></div>
    <div class="footer">Powered by AI Plot Portal | feasibility.at.world</div>
    <script>window.onload = function() { window.print(); }<\/script>
    </body></html>`;
    
    const w = window.open('', '_blank');
    if (w) {
        w.document.write(html);
        w.document.close();
        showToast('Feasibility study generated! Use Ctrl+P to save as PDF.', 'success');
    } else {
        showToast('Please allow popups to generate the PDF.', 'warning');
    }
}

// Override old generateFeasibilityPDF to use template
function generateFeasibilityPDF(leadData) {
    openFeasibilityTemplate(leadData);
}

// Expose all to global scope
window.openFeasibilityTemplate = openFeasibilityTemplate;
window.recalcFeasibility = recalcFeasibility;
window.generateStudyFromTemplate = generateStudyFromTemplate;
window.generateFeasibilityPDF = generateFeasibilityPDF;

// Open feasibility.at.world with lead data pre-filled via URL params
function openFeasibilityWithData(leadData) {
    const d = leadData || {};
    const name = d.name || d.clientName || '';
    const location = d.location || d.plotLocation || '';
    const budget = d.budget || '';
    const plotType = d.plotType || '';
    const phone = d.phone || '';
    const email = d.email || '';
    const nationality = d.nationality || '';
    const notes = d.notes || '';
    
    // Build URL with query parameters
    const params = new URLSearchParams();
    if (name) params.set('name', name);
    if (location) params.set('location', location);
    if (budget) params.set('budget', budget);
    if (plotType) params.set('type', plotType);
    if (phone) params.set('phone', phone);
    if (email) params.set('email', email);
    if (nationality) params.set('nationality', nationality);
    if (notes) params.set('notes', notes);
    
    const url = 'https://feasibility.at.world/' + (params.toString() ? '?' + params.toString() : '');
    
    // Update the existing feasibility iframe modal to use this URL
    const modal = document.getElementById('feasibility-modal');
    if (modal) {
        const iframe = modal.querySelector('iframe');
        if (iframe) {
            iframe.src = url;
        }
        // Update the info bar with lead details
        const infoBar = modal.querySelector('.feasibility-lead-info');
        if (infoBar) {
            infoBar.innerHTML = '<strong>' + name + '</strong> | ' + location + ' | Budget: ' + budget;
        }
        // Also update the "Open Full Site" link
        const fullSiteLink = modal.querySelector('a[target="_blank"]');
        if (fullSiteLink) {
            fullSiteLink.href = url;
        }
        openModal('feasibility-modal');
    } else {
        // Fallback: open in new tab
        window.open(url, '_blank');
    }
    
    showToast('Opening feasibility site with lead data...', 'info');
}
window.openFeasibilityWithData = openFeasibilityWithData;

// Open feasibility study modal
function openFeasibilityStudy(leadData) {
    const modal = document.getElementById('feasibility-modal');
    const iframe = document.getElementById('feasibility-iframe');
    const leadInfo = document.getElementById('feasibility-lead-info');
    
    // Set lead info display
    if (leadData) {
        const name = leadData.name || leadData.clientName || 'Unknown';
        const location = leadData.location || leadData.plotLocation || '';
        const budget = leadData.budget || '';
        leadInfo.textContent = `Lead: ${name}${location ? ' | ' + location : ''}${budget ? ' | Budget: ' + budget : ''}`;
    } else {
        leadInfo.textContent = '';
    }
    
    // Load feasibility site in iframe
    iframe.src = 'https://feasibility.at.world/';
    
    // Open modal
    if (modal) {
        modal.classList.add('active');
    }
}

// Open feasibility for a specific lead (from prompt)
function openFeasibilityForLead(leadData) {
    closeModal('feasibility-prompt-modal');
    openFeasibilityStudy(leadData);
}

// Show feasibility prompt after lead creation
function showFeasibilityPrompt(leadData) {
    window._lastCreatedLead = leadData;
    const details = document.getElementById('feasibility-prompt-details');
    if (details && leadData) {
        const name = leadData.name || leadData.clientName || 'N/A';
        const phone = leadData.phone || 'N/A';
        const location = leadData.location || leadData.plotLocation || 'N/A';
        const budget = leadData.budget || 'N/A';
        const plotType = leadData.plotType || 'N/A';
        details.innerHTML = `
            <div><strong>Name:</strong> ${name}</div>
            <div><strong>Phone:</strong> ${phone}</div>
            <div><strong>Location:</strong> ${location}</div>
            <div><strong>Budget:</strong> ${budget}</div>
            <div><strong>Plot Type:</strong> ${plotType}</div>
        `;
    }
    openModal('feasibility-prompt-modal');
}

// Expose to global scope
window.openFeasibilityStudy = openFeasibilityStudy;
window.openFeasibilityForLead = openFeasibilityForLead;
window.showFeasibilityPrompt = showFeasibilityPrompt;
window.openFileImportModal = openFileImportModal;
window.processManualText = processManualText;
window.importFileData = typeof importFileData === 'function' ? importFileData : undefined;
window.processUrlImport = processUrlImport;

// Process URL import - fetch webpage and extract contact data
async function processUrlImport() {
    const urlInput = document.getElementById('url-import-input');
    const url = urlInput ? urlInput.value.trim() : '';
    
    if (!url) {
        showToast('Please enter a URL first', 'warning');
        return;
    }
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        showToast('Please enter a valid URL starting with http:// or https://', 'warning');
        return;
    }
    
    try {
        showToast('Fetching page content...', 'info');
        
        // Try fetching via a CORS proxy or directly
        let text = '';
        try {
            const response = await fetch(url, { mode: 'cors' });
            text = await response.text();
        } catch (corsErr) {
            // Try via allorigins proxy
            try {
                const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
                const response = await fetch(proxyUrl);
                text = await response.text();
            } catch (proxyErr) {
                showToast('Could not fetch the URL. Try copying the page content and pasting it in the text area instead.', 'warning');
                return;
            }
        }
        
        // Strip HTML tags to get plain text
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;
        const plainText = tempDiv.textContent || tempDiv.innerText || '';
        
        if (!plainText.trim()) {
            showToast('No text content found on that page', 'warning');
            return;
        }
        
        // Put extracted text into the manual text input and process it
        const manualInput = document.getElementById('manual-text-input');
        if (manualInput) {
            manualInput.value = plainText.substring(0, 10000); // Limit to 10k chars
        }
        
        importedFileName = 'url-import: ' + url;
        parseTextToData(plainText);
        showToast('Page content extracted! Review the data below.', 'success');
    } catch (error) {
        console.error('URL import error:', error);
        showToast('Failed to fetch URL: ' + error.message, 'error');
    }
}

// ============ SMART AREA RESEARCH FOR PLOT FORM ============

let researchDebounce = null;
let researchDismissed = false;

function triggerAreaResearch() {
    clearTimeout(researchDebounce);
    researchDebounce = setTimeout(executeAreaResearch, 400);
}

function executeAreaResearch() {
    if (researchDismissed) return;
    const city = (document.getElementById('plot-city')?.value || '').trim().toLowerCase();
    const district = (document.getElementById('plot-district')?.value || '').trim().toLowerCase();
    const development = (document.getElementById('plot-development')?.value || '').trim().toLowerCase();
    const zone = (document.getElementById('plot-zone')?.value || '').trim().toLowerCase();
    
    const searchTerms = [city, district, development, zone].filter(Boolean);
    if (searchTerms.length === 0) {
        const panel = document.getElementById('plot-area-research');
        if (panel) panel.style.display = 'none';
        return;
    }
    
    const searchQuery = searchTerms.join(' ');
    const areaName = district || development || city || 'Unknown Area';
    
    const panel = document.getElementById('plot-area-research');
    if (!panel) return;
    panel.style.display = 'block';
    document.getElementById('research-area-name').textContent = areaName.charAt(0).toUpperCase() + areaName.slice(1);
    
    showAIInsights(searchQuery);
    searchExistingRecords(searchTerms);
}

function showAIInsights(query) {
    const insightsDiv = document.getElementById('research-ai-insights');
    const contentDiv = document.getElementById('research-ai-content');
    
    if (typeof AILocationDB === 'undefined') {
        insightsDiv.style.display = 'none';
        return;
    }
    
    let locationData = null;
    const q = query.toLowerCase();
    
    const aliases = {
        'downtown': 'downtown dubai', 'marina': 'dubai marina',
        'palm': 'palm jumeirah', 'jbr': 'dubai marina',
        'business bay': 'business bay', 'jvc': 'jvc',
        'jumeirah village': 'jvc', 'dubai hills': 'dubai hills',
        'hills estate': 'dubai hills', 'deira': 'deira',
        'sharjah': 'sharjah'
    };
    
    let matchKey = null;
    for (const [alias, key] of Object.entries(aliases)) {
        if (q.includes(alias)) {
            matchKey = key;
            break;
        }
    }
    
    if (!matchKey) {
        for (const key of Object.keys(AILocationDB)) {
            if (q.includes(key) || key.includes(q)) {
                matchKey = key;
                break;
            }
        }
    }
    
    if (matchKey && AILocationDB[matchKey]) {
        locationData = AILocationDB[matchKey];
        insightsDiv.style.display = 'block';
        
        const stars = '\u2605'.repeat(locationData.investmentScore) + '\u2606'.repeat(5 - locationData.investmentScore);
        
        contentDiv.innerHTML = 
            '<div style="padding:8px;background:#f0f4ff;border-radius:6px;text-align:center;">' +
                '<div style="color:#888;font-size:11px;">Avg Price</div>' +
                '<div style="color:#667eea;font-weight:bold;">' + locationData.avgPrice + '</div>' +
            '</div>' +
            '<div style="padding:8px;background:#f0fff4;border-radius:6px;text-align:center;">' +
                '<div style="color:#888;font-size:11px;">Trend</div>' +
                '<div style="color:#22c55e;font-weight:bold;">' + locationData.trend + '</div>' +
            '</div>' +
            '<div style="padding:8px;background:#fff7ed;border-radius:6px;text-align:center;">' +
                '<div style="color:#888;font-size:11px;">Investment</div>' +
                '<div style="color:#f59e0b;font-weight:bold;">' + stars + '</div>' +
            '</div>' +
            '<div style="grid-column:span 3;padding:6px;color:#666;font-size:11px;">' +
                '<strong>Nearby:</strong> ' + (locationData.nearby || []).join(', ') +
            '</div>';
    } else {
        insightsDiv.style.display = 'none';
    }
}

function searchExistingRecords(searchTerms) {
    const has = function(val) {
        if (!val) return false;
        const v = String(val).toLowerCase();
        return searchTerms.some(function(term) { return v.includes(term); });
    };
    
    const matchingPlots = (DataStore.plots || []).filter(function(p) {
        return has(p.city) || has(p.district) || has(p.development) || has(p.zone) || has(p.plotNo);
    });
    
    const matchingLeads = (DataStore.leads || []).filter(function(l) {
        return has(l.location) || has(l.plotType) || has(l.name);
    });
    
    const matchingCIS = (DataStore.cis || []).filter(function(c) {
        return has(c.location) || has(c.plotType) || has(c.name);
    });
    
    const matchingDeals = (DataStore.deals || []).filter(function(d) {
        return has(d.location) || has(d.plotType) || has(d.clientName);
    });
    
    renderMatchCard('match-plots', 'Plots', matchingPlots, function(p) {
        return '<strong>' + (p.plotNo || p.id) + '</strong> - ' + (p.district || p.city || 'N/A') + 
               '<br><span style="color:#888;">' + (p.plotType || '') + ' | ' + (p.status || '') + 
               (p.totalPrice ? ' | AED ' + Number(p.totalPrice).toLocaleString() : '') + '</span>';
    });
    
    renderMatchCard('match-leads', 'Interested Leads', matchingLeads, function(l) {
        return '<strong>' + (l.name || 'Unknown') + '</strong>' +
               '<br><span style="color:#888;">' + (l.location || '') + ' | Budget: ' + (l.budget || 'N/A') + 
               ' | ' + (l.status || '') + '</span>';
    });
    
    renderMatchCard('match-cis', 'CIS Contacts', matchingCIS, function(c) {
        return '<strong>' + (c.name || 'Unknown') + '</strong>' +
               '<br><span style="color:#888;">' + (c.phone || '') + ' | ' + (c.location || '') + '</span>';
    });
    
    renderMatchCard('match-deals', 'Active Deals', matchingDeals, function(d) {
        return '<strong>' + (d.clientName || 'Unknown') + '</strong>' +
               '<br><span style="color:#888;">' + (d.location || '') + ' | AED ' + 
               Number(d.finalPrice || d.totalPrice || 0).toLocaleString() + '</span>';
    });
}

function renderMatchCard(elementId, title, items, formatFn) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    const icon = elementId === 'match-plots' ? 'fa-map-marked-alt' :
                 elementId === 'match-leads' ? 'fa-funnel-dollar' :
                 elementId === 'match-cis' ? 'fa-id-card' : 'fa-handshake';
    
    const color = elementId === 'match-plots' ? '#667eea' :
                  elementId === 'match-leads' ? '#f59e0b' :
                  elementId === 'match-cis' ? '#22c55e' : '#764ba2';
    
    if (items.length === 0) {
        el.innerHTML = '<div style="color:#aaa;"><i class="fas ' + icon + '" style="color:' + color + ';"></i> ' + title + ' <span style="background:#eee;padding:1px 8px;border-radius:10px;font-size:11px;">0</span></div>';
        return;
    }
    
    var html = '<div style="margin-bottom:6px;"><i class="fas ' + icon + '" style="color:' + color + ';"></i> ' + title + ' <span style="background:' + color + ';color:white;padding:1px 8px;border-radius:10px;font-size:11px;">' + items.length + '</span></div>';
    
    var displayItems = items.slice(0, 3);
    displayItems.forEach(function(item) {
        html += '<div style="padding:4px 0;border-bottom:1px solid #f0f0f0;">' + formatFn(item) + '</div>';
    });
    
    if (items.length > 3) {
        html += '<div style="color:#667eea;font-size:11px;margin-top:4px;">+ ' + (items.length - 3) + ' more</div>';
    }
    
    el.innerHTML = html;
}

window.triggerAreaResearch = triggerAreaResearch;
window.executeAreaResearch = executeAreaResearch;
