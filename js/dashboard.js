const DashboardPage = (() => {
  function getDashboardStats(state) {
    const activeAssets = state.assets.filter((asset) => !asset.archived);
    const totalAssets = activeAssets.length;
    const available = activeAssets.filter((asset) => asset.status === 'Available' && InventoryWorkflow.isServiceableAsset(asset)).length;
    const issued = activeAssets.filter((asset) => asset.status === 'Issued').length;
    const maintenance = activeAssets.filter((asset) => asset.status === 'Maintenance').length;
    const missing = activeAssets.filter((asset) => asset.status === 'Missing').length;
    const procurementPending = state.procurementRequests.filter((request) => !['Received', 'Rejected'].includes(request.status)).length;
    const decisionsPending = state.requests.filter((request) => request.status === 'Pending Approval').length;

    return { totalAssets, available, issued, maintenance, missing, procurementPending, decisionsPending };
  }

  function render() {
    const state = window.InventorySystem.state;
    const stats = getDashboardStats(state);
    const activeAssets = state.assets.filter((asset) => !asset.archived);

    return `
      <section class="page-section">
        <div class="kpi-grid">
          ${[
            { label: 'Total Assets', value: stats.totalAssets, icon: 'package', tone: 'neutral' },
            { label: 'Available', value: stats.available, icon: 'check-circle-2', tone: 'success' },
            { label: 'Issued', value: stats.issued, icon: 'send-to-back', tone: 'info' },
            { label: 'Under Maintenance', value: stats.maintenance, icon: 'wrench', tone: 'warning' },
            { label: 'Missing / Alerts', value: stats.missing, icon: 'alert-triangle', tone: 'danger' },
            { label: 'Open Procurement', value: stats.procurementPending, icon: 'shopping-cart', tone: 'warning' },
            { label: 'Awaiting Store Director', value: stats.decisionsPending, icon: 'clipboard-check', tone: 'warning' }
          ].map((card) => `
            <article class="kpi-card" data-tone="${card.tone}">
              <div class="kpi-header">
                <div class="kpi-icon"><i data-lucide="${card.icon}"></i></div>
              </div>
              <h3>${card.value}</h3>
              <div class="kpi-label">${card.label}</div>
            </article>
          `).join('')}
        </div>

        <div class="content-grid">
          <div class="panel">
            <div class="panel-header">
              <h3>Inventory by Department</h3>
            </div>
            <div class="chart-wrap">
              <div class="canvas-shell">
                <canvas id="departmentChart"></canvas>
              </div>
            </div>
          </div>

          <div class="panel">
            <div class="panel-header">
              <h3>Asset Status</h3>
            </div>
            <div class="chart-wrap">
              <div class="canvas-shell" style="height: 260px;">
                <canvas id="statusChart"></canvas>
              </div>
            </div>
            <ul class="status-list">
              <li class="status-item"><div class="legend"><span class="dot green"></span> Available</div><strong>${activeAssets.filter((item) => item.status === 'Available').length}</strong></li>
              <li class="status-item"><div class="legend"><span class="dot blue"></span> Issued</div><strong>${activeAssets.filter((item) => item.status === 'Issued').length}</strong></li>
              <li class="status-item"><div class="legend"><span class="dot orange"></span> Maintenance</div><strong>${activeAssets.filter((item) => item.status === 'Maintenance').length}</strong></li>
              <li class="status-item"><div class="legend"><span class="dot red"></span> Missing</div><strong>${activeAssets.filter((item) => item.status === 'Missing').length}</strong></li>
            </ul>
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <h3>Recent Asset Movements</h3>
          </div>
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Asset ID</th>
                  <th>Asset</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Person</th>
                  <th>Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${state.movements.slice(0, 6).map((movement) => `
                  <tr>
                    <td>${InventoryWorkflow.escapeHTML(movement.assetId)}</td>
                    <td>${InventoryWorkflow.escapeHTML(movement.asset)}</td>
                    <td>${InventoryWorkflow.escapeHTML(movement.from)}</td>
                    <td>${InventoryWorkflow.escapeHTML(movement.to)}</td>
                    <td>${InventoryWorkflow.escapeHTML(movement.person)}</td>
                    <td>${InventoryWorkflow.escapeHTML(movement.time)}</td>
                    <td><span class="badge-pill ${movement.status === 'Issued' ? 'info' : 'success'}">${InventoryWorkflow.escapeHTML(movement.status)}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <h3>Procurement Pipeline</h3>
          </div>
          <div class="procurement-pipeline">
            ${['Requested', 'Approved', 'PO Created', 'Ordered', 'Received'].map((stage) => {
              const count = stage === 'Requested'
                ? state.procurementRequests.filter((item) => item.status === 'Pending Approval').length
                : stage === 'Approved'
                  ? state.procurementRequests.filter((item) => item.status === 'Approved').length
                  : stage === 'PO Created'
                    ? state.procurementRequests.filter((item) => item.status === 'PO Created').length
                    : stage === 'Ordered'
                      ? state.procurementRequests.filter((item) => item.status === 'Ordered').length
                      : state.procurementRequests.filter((item) => item.status === 'Received').length;

              return `
                <div class="pipeline-stage">
                  <div class="count">${count}</div>
                  <div class="stage-name">${stage}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div class="content-grid">
          <div class="panel">
            <div class="panel-header"><h3>Pending Requests</h3><button class="ghost-button" data-page="requests">Open requests</button></div>
            <div class="table-wrap"><table class="table"><thead><tr><th>Request</th><th>Department</th><th>Item</th><th>Status</th></tr></thead><tbody>
              ${state.requests.filter((request) => request.status === 'Pending Approval').slice(0, 5).map((request) => `<tr><td>${InventoryWorkflow.escapeHTML(request.id)}</td><td>${InventoryWorkflow.escapeHTML(request.department)}</td><td>${InventoryWorkflow.escapeHTML(request.itemName || request.item)}</td><td><span class="status-chip pending">${InventoryWorkflow.escapeHTML(request.status)}</span></td></tr>`).join('') || '<tr><td colspan="4"><div class="empty-state">No pending requests.</div></td></tr>'}
            </tbody></table></div>
          </div>
          <div class="panel">
            <div class="panel-header"><h3>AI Surveillance Alerts</h3><button class="ghost-button" data-page="surveillance">Open simulation</button></div>
            <div class="modal-body"><p class="muted-note">Frontend simulation only. No live CCTV or AI service is connected.</p>
              ${state.surveillanceEvents.filter((event) => event.severity === 'warning').slice(0, 3).map((event) => `<div class="status-item"><span>${InventoryWorkflow.escapeHTML(event.text)}</span><strong>${InventoryWorkflow.escapeHTML(event.time)}</strong></div>`).join('') || '<div class="empty-state">No simulated alerts.</div>'}
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function renderCharts() {
    const departmentCtx = document.getElementById('departmentChart');
    const statusCtx = document.getElementById('statusChart');

    if (!departmentCtx || !statusCtx) return;

    const state = window.InventorySystem.state;

    const activeAssets = state.assets.filter((asset) => !asset.archived);
    const departmentLabels = [...new Set(activeAssets.map((asset) => asset.department))].sort();
    const departmentCounts = departmentLabels.map((dept) => activeAssets.filter((asset) => asset.department === dept).length);

    if (window.__dashboardCharts) {
      window.__dashboardCharts.forEach((chart) => chart.destroy());
    }
    window.__dashboardCharts = [];

    const deptChart = new Chart(departmentCtx, {
      type: 'bar',
      data: {
        labels: departmentLabels,
        datasets: [{
          label: 'Assets',
          data: departmentCounts,
          backgroundColor: ['#214a9e', '#3969bc', '#8ca9de', '#0f172a', '#1b9a63', '#f0a13d', '#ed174c', '#5d79bd'],
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });

    const statusChart = new Chart(statusCtx, {
      type: 'doughnut',
      data: {
        labels: ['Available', 'Issued', 'Maintenance', 'Missing'],
        datasets: [{
          data: [
            activeAssets.filter((item) => item.status === 'Available').length,
            activeAssets.filter((item) => item.status === 'Issued').length,
            activeAssets.filter((item) => item.status === 'Maintenance').length,
            activeAssets.filter((item) => item.status === 'Missing').length
          ],
          backgroundColor: ['#1b9a63', '#214a9e', '#e58d29', '#ed174c'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: { legend: { display: false } }
      }
    });

    window.__dashboardCharts.push(deptChart, statusChart);
  }

  return {
    render,
    renderCharts
  };
})();

window.DashboardPage = DashboardPage;
