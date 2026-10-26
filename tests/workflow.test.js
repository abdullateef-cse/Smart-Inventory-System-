const test = require('node:test');
const assert = require('node:assert/strict');
const InventoryWorkflow = require('../js/workflow.js');

function createAsset(overrides = {}) {
  return {
    id: 'ASSET-1',
    name: 'Laptop',
    itemType: 'Laptop',
    category: 'IT Equipment',
    quantity: 1,
    status: 'Available',
    condition: 'Good',
    location: 'Central Store',
    ...overrides
  };
}

function createState(assets) {
  return { assets, reservations: [], procurementRequests: [] };
}

function createRequest(id, quantity, overrides = {}) {
  return {
    id,
    itemName: 'Laptop',
    quantity,
    department: 'CSE',
    requestedBy: 'Dr. Sharma',
    status: 'Pending Approval',
    requestType: 'Issue Request',
    ...overrides
  };
}

test('availability excludes damaged, quarantined, committed, and non-store stock', () => {
  const assets = [
    createAsset({ id: 'good', quantity: 3 }),
    createAsset({ id: 'damaged', condition: 'Critical' }),
    createAsset({ id: 'service', condition: 'Needs Service' }),
    createAsset({ id: 'quarantined', quarantined: true }),
    createAsset({ id: 'issued', status: 'Issued' }),
    createAsset({ id: 'other-location', location: 'CSE Lab' })
  ];

  assert.equal(InventoryWorkflow.getAvailableQuantity(assets, [], 'Laptop'), 3);
});

test('reservations reduce available quantity and fulfilled reservations release it', () => {
  const assets = [createAsset({ quantity: 5 })];
  const reservations = [{ itemName: 'Laptop', quantity: 2, status: 'Active' }];

  assert.equal(InventoryWorkflow.getAvailableQuantity(assets, reservations, 'Laptop'), 3);
  reservations[0].status = 'Fulfilled';
  assert.equal(InventoryWorkflow.getAvailableQuantity(assets, reservations, 'Laptop'), 5);
});

test('stock reservation is idempotent for one request and prevents over-allocation in shared state', () => {
  const state = createState([createAsset({ quantity: 3 })]);
  const first = { id: 'REQ-1', itemName: 'Laptop', quantity: 2 };
  const other = { id: 'REQ-2', itemName: 'Laptop', quantity: 2 };

  assert.equal(InventoryWorkflow.reserveStock(state, first).ok, true);
  assert.equal(InventoryWorkflow.reserveStock(state, first).ok, true);
  assert.equal(state.reservations.length, 1);
  assert.equal(InventoryWorkflow.reserveStock(state, other).ok, false);
  assert.equal(InventoryWorkflow.getAvailableQuantity(state.assets, state.reservations, 'Laptop'), 1);
});

test('only Store Director can reject, and a rejection reason is mandatory and retained', () => {
  const state = createState([createAsset()]);
  const request = createRequest('REQ-R', 1);

  assert.equal(InventoryWorkflow.applyStoreDirectorDecision(state, request, { name: 'Manager', role: 'STORE MANAGER' }, 'Approved').ok, false);
  assert.equal(InventoryWorkflow.applyStoreDirectorDecision(state, request, { name: 'Director', role: 'STORE DIRECTOR' }, 'Rejected').ok, false);
  const result = InventoryWorkflow.applyStoreDirectorDecision(state, request, { name: 'Director', role: 'STORE DIRECTOR' }, 'Rejected', 'Insufficient justification');

  assert.equal(result.ok, true);
  assert.equal(request.status, 'Rejected');
  assert.equal(request.decision.reason, 'Insufficient justification');
  assert.equal(request.approvalHistory.length, 1);
});

test('approval reserves sufficient usable stock or routes only the shortage to procurement', () => {
  const state = createState([createAsset({ quantity: 3 })]);
  const director = { name: 'Director', role: 'STORE DIRECTOR' };
  const first = createRequest('REQ-1', 2);
  const second = createRequest('REQ-2', 2);

  assert.equal(InventoryWorkflow.applyStoreDirectorDecision(state, first, director, 'Approved').status, 'Ready for Issue');
  assert.equal(InventoryWorkflow.applyStoreDirectorDecision(state, second, director, 'Approved').status, 'Procurement Required');
  assert.equal(state.reservations[0].quantity, 2);
  assert.equal(state.procurementRequests[0].sourceRequestId, second.id);
  assert.equal(state.procurementRequests[0].quantity, 1);
  assert.equal(state.procurementRequests[0].status, 'Pending Procurement');
});

test('invalid request quantity cannot reserve stock', () => {
  const state = createState([createAsset({ quantity: 5 })]);
  assert.equal(InventoryWorkflow.reserveStock(state, { id: 'REQ-0', itemName: 'Laptop', quantity: 0 }).ok, false);
  assert.equal(state.reservations.length, 0);
});
