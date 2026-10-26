const AUTH_KEY = 'school_inventory_demo_session_v1';
const demoAccounts = [
  { email: 'admin@shooliniuniversity.com', password: 'admin123', role: 'SUPER ADMIN', name: 'Inventory Administrator', department: 'University Administration' },
  { email: 'store@shooliniuniversity.com', password: 'store123', role: 'STORE MANAGER', name: 'Central Store Manager', department: 'Central Store' },
  { email: 'director@shooliniuniversity.com', password: 'director123', role: 'STORE DIRECTOR', name: 'Store Director', department: 'Central Store' },
  { email: 'hod@shooliniuniversity.com', password: 'hod123', role: 'HOD', name: 'Dr. Sharma', department: 'CSE' }
];

function normalizeRole(role) {
  return role === 'ADMIN' || role === 'INVENTORY ADMIN' ? 'SUPER ADMIN' : role;
}

const escapeHTML = InventoryWorkflow.escapeHTML;

function readSession() {
  try {
    const session = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
    const role = normalizeRole(session?.role);
    return session && ['SUPER ADMIN', 'STORE MANAGER', 'STORE DIRECTOR', 'HOD'].includes(role)
      ? { ...session, role }
      : null;
  } catch (error) {
    localStorage.removeItem(AUTH_KEY);
    return null;
  }
}

