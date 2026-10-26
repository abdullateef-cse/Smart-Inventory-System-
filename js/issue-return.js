const IssueReturnPage = (() => {
  function render() {
    const state = window.InventorySystem.state;
    const issueAssets = state.assets.filter((asset) => InventoryWorkflow.isUsableStoreAsset(asset));
    const returnAssets = state.assets.filter((asset) => asset.status === 'Issued');
    const approvedIssueRequests = state.issueRequests.filter((request) => request.status === 'Ready for Issue');

    return `
      <section class="page-section">
        <div class="toolbar">
          <div class="toolbar-left">
            <h3 style="margin:0;">Issue / Return</h3>
          </div>
          <div class="toolbar-right">
            <span class="muted-note">QR/RFID readers are not connected; select a verified asset manually.</span>
          </div>
        </div>

        <div class="panel">
          <div class="modal-body">
            <div class="tab-row">
              <button class="tab-item active" data-issue-mode="issue">ISSUE ITEM</button>
              <button class="tab-item" data-issue-mode="return">RETURN ITEM</button>
            </div>

            <div class="field-grid" style="margin-top:18px;">
              <div class="field">
                <label for="issueRequestSelect">Approved Issue Request</label>
                <select id="issueRequestSelect">
                  <option value="">Select approved request</option>
                  ${approvedIssueRequests.map((request) => `<option value="${InventoryWorkflow.escapeHTML(request.id)}">${InventoryWorkflow.escapeHTML(request.id)} — ${InventoryWorkflow.escapeHTML(request.department)} — ${InventoryWorkflow.escapeHTML(request.itemName || request.item)}</option>`).join('')}
                </select>
              </div>
              <div class="field">
                <label for="issueAssetSelect">Asset</label>
                <select id="issueAssetSelect">
                  <option value="">Select asset</option>
                  ${issueAssets.map((asset) => `<option value="${InventoryWorkflow.escapeHTML(asset.id)}">${InventoryWorkflow.escapeHTML(asset.id)} — ${InventoryWorkflow.escapeHTML(asset.name)}</option>`).join('')}
                </select>
              </div>
              <div class="field">
                <label for="issueUniversityId">University ID</label>
                <input id="issueUniversityId" autocomplete="off" />
              </div>
              <div class="field">
                <label for="issuePersonName">Name</label>
                <input id="issuePersonName" autocomplete="name" />
              </div>
              <div class="field">
                <label for="issuePersonDepartment">Department</label>
                <input id="issuePersonDepartment" />
              </div>
              <div class="field">
                <label for="issuePersonPhone">Phone</label>
                <input id="issuePersonPhone" autocomplete="tel" />
              </div>
              <div class="field">
                <label for="issuePurpose">Purpose</label>
                <input id="issuePurpose" />
              </div>
              <div class="field" style="grid-column:1 / -1;">
                <label for="issueExpectedReturn">Expected Return Date</label>
                <input id="issueExpectedReturn" type="date" />
              </div>
              <div class="field" style="grid-column: 1 / -1;">
                <label>Identity Verification</label>
                <label class="identity-check"><input id="issueIdentityVerified" type="checkbox" /> I verified the person's University ID</label>
              </div>
            </div>

            <div class="section-block" style="margin-top:18px;">
              <div class="inline-label">Asset Information</div>
              <div id="issueAssetDetail" class="detail-grid" style="margin-top:12px;">
                <div class="detail-item"><span class="inline-label">Asset</span><strong>Choose an asset to review details.</strong></div>
                <div class="detail-item"><span class="inline-label">Current Location</span><strong>—</strong></div>
              </div>
            </div>

            <div class="toolbar" style="margin-top:18px;">
              <div></div>
              <div class="toolbar-right">
                <button class="primary-button" id="confirmIssueBtn">Confirm Issue</button>
              </div>
            </div>
          </div>
        </div>

        <div class="panel hidden" id="returnPanel" style="margin-top:24px;">
          <div class="modal-body">
            <div class="field-grid">
              <div class="field">
                <label for="returnAssetSelect">Select issued asset</label>
                <select id="returnAssetSelect">
                  <option value="">Select issued asset</option>
                  ${returnAssets.map((asset) => `<option value="${InventoryWorkflow.escapeHTML(asset.id)}">${InventoryWorkflow.escapeHTML(asset.id)} — ${InventoryWorkflow.escapeHTML(asset.name)}</option>`).join('')}
                </select>
              </div>
              <div class="field">
                <label for="returnIssuedTo">Issued To</label>
                <input id="returnIssuedTo" required />
              </div>
              <div class="field">
                <label for="returnDepartment">Department</label>
                <input id="returnDepartment" required />
              </div>
              <div class="field">
                <label for="returnIssueDate">Issue Date</label>
                <input id="returnIssueDate" type="date" />
              </div>
              <div class="field">
                <label for="returnExpectedDate">Expected Return</label>
                <input id="returnExpectedDate" type="date" />
              </div>
              <div class="field">
                <label for="returnCondition">Condition on Return</label>
                <select id="returnCondition">
                  <option>Good</option>
                  <option>Fair</option>
                  <option>Needs Service</option>
                </select>
              </div>
              <div class="field" style="grid-column:1 / -1;">
                <label for="returnRemarks">Remarks</label>
                <textarea id="returnRemarks"></textarea>
              </div>
            </div>

            <div class="toolbar" style="margin-top:18px;">
              <div></div>
              <div class="toolbar-right">
                <button class="primary-button" id="confirmReturnBtn">Confirm Return</button>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  return { render };
})();

window.IssueReturnPage = IssueReturnPage;
