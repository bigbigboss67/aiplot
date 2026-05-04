/**
 * admin-enhancements.js  (v2 — May 3, 2026)
 * ----------------------------------------------------------------------------
 * AI Plot Portal — Admin Enhancements & Bug Fixes
 *
 * Adds:
 *   - Pending approval requests (approve/reject)
 *   - Password change UI for admins (their own + any user)
 *   - "Import Plots" entry point on the CIS page
 *   - "Import Clients (PDF/Excel/CSV)" wiring on the CIS page
 *   - File-import reset hardening (no leak between PDF reads)
 *   - Universal PDF parser for plot imports (handles arbitrary shapes)
 *   - Hybrid PDF.js + Tesseract OCR fallback for image-only pages
 *
 * Self-installs once the rest of the app's globals are available.
 * ----------------------------------------------------------------------------
 */
(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // 1. Pending approvals
  // --------------------------------------------------------------------------

  async function refreshPendingApprovals() {
    if (typeof Auth === 'undefined') return;
    try { if (Auth.loadUsers) await Auth.loadUsers(); } catch (e) {}

    const tbody = document.getElementById('pending-approvals-tbody');
    const countBadge = document.getElementById('pending-approvals-count');
    if (!tbody) return;

    const pending = (Auth.users || []).filter(u =>
      u.status === 'pending' || (u.status === 'approved' && !u.verified)
    );

    if (countBadge) {
      countBadge.textContent = pending.length + ' Pending';
      countBadge.style.background = pending.length > 0 ? '#f59e0b' : '#9ca3af';
      countBadge.style.color = '#fff';
    }

    if (pending.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-muted" style="text-align:center; padding:20px;">No pending approvals 🎉</td></tr>';
      return;
    }

    tbody.innerHTML = pending.map(u => {
      const reg = u.registeredAt || u.createdAt || '';
      const regDisplay = reg ? new Date(reg).toLocaleDateString() : '—';
      return '<tr>' +
        '<td><strong>' + escapeHtml(u.name || '') + '</strong></td>' +
        '<td>' + escapeHtml(u.email || '') + '</td>' +
        '<td><span class="badge badge-info">' + escapeHtml(u.role || 'agent') + '</span></td>' +
        '<td>' + regDisplay + '</td>' +
        '<td>' +
          '<button class="btn-action edit" onclick="approveUser(\'' + escapeAttr(u.id) + '\')" style="background:#10b981;color:#fff;">' +
            '<i class="fas fa-check"></i> Approve</button> ' +
          '<button class="btn-action delete" onclick="rejectUser(\'' + escapeAttr(u.id) + '\')" style="background:#ef4444;color:#fff;">' +
            '<i class="fas fa-times"></i> Reject</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  async function approveUser(userId) {
    if (typeof Auth === 'undefined') return;
    const user = (Auth.users || []).find(u => u.id === userId);
    if (!user) { toast('User not found', 'error'); return; }
    if (!confirm('Approve ' + (user.name || user.email) + '?')) return;

    user.status = 'active';
    user.approvedAt = new Date().toISOString();
    if (Auth.currentUser) user.approvedBy = Auth.currentUser.email || Auth.currentUser.name;

    try { if (Auth.saveUsers) await Auth.saveUsers(); } catch (e) {}
    toast('✅ ' + (user.name || user.email) + ' approved', 'success');

    refreshPendingApprovals();
    if (typeof refreshAdminUsersTable === 'function') refreshAdminUsersTable();
  }

  async function rejectUser(userId) {
    if (typeof Auth === 'undefined') return;
    const user = (Auth.users || []).find(u => u.id === userId);
    if (!user) { toast('User not found', 'error'); return; }
    if (!confirm('Reject ' + (user.name || user.email) + '?')) return;

    user.status = 'rejected';
    user.rejectedAt = new Date().toISOString();
    if (Auth.currentUser) user.rejectedBy = Auth.currentUser.email || Auth.currentUser.name;

    try { if (Auth.saveUsers) await Auth.saveUsers(); } catch (e) {}
    toast((user.name || user.email) + ' rejected', 'info');

    refreshPendingApprovals();
    if (typeof refreshAdminUsersTable === 'function') refreshAdminUsersTable();
  }

  // --------------------------------------------------------------------------
  // 2. Password change UI
  // --------------------------------------------------------------------------

  function ensurePasswordChangeUI() {
    if (document.getElementById('password-management-card')) return;

    const adminPage = document.getElementById('admin-page');
    if (!adminPage) return;
    const adminDash = adminPage.querySelector('.admin-dashboard');
    if (!adminDash) return;

    if (!Auth || !Auth.currentUser || Auth.currentUser.role !== 'admin') return;

    const card = document.createElement('div');
    card.className = 'card';
    card.id = 'password-management-card';
    card.style.borderLeft = '4px solid #6366f1';
    card.innerHTML = (
      '<div class="card-header">' +
        '<h3><i class="fas fa-key" style="color:#6366f1;"></i> Password Management</h3>' +
        '<span class="badge badge-info">Admin Only</span>' +
      '</div>' +
      '<div style="padding:16px 20px;">' +
        '<div style="display:grid; grid-template-columns: 1fr 1fr; gap:24px;">' +
          '<div>' +
            '<h4 style="margin-bottom:10px; color:#374151;">🔐 Change Your Password</h4>' +
            '<input type="password" id="pw-self-current" placeholder="Current password" style="width:100%; padding:8px; margin-bottom:8px; border:1px solid #d1d5db; border-radius:6px;">' +
            '<input type="password" id="pw-self-new" placeholder="New password (min 6 chars)" style="width:100%; padding:8px; margin-bottom:8px; border:1px solid #d1d5db; border-radius:6px;">' +
            '<input type="password" id="pw-self-confirm" placeholder="Confirm new password" style="width:100%; padding:8px; margin-bottom:8px; border:1px solid #d1d5db; border-radius:6px;">' +
            '<button class="btn-primary" onclick="changeMyPassword()" style="width:100%;">' +
              '<i class="fas fa-save"></i> Update My Password</button>' +
          '</div>' +
          '<div>' +
            '<h4 style="margin-bottom:10px; color:#374151;">🔧 Reset User Password</h4>' +
            '<select id="pw-user-select" style="width:100%; padding:8px; margin-bottom:8px; border:1px solid #d1d5db; border-radius:6px;">' +
              '<option value="">— Select user —</option>' +
            '</select>' +
            '<input type="password" id="pw-user-new" placeholder="New password (min 6 chars)" style="width:100%; padding:8px; margin-bottom:8px; border:1px solid #d1d5db; border-radius:6px;">' +
            '<input type="password" id="pw-user-confirm" placeholder="Confirm new password" style="width:100%; padding:8px; margin-bottom:8px; border:1px solid #d1d5db; border-radius:6px;">' +
            '<button class="btn-primary" onclick="resetUserPassword()" style="width:100%; background:linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">' +
              '<i class="fas fa-redo"></i> Reset User Password</button>' +
          '</div>' +
        '</div>' +
        '<p style="margin-top:14px; padding:10px; background:#fef3c7; border-radius:6px; font-size:13px; color:#78350f;">' +
          '⚠️ Passwords are stored in the Firebase database. After resetting, share the new password with the user securely.' +
        '</p>' +
      '</div>'
    );

    const userMgmtCard = Array.from(adminDash.querySelectorAll('.card')).find(c =>
      c.querySelector('h3') && /User Management/i.test(c.querySelector('h3').textContent)
    );
    if (userMgmtCard) {
      adminDash.insertBefore(card, userMgmtCard);
    } else {
      adminDash.appendChild(card);
    }

    populateUserSelect();
  }

  function populateUserSelect() {
    const sel = document.getElementById('pw-user-select');
    if (!sel || !Auth || !Auth.users) return;
    sel.innerHTML = '<option value="">— Select user —</option>';
    Auth.users.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.id || u.uid || u.email;
      opt.textContent = (u.name || 'unnamed') + ' (' + u.email + ')' + (u.role === 'admin' ? ' [admin]' : '');
      sel.appendChild(opt);
    });
  }

  async function changeMyPassword() {
    const cur = document.getElementById('pw-self-current').value;
    const newPw = document.getElementById('pw-self-new').value;
    const conf = document.getElementById('pw-self-confirm').value;

    if (!cur || !newPw || !conf) { toast('Please fill in all fields', 'error'); return; }
    if (newPw.length < 6) { toast('New password must be at least 6 characters', 'error'); return; }
    if (newPw !== conf) { toast('Passwords do not match', 'error'); return; }

    if (!Auth.currentUser) { toast('Not logged in', 'error'); return; }
    const me = (Auth.users || []).find(u =>
      u.email === Auth.currentUser.email ||
      u.id === Auth.currentUser.uid ||
      u.uid === Auth.currentUser.uid
    );
    if (!me) { toast('User record not found', 'error'); return; }

    if (me.password && me.password !== cur) {
      toast('Current password is incorrect', 'error'); return;
    }

    me.password = newPw;
    me.passwordSetAt = new Date().toISOString();
    me.passwordSetBy = 'self';

    try {
      if (Auth.saveUsers) await Auth.saveUsers();
      if (typeof firebase !== 'undefined' && firebase.database && (me.id || me.uid)) {
        await firebase.database().ref('users/' + (me.id || me.uid) + '/password').set(newPw);
        await firebase.database().ref('users/' + (me.id || me.uid) + '/passwordSetAt').set(me.passwordSetAt);
      }
      toast('✅ Your password has been updated', 'success');
      document.getElementById('pw-self-current').value = '';
      document.getElementById('pw-self-new').value = '';
      document.getElementById('pw-self-confirm').value = '';
    } catch (err) {
      console.error('changeMyPassword error', err);
      toast('Failed to save: ' + err.message, 'error');
    }
  }

  async function resetUserPassword() {
    const userId = document.getElementById('pw-user-select').value;
    const newPw = document.getElementById('pw-user-new').value;
    const conf = document.getElementById('pw-user-confirm').value;

    if (!userId) { toast('Please select a user', 'error'); return; }
    if (!newPw || !conf) { toast('Please enter the new password', 'error'); return; }
    if (newPw.length < 6) { toast('Password must be at least 6 characters', 'error'); return; }
    if (newPw !== conf) { toast('Passwords do not match', 'error'); return; }

    if (!Auth || !Auth.currentUser || Auth.currentUser.role !== 'admin') {
      toast('Only admins can reset passwords', 'error'); return;
    }

    const target = (Auth.users || []).find(u => u.id === userId || u.uid === userId || u.email === userId);
    if (!target) { toast('User not found', 'error'); return; }

    if (!confirm('Reset password for ' + (target.name || target.email) + '?')) return;

    target.password = newPw;
    target.passwordSetAt = new Date().toISOString();
    target.passwordSetBy = Auth.currentUser.email || Auth.currentUser.name || 'admin';

    try {
      if (Auth.saveUsers) await Auth.saveUsers();
      if (typeof firebase !== 'undefined' && firebase.database && (target.id || target.uid)) {
        await firebase.database().ref('users/' + (target.id || target.uid) + '/password').set(newPw);
        await firebase.database().ref('users/' + (target.id || target.uid) + '/passwordSetAt').set(target.passwordSetAt);
        await firebase.database().ref('users/' + (target.id || target.uid) + '/passwordSetBy').set(target.passwordSetBy);
      }
      toast('✅ Password reset for ' + (target.name || target.email), 'success');
      document.getElementById('pw-user-new').value = '';
      document.getElementById('pw-user-confirm').value = '';
    } catch (err) {
      console.error('resetUserPassword error', err);
      toast('Failed to save: ' + err.message, 'error');
    }
  }

  // --------------------------------------------------------------------------
  // 3. CIS-page entry points for plot/client imports
  // --------------------------------------------------------------------------

  function openCISFileImport() {
    if (typeof openFileImportModal === 'function') {
      hardResetFileImport();
      openFileImportModal();
      return;
    }
    toast('File import is not available on this page yet.', 'error');
  }

  function openPlotImportFromCIS() {
    if (typeof window.openPlotImportModal === 'function') {
      window.openPlotImportModal();
      return;
    }
    toast('Plot importer is still loading — try again in a moment.', 'info');
  }

  // --------------------------------------------------------------------------
  // 4. Hard reset of the file-import workspace
  // --------------------------------------------------------------------------

  function hardResetFileImport() {
    try { window.importedData = []; } catch (e) {}
    try { window.importedFileName = ''; } catch (e) {}

    const ids = ['file-input', 'manual-text-input', 'file-preview', 'import-btn',
                 'preview-thead', 'preview-tbody', 'file-info'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (id === 'file-input' || id === 'manual-text-input') el.value = '';
      else if (id === 'file-preview' || id === 'import-btn') el.style.display = 'none';
      else el.innerHTML = '';
    });
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
  // 5. Universal PDF parser for plot-import
  // --------------------------------------------------------------------------

  function universalPlotParse(text) {
    const lines = text.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
    const plots = [];

    // Strategy A: TSV
    const tsvLines = lines.filter(l => l.includes('\t') && l.split('\t').length >= 3);
    if (tsvLines.length >= 2) {
      const headers = tsvLines[0].split('\t').map(h => h.trim().toLowerCase());
      tsvLines.slice(1).forEach(l => {
        const cells = l.split('\t').map(c => c.trim());
        const plot = mapRowToPlot(headers, cells);
        if (plot && (plot.development || plot.plotNo || plot.size || plot.totalPrice)) plots.push(plot);
      });
      if (plots.length > 0) return plots;
    }

    // Strategy B: Multi-column lines with numbers and AED amounts
    for (const line of lines) {
      const numMatches = [...line.matchAll(/\b\d{1,3}(?:,\d{3})+\b/g)].map(m => m[0]);
      const aedMatches = [...line.matchAll(/AED\s*([\d.]+)\s*([MK])?/gi)].map(m => ({
        amount: parseFloat(m[1]) * (m[2] === 'M' ? 1e6 : m[2] === 'K' ? 1e3 : 1)
      }));
      const pctMatch = line.match(/(\d+(?:\.\d+)?)\s*%/);

      if (numMatches.length >= 1 && aedMatches.length >= 1) {
        const firstNumIdx = line.indexOf(numMatches[0]);
        const namePart = firstNumIdx > 0 ? line.substring(0, firstNumIdx).trim() : '';
        if (!namePart || /^\d+$/.test(namePart)) continue;

        const plot = {
          plotType: 'Plot', status: 'available', areaUnit: 'sqft',
          city: detectCity(line + ' ' + namePart) || 'Dubai',
          development: namePart,
          size: parseLooseNumber(numMatches[0]),
          totalPrice: aedMatches[0].amount
        };
        if (numMatches[1]) plot.gfa = parseLooseNumber(numMatches[1]);
        if (pctMatch) plot.roi = pctMatch[1];

        plots.push(plot);
      }
    }
    if (plots.length > 0) return plots;

    // Strategy C: Key-value parsing
    const keyMap = {
      project: 'development', name: 'development', plot: 'plotNo', plotno: 'plotNo',
      'plot no': 'plotNo', plotid: 'plotNo', 'plot id': 'plotNo',
      location: 'district', district: 'district', city: 'city', development: 'development',
      area: 'size', size: 'size', land: 'size', gfa: 'gfa', nfa: 'nfa', bua: 'bua',
      far: 'far', height: 'height', zoning: 'zoning', zone: 'zone', view: 'view',
      price: 'totalPrice', cost: 'totalPrice', value: 'totalPrice', total: 'totalPrice',
      roi: 'roi', return: 'roi', yield: 'roi', payment: 'paymentTerms',
      type: 'plotType', status: 'status', for: 'plotFor', sale: 'plotFor',
      handover: 'handoverDate', date: 'handoverDate'
    };

    let current = null;
    const records = [];
    const kvPattern = /^([A-Za-z][A-Za-z\s]{0,30}?)\s*[:=]\s*(.+)$/;
    for (const line of lines) {
      const m = line.match(kvPattern);
      if (!m) continue;
      const rawKey = m[1].trim().toLowerCase().replace(/\s+/g, '');
      const value = m[2].trim();
      const field = keyMap[rawKey] || keyMap[m[1].trim().toLowerCase()];
      if (!field) continue;

      if ((field === 'development' || field === 'plotNo') && current && current[field]) {
        records.push(current);
        current = {};
      }
      if (!current) current = {
        plotType: 'Plot', status: 'available', areaUnit: 'sqft', city: 'Dubai'
      };
      if (field === 'totalPrice') {
        const aed = value.match(/(?:AED)?\s*([\d,.]+)\s*([MK])?/i);
        if (aed) {
          current[field] = parseFloat(aed[1].replace(/,/g, '')) *
            (aed[2] === 'M' ? 1e6 : aed[2] === 'K' ? 1e3 : 1);
        } else {
          current[field] = value;
        }
      } else if (['size', 'gfa', 'nfa', 'bua'].includes(field)) {
        current[field] = parseLooseNumber(value);
      } else {
        current[field] = value;
      }
    }
    if (current) records.push(current);
    return records;
  }

  function mapRowToPlot(headers, cells) {
    const headerMap = {
      project: 'development', name: 'development', development: 'development',
      plot: 'plotNo', plotno: 'plotNo', 'plot id': 'plotNo', plotid: 'plotNo',
      'plot no': 'plotNo', no: 'plotNo',
      location: 'district', district: 'district', city: 'city',
      land: 'size', size: 'size', area: 'size', gfa: 'gfa', nfa: 'nfa', bua: 'bua',
      far: 'far', height: 'height', zoning: 'zoning', zone: 'zone', view: 'view',
      price: 'totalPrice', 'land price': 'totalPrice', cost: 'totalPrice', total: 'totalPrice',
      roi: 'roi', return: 'roi', payment: 'paymentTerms',
      type: 'plotType', 'plot type': 'plotType', status: 'status',
      for: 'plotFor', 'plot for': 'plotFor', handover: 'handoverDate'
    };

    const plot = { plotType: 'Plot', status: 'available', areaUnit: 'sqft', city: 'Dubai' };
    headers.forEach((h, i) => {
      const field = headerMap[h.toLowerCase().trim()];
      if (!field) return;
      const val = cells[i] || '';
      if (!val) return;

      if (field === 'totalPrice') {
        const aed = val.match(/(?:AED)?\s*([\d,.]+)\s*([MK])?/i);
        if (aed) {
          plot[field] = parseFloat(aed[1].replace(/,/g, '')) *
            (aed[2] === 'M' ? 1e6 : aed[2] === 'K' ? 1e3 : 1);
        }
      } else if (['size', 'gfa', 'nfa', 'bua'].includes(field)) {
        plot[field] = parseLooseNumber(val);
      } else {
        plot[field] = val;
      }
    });
    return plot;
  }

  function parseLooseNumber(s) {
    if (!s) return null;
    const cleaned = String(s).replace(/[,\s]/g, '');
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
  }

  function detectCity(text) {
    if (/dubai/i.test(text)) return 'Dubai';
    if (/abu\s*dhabi/i.test(text)) return 'Abu Dhabi';
    if (/sharjah/i.test(text)) return 'Sharjah';
    if (/batumi/i.test(text)) return 'Batumi';
    if (/gudauri/i.test(text)) return 'Gudauri';
    if (/tbilisi/i.test(text)) return 'Tbilisi';
    return null;
  }

  // --------------------------------------------------------------------------
  // 6. Hybrid PDF reader (text + OCR fallback) — exposed globally
  // --------------------------------------------------------------------------

  async function readPDFWithOCR(file, onProgress) {
    const progress = onProgress || (() => {});
    if (typeof window.ensurePdfJsLoaded === 'function') {
      await window.ensurePdfJsLoaded();
    }
    if (typeof pdfjsLib === 'undefined') {
      throw new Error('PDF.js is not available');
    }
    const workerUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    if (pdfjsLib.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
    }

    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
      cMapPacked: true
    }).promise;

    let fullText = '';
    let textPages = 0, ocrPages = 0;
    const MIN_TEXT = 50;

    for (let i = 1; i <= pdf.numPages; i++) {
      progress('Reading page ' + i + '/' + pdf.numPages + '…');
      const page = await pdf.getPage(i);
      let pageText = '';
      try {
        const tc = await page.getTextContent();
        let lastY = null;
        let line = '';
        const lines = [];
        for (const item of (tc.items || [])) {
          const y = item.transform[5];
          if (lastY != null && Math.abs(y - lastY) > 2) {
            lines.push(line.trim());
            line = '';
          }
          line += (line ? ' ' : '') + item.str;
          lastY = y;
        }
        if (line.trim()) lines.push(line.trim());
        pageText = lines.join('\n');
      } catch (e) {
        console.warn('Page ' + i + ' direct text failed:', e);
      }

      if (pageText.length < MIN_TEXT && typeof Tesseract !== 'undefined') {
        progress('Running OCR on page ' + i + '/' + pdf.numPages + '…');
        try {
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport: viewport }).promise;
          const imageDataUrl = canvas.toDataURL('image/png');

          const worker = await Tesseract.createWorker('eng+ara');
          const result = await worker.recognize(imageDataUrl);
          await worker.terminate();
          const ocrText = (result.data.text || '').trim();
          if (ocrText.length > pageText.length) {
            pageText = ocrText;
            ocrPages++;
          }
          canvas.width = 0; canvas.height = 0;
        } catch (ocrErr) {
          console.warn('OCR failed page ' + i + ':', ocrErr);
        }
      }

      if (pageText.length > 0) {
        fullText += pageText + '\n';
        textPages++;
      }
    }

    return { text: fullText, pages: pdf.numPages, textPages, ocrPages };
  }

  function installPlotImportPDFUpgrade() {
    if (window.__plotImportPDFUpgraded) return true;
    window.universalPlotParse = universalPlotParse;
    window.readPDFWithOCR = readPDFWithOCR;
    window.__plotImportPDFUpgraded = true;
    return true;
  }

  // --------------------------------------------------------------------------
  // 7. Helpers
  // --------------------------------------------------------------------------

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function escapeAttr(s) {
    return String(s == null ? '' : s).replace(/'/g, "\\'").replace(/"/g, '&quot;');
  }
  function toast(msg, kind) {
    if (typeof UI !== 'undefined' && UI.showToast) UI.showToast(msg, kind);
    else console.log('[' + (kind || 'info') + ']', msg);
  }

  // --------------------------------------------------------------------------
  // 8. Bootstrap
  // --------------------------------------------------------------------------

  function start() {
    window.refreshPendingApprovals  = refreshPendingApprovals;
    window.approveUser              = approveUser;
    window.rejectUser               = rejectUser;
    window.openCISFileImport        = openCISFileImport;
    window.openPlotImportFromCIS    = openPlotImportFromCIS;
    window.hardResetFileImport      = hardResetFileImport;
    window.changeMyPassword         = changeMyPassword;
    window.resetUserPassword        = resetUserPassword;

    let tries = 0;
    const tick = setInterval(() => {
      installFileUploadHardReset();
      installPlotImportPDFUpgrade();
      ensurePasswordChangeUI();

      const adminPage = document.getElementById('admin-page');
      if (adminPage && adminPage.classList.contains('active')) {
        refreshPendingApprovals();
        ensurePasswordChangeUI();
        populateUserSelect();
      }

      tries++;
      if (tries >= 60) clearInterval(tick);
    }, 250);

    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-page="admin"], [onclick*="admin"], #admin-nav');
      if (t) {
        setTimeout(() => {
          ensurePasswordChangeUI();
          populateUserSelect();
          refreshPendingApprovals();
        }, 200);
      }
    });

    console.log('[admin-enhancements v2] loaded with password mgmt + universal PDF parser.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
