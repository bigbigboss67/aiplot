// ============================================================================
// CLICKABILITY ENHANCEMENT SCRIPT
// Add this to your existing AI Plot portal to make all fields clickable
// ============================================================================

// Add CSS for clickable elements
const clickableCSS = `
<style id="clickable-enhancements">
/* Clickable stat cards */
.stat-card {
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
}

.stat-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(59, 130, 246, 0.3);
    border: 2px solid #3b82f6;
}

/* Clickable table rows */
.data-table tbody tr {
    cursor: pointer;
    transition: all 0.2s ease;
}

.data-table tbody tr:hover {
    background: rgba(59, 130, 246, 0.1);
    transform: translateX(4px);
}

/* Clickable IDs */
.clickable-id {
    color: #3b82f6;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    transition: all 0.2s;
    display: inline-block;
}

.clickable-id:hover {
    color: #60a5fa;
    text-decoration: underline;
    transform: scale(1.05);
}

/* Detail Modal */
.detail-modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    z-index: 10000;
    animation: fadeIn 0.3s;
}

.detail-modal-content {
    background: linear-gradient(135deg, #1e293b 0%, #2d3748 100%);
    border-radius: 16px;
    max-width: 900px;
    margin: 50px auto;
    max-height: 85vh;
    overflow-y: auto;
    animation: slideDown 0.3s;
    border: 2px solid #3b82f6;
}

.detail-modal-header {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    padding: 20px 30px;
    border-radius: 16px 16px 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.detail-modal-header h2 {
    color: white;
    font-size: 24px;
    margin: 0;
}

.detail-modal-close {
    background: none;
    border: none;
    color: white;
    font-size: 28px;
    cursor: pointer;
    width: 35px;
    height: 35px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s;
}

.detail-modal-close:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: rotate(90deg);
}

.detail-modal-body {
    padding: 30px;
}

.detail-section {
    margin-bottom: 25px;
}

.detail-section h3 {
    color: #3b82f6;
    font-size: 18px;
    margin-bottom: 15px;
    padding-bottom: 8px;
    border-bottom: 2px solid #374151;
}

.detail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 15px;
}

.detail-item {
    background: #374151;
    padding: 12px 16px;
    border-radius: 8px;
    border-left: 3px solid #3b82f6;
}

.detail-label {
    font-size: 12px;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
}

.detail-value {
    font-size: 16px;
    color: #e5e7eb;
    font-weight: 500;
}

.detail-value.clickable {
    color: #3b82f6;
    cursor: pointer;
    transition: all 0.2s;
}

.detail-value.clickable:hover {
    color: #60a5fa;
    text-decoration: underline;
}

.related-link {
    background: #374151;
    padding: 8px 16px;
    border-radius: 6px;
    color: #3b82f6;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s;
    margin: 4px;
}

.related-link:hover {
    background: #4b5563;
    color: #60a5fa;
    transform: translateY(-2px);
}

.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 25px;
    padding-top: 20px;
    border-top: 1px solid #374151;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideDown {
    from {
        transform: translateY(-50px);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}
</style>
`;

// Add modal HTML structure
const modalHTML = `
<div id="detailModal" class="detail-modal">
    <div class="detail-modal-content">
        <div class="detail-modal-header">
            <h2 id="modalTitle">Detail View</h2>
            <button class="detail-modal-close" onclick="closeDetailModal()">&times;</button>
        </div>
        <div class="detail-modal-body" id="modalBody">
            <!-- Will be populated dynamically -->
        </div>
    </div>
</div>
`;

// Initialize clickability features
function initClickableEnhancements() {
    // Add CSS
    document.head.insertAdjacentHTML('beforeend', clickableCSS);
    
    // Add modal
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Make dashboard stats clickable
    makeDashboardStatsClickable();
    
    // Make table rows clickable
    makeTableRowsClickable();
    
    // Make IDs clickable
    makeIDsClickable();
    
    console.log('✅ Clickability enhancements activated!');
}

// Make dashboard stat cards clickable
function makeDashboardStatsClickable() {
    // Find all stat cards and add click handlers
    const statCards = document.querySelectorAll('.stat-card, .dashboard-card');
    
    statCards.forEach(card => {
        const label = card.querySelector('.stat-label, h3, .card-title')?.textContent?.toLowerCase() || '';
        
        if (!card.hasAttribute('data-clickable')) {
            card.style.cursor = 'pointer';
            card.setAttribute('data-clickable', 'true');
            
            if (label.includes('cis') || label.includes('client')) {
                card.onclick = () => navigateToSection('cis');
            } else if (label.includes('lead')) {
                card.onclick = () => navigateToSection('leads');
            } else if (label.includes('deal')) {
                card.onclick = () => navigateToSection('deals');
            } else if (label.includes('plot')) {
                card.onclick = () => navigateToSection('plots');
            } else if (label.includes('follow')) {
                card.onclick = () => navigateToSection('followup');
            }
        }
    });
}

