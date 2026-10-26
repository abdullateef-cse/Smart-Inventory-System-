# Shoolini University Inventory Prototype

This is a browser-only refinement of the existing Smart Inventory frontend. It is a demonstration, not a production inventory or procurement system.

## Run locally

From this folder, run:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000` in a browser. The interface uses external CDN scripts for its charts, icons, QR generation, and fonts.

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Super Admin | `admin@shooliniuniversity.com` | `admin123` |
| Store Director | `director@shooliniuniversity.com` | `director123` |
| Store Manager | `store@shooliniuniversity.com` | `store123` |
| HOD (CSE) | `hod@shooliniuniversity.com` | `hod123` |

These credentials and browser-side role checks are for demonstration only. Do not use university or personal passwords here. New user records do not provision real accounts.

## Refined prototype workflow

- HOD requests require an item, positive whole quantity, purpose/justification, priority, and optionally a required-by date. Requests are routed to the Store Director, regardless of the initial stock estimate.
- Only the Store Director can approve or reject a request. Rejection requires a reason, and the decision is added to the request history and the prototype audit log.
- Approval reserves available usable stock. Damaged, quarantined, maintenance, issued, archived, and non-central-store records are excluded from usable Central Store stock.
- If the approved request is short of stock, the shortage is represented by a linked procurement requirement. The Store Manager can record and compare multiple quotations; the prototype does not choose a vendor.
- The Store Manager can receive existing records marked ordered. Receipts can be partial, are bounded by outstanding quantity, retain receipt metadata, and create unique asset records for the received units.
- Issue is limited to approved, reserved requests. Staff must manually identify the asset and confirm recipient identity; no QR/RFID scanner is connected. Returns preserve a movement record and route service-needed assets to maintenance status.
- Super Admin has the broad oversight UI and an audit-log view. This role does not approve requests by default.
- Store Director reports are limited to procurement and request-workflow summaries; Store Managers see central-store inventory, movement, and maintenance reports.
- The Construction & Estates domain is not implemented; construction materials are not treated as part of the internal asset workflow.

## Tests

Run the focused inventory workflow tests with Node.js:

```sh
node --test tests/workflow.test.js
```

The tests cover usable-stock calculations, reservation behavior, Store Director authorization, rejection reasons, and shortage routing.

## Important limitations

- State, sessions, reservations, and audit events are stored in `localStorage`. This is not an authoritative database, is editable by the user, and does not provide cross-user transactions, concurrency safety, secure sessions, backups, or tamper-resistant audit history. Two browser tabs or users can still race on the same stock.
- Frontend role gates are not server-side authorization. Never use this system for real university transactions or sensitive data.
- Financial delegation, purchase-order approvals, and vendor selection rules have not been confirmed. Creating and advancing purchase orders is intentionally not enabled. “Ordered” data already present is illustrative demo data.
- Quotations are structured browser records only. No quotation files or confidential procurement documents should be uploaded or entered.
- Receipt records currently create individually tracked asset entries. A separate quantity-based consumables stock ledger and Construction & Estates model remain to be designed.
- AI, surveillance, CCTV, RFID, and QR scanning are not connected. QR images can be generated for displayed asset identifiers only.
- Some initial inventory, vendors, requests, movements, and surveillance events are generated sample data. Dashboard figures are computed from that prototype data, not university records.
- Attachments, secure file storage, server-side validation, data migration, financial approval controls, and report filters are not production-ready.

## Recommended next steps before deployment

Confirm the Store Director and Super Admin account lifecycle, financial and purchase-order delegations, stock adjustment policy, consumables units and locations, and document retention rules. Then select the university-approved hosting, identity provider, relational database, and file storage. Move authentication, authorization, stock transactions, reservations, and append-only audit events to a backend with transaction-safe operations before any operational use.
