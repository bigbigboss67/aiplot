/**
 * admin-enhancements.js
 * ----------------------------------------------------------------------------
 * AI Plot Portal — Admin Enhancements & Bug Fixes
 *
 * Adds:
 *   - Pending approval requests tooling on the Admin page (approve/reject)
 *   - "Import Plots" entry point that's discoverable from the CIS page
 *   - "Import Clients (PDF/Excel/CSV)" button wiring on the CIS page
 *   - File-import reset hardening so previous PDF data does not bleed
 *     into the next read
 *
 * Self-installs once the rest of the app's globals are available. Safe to
 * include even if some of the helpers don't exist on a given page.
 * ----------------------------------------------------------------------------
 */
(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // 1. Pending approvals — list users with status === 'pending' and let an
  //    admin approve or reject them.
  // --------------------------------------------------------------------------

  async function refreshPendingApprovals() {
    if (typeof Auth === 'undefined') return;
    try { if (Auth.loadUsers) await Auth.loadUsers(); } catch (e) {}

    const tbody = document.getElementById('pending-approvals-tbody');
    const countBadge = document.getElementById('pending-approvals-count');
    if (!tbody) return;

    const pending = (Auth.users || []).filter(u =>
      u.status === 'pending' || u.status === 'approved' && !u.verified
    );

    if (countBadge) {
      countBadge.textContent = `${pending.length} Pending`;
      countBadge.style.background = pending.length > 0 ? '#f59e0b' : '#9ca3af';
      countBadge.style.color = '#fff';
    }

    if (pending.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-muted" style="text-align:center; padding:20px;">No pending approvals 🎉</td></tr>';
      return;
    }

    tbody.innerHTML = pending.map(user => {
      const reg = user.registeredAt || user.createdAt || '';
      const regDisplay = reg ? new Date(reg).toLocaleDateString() : '—';
      return `
        <tr>
          <td><strong>${escapeHtml(user.name || '')}</strong></td>
          <td>${escapeHtml(user.email || '')}</td>
          <td><span class="badge badge-info">${escapeHtml(user.role || 'agent')}</span></td>
          <td>${regDisplay}</td>
          <td>
            <button class="btn-action edit" onclick="approveUser('${escapeAttr(user.id)}')" title="Approve" style="background:#10b981;color:#fff;">
              <i class="fas fa-check"></i> Approve
            </button>
            <button class="btn-action delete" onclick="rejectUser('${escapeAttr(user.id)}')" title="Reject" style="background:#ef4444;color:#fff;">
              <i class="fas fa-times"></i> Reject
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  async function approveUser(userId) {
    if (typeof Auth === 'undefined') return;
    const user = (Auth.users || []).find(u => u.id === userId);
    if (!user) {
      if (typeof UI !== 'undefined' && UI.showToast) UI.showToast('User not found', 'error');
      return;
    }
    if (!confirm(`Approve ${user.name || user.email}?`)) return;

    user.status = 'active';
    user.approvedAt = new Date().toISOString();
    if (Auth.currentUser) user.approvedBy = Auth.currentUser.email || Auth.currentUser.name;

    try { if (Auth.saveUsers) await Auth.saveUsers(); } catch (e) { console.warn('saveUsers warning', e); }
    if (typeof UI !== 'undefined' && UI.showToast) UI.showToast(`✅ ${user.name || user.email} approved`, 'success');

    refreshPendingApprovals();
    if (typeof refreshAdminUsersTable === 'function') refreshAdminUsersTable();
  }

  async function rejectUser(userId) {
    if (typeof Auth === 'undefined') return;
    const user = (Auth.users || []).find(u => u.id === userId);
    if (!user) {
      if (typeof UI !== 'undefined' && UI.showToast) UI.showToast('User not found', 'error');
      return;
    }
    if (!confirm(`Reject ${user.name || user.email}? They will not be able to log in.`)) return;

    user.status = 'rejected';
    user.rejectedAt = new Date().toISOString();
    if (Auth.currentUser) user.rejectedBy = Auth.currentUser.email || Auth.currentUser.name;

    try { if (Auth.saveUsers) await Auth.saveUsers(); } catch (e) { console.warn('saveUsers warning', e); }
    if (typeof UI !== 'undefined' && UI.showToast) UI.showToast(`${user.name || user.email} rejected`, 'info');

    refreshPendingApprovals();
    if (typeof refreshAdminUsersTable === 'function') refreshAdminUsersTable();
  }

  // --------------------------------------------------------------------------
  // 2. CIS-page entry points for plot/client imports
  // --------------------------------------------------------------------------

  function openCISFileImport() {
    if (typeof openFileImportModal === 'function') {
      hardResetFileImport();
      openFileImportModal();
      return;
    }
    if (typeof UI !== 'undefined' && UI.showToast) {
      UI.showToast('File import is not available on this page yet.', 'error');
    }
  }

  function openPlotImportFromCIS() {
    if (typeof window.openPlotImportModal === 'function') {
      window.openPlotImportModal();
      return;
    }
    if (typeof UI !== 'undefined' && UI.showToast) {
      UI.showToast('Plot importer is still loading — try again in a moment.', 'info');
    }
  }

  // --------------------------------------------------------------------------
  // 3. Hard reset of the file-import workspace
  // --------------------------------------------------------------------------

  function hardResetFileImport() {
    try { if (typeof importedData !== 'undefined') window.importedData = []; } catch (e) {}
    try { if (typeof importedFileName !== 'undefined') window.importedFileName = ''; } catch (e) {}

    const fileInput   = document.getElementById('file-input');
    const fileText    = document.getElementById('manual-text-input');
    const filePreview = document.getElementById('file-preview');
    const importBtn   = document.getElementById('import-btn');
    const previewThead= document.getElementById('preview-thead');
    const previewTbody= document.getElementById('preview-tbody');
    const fileInfo    = document.getElementById('file-info');

    if (fileInput) fileInput.value = '';
    if (fileText)  fileText.value = '';
    if (filePreview) filePreview.style.display = 'none';
    if (importBtn) importBtn.style.display = 'none';
    if (previewThead) previewThead.innerHTML = '';
    if (previewTbody) previewTbody.innerHTML = '';
    if (fileInfo) fileInfo.innerHTML = '';
  }

  function installFileUploadHardReset() {
    if (typeof window.handleFileUpload !== 'function') return;
    if (window.__handleFileUploadPatched) return;

    const original = window.handleFileUpload;
    window.handleFileUpload = function patchedHandleFileUpload(file) {
      hardResetFileImport();
      return original.apply(this, arguments);
    };
    window.__handleFileUploadPatched = true;
  }

  // --------------------------------------------------------------------------
  // 4. Helpers
  // --------------------------------------------------------------------------

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function escapeAttr(s) {
    return String(s == null ? '' : s).replace(/'/g, "\\'").replace(/"/g, '&quot;');
  }

  // --------------------------------------------------------------------------
  // 5. Bootstrap
  // --------------------------------------------------------------------------

  function start() {
    window.refreshPendingApprovals = refreshPendingApprovals;
    window.approveUser            = approveUser;
    window.rejectUser             = rejectUser;
    window.openCISFileImport      = openCISFileImport;
    window.openPlotImportFromCIS  = openPlotImportFromCIS;
    window.hardResetFileImport    = hardResetFileImport;

    let tries = 0;
    const tick = setInterval(() => {
      installFileUploadHardReset();
      tries++;
      if (window.__handleFileUploadPatched || tries >= 40) clearInterval(tick);
    }, 250);

    if (document.getElementById('admin-page') &&
        document.getElementById('admin-page').classList.contains('active')) {
      setTimeout(refreshPendingApprovals, 800);
    }

    console.log('[admin-enhancements] loaded.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