// Make table rows clickable
function makeTableRowsClickable() {
    // CIS table
    makeTableClickable('cisTable', 'tbody tr', showCISDetail);
    
    // Leads table
    makeTableClickable('leadsTable', 'tbody tr', showLeadDetail);
    
    // Deals table
    makeTableClickable('dealsTable', 'tbody tr', showDealDetail);
    
    // Plots table
    makeTableClickable('plotsTable', 'tbody tr', showPlotDetail);
    
    // Follow-up table
    makeTableClickable('followupTable', 'tbody tr', showFollowupDetail);
}

function makeTableClickable(tableId, selector, detailFunction) {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    const observer = new MutationObserver(() => {
        const rows = table.querySelectorAll(selector);
        rows.forEach(row => {
            if (!row.hasAttribute('data-clickable')) {
                row.style.cursor = 'pointer';
                row.setAttribute('data-clickable', 'true');
                
                row.addEventListener('click', function(e) {
                    // Don't trigger if clicking on a button or link
                    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || e.target.closest('button, a')) {
                        return;
                    }
                    
                    // Get the ID from the first cell or data attribute
                    const idCell = this.querySelector('td:first-child, td[data-id]');
                    const id = idCell?.textContent?.trim() || idCell?.dataset?.id;
                    
                    if (id && detailFunction) {
                        detailFunction(id);
                    }
                });
            }
        });
    });
    
    observer.observe(table, { childList: true, subtree: true });
    
    // Initial setup
    const rows = table.querySelectorAll(selector);
    rows.forEach(row => {
        if (!row.hasAttribute('data-clickable')) {
            row.style.cursor = 'pointer';
            row.setAttribute('data-clickable', 'true');
            
            row.addEventListener('click', function(e) {
                if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || e.target.closest('button, a')) {
                    return;
                }
                
                const idCell = this.querySelector('td:first-child, td[data-id]');
                const id = idCell?.textContent?.trim() || idCell?.dataset?.id;
                
                if (id && detailFunction) {
                    detailFunction(id);
                }
            });
        }
    });
}

