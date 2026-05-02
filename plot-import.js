// plot-import.js – File Import with Manual Column Mapping

(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {
        const importBtn = document.getElementById('import-file-btn');
        const fileInput = document.getElementById('import-file-input');

        if (!importBtn || !fileInput) {
            console.warn('Import elements not found.');
            return;
        }

        importBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleFileSelect);
    });

    async function handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        const ext = file.name.split('.').pop().toLowerCase();
        let data;

        try {
            if (ext === 'json') {
                data = await parseJSON(file);
            } else if (ext === 'csv') {
                data = await parseCSV(file);
            } else {
                alert('Unsupported file. Please upload .csv or .json');
                return;
            }
        } catch (e) {
            alert('Error reading file: ' + e.message);
            console.error(e);
            return;
        }

        if (!data || data.length === 0) {
            alert('No data found in file.');
            return;
        }

        showMappingModal(data);
    }

    // ---------- Parsers ----------
    function parseJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const parsed = JSON.parse(e.target.result);
                    resolve(Array.isArray(parsed) ? parsed : [parsed]);
                } catch (err) {
                    reject(new Error('Invalid JSON format'));
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    function parseCSV(file) {
        // Use PapaParse if available (should be included in index.html)
        if (typeof Papa !== 'undefined') {
            return new Promise((resolve, reject) => {
                Papa.parse(file, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        if (results.errors.length) {
                            console.warn('CSV parse warnings:', results.errors);
                        }
                        resolve(results.data);
                    },
                    error: (err) => reject(new Error('CSV parse error: ' + err.message))
                });
            });
        } else {
            // Fallback simple CSV parser (only for basic files)
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const text = e.target.result;
                    const lines = text.split(/\r?\n/).filter(line => line.trim());
                    if (lines.length < 2) return resolve([]);
                    const headers = lines[0].split(',').map(h => h.trim());
                    const data = [];
                    for (let i = 1; i < lines.length; i++) {
                        const values = lines[i].split(',').map(v => v.trim());
                        if (values.length !== headers.length) continue;
                        const obj = {};
                        headers.forEach((h, idx) => obj[h] = values[idx]);
                        data.push(obj);
                    }
                    resolve(data);
                };
                reader.onerror = () => reject(new Error('File read error'));
                reader.readAsText(file);
            });
        }
    }

    // ---------- Mapping Modal ----------
    function showMappingModal(rows) {
        // Remove existing modal
        const old = document.getElementById('import-mapping-modal');
        if (old) old.remove();

        const headers = Object.keys(rows[0]);
        const modalHTML = `
            <div class="modal fade" id="import-mapping-modal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title">Map Columns to Plot Fields</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p>Select which column contains each value. <strong>Title, X, and Y are required.</strong></p>
                            <form id="mapping-form">
                                <div class="mb-3">
                                    <label class="form-label">Title *</label>
                                    <select class="form-select" name="title" required>
                                        <option value="">-- Choose --</option>
                                        ${headers.map(h => `<option value="${h}">${h}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">X Value *</label>
                                        <select class="form-select" name="x" required>
                                            <option value="">-- Choose --</option>
                                            ${headers.map(h => `<option value="${h}">${h}</option>`).join('')}
                                        </select>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Y Value *</label>
                                        <select class="form-select" name="y" required>
                                            <option value="">-- Choose --</option>
                                            ${headers.map(h => `<option value="${h}">${h}</option>`).join('')}
                                        </select>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Plot Type (optional)</label>
                                    <select class="form-select" name="plotType">
                                        <option value="">-- Default (scatter) --</option>
                                        ${headers.map(h => `<option value="${h}">${h}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Description (optional)</label>
                                    <select class="form-select" name="description">
                                        <option value="">-- None --</option>
                                        ${headers.map(h => `<option value="${h}">${h}</option>`).join('')}
                                    </select>
                                </div>
                            </form>
                            <div class="alert alert-info">
                                <strong>Preview (first 3 rows):</strong>
                                <pre style="max-height:150px;">${JSON.stringify(rows.slice(0,3), null, 2)}</pre>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" id="confirm-import">Import Plots</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modalEl = document.getElementById('import-mapping-modal');
        const modal = new bootstrap.Modal(modalEl);
        modal.show();

        document.getElementById('confirm-import').addEventListener('click', () => {
            const form = document.getElementById('mapping-form');
            const titleCol = form.elements.title.value;
            const xCol = form.elements.x.value;
            const yCol = form.elements.y.value;
            const typeCol = form.elements.plotType.value;
            const descCol = form.elements.description.value;

            if (!titleCol || !xCol || !yCol) {
                alert('Please map Title, X, and Y.');
                return;
            }

            const plots = [];
            for (const row of rows) {
                const xVal = parseFloat(row[xCol]);
                const yVal = parseFloat(row[yCol]);
                if (isNaN(xVal) || isNaN(yVal)) continue; // skip non-numeric points

                const plot = {
                    title: row[titleCol] || 'Untitled',
                    dataPoints: [{ x: xVal, y: yVal }],
                    plotType: (typeCol && row[typeCol]) ? row[typeCol] : 'scatter',
                    description: (descCol && row[descCol]) ? row[descCol] : '',
                    created: new Date().toISOString()
                };
                plots.push(plot);
            }

            if (plots.length === 0) {
                alert('No valid plot data found (X and Y must be numbers).');
                return;
            }

            let ok = 0;
            for (const p of plots) {
                try {
                    DataStore.addPlot(p);
                    ok++;
                } catch (e) {
                    console.error('addPlot error', e);
                }
            }

            DataStore.saveToLocalStorage();
            UI.refreshPlotsTable();
            UI.refreshDashboard();
            modal.hide();
            UI.showToast(`${ok} plot(s) imported successfully!`, 'success');
        });
    }
})();