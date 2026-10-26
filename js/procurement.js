const ProcurementPage = (() => {
  function getFilteredRequests(state, selectedTab) {
    if (selectedTab === 'All') return state.procurementRequests;
    const tabs = {
      'Pending Approval': 'Pending Approval',
      Approved: 'Approved',
      'PO Created': 'PO Created',
      Ordered: 'Ordered',
      'Partially Received': 'Partially Received',
      Received: 'Received',
      'Pending Procurement': 'Pending Procurement',
      Rejected: 'Rejected'
    };

    return state.procurementRequests.filter((request) => request.status === tabs[selectedTab]);
  }

  function render(selectedTab = 'All') {
    const state = window.InventorySystem.state;
    const role = window.InventorySystem.currentUser?.role;
    const requests = getFilteredRequests(state, selectedTab);
    const tabs = ['All', 'Pending Approval', 'Approved', 'Pending Procurement', 'PO Created', 'Ordered', 'Partially Received', 'Received', 'Rejected'];

    return `
      <section class="page-section">
        <div class="toolbar">
          <div class="toolbar-left">
            <h3 style="margin:0;">Procurement Management</h3>
          </div>
          <div class="toolbar-right">
            ${role === 'SUPER ADMIN' ? '<button class="primary-button" data-action="new-purchase-request">+ New Purchase Request</button>' : ''}
            <button class="ghost-button" data-action="export-procurement">Export</button>
          </div>
        </div>

        <div class="panel">
          <div class="modal-body">
            <div class="tab-row">
              ${tabs.map((tab) => `
                <button class="tab-item ${tab === selectedTab ? 'active' : ''}" data-tab="${tab}" data-action="switch-procurement-tab">${tab}</button>
              `).join('')}
            </div>
          </div>

          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Department</th>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Requested By</th>
                  <th>Date</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${requests.length ? requests.map((request) => `
                  <tr>
                    <td>${InventoryWorkflow.escapeHTML(request.id)}</td>
                    <td>${InventoryWorkflow.escapeHTML(request.department)}</td>
                    <td>${InventoryWorkflow.escapeHTML(request.itemName)}</td>
                    <td>${InventoryWorkflow.escapeHTML(request.quantity)}</td>
                    <td>${InventoryWorkflow.escapeHTML(request.requestedBy)}</td>
                    <td>${InventoryWorkflow.escapeHTML(request.date)}</td>
                    <td><span class="badge-pill ${request.priority === 'High' ? 'warning' : request.priority === 'Medium' ? 'info' : 'neutral'}">${request.priority}</span></td>
                    <td><span class="status-chip ${InventoryWorkflow.escapeHTML(request.status.toLowerCase().replace(/\s+/g, '-').replace(/\//g, ''))}">${InventoryWorkflow.escapeHTML(request.status)}</span></td>
                    <td><button class="ghost-button" data-action="open-procurement-detail" data-request-id="${InventoryWorkflow.escapeHTML(request.id)}">Review</button></td>
                  </tr>
                `).join('') : `
                  <tr><td colspan="9"><div class="empty-state">No requests in this stage.</div></td></tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    `;
  }

  function renderDetailModal(requestId) {
    const request = window.InventorySystem.state.procurementRequests.find((item) => item.id === requestId);
    if (!request) return '';
    const role = window.InventorySystem.currentUser?.role;
    const canReceive = ['SUPER ADMIN', 'STORE MANAGER'].includes(role) && ['Ordered', 'Partially Received'].includes(request.status);
    const canAddQuotation = role === 'STORE MANAGER' && ['Pending Procurement', 'Approved'].includes(request.status);
    const quotations = request.quotations || [];

    return `
      <div class="modal-header">
        <h3>Request Details</h3>
        <button class="close-button" data-action="close-modal" aria-label="Close">×</button>
      </div>
      <div class="modal-body">
        <div class="section-block">
          <div class="detail-grid">
            <div class="detail-item"><span class="inline-label">Department</span><strong>${InventoryWorkflow.escapeHTML(request.department)}</strong></div>
            <div class="detail-item"><span class="inline-label">Requested Item</span><strong>${InventoryWorkflow.escapeHTML(request.itemName)}</strong></div>
            <div class="detail-item"><span class="inline-label">Quantity</span><strong>${InventoryWorkflow.escapeHTML(request.quantity)}</strong></div>
            <div class="detail-item"><span class="inline-label">Purpose</span><strong>${InventoryWorkflow.escapeHTML(request.purpose)}</strong></div>
            <div class="detail-item"><span class="inline-label">Requested By</span><strong>${InventoryWorkflow.escapeHTML(request.requestedBy)}</strong></div>
            <div class="detail-item"><span class="inline-label">Required Date</span><strong>${InventoryWorkflow.escapeHTML(request.requiredDate || request.date)}</strong></div>
            <div class="detail-item"><span class="inline-label">Budget estimate</span><strong>₹${(Number(request.budget) || 0).toLocaleString('en-IN')}</strong></div>
            <div class="detail-item"><span class="inline-label">Attachments</span><strong>${InventoryWorkflow.escapeHTML((request.attachments || []).join(', ') || 'None recorded')}</strong></div>
            <div class="detail-item"><span class="inline-label">Ordered / received</span><strong>${Number(request.orderedQuantity || request.quantity || 0)} / ${Number(request.receivedQuantity || 0)}</strong></div>
            <div class="detail-item"><span class="inline-label">Approval</span><strong>${request.decision ? InventoryWorkflow.escapeHTML(`${request.decision.decision} by ${request.decision.decidedBy}`) : 'See Store Director request queue'}</strong></div>
          </div>
        </div>

            <div class="section-block" style="margin-top:16px;">
              <div class="inline-label">Vendor quotations</div>
              <p class="muted-note">Comparison is advisory only. Vendor selection and purchase-order authority are not enabled in this prototype.</p>
              ${quotations.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Vendor</th><th>Qty</th><th>Unit Price</th><th>Tax</th><th>Estimated Total</th><th>Delivery</th><th>Valid Through</th></tr></thead><tbody>
                ${quotations.map((quote) => {
                  const total = Number(quote.quantity) * Number(quote.unitPrice) * (1 + Number(quote.taxPercent) / 100);
                  return `<tr><td>${InventoryWorkflow.escapeHTML(quote.vendor)}</td><td>${InventoryWorkflow.escapeHTML(quote.quantity)}</td><td>₹${Number(quote.unitPrice).toLocaleString('en-IN')}</td><td>${Number(quote.taxPercent)}%</td><td>₹${total.toLocaleString('en-IN')}</td><td>${InventoryWorkflow.escapeHTML(quote.deliveryTerms)}</td><td>${InventoryWorkflow.escapeHTML(quote.validThrough || '—')}</td></tr>`;
                }).join('')}
              </tbody></table></div>` : '<div class="empty-state">No quotations recorded for this requirement.</div>'}
              ${canAddQuotation ? `<form id="newQuotationForm" data-request-id="${InventoryWorkflow.escapeHTML(request.id)}" style="margin-top:16px;">
                <div class="field-grid">
                  <div class="field"><label>Vendor</label><input name="vendor" required /></div>
                  <div class="field"><label>Quoted Quantity</label><input name="quantity" type="number" min="1" step="1" required /></div>
                  <div class="field"><label>Unit Price (₹)</label><input name="unitPrice" type="number" min="0" step="0.01" required /></div>
                  <div class="field"><label>Tax (%)</label><input name="taxPercent" type="number" min="0" step="0.01" value="0" required /></div>
                  <div class="field"><label>Delivery Terms</label><input name="deliveryTerms" required /></div>
                  <div class="field"><label>Validity Date</label><input name="validThrough" type="date" /></div>
                  <div class="field" style="grid-column:1/-1;"><label>Notes</label><textarea name="notes"></textarea></div>
                </div>
                <p class="muted-note">Quotation files are not stored by this frontend prototype. Do not upload or enter confidential procurement data.</p>
                <div class="toolbar-right" style="margin-top:12px"><button class="secondary-button" type="submit">Record Quotation</button></div>
              </form>` : ''}
            </div>
            <div class="section-block" style="margin-top:16px;"><div class="inline-label">Purchase order authority</div><p>Purchase-order creation and financial approval are not enabled until university delegation rules are confirmed. This Store Director request decision is not financial approval.</p></div>
            ${canReceive ? `<div class="toolbar" style="margin-top:16px;"><div class="inline-label">Purchase Order: ${request.id}</div><div class="toolbar-right"><button class="primary-button" data-action="open-receive-modal" data-request-id="${request.id}">Receive Goods</button></div></div>` : ''}
      </div>
    `;
  }

  function renderNewRequestModal() {
    return `
      <div class="modal-header">
        <h3>New Purchase Request</h3>
        <button class="close-button" data-action="close-modal" aria-label="Close">×</button>
      </div>
      <div class="modal-body">
        <form id="newRequestForm">
          <div class="field-grid">
            <div class="field"><label>Department</label><select name="department"><option>CSE</option><option>ECE</option><option>Mechanical</option><option>Civil</option><option>Administration</option><option>Operations</option><option>Estates</option><option>Library</option></select></div>
            <div class="field"><label>Requested By</label><input name="requestedBy" required /></div>
            <div class="field"><label>Item Category</label><select name="itemCategory"><option>IT Equipment</option><option>Furniture</option><option>Networking</option><option>Electrical</option><option>Audio/Video</option></select></div>
            <div class="field"><label>Item Name</label><input name="itemName" required /></div>
            <div class="field"><label>Quantity</label><input type="number" name="quantity" min="1" required /></div>
            <div class="field"><label>Purpose</label><input name="purpose" required /></div>
            <div class="field"><label>Estimated Cost</label><input type="number" name="budget" min="0" required /></div>
            <div class="field"><label>Required Date</label><input type="date" name="requiredDate" required /></div>
            <div class="field"><label>Priority</label><select name="priority"><option>High</option><option>Medium</option><option>Low</option></select></div>
            <div class="field" style="grid-column:1 / -1;"><label>Description</label><textarea name="description"></textarea></div>
            <div class="field" style="grid-column:1 / -1;"><label>Attachment</label><input type="file" name="attachment" /></div>
          </div>

          <div class="toolbar" style="margin-top:16px;">
            <div></div>
            <div class="toolbar-right">
              <button type="button" class="ghost-button" data-action="close-modal">Cancel</button>
              <button type="submit" class="primary-button">Submit Request</button>
            </div>
          </div>
        </form>
      </div>
    `;
  }

  function renderReceiveModal(requestId) {
    const request = window.InventorySystem.state.procurementRequests.find((item) => item.id === requestId);
    if (!request) return '';

    return `
      <div class="modal-header">
        <h3>Receive Goods</h3>
        <button class="close-button" data-action="close-modal" aria-label="Close">×</button>
      </div>
      <div class="modal-body">
        <form id="receiveForm" data-request-id="${request.id}">
          <input type="hidden" name="receiptId" value="GRN-${Date.now()}-${Math.random().toString(36).slice(2, 8)}" />
          <div class="field-grid">
            <div class="field"><label>Order / requirement reference</label><input name="poNumber" value="${InventoryWorkflow.escapeHTML(request.id)}" readonly /></div>
            <div class="field"><label>Vendor</label><input name="vendor" value="${InventoryWorkflow.escapeHTML(request.vendor || '')}" required /></div>
            <div class="field"><label>Item</label><input name="itemName" value="${InventoryWorkflow.escapeHTML(request.itemName)}" readonly /></div>
            <div class="field"><label>Quantity Ordered</label><input type="number" name="quantityOrdered" value="${request.quantity}" /></div>
            <div class="field"><label>Outstanding Quantity</label><input value="${Math.max(0, Number(request.orderedQuantity || request.quantity) - Number(request.receivedQuantity || 0))}" readonly /></div>
            <div class="field"><label>Quantity Received</label><input type="number" name="quantityReceived" max="${Math.max(0, Number(request.orderedQuantity || request.quantity) - Number(request.receivedQuantity || 0))}" min="1" step="1" required /></div>
            <div class="field"><label>Received Date</label><input type="date" name="receivedDate" value="${new Date().toISOString().slice(0, 10)}" required /></div>
            <div class="field"><label>Received By</label><input name="receivedBy" value="${InventoryWorkflow.escapeHTML(window.InventorySystem.currentUser?.name || '')}" required /></div>
            <div class="field"><label>Condition</label><select name="condition"><option>Good</option><option>Fair</option><option>Needs Service</option><option>Critical</option></select></div>
            <div class="field" style="grid-column:1 / -1;"><label>Remarks</label><textarea name="remarks">Goods received and verified at receiving bay.</textarea></div>
          </div>

          <div class="toolbar" style="margin-top:16px;">
            <div></div>
            <div class="toolbar-right">
              <button type="button" class="ghost-button" data-action="close-modal">Cancel</button>
              <button type="submit" class="primary-button">Confirm Receipt</button>
            </div>
          </div>
        </form>
      </div>
    `;
  }

  return {
    render,
    renderDetailModal,
    renderNewRequestModal,
    renderReceiveModal
  };
})();

window.ProcurementPage = ProcurementPage;