// Make IDs clickable across tables
function makeIDsClickable() {
    const observer = new MutationObserver(() => {
        // Find all cells that contain IDs (CIS ID, Lead ID, Deal ID, Plot ID)
        document.querySelectorAll('td').forEach(cell => {
            const text = cell.textContent.trim();
            
            if (text.match(/^CIS\d+$/i) && !cell.hasAttribute('data-id-clickable')) {
                cell.innerHTML = `<span class="clickable-id" onclick="showCISDetail('${text}')">${text}</span>`;
                cell.setAttribute('data-id-clickable', 'true');
            } else if (text.match(/^LEAD\d+$/i) && !cell.hasAttribute('data-id-clickable')) {
                cell.innerHTML = `<span class="clickable-id" onclick="showLeadDetail('${text}')">${text}</span>`;
                cell.setAttribute('data-id-clickable', 'true');
            } else if (text.match(/^DEAL\d+$/i) && !cell.hasAttribute('data-id-clickable')) {
                cell.innerHTML = `<span class="clickable-id" onclick="showDealDetail('${text}')">${text}</span>`;
                cell.setAttribute('data-id-clickable', 'true');
            } else if (text.match(/^PLOT\d+$/i) && !cell.hasAttribute('data-id-clickable')) {
                cell.innerHTML = `<span class="clickable-id" onclick="showPlotDetail('${text}')">${text}</span>`;
                cell.setAttribute('data-id-clickable', 'true');
            }
        });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Initial setup
    document.querySelectorAll('td').forEach(cell => {
        const text = cell.textContent.trim();
        
        if (text.match(/^CIS\d+$/i) && !cell.hasAttribute('data-id-clickable')) {
            cell.innerHTML = `<span class="clickable-id" onclick="showCISDetail('${text}')">${text}</span>`;
            cell.setAttribute('data-id-clickable', 'true');
        } else if (text.match(/^LEAD\d+$/i) && !cell.hasAttribute('data-id-clickable')) {
            cell.innerHTML = `<span class="clickable-id" onclick="showLeadDetail('${text}')">${text}</span>`;
            cell.setAttribute('data-id-clickable', 'true');
        } else if (text.match(/^DEAL\d+$/i) && !cell.hasAttribute('data-id-clickable')) {
            cell.innerHTML = `<span class="clickable-id" onclick="showDealDetail('${text}')">${text}</span>`;
            cell.setAttribute('data-id-clickable', 'true');
        } else if (text.match(/^PLOT\d+$/i) && !cell.hasAttribute('data-id-clickable')) {
            cell.innerHTML = `<span class="clickable-id" onclick="showPlotDetail('${text}')">${text}</span>`;
            cell.setAttribute('data-id-clickable', 'true');
        }
    });
}

// Navigation function
function navigateToSection(section) {
    // Try to find and click the navigation button
    const navButtons = document.querySelectorAll('a[href*="#"], button, .nav-link');
    
    navButtons.forEach(btn => {
        const text = btn.textContent.toLowerCase();
        const href = btn.getAttribute('href') || '';
        
        if (text.includes(section) || href.includes(section)) {
            btn.click();
        }
    });
    
    // Also try to show the section directly
    const sections = document.querySelectorAll('[id*="' + section + '"], [class*="' + section + '"]');
    sections.forEach(sec => {
        if (sec.style) {
            sec.style.display = 'block';
        }
    });
}

// Detail view functions
function showCISDetail(id) {
    const data = getCISData(id);
    if (!data) {
        alert('CIS record not found: ' + id);
        return;
    }
    
    const relatedLeads = getRelatedLeads(id);
    
    document.getElementById('modalTitle').textContent = `👥 CIS Details - ${data.name || id}`;
    document.getElementById('modalBody').innerHTML = `
        <div class="detail-section">
            <h3>📋 Basic Information</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">CIS ID</div>
                    <div class="detail-value">${id}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Name</div>
                    <div class="detail-value">${data.name || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Phone</div>
                    <div class="detail-value">${data.phone || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Email</div>
                    <div class="detail-value">${data.email || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Nationality</div>
                    <div class="detail-value">${data.nationality || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Budget</div>
                    <div class="detail-value">${data.budget || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Plot Type</div>
                    <div class="detail-value">${data.plotType || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Location</div>
                    <div class="detail-value">${data.location || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Status</div>
                    <div class="detail-value">${data.status || 'N/A'}</div>
                </div>
            </div>
        </div>
        
        ${relatedLeads.length > 0 ? `
            <div class="detail-section">
                <h3>🔗 Related Leads</h3>
                <div>
                    ${relatedLeads.map(lead => `
                        <a href="#" class="related-link" onclick="closeDetailModal(); showLeadDetail('${lead.id}')">
                            📈 View Lead ${lead.id}
                        </a>
                    `).join('')}
                </div>
            </div>
        ` : ''}
        
        <div class="modal-actions">
            <button class="btn btn-secondary" onclick="closeDetailModal()">Close</button>
            <button class="btn" onclick="editCIS('${id}')">Edit</button>
        </div>
    `;
    
    document.getElementById('detailModal').style.display = 'block';
}

function showLeadDetail(id) {
    const data = getLeadData(id);
    if (!data) {
        alert('Lead record not found: ' + id);
        return;
    }
    
    document.getElementById('modalTitle').textContent = `📈 Lead Details - ${data.name || id}`;
    document.getElementById('modalBody').innerHTML = `
        <div class="detail-section">
            <h3>📋 Lead Information</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">Lead ID</div>
                    <div class="detail-value">${id}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">CIS ID</div>
                    <div class="detail-value clickable" onclick="closeDetailModal(); showCISDetail('${data.cisId}')">${data.cisId || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Name</div>
                    <div class="detail-value">${data.name || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Phone</div>
                    <div class="detail-value">${data.phone || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Email</div>
                    <div class="detail-value">${data.email || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Status</div>
                    <div class="detail-value">${data.status || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Priority</div>
                    <div class="detail-value">${data.priority || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Budget</div>
                    <div class="detail-value">${data.budget || 'N/A'}</div>
                </div>
            </div>
        </div>
        
        <div class="modal-actions">
            <button class="btn btn-secondary" onclick="closeDetailModal()">Close</button>
            <button class="btn" onclick="editLead('${id}')">Edit</button>
        </div>
    `;
    
    document.getElementById('detailModal').style.display = 'block';
}

function showDealDetail(id) {
    const data = getDealData(id);
    if (!data) {
        alert('Deal record not found: ' + id);
        return;
    }
    
    document.getElementById('modalTitle').textContent = `💰 Deal Details - ${data.clientName || id}`;
    document.getElementById('modalBody').innerHTML = `
        <div class="detail-section">
            <h3>📋 Deal Information</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">Deal ID</div>
                    <div class="detail-value">${id}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Lead ID</div>
                    <div class="detail-value clickable" onclick="closeDetailModal(); showLeadDetail('${data.leadId}')">${data.leadId || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">CIS ID</div>
                    <div class="detail-value clickable" onclick="closeDetailModal(); showCISDetail('${data.cisId}')">${data.cisId || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Plot ID</div>
                    <div class="detail-value clickable" onclick="closeDetailModal(); showPlotDetail('${data.plotId}')">${data.plotId || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Client Name</div>
                    <div class="detail-value">${data.clientName || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Final Price</div>
                    <div class="detail-value">${data.finalPrice || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Status</div>
                    <div class="detail-value">${data.status || 'N/A'}</div>
                </div>
            </div>
        </div>
        
        <div class="modal-actions">
            <button class="btn btn-secondary" onclick="closeDetailModal()">Close</button>
            <button class="btn" onclick="editDeal('${id}')">Edit</button>
        </div>
    `;
    
    document.getElementById('detailModal').style.display = 'block';
}

function showPlotDetail(id) {
    const data = getPlotData(id);
    if (!data) {
        alert('Plot record not found: ' + id);
        return;
    }
    
    document.getElementById('modalTitle').textContent = `🏗️ Plot Details - ${data.plotNo || id}`;
    document.getElementById('modalBody').innerHTML = `
        <div class="detail-section">
            <h3>📋 Plot Information</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">Plot ID</div>
                    <div class="detail-value">${id}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Plot Number</div>
                    <div class="detail-value">${data.plotNo || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">City</div>
                    <div class="detail-value">${data.city || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">District</div>
                    <div class="detail-value">${data.district || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Plot Type</div>
                    <div class="detail-value">${data.plotType || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Size</div>
                    <div class="detail-value">${data.size || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Status</div>
                    <div class="detail-value">${data.status || 'N/A'}</div>
                </div>
            </div>
        </div>
        
        <div class="modal-actions">
            <button class="btn btn-secondary" onclick="closeDetailModal()">Close</button>
            <button class="btn" onclick="editPlot('${id}')">Edit</button>
        </div>
    `;
    
    document.getElementById('detailModal').style.display = 'block';
}

function showFollowupDetail(id) {
    // Navigate to the related lead
    const data = getFollowupData(id);
    if (data && data.leadId) {
        showLeadDetail(data.leadId);
    }
}

// Data retrieval functions (these integrate with your existing data storage)
function getCISData(id) {
    // Try to get from localStorage
    const cisData = JSON.parse(localStorage.getItem('cisData') || '[]');
    return cisData.find(c => c.id === id) || null;
}

function getLeadData(id) {
    const leadsData = JSON.parse(localStorage.getItem('leadsData') || '[]');
    return leadsData.find(l => l.id === id) || null;
}

function getDealData(id) {
    const dealsData = JSON.parse(localStorage.getItem('dealsData') || '[]');
    return dealsData.find(d => d.id === id) || null;
}

function getPlotData(id) {
    const plotsData = JSON.parse(localStorage.getItem('plotsData') || '[]');
    return plotsData.find(p => p.id === id) || null;
}

function getFollowupData(id) {
    const followupData = JSON.parse(localStorage.getItem('followupData') || '[]');
    return followupData.find(f => f.id === id) || null;
}

function getRelatedLeads(cisId) {
    const leadsData = JSON.parse(localStorage.getItem('leadsData') || '[]');
    return leadsData.filter(l => l.cisId === cisId);
}

// Close modal function
function closeDetailModal() {
    document.getElementById('detailModal').style.display = 'none';
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    const modal = document.getElementById('detailModal');
    if (event.target === modal) {
        closeDetailModal();
    }
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initClickableEnhancements);
} else {
    initClickableEnhancements();
}

// Re-initialize on page changes (for SPAs)
setInterval(() => {
    makeTableRowsClickable();
    makeIDsClickable();
    makeDashboardStatsClickable();
}, 2000);
