const SurveillancePage = (() => {
  function render() {
    const state = window.InventorySystem.state;
    const events = state.surveillanceEvents.slice(0, 10);

    return `
      <section class="page-section">
        <div class="toolbar">
          <div class="toolbar-left">
            <h3 style="margin:0;">AI Store Surveillance</h3>
          </div>
          <div class="toolbar-right">
            <span class="muted-note">No live feed connected</span>
          </div>
        </div>

        <p class="muted-note">Demonstration simulation only. No camera, RFID reader, AI service, or live database is connected. Events must never be treated as verified asset movements.</p>

        <div class="live-panel">
          <div class="panel">
            <div class="camera-view">
              <div class="camera-header">
                <div class="live-badge">SIMULATED FEED</div>
                <div style="color:#fff;font-weight:700;">Illustrative Central Store View</div>
              </div>

              <div class="camera-viewport">
                <div class="shelf"></div>
                <div class="camera-overlay">
                  <span class="overlay-tag success" style="top:32px;left:18px;">Authorized User</span>
                  <span class="overlay-tag" style="top:76px;right:18px;">Asset Movement Detected</span>
                  <span class="overlay-tag" style="bottom:64px;left:22px;">RFID Detected</span>
                  <span class="overlay-tag warning" style="bottom:28px;right:22px;">Unauthorized Movement</span>
                </div>
              </div>

              <div class="status-row">
                <div class="mini-status">Camera: Not connected</div>
                <div class="mini-status">RFID: Not connected</div>
                <div class="mini-status">AI service: Not connected</div>
                <div class="mini-status">Database: Browser demo storage</div>
              </div>
            </div>
          </div>

          <div class="event-panel">
            <div class="panel-header" style="padding:0;">
              <h3>AI Events</h3>
            </div>
            <ul class="event-list">
              ${events.map((event) => `
                <li>
                  <span class="event-time">${event.time}</span>
                  <span class="event-content">${event.severity === 'warning' ? '⚠' : ''} ${InventoryWorkflow.escapeHTML(event.text)}</span>
                </li>
              `).join('')}
            </ul>
          </div>
        </div>
      </section>
    `;
  }

  return { render };
})();

window.SurveillancePage = SurveillancePage;