const InventorySystem = (() => {
  const state = InventoryData.ensureState();
  const app = {
    state,
    currentPage: state.currentPage || 'dashboard',
    selectedProcurementTab: 'All',
    selectedRequestTab: 'All',
    currentSearch: '',
    requestModalOpen: false,
    drawerOpen: false,
    currentUser: readSession()
  };

  if (app.currentUser) app.state.selectedRole = app.currentUser.role;

  function save() {
    InventoryData.saveState(app.state);
  }

  function recordAudit(action, recordType, recordId, details = {}) {
    app.state.auditLog ||= [];
    app.state.auditLog.unshift({
      id: `AUD-${Date.now()}-${app.state.auditLog.length}`,
      action,
      recordType,
      recordId,
      actor: app.currentUser?.name || 'Unknown demo user',
      role: app.currentUser?.role || 'Unknown',
      timestamp: new Date().toISOString(),
      details
    });
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 2500);
  }

  function defaultPageForRole(role) {
    if (role === 'HOD') return 'hod_dashboard';
    if (role === 'STORE MANAGER') return 'store_dashboard';
    if (role === 'STORE DIRECTOR') return 'requests';
    return 'dashboard';
  }

  function allowedPagesForRole(role) {
    if (role === 'HOD') return ['hod_dashboard', 'available_inventory', 'my_requests', 'request_item', 'department_inventory'];
    if (role === 'STORE MANAGER') return ['store_dashboard', 'requests', 'central_store', 'inventory', 'issue_return', 'movement', 'maintenance', 'procurement', 'vendors', 'reports'];
    if (role === 'STORE DIRECTOR') return ['requests', 'procurement', 'reports'];
    return ['dashboard', 'requests', 'procurement', 'inventory', 'central_store', 'issue_return', 'movement', 'maintenance', 'vendors', 'departments', 'surveillance', 'reports', 'users', 'settings', 'audit'];
  }

  function renderAuthentication(errorMessage = '') {
    const loginRoot = document.getElementById('loginRoot');
    const appShell = document.getElementById('appShell');
    if (!loginRoot || !appShell) return;
    appShell.classList.add('hidden');
    loginRoot.classList.remove('hidden');
    loginRoot.innerHTML = `
      <section class="login-layout">
        <div class="login-brand-panel">
          <div class="login-brand">
            <img class="login-logo" src="assets/shoolini-logo.svg" alt="Shoolini University" />
            <div class="login-brand-description"><span>Centralized Inventory Management System</span></div>
          </div>
          <div class="login-message">
            <p class="eyebrow">Physical assets. One trusted record.</p>
            <h1>One Central Source of Truth for Every Physical Asset</h1>
            <p>Manage procurement, central store operations, inventory, issue and return in one connected workflow.</p>
          </div>
          <div class="login-workflow" aria-label="Inventory workflow">
            ${[
              ['shopping-cart', 'Procurement'], ['warehouse', 'Central Store'], ['package', 'Inventory'],
              ['hand-coins', 'Issue'], ['radio', 'Tracking'], ['undo-2', 'Return']
            ].map(([icon, label], index) => `
              <div class="login-step"><span class="login-step-icon"><i data-lucide="${icon}"></i></span><small>${label}</small></div>
              ${index < 5 ? '<span class="login-flow-arrow" aria-hidden="true">→</span>' : ''}
            `).join('')}
          </div>
          <div class="login-footnote">A focused system for university physical inventory and procurement.</div>
        </div>
        <div class="login-form-panel">
          <div class="login-card">
            <span class="login-kicker">SECURE ACCESS</span>
            <h2>Login</h2>
            <p>Sign in with your university inventory account.</p>
            <form id="loginForm" novalidate>
              <div class="field"><label for="loginIdentity">University Email / Employee ID</label><input id="loginIdentity" name="identity" type="text" autocomplete="username" required /></div>
              <div class="field"><label for="loginPassword">Password</label><input id="loginPassword" name="password" type="password" autocomplete="current-password" required /></div>
              <p class="login-error ${errorMessage ? '' : 'hidden'}" role="alert">${errorMessage}</p>
              <button class="primary-button login-submit" type="submit">Login <i data-lucide="arrow-right"></i></button>
            </form>
            <div class="login-secure"><i data-lucide="shield-check"></i><span>Secure University Inventory System</span></div>
            <small class="demo-notice">Frontend prototype. Demo credentials only; not real university credentials.</small>
          </div>
        </div>
      </section>
    `;
    refreshIcons();
  }

  function authenticate(identity, password) {
    const account = demoAccounts.find((item) => item.email === identity.trim().toLowerCase() && item.password === password);
    const userRecord = account && (app.state.users || []).find((user) => user.email === account.email);
    if (!account || userRecord?.active === false) return false;
    app.currentUser = {
      name: userRecord?.name || account.name,
      role: normalizeRole(userRecord?.role || account.role),
      department: userRecord?.department || account.department,
      email: account.email
    };
    app.state.selectedRole = app.currentUser.role;
    app.currentPage = defaultPageForRole(account.role);
    app.state.currentPage = app.currentPage;
    localStorage.setItem(AUTH_KEY, JSON.stringify(app.currentUser));
    document.getElementById('loginRoot')?.classList.add('hidden');
    document.getElementById('appShell')?.classList.remove('hidden');
    renderPage();
    save();
    return true;
  }

  function logout() {
    localStorage.removeItem(AUTH_KEY);
    app.currentUser = null;
    document.getElementById('appShell')?.classList.add('hidden');
    renderAuthentication();
  }

  function renderSidebar() {
    const sidebar = document.getElementById('sidebarNav');
    if (!sidebar) return;

    const navMap = [
      { key: 'dashboard', label: 'Dashboard', icon: 'layout-grid' },
      { key: 'requests', label: 'Requests', icon: 'clipboard-list' },
      { key: 'procurement', label: 'Procurement', icon: 'shopping-cart' },
      { key: 'inventory', label: 'Inventory', icon: 'package' },
      { key: 'issue_return', label: 'Issue / Return', icon: 'arrow-left-right' },
      { key: 'movement', label: 'Asset Movement', icon: 'move-right' },
      { key: 'central_store', label: 'Central Store', icon: 'warehouse' },
      { key: 'maintenance', label: 'Maintenance', icon: 'wrench' },
      { key: 'vendors', label: 'Vendors', icon: 'building-2' },
      { key: 'departments', label: 'Departments', icon: 'building' },
      { key: 'surveillance', label: 'AI Surveillance', icon: 'camera' },
      { key: 'reports', label: 'Reports', icon: 'file-text' },
      { key: 'users', label: 'Users & Roles', icon: 'users' },
      { key: 'settings', label: 'Settings', icon: 'settings' },
      { key: 'audit', label: 'Audit Log', icon: 'list-checks' }
    ];
    const roleNavigation = {
      'SUPER ADMIN': navMap,
      'STORE MANAGER': [
        { key: 'store_dashboard', label: 'Dashboard', icon: 'layout-grid' },
        { key: 'requests', label: 'Requests', icon: 'clipboard-list' },
        { key: 'central_store', label: 'Central Store', icon: 'warehouse' },
        { key: 'inventory', label: 'Inventory', icon: 'package' },
        { key: 'issue_return', label: 'Issue / Return', icon: 'arrow-left-right' },
        { key: 'movement', label: 'Asset Movement', icon: 'move-right' },
        { key: 'maintenance', label: 'Maintenance', icon: 'wrench' },
        { key: 'procurement', label: 'Procurement', icon: 'shopping-cart' },
        { key: 'vendors', label: 'Vendors', icon: 'building-2' },
        { key: 'reports', label: 'Reports', icon: 'file-text' }
      ],
      'STORE DIRECTOR': [
        { key: 'requests', label: 'Approval Queue', icon: 'clipboard-list' },
        { key: 'procurement', label: 'Procurement Oversight', icon: 'shopping-cart' },
        { key: 'reports', label: 'Reports', icon: 'file-text' }
      ],
      HOD: [
        { key: 'hod_dashboard', label: 'Dashboard', icon: 'layout-grid' },
        { key: 'available_inventory', label: 'Available Inventory', icon: 'package-check' },
        { key: 'my_requests', label: 'My Requests', icon: 'clipboard-list' },
        { key: 'request_item', label: 'Request Item', icon: 'file-plus-2' },
        { key: 'department_inventory', label: 'Department Inventory', icon: 'boxes' }
      ]
    };
    const visible = roleNavigation[app.currentUser?.role] || roleNavigation['SUPER ADMIN'];

    sidebar.innerHTML = visible.map((item) => `
      <button class="nav-item ${app.currentPage === item.key ? 'active' : ''}" data-page="${item.key}">
        <i data-lucide="${item.icon}"></i>
        <span class="nav-label">${item.label}</span>
      </button>
    `).join('');

    sidebar.querySelectorAll('[data-page]').forEach((navItem) => {
      navItem.onclick = () => setPage(navItem.dataset.page);
    });
  }

  function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  function setPage(pageKey) {
    if (!app.currentUser) {
      renderAuthentication();
      return;
    }
    if (!allowedPagesForRole(app.currentUser.role).includes(pageKey)) {
      pageKey = defaultPageForRole(app.currentUser.role);
      showToast('This page is not available for your role.', 'error');
    }
    app.currentPage = pageKey;
    app.state.currentPage = pageKey;
    renderPage();
    save();
  }

  function renderTopbar() {
    const pageTitleMap = {
      dashboard: 'Dashboard',
      requests: 'Requests',
      procurement: 'Procurement',
      inventory: 'Inventory',
      issue_return: 'Issue / Return',
      movement: 'Asset Movement',
      central_store: 'Central Store',
      maintenance: 'Maintenance',
      vendors: 'Vendors',
      departments: 'Departments',
      surveillance: 'AI Surveillance',
      reports: 'Reports',
      settings: 'Settings',
      audit: 'Audit Log',
      users: 'Users & Roles',
      store_dashboard: 'Store Operations',
      hod_dashboard: 'Department Dashboard',
      available_inventory: 'Available Inventory',
      my_requests: 'My Requests',
      request_item: 'Request Item',
      department_inventory: 'Department Inventory'
    };

    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) pageTitle.textContent = pageTitleMap[app.currentPage] || 'Dashboard';

    const dateNode = document.getElementById('currentDate');
    if (dateNode) {
      dateNode.textContent = new Date().toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric'
      });
    }

    const profileName = document.getElementById('profileName');
    const profileRole = document.getElementById('profileRole');
    const sidebarName = document.getElementById('sidebarName');
    const sidebarRole = document.getElementById('sidebarRole');
    const profileAvatar = document.getElementById('profileAvatar');
    const sidebarAvatar = document.getElementById('sidebarAvatar');
    const currentUser = app.currentUser;
    const roleText = currentUser?.role || app.state.selectedRole;

    if (profileName) {
      profileName.textContent = currentUser?.name || 'Inventory Administrator';
    }

    if (profileRole) {
      profileRole.textContent = currentUser?.role === 'HOD' ? `HOD — ${currentUser.department}` : roleText;
    }
    if (sidebarName) sidebarName.textContent = currentUser?.name || 'Inventory Administrator';
    if (sidebarRole) sidebarRole.textContent = currentUser?.role === 'HOD' ? `HOD — ${currentUser.department}` : roleText;
    const initials = (currentUser?.name || 'Inventory Administrator').split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();
    if (profileAvatar) profileAvatar.textContent = initials;
    if (sidebarAvatar) sidebarAvatar.textContent = initials;
  }

  function renderPage() {
    if (!app.currentUser) {
      renderAuthentication();
      return;
    }
    const container = document.getElementById('pageContent');
    if (!container) return;

    let html = '';
    const currentPage = app.currentPage;

    if (currentPage === 'dashboard') {
      html = DashboardPage.render();
    } else if (currentPage === 'requests') {
      html = renderRequestsPage();
    } else if (currentPage === 'procurement') {
      html = ProcurementPage.render(app.selectedProcurementTab);
    } else if (currentPage === 'inventory') {
      html = InventoryPage.render();
    } else if (currentPage === 'issue_return') {
      html = IssueReturnPage.render();
    } else if (currentPage === 'movement') {
      html = renderMovementPage();
    } else if (currentPage === 'central_store') {
      html = renderCentralStorePage();
    } else if (currentPage === 'maintenance') {
      html = renderMaintenancePage();
    } else if (currentPage === 'vendors') {
      html = renderVendorsPage();
    } else if (currentPage === 'departments') {
      html = renderDepartmentsPage();
    } else if (currentPage === 'surveillance') {
      html = SurveillancePage.render();
    } else if (currentPage === 'reports') {
      html = renderReportsPage();
    } else if (currentPage === 'settings') {
      html = renderSettingsPage();
    } else if (currentPage === 'store_dashboard') {
      html = renderStoreDashboard();
    } else if (currentPage === 'hod_dashboard') {
      html = renderHodDashboard();
    } else if (currentPage === 'available_inventory') {
      html = renderAvailableInventory();
    } else if (currentPage === 'my_requests') {
      html = renderHodRequests();
    } else if (currentPage === 'request_item') {
      html = renderHodRequestForm();
    } else if (currentPage === 'department_inventory') {
      html = renderDepartmentInventory();
    } else if (currentPage === 'users') {
      html = renderUsersPage();
    } else if (currentPage === 'audit') {
      html = renderAuditPage();
    }

    container.innerHTML = `<div class="prototype-banner" role="status"><strong>Prototype / demo data only.</strong> Records are stored in this browser, are not authoritative, and must not contain confidential information.</div>${html}`;
    renderSidebar();
    renderTopbar();
    refreshIcons();

    if (currentPage === 'dashboard') {
      DashboardPage.renderCharts();
    }

    if (currentPage === 'inventory') {
      const searchInput = document.getElementById('globalSearchInput');
      if (searchInput) searchInput.value = app.state.searchTerm;
    }

    if (currentPage === 'procurement') {
      const detailModal = document.getElementById('requestModalContent');
      if (detailModal && detailModal.dataset.open === 'true') {
        detailModal.innerHTML = ProcurementPage.renderDetailModal(detailModal.dataset.requestId);
      }
    }

    if (currentPage === 'issue_return') {
      bindIssueReturnInteraction();
    }
  }

  function getDepartmentAssets() {
    return app.state.assets.filter((asset) => asset.department === app.currentUser?.department && !asset.archived);
  }

  function getAvailableStoreStock() {
    const stock = new Map();
    app.state.assets.filter(InventoryWorkflow.isUsableStoreAsset).forEach((asset) => {
      const item = asset.itemType || asset.category;
      if (!stock.has(item)) {
        stock.set(item, {
          item,
          category: asset.category,
          quantity: InventoryWorkflow.getAvailableQuantity(app.state.assets, app.state.reservations, item),
          condition: asset.condition
        });
      }
    });
    return [...stock.values()].filter((item) => item.quantity > 0).sort((left, right) => left.item.localeCompare(right.item));
  }

  function getDepartmentSummaries() {
    const departmentNames = new Set([
      ...(app.state.departments || []).map((department) => department.name),
      ...app.state.assets.map((asset) => asset.department)
    ]);
    return [...departmentNames].sort().map((name) => {
      const assets = app.state.assets.filter((asset) => asset.department === name && !asset.archived);
      return {
        name,
        totalAssets: assets.length,
        issued: assets.filter((asset) => asset.status === 'Issued').length,
        available: assets.filter((asset) => asset.status === 'Available').length,
        maintenance: assets.filter((asset) => asset.status === 'Maintenance').length,
        pendingRequests: app.state.requests.filter((request) => request.department === name && request.status === 'Pending Approval').length
      };
    });
  }

  function renderRequestActions(request, role) {
    const requestId = request.id || request.requestId;
    if (role === 'STORE DIRECTOR' && request.status === 'Pending Approval') {
      return `<button class="primary-button" data-action="open-request-decision" data-request-id="${requestId}" data-status="Approved">Approve</button> <button class="danger-button" data-action="open-request-decision" data-request-id="${requestId}" data-status="Rejected">Reject</button>`;
    }
    if (role === 'SUPER ADMIN') {
      return `<button class="ghost-button" data-action="open-procurement-detail" data-request-id="${requestId}">View details</button>`;
    }
    return `<button class="ghost-button" data-action="open-procurement-detail" data-request-id="${requestId}">View details</button>`;
  }

  function renderRequestsPage() {
    const state = app.state;
    const tabs = ['All Requests', 'Purchase Requests', 'Issue Requests', 'Transfer Requests', 'Return Requests'];
    const role = app.currentUser?.role;

    const filtered = state.requests.filter((request) => {
      if (role === 'STORE MANAGER' && !['Ready for Issue', 'Procurement Required', 'Approved', 'Partially Received', 'Ordered'].includes(request.status)) return false;
      if (app.selectedRequestTab === 'All Requests') return true;
      if (app.selectedRequestTab === 'Purchase Requests') return request.requestType === 'Purchase Request';
      if (app.selectedRequestTab === 'Issue Requests') return request.requestType === 'Issue Request';
      if (app.selectedRequestTab === 'Transfer Requests') return request.requestType === 'Transfer Request';
      if (app.selectedRequestTab === 'Return Requests') return request.requestType === 'Return Request';
      return true;
    });

    const heading = role === 'STORE MANAGER'
      ? 'Store Fulfilment Queue'
      : role === 'STORE DIRECTOR' ? 'Store Director Approval Queue' : 'Request Center';
    const showPurchaseAction = role === 'SUPER ADMIN';

    return `
      <section class="page-section">
        <div class="toolbar">
          <div class="toolbar-left"><h3 style="margin:0;">${heading}</h3></div>
          <div class="toolbar-right">
            ${showPurchaseAction ? '<button class="primary-button" data-action="new-purchase-request">+ Purchase Request</button>' : ''}
            <button class="ghost-button" data-action="export-procurement">Export</button>
          </div>
        </div>

        <div class="panel">
          <div class="modal-body">
            <div class="tab-row">
              ${tabs.map((tab) => `
                <button class="tab-item ${tab === app.selectedRequestTab ? 'active' : ''}" data-request-tab="${tab}" data-action="switch-request-tab">${tab}</button>
              `).join('')}
            </div>
          </div>

          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Request Type</th>
                  <th>Department</th>
                  <th>Requested By</th>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Priority</th>
                  <th>Date</th>
                  <th>Availability</th>
                  <th>Purpose</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.length ? filtered.map((request) => `
                  <tr>
                    <td>${escapeHTML(request.id || request.requestId || request.requestID || 'N/A')}</td>
                    <td>${escapeHTML(request.requestType || 'Purchase Request')}</td>
                    <td>${escapeHTML(request.department)}</td>
                    <td>${escapeHTML(request.requestedBy || request.person || '-')}</td>
                    <td>${escapeHTML(request.itemName || request.item)}</td>
                    <td>${escapeHTML(request.quantity || 1)}</td>
                    <td><span class="badge-pill ${['High', 'Medium'].includes(request.priority) ? request.priority.toLowerCase() === 'high' ? 'warning' : 'info' : 'neutral'}">${escapeHTML(request.priority || 'Medium')}</span></td>
                    <td>${escapeHTML(request.date || request.requiredDate || '—')}</td>
                    <td>${request.availability === undefined ? 'Not checked' : `${escapeHTML(request.availability)} available`}</td>
                    <td>${escapeHTML(request.purpose || '—')}</td>
                    <td><span class="status-chip ${escapeHTML(String(request.status).toLowerCase().replace(/\s+/g, '-').replace(/\//g, ''))}">${escapeHTML(request.status)}</span></td>
                    <td>${renderRequestActions(request, role)}</td>
                  </tr>
                `).join('') : `
                  <tr><td colspan="12"><div class="empty-state">No requests in this group.</div></td></tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    `;
  }

  function renderRequestDecisionModal(requestId, decision) {
    const request = getRequestById(requestId);
    if (!request || app.currentUser?.role !== 'STORE DIRECTOR' || request.status !== 'Pending Approval') return '';
    return `
      <div class="modal-header"><h3>${decision === 'Rejected' ? 'Reject Request' : 'Approve Request'}</h3><button class="close-button" data-action="close-modal" aria-label="Close">×</button></div>
      <div class="modal-body">
        <p><strong>${escapeHTML(request.id)}</strong> — ${escapeHTML(request.itemName || request.item)}, quantity ${escapeHTML(request.quantity)}, ${escapeHTML(request.department)}</p>
        <form id="requestDecisionForm" data-request-id="${escapeHTML(request.id)}" data-decision="${escapeHTML(decision)}">
          <div class="field"><label for="decisionReason">${decision === 'Rejected' ? 'Reason for rejection (required)' : 'Decision note (optional)'}</label>
            <textarea id="decisionReason" name="reason" ${decision === 'Rejected' ? 'required minlength="3"' : ''}></textarea></div>
          <div class="toolbar-right" style="margin-top:16px">
            <button type="button" class="ghost-button" data-action="close-modal">Cancel</button>
            <button type="submit" class="${decision === 'Rejected' ? 'danger-button' : 'primary-button'}">Confirm ${decision}</button>
          </div>
        </form>
      </div>
    `;
  }

  function renderStoreDashboard() {
    const storeAssets = app.state.assets.filter((asset) => asset.location === 'Central Store' && !asset.archived);
    const today = new Date().toISOString().slice(0, 10);
    const todayMoves = app.state.movements.filter((move) => (move.timestamp || '').slice(0, 10) === today);
    const pending = app.state.requests.filter((request) => ['Ready for Issue', 'Procurement Required'].includes(request.status));
    const metric = (label, value, icon) => `<article class="kpi-card"><div class="kpi-icon"><i data-lucide="${icon}"></i></div><h3>${value}</h3><div class="kpi-label">${label}</div></article>`;

    return `
      <section class="page-section">
        <div class="kpi-grid store-kpi-grid">
          ${metric('Total Store Items', storeAssets.length, 'warehouse')}
          ${metric('Available', storeAssets.filter((asset) => InventoryWorkflow.isUsableStoreAsset(asset)).length, 'package-check')}
          ${metric('Issued Today', todayMoves.filter((move) => move.movementType === 'Issue').length, 'arrow-up-right')}
          ${metric('Returned Today', todayMoves.filter((move) => move.movementType === 'Return').length, 'undo-2')}
          ${metric('Pending Requests', pending.length, 'clipboard-list')}
          ${metric('Items to Receive', app.state.procurementRequests.filter((request) => ['Ordered', 'Partially Received'].includes(request.status)).length, 'package-plus')}
        </div>
        <div class="store-layout">
          <div class="panel">
            <div class="panel-header"><h3>Today's Activity</h3></div>
            <ul class="activity-list store-activity">
              ${['Receipt', 'Issue', 'Return', 'Transfer'].map((kind) => `<li><span>${{ Receipt: 'Received', Issue: 'Issued', Return: 'Returned', Transfer: 'Transferred' }[kind]}</span><strong>${todayMoves.filter((move) => move.movementType === kind).length}</strong></li>`).join('')}
            </ul>
          </div>
          <div class="panel">
            <div class="panel-header"><h3>Store Alerts</h3></div>
            <div class="modal-body">
              <p><strong>${storeAssets.filter((asset) => asset.status === 'Maintenance').length}</strong> items currently under maintenance</p>
              <p><strong>${app.state.surveillanceEvents.filter((event) => event.severity === 'warning').length}</strong> simulated RFID / access alerts</p>
              <p class="muted-note">Camera and RFID events are simulated in this frontend prototype.</p>
            </div>
          </div>
        </div>
        <div class="panel">
          <div class="panel-header"><h3>Requests Awaiting Fulfilment</h3><button class="ghost-button" data-page="requests">Open queue</button></div>
          <div class="table-wrap"><table class="table"><thead><tr><th>Request</th><th>Department</th><th>Item</th><th>Qty</th><th>Status</th></tr></thead><tbody>
            ${pending.slice(0, 5).map((request) => `<tr><td>${escapeHTML(request.id)}</td><td>${escapeHTML(request.department)}</td><td>${escapeHTML(request.itemName)}</td><td>${escapeHTML(request.quantity)}</td><td><span class="status-chip pending">${escapeHTML(request.status)}</span></td></tr>`).join('') || '<tr><td colspan="5"><div class="empty-state">No requests waiting for store review.</div></td></tr>'}
          </tbody></table></div>
        </div>
      </section>
    `;
  }

  function renderHodDashboard() {
    const department = app.currentUser.department;
    const assets = getDepartmentAssets();
    const myRequests = app.state.requests.filter((request) => request.department === department);
    const available = getAvailableStoreStock();
    const stats = [
      ['Department Inventory', assets.length, 'boxes'],
      ['Available Store Items', available.length, 'package-check'],
      ['Pending Requests', myRequests.filter((request) => request.status === 'Pending Approval').length, 'clock-3'],
      ['Approved Requests', myRequests.filter((request) => ['Approved', 'Ready for Issue', 'Procurement Required'].includes(request.status)).length, 'badge-check'],
      ['Issued Items', assets.filter((asset) => asset.status === 'Issued').length, 'send'],
      ['Under Maintenance', assets.filter((asset) => asset.status === 'Maintenance').length, 'wrench']
    ];
    return `
      <section class="page-section">
        <div class="hod-welcome"><div><span class="login-kicker">${escapeHTML(department)} DEPARTMENT</span><h3>${escapeHTML(app.currentUser.name)}</h3><p>Department inventory and requests</p></div><button class="primary-button" data-page="request_item">Request an item</button></div>
        <div class="grid-3">${stats.map(([label, value, icon]) => `<article class="card-mini hod-stat"><i data-lucide="${icon}"></i><p class="stat">${value}</p><h4>${label}</h4></article>`).join('')}</div>
        <div class="panel"><div class="panel-header"><h3>Recent Department Requests</h3><button class="ghost-button" data-page="my_requests">View all</button></div>
          <div class="table-wrap"><table class="table"><thead><tr><th>Request ID</th><th>Item</th><th>Quantity</th><th>Date</th><th>Status</th></tr></thead><tbody>
            ${myRequests.slice(0, 5).map((request) => `<tr><td>${escapeHTML(request.id)}</td><td>${escapeHTML(request.itemName || request.item)}</td><td>${escapeHTML(request.quantity)}</td><td>${escapeHTML(request.date || '—')}</td><td><span class="status-chip ${escapeHTML(String(request.status).toLowerCase().replace(/\s+/g, '-'))}">${escapeHTML(request.status)}</span></td></tr>`).join('') || '<tr><td colspan="5"><div class="empty-state">No department requests yet.</div></td></tr>'}
          </tbody></table></div>
        </div>
      </section>
    `;
  }

  function renderAvailableInventory() {
    const stock = getAvailableStoreStock();
    return `
      <section class="page-section">
        <div class="toolbar"><div class="toolbar-left"><h3 style="margin:0;">Available Central Store Items</h3></div><div class="toolbar-right"><button class="primary-button" data-page="request_item">Request Item</button></div></div>
        <div class="panel"><div class="table-wrap"><table class="table"><thead><tr><th>Item</th><th>Category</th><th>Available Quantity</th><th>Condition</th><th>Action</th></tr></thead><tbody>
          ${stock.map((item) => `<tr><td>${escapeHTML(item.item)}</td><td>${escapeHTML(item.category)}</td><td>${escapeHTML(item.quantity)}</td><td>${escapeHTML(item.condition)}</td><td><button class="primary-button" data-action="start-hod-request" data-item="${escapeHTML(item.item)}">Request</button></td></tr>`).join('') || '<tr><td colspan="5"><div class="empty-state">No items are currently available in the central store.</div></td></tr>'}
        </tbody></table></div></div>
      </section>
    `;
  }

  function renderHodRequestForm() {
    const stock = getAvailableStoreStock();
    return `
      <section class="page-section">
        <div class="panel"><div class="panel-header"><div><h3>Request an Item</h3><p class="muted-note">The Store Director decides the request before stock is reserved or a shortage is sent to procurement.</p></div></div>
          <div class="modal-body"><form id="hodRequestForm"><div class="field-grid">
            <div class="field"><label for="hodRequestItem">Item</label><input id="hodRequestItem" name="itemName" list="hodStockItems" required placeholder="Choose or enter an item" /><datalist id="hodStockItems">${stock.map((item) => `<option value="${escapeHTML(item.item)}">Available: ${escapeHTML(item.quantity)}</option>`).join('')}</datalist></div>
            <div class="field"><label for="hodRequestQuantity">Quantity</label><input id="hodRequestQuantity" name="quantity" type="number" min="1" step="1" value="1" required /></div>
            <div class="field"><label for="hodRequestPurpose">Purpose and justification</label><input id="hodRequestPurpose" name="purpose" required /></div>
            <div class="field"><label for="hodRequestRequiredDate">Required Date (optional)</label><input id="hodRequestRequiredDate" name="requiredDate" type="date" /></div>
            <div class="field"><label for="hodRequestPriority">Priority</label><select id="hodRequestPriority" name="priority"><option>Medium</option><option>High</option><option>Low</option></select></div>
            <div class="field"><label for="hodRequestSpecification">Specification</label><input id="hodRequestSpecification" name="specification" placeholder="Model or key requirements" /></div>
            <div class="field" style="grid-column:1/-1"><label for="hodRequestRemarks">Remarks</label><textarea id="hodRequestRemarks" name="remarks"></textarea></div>
          </div><p class="muted-note">Requests are submitted to the Store Director. Stock is checked after approval; shortages are routed to procurement.</p><div class="toolbar-right" style="margin-top:18px"><button class="primary-button" type="submit">Submit Request</button></div></form></div>
        </div>
      </section>
    `;
  }

  function renderHodRequests() {
    const requests = app.state.requests.filter((request) => request.department === app.currentUser.department);
    return `
      <section class="page-section"><div class="toolbar"><div class="toolbar-left"><h3 style="margin:0;">My Department Requests</h3></div><div class="toolbar-right"><button class="primary-button" data-page="request_item">Request Item</button></div></div>
        <div class="panel"><div class="table-wrap"><table class="table"><thead><tr><th>Request ID</th><th>Item</th><th>Quantity</th><th>Date</th><th>Status</th><th>Timeline</th></tr></thead><tbody>
          ${requests.map((request) => `<tr><td>${escapeHTML(request.id)}</td><td>${escapeHTML(request.itemName || request.item)}</td><td>${escapeHTML(request.quantity)}</td><td>${escapeHTML(request.date || '—')}</td><td><span class="status-chip ${escapeHTML(String(request.status).toLowerCase().replace(/\s+/g, '-'))}">${escapeHTML(request.status)}</span></td><td><button class="ghost-button" data-action="view-request-timeline" data-request-id="${escapeHTML(request.id)}">View</button></td></tr>`).join('') || '<tr><td colspan="6"><div class="empty-state">No requests yet.</div></td></tr>'}
        </tbody></table></div></div>
      </section>
    `;
  }

  function renderDepartmentInventory() {
    const assets = getDepartmentAssets();
    return `
      <section class="page-section"><div class="toolbar"><div class="toolbar-left"><h3 style="margin:0;">${escapeHTML(app.currentUser.department)} Department Inventory</h3></div></div>
        <div class="panel"><div class="table-wrap"><table class="table"><thead><tr><th>Asset ID</th><th>Asset</th><th>Location</th><th>Status</th><th>Custodian</th></tr></thead><tbody>
          ${assets.map((asset) => `<tr><td>${escapeHTML(asset.id)}</td><td>${escapeHTML(asset.name)}</td><td>${escapeHTML(asset.location)}</td><td><span class="status-chip ${escapeHTML(asset.status.toLowerCase())}">${escapeHTML(asset.status)}</span></td><td>${escapeHTML(asset.custodian)}</td></tr>`).join('') || '<tr><td colspan="5"><div class="empty-state">No department assets found.</div></td></tr>'}
        </tbody></table></div></div>
      </section>
    `;
  }

  function renderUsersPage() {
    const users = app.state.users || [];
    return `
      <section class="page-section"><div class="toolbar"><div class="toolbar-left"><h3 style="margin:0;">Users & Roles</h3></div></div>
        <div class="panel"><div class="panel-header"><h3>Add User</h3></div><div class="modal-body"><form id="addUserForm"><div class="field-grid">
          <div class="field"><label>Name</label><input name="name" required /></div><div class="field"><label>Email / Employee ID</label><input name="email" required /></div>
          <div class="field"><label>Role</label><select name="role"><option>HOD</option><option>STORE MANAGER</option><option>STORE DIRECTOR</option><option>SUPER ADMIN</option></select></div>
          <div class="field"><label>Department</label><select name="department">${InventoryData.getDepartmentLabels().map((department) => `<option>${department}</option>`).join('')}</select></div>
        </div><div class="toolbar-right" style="margin-top:16px"><button class="primary-button" type="submit">Add User</button></div></form></div></div>
        <div class="panel"><div class="table-wrap"><table class="table"><thead><tr><th>Name</th><th>Email / ID</th><th>Role</th><th>Department</th><th>Status</th><th>Action</th></tr></thead><tbody>
          ${users.map((user) => `<tr><td>${escapeHTML(user.name)}</td><td>${escapeHTML(user.email)}</td><td>${escapeHTML(user.role)}</td><td>${escapeHTML(user.department)}</td><td>${user.active ? 'Active' : 'Deactivated'}</td><td><button class="ghost-button" data-action="edit-user" data-user-id="${escapeHTML(user.id)}">Edit</button> <button class="ghost-button" data-action="toggle-user" data-user-id="${escapeHTML(user.id)}">${user.active ? 'Deactivate' : 'Activate'}</button></td></tr>`).join('')}
        </tbody></table></div></div>
      </section>
    `;
  }

  function renderAuditPage() {
    if (app.currentUser?.role !== 'SUPER ADMIN') {
      return '<section class="page-section"><div class="empty-state">This page is not available for your role.</div></section>';
    }
    const entries = app.state.auditLog || [];
    return `
      <section class="page-section">
        <div class="toolbar"><div class="toolbar-left"><h3 style="margin:0;">Prototype Audit Log</h3></div></div>
        <p class="muted-note">Browser-stored demonstration history only. This log is editable with browser tools and is not tamper-resistant or suitable as an official audit record.</p>
        <div class="panel"><div class="table-wrap"><table class="table"><thead><tr><th>Timestamp</th><th>Actor</th><th>Role</th><th>Action</th><th>Record</th><th>Details</th></tr></thead><tbody>
          ${entries.map((entry) => `<tr><td>${escapeHTML(new Date(entry.timestamp).toLocaleString())}</td><td>${escapeHTML(entry.actor)}</td><td>${escapeHTML(entry.role)}</td><td>${escapeHTML(entry.action)}</td><td>${escapeHTML(entry.recordType)} ${escapeHTML(entry.recordId)}</td><td>${escapeHTML(JSON.stringify(entry.details || {}))}</td></tr>`).join('') || '<tr><td colspan="6"><div class="empty-state">No recorded actions yet.</div></td></tr>'}
        </tbody></table></div></div>
      </section>
    `;
  }

  function renderUserEditModal(userId) {
    const user = (app.state.users || []).find((item) => item.id === userId);
    if (!user) return '';
    return `
      <div class="modal-header"><h3>Edit User</h3><button class="close-button" data-action="close-modal" aria-label="Close">×</button></div>
      <div class="modal-body"><form id="editUserForm" data-user-id="${escapeHTML(user.id)}"><div class="field-grid">
        <div class="field"><label>Name</label><input name="name" value="${escapeHTML(user.name)}" required /></div>
        <div class="field"><label>Email / Employee ID</label><input name="email" value="${escapeHTML(user.email)}" required /></div>
        <div class="field"><label>Role</label><select name="role">${['SUPER ADMIN', 'STORE DIRECTOR', 'STORE MANAGER', 'HOD'].map((role) => `<option ${normalizeRole(user.role) === role ? 'selected' : ''}>${role}</option>`).join('')}</select></div>
        <div class="field"><label>Department</label><select name="department">${InventoryData.getDepartmentLabels().map((department) => `<option ${user.department === department ? 'selected' : ''}>${department}</option>`).join('')}</select></div>
      </div><div class="toolbar-right" style="margin-top:16px"><button class="primary-button" type="submit">Save Changes</button></div></form></div>
    `;
  }

  function renderAssetEditModal(assetId) {
    const asset = app.state.assets.find((item) => item.id === assetId);
    if (!asset) return '';
    const manager = app.currentUser?.role === 'STORE MANAGER';
    return `
      <div class="modal-header"><h3>Edit Asset</h3><button class="close-button" data-action="close-modal" aria-label="Close">×</button></div>
      <div class="modal-body"><form id="editAssetForm" data-asset-id="${escapeHTML(asset.id)}"><div class="field-grid">
        <div class="field"><label>Asset Name</label><input name="name" value="${escapeHTML(asset.name)}" required /></div>
        <div class="field"><label>Department</label><input name="department" value="${manager ? 'Central Store' : escapeHTML(asset.department)}" ${manager ? 'readonly' : ''} /></div>
        <div class="field"><label>Location</label><input name="location" value="${manager ? 'Central Store' : escapeHTML(asset.location)}" ${manager ? 'readonly' : ''} /></div>
        <div class="field"><label>Quantity</label><input name="quantity" type="number" min="1" value="${asset.quantity || 1}" /></div>
        <div class="field"><label>Condition</label><select name="condition">${['Good', 'Fair', 'Needs Service', 'Critical'].map((condition) => `<option ${asset.condition === condition ? 'selected' : ''}>${condition}</option>`).join('')}</select></div>
      </div><div class="toolbar-right" style="margin-top:16px"><button class="primary-button" type="submit">Save Asset</button></div></form></div>
    `;
  }

  function renderAssetTransferModal(assetId) {
    const asset = app.state.assets.find((item) => item.id === assetId);
    if (!asset) return '';
    return `
      <div class="modal-header"><h3>Transfer Asset</h3><button class="close-button" data-action="close-modal" aria-label="Close">×</button></div>
      <div class="modal-body"><form id="transferAssetForm" data-asset-id="${escapeHTML(asset.id)}"><div class="field-grid">
        <div class="field"><label>Asset</label><input value="${escapeHTML(asset.id)} — ${escapeHTML(asset.name)}" readonly /></div>
        <div class="field"><label>Destination Department</label><select name="department">${InventoryData.getDepartmentLabels().map((department) => `<option>${department}</option>`).join('')}</select></div>
        <div class="field"><label>Destination Location</label><input name="location" required placeholder="Building, room or lab" /></div>
        <div class="field"><label>Purpose</label><input name="purpose" required /></div>
      </div><div class="toolbar-right" style="margin-top:16px"><button class="primary-button" type="submit">Confirm Transfer</button></div></form></div>
    `;
  }

  function renderMovementPage() {
    const state = app.state;
    return `
      <section class="page-section">
        <div class="toolbar">
          <div class="toolbar-left"><h3 style="margin:0;">Asset Movement</h3></div>
          <div class="toolbar-right"><button class="secondary-button" data-action="export-movement">Export</button></div>
        </div>

        <div class="panel">
          <div class="modal-body">
            <div class="timeline">
              ${state.movements.slice(0, 10).map((move) => `
                <div class="timeline-item">
                  <div class="line" style="background:${move.status === 'Issued' ? 'var(--blue)' : 'var(--green)'};"></div>
                  <div class="content">
                    <strong>${move.timestamp ? new Date(move.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : move.time}</strong>
                    <span>${move.from} → ${move.to}</span>
                    <span>${move.movementType} to ${move.person}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function renderCentralStorePage() {
    const state = app.state;
    const storeAssets = state.assets.filter((asset) => asset.location === 'Central Store' && !asset.archived);
    const today = new Date().toISOString().slice(0, 10);
    const todayMovements = state.movements.filter((movement) => (movement.timestamp || '').slice(0, 10) === today);
    const zones = [
      { code: 'A', name: 'Electronics', categories: ['IT Equipment', 'Audio/Video', 'Networking', 'Electrical', 'Surveillance'] },
      { code: 'B', name: 'Furniture', categories: ['Furniture'] },
      { code: 'C', name: 'Stationery', categories: ['Stationery'] },
      { code: 'D', name: 'Maintenance', categories: ['Maintenance'] },
      { code: 'E', name: 'Equipment', categories: ['Laboratory', 'Sports', 'Office Equipment'] }
    ].map((zone) => ({ ...zone, items: storeAssets.filter((asset) => zone.categories.includes(asset.category)).length }));

    return `
      <section class="page-section">
        <div class="grid-3">
          <div class="card-mini"><h4>Total Items</h4><p class="stat">${state.assets.length}</p></div>
          <div class="card-mini"><h4>Available</h4><p class="stat">${state.assets.filter((item) => item.status === 'Available').length}</p></div>
          <div class="card-mini"><h4>Issued Today</h4><p class="stat">${state.movements.filter((item) => item.status === 'Issued').length}</p></div>
        </div>

        <div class="store-layout" style="margin-top:20px;">
          <div class="panel">
            <div class="panel-header"><h3>Smart Central Store</h3></div>
            <div class="warehouse-visual">
              <div class="warehouse-grid">
                ${zones.map((zone) => `
                  <button class="zone-card ${app.state.ui.selectedZone === zone.code ? 'active' : ''}" data-action="select-zone" data-zone="${zone.code}">
                    <div class="zone-card-head"><span>Zone ${zone.code}</span><span>${zone.items}</span></div>
                    <strong>${zone.name}</strong>
                    <div class="zone-items">${zone.items} items</div>
                  </button>
                `).join('')}
              </div>
            </div>
          </div>

          <div class="activity-card">
            <h3>Today's Store Activity</h3>
            <ul class="activity-list">
              <li><span>Received</span><strong>${todayMovements.filter((item) => item.movementType === 'Receipt' || item.movementType === 'Registration').length}</strong></li>
              <li><span>Issued</span><strong>${todayMovements.filter((item) => item.movementType === 'Issue').length}</strong></li>
              <li><span>Returned</span><strong>${todayMovements.filter((item) => item.movementType === 'Return').length}</strong></li>
              <li><span>Transferred</span><strong>${todayMovements.filter((item) => item.movementType === 'Transfer').length}</strong></li>
            </ul>
          </div>
        </div>
        <div class="panel">
          <div class="panel-header"><h3>Store Monitoring</h3><span class="badge-pill info">SIMULATED</span></div>
          <div class="modal-body"><p class="muted-note">Camera, RFID and AI monitoring are frontend simulations, not live security integrations.</p>
            <div class="status-row">
              <div class="mini-status"><span class="traffic-dot"></span> Store Cameras: Online</div>
              <div class="mini-status"><span class="traffic-dot"></span> RFID Gateway: Online</div>
              <div class="mini-status"><span class="traffic-dot"></span> AI Engine: Simulated</div>
              <div class="mini-status"><span class="traffic-dot"></span> Inventory Database: Connected</div>
            </div>
          </div>
        </div>
        <div class="panel"><div class="panel-header"><h3>RFID & Store Access Events</h3><span class="badge-pill info">SIMULATED</span></div>
          <div class="table-wrap"><table class="table"><thead><tr><th>Time</th><th>Event</th><th>Severity</th></tr></thead><tbody>
            ${state.surveillanceEvents.slice(0, 6).map((event) => `<tr><td>${event.time}</td><td>${event.text}</td><td><span class="badge-pill ${event.severity === 'warning' ? 'warning' : 'success'}">${event.severity}</span></td></tr>`).join('')}
          </tbody></table></div>
        </div>
      </section>
    `;
  }

  function renderMaintenancePage() {
    const state = app.state;
    const total = state.maintenance.length;
    const upcoming = state.maintenance.filter((item) => item.status === 'Scheduled').length;
    const warrantyExpiring = state.assets.filter((asset) => asset.warranty.includes('36 months')).length;
    const amcExpiring = state.assets.filter((asset) => asset.amc.includes('Expired')).length;

    return `
      <section class="page-section">
        <div class="grid-3">
          <div class="card-mini"><h4>Assets Under Maintenance</h4><p class="stat">${state.assets.filter((asset) => asset.status === 'Maintenance').length}</p></div>
          <div class="card-mini"><h4>Upcoming Maintenance</h4><p class="stat">${upcoming}</p></div>
          <div class="card-mini"><h4>Warranty Expiring</h4><p class="stat">${warrantyExpiring}</p></div>
        </div>

        <div class="panel" style="margin-top:20px;">
          <div class="toolbar">
            <div class="toolbar-left"><h3 style="margin:0;">Maintenance Work Orders</h3></div>
            <div class="toolbar-right"><button class="primary-button" data-action="new-maintenance-request">+ Maintenance Request</button></div>
          </div>
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr><th>Asset</th><th>Issue</th><th>Department</th><th>Reported Date</th><th>Assigned Vendor</th><th>Expected Completion</th><th>Status</th></tr>
              </thead>
              <tbody>
                ${state.maintenance.map((item) => `
                  <tr>
                    <td>${item.asset}</td>
                    <td>${item.issue}</td>
                    <td>${item.department}</td>
                    <td>${item.reportedDate}</td>
                    <td>${item.assignedVendor}</td>
                    <td>${item.expectedCompletion}</td>
                    <td><span class="badge-pill ${item.status === 'In Progress' ? 'warning' : 'info'}">${item.status}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    `;
  }

  function renderVendorsPage() {
    const state = app.state;
    return `
      <section class="page-section">
        <div class="panel">
          <div class="toolbar">
            <div class="toolbar-left"><h3 style="margin:0;">Vendor Management</h3></div>
            <div class="toolbar-right"><button class="primary-button" data-action="new-vendor">+ Add Vendor</button></div>
          </div>
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr><th>Vendor Name</th><th>Contact Person</th><th>Phone</th><th>Email</th><th>Category</th><th>Total Orders</th><th>Total Purchase Value</th><th>Rating</th><th>Status</th></tr>
              </thead>
              <tbody>
                ${state.vendors.map((vendor) => `
                  <tr>
                    <td>${vendor.name}</td>
                    <td>${vendor.contactPerson}</td>
                    <td>${vendor.phone}</td>
                    <td>${vendor.email}</td>
                    <td>${vendor.category}</td>
                    <td>${vendor.totalOrders}</td>
                    <td>₹${vendor.totalPurchaseValue.toLocaleString('en-IN')}</td>
                    <td>${vendor.rating}</td>
                    <td><span class="badge-pill success">${vendor.status}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    `;
  }

  function renderDepartmentsPage() {
    const departments = getDepartmentSummaries();
    return `
      <section class="page-section">
        <div class="grid-3">
          ${departments.map((department) => `
            <button class="card-mini" data-action="view-department" data-department="${escapeHTML(department.name)}" style="text-align:left; border:1px solid var(--border); background:var(--panel);">
              <h4>${escapeHTML(department.name)}</h4>
              <p class="stat">${department.totalAssets}</p>
              <div class="detail-grid" style="margin-top:8px;"> 
                <div class="detail-item"><span class="inline-label">Issued</span><strong>${department.issued}</strong></div>
                <div class="detail-item"><span class="inline-label">Available</span><strong>${department.available}</strong></div>
                <div class="detail-item"><span class="inline-label">Maintenance</span><strong>${department.maintenance}</strong></div>
                <div class="detail-item"><span class="inline-label">Pending</span><strong>${department.pendingRequests}</strong></div>
              </div>
            </button>
          `).join('')}
        </div>
      </section>
    `;
  }

  function getReportTypesForRole(role = app.currentUser?.role) {
    if (role === 'STORE MANAGER') {
      return ['Inventory Report', 'Asset Movement Report', 'Maintenance Report'];
    }
    if (role === 'STORE DIRECTOR') {
      return ['Procurement Report', 'Request Workflow Report'];
    }
    if (role === 'SUPER ADMIN') {
      return [
        'Inventory Report',
        'Department-wise Inventory',
        'Procurement Report',
        'Asset Movement Report',
        'Maintenance Report',
        'Missing Asset Report',
        'Vendor Report',
        'Asset Utilization Report'
      ];
    }
    return [];
  }

  function renderReportsPage() {
    const reportTypes = getReportTypesForRole();
    if (!reportTypes.length) {
      return '<section class="page-section"><div class="panel"><div class="modal-body">Reports are not available for your role.</div></div></section>';
    }
    const defaultReport = reportTypes[0];

    return `
      <section class="page-section">
        <div class="toolbar">
          <div class="toolbar-left"><h3 style="margin:0;">Reports Dashboard</h3></div>
          <div class="toolbar-right">
            <button class="primary-button" data-action="generate-report" data-report="${defaultReport}">Generate Report</button>
            <button class="secondary-button" data-action="export-csv" data-report="${defaultReport}">Export CSV</button>
          </div>
        </div>

        <div class="grid-3">
          ${reportTypes.map((report) => `
            <div class="card-mini">
              <h4>${report}</h4>
              <div class="toolbar-right" style="margin-top:12px;justify-content:flex-start;">
                <button class="ghost-button" data-action="generate-report" data-report="${report}">Generate</button>
                <button class="secondary-button" data-action="export-csv" data-report="${report}">CSV</button>
              </div>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  }

  function renderSettingsPage() {
    const settings = app.state.settings;
    return `
      <section class="page-section">
        <div class="panel">
          <div class="panel-header"><h3>University Settings</h3></div>
          <div class="modal-body">
            <form id="systemSettingsForm"><div class="field-grid">
              <div class="field"><label>University Information</label><input name="universityName" value="${settings.universityName}" /></div>
              <div class="field"><label>Inventory System Owner</label><input name="systemOwner" value="${settings.systemOwner}" /></div>
              <div class="field"><label>Departments</label><input name="departments" value="${settings.departments}" /></div>
              <div class="field"><label>Locations</label><input name="locations" value="${settings.locations}" /></div>
              <div class="field"><label>Asset Categories</label><input name="assetCategories" value="${settings.assetCategories}" /></div>
              <div class="field"><label>Roles & Permissions</label><input value="Admin, Store Manager, HOD" readonly /></div>
              <div class="field"><label>Notification Settings</label><select name="notificationSettings">${['All workflow alerts', 'Critical only', 'Disabled'].map((value) => `<option ${settings.notificationSettings === value ? 'selected' : ''}>${value}</option>`).join('')}</select></div>
              <div class="field"><label>Backup Settings</label><select name="backupFrequency">${['Daily', 'Weekly', 'Manual'].map((value) => `<option ${settings.backupFrequency === value ? 'selected' : ''}>${value}</option>`).join('')}</select></div>
              <div class="field"><label>Review Cycle</label><select name="reviewCycle">${['Monthly', 'Quarterly', 'Annual'].map((value) => `<option ${settings.reviewCycle === value ? 'selected' : ''}>${value}</option>`).join('')}</select></div>
              <div class="field"><label>Inventory Policy</label><input name="inventoryPolicy" value="${settings.inventoryPolicy}" /></div>
            </div><div class="toolbar-right" style="margin-top:16px"><button class="primary-button" type="submit">Save Settings</button></div></form>
          </div>
        </div>
        <div class="grid-3" style="margin-top:18px;">
          <div class="card-mini"><h4>User Management</h4><p class="stat">${(app.state.users || []).length}</p></div>
          <div class="card-mini"><h4>Roles & Permissions</h4><p class="stat">3</p></div>
          <div class="card-mini"><h4>Backup</h4><p class="stat">${settings.backupFrequency}</p></div>
        </div>
      </section>
    `;
  }

  function showModalForPage(content) {
    const modal = document.getElementById('requestModalContent');
    const backdrop = document.getElementById('requestModalBackdrop');
    if (!modal || !backdrop) return;
    modal.innerHTML = content;
    backdrop.classList.remove('hidden');
    app.requestModalOpen = true;
  }

  function closeModal() {
    const backdrop = document.getElementById('requestModalBackdrop');
    if (backdrop) backdrop.classList.add('hidden');
    app.requestModalOpen = false;
  }

  function openAssetDrawer(assetId) {
    const drawer = document.getElementById('assetDrawerContent');
    const backdrop = document.getElementById('assetDrawerBackdrop');
    if (!drawer || !backdrop) return;
    drawer.innerHTML = InventoryPage.renderAssetDetail(assetId);
    backdrop.classList.remove('hidden');
    app.drawerOpen = true;
    refreshIcons();

    requestAnimationFrame(() => {
      const qrHost = document.getElementById(`assetQr_${assetId}`);
      if (qrHost) {
        renderQrCode(qrHost, assetId);
      }
    });
  }

  function closeAssetDrawer() {
    const backdrop = document.getElementById('assetDrawerBackdrop');
    if (backdrop) backdrop.classList.add('hidden');
    app.drawerOpen = false;
  }

  function renderQrCode(target, value) {
    if (!window.qrcode || !target) return;
    const qr = window.qrcode(0, 'M');
    qr.addData(value);
    qr.make();
    target.innerHTML = qr.createImgTag(6, 1);
  }

  function exportCsv(filename, rows) {
    const csv = rows.map((row) => row.map((cell) => {
      const value = String(cell ?? '');
      const safeValue = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
      return `"${safeValue.replace(/"/g, '""')}"`;
    }).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function generateReportCsv(reportType) {
    const state = app.state;
    const isStoreManager = app.currentUser?.role === 'STORE MANAGER';
    if (!getReportTypesForRole().includes(reportType)) return [];
    if (reportType === 'Inventory Report') {
      return [
        ['Asset ID', 'Asset Name', 'Department', 'Location', 'Status', 'Condition'],
        ...state.assets.filter((asset) => !isStoreManager || asset.location === 'Central Store').map((asset) => [asset.id, asset.name, asset.department, asset.location, asset.status, asset.condition])
      ];
    }

    if (reportType === 'Department-wise Inventory') {
      return [
        ['Department', 'Total Assets', 'Available', 'Issued', 'Maintenance'],
        ...getDepartmentSummaries().map((dept) => [dept.name, dept.totalAssets, dept.available, dept.issued, dept.maintenance])
      ];
    }

    if (reportType === 'Procurement Report') {
      return [
        ['Request ID', 'Department', 'Item', 'Quantity', 'Status'],
        ...state.procurementRequests.map((request) => [request.id, request.department, request.itemName, request.quantity, request.status])
      ];
    }

    if (reportType === 'Request Workflow Report') {
      return [
        ['Request ID', 'Request Type', 'Department', 'Item', 'Quantity', 'Requested By', 'Status', 'Date'],
        ...(state.requests || []).map((request) => [
          request.id,
          request.requestType || 'Request',
          request.department,
          request.itemName || request.item,
          request.quantity,
          request.requestedBy,
          request.status,
          request.date || ''
        ])
      ];
    }

    if (reportType === 'Asset Movement Report') {
      return [
        ['Asset ID', 'Asset', 'From', 'To', 'Person', 'Status'],
        ...state.movements.filter((movement) => !isStoreManager || movement.from === 'Central Store' || movement.to === 'Central Store').map((movement) => [movement.assetId, movement.asset, movement.from, movement.to, movement.person, movement.status])
      ];
    }

    if (reportType === 'Maintenance Report') {
      return [
        ['Asset', 'Issue', 'Department', 'Status'],
        ...state.maintenance.filter((item) => !isStoreManager || state.assets.some((asset) => asset.id === item.assetId && asset.location === 'Central Store')).map((item) => [item.asset, item.issue, item.department, item.status])
      ];
    }

    if (reportType === 'Missing Asset Report') {
      return [
        ['Asset ID', 'Asset Name', 'Department', 'Location', 'Status'],
        ...state.assets.filter((asset) => asset.status === 'Missing').map((asset) => [asset.id, asset.name, asset.department, asset.location, asset.status])
      ];
    }

    if (reportType === 'Vendor Report') {
      return [
        ['Vendor Name', 'Category', 'Total Orders', 'Total Purchase Value', 'Rating'],
        ...state.vendors.map((vendor) => [vendor.name, vendor.category, vendor.totalOrders, vendor.totalPurchaseValue, vendor.rating])
      ];
    }

    return [
      ['Asset ID', 'Asset Name', 'Status', 'Current Custodian'],
      ...state.assets.map((asset) => [asset.id, asset.name, asset.status, asset.custodian])
    ];
  }

  function getRequestAssetCode(request) {
    const assetType = request.itemName.toLowerCase();
    const codeMap = {
      laptop: 'LAP',
      desktop: 'PC',
      projector: 'PROJ',
      printer: 'PRN',
      chair: 'CHR',
      table: 'TAB',
      switch: 'NET',
      camera: 'CAM',
      lab: 'LAB',
      tool: 'TOOL',
      ups: 'ELEC',
      stationer: 'STN',
      audio: 'AUD'
    };

    let code = 'STN';
    Object.keys(codeMap).forEach((key) => {
      if (assetType.includes(key)) code = codeMap[key];
    });
    return code;
  }

  function registerReceivedAssets(request, quantity, vendorName, receivedDate, condition, receivedBy) {
    const assets = [];
    const assetCode = getRequestAssetCode(request);
    for (let unit = 0; unit < quantity; unit += 1) {
      const index = app.state.assets.length + 1;
      let assetId = InventoryData.generateAssetId(assetCode, index);
      let nextIndex = index;
      while (app.state.assets.some((asset) => asset.id === assetId)) {
        nextIndex += 1;
        assetId = InventoryData.generateAssetId(assetCode, nextIndex);
      }
      const asset = {
        id: assetId,
        name: request.itemName,
        category: request.itemCategory || 'IT Equipment',
        itemType: request.itemName,
        brand: vendorName.split(' ')[0],
        model: request.itemName,
        serialNumber: `${assetCode}-${String(1000 + nextIndex)}`,
        qrCode: assetId,
        rfidTag: generateUniqueRFID(),
        department: request.department,
        location: 'Central Store',
        custodian: 'Central Store Manager',
        status: ['Needs Service', 'Critical'].includes(condition) ? 'Maintenance' : 'Available',
        condition,
        purchaseDate: receivedDate,
        vendor: vendorName,
        purchaseCost: Number(request.budget || 0),
        warranty: '36 months',
        amc: 'Active AMC',
        quantity: 1,
        image: null,
        movementHistory: [{ date: receivedDate, event: 'Vendor → Central Store', details: 'Goods received and uniquely tagged' }],
        maintenanceHistory: [],
        procurementId: request.id,
        lastUpdated: new Date().toISOString()
      };
      app.state.assets.unshift(asset);
      app.state.movements.unshift({
        id: `MOV-${Date.now()}-${unit}`,
        assetId: asset.id,
        asset: asset.name,
        from: 'Vendor',
        to: 'Central Store',
        person: receivedBy,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        timestamp: new Date().toISOString(),
        status: 'Received',
        movementType: 'Receipt'
      });
      assets.push(asset);
    }
    return assets;
  }

  function createAssetFromRequest(request) {
    return registerReceivedAssets(
      request,
      Number(request.quantity) || 1,
      request.vendor || 'Dell Technologies',
      new Date().toISOString().slice(0, 10),
      'Good',
      'Central Store Manager'
    )[0];
  }

  function syncRequestList() {
    app.state.requests = [
      ...app.state.procurementRequests.map((request) => ({ ...request, requestType: 'Purchase Request' })),
      ...(app.state.issueRequests || []).map((request) => ({ ...request, requestType: 'Issue Request' }))
    ];
  }

  function receiveShipment(requestId, formData) {
    if (!['SUPER ADMIN', 'STORE MANAGER'].includes(app.currentUser?.role)) return;
    const request = app.state.procurementRequests.find((item) => item.id === requestId);
    if (!request) return;
    if (!['Ordered', 'Partially Received'].includes(request.status)) {
      showToast('Goods can be received only after the order is marked Ordered.', 'error');
      return;
    }

    request.receipts ||= [];
    const receiptId = String(formData.get('receiptId') || `GRN-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    if (request.receipts.some((receipt) => receipt.id === receiptId)) {
      showToast('This receipt has already been recorded.', 'error');
      return;
    }
    const receivedQuantity = Number(formData.get('quantityReceived'));
    const orderedQuantity = Number(request.orderedQuantity || request.quantity);
    const previouslyReceived = Number(request.receivedQuantity) || 0;
    const outstandingQuantity = orderedQuantity - previouslyReceived;
    if (!Number.isInteger(receivedQuantity) || receivedQuantity < 1 || receivedQuantity > outstandingQuantity) {
      showToast(`Enter a whole quantity from 1 to ${Math.max(0, outstandingQuantity)}.`, 'error');
      return;
    }
    const vendorName = String(formData.get('vendor') || request.vendor || '').trim();
    const receivedDate = String(formData.get('receivedDate') || '').trim();
    const receivedBy = String(formData.get('receivedBy') || '').trim();
    const condition = String(formData.get('condition') || 'Good');
    if (!vendorName || !receivedDate || !receivedBy) {
      showToast('Vendor, received date, and received-by fields are required.', 'error');
      return;
    }

    const totalReceived = previouslyReceived + receivedQuantity;
    request.status = totalReceived === orderedQuantity ? 'Received' : 'Partially Received';
    request.vendor = vendorName;
    request.receivedDate = receivedDate;
    request.receivedBy = receivedBy;
    request.orderedQuantity = orderedQuantity;
    request.receivedQuantity = totalReceived;
    request.condition = condition;
    const receipt = {
      id: receiptId,
      quantity: receivedQuantity,
      vendor: vendorName,
      receivedDate,
      receivedBy,
      condition,
      remarks: String(formData.get('remarks') || '').trim()
    };
    request.receipts.push(receipt);
    request.timeline = [...(request.timeline || []), { label: `${receivedQuantity} received; ${orderedQuantity - totalReceived} outstanding`, date: receivedDate }];

    const generatedAssets = registerReceivedAssets(request, receivedQuantity, vendorName, receivedDate, condition, receivedBy);
    const generatedAsset = generatedAssets[0];
    recordAudit('Goods received', 'Purchase request', request.id, { receiptId: receipt.id, quantity: receivedQuantity, totalReceived, orderedQuantity });
    app.state.notifications = [`${receivedQuantity} item${receivedQuantity === 1 ? '' : 's'} received and uniquely registered in central inventory.`, ...app.state.notifications];
    syncRequestList();
    save();
    closeModal();
    renderPage();
    showToast(`${receivedQuantity} asset${receivedQuantity === 1 ? '' : 's'} received. ${orderedQuantity - totalReceived} outstanding. First asset: ${generatedAsset.id}.`, 'success');
  }

  function addProcessRequest(formData) {
    if (app.currentUser?.role !== 'SUPER ADMIN') return;
    const qty = Number(formData.get('quantity'));
    const budget = Number(formData.get('budget'));

    if (!String(formData.get('itemName') || '').trim()
      || !String(formData.get('requestedBy') || '').trim()
      || !String(formData.get('purpose') || '').trim()
      || !Number.isInteger(qty) || qty < 1
      || !Number.isFinite(budget) || budget < 0) {
      showToast('Request cannot be submitted without required fields.', 'error');
      return;
    }

    const request = {
      id: `PR-2026-${String(app.state.procurementRequests.length + 1).padStart(3, '0')}`,
      department: formData.get('department') || 'CSE',
      itemCategory: formData.get('itemCategory') || 'IT Equipment',
      itemName: formData.get('itemName'),
      quantity: qty,
      requestedBy: formData.get('requestedBy'),
      date: new Date().toISOString().slice(0, 10),
      requiredDate: formData.get('requiredDate'),
      priority: formData.get('priority') || 'Medium',
      status: 'Pending Approval',
      purpose: formData.get('purpose') || 'Academic operations requirement',
      budget: budget || 0,
      description: formData.get('description') || 'Procurement request',
      attachments: formData.get('attachment') ? ['attachment.pdf'] : ['No attachment'],
      approvalStage: 'Pending',
      requestType: 'Purchase Request'
    };

    app.state.procurementRequests.unshift(request);
    syncRequestList();
    save();
    closeModal();
    renderPage();
    showToast(`Purchase request ${request.id} created successfully.`, 'success');
  }

  function addHodRequest(formData) {
    if (app.currentUser?.role !== 'HOD') return;
    const itemName = String(formData.get('itemName') || '').trim();
    const quantity = Number(formData.get('quantity'));
    const purpose = String(formData.get('purpose') || '').trim();
    if (!itemName || !purpose || !Number.isInteger(quantity) || quantity < 1) {
      showToast('Enter an item, a positive whole quantity, and a purpose/justification.', 'error');
      return;
    }
    const stock = getAvailableStoreStock().find((item) => item.item.toLowerCase() === itemName.toLowerCase());
    const availableQuantity = stock?.quantity || 0;
    const requiredFields = {
      department: app.currentUser.department,
      requestedBy: app.currentUser.name,
      itemName,
      quantity,
      purpose,
      requiredDate: formData.get('requiredDate') || '',
      date: new Date().toISOString().slice(0, 10),
      priority: formData.get('priority') || 'Medium',
      specification: formData.get('specification') || '',
      remarks: formData.get('remarks') || '',
      availability: availableQuantity,
      justification: purpose
    };

    const requestNumber = app.state.issueRequests.length + 1;
    const request = {
      ...requiredFields,
      id: `IR-${new Date().getFullYear()}-${String(requestNumber).padStart(3, '0')}`,
      requestId: `IR-${new Date().getFullYear()}-${String(requestNumber).padStart(3, '0')}`,
      item: itemName,
      itemName,
      itemCategory: stock?.category || 'General Equipment',
      requestType: 'Issue Request',
      status: 'Pending Approval',
      timeline: [{ label: 'Submitted; awaiting Store Director decision', date: requiredFields.date }],
      approvalHistory: []
    };
    app.state.issueRequests.unshift(request);
    recordAudit('Request submitted', 'Inventory request', request.id, { department: request.department, itemName, quantity });

    syncRequestList();
    save();
    showToast(`${request.id} submitted to the Store Director for approval.`, 'success');
    setPage('my_requests');
  }

  function getRequestById(requestId) {
    return app.state.issueRequests.find((request) => request.id === requestId || request.requestId === requestId)
      || app.state.procurementRequests.find((request) => request.id === requestId || request.requestId === requestId);
  }

  function decideRequest(requestId, status, reason) {
    const request = getRequestById(requestId);
    const result = InventoryWorkflow.applyStoreDirectorDecision(app.state, request, app.currentUser, status, reason);
    if (!result.ok) {
      showToast(result.error, 'error');
      return;
    }
    if (app.state.procurementRequests.some((item) => item.id === requestId)) {
      const procurementRequest = app.state.procurementRequests.find((item) => item.id === requestId);
      if (procurementRequest) {
        procurementRequest.status = status;
        procurementRequest.approvalStage = status;
        procurementRequest.decision = result.approval;
      }
    }
    recordAudit(`Request ${status.toLowerCase()}`, 'Inventory request', requestId, result.approval);
    syncRequestList();
    save();
    renderPage();
    showToast(`${requestId} ${status.toLowerCase()} by Store Director.`, status === 'Approved' ? 'success' : 'error');
  }

  function addAsset(formData) {
    if (!['SUPER ADMIN', 'STORE MANAGER'].includes(app.currentUser?.role)) return;
    const name = formData.get('name');
    const quantity = Number(formData.get('quantity')) || 1;
    const purchaseCost = Number(formData.get('purchaseCost')) || 0;

    if (!String(name || '').trim() || !Number.isInteger(quantity) || quantity < 1 || !Number.isFinite(purchaseCost) || purchaseCost < 0) {
      showToast('Enter an asset name, a positive whole quantity, and a non-negative cost.', 'error');
      return;
    }

    const assetId = formData.get('assetId') || `SU-${formData.get('category').slice(0, 3).toUpperCase()}-${String(app.state.assets.length + 1).padStart(4, '0')}`;
    if (app.state.assets.some((asset) => asset.id === assetId)) {
      showToast(`Asset ID ${assetId} is already in use.`, 'error');
      return;
    }
    const serialNumber = String(formData.get('serialNumber') || `${assetId}-SN`).trim();
    if (app.state.assets.some((asset) => asset.serialNumber === serialNumber)) {
      showToast(`Serial number ${serialNumber} is already assigned to another asset.`, 'error');
      return;
    }
    const asset = {
      id: assetId,
      name: String(name).trim(),
      category: formData.get('category') || 'IT Equipment',
      itemType: formData.get('brand') || 'Asset',
      brand: formData.get('brand') || 'Unknown',
      model: formData.get('model') || 'Model',
      serialNumber,
      qrCode: assetId,
      rfidTag: generateUniqueRFID(),
      department: app.currentUser?.role === 'STORE MANAGER' ? 'Central Store' : formData.get('department') || 'Central Store',
      location: app.currentUser?.role === 'STORE MANAGER' ? 'Central Store' : formData.get('location') || 'Central Store',
      custodian: 'Central Store',
      status: InventoryWorkflow.isServiceableAsset({ condition: formData.get('condition') || 'Good' }) ? 'Available' : 'Maintenance',
      condition: formData.get('condition') || 'Good',
      purchaseDate: formData.get('purchaseDate') || new Date().toISOString().slice(0, 10),
      vendor: formData.get('vendor') || 'Dell Technologies',
      purchaseCost,
      warranty: formData.get('warranty') || '36 months',
      amc: 'Active AMC',
      quantity,
      image: null,
      movementHistory: [{ date: new Date().toISOString().slice(0, 10), event: 'Vendor → Central Store', details: 'Asset registered' }],
      maintenanceHistory: [],
      procurementId: null,
      lastUpdated: new Date().toISOString()
    };

    app.state.assets.unshift(asset);
    recordAudit('Asset registered', 'Asset', asset.id, { quantity, department: asset.department, location: asset.location });
    app.state.movements.unshift({
      id: `MOV-${Date.now()}`,
      assetId: asset.id,
      asset: asset.name,
      from: 'Vendor',
      to: 'Central Store',
      person: 'Store Manager',
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      timestamp: new Date().toISOString(),
      status: 'Received',
      movementType: 'Registration'
    });

    save();
    closeModal();
    renderPage();
    showToast(`Asset ${asset.id} added successfully.`, 'success');
  }

  function recordAssetMovement(asset, from, to, movementType, purpose) {
    const timestamp = new Date().toISOString();
    const date = timestamp.slice(0, 10);
    asset.movementHistory.unshift({ date, event: `${from} → ${to}`, details: purpose });
    app.state.movements.unshift({
      id: `MOV-${Date.now()}`,
      assetId: asset.id,
      asset: asset.name,
      from,
      to,
      person: app.currentUser.name,
      purpose,
      time: new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      timestamp,
      status: asset.status,
      movementType
    });
  }

  function canRemoveUsableStock(asset, proposedAsset) {
    if (!InventoryWorkflow.isUsableStoreAsset(asset)) return true;
    const item = asset.itemType || asset.category;
    const existingQuantity = Number(asset.quantity) || 1;
    const proposedQuantity = InventoryWorkflow.isUsableStoreAsset(proposedAsset)
      ? Math.max(0, Number(proposedAsset.quantity) || 1)
      : 0;
    const removedQuantity = Math.max(0, existingQuantity - proposedQuantity);
    return InventoryWorkflow.getAvailableQuantity(app.state.assets, app.state.reservations, item) >= removedQuantity;
  }

  function generateUniqueRFID() {
    let tag = InventoryData.generateRFID();
    while (app.state.assets.some((asset) => asset.rfidTag === tag)) {
      tag = InventoryData.generateRFID();
    }
    return tag;
  }

  function manageAsset(assetId, action) {
    if (!['SUPER ADMIN', 'STORE MANAGER'].includes(app.currentUser?.role)) return;
    if (action === 'archive' && app.currentUser.role !== 'SUPER ADMIN') return;
    const asset = app.state.assets.find((item) => item.id === assetId);
    if (!asset) return;
    const location = asset.location;
    const proposedAsset = action === 'archive'
      ? { ...asset, archived: true, status: 'Archived' }
      : action === 'damaged'
        ? { ...asset, condition: 'Critical', status: 'Maintenance' }
        : action === 'missing'
          ? { ...asset, status: 'Missing' }
          : action === 'maintenance'
            ? { ...asset, status: 'Maintenance' }
            : asset;
    if (!canRemoveUsableStock(asset, proposedAsset)) {
      showToast('This change would consume stock already reserved for approved requests.', 'error');
      return;
    }
    const previousStatus = asset.status;
    const previousCondition = asset.condition;

    if (action === 'archive') {
      asset.archived = true;
      asset.status = 'Archived';
    } else if (action === 'damaged') {
      asset.condition = 'Critical';
      asset.status = 'Maintenance';
      app.state.maintenance.unshift({ id: `MT-${Date.now()}`, assetId: asset.id, asset: asset.name, issue: 'Damaged during store inspection', department: asset.department, reportedDate: new Date().toISOString().slice(0, 10), assignedVendor: 'Unassigned', expectedCompletion: 'To be scheduled', status: 'Scheduled' });
    } else if (action === 'missing') {
      asset.status = 'Missing';
    } else if (action === 'maintenance') {
      asset.status = 'Maintenance';
      app.state.maintenance.unshift({ id: `MT-${Date.now()}`, assetId: asset.id, asset: asset.name, issue: 'Maintenance requested by Store Manager', department: asset.department, reportedDate: new Date().toISOString().slice(0, 10), assignedVendor: 'Unassigned', expectedCompletion: 'To be scheduled', status: 'Scheduled' });
    }

    asset.lastUpdated = new Date().toISOString();
    recordAssetMovement(asset, location, location, action === 'archive' ? 'Archive' : 'Status Update', `${action} by ${app.currentUser.name}`);
    recordAudit(`Asset ${action}`, 'Asset', asset.id, { previousStatus, status: asset.status, previousCondition, condition: asset.condition });
    save();
    renderPage();
    showToast(`Asset ${asset.id} updated: ${action}.`, 'success');
  }

  function issueAsset(assetId, payload, renderAfter = true) {
    if (!['SUPER ADMIN', 'STORE MANAGER'].includes(app.currentUser?.role)) return;
    let asset = app.state.assets.find((item) => item.id === assetId);
    if (!asset || !InventoryWorkflow.isUsableStoreAsset(asset)) {
      showToast('Asset not found or not in usable Central Store stock.', 'error');
      return;
    }

    if (Number(asset.quantity) > 1) {
      asset.quantity -= 1;
      const assetCode = asset.id.split('-')[1] || 'AST';
      let nextIndex = app.state.assets.length + 1;
      let unitId = InventoryData.generateAssetId(assetCode, nextIndex);
      while (app.state.assets.some((item) => item.id === unitId)) {
        nextIndex += 1;
        unitId = InventoryData.generateAssetId(assetCode, nextIndex);
      }
      const issuedUnit = {
        ...asset,
        id: unitId,
        qrCode: unitId,
        rfidTag: InventoryData.generateRFID(),
        serialNumber: `${asset.serialNumber}-${nextIndex}`,
        quantity: 1,
        status: 'Available',
        movementHistory: [...(asset.movementHistory || [])],
        lastUpdated: new Date().toISOString()
      };
      app.state.assets.push(issuedUnit);
      asset = issuedUnit;
      assetId = unitId;
    }

    const fromLocation = asset.location;
    asset.status = 'Issued';
    asset.department = payload.department || asset.department;
    asset.location = payload.department || asset.location;
    asset.custodian = payload.person;
    asset.issueRequestId = payload.requestId || null;
    asset.expectedReturnDate = payload.expectedReturnDate || '';
    asset.lastUpdated = new Date().toISOString();
    asset.movementHistory.unshift({
      date: new Date().toISOString().slice(0, 10),
      event: `${fromLocation} → ${payload.department || 'Lab'}`,
      details: `Issued to ${payload.person}`
    });

    app.state.movements.unshift({
      id: `MOV-${Date.now()}`,
      assetId: asset.id,
      asset: asset.name,
      from: 'Central Store',
      to: payload.department || 'Lab',
      person: payload.person,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      timestamp: new Date().toISOString(),
      status: 'Issued',
      movementType: 'Issue',
      purpose: payload.purpose,
      verification: `University ID checked by staff; asset ${asset.id} selected manually (no QR/RFID reader used)`
    });

    const issueRequest = app.state.issueRequests.find((request) => request.id === payload.requestId);
    if (issueRequest) {
      issueRequest.status = 'Issued';
      issueRequest.fulfillmentStatus = 'Issued';
      issueRequest.timeline = [...(issueRequest.timeline || []), { label: `Issued to ${payload.person}; asset ${asset.id} verified`, date: new Date().toISOString().slice(0, 10) }];
    }

    app.state.surveillanceEvents.unshift({
      id: `EVT-${Date.now()}`,
      time: new Date().toLocaleTimeString('en-GB'),
      text: `Asset ${asset.id} movement detected for ${payload.person}`,
      severity: 'info'
    });

    syncRequestList();
    save();
    if (renderAfter) {
      renderPage();
      showToast(`Asset ${asset.id} issued successfully.`, 'success');
    }
  }

  function returnAsset(assetId, payload) {
    if (!['SUPER ADMIN', 'STORE MANAGER'].includes(app.currentUser?.role)) return;
    const asset = app.state.assets.find((item) => item.id === assetId);
    if (!asset || asset.status !== 'Issued') {
      showToast('Select an asset that is currently issued.', 'error');
      return;
    }

    const previousCustodian = asset.custodian;
    asset.status = ['Needs Service', 'Critical'].includes(payload.condition) ? 'Maintenance' : 'Available';
    asset.location = 'Central Store';
    asset.custodian = 'Central Store';
    asset.condition = payload.condition || asset.condition;
    const request = app.state.issueRequests.find((item) => item.id === asset.issueRequestId);
    if (request) {
      request.status = 'Completed';
      request.timeline = [...(request.timeline || []), { label: `Returned by ${payload.person || previousCustodian}; condition ${asset.condition}`, date: new Date().toISOString().slice(0, 10) }];
    }
    const reservation = (app.state.reservations || []).find((item) => item.requestId === asset.issueRequestId && ['Active', 'Reserved'].includes(item.status));
    if (reservation) {
      reservation.status = 'Fulfilled';
      reservation.fulfilledAt = new Date().toISOString();
    }
    asset.lastUpdated = new Date().toISOString();
    asset.movementHistory.unshift({
      date: new Date().toISOString().slice(0, 10),
      event: `${payload.department || asset.department} → Central Store`,
      details: `Returned by ${payload.person || previousCustodian}; condition ${asset.condition}`
    });

    app.state.movements.unshift({
      id: `MOV-${Date.now()}`,
      assetId: asset.id,
      asset: asset.name,
      from: payload.department || asset.department,
      to: 'Central Store',
      person: payload.person || previousCustodian,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      timestamp: new Date().toISOString(),
      status: 'Returned',
      movementType: 'Return',
      purpose: payload.remarks,
      verification: `Condition checked: ${asset.condition}`
    });

    app.state.surveillanceEvents.unshift({
      id: `EVT-${Date.now()}`,
      time: new Date().toLocaleTimeString('en-GB'),
      text: `Asset ${asset.id} returned and verified by store team`,
      severity: 'success'
    });

    syncRequestList();
    recordAudit('Asset returned', 'Asset', asset.id, { from: payload.department || asset.department, condition: asset.condition, status: asset.status });
    save();
    renderPage();
    showToast(`Asset ${asset.id} returned and marked ${asset.status.toLowerCase()}.`, 'success');
  }

  function bindIssueReturnInteraction() {
    const assetSelect = document.getElementById('issueAssetSelect');
    const issueAssetDetail = document.getElementById('issueAssetDetail');
    const confirmIssueBtn = document.getElementById('confirmIssueBtn');
    const returnAssetSelect = document.getElementById('returnAssetSelect');
    const confirmReturnBtn = document.getElementById('confirmReturnBtn');
    const issueModeButtons = document.querySelectorAll('[data-issue-mode]');
    const issuePanel = document.getElementById('returnPanel');
    const issueRequestSelect = document.getElementById('issueRequestSelect');

    issueRequestSelect?.addEventListener('change', (event) => {
      const request = app.state.issueRequests.find((item) => item.id === event.target.value);
      if (!request) return;
      const universityIdField = document.getElementById('issueUniversityId');
      const personNameField = document.getElementById('issuePersonName');
      const departmentField = document.getElementById('issuePersonDepartment');
      const purposeField = document.getElementById('issuePurpose');
      const assetField = document.getElementById('issueAssetSelect');
      if (universityIdField) universityIdField.value = request.universityId || '';
      if (personNameField) personNameField.value = request.custodian || request.requestedBy || request.person || '';
      if (departmentField) departmentField.value = request.department || '';
      if (purposeField) purposeField.value = request.purpose || '';
      if (assetField) {
        const requestedItem = request.item || request.itemName;
        const options = app.state.assets.filter((asset) => InventoryWorkflow.isUsableStoreAsset(asset) && InventoryWorkflow.assetMatchesItem(asset, requestedItem));
        assetField.innerHTML = `<option value="">Select matching asset</option>${options.map((asset) => `<option value="${escapeHTML(asset.id)}">${escapeHTML(asset.id)} — ${escapeHTML(asset.name)}</option>`).join('')}`;
      }
    });

    assetSelect?.addEventListener('change', (event) => {
      const asset = app.state.assets.find((item) => item.id === event.target.value);
      if (!asset || !issueAssetDetail) return;
      issueAssetDetail.innerHTML = `
        <div class="detail-item"><span class="inline-label">Asset</span><strong>${escapeHTML(asset.name)}</strong></div>
        <div class="detail-item"><span class="inline-label">Category</span><strong>${escapeHTML(asset.category)}</strong></div>
        <div class="detail-item"><span class="inline-label">Department</span><strong>${escapeHTML(asset.department)}</strong></div>
        <div class="detail-item"><span class="inline-label">Current Location</span><strong>${escapeHTML(asset.location)}</strong></div>
        <div class="detail-item"><span class="inline-label">Status</span><strong>${escapeHTML(asset.status)}</strong></div>
        <div class="detail-item"><span class="inline-label">Condition</span><strong>${escapeHTML(asset.condition)}</strong></div>
      `;
    });

    returnAssetSelect?.addEventListener('change', (event) => {
      const asset = app.state.assets.find((item) => item.id === event.target.value);
      if (!asset) return;
      const issueMovement = app.state.movements.find((movement) => movement.assetId === asset.id && movement.movementType === 'Issue');
      const issuedToField = document.getElementById('returnIssuedTo');
      const departmentField = document.getElementById('returnDepartment');
      const issueDateField = document.getElementById('returnIssueDate');
      const expectedDateField = document.getElementById('returnExpectedDate');
      if (issuedToField) issuedToField.value = asset.custodian || '';
      if (departmentField) departmentField.value = asset.department || '';
      if (issueDateField) issueDateField.value = issueMovement?.timestamp?.slice(0, 10) || issueMovement?.date || '';
      if (expectedDateField) expectedDateField.value = asset.expectedReturnDate || '';
    });

    confirmIssueBtn?.addEventListener('click', () => {
      const assetId = assetSelect?.value;
      const requestId = issueRequestSelect?.value;
      const request = app.state.issueRequests.find((item) => item.id === requestId);
      const reservation = (app.state.reservations || []).find((item) => item.requestId === requestId && ['Active', 'Reserved'].includes(item.status));
      const payload = {
        person: document.getElementById('issuePersonName')?.value.trim() || '',
        department: document.getElementById('issuePersonDepartment')?.value.trim() || '',
        phone: document.getElementById('issuePersonPhone')?.value || '',
        purpose: document.getElementById('issuePurpose')?.value.trim() || '',
        expectedReturnDate: document.getElementById('issueExpectedReturn')?.value || ''
      };

      if (!assetId || !request || request.status !== 'Ready for Issue' || !reservation) {
        showToast('Select an approved request and an asset before issuing.', 'error');
        return;
      }
      const universityId = document.getElementById('issueUniversityId')?.value.trim();
      if (!universityId || !payload.person || !payload.department || !payload.purpose || !document.getElementById('issueIdentityVerified')?.checked) {
        showToast('Verify the recipient name and University ID before issuing.', 'error');
        return;
      }
      const asset = app.state.assets.find((item) => item.id === assetId);
      if (!asset) {
        showToast('Asset not found.', 'error');
        return;
      }
      const requestedItem = request.item || request.itemName;
      if (!InventoryWorkflow.assetMatchesItem(asset, requestedItem)) {
        showToast('Selected asset does not match the approved request item.', 'error');
        return;
      }

      payload.requestId = requestId;
      payload.universityId = universityId;
      const matchingAssets = app.state.assets.filter((item) => InventoryWorkflow.isUsableStoreAsset(item) && InventoryWorkflow.assetMatchesItem(item, requestedItem));
      const quantity = Number(request.quantity) || 1;
      const availableQuantity = matchingAssets.reduce((total, item) => total + (Number(item.quantity) || 1), 0);
      if (reservation.quantity < quantity || availableQuantity < quantity) {
        showToast(`Only ${availableQuantity} matching items are available for this request.`, 'error');
        return;
      }
      for (let unit = 0; unit < quantity; unit += 1) {
        const availableAsset = matchingAssets.find((item) => item.status === 'Available' && (Number(item.quantity) || 1) > 0);
        if (!availableAsset) break;
        issueAsset(availableAsset.id, payload, false);
      }
      reservation.status = 'Fulfilled';
      reservation.fulfilledAt = new Date().toISOString();
      recordAudit('Request issued', 'Inventory request', request.id, { quantity, assetId, custodian: payload.person, department: payload.department });
      save();
      renderPage();
      showToast(`${quantity} asset${quantity === 1 ? '' : 's'} issued and movement recorded.`, 'success');
    });

    confirmReturnBtn?.addEventListener('click', () => {
      const assetId = returnAssetSelect?.value;
      const payload = {
        person: document.getElementById('returnIssuedTo')?.value.trim() || '',
        department: document.getElementById('returnDepartment')?.value.trim() || '',
        condition: document.getElementById('returnCondition')?.value || 'Good',
        remarks: document.getElementById('returnRemarks')?.value || 'Returned'
      };

      if (!assetId) {
        showToast('Select an issued asset for return.', 'error');
        return;
      }
      if (!payload.person || !payload.department) {
        showToast('Verify the recipient and department before recording the return.', 'error');
        return;
      }

      returnAsset(assetId, payload);
    });

    issueModeButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const mode = button.dataset.issueMode;
        if (mode === 'return') {
          document.getElementById('returnPanel')?.classList.remove('hidden');
          button.classList.add('active');
          document.querySelector('[data-issue-mode="issue"]')?.classList.remove('active');
        } else {
          document.getElementById('returnPanel')?.classList.add('hidden');
          button.classList.add('active');
          document.querySelector('[data-issue-mode="return"]')?.classList.remove('active');
        }
      });
    });
  }

  function bindEvents() {
    document.addEventListener('click', (event) => {
      const pageLink = event.target.closest('[data-page]');
      if (pageLink) {
        const pageKey = pageLink.dataset.page;
        setPage(pageKey);
        return;
      }

      const button = event.target.closest('[data-action]');
      if (!button) return;

      const action = button.dataset.action;

      if (app.currentUser?.role === 'HOD' && !['close-modal', 'close-drawer', 'start-hod-request', 'view-request-timeline'].includes(action)) {
        showToast('This action is not available for the HOD role.', 'error');
        return;
      }
      if (action === 'open-request-decision' && app.currentUser?.role !== 'STORE DIRECTOR') {
        showToast('Only the Store Director can approve or reject requests.', 'error');
        return;
      }
      if (action === 'new-purchase-request' && app.currentUser?.role !== 'SUPER ADMIN') {
        showToast('Purchase requests must be submitted by a department or forwarded by Store Manager.', 'error');
        return;
      }

      if (action === 'close-modal') closeModal();
      if (action === 'close-drawer') closeAssetDrawer();
      if (action === 'new-purchase-request') showModalForPage(ProcurementPage.renderNewRequestModal());
      if (action === 'start-hod-request') {
        setPage('request_item');
        const itemField = document.querySelector('#hodRequestForm [name="itemName"]');
        if (itemField) itemField.value = button.dataset.item || '';
      }
      if (action === 'open-request-decision') {
        showModalForPage(renderRequestDecisionModal(button.dataset.requestId, button.dataset.status));
      }
      if (action === 'view-request-timeline') {
        const request = getRequestById(button.dataset.requestId);
        const timeline = request?.timeline || [{ label: `Current status: ${request?.status || 'Unknown'}`, date: request?.date || '—' }];
        showModalForPage(`<div class="modal-header"><h3>Request Timeline</h3><button class="close-button" data-action="close-modal" aria-label="Close">×</button></div><div class="modal-body"><div class="timeline">${timeline.map((item) => `<div class="timeline-item"><div class="line"></div><div class="content"><strong>${item.date}</strong><span>${item.label}</span></div></div>`).join('')}</div></div>`);
      }
      if (action === 'toggle-user' && app.currentUser?.role === 'SUPER ADMIN') {
        const user = (app.state.users || []).find((item) => item.id === button.dataset.userId);
        if (user) user.active = !user.active;
        save();
        if (user?.email === app.currentUser.email && !user.active) {
          logout();
          return;
        }
        renderPage();
      }
      if (action === 'edit-user' && app.currentUser?.role === 'SUPER ADMIN') {
        showModalForPage(renderUserEditModal(button.dataset.userId));
      }
      if (action === 'open-procurement-detail') {
        const requestId = button.dataset.requestId;
        const purchaseRequest = app.state.procurementRequests.find((item) => item.id === requestId);
        if (purchaseRequest) {
          showModalForPage(ProcurementPage.renderDetailModal(requestId));
        } else {
          showToast('Issue request review is available in the request center.', 'info');
        }
      }
      if (action === 'switch-procurement-tab') {
        app.selectedProcurementTab = button.dataset.tab;
        renderPage();
      }
      if (action === 'view-asset') openAssetDrawer(button.dataset.assetId);
      if (action === 'edit-asset' && ['SUPER ADMIN', 'STORE MANAGER'].includes(app.currentUser?.role)) showModalForPage(renderAssetEditModal(button.dataset.assetId));
      if (action === 'transfer-asset' && ['SUPER ADMIN', 'STORE MANAGER'].includes(app.currentUser?.role)) showModalForPage(renderAssetTransferModal(button.dataset.assetId));
      if (action === 'open-add-asset') showModalForPage(InventoryPage.renderAddAssetModal());
      if (action === 'export-assets') {
        const rows = [
          ['Asset ID', 'Asset Name', 'Department', 'Location', 'Status'],
          ...app.state.assets.map((asset) => [asset.id, asset.name, asset.department, asset.location, asset.status])
        ];
        exportCsv('inventory-export.csv', rows);
      }
      if (action === 'export-procurement') {
        exportCsv('procurement-export.csv', [
          ['Request ID', 'Department', 'Item', 'Quantity', 'Status'],
          ...app.state.procurementRequests.map((request) => [request.id, request.department, request.itemName, request.quantity, request.status])
        ]);
      }
      if (action === 'generate-report') {
        const reportType = button.dataset.report || 'Inventory Report';
        if (!getReportTypesForRole().includes(reportType)) {
          showToast('This report is not available for your role.', 'error');
          return;
        }
        exportCsv(`${reportType.toLowerCase().replace(/\s+/g, '-')}.csv`, generateReportCsv(reportType));
        showToast(`${reportType} exported successfully.`, 'success');
      }
      if (action === 'export-csv') {
        const reportType = button.dataset.report || 'Inventory Report';
        if (!getReportTypesForRole().includes(reportType)) {
          showToast('This report is not available for your role.', 'error');
          return;
        }
        exportCsv(`${reportType.toLowerCase().replace(/\s+/g, '-')}.csv`, generateReportCsv(reportType));
      }
      if (action === 'select-zone') {
        app.state.ui.selectedZone = button.dataset.zone;
        renderPage();
      }
      if (action === 'view-department') {
        app.state.filters.inventory.department = button.dataset.department;
        app.currentPage = 'inventory';
        renderPage();
      }
      if (action === 'notification') {
        const latestNotification = app.state.notifications?.[0] || 'No new alerts.';
        showToast(latestNotification, 'info');
      }
      if (action === 'help') {
        showToast('Inventory support guide: request → approve → procure → receive → issue → track → return.', 'info');
      }
      if (action === 'switch-request-tab') {
        app.selectedRequestTab = button.dataset.requestTab;
        renderPage();
      }
      if (action === 'open-receive-modal') {
        const requestId = button.dataset.requestId;
        showModalForPage(ProcurementPage.renderReceiveModal(requestId));
      }
    });

    document.addEventListener('submit', (event) => {
      if (event.target.id === 'loginForm') {
        event.preventDefault();
        const formData = new FormData(event.target);
        const authenticated = authenticate(formData.get('identity') || '', formData.get('password') || '');
        if (!authenticated) renderAuthentication('Email or password is incorrect.');
      }

      if (event.target.id === 'newRequestForm') {
        event.preventDefault();
        const formData = new FormData(event.target);
        addProcessRequest(formData);
      }

      if (event.target.id === 'hodRequestForm') {
        event.preventDefault();
        if (app.currentUser?.role !== 'HOD') return;
        addHodRequest(new FormData(event.target));
      }

      if (event.target.id === 'requestDecisionForm') {
        event.preventDefault();
        decideRequest(event.target.dataset.requestId, event.target.dataset.decision, new FormData(event.target).get('reason'));
        closeModal();
      }

      if (event.target.id === 'addUserForm' && app.currentUser?.role === 'SUPER ADMIN') {
        event.preventDefault();
        const formData = new FormData(event.target);
        const email = String(formData.get('email') || '').trim();
        if (app.state.users.some((user) => user.email.toLowerCase() === email.toLowerCase())) {
          showToast('A user with that email or ID already exists.', 'error');
          return;
        }
        app.state.users.unshift({
          id: `USR-${Date.now()}`,
          name: String(formData.get('name')).trim(),
          email,
          role: formData.get('role'),
          department: formData.get('department'),
          active: true
        });
        save();
        renderPage();
        showToast('User added.', 'success');
      }

      if (event.target.id === 'editUserForm' && app.currentUser?.role === 'SUPER ADMIN') {
        event.preventDefault();
        const user = app.state.users.find((item) => item.id === event.target.dataset.userId);
        if (!user) return;
        const formData = new FormData(event.target);
        const name = String(formData.get('name') || '').trim();
        const email = String(formData.get('email') || '').trim().toLowerCase();
        if (!name || !email || app.state.users.some((item) => item.id !== user.id && item.email.toLowerCase() === email)) {
          showToast('Enter a name and a unique email or employee ID.', 'error');
          return;
        }
        const wasCurrentUser = user.email === app.currentUser.email;
        user.name = name;
        user.email = email;
        user.role = normalizeRole(formData.get('role'));
        user.department = formData.get('department');
        save();
        closeModal();
        if (wasCurrentUser) {
          logout();
          return;
        }
        renderPage();
        showToast('User details updated.', 'success');
      }

      if (event.target.id === 'editAssetForm' && ['SUPER ADMIN', 'STORE MANAGER'].includes(app.currentUser?.role)) {
        event.preventDefault();
        const asset = app.state.assets.find((item) => item.id === event.target.dataset.assetId);
        if (!asset) return;
        const formData = new FormData(event.target);
        const quantity = Number(formData.get('quantity'));
        const proposedAsset = {
          ...asset,
          name: String(formData.get('name') || '').trim(),
          department: app.currentUser.role === 'STORE MANAGER' ? 'Central Store' : formData.get('department'),
          location: app.currentUser.role === 'STORE MANAGER' ? 'Central Store' : formData.get('location'),
          quantity,
          condition: formData.get('condition'),
          status: InventoryWorkflow.isServiceableAsset({ ...asset, condition: formData.get('condition') }) ? asset.status : 'Maintenance'
        };
        if (!proposedAsset.name || !Number.isInteger(quantity) || quantity < 1) {
          showToast('Enter an asset name and a positive whole quantity.', 'error');
          return;
        }
        if (!canRemoveUsableStock(asset, proposedAsset)) {
          showToast('This change would consume stock already reserved for approved requests.', 'error');
          return;
        }
        const previous = { name: asset.name, department: asset.department, location: asset.location, quantity: asset.quantity, condition: asset.condition };
        Object.assign(asset, proposedAsset);
        asset.lastUpdated = new Date().toISOString();
        recordAudit('Asset record updated', 'Asset', asset.id, { previous, updated: { name: asset.name, department: asset.department, location: asset.location, quantity: asset.quantity, condition: asset.condition } });
        save();
        closeModal();
        renderPage();
        showToast(`Asset ${asset.id} updated.`, 'success');
      }

      if (event.target.id === 'transferAssetForm' && ['SUPER ADMIN', 'STORE MANAGER'].includes(app.currentUser?.role)) {
        event.preventDefault();
        const asset = app.state.assets.find((item) => item.id === event.target.dataset.assetId);
        if (!asset) return;
        const formData = new FormData(event.target);
        const from = asset.location;
        const to = String(formData.get('location') || '').trim();
        const proposedAsset = { ...asset, department: formData.get('department'), location: to };
        if (!to || !String(formData.get('purpose') || '').trim()) {
          showToast('A destination and transfer reason are required.', 'error');
          return;
        }
        if (!canRemoveUsableStock(asset, proposedAsset)) {
          showToast('This transfer would consume stock already reserved for approved requests.', 'error');
          return;
        }
        asset.department = proposedAsset.department;
        asset.location = proposedAsset.location;
        asset.lastUpdated = new Date().toISOString();
        recordAssetMovement(asset, from, asset.location, 'Transfer', formData.get('purpose'));
        recordAudit('Asset transferred', 'Asset', asset.id, { from, to: asset.location, purpose: formData.get('purpose') });
        save();
        closeModal();
        renderPage();
        showToast(`Asset ${asset.id} transferred to ${asset.location}.`, 'success');
      }

      if (event.target.id === 'systemSettingsForm' && app.currentUser?.role === 'SUPER ADMIN') {
        event.preventDefault();
        const formData = new FormData(event.target);
        app.state.settings = Object.fromEntries(formData.entries());
        save();
        renderPage();
        showToast('University settings saved.', 'success');
      }

      if (event.target.id === 'receiveForm') {
        event.preventDefault();
        const formData = new FormData(event.target);
        const requestId = event.target.dataset.requestId;
        receiveShipment(requestId, formData);
      }

      if (event.target.id === 'newQuotationForm' && app.currentUser?.role === 'STORE MANAGER') {
        event.preventDefault();
        const request = app.state.procurementRequests.find((item) => item.id === event.target.dataset.requestId);
        const formData = new FormData(event.target);
        const vendor = String(formData.get('vendor') || '').trim();
        const quantity = Number(formData.get('quantity'));
        const unitPrice = Number(formData.get('unitPrice'));
        const taxPercent = Number(formData.get('taxPercent'));
        const deliveryTerms = String(formData.get('deliveryTerms') || '').trim();
        if (!request || !['Pending Procurement', 'Approved'].includes(request.status)
          || !vendor || !deliveryTerms || !Number.isInteger(quantity) || quantity < 1
          || !Number.isFinite(unitPrice) || unitPrice < 0
          || !Number.isFinite(taxPercent) || taxPercent < 0) {
          showToast('Enter a vendor, valid whole quantity, non-negative price/tax, and delivery terms.', 'error');
          return;
        }
        request.quotations ||= [];
        const quotation = {
          id: `QUO-${request.id}-${request.quotations.length + 1}`,
          vendor,
          quantity,
          unitPrice,
          taxPercent,
          deliveryTerms,
          validThrough: String(formData.get('validThrough') || ''),
          notes: String(formData.get('notes') || '').trim(),
          recordedBy: app.currentUser.name,
          recordedAt: new Date().toISOString()
        };
        request.quotations.push(quotation);
        recordAudit('Vendor quotation recorded', 'Purchase request', request.id, { quotationId: quotation.id, vendor });
        save();
        const modal = document.getElementById('requestModalContent');
        if (modal) modal.innerHTML = ProcurementPage.renderDetailModal(request.id);
        refreshIcons();
        showToast(`Quotation from ${vendor} recorded for comparison.`, 'success');
      }

      if (event.target.id === 'addAssetForm') {
        event.preventDefault();
        const formData = new FormData(event.target);
        addAsset(formData);
      }
    });

    document.addEventListener('change', (event) => {
      if (event.target.matches('[data-asset-management]')) {
        const { assetId } = event.target.dataset;
        const operation = event.target.value;
        if (operation === 'transfer') {
          showModalForPage(renderAssetTransferModal(assetId));
        } else if (operation) {
          manageAsset(assetId, operation);
        }
        return;
      }
      const filter = event.target.dataset.filter;
      if (filter && app.currentPage === 'inventory') {
        app.state.filters.inventory[filter] = event.target.value;
        renderPage();
      }
    });

    document.addEventListener('input', (event) => {
      if (event.target.id === 'globalSearchInput') {
        app.state.searchTerm = event.target.value.trim();
        renderPage();
      }
    });

    document.getElementById('logoutBtn')?.addEventListener('click', logout);

    document.getElementById('notificationBtn')?.addEventListener('click', () => {
      const latestNotification = app.state.notifications?.[0] || 'No new alerts.';
      showToast(latestNotification, 'info');
    });
    document.getElementById('helpBtn')?.addEventListener('click', () => showToast('Inventory support guide: request → approve → procure → receive → issue → track → return.', 'info'));
    document.getElementById('mobileSidebarToggle')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.toggle('open');
    });
    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.toggle('collapsed');
    });

    document.addEventListener('click', (event) => {
      const modalBackdrop = document.getElementById('requestModalBackdrop');
      const assetDrawer = document.getElementById('assetDrawerBackdrop');
      if (event.target === modalBackdrop) closeModal();
      if (event.target === assetDrawer) closeAssetDrawer();
    });

    document.addEventListener('click', (event) => {
      const tabButton = event.target.closest('[data-tab]');
      if (!tabButton) return;

      if (tabButton.dataset.tab === 'overview' || tabButton.dataset.tab === 'movement' || tabButton.dataset.tab === 'maintenance' || tabButton.dataset.tab === 'procurement' || tabButton.dataset.tab === 'documents') {
        document.querySelectorAll('[data-content-panel]').forEach((panel) => panel.classList.add('hidden'));
        document.querySelector(`[data-content-panel="${tabButton.dataset.tab}"]`)?.classList.remove('hidden');
        document.querySelectorAll('.tab-button').forEach((button) => button.classList.toggle('active', button === tabButton));
      }
    });

    document.getElementById('globalSearchInput')?.addEventListener('input', (event) => {
      app.state.searchTerm = event.target.value.trim();
      renderPage();
    });
  }

  function initialize() {
    bindEvents();
    const storedUser = app.currentUser && (app.state.users || []).find((user) => user.email === app.currentUser.email);
    if (!storedUser || storedUser.active === false) {
      logout();
      return;
    }
    app.currentUser = {
      ...app.currentUser,
      name: storedUser.name,
      role: normalizeRole(storedUser.role),
      department: storedUser.department
    };
    if (!app.currentUser) {
      renderAuthentication();
      return;
    }
    app.currentPage = defaultPageForRole(app.currentUser.role);
    app.state.selectedRole = app.currentUser.role;
    app.state.currentPage = app.currentPage;
    document.getElementById('appShell')?.classList.remove('hidden');
    document.getElementById('loginRoot')?.classList.add('hidden');
    renderPage();
    refreshIcons();
  }

  return {
    initialize,
    state: app.state,
    renderPage,
    showToast,
    exportCsv,
    generateReportCsv,
    setPage,
    renderSidebar,
    closeModal,
    closeAssetDrawer,
    refreshIcons,
    get currentUser() { return app.currentUser; },
    logout
  };
})();

window.InventorySystem = InventorySystem;
window.addEventListener('DOMContentLoaded', () => {
  InventorySystem.initialize();
});

if (typeof module !== 'undefined') {
  module.exports = InventorySystem;
}
