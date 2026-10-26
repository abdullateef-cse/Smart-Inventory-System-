const InventoryWorkflow = (() => {
  const unavailableConditions = new Set(['needs service', 'critical', 'damaged', 'quarantined']);

  function normalizeItem(value) {
    return String(value || '').trim().toLowerCase();
  }

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
  }

  function assetMatchesItem(asset, itemName) {
    const item = normalizeItem(itemName);
    if (!item) return false;
    return [asset.itemType, asset.name, asset.category]
      .some((value) => {
        const candidate = normalizeItem(value);
        return candidate && (candidate === item || candidate.includes(item) || item.includes(candidate));
      });
  }

  function isServiceableAsset(asset) {
    return !asset.archived
      && !asset.quarantined
      && !asset.damaged
      && !unavailableConditions.has(normalizeItem(asset.condition));
  }

  function isUsableStoreAsset(asset) {
    return asset.status === 'Available' && asset.location === 'Central Store' && isServiceableAsset(asset);
  }

  function getReservedQuantity(reservations, itemName) {
    return (reservations || [])
      .filter((reservation) => ['Active', 'Reserved'].includes(reservation.status) && normalizeItem(reservation.itemName) === normalizeItem(itemName))
      .reduce((total, reservation) => total + Math.max(0, Number(reservation.quantity) || 0), 0);
  }

  function getAvailableQuantity(assets, reservations, itemName) {
    const recordedUsableQuantity = (assets || [])
      .filter((asset) => isUsableStoreAsset(asset) && assetMatchesItem(asset, itemName))
      .reduce((total, asset) => total + Math.max(0, Number(asset.quantity) || 1), 0);
    return Math.max(0, recordedUsableQuantity - getReservedQuantity(reservations, itemName));
  }

  function reserveStock(state, request) {
    const quantity = Number(request.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      return { ok: false, error: 'Request quantity must be a positive whole number.' };
    }
    const existing = (state.reservations || []).find((reservation) => reservation.requestId === request.id && ['Active', 'Reserved'].includes(reservation.status));
    if (existing) {
      return existing.quantity === quantity
        ? { ok: true, reservation: existing }
        : { ok: false, error: 'An active reservation already exists for this request.' };
    }
    const available = getAvailableQuantity(state.assets, state.reservations, request.itemName || request.item);
    if (available < quantity) {
      return { ok: false, error: `Only ${available} usable item${available === 1 ? '' : 's'} are available.` };
    }
    const reservation = {
      id: `RSV-${request.id}`,
      requestId: request.id,
      itemName: request.inventoryItem || request.itemName || request.item,
      quantity,
      status: 'Active',
      createdAt: new Date().toISOString()
    };
    state.reservations ||= [];
    state.reservations.push(reservation);
    return { ok: true, reservation };
  }

  function applyStoreDirectorDecision(state, request, actor, decision, reason = '') {
    if (actor?.role !== 'STORE DIRECTOR') return { ok: false, error: 'Only the Store Director can decide inventory requests.' };
    if (!request || request.status !== 'Pending Approval' || !['Approved', 'Rejected'].includes(decision)) {
      return { ok: false, error: 'This request is not awaiting a Store Director decision.' };
    }
    const decisionReason = String(reason || '').trim();
    if (decision === 'Rejected' && decisionReason.length < 3) {
      return { ok: false, error: 'A rejection reason of at least 3 characters is required.' };
    }

    const decidedAt = new Date().toISOString();
    const approval = {
      decision,
      decidedBy: actor.name,
      decidedByRole: actor.role,
      decidedAt,
      reason: decisionReason
    };
    request.approvalHistory ||= [];
    request.approvalHistory.push(approval);
    request.decision = approval;
    request.status = decision;
    request.timeline = [...(request.timeline || []), {
      label: `${decision} by Store Director${decisionReason ? `: ${decisionReason}` : ''}`,
      date: decidedAt.slice(0, 10)
    }];

    const isPurchaseRequest = request.requestType === 'Purchase Request'
      || (state.procurementRequests || []).some((item) => item.id === request.id);
    if (decision === 'Approved' && !isPurchaseRequest) {
      const itemName = request.itemName || request.item;
      request.inventoryItem = (state.assets || []).find((asset) => isUsableStoreAsset(asset) && assetMatchesItem(asset, itemName))?.itemType || itemName;
      const available = getAvailableQuantity(state.assets, state.reservations, request.inventoryItem);
      request.availability = available;
      const reservationResult = reserveStock(state, request);
      if (reservationResult.ok) {
        request.status = 'Ready for Issue';
        request.fulfillmentStatus = 'Reserved';
        request.reservationId = reservationResult.reservation.id;
      } else {
        const shortage = Number(request.quantity) - available;
        request.status = 'Procurement Required';
        request.fulfillmentStatus = 'Procurement Required';
        request.shortageQuantity = shortage;
        state.procurementRequests ||= [];
        let procurementRequest = state.procurementRequests.find((item) => item.sourceRequestId === request.id);
        if (!procurementRequest) {
          procurementRequest = {
            ...request,
            id: `PR-${new Date().getFullYear()}-${String(state.procurementRequests.length + 1).padStart(3, '0')}`,
            sourceRequestId: request.id,
            quantity: shortage,
            orderedQuantity: 0,
            receivedQuantity: 0,
            receipts: [],
            quotations: [],
            itemCategory: request.itemCategory || 'General Equipment',
            status: 'Pending Procurement',
            approvalStage: 'Request Approved',
            requestType: 'Purchase Request',
            budget: 0,
            description: `Approved request shortage: ${shortage} ${itemName}`
          };
          state.procurementRequests.unshift(procurementRequest);
        }
        request.procurementRequestId = procurementRequest.id;
      }
    }
    return { ok: true, approval, status: request.status };
  }

  return {
    assetMatchesItem,
    escapeHTML,
    isServiceableAsset,
    isUsableStoreAsset,
    getReservedQuantity,
    getAvailableQuantity,
    reserveStock,
    applyStoreDirectorDecision
  };
})();

if (typeof window !== 'undefined') window.InventoryWorkflow = InventoryWorkflow;
if (typeof module !== 'undefined') module.exports = InventoryWorkflow;
