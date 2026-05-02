/**
 * plot-import.js
 * ----------------------------------------------------------------------------
 * AI Plot Portal — Plot Import Module
 *
 * Adds a dedicated "Import Plots" button to the Plots module that handles
 * Excel (.xlsx, .xls), CSV (.csv), PDF (.pdf), and pasted text. Maps any of
 * those input shapes to the Plot record schema and writes through
 * DataStore.addPlot(), then refreshes the table and dashboard.
 *
 * Why a separate flow (and not a patch to the existing import dialog)?
 * The existing dialog is hardcoded for CIS & Leads — its parser hunts for
 * names/phones/emails. Plot data has a fundamentally different shape
 * (Project / Land / GFA / AED price / ROI / etc.), so reusing that
 * parser produces garbage. A dedicated entry point is cleaner and
 * doesn't risk breaking contact import.
 *
 * INSTALLATION
 * 1. Save this file at the repo root as `plot-import.js`.
 * 2. In `index.html`, after the line that loads `app.js`, add:
 *      <script src="plot-import.js" defer></script>
 * 3. Commit + push. Vercel auto-redeploys.
 *
 * The module is self-installing — it will inject the button on the Plots
 * page automatically once DataStore is available.
 * ----------------------------------------------------------------------------
 */

(function () {
  'use strict';

  // --- Field mapping ---------------------------------------------------------
  // Plot record schema keys (camelCase, matching DataStore.addPlot's expected shape).
  // For each key, list the header strings (lowercased, partial match) that should
  // map to that key in CSV/Excel/text imports.
  const FIELD_ALIASES = {
    plotNo:       ['plot no', 'plot number', 'ref', 'reference', 'code'],
    development:  ['project', 'development', 'plot name', 'name', 'building'],
    city:         ['city'],
    district:     ['location', 'district', 'area', 'neighbourhood', 'neighborhood', 'community'],
    zone:         ['zone'],
    plotType:     ['plot type', 'type'],
    plotFor:      ['plot for', 'for', 'sale type', 'listing type'],
    zoning:       ['zoning'],
    size:         ['land', 'land area', 'plot size', 'size', 'land sqft', 'land sq ft', 'land (sqft)'],
    gfa:          ['gfa', 'gross floor area', 'built up', 'bua'],
    nfa:          ['nfa', 'net floor area'],
    far:          ['far', 'floor area ratio'],
    height:       ['height', 'max height'],
    view:         ['view'],
    handoverDate: ['handover', 'handover date'],
    totalPrice:   ['land price', 'total price', 'asking price', 'price (aed)', 'price'],
    priceGfa:     ['price/sqft', 'price per sqft', 'aed/sqft', 'price/sq ft per gfa', 'rate'],
    source:       ['source', 'owner type', 'broker / owner'],
    ownerName:    ['owner name', 'owner'],
    ownerPhone:   ['owner phone'],
    ownerEmail:   ['owner email'],
    agentName:    ['agent name', 'agent', 'broker name', 'broker'],
    agentPhone:   ['agent phone', 'broker phone'],
    agentEmail:   ['agent email', 'broker email'],
    notes:        ['notes', 'remarks', 'comments', 'description'],
  };

  // Headers that don't map to a record field but should be folded into `notes`.
  // (Anything not in FIELD_ALIASES gets added to notes automatically.)
  const NOTE_HEADERS = ['hard cost', 'soft cost', 'profit', 'roi', 'jv', 'payment', 'jv / payment'];

  // --- Parsing helpers -------------------------------------------------------

  /**
   * Parse an AED money string into a Number.
   *   "AED 36M"      -> 36_000_000
   *   "AED 43.48M"   -> 43_480_000
   *   "1,050"        -> 1050
   *   "36000000"     -> 36_000_000
   * Returns null on unparseable input.
   */
  function parseAEDAmount(s) {
    if (s == null || s === '') return null;
    if (typeof s === 'number') return isFinite(s) ? s : null;
    let str = String(s).replace(/AED/gi, '').replace(/[, \u00a0]/g, '').trim();
    if (!str) return null;
    const m = str.match(/^(-?\d+(?:\.\d+)?)([MKB])?$/i);
    if (m) {
      const n = parseFloat(m[1]);
      const suf = (m[2] || '').toUpperCase();
      const mult = suf === 'B' ? 1e9 : suf === 'M' ? 1e6 : suf === 'K' ? 1e3 : 1;
      return n * mult;
    }
    const n = parseFloat(str);
    return isNaN(n) ? null : n;
  }

  /** Parse "24,014" or "24014" into 24014. Returns null on failure. */
  function parseInt2(s) {
    if (s == null || s === '') return null;
    if (typeof s === 'number') return Math.round(s);
    const n = parseInt(String(s).replace(/[, \u00a0]/g, ''), 10);
    return isNaN(n) ? null : n;
  }

  /** Parse "51.0%" into 51 (number). */
  function parsePercent(s) {
    if (s == null) return null;
    const m = String(s).match(/(-?\d+(?:\.\d+)?)\s*%/);
    return m ? parseFloat(m[1]) : null;
  }

  /** Resolve a header string to a record field, or null if no match. */
  function headerToField(header) {
    if (!header) return null;
    const h = String(header).toLowerCase().trim();
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (aliases.some(a => h === a || h.includes(a))) return field;
    }
    return null;
  }

  /**
   * Convert a row (object keyed by header strings) into a plot record.
   * Anything that doesn't map to a known field gets folded into `notes`.
   */
  function rowToPlot(row) {
    const plot = {
      plotType: 'Plot',
      status: 'available',
      areaUnit: 'sqft',
      city: 'Dubai',          // sensible default for AI Plot Portal (Dubai market)
    };
    const noteParts = [];

    for (const [header, raw] of Object.entries(row)) {
      if (raw == null || raw === '') continue;
      const field = headerToField(header);
      if (!field) {
        // Unmapped column → notes
        noteParts.push(`${header.trim()}: ${String(raw).trim()}`);
        continue;
      }
      // Type-coerce by field
      let val;
      switch (field) {
        case 'size':
        case 'gfa':
        case 'nfa':
        case 'far':
        case 'height':
          val = parseInt2(raw);
          break;
        case 'totalPrice':
        case 'priceGfa':
          val = parseAEDAmount(raw);
          break;
        default:
          val = String(raw).trim();
      }
      if (val !== null && val !== '') plot[field] = val;
    }

    if (noteParts.length) {
      plot.notes = (plot.notes ? plot.notes + ' | ' : '') + noteParts.join(' | ');
    }
    return plot;
  }

  /**
   * Parse Excel/CSV: rows is an array of objects (header → cell).
   * Returns { plots: [...], skipped: n } where empty/junk rows are skipped.
   */
  function parseTabularRows(rows) {
    const plots = [];
    let skipped = 0;
    for (const row of rows) {
      const p = rowToPlot(row);
      // Require at least one of: development, size, totalPrice
      if (p.development || p.size || p.totalPrice) plots.push(p);
      else skipped++;
    }
    return { plots, skipped };
  }

  /**
   * Parse PDF text into plot records using a heuristic block parser
   * tuned for the "Plots in Dubai" report shape:
   *
   *   <Project> <Location>
   *   For Sale / JV - <Direct Owner | Broker>
   *   <land> <gfa> AED <price>M AED <hard>M AED <soft>M AED <profit>M <roi>% <payment>
   *
   * Rows that don't match this pattern are skipped.
   */
  function parsePDFText(text) {
    const lines = text.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
    const plots = [];

    // Heuristic: a "values line" contains 2+ comma-grouped numbers AND at least
    // one AED amount AND optionally a percent.
    const isValuesLine = (l) =>
      /\d{1,3}(?:,\d{3})+/.test(l) &&
      /AED\s*[\d.]+\s*[MK]?/i.test(l);

    for (let i = 1; i < lines.length; i++) {
      const valuesLine = lines[i];
      if (!isValuesLine(valuesLine)) continue;

      // Walk back up to 3 lines to find the "For Sale / JV" line and the project line
      let saleLine = '';
      let projectLine = '';
      for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
        if (!saleLine && /\bFor\s+(Sale|Lease|JV)|\bJV\b|\bDirect\s+Owner|\bBroker\b/i.test(lines[j])) {
          saleLine = lines[j];
        } else if (!projectLine && lines[j].length > 0 && lines[j].length < 100) {
          projectLine = lines[j];
        }
      }

      // Extract the two leading land/gfa numbers
      const landGfa = valuesLine.match(/(\d{1,3}(?:,\d{3})+)\s+(\d{1,3}(?:,\d{3})+)/);
      // Extract all AED M-amounts in order
      const aedM = [...valuesLine.matchAll(/AED\s+([\d.]+)\s*M/gi)].map(m => parseFloat(m[1]) * 1e6);
      // Extract the percent
      const pct = parsePercent(valuesLine);
      // Payment text is whatever is left after the percent (or the last AED amount)
      let paymentText = '';
      const afterPct = valuesLine.match(/\d+(?:\.\d+)?\s*%\s*(.+)$/);
      if (afterPct) paymentText = afterPct[1].trim();

      if (!landGfa || aedM.length === 0) continue;

      // Project line typically formatted: "Sky Island Dubai Islands"
      // Heuristic split: first 1-3 capitalized words = project name, rest = district
      const projectParts = projectLine.split(/\s+/);
      let development = projectLine;
      let district = '';
      if (projectParts.length >= 3) {
        // Try splitting at the midpoint where capitalization continues
        // Simple heuristic: first half is dev name, last half is district.
        // But better: known location keywords like "City", "Islands", "Garden", "Jaddaf", "JVT", "MBR", "Production"
        const locKwIdx = projectParts.findIndex(w =>
          /(?:City|Islands?|Garden|Jaddaf|JVT|MBR|Production|Maritime|Meydan|Dubai|Jumeirah)/i.test(w)
        );
        if (locKwIdx > 0) {
          development = projectParts.slice(0, locKwIdx).join(' ');
          district = projectParts.slice(locKwIdx).join(' ');
        }
      }

      const plot = {
        plotType: 'Plot',
        status: 'available',
        areaUnit: 'sqft',
        city: 'Dubai',
        development: development.trim(),
        district: district.trim(),
        size: parseInt2(landGfa[1]),
        gfa: parseInt2(landGfa[2]),
        totalPrice: aedM[0] || null,
      };

      if (/for\s+sale/i.test(saleLine) && /jv/i.test(saleLine)) plot.plotFor = 'Sale / JV';
      else if (/for\s+sale/i.test(saleLine)) plot.plotFor = 'Sale';
      else if (/jv/i.test(saleLine)) plot.plotFor = 'JV';
      else if (/lease/i.test(saleLine)) plot.plotFor = 'Lease';

      if (/direct\s+owner/i.test(saleLine)) plot.source = 'Direct Owner';
      else if (/broker/i.test(saleLine)) plot.source = 'Broker';

      // Build notes from the cost breakdown
      const noteParts = [];
      if (aedM[1] != null) noteParts.push(`Hard Cost: AED ${(aedM[1]/1e6).toFixed(2)}M`);
      if (aedM[2] != null) noteParts.push(`Soft Cost: AED ${(aedM[2]/1e6).toFixed(2)}M`);
      if (aedM[3] != null) noteParts.push(`Profit: AED ${(aedM[3]/1e6).toFixed(2)}M`);
      if (pct != null) noteParts.push(`ROI: ${pct}%`);
      if (paymentText) noteParts.push(`Payment: ${paymentText}`);
      if (noteParts.length) plot.notes = noteParts.join(' | ');

      plots.push(plot);
    }

    return { plots, skipped: 0 };
  }

  /**
   * Parse plain pasted text. Three sub-strategies tried in order:
   *  1. CSV with header row (delimiter , or ; or tab)
   *  2. PDF-style block (project / sale-line / values)
   *  3. Bail.
   */
  function parsePastedText(text) {
    if (!text || !text.trim()) return { plots: [], skipped: 0 };
    const trimmed = text.trim();

    // Try CSV: 2+ lines, first line has 3+ delimiters
    const firstLine = trimmed.split(/\r?\n/, 1)[0];
    const delim =
      (firstLine.match(/\t/g) || []).length >= 2 ? '\t' :
      (firstLine.match(/,/g) || []).length >= 2 ? ',' :
      (firstLine.match(/;/g) || []).length >= 2 ? ';' : null;

    if (delim) {
      const rows = csvToRows(trimmed, delim);
      if (rows.length >= 1) return parseTabularRows(rows);
    }

    // Fall back to PDF-style block parsing
    return parsePDFText(trimmed);
  }

  /** Minimal CSV-to-objects parser. Handles quoted fields with embedded delimiters. */
  function csvToRows(text, delim) {
    const lines = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"' && text[i+1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQuotes = !inQuotes;
      else if (c === '\n' && !inQuotes) { lines.push(cur); cur = ''; }
      else if (c === '\r') { /* skip */ }
      else cur += c;
    }
    if (cur) lines.push(cur);
    if (lines.length < 2) return [];

    const splitLine = (l) => {
      const out = []; let f = ''; let q = false;
      for (let i = 0; i < l.length; i++) {
        const c = l[i];
        if (c === '"' && l[i+1] === '"') { f += '"'; i++; }
        else if (c === '"') q = !q;
        else if (c === delim && !q) { out.push(f); f = ''; }
        else f += c;
      }
      out.push(f);
      return out.map(s => s.trim());
    };

    const headers = splitLine(lines[0]);
    return lines.slice(1).map(l => {
      const cells = splitLine(l);
      const obj = {};
      headers.forEach((h, i) => { obj[h] = cells[i] != null ? cells[i] : ''; });
      return obj;
    });
  }

  // --- File handling ---------------------------------------------------------

  /** Read file as ArrayBuffer (for XLSX) or text (for CSV/TXT). */
  function readFile(file, asArrayBuffer = false) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      if (asArrayBuffer) r.readAsArrayBuffer(file);
      else r.readAsText(file);
    });
  }

  async function parseFile(file) {
    const name = (file.name || '').toLowerCase();
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      if (typeof XLSX === 'undefined') {
        throw new Error('Excel parser (SheetJS) is not loaded on this page.');
      }
      const buf = await readFile(file, true);
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      return parseTabularRows(rows);
    }
    if (name.endsWith('.csv') || name.endsWith('.tsv') || name.endsWith('.txt')) {
      const text = await readFile(file, false);
      return parsePastedText(text);
    }
    if (name.endsWith('.pdf')) {
      // Use PDF.js — the portal already loads it on demand via ensurePdfJsLoaded()
      if (typeof window.ensurePdfJsLoaded === 'function') {
        await window.ensurePdfJsLoaded();
      }
      if (typeof pdfjsLib === 'undefined') {
        throw new Error('PDF.js is not available on this page.');
      }
      const buf = await readFile(file, true);
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      let allText = '';
      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const tc = await page.getTextContent();
        // Reconstruct text with line breaks based on Y-position changes
        let lastY = null;
        let line = '';
        const lines = [];
        for (const item of tc.items) {
          const y = item.transform[5];
          if (lastY != null && Math.abs(y - lastY) > 2) {
            lines.push(line.trim());
            line = '';
          }
          line += (line ? ' ' : '') + item.str;
          lastY = y;
        }
        if (line.trim()) lines.push(line.trim());
        allText += lines.join('\n') + '\n';
      }
      return parsePDFText(allText);
    }
    throw new Error('Unsupported file type: ' + name);
  }

  // --- UI: button + modal ----------------------------------------------------

  const STYLE = `
    .plot-import-btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff; border: none; padding: 10px 18px; border-radius: 10px;
      font-weight: 600; cursor: pointer; margin-right: 8px;
      display: inline-flex; align-items: center; gap: 8px;
    }
    .plot-import-btn:hover { opacity: 0.92; }
    .pi-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center; z-index: 99999;
    }
    .pi-modal {
      background: #fff; border-radius: 14px; width: min(680px, 92vw);
      max-height: 88vh; overflow: auto; padding: 24px;
      box-shadow: 0 20px 60px rgba(0,0,0,.3); font-family: inherit;
    }
    .pi-modal h2 { margin: 0 0 6px; font-size: 1.4em; }
    .pi-modal p.pi-sub { margin: 0 0 16px; color: #666; font-size: .95em; }
    .pi-section {
      border: 2px dashed #d0d4e0; border-radius: 10px; padding: 16px; margin: 12px 0;
    }
    .pi-section h3 { margin: 0 0 10px; font-size: 1em; }
    .pi-section input[type="file"] { width: 100%; }
    .pi-section textarea {
      width: 100%; min-height: 120px; padding: 10px; border: 1px solid #ccd;
      border-radius: 8px; font-family: ui-monospace, monospace; font-size: .9em;
    }
    .pi-actions { display: flex; gap: 10px; margin-top: 16px; justify-content: flex-end; }
    .pi-btn {
      padding: 10px 18px; border: none; border-radius: 8px; cursor: pointer;
      font-weight: 600;
    }
    .pi-btn-primary { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; }
    .pi-btn-secondary { background: #eee; color: #333; }
    .pi-result { margin-top: 14px; padding: 12px; border-radius: 8px; }
    .pi-result.ok  { background: #e7f7ed; color: #0a6b3d; }
    .pi-result.err { background: #fde8e8; color: #9b1c1c; }
    .pi-preview {
      margin-top: 10px; max-height: 220px; overflow: auto;
      font-family: ui-monospace, monospace; font-size: .82em;
      background: #fafbff; border: 1px solid #e3e6f0; border-radius: 8px; padding: 10px;
    }
    .pi-preview table { width: 100%; border-collapse: collapse; }
    .pi-preview th, .pi-preview td {
      padding: 4px 8px; border-bottom: 1px solid #eef;
      text-align: left; vertical-align: top;
    }
    .pi-preview th { background: #f0f2fa; }
  `;

  function injectStyles() {
    if (document.getElementById('plot-import-styles')) return;
    const s = document.createElement('style');
    s.id = 'plot-import-styles';
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  function fmtCell(v) {
    if (v == null || v === '') return '';
    if (typeof v === 'number' && v >= 1e6) return (v/1e6).toFixed(2) + 'M';
    if (typeof v === 'number' && v >= 1e3 && Number.isInteger(v)) return v.toLocaleString();
    return String(v);
  }

  function buildPreview(plots) {
    if (!plots.length) return '<em>No rows parsed.</em>';
    const cols = ['development', 'district', 'size', 'gfa', 'totalPrice', 'priceGfa', 'plotFor', 'source'];
    let html = '<table><thead><tr><th>#</th>' + cols.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>';
    plots.forEach((p, i) => {
      html += `<tr><td>${i+1}</td>` + cols.map(c => `<td>${fmtCell(p[c])}</td>`).join('') + '</tr>';
    });
    html += '</tbody></table>';
    if (plots.some(p => p.notes)) {
      html += '<details style="margin-top:8px"><summary>Notes per row</summary>';
      plots.forEach((p, i) => {
        if (p.notes) html += `<div style="margin:4px 0"><b>${i+1}.</b> ${p.notes}</div>`;
      });
      html += '</details>';
    }
    return html;
  }

  function openModal() {
    injectStyles();
    let parsedPlots = [];

    const overlay = document.createElement('div');
    overlay.className = 'pi-overlay';
    overlay.innerHTML = `
      <div class="pi-modal">
        <h2>📥 Import Plots</h2>
        <p class="pi-sub">Upload a file or paste data. Supported: <b>.xlsx, .xls, .csv, .tsv, .txt, .pdf</b>.</p>

        <div class="pi-section">
          <h3>📂 Upload file</h3>
          <input type="file" class="pi-file" accept=".xlsx,.xls,.csv,.tsv,.txt,.pdf" />
        </div>

        <div class="pi-section">
          <h3>📋 Or paste data (CSV with headers, or PDF-extracted text)</h3>
          <textarea class="pi-text" placeholder="Project,Location,Land,GFA,Land Price,ROI&#10;Sky Island,Dubai Islands,24014,60020,AED 36M,51%"></textarea>
          <button class="pi-btn pi-btn-secondary pi-process-text" style="margin-top:8px">Parse pasted text</button>
        </div>

        <div class="pi-result-area"></div>
        <div class="pi-preview-area"></div>

        <div class="pi-actions">
          <button class="pi-btn pi-btn-secondary pi-cancel">Cancel</button>
          <button class="pi-btn pi-btn-primary pi-confirm" disabled>Import 0 plots</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const $ = (sel) => overlay.querySelector(sel);
    const resultArea  = $('.pi-result-area');
    const previewArea = $('.pi-preview-area');
    const confirmBtn  = $('.pi-confirm');

    const showResult = (msg, ok) => {
      resultArea.innerHTML = `<div class="pi-result ${ok ? 'ok' : 'err'}">${msg}</div>`;
    };

    const showParsed = (result, sourceLabel) => {
      parsedPlots = result.plots || [];
      const skipped = result.skipped || 0;
      if (parsedPlots.length === 0) {
        showResult(`Parsed <b>${sourceLabel}</b> but found 0 importable rows.${skipped ? ` (${skipped} skipped)` : ''}`, false);
        previewArea.innerHTML = '';
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Import 0 plots';
        return;
      }
      showResult(`Parsed <b>${parsedPlots.length}</b> plot${parsedPlots.length === 1 ? '' : 's'} from ${sourceLabel}.${skipped ? ` ${skipped} row(s) skipped as empty/invalid.` : ''} Review below, then click Import.`, true);
      previewArea.innerHTML = '<div class="pi-preview">' + buildPreview(parsedPlots) + '</div>';
      confirmBtn.disabled = false;
      confirmBtn.textContent = `Import ${parsedPlots.length} plot${parsedPlots.length === 1 ? '' : 's'}`;
    };

    $('.pi-file').addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      showResult(`Parsing <b>${file.name}</b>…`, true);
      try {
        const result = await parseFile(file);
        showParsed(result, file.name);
      } catch (err) {
        showResult(`Failed to parse <b>${file.name}</b>: ${err.message}`, false);
        console.error('[plot-import] parseFile error', err);
      }
    });

    $('.pi-process-text').addEventListener('click', () => {
      const text = $('.pi-text').value;
      if (!text.trim()) { showResult('Paste some data first.', false); return; }
      try {
        const result = parsePastedText(text);
        showParsed(result, 'pasted text');
      } catch (err) {
        showResult('Failed to parse: ' + err.message, false);
      }
    });

    $('.pi-cancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    confirmBtn.addEventListener('click', async () => {
      if (!parsedPlots.length) return;
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Importing…';
      try {
        let ok = 0, fail = 0;
        for (const p of parsedPlots) {
          try { await DataStore.addPlot(p); ok++; }
          catch (e) { console.error('[plot-import] addPlot failed', e, p); fail++; }
        }
        if (typeof DataStore.saveToFirebase === 'function') {
          try { await DataStore.saveToFirebase(); } catch (e) { console.warn('[plot-import] saveToFirebase warning', e); }
        }
        if (typeof DataStore.saveToStorage === 'function') {
          try { DataStore.saveToStorage(); } catch (e) {}
        }
        if (typeof UI !== 'undefined') {
          if (UI.refreshPlotsTable) UI.refreshPlotsTable();
          if (UI.refreshDashboard)  UI.refreshDashboard();
          if (UI.showToast) UI.showToast(`Imported ${ok} plot${ok === 1 ? '' : 's'}${fail ? ` (${fail} failed)` : ''}`);
        }
        showResult(`✅ Imported ${ok} plot${ok === 1 ? '' : 's'}${fail ? `, ${fail} failed (see console)` : ''}.`, !fail);
        confirmBtn.textContent = 'Done';
        setTimeout(() => overlay.remove(), 1200);
      } catch (err) {
        showResult('Import failed: ' + err.message, false);
        confirmBtn.disabled = false;
        confirmBtn.textContent = `Import ${parsedPlots.length} plots`;
      }
    });
  }

  // --- Self-installation -----------------------------------------------------
  // Watch for the Plots module to render and inject the Import Plots button
  // next to "Add New Plot".
  function installButton() {
    if (document.querySelector('.plot-import-btn')) return; // already installed

    // Locate "Add New Plot" button
    const addBtn = [...document.querySelectorAll('button')]
      .find(b => /add\s+new\s+plot/i.test(b.textContent));
    if (!addBtn) return;

    const btn = document.createElement('button');
    btn.className = 'plot-import-btn';
    btn.innerHTML = '📥 Import Plots';
    btn.addEventListener('click', openModal);
    addBtn.parentNode.insertBefore(btn, addBtn);
  }

  function start() {
    if (typeof DataStore === 'undefined') return setTimeout(start, 250);
    injectStyles();
    installButton();
    // Re-attempt installation whenever the DOM updates (Plots module may
    // re-render when navigating tabs).
    const obs = new MutationObserver(() => installButton());
    obs.observe(document.body, { childList: true, subtree: true });
    // Expose for manual triggering if needed
    window.openPlotImportModal = openModal;
    console.log('[plot-import] Plot Import module loaded.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
