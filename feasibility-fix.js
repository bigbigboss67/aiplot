// ============================================================================
// FEASIBILITY STUDY FIX - UNIDO Standard
// Fixes auto-calculations, PDF generation, and form submission
// ============================================================================

(function() {
    'use strict';
    
    console.log('🔧 Loading Feasibility Study Fix...');
    
    // Wait for DOM to be ready
    function waitForElement(selector, callback, maxAttempts = 50) {
        let attempts = 0;
        const interval = setInterval(() => {
            const element = document.querySelector(selector);
            attempts++;
            if (element) {
                clearInterval(interval);
                callback(element);
            } else if (attempts >= maxAttempts) {
                clearInterval(interval);
                console.warn('Element not found:', selector);
            }
        }, 200);
    }
    
    // Initialize the feasibility fix
    function initFeasibilityFix() {
        console.log('✅ Initializing Feasibility Study Fix...');
        
        // Add IDs to feasibility form fields if missing
        addFieldIds();
        
        // Setup auto-calculations
        setupAutoCalculations();
        
        // Fix Generate PDF button
        fixGeneratePDFButton();
        
        // Fix the UNIDO Feasibility button
        fixUnidoFeasibilityButton();
        
        // Re-run setup periodically to catch dynamic changes
        setInterval(() => {
            setupAutoCalculations();
        }, 3000);
    }
    
    // Add IDs to form fields based on labels
    function addFieldIds() {
        const fieldMappings = {
            // Project Overview
            'Client Name': 'feas_clientName',
            'Date': 'feas_date',
            'Location': 'feas_location',
            'Plot Type': 'feas_plotType',
            'Phone': 'feas_phone',
            'Email': 'feas_email',
            'Nationality': 'feas_nationality',
            
            // Land Details
            'Plot Size': 'feas_plotSize',
            'Land Cost (AED)': 'feas_landCost',
            'Land Cost per sqft': 'feas_landCostPerSqft',
            'Zoning': 'feas_zoning',
            
            // Construction
            'Gross Floor Area': 'feas_gfa',
            'Construction Cost per sqft': 'feas_constructionCostPerSqft',
            'Total Construction Cost': 'feas_totalConstructionCost',
            'Construction Duration': 'feas_constructionDuration',
            
            // Revenue
            'Selling Price per sqft': 'feas_sellingPricePerSqft',
            'Total Revenue': 'feas_totalRevenue',
            'Total Project Cost': 'feas_totalProjectCost',
            'Net Profit': 'feas_netProfit',
            
            // Notes
            'Market Notes': 'feas_marketNotes',
            'Notes': 'feas_marketNotes'
        };
        
        // Find feasibility modal/section
        const feasibilityModals = document.querySelectorAll('[class*="feasibility"], [id*="feasibility"], [class*="Feasibility"], [id*="Feasibility"]');
        
        feasibilityModals.forEach(modal => {
            const labels = modal.querySelectorAll('label');
            labels.forEach(label => {
                const labelText = label.textContent.trim();
                
                Object.keys(fieldMappings).forEach(key => {
                    if (labelText.includes(key)) {
                        const input = label.nextElementSibling || label.parentElement.querySelector('input, select, textarea');
                        if (input && !input.id) {
                            input.id = fieldMappings[key];
                            input.setAttribute('data-feas-field', fieldMappings[key]);
                        }
                    }
                });
            });
        });
    }
    
    // Setup automatic calculations
    function setupAutoCalculations() {
        // Find the feasibility form (could be in a modal)
        const feasForm = findFeasibilityForm();
        if (!feasForm) return;
        
        // Get all inputs in the feasibility form
        const inputs = feasForm.querySelectorAll('input[type="number"], input[type="text"], select');
        
        inputs.forEach(input => {
            // Avoid duplicate listeners
            if (input.hasAttribute('data-feas-listener')) return;
            input.setAttribute('data-feas-listener', 'true');
            
            input.addEventListener('input', calculateFeasibility);
            input.addEventListener('change', calculateFeasibility);
        });
    }
    
    // Find the feasibility form
    function findFeasibilityForm() {
        // Try multiple selectors to find the feasibility form
        const selectors = [
            '#feasibilityModal',
            '.feasibility-modal',
            '[id*="feasibility" i]',
            '[class*="feasibility" i]'
        ];
        
        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            for (const el of elements) {
                // Check if this contains form fields
                if (el.querySelector('input, select')) {
                    return el;
                }
            }
        }
        
        // Fallback: find by content
        const allModals = document.querySelectorAll('.modal, [class*="modal"]');
        for (const modal of allModals) {
            const text = modal.textContent;
            if (text.includes('Feasibility Study') || text.includes('UNIDO') || 
                (text.includes('Plot Size') && text.includes('Construction Cost') && text.includes('ROI'))) {
                return modal;
            }
        }
        
        return null;
    }
    
    // Main calculation function
    function calculateFeasibility() {
        const feasForm = findFeasibilityForm();
        if (!feasForm) return;
        
        // Get values using flexible field finding
        const plotSize = getFieldValue(feasForm, ['Plot Size', 'plotSize', 'plot_size']);
        const landCost = getFieldValue(feasForm, ['Land Cost (AED)', 'landCost', 'land_cost']);
        const gfa = getFieldValue(feasForm, ['Gross Floor Area', 'GFA', 'gfa']);
        const constructionCostPerSqft = getFieldValue(feasForm, ['Construction Cost per sqft', 'constructionCostPerSqft']);
        const sellingPricePerSqft = getFieldValue(feasForm, ['Selling Price per sqft', 'sellingPricePerSqft']);
        
        // Calculate Land Cost per sqft
        if (plotSize > 0 && landCost > 0) {
            const landCostPerSqft = landCost / plotSize;
            setFieldValue(feasForm, ['Land Cost per sqft', 'landCostPerSqft'], landCostPerSqft.toFixed(2));
        }
        
        // Calculate Total Construction Cost
        let totalConstructionCost = 0;
        if (gfa > 0 && constructionCostPerSqft > 0) {
            totalConstructionCost = gfa * constructionCostPerSqft;
            setFieldValue(feasForm, ['Total Construction Cost', 'totalConstructionCost'], totalConstructionCost.toFixed(0));
        }
        
        // Calculate Total Revenue
        let totalRevenue = 0;
        if (gfa > 0 && sellingPricePerSqft > 0) {
            totalRevenue = gfa * sellingPricePerSqft;
            setFieldValue(feasForm, ['Total Revenue', 'totalRevenue'], totalRevenue.toFixed(0));
        }
        
        // Calculate Total Project Cost
        const totalProjectCost = (landCost || 0) + totalConstructionCost;
        if (totalProjectCost > 0) {
            setFieldValue(feasForm, ['Total Project Cost', 'totalProjectCost'], totalProjectCost.toFixed(0));
        }
        
        // Calculate Net Profit
        const netProfit = totalRevenue - totalProjectCost;
        if (totalRevenue > 0) {
            setFieldValue(feasForm, ['Net Profit', 'netProfit'], netProfit.toFixed(0));
        }
        
        // Calculate ROI
        if (totalProjectCost > 0) {
            const roi = (netProfit / totalProjectCost) * 100;
            updateDisplayValue(feasForm, 'ROI', roi.toFixed(2) + '%');
        }
        
        // Calculate Profit Margin
        if (totalRevenue > 0) {
            const profitMargin = (netProfit / totalRevenue) * 100;
            updateDisplayValue(feasForm, 'Profit Margin', profitMargin.toFixed(2) + '%');
        }
        
        // Calculate Payback Period
        const constructionDuration = getFieldValue(feasForm, ['Construction Duration']);
        if (netProfit > 0 && totalProjectCost > 0) {
            const monthlyRevenue = totalRevenue / (constructionDuration || 24);
            const paybackPeriod = totalProjectCost / monthlyRevenue;
            updateDisplayValue(feasForm, 'Payback Period', paybackPeriod.toFixed(0) + ' months');
        }
    }
    
    // Helper: Get field value
    function getFieldValue(container, labelTexts) {
        for (const labelText of labelTexts) {
            // Try by ID first
            const byId = container.querySelector(`#feas_${labelText.replace(/\s/g, '')}`);
            if (byId) return parseFloat(byId.value) || 0;
            
            // Try by label
            const labels = container.querySelectorAll('label');
            for (const label of labels) {
                if (label.textContent.toLowerCase().includes(labelText.toLowerCase())) {
                    const input = label.nextElementSibling || 
                                 label.parentElement.querySelector('input, select') ||
                                 container.querySelector(`input[name*="${labelText}"]`);
                    if (input) {
                        const value = parseFloat(input.value);
                        return isNaN(value) ? 0 : value;
                    }
                }
            }
        }
        return 0;
    }
    
    // Helper: Set field value
    function setFieldValue(container, labelTexts, value) {
        for (const labelText of labelTexts) {
            const labels = container.querySelectorAll('label');
            for (const label of labels) {
                if (label.textContent.toLowerCase().includes(labelText.toLowerCase())) {
                    const input = label.nextElementSibling || 
                                 label.parentElement.querySelector('input');
                    if (input && input.tagName === 'INPUT') {
                        input.value = value;
                        return;
                    }
                }
            }
        }
    }
    
    // Helper: Update display values (for ROI, Profit Margin, etc.)
    function updateDisplayValue(container, labelText, value) {
        // Look for elements showing "--%" or "-- months"
        const allElements = container.querySelectorAll('*');
        for (const el of allElements) {
            if (el.children.length === 0) {
                const text = el.textContent.trim();
                if (text === '--%' || text === '-- months' || text === '--') {
                    const parent = el.parentElement;
                    const parentText = parent.textContent;
                    if (parentText.includes(labelText)) {
                        el.textContent = value;
                        el.style.color = '#10b981';
                        el.style.fontWeight = 'bold';
                        return;
                    }
                }
            }
        }
        
        // Alternative: find by structure
        const headings = container.querySelectorAll('h3, h4, .label, label');
        headings.forEach(heading => {
            if (heading.textContent.includes(labelText)) {
                const valueEl = heading.nextElementSibling || 
                              heading.parentElement.querySelector('.value, .display-value');
                if (valueEl) {
                    valueEl.textContent = value;
                    valueEl.style.color = '#10b981';
                    valueEl.style.fontWeight = 'bold';
                }
            }
        });
    }
    
    // Fix Generate PDF button
    function fixGeneratePDFButton() {
        // Find all buttons that might be the Generate PDF button
        const buttons = document.querySelectorAll('button');
        buttons.forEach(btn => {
            const text = btn.textContent.trim();
            if (text.includes('Generate PDF') || text.includes('PDF')) {
                if (!btn.hasAttribute('data-pdf-fixed')) {
                    btn.setAttribute('data-pdf-fixed', 'true');
                    btn.addEventListener('click', generateFeasibilityPDF);
                }
            }
        });
    }
    
    // Fix UNIDO Feasibility button
    function fixUnidoFeasibilityButton() {
        const buttons = document.querySelectorAll('button, a');
        buttons.forEach(btn => {
            const text = btn.textContent.trim();
            if (text.includes('UNIDO Feasibility') || text === '📋 UNIDO Feasibility') {
                if (!btn.hasAttribute('data-unido-fixed')) {
                    btn.setAttribute('data-unido-fixed', 'true');
                    btn.addEventListener('click', function(e) {
                        e.preventDefault();
                        openFeasibilityModal();
                    });
                }
            }
        });
    }
    
    // Open feasibility modal
    function openFeasibilityModal() {
        // Try to find and show existing modal
        const feasForm = findFeasibilityForm();
        if (feasForm) {
            feasForm.style.display = 'block';
            feasForm.classList.add('show', 'active');
            
            // If it's a Bootstrap modal
            if (typeof $ !== 'undefined' && $.fn.modal) {
                $(feasForm).modal('show');
            }
            
            // Scroll to it
            feasForm.scrollIntoView({ behavior: 'smooth' });
        } else {
            // Create modal if doesn't exist
            createFeasibilityModal();
        }
    }
    
    // Generate Feasibility PDF
    function generateFeasibilityPDF() {
        const feasForm = findFeasibilityForm();
        if (!feasForm) {
            alert('Feasibility form not found. Please open the feasibility study first.');
            return;
        }
        
        // Collect all data
        const data = collectFeasibilityData(feasForm);
        
        // Generate PDF using window.print or HTML
        generatePDFFromData(data);
    }
    
    // Collect feasibility data
    function collectFeasibilityData(form) {
        const data = {};
        const inputs = form.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            const label = findLabelForInput(input);
            if (label) {
                data[label] = input.value || input.options?.[input.selectedIndex]?.text || '';
            }
        });
        
        return data;
    }
    
    function findLabelForInput(input) {
        // Try id-based label
        if (input.id) {
            const label = document.querySelector(`label[for="${input.id}"]`);
            if (label) return label.textContent.trim().replace('*', '').trim();
        }
        
        // Try previous sibling
        let prev = input.previousElementSibling;
        while (prev) {
            if (prev.tagName === 'LABEL') {
                return prev.textContent.trim().replace('*', '').trim();
            }
            prev = prev.previousElementSibling;
        }
        
        // Try parent label
        const parentLabel = input.closest('label');
        if (parentLabel) {
            return parentLabel.textContent.trim().replace('*', '').trim();
        }
        
        return null;
    }
    
    // Generate PDF from data
    function generatePDFFromData(data) {
        const printWindow = window.open('', '_blank', 'width=800,height=900');
        
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>UNIDO Feasibility Study</title>
            <style>
                body {
                    font-family: 'Arial', sans-serif;
                    margin: 0;
                    padding: 40px;
                    color: #333;
                    background: white;
                }
                .header {
                    text-align: center;
                    border-bottom: 3px solid #2563eb;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                .header h1 {
                    color: #2563eb;
                    margin: 0;
                    font-size: 28px;
                }
                .header .subtitle {
                    color: #6b7280;
                    margin-top: 5px;
                    font-size: 14px;
                }
                .header .badge {
                    display: inline-block;
                    background: #10b981;
                    color: white;
                    padding: 4px 12px;
                    border-radius: 4px;
                    font-size: 12px;
                    margin-top: 10px;
                }
                .section {
                    margin-bottom: 30px;
                    page-break-inside: avoid;
                }
                .section h2 {
                    color: #2563eb;
                    border-bottom: 2px solid #e5e7eb;
                    padding-bottom: 8px;
                    font-size: 18px;
                    margin-bottom: 15px;
                }
                .data-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                }
                .data-item {
                    border-left: 3px solid #2563eb;
                    padding-left: 12px;
                    padding-top: 4px;
                    padding-bottom: 4px;
                }
                .data-label {
                    font-size: 11px;
                    color: #6b7280;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .data-value {
                    font-size: 14px;
                    font-weight: 600;
                    color: #1f2937;
                    margin-top: 2px;
                }
                .summary {
                    background: #f3f4f6;
                    padding: 20px;
                    border-radius: 8px;
                    margin-top: 20px;
                }
                .summary-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid #e5e7eb;
                }
                .summary-item:last-child {
                    border-bottom: none;
                    font-weight: bold;
                    font-size: 16px;
                    color: #10b981;
                }
                .footer {
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 2px solid #e5e7eb;
                    text-align: center;
                    color: #6b7280;
                    font-size: 12px;
                }
                .print-btn {
                    background: #2563eb;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    margin: 20px auto;
                    display: block;
                }
                @media print {
                    .print-btn { display: none; }
                    body { padding: 20px; }
                }
            </style>
        </head>
        <body>
            <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
            
            <div class="header">
                <div class="badge">UNIDO STANDARD</div>
                <h1>📋 Feasibility Study</h1>
                <div class="subtitle">Comprehensive Project Analysis Report</div>
                <div style="margin-top:10px; color: #9ca3af;">Generated: ${new Date().toLocaleDateString()}</div>
            </div>
            
            <div class="section">
                <h2>1. Project Overview</h2>
                <div class="data-grid">
                    <div class="data-item">
                        <div class="data-label">Client Name</div>
                        <div class="data-value">${data['Client Name'] || 'N/A'}</div>
                    </div>
                    <div class="data-item">
                        <div class="data-label">Date</div>
                        <div class="data-value">${data['Date'] || new Date().toLocaleDateString()}</div>
                    </div>
                    <div class="data-item">
                        <div class="data-label">Location</div>
                        <div class="data-value">${data['Location'] || 'N/A'}</div>
                    </div>
                    <div class="data-item">
                        <div class="data-label">Plot Type</div>
                        <div class="data-value">${data['Plot Type'] || 'N/A'}</div>
                    </div>
                    <div class="data-item">
                        <div class="data-label">Phone</div>
                        <div class="data-value">${data['Phone'] || 'N/A'}</div>
                    </div>
                    <div class="data-item">
                        <div class="data-label">Email</div>
                        <div class="data-value">${data['Email'] || 'N/A'}</div>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h2>2. Land Details</h2>
                <div class="data-grid">
                    <div class="data-item">
                        <div class="data-label">Plot Size (sqft)</div>
                        <div class="data-value">${formatNumber(data['Plot Size (sqft)'] || data['Plot Size'])}</div>
                    </div>
                    <div class="data-item">
                        <div class="data-label">Land Cost (AED)</div>
                        <div class="data-value">${formatCurrency(data['Land Cost (AED)'] || data['Land Cost'])}</div>
                    </div>
                    <div class="data-item">
                        <div class="data-label">Land Cost per sqft (AED)</div>
                        <div class="data-value">${formatCurrency(data['Land Cost per sqft (AED)'] || data['Land Cost per sqft'])}</div>
                    </div>
                    <div class="data-item">
                        <div class="data-label">Zoning / Permitted Use</div>
                        <div class="data-value">${data['Zoning / Permitted Use'] || data['Zoning'] || 'N/A'}</div>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h2>3. Construction Estimates</h2>
                <div class="data-grid">
                    <div class="data-item">
                        <div class="data-label">Gross Floor Area - GFA (sqft)</div>
                        <div class="data-value">${formatNumber(data['Gross Floor Area - GFA (sqft)'] || data['GFA'])}</div>
                    </div>
                    <div class="data-item">
                        <div class="data-label">Construction Cost per sqft (AED)</div>
                        <div class="data-value">${formatCurrency(data['Construction Cost per sqft (AED)'] || data['Construction Cost per sqft'])}</div>
                    </div>
                    <div class="data-item">
                        <div class="data-label">Total Construction Cost (AED)</div>
                        <div class="data-value">${formatCurrency(data['Total Construction Cost (AED)'] || data['Total Construction Cost'])}</div>
                    </div>
                    <div class="data-item">
                        <div class="data-label">Construction Duration</div>
                        <div class="data-value">${data['Construction Duration (months)'] || data['Construction Duration'] || 'N/A'}</div>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h2>4. Revenue Projections</h2>
                <div class="data-grid">
                    <div class="data-item">
                        <div class="data-label">Selling Price per sqft (AED)</div>
                        <div class="data-value">${formatCurrency(data['Selling Price per sqft (AED)'] || data['Selling Price per sqft'])}</div>
                    </div>
                    <div class="data-item">
                        <div class="data-label">Total Revenue (AED)</div>
                        <div class="data-value">${formatCurrency(data['Total Revenue (AED)'] || data['Total Revenue'])}</div>
                    </div>
                    <div class="data-item">
                        <div class="data-label">Total Project Cost (AED)</div>
                        <div class="data-value">${formatCurrency(data['Total Project Cost (AED)'] || data['Total Project Cost'])}</div>
                    </div>
                    <div class="data-item">
                        <div class="data-label">Net Profit (AED)</div>
                        <div class="data-value" style="color: #10b981;">${formatCurrency(data['Net Profit (AED)'] || data['Net Profit'])}</div>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h2>5. Financial Analysis Summary</h2>
                <div class="summary">
                    ${calculateAndDisplayMetrics(data)}
                </div>
            </div>
            
            ${data['Market Notes'] || data['Notes'] ? `
            <div class="section">
                <h2>6. Market Notes & Remarks</h2>
                <div style="background: #f9fafb; padding: 15px; border-radius: 6px; border-left: 4px solid #2563eb;">
                    ${data['Market Notes'] || data['Notes'] || ''}
                </div>
            </div>
            ` : ''}
            
            <div class="footer">
                <p><strong>UNIDO Standard Feasibility Study</strong></p>
                <p>Generated by AI Plot CRM | ${new Date().toLocaleString()}</p>
                <p style="margin-top: 10px; color: #9ca3af; font-size: 11px;">
                    This feasibility study is prepared based on the information provided and current market conditions.
                    Actual results may vary based on market changes and other factors.
                </p>
            </div>
        </body>
        </html>
        `;
        
        printWindow.document.write(html);
        printWindow.document.close();
    }
    
    // Helper: Format number
    function formatNumber(value) {
        if (!value || value === '0') return 'N/A';
        const num = parseFloat(value);
        if (isNaN(num)) return value;
        return num.toLocaleString();
    }
    
    // Helper: Format currency
    function formatCurrency(value) {
        if (!value || value === '0') return 'N/A';
        const num = parseFloat(value);
        if (isNaN(num)) return value;
        return 'AED ' + num.toLocaleString();
    }
    
    // Calculate and display metrics
    function calculateAndDisplayMetrics(data) {
        const totalRevenue = parseFloat(data['Total Revenue (AED)'] || data['Total Revenue']) || 0;
        const totalCost = parseFloat(data['Total Project Cost (AED)'] || data['Total Project Cost']) || 0;
        const netProfit = parseFloat(data['Net Profit (AED)'] || data['Net Profit']) || 0;
        const duration = parseFloat(data['Construction Duration (months)'] || data['Construction Duration']) || 24;
        
        let roi = 0;
        let profitMargin = 0;
        let paybackPeriod = 0;
        
        if (totalCost > 0) {
            roi = (netProfit / totalCost) * 100;
            paybackPeriod = (totalCost / (totalRevenue / duration));
        }
        if (totalRevenue > 0) {
            profitMargin = (netProfit / totalRevenue) * 100;
        }
        
        return `
            <div class="summary-item">
                <span>📊 Return on Investment (ROI)</span>
                <span><strong>${roi.toFixed(2)}%</strong></span>
            </div>
            <div class="summary-item">
                <span>💰 Profit Margin</span>
                <span><strong>${profitMargin.toFixed(2)}%</strong></span>
            </div>
            <div class="summary-item">
                <span>⏱️ Payback Period</span>
                <span><strong>${paybackPeriod.toFixed(0)} months</strong></span>
            </div>
            <div class="summary-item">
                <span>✅ Net Profit</span>
                <span><strong>${formatCurrency(netProfit)}</strong></span>
            </div>
        `;
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFeasibilityFix);
    } else {
        initFeasibilityFix();
    }
    
    // Export for global access
    window.feasibilityFix = {
        calculate: calculateFeasibility,
        generatePDF: generateFeasibilityPDF,
        openModal: openFeasibilityModal
    };
    
    console.log('✅ Feasibility Study Fix loaded successfully!');
})();
