const InventoryData = (() => {
  const STORAGE_KEY = 'school_inventory_proto_v1';

  const departmentCatalog = [
    'CSE', 'ECE', 'Mechanical', 'Civil', 'Management', 'Operations', 'Estates', 'Administration', 'Library', 'Labs', 'Central Store'
  ];

  const vendorCatalog = [
    { name: 'Dell Technologies', category: 'IT Equipment', rating: 4.8 },
    { name: 'HP India', category: 'IT Equipment', rating: 4.6 },
    { name: 'Seimens', category: 'Electrical', rating: 4.7 },
    { name: 'LG Electronics', category: 'Audio/Video', rating: 4.4 },
    { name: 'Modern Office', category: 'Furniture', rating: 4.5 },
    { name: 'Cisco Systems', category: 'Networking', rating: 4.9 },
    { name: 'Bosch Service', category: 'Maintenance', rating: 4.3 },
    { name: 'Mohan Traders', category: 'Stationery', rating: 4.2 }
  ];

  const assetCatalog = [
    { type: 'Laptop', code: 'LAP', category: 'IT Equipment', family: 'Dell Latitude 7440' },
    { type: 'Desktop', code: 'PC', category: 'IT Equipment', family: 'Dell OptiPlex 7000' },
    { type: 'Projector', code: 'PROJ', category: 'Audio/Video', family: 'Epson EB-X06' },
    { type: 'Printer', code: 'PRN', category: 'Office Equipment', family: 'HP LaserJet MFP' },
    { type: 'Chair', code: 'CHR', category: 'Furniture', family: 'Ergo Executive Chair' },
    { type: 'Table', code: 'TAB', category: 'Furniture', family: 'Wooden Workstation Table' },
    { type: 'Network Device', code: 'NET', category: 'Networking', family: 'Cisco Catalyst 9300' },
    { type: 'CCTV Camera', code: 'CAM', category: 'Surveillance', family: 'Hikvision 4MP' },
    { type: 'Lab Equipment', code: 'LAB', category: 'Laboratory', family: 'Digital Oscilloscope' },
    { type: 'Tool', code: 'TOOL', category: 'Maintenance', family: 'Impact Driver Kit' },
    { type: 'Electrical Equipment', code: 'ELEC', category: 'Electrical', family: 'UPS 3kVA' },
    { type: 'Stationery', code: 'STN', category: 'Stationery', family: 'Office Stationery Kit' },
    { type: 'Sports Equipment', code: 'SPT', category: 'Sports', family: 'Badminton Set' },
    { type: 'Audio System', code: 'AUD', category: 'Audio/Video', family: 'Yamaha PA System' }
  ];

  const statusOptions = ['Available', 'Issued', 'Maintenance', 'Missing'];
  const conditionOptions = ['Good', 'Fair', 'Needs Service', 'Critical'];
  const issueRequestCatalog = [
    { id: 'IR-2026-001', department: 'CSE', requestedBy: 'Abdul Lateef', item: 'Projector', quantity: 1, priority: 'High', status: 'Approved', purpose: 'Lecture hall presentation setup', person: 'Abdul Lateef', universityId: '23CSE1042' },
    { id: 'IR-2026-002', department: 'ECE', requestedBy: 'Riya Sharma', item: 'Laptop', quantity: 1, priority: 'High', status: 'Approved', purpose: 'Embedded lab testing', person: 'Riya Sharma', universityId: '23ECE2041' },
    { id: 'IR-2026-003', department: 'Mechanical', requestedBy: 'Nitin Das', item: '3D Printer', quantity: 1, priority: 'Medium', status: 'Pending', purpose: 'Design prototyping', person: 'Nitin Das', universityId: '24MEC1401' },
    { id: 'IR-2026-004', department: 'Civil', requestedBy: 'Aditi Verma', item: 'Survey Kit', quantity: 2, priority: 'Medium', status: 'Approved', purpose: 'Field measurement survey', person: 'Aditi Verma', universityId: '24CIV1128' }
  ];

  function generateRFID() {
    return `SU-RFID-${String(Math.floor(1000 + Math.random() * 9000))}`;
  }

  function generateAssetId(categoryCode, index) {
    return `SU-${categoryCode}-${String(index).padStart(4, '0')}`;
  }

  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function formatDate(daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  }

  function toTitleCase(value) {
    return value
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  function createInitialAssets() {
    const assets = [];

    for (let i = 0; i < 52; i += 1) {
      const catalogItem = assetCatalog[i % assetCatalog.length];
      const department = departmentCatalog[i % departmentCatalog.length];
      const vendor = vendorCatalog[i % vendorCatalog.length];
      const statusIndex = i % 4;
      const status = statusOptions[statusIndex];
      const condition = conditionOptions[i % conditionOptions.length];
      const currentLocation = status === 'Issued' ? 'CSE Lab' : i % 3 === 0 ? 'Central Store' : `${department} Lab`;
      const custodian = status === 'Issued' ? ['Abdul Lateef', 'Riya Sharma', 'Imran Khan', 'Aditi Verma', 'Nitin Das'][i % 5] : 'Central Store';
      const id = generateAssetId(catalogItem.code, i + 1);

      assets.push({
        id,
        name: `${catalogItem.family} ${i + 1}`,
        category: catalogItem.category,
        itemType: catalogItem.type,
        brand: vendor.name.split(' ')[0],
        model: `${catalogItem.family.split(' ')[0]} ${i + 1}`,
        serialNumber: `${catalogItem.code}-${String(1000 + i)}`,
        qrCode: id,
        rfidTag: generateRFID(),
        department,
        location: currentLocation,
        custodian,
        status,
        condition,
        purchaseDate: formatDate(180 + i),
        vendor: vendor.name,
        purchaseCost: (5000 + i * 1300) + getRandomInt(0, 4000),
        warranty: '36 months',
        amc: i % 2 === 0 ? 'Active AMC' : 'Expired',
        quantity: 1,
        image: null,
        movementHistory: [],
        maintenanceHistory: [],
        procurementId: null,
        lastUpdated: new Date().toISOString()
      });
    }

    return assets;
  }

  function createInitialMovements(assets) {
    const movementList = [];
    const names = ['Abdul Lateef', 'Riya Sharma', 'Nitin Das', 'Aditi Verma', 'Imran Khan', 'Store Manager'];

    for (let i = 0; i < 20; i += 1) {
      const asset = assets[i % assets.length];
      const from = i % 3 === 0 ? 'Vendor' : i % 3 === 1 ? 'Central Store' : `${asset.department} Lab`;
      const to = i % 2 === 0 ? 'Central Store' : `${asset.department} Lab`;
      const person = names[i % names.length];
      const status = i % 2 === 0 ? 'Issued' : 'Returned';

      movementList.push({
        id: `MOV-${String(i + 1).padStart(3, '0')}`,
        assetId: asset.id,
        asset: asset.name,
        from,
        to,
        person,
        time: `${String(8 + (i % 12)).padStart(2, '0')}:${String(10 + (i * 9) % 50).padStart(2, '0')} AM`,
        timestamp: new Date(Date.now() - i * 8600000).toISOString(),
        status,
        movementType: i % 2 === 0 ? 'Issue' : 'Return'
      });
    }

    return movementList;
  }

  function createInitialMaintenance(assets) {
    const list = [];
    for (let i = 0; i < 10; i += 1) {
      const asset = assets[(i * 5) % assets.length];
      list.push({
        id: `MT-${String(i + 1).padStart(3, '0')}`,
        assetId: asset.id,
        asset: asset.name,
        issue: i % 2 === 0 ? 'Cooling issue' : 'Battery replacement',
        department: asset.department,
        reportedDate: formatDate(10 + i),
        assignedVendor: vendorCatalog[i % vendorCatalog.length].name,
        expectedCompletion: formatDate(3 + i),
        status: i % 3 === 0 ? 'In Progress' : 'Scheduled'
      });
    }
    return list;
  }

  function createProcurementRequests() {
    const reqs = [];
    const departments = ['CSE', 'ECE', 'Mechanical', 'Civil', 'Administration', 'Operations', 'Estates', 'Library'];
    const items = [
      'Dell Laptops', 'Projectors', 'Network Switches', 'Printers', 'Office Chairs', 'UPS Units',
      'CCTV Cameras', 'Lab Equipment', 'Work Tables', 'Library Desks', 'Air Purifiers'
    ];

    for (let i = 0; i < 10; i += 1) {
      const statusList = ['Pending Approval', 'Approved', 'PO Created', 'Ordered', 'Received', 'Rejected'];
      const status = statusList[i % statusList.length];
      reqs.push({
        id: `PR-2026-${String(i + 1).padStart(3, '0')}`,
        department: departments[i % departments.length],
        itemCategory: 'IT Equipment',
        itemName: items[i % items.length],
        quantity: 8 + (i % 5) * 3,
        requestedBy: ['Dr. Sharma', 'Prof. Singh', 'Mr. Ali', 'Mrs. Verma', 'Mr. Hassan'][i % 5],
        date: formatDate(20 + i),
        requiredDate: formatDate(8 + i),
        priority: ['High', 'Medium', 'Low'][i % 3],
        status,
        purpose: 'Departmental requirement for new academic and operational support.',
        budget: 58000 + i * 9500,
        description: 'Equipment procurement for current semester upgrade and replacement cycle.',
        attachments: ['budget.xlsx', 'specification.pdf'],
        approvalStage: status === 'Rejected' ? 'Rejected' : ['Pending', 'Approved', 'PO Created', 'Ordered', 'Received'][i % 5]
      });
    }

    return reqs;
  }

  function createSurveillanceEvents() {
    const eventSeed = [
      'Asset movement detected',
      'RFID tag detected',
      'Authorized person detected',
      'Unauthorized movement detected',
      'Inventory threshold warning',
      'Receipt verified at loading bay'
    ];

    const list = [];
    for (let i = 0; i < 15; i += 1) {
      list.push({
        id: `EVT-${i + 1}`,
        time: `${String(9 + (i % 12)).padStart(2, '0')}:${String(10 + (i * 7) % 50).padStart(2, '0')}:${String(12 + (i * 13) % 48).padStart(2, '0')}`,
        text: `${eventSeed[i % eventSeed.length]}${i % 3 === 0 ? ' - Asset SU-LAP-0001' : ''}`,
        severity: i === 11 ? 'warning' : i % 4 === 0 ? 'success' : 'info'
      });
    }
    return list;
  }

  function createIssueRequests() {
    return issueRequestCatalog.map((request) => ({
      ...request,
      requestType: 'Issue Request',
      itemName: request.item,
      quantity: request.quantity,
      date: formatDate(7 + Math.random() * 12),
      priority: request.priority,
      status: request.status,
      requestId: request.id,
      purpose: request.purpose,
      approvals: ['Approved', 'Pending', 'Rejected']
    }));
  }

  function createInitialState() {
    const assets = createInitialAssets();
    const movements = createInitialMovements(assets);
    const maintenance = createInitialMaintenance(assets);
    const procurementRequests = createProcurementRequests();
    const issueRequests = createIssueRequests();
    const departmentSummary = departmentCatalog.map((name) => {
      const departmentAssets = assets.filter((asset) => asset.department === name);
      return {
        id: `DEP-${departmentCatalog.indexOf(name) + 1}`,
        name,
        totalAssets: departmentAssets.length,
        issued: departmentAssets.filter((asset) => asset.status === 'Issued').length,
        available: departmentAssets.filter((asset) => asset.status === 'Available').length,
        maintenance: departmentAssets.filter((asset) => asset.status === 'Maintenance').length,
        pendingRequests: departmentAssets.length > 0 ? (departmentAssets.length % 4) : 0
      };
    });

    const state = {
      selectedRole: 'SUPER ADMIN',
      currentPage: 'dashboard',
      searchTerm: '',
      filters: {
        inventory: {
          department: 'All',
          category: 'All',
          location: 'All',
          status: 'All',
          condition: 'All',
          vendor: 'All'
        }
      },
      departments: departmentSummary,
      vendors: vendorCatalog.map((vendor, index) => ({
        id: `VEN-${index + 1}`,
        name: vendor.name,
        contactPerson: ['Mr. Arjun', 'Ms. Priya', 'Mr. Vikas', 'Ms. Nisha', 'Mr. Zafar', 'Ms. Sanya', 'Mr. Dinesh', 'Ms. Rhea'][index],
        phone: `+91 98${index}${String(1000000 + getRandomInt(0, 999999)).slice(0, 7)}`,
        email: `${vendor.name.toLowerCase().replace(/\s+/g, '')}@example.com`,
        category: vendor.category,
        totalOrders: 36 + index * 4,
        totalPurchaseValue: 960000 + index * 150000,
        rating: vendor.rating,
        status: index % 3 === 0 ? 'Active' : 'Verified'
      })),
      users: [
        { id: 'USR-001', name: 'Inventory Administrator', email: 'admin@shooliniuniversity.com', role: 'SUPER ADMIN', department: 'University Administration', active: true },
        { id: 'USR-002', name: 'Central Store Manager', email: 'store@shooliniuniversity.com', role: 'STORE MANAGER', department: 'Central Store', active: true },
        { id: 'USR-003', name: 'Dr. Sharma', email: 'hod@shooliniuniversity.com', role: 'HOD', department: 'CSE', active: true },
        { id: 'USR-004', name: 'Store Director', email: 'director@shooliniuniversity.com', role: 'STORE DIRECTOR', department: 'Central Store', active: true }
      ],
      settings: {
        universityName: 'School of Engineering & Technology',
        systemOwner: 'Central Store Manager',
        departments: departmentCatalog.join(', '),
        locations: 'Central Store, CSE Lab, ECE Lab, Library, Estates',
        assetCategories: 'IT Equipment, Furniture, Networking, Electrical, Audio/Video, Laboratory',
        notificationSettings: 'All workflow alerts',
        backupFrequency: 'Daily',
        reviewCycle: 'Quarterly',
        inventoryPolicy: 'Active'
      },
      assets,
      reservations: [],
      auditLog: [],
      procurementRequests,
      issueRequests,
      requests: [
        ...procurementRequests.map((request) => ({ ...request, requestType: 'Purchase Request' })),
        ...issueRequests.map((request) => ({ ...request, requestType: 'Issue Request' }))
      ],
      movements,
      maintenance,
      surveillanceEvents: createSurveillanceEvents(),
      notifications: [
        'Procurement request awaiting approval.',
        'RFID anomaly detected in Central Store.',
        'Asset SU-LAP-0015 issued successfully.'
      ],
      ui: {
        theme: 'default',
        sidebarCollapsed: false,
        selectedZone: 'A'
      }
    };

    assets.forEach((asset) => {
      if (asset.status === 'Issued') {
        asset.movementHistory = [
          {
            date: formatDate(2),
            event: `Central Store → ${asset.location}`,
            details: `Issued to ${asset.custodian}`
          },
          {
            date: formatDate(16),
            event: 'Vendor → Central Store',
            details: 'Received and verified'
          }
        ];
      } else {
        asset.movementHistory = [
          {
            date: formatDate(8),
            event: `${asset.location} → Central Store`,
            details: 'Returned and verified'
          },
          {
            date: formatDate(18),
            event: 'Vendor → Central Store',
            details: 'Received and tagged'
          }
        ];
      }
    });

    return state;
  }

  function ensureState() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      const initial = createInitialState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }

    try {
      const parsed = JSON.parse(stored);
      const base = createInitialState();
      const migrateStatus = (request) => ({
        ...request,
        status: ['Pending Store Review', 'Store Manager Review', 'Pending Admin Approval'].includes(request.status)
          ? 'Pending Approval'
          : request.status
      });
      const issueRequests = Array.isArray(parsed.issueRequests)
        ? parsed.issueRequests.map(migrateStatus)
        : base.issueRequests;
      const procurementRequests = Array.isArray(parsed.procurementRequests)
        ? parsed.procurementRequests.map(migrateStatus)
        : base.procurementRequests;
      const reservations = Array.isArray(parsed.reservations) ? parsed.reservations : [];
      const issueRequestStatuses = new Map(issueRequests.map((request) => [request.id, request.status]));
      const reconciledReservations = reservations.map((reservation) => {
        if (
          ['Active', 'Reserved'].includes(reservation.status) &&
          ['Issued', 'Completed'].includes(issueRequestStatuses.get(reservation.requestId))
        ) {
          return { ...reservation, status: 'Fulfilled' };
        }
        return reservation;
      });
      const users = Array.isArray(parsed.users)
        ? parsed.users.map((user) => ({ ...user, role: user.role === 'ADMIN' ? 'SUPER ADMIN' : user.role }))
        : base.users;
      const directorAccount = base.users.find((user) => user.role === 'STORE DIRECTOR');
      if (!users.some((user) => user.email === directorAccount.email)) users.push(directorAccount);
      const normalizedRole = (() => {
        const raw = parsed.selectedRole || base.selectedRole;
        if (raw === 'SUPER ADMIN' || raw === 'INVENTORY ADMIN' || raw === 'ADMIN') return 'SUPER ADMIN';
        if (raw === 'DEPARTMENT ADMIN' || raw === 'STAFF' || raw === 'HEAD OF DEPARTMENT' || raw === 'HOD') return 'HOD';
        if (raw === 'STORE MANAGER' || raw === 'STORE DIRECTOR') return raw;
        return base.selectedRole;
      })();

      const hydrated = {
        ...base,
        ...parsed,
        selectedRole: normalizedRole,
        issueRequests,
        requests: [
          ...procurementRequests.map((request) => ({ ...request, requestType: 'Purchase Request' })),
          ...issueRequests.map((request) => ({ ...request, requestType: 'Issue Request' }))
        ],
        procurementRequests,
        reservations: reconciledReservations,
        auditLog: Array.isArray(parsed.auditLog) ? parsed.auditLog : [],
        assets: Array.isArray(parsed.assets) ? parsed.assets : base.assets,
        movements: Array.isArray(parsed.movements) ? parsed.movements : base.movements,
        maintenance: Array.isArray(parsed.maintenance) ? parsed.maintenance : base.maintenance,
        surveillanceEvents: Array.isArray(parsed.surveillanceEvents) ? parsed.surveillanceEvents : base.surveillanceEvents,
        notifications: Array.isArray(parsed.notifications) ? parsed.notifications : base.notifications,
        departments: Array.isArray(parsed.departments) ? parsed.departments : base.departments,
        vendors: Array.isArray(parsed.vendors) ? parsed.vendors : base.vendors,
        users,
        settings: parsed.settings && typeof parsed.settings === 'object' ? { ...base.settings, ...parsed.settings } : base.settings
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(hydrated));
      return hydrated;
    } catch (error) {
      localStorage.removeItem(STORAGE_KEY);
      const initial = createInitialState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function getDepartmentLabels() {
    return departmentCatalog;
  }

  function getVendorNames() {
    return vendorCatalog.map((item) => item.name);
  }

  function getStatusList() {
    return statusOptions;
  }

  return {
    STORAGE_KEY,
    getDepartmentLabels,
    getVendorNames,
    getStatusList,
    createInitialState,
    ensureState,
    saveState,
    generateAssetId,
    generateRFID,
    toTitleCase,
    formatDate
  };
})();

window.InventoryData = InventoryData;
