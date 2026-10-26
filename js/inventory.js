const InventoryPage = (() => {
  function getAssetFilters(state) {
    const filterAssets = ['STORE MANAGER', 'STORE DIRECTOR'].includes(state.selectedRole)
      ? state.assets.filter((asset) => asset.location === 'Central Store' && !asset.archived)
      : state.assets;
    return {
      departments: ['All', ...new Set(filterAssets.map((asset) => asset.department))],
      categories: ['All', ...new Set(filterAssets.map((asset) => asset.category))],
      locations: ['All', ...new Set(filterAssets.map((asset) => asset.location))],
      statuses: ['All', ...new Set(filterAssets.map((asset) => asset.status))],
      conditions: ['All', ...new Set(filterAssets.map((asset) => asset.condition))],
      vendors: ['All', ...new Set(filterAssets.map((asset) => asset.vendor))]
    };
  }

  function getFilteredAssets(state) {
    const filters = state.filters.inventory;
    const term = state.searchTerm.toLowerCase();
    const isStoreManager = ['STORE MANAGER', 'STORE DIRECTOR'].includes(state.selectedRole);

    return state.assets.filter((asset) => {
      const matchesRoleScope = !isStoreManager || (asset.location === 'Central Store' && !asset.archived);
      const matchesDepartment = filters.department === 'All' || asset.department === filters.department;
      const matchesCategory = filters.category === 'All' || asset.category === filters.category;
      const matchesLocation = filters.location === 'All' || asset.location === filters.location;
      const matchesStatus = filters.status === 'All' || asset.status === filters.status;
      const matchesCondition = filters.condition === 'All' || asset.condition === filters.condition;
      const matchesVendor = filters.vendor === 'All' || asset.vendor === filters.vendor;
      const matchesSearch = !term || [asset.id, asset.name, asset.department, asset.location, asset.custodian, asset.vendor].join(' ').toLowerCase().includes(term);

      return matchesRoleScope && matchesDepartment && matchesCategory && matchesLocation && matchesStatus && matchesCondition && matchesVendor && matchesSearch;
    });
  }

  function render() {
    const state = window.InventorySystem.state;
    const role = window.InventorySystem.currentUser?.role;
    const filters = getAssetFilters(state);
    const assets = getFilteredAssets(state);
    const canAddAssets = role === 'SUPER ADMIN' || role === 'STORE MANAGER';

    return `
      <section class="page-section">
        <div class="toolbar">
          <div class="toolbar-left">
            <h3 style="margin:0;">Central Inventory</h3>
          </div>
          <div class="toolbar-right">
            ${canAddAssets ? '<button class="primary-button" data-action="open-add-asset">+ Add Asset</button>' : ''}
            <button class="secondary-button" data-action="export-assets">Export</button>
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <h3>Inventory Filters</h3>
          </div>
          <div class="modal-body">
            <div class="field-grid">
              <div class="field">
                <label>Department</label>
                <select data-filter="department">
                  ${filters.departments.map((option) => `<option value="${InventoryWorkflow.escapeHTML(option)}" ${state.filters.inventory.department === option ? 'selected' : ''}>${InventoryWorkflow.escapeHTML(option)}</option>`).join('')}
                </select>
              </div>
              <div class="field">
                <label>Category</label>
                <select data-filter="category">
                  ${filters.categories.map((option) => `<option value="${InventoryWorkflow.escapeHTML(option)}" ${state.filters.inventory.category === option ? 'selected' : ''}>${InventoryWorkflow.escapeHTML(option)}</option>`).join('')}
                </select>
              </div>
              <div class="field">
                <label>Location</label>
                <select data-filter="location">
                  ${filters.locations.map((option) => `<option value="${InventoryWorkflow.escapeHTML(option)}" ${state.filters.inventory.location === option ? 'selected' : ''}>${InventoryWorkflow.escapeHTML(option)}</option>`).join('')}
                </select>
              </div>
              <div class="field">
                <label>Status</label>
                <select data-filter="status">
                  ${['All', 'Available', 'Issued', 'Maintenance', 'Missing'].map((option) => `<option value="${option}" ${state.filters.inventory.status === option ? 'selected' : ''}>${option}</option>`).join('')}
                </select>
              </div>
              <div class="field">
                <label>Condition</label>
                <select data-filter="condition">
                  ${filters.conditions.map((option) => `<option value="${InventoryWorkflow.escapeHTML(option)}" ${state.filters.inventory.condition === option ? 'selected' : ''}>${InventoryWorkflow.escapeHTML(option)}</option>`).join('')}
                </select>
              </div>
              <div class="field">
                <label>Vendor</label>
                <select data-filter="vendor">
                  ${filters.vendors.map((option) => `<option value="${InventoryWorkflow.escapeHTML(option)}" ${state.filters.inventory.vendor === option ? 'selected' : ''}>${InventoryWorkflow.escapeHTML(option)}</option>`).join('')}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Asset ID</th>
                  <th>Asset Name</th>
                  <th>Category</th>
                  <th>Department</th>
                  <th>Location</th>
                  <th>Custodian</th>
                  <th>Status</th>
                  <th>Condition</th>
                  <th>Purchase Date</th>
                  <th>Value</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${assets.length ? assets.slice(0, 24).map((asset) => `
                  <tr data-asset-id="${InventoryWorkflow.escapeHTML(asset.id)}" class="asset-row">
                    <td>${InventoryWorkflow.escapeHTML(asset.id)}</td>
                    <td>${InventoryWorkflow.escapeHTML(asset.name)}</td>
                    <td>${InventoryWorkflow.escapeHTML(asset.category)}</td>
                    <td>${InventoryWorkflow.escapeHTML(asset.department)}</td>
                    <td>${InventoryWorkflow.escapeHTML(asset.location)}</td>
                    <td>${InventoryWorkflow.escapeHTML(asset.custodian)}</td>
                    <td><span class="status-chip ${InventoryWorkflow.escapeHTML(asset.status.toLowerCase().replace(/\s+/g, '-'))}">${InventoryWorkflow.escapeHTML(asset.status)}</span></td>
                    <td>${InventoryWorkflow.escapeHTML(asset.condition)}</td>
                    <td>${InventoryWorkflow.escapeHTML(asset.purchaseDate)}</td>
                    <td>₹${asset.purchaseCost.toLocaleString('en-IN')}</td>
                    <td class="asset-actions">
                      <button class="ghost-button" data-action="view-asset" data-asset-id="${InventoryWorkflow.escapeHTML(asset.id)}">View</button>
                      ${['SUPER ADMIN', 'STORE MANAGER'].includes(role) ? `<button class="ghost-button" data-action="edit-asset" data-asset-id="${InventoryWorkflow.escapeHTML(asset.id)}">Edit</button><select aria-label="Manage ${InventoryWorkflow.escapeHTML(asset.id)}" data-asset-management data-asset-id="${InventoryWorkflow.escapeHTML(asset.id)}"><option value="">Manage</option>${role === 'SUPER ADMIN' ? '<option value="archive">Archive</option>' : ''}<option value="damaged">Mark damaged</option><option value="missing">Mark missing</option><option value="maintenance">Send maintenance</option><option value="transfer">Transfer</option></select>` : ''}
                    </td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td colspan="11">
                      <div class="empty-state">No assets match the current filter set.</div>
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    `;
  }

  function renderAssetDetail(assetId) {
    const state = window.InventorySystem.state;
    const asset = state.assets.find((item) => item.id === assetId);
    if (!asset) return '';

    const qrMarkup = `
      <div id="assetQr_${InventoryWorkflow.escapeHTML(asset.id)}" style="width:120px;height:120px;margin-top:8px;"></div>
    `;

    return `
      <div class="drawer-header">
        <h3>Asset Details</h3>
        <button class="close-button" data-action="close-drawer" aria-label="Close">×</button>
      </div>
      <div class="drawer-body">
        <div class="asset-detail-card">
          <div class="asset-thumb">
            <i data-lucide="package"></i>
          </div>
          <div>
            <div class="asset-heading">
              <h4>${InventoryWorkflow.escapeHTML(asset.name)}</h4>
              <span class="status-chip ${InventoryWorkflow.escapeHTML(asset.status.toLowerCase().replace(/\s+/g, '-'))}">${InventoryWorkflow.escapeHTML(asset.status)}</span>
            </div>
            <div class="asset-identity">
              <span class="badge-pill info">${InventoryWorkflow.escapeHTML(asset.id)}</span>
              <span class="badge-pill neutral">${InventoryWorkflow.escapeHTML(asset.department)}</span>
              <span class="badge-pill success">${InventoryWorkflow.escapeHTML(asset.condition)}</span>
            </div>
          </div>
        </div>

        <div class="detail-grid">
          <div class="detail-item"><span class="inline-label">Category</span><strong>${InventoryWorkflow.escapeHTML(asset.category)}</strong></div>
          <div class="detail-item"><span class="inline-label">Serial Number</span><strong>${InventoryWorkflow.escapeHTML(asset.serialNumber)}</strong></div>
          <div class="detail-item"><span class="inline-label">QR Code</span><strong>${InventoryWorkflow.escapeHTML(asset.qrCode)}</strong></div>
          <div class="detail-item"><span class="inline-label">RFID Tag</span><strong>${InventoryWorkflow.escapeHTML(asset.rfidTag)}</strong></div>
          <div class="detail-item"><span class="inline-label">Department</span><strong>${InventoryWorkflow.escapeHTML(asset.department)}</strong></div>
          <div class="detail-item"><span class="inline-label">Current Location</span><strong>${InventoryWorkflow.escapeHTML(asset.location)}</strong></div>
          <div class="detail-item"><span class="inline-label">Current Custodian</span><strong>${InventoryWorkflow.escapeHTML(asset.custodian)}</strong></div>
          <div class="detail-item"><span class="inline-label">Purchase Date</span><strong>${InventoryWorkflow.escapeHTML(asset.purchaseDate)}</strong></div>
          <div class="detail-item"><span class="inline-label">Vendor</span><strong>${InventoryWorkflow.escapeHTML(asset.vendor)}</strong></div>
          <div class="detail-item"><span class="inline-label">Purchase Cost</span><strong>₹${asset.purchaseCost.toLocaleString('en-IN')}</strong></div>
          <div class="detail-item"><span class="inline-label">Warranty</span><strong>${InventoryWorkflow.escapeHTML(asset.warranty)}</strong></div>
          <div class="detail-item"><span class="inline-label">AMC</span><strong>${InventoryWorkflow.escapeHTML(asset.amc)}</strong></div>
        </div>

        <div class="tabs">
          <button class="tab-button active" data-tab="overview">Overview</button>
          <button class="tab-button" data-tab="movement">Movement History</button>
          <button class="tab-button" data-tab="maintenance">Maintenance</button>
          <button class="tab-button" data-tab="procurement">Procurement</button>
          <button class="tab-button" data-tab="documents">Documents</button>
        </div>

        <div class="section-block" data-content-panel="overview">
          <div class="field-grid">
            <div class="field"><label>Condition</label><input type="text" value="${InventoryWorkflow.escapeHTML(asset.condition)}" readonly /></div>
            <div class="field"><label>Status</label><input type="text" value="${InventoryWorkflow.escapeHTML(asset.status)}" readonly /></div>
          </div>
          ${qrMarkup}
        </div>

        <div class="section-block hidden" data-content-panel="movement">
          <div class="timeline">
            ${(asset.movementHistory && asset.movementHistory.length ? asset.movementHistory : [{ date: 'N/A', event: 'No movement history', details: 'No movement record available yet' }]).map((item) => `
              <div class="timeline-item">
                <div class="line"></div>
                <div class="content">
                  <strong>${item.date}</strong>
                  <span>${item.event}</span>
                  <span>${item.details}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="section-block hidden" data-content-panel="maintenance">
          <div class="empty-state">No active maintenance records for this asset.</div>
        </div>

        <div class="section-block hidden" data-content-panel="procurement">
          <div class="empty-state">No procurement details available.</div>
        </div>

        <div class="section-block hidden" data-content-panel="documents">
          <div class="empty-state">No documents uploaded.</div>
        </div>
      </div>
    `;
  }

  function renderAddAssetModal() {
    const departments = window.InventoryData.getDepartmentLabels();
    const vendors = window.InventoryData.getVendorNames();
    const isStoreManager = window.InventorySystem.currentUser?.role === 'STORE MANAGER';
    const assets = window.InventorySystem.state.assets;
    let generatedAssetId = `SU-AST-${String(assets.length + 1).padStart(4, '0')}`;
    while (assets.some((asset) => asset.id === generatedAssetId)) {
      generatedAssetId = `SU-AST-${String(Number(generatedAssetId.slice(-4)) + 1).padStart(4, '0')}`;
    }

    return `
      <div class="modal-header">
        <h3>Add Inventory Asset</h3>
        <button class="close-button" data-action="close-modal" aria-label="Close">×</button>
      </div>
      <div class="modal-body">
        <form id="addAssetForm">
          <div class="field-grid">
            <div class="field"><label>Asset Name</label><input name="name" required /></div>
            <div class="field"><label>Category</label><select name="category"><option>IT Equipment</option><option>Furniture</option><option>Networking</option><option>Electrical</option><option>Audio/Video</option><option>Laboratory</option><option>Stationery</option></select></div>
            <div class="field"><label>Brand</label><input name="brand" required /></div>
            <div class="field"><label>Model</label><input name="model" required /></div>
            <div class="field"><label>Serial Number</label><input name="serialNumber" required /></div>
            <div class="field"><label>Quantity</label><input type="number" name="quantity" min="1" value="1" required /></div>
            <div class="field"><label>Purchase Date</label><input type="date" name="purchaseDate" required /></div>
            <div class="field"><label>Vendor</label><select name="vendor">${vendors.map((vendor) => `<option>${vendor}</option>`).join('')}</select></div>
            <div class="field"><label>Purchase Cost</label><input type="number" name="purchaseCost" min="0" required /></div>
            <div class="field"><label>Warranty</label><input name="warranty" value="36 months" /></div>
            <div class="field"><label>Department</label>${isStoreManager ? '<input name="department" value="Central Store" readonly />' : `<select name="department">${departments.map((department) => `<option>${department}</option>`).join('')}</select>`}</div>
            <div class="field"><label>Location</label><input name="location" value="Central Store" ${isStoreManager ? 'readonly' : ''} /></div>
            <div class="field"><label>Condition</label><select name="condition"><option>Good</option><option>Fair</option><option>Needs Service</option><option>Critical</option></select></div>
          </div>
          <div class="field">
            <label>Generated Asset ID</label>
            <input id="generatedAssetId" name="assetId" readonly value="${generatedAssetId}" />
          </div>
          <div class="toolbar" style="margin-top:16px;">
            <div></div>
            <div class="toolbar-right">
              <button type="button" class="ghost-button" data-action="close-modal">Cancel</button>
              <button type="submit" class="primary-button">Submit Asset</button>
            </div>
          </div>
        </form>
      </div>
    `;
  }

  return {
    render,
    renderAssetDetail,
    renderAddAssetModal,
    getFilteredAssets,
    getAssetFilters
  };
})();

window.InventoryPage = InventoryPage;
