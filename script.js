/* ==========================================================================
   VendorBridge ERP - Core Logic & State Management (AI Enabled)
   ========================================================================== */

// --- STATE MANAGEMENT ---
let currentUser = null;
let isSignupMode = false;
let currentLogFilter = 'all';

// --- MOCK DATABASE ---
const db = {
    users: [
        { id: 1, name: "Ayush Shah",     email: "admin@vendorbridge.com",   password: "Admin@123",   role: "admin",   status: "Active" },
        { id: 2, name: "Pravina Parmar", email: "po@vendorbridge.com",      password: "PO@1234",     role: "po",      status: "Active" },
        { id: 3, name: "TechCorp India", email: "vendor@techcorp.com",      password: "Vendor@123",  role: "vendor",  status: "Active" },
        { id: 4, name: "Saumil Patel",   email: "manager@vendorbridge.com", password: "Manager@123", role: "manager", status: "Active" }
    ],
    pendingRegistrations: [],
    vendors: [
        { id: "V-101", name: "TechCorp India", category: "IT Hardware", gst: "22AAAAA0000A1Z5", rating: 4.8, status: "Active" },
        { id: "V-102", name: "Office Supplies Co", category: "Stationery", gst: "27BBBBB0000B1Z5", rating: 4.2, status: "Active" },
        { id: "V-103", name: "Global Softwares", category: "Software", gst: "29CCCCC0000C1Z5", rating: 4.9, status: "Pending" }
    ],
    rfqs: [
        { id: "RFQ-2025-041", title: "Laptops for New Batch", items: "ThinkPad T14", qty: 50, deadline: "2026-06-15", status: "Open" },
        { id: "RFQ-2025-042", title: "Office Chairs", items: "Ergonomic Chairs", qty: 100, deadline: "2026-06-20", status: "Open" },
        { id: "RFQ-2025-043", title: "Server Licenses", items: "Windows Server 2022", qty: 5, deadline: "2026-06-10", status: "Closed" }
    ],
    // UPDATED FOR AI: Added deliveryTime, rating, warranty, and onTimeDeliveryRate
    quotations: [
        { id: "Q-9912", rfqId: "RFQ-2025-041", vendorName: "TechCorp India", amount: 90000, deliveryTime: 7, rating: 3.5, warranty: "1 year", onTimeDeliveryRate: 85, delivery: "7 Days", status: "Pending" },
        { id: "Q-9913", rfqId: "RFQ-2025-041", vendorName: "Dell Distributors", amount: 92000, deliveryTime: 2, rating: 4.9, warranty: "3 years", onTimeDeliveryRate: 96, delivery: "2 Days", status: "Pending" },
        { id: "Q-9914", rfqId: "RFQ-2025-042", vendorName: "Office Supplies Co", amount: 88000, deliveryTime: 14, rating: 4.0, warranty: "1 year", onTimeDeliveryRate: 90, delivery: "14 Days", status: "Approved" }
    ],
    approvals: [
        { id: "APP-401", type: "Quotation Review", ref: "Q-9912", submittedBy: "Pravina Parmar", amount: 90000, status: "Pending" },
        { id: "APP-402", type: "Purchase Order", ref: "PO-8001", submittedBy: "Pravina Parmar", amount: 88000, status: "Approved" }
    ],
    pos: [
        { id: "PO-8001", vendorName: "Office Supplies Co", date: "2026-06-05", amount: 88000, status: "Sent" },
        { id: "PO-8002", vendorName: "TechCorp India", date: "2026-06-01", amount: 120000, status: "Delivered" }
    ],
    invoices: [
        { id: "INV-5051", poId: "PO-8001", vendorName: "Office Supplies Co", tax: 15840, total: 103840, status: "Pending" },
        { id: "INV-5052", poId: "PO-8002", vendorName: "TechCorp India", tax: 21600, total: 141600, status: "Paid" }
    ],
    logs: [
        { time: "10 mins ago", action: "Invoice INV-5052 marked as Paid", user: "System Admin", category: "Invoices", icon: "fa-file-invoice" },
        { time: "1 hour ago", action: "PO-8001 sent to vendor", user: "Procurement Officer", category: "Approvals", icon: "fa-check" },
        { time: "3 hours ago", action: "Manager approved Q-9914", user: "Manager", category: "Approvals", icon: "fa-clock" },
        { time: "1 day ago", action: "TechCorp submitted quotation Q-9912", user: "Vendor", category: "RFQ", icon: "fa-file-alt" },
        { time: "2 days ago", action: "FastLog transport registered", user: "System Admin", category: "Vendors", icon: "fa-building" }
    ]
};

// ==========================================================================
// PERSISTENCE — save/load users & pending registrations to localStorage
// ==========================================================================
function persistUsers() {
    try {
        localStorage.setItem('vb_users', JSON.stringify(db.users));
        localStorage.setItem('vb_pending', JSON.stringify(db.pendingRegistrations));
    } catch(e) {}
}
window.loadPersistedUsers = function loadPersistedUsers() {
    try {
        const u = localStorage.getItem('vb_users');
        const p = localStorage.getItem('vb_pending');
        if (u) db.users = JSON.parse(u);
        if (p) db.pendingRegistrations = JSON.parse(p);
    } catch(e) {}
}
loadPersistedUsers();

// --- ROLE CONFIGURATION MATRIX ---
const rolesMap = {
    po: {
        name: "Procurement Officer",
        menus: [
            { id: "dashboard", label: "Dashboard", icon: "fa-home" },
            { id: "rfqs", label: "RFQs", icon: "fa-file-alt" },
            { id: "quotations", label: "Quotations", icon: "fa-comment-dollar" },
            { id: "compare", label: "Compare Quotes", icon: "fa-balance-scale" },
            { id: "pos", label: "Purchase Orders", icon: "fa-shopping-cart" },
            { id: "invoices", label: "Invoices", icon: "fa-file-invoice-dollar" }
        ],
        actions: ['create_rfq', 'generate_po', 'generate_invoice', 'review_quotes']
    },
    vendor: {
        name: "Registered Vendor",
        menus: [
            { id: "dashboard", label: "Dashboard", icon: "fa-home" },
            { id: "rfqs", label: "Open RFQs", icon: "fa-file-alt" },
            { id: "quotations", label: "My Quotations", icon: "fa-comment-dollar" },
            { id: "pos", label: "My Orders", icon: "fa-shopping-cart" },
            { id: "invoices", label: "My Invoices", icon: "fa-file-invoice-dollar" }
        ],
        actions: ['submit_quotation']
    },
    manager: {
        name: "Workflow Manager",
        menus: [
            { id: "dashboard", label: "Dashboard", icon: "fa-home" },
            { id: "approvals", label: "Pending Approvals", icon: "fa-check-double" },
            { id: "analytics", label: "Activity Logs", icon: "fa-history" }
        ],
        actions: ['approve_reject']
    },
    admin: {
        name: "System Admin",
        menus: [
            { id: "dashboard", label: "Dashboard", icon: "fa-home" },
            { id: "users",     label: "User Management", icon: "fa-users" },
            { id: "vendors",   label: "Vendor Directory", icon: "fa-building" },
            { id: "reports",   label: "Reports & Analytics", icon: "fa-chart-bar" },
            { id: "analytics", label: "Activity & Logs", icon: "fa-history" }
        ],
        actions: ['manage_users', 'manage_vendors', 'view_analytics', 'view_reports']
    }
};

// --- DOM ELEMENT REFERENCES ---
const screens = {
    login: document.getElementById('login-screen'),
    app: document.getElementById('app-screen')
};

// ==========================================================================
// SECURE AUDIT LOGGING  
// ==========================================================================
async function saveSecureLog(actionText, categoryName) {
    db.logs.unshift({
        time: "Just now",
        action: actionText,
        user: currentUser ? currentUser.name : "System",
        category: categoryName,
        icon: "fa-shield-alt"
    });

    try {
        await fetch('http://127.0.0.1:8000/api/logs/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: actionText,
                category: categoryName,
                user: currentUser ? currentUser.name : "System"
            })
        });
    } catch (err) {
        console.warn("Audit log saved locally only. Django offline:", err.message);
    }
}

// ==========================================================================
// INITIALIZATION & EVENT LISTENERS
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {

    // ── Login form ──
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email').value.trim().toLowerCase();
        const pass  = document.getElementById('auth-pass').value;
        const errEl = document.getElementById('login-error');
        const user  = db.users.find(u => u.email.toLowerCase() === email && u.password === pass);
        if (!user) { errEl.style.display='block'; errEl.textContent='Invalid email or password.'; return; }
        if (user.status === 'Inactive') { errEl.style.display='block'; errEl.textContent='Your account has been deactivated.'; return; }
        errEl.style.display = 'none';
        loginUser(user);
    });

    // ── Sign-up form ──
    document.getElementById('signup-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const name    = document.getElementById('signup-name').value.trim();
        const company = document.getElementById('signup-company').value.trim();
        const email   = document.getElementById('signup-email').value.trim().toLowerCase();
        const pass    = document.getElementById('signup-pass').value;
        const role    = document.getElementById('signup-role').value;
        const errEl   = document.getElementById('signup-error');
        if (db.users.find(u => u.email.toLowerCase() === email) ||
            db.pendingRegistrations.find(u => u.email.toLowerCase() === email)) {
            errEl.style.display='block'; errEl.textContent='Email already registered or pending approval.'; return;
        }
        const reg = { id: Date.now(), name: company || name, email, password: pass, role, status: 'Pending', registeredAt: new Date().toLocaleDateString() };
        db.pendingRegistrations.push(reg);
        persistUsers();
        errEl.style.display='none';
        showAuthPanel('login');
        alert(`Account request submitted!\nAn admin will review and approve your account.\nEmail: ${email}`);
    });

    // ── Forgot-password form ──
    document.getElementById('forgot-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const email  = document.getElementById('forgot-email').value.trim().toLowerCase();
        const resEl  = document.getElementById('forgot-result');
        const user   = db.users.find(u => u.email.toLowerCase() === email);
        if (!user) { resEl.style.display='block'; resEl.style.color='#EF4444'; resEl.textContent='No account found with that email.'; return; }
        resEl.style.display='block'; resEl.style.color='#10B981';
        resEl.textContent=`Your password is: ${user.password}`;
    });

    // ── Auth panel switchers ──
    document.getElementById('to-signup-link').addEventListener('click', (e) => { e.preventDefault(); showAuthPanel('signup'); });
    document.getElementById('to-login-link').addEventListener('click',  (e) => { e.preventDefault(); showAuthPanel('login'); });
    document.getElementById('forgot-link').addEventListener('click',    (e) => { e.preventDefault(); showAuthPanel('forgot'); });
    document.getElementById('back-to-login').addEventListener('click',  (e) => { e.preventDefault(); showAuthPanel('login'); });

    document.getElementById('logout-btn').addEventListener('click', () => {
        screens.app.classList.remove('active');
        screens.login.classList.add('active');
        currentUser = null;
    });

    document.getElementById('menu-toggle').addEventListener('click', () => document.getElementById('sidebar').classList.add('active'));
    document.getElementById('close-sidebar').addEventListener('click', () => document.getElementById('sidebar').classList.remove('active'));

    document.querySelectorAll('.search-bar input').forEach(input => {
        input.addEventListener('keyup', function () {
            const term      = this.value.toLowerCase();
            const tableBody = this.closest('.page').querySelector('.data-table tbody');
            if (!tableBody) return;
            tableBody.querySelectorAll('tr').forEach(row => {
                row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none';
            });
        });
    });

    const compareSelector = document.getElementById('compare-rfq-selector');
    if (compareSelector) {
        compareSelector.addEventListener('change', (e) => renderCompareView(e.target.value));
    }

    const filterContainer = document.getElementById('log-filter-buttons');
    if (filterContainer) {
        filterContainer.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                filterContainer.querySelectorAll('button').forEach(b => b.className = 'btn btn-outline');
                e.target.className = 'btn btn-primary';
                currentLogFilter = e.target.getAttribute('data-filter');
                renderActivityPage();
            }
        });
    }

    setupDynamicForms();

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('active');
        });
    });
});

// ==========================================================================
// CORE AUTH
// ==========================================================================
function showAuthPanel(panel) {
    document.getElementById('login-form').style.display  = panel === 'login'  ? 'block' : 'none';
    document.getElementById('signup-form').style.display = panel === 'signup' ? 'block' : 'none';
    document.getElementById('forgot-form').style.display = panel === 'forgot' ? 'block' : 'none';
    // clear errors
    ['login-error','signup-error','forgot-result'].forEach(id => {
        const el = document.getElementById(id); if(el) el.style.display='none';
    });
}

function loginUser(user) {
    currentUser = { id: user.id, role: user.role, name: user.name, email: user.email };

    document.getElementById('sidebar-name').innerText   = currentUser.name;
    document.getElementById('welcome-name').innerText   = currentUser.name.split(' ')[0];
    document.getElementById('sidebar-role').innerText   = rolesMap[user.role].name;
    document.getElementById('sidebar-avatar').innerText = currentUser.name.charAt(0).toUpperCase();

    renderSidebar(user.role);
    applyPermissions(user.role);
    renderDashboardStats();
    renderTables();
    renderActivityPage();

    screens.login.classList.remove('active');
    screens.app.classList.add('active');
    switchPage('dashboard', 'Dashboard');
}

// ==========================================================================
// NAVIGATION & PERMISSIONS
// ==========================================================================
function renderSidebar(roleId) {
    const sidebarNav = document.getElementById('sidebar-nav');
    sidebarNav.innerHTML = '';
    rolesMap[roleId].menus.forEach((menu, index) => {
        const a = document.createElement('a');
        a.className = `nav-item ${index === 0 ? 'active' : ''}`;
        a.innerHTML = `<i class="fas ${menu.icon}"></i> ${menu.label}`;
        a.onclick = (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            a.classList.add('active');
            switchPage(menu.id, menu.label);
            if (window.innerWidth <= 992) document.getElementById('sidebar').classList.remove('active');
        };
        sidebarNav.appendChild(a);
    });
}

function switchPage(pageId, title) {
    document.getElementById('topbar-title').innerText = title;
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(`page-${pageId}`).classList.add('active');
    
    if (pageId === 'compare') {
        const sel = document.getElementById('compare-rfq-selector');
        if (sel) renderCompareView(sel.value);
    }
    if (pageId === 'analytics') {
        renderActivityPage();
    }
    if (pageId === 'reports') {
        renderReportsPage();
    }
    if (pageId === 'users') {
        loadPersistedUsers();
        renderTables();
    }
}

function checkPermission(role, action) {
    return rolesMap[role] && rolesMap[role].actions.includes(action);
}

function applyPermissions(roleId) {
    // Hide Actions column header in RFQ and Quotations tables for po and vendor
    if (roleId === 'po' || roleId === 'vendor') {
        document.querySelectorAll('#page-rfqs th:last-child, #page-quotations th:last-child').forEach(th => {
            if (th.textContent.trim() === 'Actions') th.style.display = 'none';
        });
    } else {
        document.querySelectorAll('#page-rfqs th:last-child, #page-quotations th:last-child').forEach(th => {
            th.style.display = '';
        });
    }

    const btnCreateRfq = document.getElementById('btn-create-rfq');
    if (btnCreateRfq) {
        if (checkPermission(roleId, 'create_rfq')) {
            btnCreateRfq.style.display = 'inline-flex';
            btnCreateRfq.onclick = () => openModal('modal-rfq');
        } else {
            btnCreateRfq.style.display = 'none';
        }
    }

    const actionPanel = document.getElementById('dashboard-actions');
    if (!actionPanel) return;
    actionPanel.innerHTML = '';

    if (roleId === 'po') {
        actionPanel.innerHTML += `<button class="btn btn-primary" onclick="openModal('modal-rfq')"><i class="fas fa-plus"></i> Create RFQ</button>`;
        actionPanel.innerHTML += `<button class="btn btn-outline" onclick="switchPage('compare', 'Compare Quotes')">Review Quotes</button>`;
    } else if (roleId === 'vendor') {
        actionPanel.innerHTML += `<button class="btn btn-primary" onclick="switchPage('rfqs', 'Open RFQs')"><i class="fas fa-search"></i> Browse Active RFQs</button>`;
    } else if (roleId === 'manager') {
        const pendingCount = db.approvals.filter(a => a.status === 'Pending').length;
        actionPanel.innerHTML += `<button class="btn btn-primary" onclick="switchPage('approvals', 'Approvals')"><i class="fas fa-check"></i> Pending Approvals (${pendingCount})</button>`;
    } else if (roleId === 'admin') {
        actionPanel.innerHTML += `<button class="btn btn-primary" onclick="openModal('modal-vendor')"><i class="fas fa-user-plus"></i> Add Vendor</button>`;
        actionPanel.innerHTML += `<button class="btn btn-outline" onclick="openModal('modal-add-user')"><i class="fas fa-user"></i> Add User</button>`;
    }
}

// ==========================================================================
// DATA RENDERING
// ==========================================================================
const formatCur = (num) => '₹' + Number(num).toLocaleString('en-IN');

function getBadge(status) {
    let cls = 'open';
    const s = (status || '').toLowerCase();
    if (s === 'pending')                                            cls = 'pending';
    if (['approved', 'active', 'paid', 'delivered'].includes(s))  cls = 'approved';
    if (['closed', 'rejected'].includes(s))                        cls = 'rejected';
    return `<span class="badge ${cls}">${status}</span>`;
}

function renderDashboardStats() {
    const statsGrid = document.getElementById('dashboard-stats');
    const timeline  = document.getElementById('dashboard-timeline');
    if (!statsGrid) return;

    const activeRFQs = db.rfqs.filter(r => r.status === 'Open').length;
    let pendingQuotes = db.quotations.filter(q => q.status === 'Pending').length;
    if (currentUser.role === 'vendor') {
        pendingQuotes = db.quotations.filter(q => q.vendorName === currentUser.name && q.status === 'Pending').length;
    }

    statsGrid.innerHTML = `
        <div class="stat-card" onclick="switchPage('rfqs', 'RFQs')" style="cursor:pointer;">
            <div class="stat-icon"><i class="fas fa-file-alt"></i></div>
            <div class="stat-details"><p>Active RFQs</p><h3>${activeRFQs}</h3></div>
        </div>
        <div class="stat-card" onclick="switchPage('quotations', 'Quotations')" style="cursor:pointer;">
            <div class="stat-icon"><i class="fas fa-comment-dollar"></i></div>
            <div class="stat-details"><p>${currentUser.role === 'vendor' ? 'My Pending Quotes' : 'New Quotes'}</p><h3>${pendingQuotes}</h3></div>
        </div>
        <div class="stat-card" onclick="switchPage('pos', 'Purchase Orders')" style="cursor:pointer;">
            <div class="stat-icon"><i class="fas fa-shopping-cart"></i></div>
            <div class="stat-details"><p>Active Orders</p><h3>${db.pos.length}</h3></div>
        </div>
    `;
    if (timeline) {
        timeline.innerHTML = db.logs.slice(0, 4).map(l => `
            <li class="timeline-item">
                <span class="timeline-time">${l.time} — <strong>${l.user}</strong></span>
                <div class="timeline-content">${l.action}</div>
            </li>
        `).join('');
    }
}

function renderActivityPage() {
    const timeline = document.getElementById('main-activity-timeline');
    if (!timeline) return;
    const filteredLogs = db.logs.filter(log =>
        currentLogFilter === 'all' || log.category === currentLogFilter
    );
    if (filteredLogs.length === 0) {
        timeline.innerHTML = `<li style="padding:20px; color:var(--text-muted);">No activity for this filter.</li>`;
        return;
    }

    timeline.innerHTML = filteredLogs.map(l => `
        <li class="timeline-item" style="padding-bottom:20px;">
            <div style="display:flex; gap:15px; align-items:flex-start;">
                <div style="width:32px; height:32px; border-radius:50%; background:var(--primary-soft);
                            display:flex; align-items:center; justify-content:center;
                            color:var(--primary); flex-shrink:0; border:1px solid var(--divider);">
                    <i class="fas ${l.icon || 'fa-info-circle'}" style="font-size:13px;"></i>
                </div>
                <div>
                    <div style="font-size:14px; color:var(--text); font-weight:500;">${l.action}</div>
                    <span style="font-size:12px; color:var(--text-muted);">${l.time} &bull; ${l.user}</span>
                </div>
            </div>
        </li>
    `).join('');
}

function renderTables() {
    const roleId = currentUser.role;

    const rfqsBody = document.getElementById('table-rfqs');
    if (rfqsBody) {
        rfqsBody.innerHTML = db.rfqs.map(r => {
            const isOverdue = new Date(r.deadline) < new Date() && r.status === 'Open';
            const deadlineDisplay = isOverdue ? `<span style="color:var(--danger); font-weight:600;">${r.deadline} ⚠ Overdue</span>` : r.deadline;
            let actionCell = '';
            if (roleId === 'vendor') {
                if (r.status === 'Open') {
                    actionCell = `<td class="action-links"><button class="btn btn-primary" onclick="openQuotationModal('${r.id}','${r.title}')"><i class="fas fa-paper-plane"></i> Submit Quote</button></td>`;
                } else {
                    actionCell = `<td class="action-links"><span style="color:var(--text-muted);font-size:13px;">Closed</span></td>`;
                }
            } else if (roleId !== 'po') {
                actionCell = `<td class="action-links"><button class="btn btn-outline" title="View"><i class="fas fa-eye"></i></button></td>`;
            }
            return `<tr>
                <td><strong>${r.id}</strong></td>
                <td>${r.title}</td>
                <td>${r.qty}x ${r.items}</td>
                <td>${deadlineDisplay}</td>
                <td>${getBadge(r.status)}</td>
                ${actionCell}
            </tr>`;
        }).join('');
    }

    const quotBody = document.getElementById('table-quotations');
    if (quotBody) {
        let qData = db.quotations;
        if (roleId === 'vendor') qData = qData.filter(q => q.vendorName === currentUser.name);
        quotBody.innerHTML = qData.map(q => {
            const actionCell = (roleId !== 'po' && roleId !== 'vendor')
                ? `<td class="action-links"><button class="btn btn-outline"><i class="fas fa-eye"></i></button></td>`
                : '';
            return `<tr>
                <td><strong>${q.id}</strong></td>
                <td>${q.rfqId}</td>
                <td>${q.vendorName}</td>
                <td>${formatCur(q.amount)}</td>
                <td>${q.delivery}</td>
                <td>${getBadge(q.status)}</td>
                ${actionCell}
            </tr>`;
        }).join('');
    }

    const appBody = document.getElementById('table-approvals');
    if (appBody) {
        appBody.innerHTML = db.approvals.map(a => {
            let actionBtn = `<button class="btn btn-outline"><i class="fas fa-eye"></i></button>`;
            if (a.status === 'Pending' && checkPermission(roleId, 'approve_reject')) {
                actionBtn = `<button class="btn btn-secondary" onclick="openApprovalModal('${a.id}')">Review</button>`;
            }
            return `<tr>
                <td><strong>${a.id}</strong></td>
                <td>${a.type}</td>
                <td>${a.submittedBy}</td>
                <td>${formatCur(a.amount)}</td>
                <td>${getBadge(a.status)}</td>
                <td class="action-links">${actionBtn}</td>
            </tr>`;
        }).join('');
    }

    const posBody = document.getElementById('table-pos');
    if (posBody) {
        let poData = db.pos;
        if (roleId === 'vendor') poData = poData.filter(p => p.vendorName === currentUser.name);
        posBody.innerHTML = poData.map(p => {
            // Vendor sees only download; PO officer also gets Create Inv
            let actionBtn = `<button class="btn btn-outline" title="Download PDF" onclick="downloadPO('${p.id}')"><i class="fas fa-download"></i></button>`;
            if (roleId !== 'vendor' && checkPermission(roleId, 'generate_invoice') && p.status !== 'Invoiced') {
                actionBtn += `<button class="btn btn-primary" onclick="generateInvoiceFromPO('${p.id}')">Create Inv</button>`;
            }
            return `<tr>
                <td><strong>${p.id}</strong></td>
                <td>${p.vendorName}</td>
                <td>${p.date}</td>
                <td>${formatCur(p.amount)}</td>
                <td>${getBadge(p.status)}</td>
                <td class="action-links">${actionBtn}</td>
            </tr>`;
        }).join('');
    }

    const invBody = document.getElementById('table-invoices');
    if (invBody) {
        let invData = db.invoices;
        if (roleId === 'vendor') invData = invData.filter(i => i.vendorName === currentUser.name);
        invBody.innerHTML = invData.map(i => {
            let actionBtn;
            if (roleId === 'vendor') {
                actionBtn = `<button class="btn btn-outline" title="Download Invoice" onclick="downloadInvoice('${i.id}')"><i class="fas fa-download"></i></button>`;
            } else {
                actionBtn = `<button class="btn btn-secondary" onclick="openInvoiceModal('${i.id}')"><i class="fas fa-cog"></i></button>`;
            }
            return `<tr>
                <td><strong>${i.id}</strong></td>
                <td>${i.poId}</td>
                <td>${i.vendorName}</td>
                <td>${formatCur(i.tax)}</td>
                <td><strong>${formatCur(i.total)}</strong></td>
                <td>${getBadge(i.status)}</td>
                <td class="action-links">${actionBtn}</td>
            </tr>`;
        }).join('');
    }

    const vendorGrid = document.getElementById('grid-vendors');
    if (vendorGrid) {
        vendorGrid.innerHTML = db.vendors.map(v => `
            <div class="vendor-card">
                <div class="vendor-header">
                    <div class="vendor-info">
                        <h4>${v.name}</h4><p>${v.category}</p>
                    </div>
                    ${getBadge(v.status)}
                </div>
                <p style="font-size:12px; color:var(--text-muted);">GST: ${v.gst}</p>
                <div class="vendor-stats">
                    <div class="v-stat"><span>Rating</span><strong>${v.rating} <i class="fas fa-star" style="color:#f59e0b;"></i></strong></div>
                    <div class="v-stat"><span>Active POs</span><strong>${Math.floor(Math.random() * 20) + 1}</strong></div>
                </div>
            </div>
        `).join('');
    }

    const usersBody = document.getElementById('table-users');
    if (usersBody) {
        usersBody.innerHTML = db.users.map(u => `
            <tr>
                <td><strong>${u.name}</strong></td>
                <td>${u.email}</td>
                <td>${rolesMap[u.role] ? rolesMap[u.role].name : u.role}</td>
                <td>${getBadge(u.status)}</td>
                <td class="action-links">
                    <button class="btn btn-outline" title="Edit User" onclick="editUser(${u.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn ${u.status === 'Active' ? 'btn-danger' : 'btn-secondary'}" title="${u.status === 'Active' ? 'Deactivate' : 'Activate'} User" onclick="toggleUserStatus(${u.id})">
                        <i class="fas ${u.status === 'Active' ? 'fa-user-slash' : 'fa-user-check'}"></i>
                    </button>
                    <button class="btn btn-outline" title="Delete User" onclick="deleteUser(${u.id})" style="color:var(--danger); border-color:var(--danger);">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // ── Pending registrations table ──
    const pendBody  = document.getElementById('table-pending-users');
    const pendCount = document.getElementById('pending-reg-count');
    if (pendBody) {
        const pending = db.pendingRegistrations || [];
        if (pendCount) pendCount.textContent = pending.length;
        if (pending.length === 0) {
            pendBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#9CA3AF;padding:20px;">No pending registrations.</td></tr>';
        } else {
            pendBody.innerHTML = pending.map(u => `
                <tr>
                    <td><strong>${u.name}</strong></td>
                    <td>${u.email}</td>
                    <td>${rolesMap[u.role] ? rolesMap[u.role].name : u.role}</td>
                    <td>${u.registeredAt || 'N/A'}</td>
                    <td class="action-links">
                        <button class="btn btn-secondary" onclick="approveRegistration(${u.id})"><i class="fas fa-check"></i> Approve</button>
                        <button class="btn btn-outline" onclick="rejectRegistration(${u.id})" style="color:var(--danger);border-color:var(--danger);"><i class="fas fa-times"></i> Reject</button>
                    </td>
                </tr>
            `).join('');
        }
    }
}

// ==========================================================================
// AI COMPONENT: SCORING ALGORITHM
// ==========================================================================
function calculateAIVendorScore(quotes) {
    const minPrice = Math.min(...quotes.map(q => q.amount));
    const minDelivery = Math.min(...quotes.map(q => q.deliveryTime || 999));
    const maxWarranty = Math.max(...quotes.map(q => parseInt(q.warranty) || 1));

    return quotes.map(q => {
        const delivery = q.deliveryTime || 14;
        const rating = q.rating || 3.0;
        const onTime = q.onTimeDeliveryRate || 80;
        const warranty = parseInt(q.warranty) || 1;

        const priceScore = (minPrice / q.amount) * 30;           
        const deliveryScore = (minDelivery / delivery) * 25;     
        const ratingScore = (rating / 5.0) * 20;                 
        const onTimeScore = (onTime / 100) * 15;                 
        const warrantyScore = (warranty / maxWarranty) * 10;     

        const totalScore = priceScore + deliveryScore + ratingScore + onTimeScore + warrantyScore;
        
        return { 
            ...q, 
            aiScore: totalScore.toFixed(1),
            breakdown: { priceScore, deliveryScore, ratingScore, onTimeScore, warrantyScore }
        };
    }).sort((a, b) => b.aiScore - a.aiScore);
}

// ==========================================================================
// AI COMPONENT: COMPARE VIEW RENDERING
// ==========================================================================
// function renderCompareView(rfqId) {
//     const container = document.getElementById('compare-container');
//     const aiContainer = document.getElementById('ai-recommendation-container');
//     if (!container) return;

//     const rawCompares = db.quotations.filter(q => q.rfqId === rfqId);

//     if (rawCompares.length === 0) {
//         if(aiContainer) aiContainer.innerHTML = '';
//         container.innerHTML = `<p style="padding:20px; color:var(--text-muted);">No quotations received for this RFQ yet.</p>`;
//         return;
//     }

//     const scoredQuotes = calculateAIVendorScore(rawCompares);
//     const bestQuote = scoredQuotes[0]; 
//     const lowestPriceQuote = [...rawCompares].sort((a, b) => a.amount - b.amount)[0];

//     let aiBannerHtml = `
//         <div class="ai-recommendation-banner mb-20">
//             <div style="display: flex; gap: 15px; align-items: flex-start;">
//                 <div class="ai-icon-wrapper">
//                     <i class="fas fa-robot"></i>
//                 </div>
//                 <div style="flex: 1;">
//                     <h3 style="color: var(--primary); margin-bottom: 5px;">AI Recommended: ${bestQuote.vendorName}</h3>
//                     <p style="font-size: 14px; margin-bottom: 12px; color: var(--text);">
//                         Score: <strong>${bestQuote.aiScore}/100</strong>. This vendor offers the best overall value based on historical reliability and terms.
//                     </p>
//                     <div class="ai-reasoning-grid">
//                         <div>✅ ${bestQuote.deliveryTime} Day Delivery (Optimal)</div>
//                         <div>✅ ${bestQuote.rating}⭐ Vendor Rating</div>
//                         <div>✅ ${bestQuote.onTimeDeliveryRate}% On-Time Record</div>
//                         ${bestQuote.id !== lowestPriceQuote.id 
//                             ? `<div>⚠️ Price is ${(((bestQuote.amount - lowestPriceQuote.amount) / lowestPriceQuote.amount) * 100).toFixed(1)}% higher than the lowest bid, but offset by superior delivery and warranty terms.</div>` 
//                             : `<div>✅ Lowest price guaranteed.</div>`}
//                     </div>
//                 </div>
//             </div>
//         </div>
//     `;

//     let cardsHtml = `
//         <div class="compare-grid" style="padding-bottom: 10px;">
//             ${scoredQuotes.map(q => {
//                 const rfq = db.rfqs.find(r => r.id === q.rfqId);
//                 return `
//                 <div class="compare-card ${q.id === bestQuote.id ? 'ai-highlight' : ''}">
//                     <h3>${q.vendorName}</h3>
//                     <div class="comp-price">${formatCur(q.amount)}</div>
                    
//                     <button class="btn btn-outline btn-block mb-20" 
//                         onclick="explainPricing('${rfq.items}', ${rfq.qty}, ${q.amount}, '${q.vendorName}')" 
//                         style="border-color: var(--primary); color: var(--primary); background: var(--primary-soft);">
//                         <i class="fas fa-brain"></i> Why does this cost ${formatCur(q.amount)}?
//                     </button>

//                     <div class="comp-details">
//                         <div><span>AI Score:</span> <strong>${q.aiScore}/100</strong></div>
//                         <div><span>Delivery:</span> <strong>${q.deliveryTime || 'N/A'} Days</strong></div>
//                         <div><span>Rating:</span>   <strong>${q.rating || 'N/A'}⭐</strong></div>
//                         <div><span>Warranty:</span> <strong>${q.warranty || 'Standard'}</strong></div>
//                     </div>
//                     ${(checkPermission(currentUser.role, 'review_quotes') && q.status === 'Pending')
//                         ? `<button class="btn ${q.id === bestQuote.id ? 'btn-primary' : 'btn-outline'} btn-block" onclick="sendToManager('${q.id}')">
//                             ${q.id === bestQuote.id ? '<i class="fas fa-check"></i> Accept AI Recommendation' : 'Recommend Manually'}
//                            </button>`
//                         : `<button class="btn btn-outline btn-block" disabled>Action Unavailable</button>`
//                     }
//                 </div>
//             `}).join('')}
//         </div>
//     `;

//     if(aiContainer) {
//         aiContainer.innerHTML = aiBannerHtml;
//         container.innerHTML = cardsHtml;
//     } else {
//         container.innerHTML = aiBannerHtml + cardsHtml; // Fallback if HTML wasn't perfectly updated
//     }
// }

// ==========================================================================
// AI COMPONENT: COMPARE VIEW RENDERING
// ==========================================================================
function renderCompareView(rfqId) {
    const container = document.getElementById('compare-container');
    const aiContainer = document.getElementById('ai-recommendation-container');
    if (!container) return;

    const rawCompares = db.quotations.filter(q => q.rfqId === rfqId);

    if (rawCompares.length === 0) {
        if(aiContainer) aiContainer.innerHTML = '';
        container.innerHTML = `<p style="padding:20px; color:var(--text-muted);">No quotations received for this RFQ yet.</p>`;
        return;
    }

    const scoredQuotes = calculateAIVendorScore(rawCompares);
    const bestQuote = scoredQuotes[0]; 
    const lowestPriceQuote = [...rawCompares].sort((a, b) => a.amount - b.amount)[0];

    let aiBannerHtml = `
        <div class="ai-recommendation-banner mb-20">
            <div style="display: flex; gap: 15px; align-items: flex-start;">
                <div class="ai-icon-wrapper">
                    <i class="fas fa-robot"></i>
                </div>
                <div style="flex: 1;">
                    <h3 style="color: var(--primary); margin-bottom: 5px;">AI Recommended: ${bestQuote.vendorName}</h3>
                    <p style="font-size: 14px; margin-bottom: 12px; color: var(--text);">
                        Score: <strong>${bestQuote.aiScore}/100</strong>. This vendor offers the best overall value based on historical reliability and terms.
                    </p>
                    <div class="ai-reasoning-grid">
                        <div>✅ ${bestQuote.deliveryTime} Day Delivery (Optimal)</div>
                        <div>✅ ${bestQuote.rating}⭐ Vendor Rating</div>
                        <div>✅ ${bestQuote.onTimeDeliveryRate}% On-Time Record</div>
                        ${bestQuote.id !== lowestPriceQuote.id 
                            ? `<div>⚠️ Price is ${(((bestQuote.amount - lowestPriceQuote.amount) / lowestPriceQuote.amount) * 100).toFixed(1)}% higher than the lowest bid, but offset by superior delivery and warranty terms.</div>` 
                            : `<div>✅ Lowest price guaranteed.</div>`}
                    </div>
                </div>
            </div>
        </div>
    `;

    let cardsHtml = `
        <div class="compare-grid" style="padding-bottom: 10px;">
            ${scoredQuotes.map(q => {
                const rfq = db.rfqs.find(r => r.id === q.rfqId);
                return `
                <div class="compare-card ${q.id === bestQuote.id ? 'ai-highlight' : ''}">
                    <h3>${q.vendorName}</h3>
                    <div class="comp-price">${formatCur(q.amount)}</div>
                    
                    <div class="comp-details">
                        <div><span>AI Score:</span> <strong>${q.aiScore}/100</strong></div>
                        <div><span>Delivery:</span> <strong>${q.deliveryTime || 'N/A'} Days</strong></div>
                        <div><span>Rating:</span>   <strong>${q.rating || 'N/A'}⭐</strong></div>
                        <div><span>Warranty:</span> <strong>${q.warranty || 'Standard'}</strong></div>
                    </div>
                    ${(checkPermission(currentUser.role, 'review_quotes') && q.status === 'Pending')
                        ? `<button class="btn ${q.id === bestQuote.id ? 'btn-primary' : 'btn-outline'} btn-block" onclick="sendToManager('${q.id}')">
                            ${q.id === bestQuote.id ? '<i class="fas fa-check"></i> Accept AI Recommendation' : 'Recommend Manually'}
                           </button>`
                        : `<button class="btn btn-outline btn-block" disabled>Action Unavailable</button>`
                    }
                </div>
            `}).join('')}
        </div>
    `;

    if(aiContainer) {
        aiContainer.innerHTML = aiBannerHtml;
        container.innerHTML = cardsHtml;
    } else {
        container.innerHTML = aiBannerHtml + cardsHtml; // Fallback if HTML wasn't perfectly updated
    }
}

// ==========================================================================
// AI COMPONENT: EXPLAIN PRICING INSIGHTS
// ==========================================================================
window.explainPricing = async function(itemName, qty, totalCost, vendorName) {
    const contentDiv = document.getElementById('ai-insights-content');
    contentDiv.innerHTML = `
        <div class="text-center" style="padding: 20px;">
            <i class="fas fa-spinner fa-spin text-primary" style="font-size: 2rem;"></i>
            <p class="mt-20" style="color: var(--gray-600);">Analyzing market context for ${qty}x ${itemName}...</p>
        </div>
    `;
    openModal('modal-ai-insights');

    // Simulate Network Delay
    await new Promise(resolve => setTimeout(resolve, 1500)); 
    
    let aiExplanation = "";
    if(itemName.includes("ThinkPad")) {
        aiExplanation = `
            <ul style="text-align: left; padding-left: 20px; line-height: 1.6; color: var(--dark);">
                <li class="mb-20"><strong>Enterprise Silicon Premium:</strong> These aren't consumer laptops. ThinkPad T14s use business-grade processors and TPM security chips, which carry a premium but are mandatory for corporate data compliance.</li>
                <li class="mb-20"><strong>Global Supply Chain Constraints:</strong> There is currently a minor backlog in enterprise SSDs and RAM manufacturing, driving unit prices up by roughly 8% globally this quarter.</li>
                <li><strong>Hidden Value:</strong> This bulk price likely includes 3-year Next-Business-Day onsite warranties. When a laptop breaks, they come to you, saving thousands in IT downtime.</li>
            </ul>
        `;
    } else {
         aiExplanation = `<p>Based on current market data, this quote aligns with standard enterprise pricing due to bulk logistics, vendor reliability records, and commercial-grade material requirements.</p>`;
    }

    contentDiv.innerHTML = `
        <h4 style="margin-bottom: 15px; color: var(--primary);">Pricing Breakdown for ${itemName}</h4>
        ${aiExplanation}
    `;
};


// ==========================================================================
// GENERATE INVOICE FROM PO 
// ==========================================================================
window.generateInvoiceFromPO = function (poId) {
    const po = db.pos.find(p => p.id === poId);
    if (!po) return;

    if (db.invoices.find(i => i.poId === poId)) {
        alert(`An invoice for ${poId} already exists.`);
        return;
    }

    const tax   = Math.round(po.amount * 0.18);
    const total = po.amount + tax;
    const newId = `INV-${5053 + db.invoices.length}`;

    db.invoices.push({ id: newId, poId, vendorName: po.vendorName, tax, total, status: "Pending" });
    po.status = "Invoiced";
    saveSecureLog(`Invoice ${newId} generated from ${poId}`, 'Invoices');

    alert(`Invoice ${newId} created successfully!\nAmount: ${formatCur(po.amount)}\nTax (18%): ${formatCur(tax)}\nTotal: ${formatCur(total)}`);
    renderTables();
    renderDashboardStats();
    renderActivityPage();
};

// ==========================================================================
// DOWNLOAD PO AS TEXT FILE
// ==========================================================================
window.downloadPO = function (poId) {
    const po = db.pos.find(p => p.id === poId);
    if (!po) return;
    const lines = [
        '========================================',
        '         VENDORBRIDGE - PURCHASE ORDER  ',
        '========================================',
        `PO Number  : ${po.id}`,
        `Vendor     : ${po.vendorName}`,
        `Date       : ${po.date}`,
        `Amount     : ${formatCur(po.amount)}`,
        `Status     : ${po.status}`,
        '----------------------------------------',
        'Generated by VendorBridge ERP',
        '========================================',
    ].join('\n');
    const blob = new Blob([lines], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${po.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    saveSecureLog(`PO ${po.id} downloaded`, 'Approvals');
};

window.approveRegistration = function(regId) {
    const idx = db.pendingRegistrations.findIndex(u => u.id === regId);
    if (idx === -1) return;
    const reg = db.pendingRegistrations[idx];
    if (!confirm(`Approve account for "${reg.name}" (${reg.email})?`)) return;
    const newUser = { id: reg.id, name: reg.name, email: reg.email, password: reg.password, role: reg.role, status: 'Active' };
    db.users.push(newUser);
    db.pendingRegistrations.splice(idx, 1);
    persistUsers();
    saveSecureLog(`Admin approved registration for ${reg.name}`, 'Vendors');
    alert(`${reg.name} approved! They can now log in.`);
    renderTables();
};

window.rejectRegistration = function(regId) {
    const idx = db.pendingRegistrations.findIndex(u => u.id === regId);
    if (idx === -1) return;
    const reg = db.pendingRegistrations[idx];
    if (!confirm(`Reject and delete registration for "${reg.name}"?`)) return;
    db.pendingRegistrations.splice(idx, 1);
    persistUsers();
    saveSecureLog(`Admin rejected registration for ${reg.name}`, 'Vendors');
    renderTables();
};

window.switchUserTab = function(tab) {
    // Always reload from localStorage so newly signed-up users appear immediately
    loadPersistedUsers();
    renderTables();
    document.getElementById('panel-active-users').style.display  = tab === 'active'  ? 'block' : 'none';
    document.getElementById('panel-pending-users').style.display = tab === 'pending' ? 'block' : 'none';
    document.getElementById('tab-active-users').className  = tab === 'active'  ? 'btn btn-primary' : 'btn btn-outline';
    document.getElementById('tab-pending-users').className = tab === 'pending' ? 'btn btn-primary' : 'btn btn-outline';
};

// ==========================================================================
// DOWNLOAD INVOICE AS TEXT FILE (Vendor)
// ==========================================================================
window.downloadInvoice = function (invoiceId) {
    const inv = db.invoices.find(i => i.id === invoiceId);
    if (!inv) return;
    const lines = [
        '========================================',
        '         VENDORBRIDGE - INVOICE         ',
        '========================================',
        `Invoice #  : ${inv.id}`,
        `PO Ref     : ${inv.poId}`,
        `Vendor     : ${inv.vendorName}`,
        `Amount     : ${formatCur(inv.total - inv.tax)}`,
        `Tax (18%)  : ${formatCur(inv.tax)}`,
        `Total      : ${formatCur(inv.total)}`,
        `Status     : ${inv.status}`,
        '----------------------------------------',
        'Generated by VendorBridge ERP',
        '========================================',
    ].join('\n');
    const blob = new Blob([lines], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${inv.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    saveSecureLog(`Invoice ${inv.id} downloaded by vendor`, 'Invoices');
};

// ==========================================================================
// USER MANAGEMENT ACTIONS (Admin)
// ==========================================================================
window.editUser = function (userId) {
    const user = db.users.find(u => u.id === userId);
    if (!user) return;
    const newName = prompt('Edit name:', user.name);
    if (newName === null) return;
    const newEmail = prompt('Edit email:', user.email);
    if (newEmail === null) return;
    const newPass = prompt('Edit password (leave blank to keep current):', '');
    user.name  = newName.trim()  || user.name;
    user.email = newEmail.trim() || user.email;
    if (newPass && newPass.trim()) user.password = newPass.trim();
    persistUsers();
    saveSecureLog(`User ${user.id} updated: ${user.name}`, 'Vendors');
    alert('User updated successfully!');
    renderTables();
};

window.toggleUserStatus = function (userId) {
    const user = db.users.find(u => u.id === userId);
    if (!user) return;
    if (user.id === currentUser.id) { alert("You cannot change your own status."); return; }
    const action = user.status === 'Active' ? 'Deactivate' : 'Activate';
    if (!confirm(`${action} user "${user.name}"?`)) return;
    user.status = user.status === 'Active' ? 'Inactive' : 'Active';
    persistUsers();
    saveSecureLog(`User ${user.name} ${user.status.toLowerCase()}d by admin`, 'Vendors');
    renderTables();
};

window.deleteUser = function (userId) {
    const user = db.users.find(u => u.id === userId);
    if (!user) return;
    if (user.id === currentUser.id) { alert("You cannot delete yourself."); return; }
    if (!confirm(`Permanently delete user "${user.name}"? This cannot be undone.`)) return;
    db.users = db.users.filter(u => u.id !== userId);
    persistUsers();
    saveSecureLog(`User ${user.name} deleted by admin`, 'Vendors');
    renderTables();
};

// ==========================================================================
// DYNAMIC FORMS 
// ==========================================================================
function setupDynamicForms() {
    const quoteForm = document.getElementById('form-submit-quote');
    if (quoteForm) {
        quoteForm.onsubmit = async function (e) {
            e.preventDefault();
            const payload = {
                rfqId:      document.getElementById('quote-rfq-id').value,
                amount:     document.getElementById('quote-amount').value,
                delivery:   document.getElementById('quote-delivery').value,
                notes:      document.getElementById('quote-notes').value,
                vendorName: currentUser.name
            };
            try {
                const response = await fetch('http://127.0.0.1:8000/api/quotes/', {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify(payload)
                });

                const result = await response.json();
                if (result.success) {
                    db.quotations.push({
                        id:         `Q-DB${result.id}`,
                        rfqId:      payload.rfqId,
                        vendorName: payload.vendorName,
                        amount:     parseInt(payload.amount),
                        delivery:   payload.delivery,
                        status:     "Pending"
                    });
                    saveSecureLog(`${currentUser.name} submitted quotation for ${payload.rfqId}`, 'RFQ');
                    alert(`Quotation Submitted Successfully! Database ID: ${result.id}`);
                    closeModal('modal-quotation');
                    this.reset();
                } else {
                    alert("Error saving: " + result.error);
                    return;
                }
            } catch (error) {
                console.warn("Django offline, saving quotation locally:", error.message);
                const localId = `Q-LOC${db.quotations.length + 1}`;
                db.quotations.push({
                    id:         localId,
                    rfqId:      payload.rfqId,
                    vendorName: payload.vendorName,
                    amount:     parseInt(payload.amount),
                    delivery:   payload.delivery,
                    status:     "Pending"
                });
                saveSecureLog(`${currentUser.name} submitted quotation for ${payload.rfqId}`, 'RFQ');
                alert(`Quotation saved locally as ${localId} (server offline).`);
                closeModal('modal-quotation');
                this.reset();
            }

            renderTables();
            renderDashboardStats();
            renderActivityPage();
        };
    }

    const approveForm = document.querySelector('#modal-approve form');
    if (approveForm) {
        approveForm.onsubmit = function (e) {
            e.preventDefault();
            const actionSelect  = this.querySelector('select').value; 
            const currentAppId  = this.dataset.currentAppId;
            const approvalRecord = db.approvals.find(a => a.id === currentAppId);
            if (approvalRecord) {
                approvalRecord.status = actionSelect === 'Approve' ? 'Approved' : 'Rejected';
                if (approvalRecord.type.includes('Quotation')) {
                    const linkedQuote = db.quotations.find(q => q.id === approvalRecord.ref);
                    if (linkedQuote) linkedQuote.status = approvalRecord.status;
                }
                saveSecureLog(`Manager ${actionSelect.toLowerCase()}d request ${currentAppId}`, 'Approvals');
            }

            alert(`Request ${currentAppId} has been ${actionSelect}d!`);
            closeModal('modal-approve');

            renderTables();
            renderDashboardStats();
            renderActivityPage();

            const sel = document.getElementById('compare-rfq-selector');
            if (sel) renderCompareView(sel.value);
        };
    }

    const addUserForm = document.getElementById('form-add-user');
    if (addUserForm) {
        addUserForm.onsubmit = function (e) {
            e.preventDefault();
            const newName  = document.getElementById('new-user-name').value;
            const newEmail = document.getElementById('new-user-email').value;
            const newRole  = document.getElementById('new-user-role').value;
            db.users.push({
                id:     db.users.length + 1,
                name:   newName,
                email:  newEmail,
                role:   newRole,
                status: "Active"
            });
            saveSecureLog(`Added new system user: ${newName}`, 'Vendors');
            alert(`${newName} has been added to the system!`);
            closeModal('modal-add-user');
            this.reset();

            renderTables();
            renderActivityPage();
        };
    }

    const addVendorForm = document.getElementById('form-add-vendor');
    if (addVendorForm) {
        addVendorForm.onsubmit = function (e) {
            e.preventDefault();
            const newName     = document.getElementById('vendor-name').value;
            const newCategory = document.getElementById('vendor-category').value;
            const newGst      = document.getElementById('vendor-gst') ? document.getElementById('vendor-gst').value : 'N/A';
            db.vendors.push({
                id:       `V-${100 + db.vendors.length + 1}`,
                name:     newName,
                category: newCategory,
                gst:      newGst,
                rating:   4.0,
                status:   "Pending"
            });
            saveSecureLog(`Vendor "${newName}" registered in system`, 'Vendors');
            alert(`${newName} has been added as a vendor!`);
            closeModal('modal-vendor');
            this.reset();

            renderTables();
            renderActivityPage();
        };
    }

    const rfqForm = document.getElementById('form-create-rfq');
    if (rfqForm) {
        rfqForm.onsubmit = function (e) {
            e.preventDefault();
            const newTitle    = document.getElementById('rfq-title').value;
            const newItems    = document.getElementById('rfq-items').value;
            const newQty      = document.getElementById('rfq-qty').value;
            const newDeadline = document.getElementById('rfq-deadline').value;
            const newId       = `RFQ-${new Date().getFullYear()}-${String(40 + db.rfqs.length + 1).padStart(3, '0')}`;
            db.rfqs.push({
                id:       newId,
                title:    newTitle,
                items:    newItems,
                qty:      parseInt(newQty),
                deadline: newDeadline,
                status:   "Open"
            });
            saveSecureLog(`RFQ ${newId} created: ${newTitle}`, 'RFQ');
            populateCompareSelector();

            alert(`RFQ ${newId} published successfully!`);
            closeModal('modal-rfq');
            this.reset();

            renderTables();
            renderDashboardStats();
            renderActivityPage();

            // Navigate to RFQ list so the user sees the newly created entry
            switchPage('rfqs', 'RFQs');
            document.querySelectorAll('.nav-item').forEach(el => {
                if (el.textContent.trim().includes('RFQ')) {
                    document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
                    el.classList.add('active');
                }
            });
        };
    }
}

// ==========================================================================
// SEND TO MANAGER (from Compare page)
// ==========================================================================
window.sendToManager = function (quoteId) {
    const quote = db.quotations.find(q => q.id === quoteId);
    if (!quote) return;

    const newAppId = `APP-40${Math.floor(Math.random() * 90) + 10}`;
    db.approvals.unshift({
        id:          newAppId,
        type:        "Quotation Review",
        ref:         quoteId,
        submittedBy: currentUser.name,
        amount:      quote.amount,
        status:      "Pending"
    });
    saveSecureLog(`PO recommended ${quoteId} to Manager for review`, 'Approvals');
    alert(`Quotation ${quoteId} sent to Manager for approval!`);
    renderTables();
    renderDashboardStats();
    renderActivityPage();
};

function populateCompareSelector() {
    const sel = document.getElementById('compare-rfq-selector');
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = db.rfqs.map(r => `<option value="${r.id}" ${r.id === current ? 'selected' : ''}>${r.id} — ${r.title}</option>`).join('');
}

// ==========================================================================
// INVOICE MODAL
// ==========================================================================
let _currentInvoiceId = null;

window.openInvoiceModal = function (invoiceId) {
    _currentInvoiceId = invoiceId;
    openModal('modal-invoice');
};

window.printInvoicePDF = function () {
    const inv = db.invoices.find(i => i.id === _currentInvoiceId);
    closeModal('modal-invoice');
    if (!inv) return;
    const lines = [
        '========================================',
        '         VENDORBRIDGE - INVOICE         ',
        '========================================',
        `Invoice #  : ${inv.id}`,
        `PO Ref     : ${inv.poId}`,
        `Vendor     : ${inv.vendorName}`,
        `Amount     : ${formatCur(inv.total - inv.tax)}`,
        `Tax (18%)  : ${formatCur(inv.tax)}`,
        `Total      : ${formatCur(inv.total)}`,
        `Status     : ${inv.status}`,
        '----------------------------------------',
        'Generated by VendorBridge ERP',
        '========================================',
    ].join('\n');
    const blob = new Blob([lines], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${inv.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    saveSecureLog(`Invoice ${inv.id} downloaded as PDF`, 'Invoices');
};

window.emailInvoice = function () {
    closeModal('modal-invoice');
    const inv = db.invoices.find(i => i.id === _currentInvoiceId);
    if (!inv) return;
    const vendor = db.vendors.find(v => v.name === inv.vendorName);
    const email  = vendor ? vendor.email || 'vendor@example.com' : 'vendor@example.com';
    saveSecureLog(`Invoice ${inv.id} emailed to vendor ${inv.vendorName}`, 'Invoices');
    alert(`Invoice ${inv.id} sent to ${inv.vendorName} at ${email}.\nTotal: ${formatCur(inv.total)}`);
};

// ==========================================================================
// REPORTS & ANALYTICS PAGE
// ==========================================================================
function renderReportsPage() {
    const container = document.getElementById('reports-content');
    if (!container) return;

    // ── Compute stats ──
    const totalSpend     = db.invoices.reduce((s, i) => s + i.total, 0);
    const paidSpend      = db.invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.total, 0);
    const pendingSpend   = db.invoices.filter(i => i.status === 'Pending').reduce((s, i) => s + i.total, 0);
    const openRFQs       = db.rfqs.filter(r => r.status === 'Open').length;
    const closedRFQs     = db.rfqs.filter(r => r.status === 'Closed').length;
    const pendingAppr    = db.approvals.filter(a => a.status === 'Pending').length;

    // Vendor performance
    const vendorStats = {};
    db.quotations.forEach(q => {
        if (!vendorStats[q.vendorName]) vendorStats[q.vendorName] = { quotes: 0, approved: 0, totalAmt: 0 };
        vendorStats[q.vendorName].quotes++;
        if (q.status === 'Approved') vendorStats[q.vendorName].approved++;
        vendorStats[q.vendorName].totalAmt += q.amount;
    });
    db.pos.forEach(p => {
        if (!vendorStats[p.vendorName]) vendorStats[p.vendorName] = { quotes: 0, approved: 0, totalAmt: 0 };
        vendorStats[p.vendorName].totalAmt += p.amount;
    });

    // Monthly trend (last 6 months from POs)
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthlyData = {};
    db.pos.forEach(p => {
        const d = new Date(p.date);
        const key = months[d.getMonth()] + ' ' + d.getFullYear();
        monthlyData[key] = (monthlyData[key] || 0) + p.amount;
    });
    db.invoices.forEach(i => {
        const po = db.pos.find(p => p.id === i.poId);
        if (po) {
            const d = new Date(po.date);
            const key = months[d.getMonth()] + ' ' + d.getFullYear();
            if (!monthlyData[key]) monthlyData[key] = po.amount;
        }
    });
    const monthKeys   = Object.keys(monthlyData);
    const maxMonthVal = Math.max(...Object.values(monthlyData), 1);

    const vendorRows = Object.entries(vendorStats).map(([name, s]) => {
        const winRate = s.quotes > 0 ? Math.round((s.approved / s.quotes) * 100) : 0;
        return `<tr>
            <td><strong>${name}</strong></td>
            <td>${s.quotes}</td>
            <td>${s.approved}</td>
            <td>${winRate}%</td>
            <td>${formatCur(s.totalAmt)}</td>
            <td>
                <div style="background:#E5E7EB;border-radius:4px;height:8px;width:100%;min-width:80px;">
                    <div style="background:var(--primary);height:8px;border-radius:4px;width:${Math.min(winRate,100)}%;"></div>
                </div>
            </td>
        </tr>`;
    }).join('');

    const barBars = monthKeys.map(k => {
        const pct = Math.round((monthlyData[k] / maxMonthVal) * 100);
        return `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;min-width:60px;">
            <span style="font-size:11px;color:var(--primary);font-weight:600;">${formatCur(monthlyData[k])}</span>
            <div style="background:var(--primary);border-radius:4px 4px 0 0;width:100%;height:${Math.max(pct*1.4,4)}px;transition:height 0.4s;"></div>
            <span style="font-size:11px;color:#6B7280;">${k}</span>
        </div>`;
    }).join('');

    container.innerHTML = `
        <!-- KPI Cards -->
        <div class="stats-grid" style="margin-bottom:24px;">
            <div class="stat-card"><div class="stat-icon"><i class="fas fa-rupee-sign"></i></div><div class="stat-details"><p>Total Spend</p><h3>${formatCur(totalSpend)}</h3></div></div>
            <div class="stat-card"><div class="stat-icon" style="background:#D1FAE5;color:#059669;"><i class="fas fa-check-circle"></i></div><div class="stat-details"><p>Paid Invoices</p><h3>${formatCur(paidSpend)}</h3></div></div>
            <div class="stat-card"><div class="stat-icon" style="background:#FEF3C7;color:#D97706;"><i class="fas fa-clock"></i></div><div class="stat-details"><p>Pending Payments</p><h3>${formatCur(pendingSpend)}</h3></div></div>
        </div>
        <div class="stats-grid" style="margin-bottom:24px;">
            <div class="stat-card"><div class="stat-icon"><i class="fas fa-file-alt"></i></div><div class="stat-details"><p>Open RFQs</p><h3>${openRFQs}</h3></div></div>
            <div class="stat-card"><div class="stat-icon"><i class="fas fa-times-circle"></i></div><div class="stat-details"><p>Closed RFQs</p><h3>${closedRFQs}</h3></div></div>
            <div class="stat-card"><div class="stat-icon" style="background:#EDE9FE;color:#7C3AED;"><i class="fas fa-hourglass-half"></i></div><div class="stat-details"><p>Pending Approvals</p><h3>${pendingAppr}</h3></div></div>
        </div>

        <!-- Monthly Trend -->
        <div class="card mb-20">
            <div class="card-header"><h3><i class="fas fa-chart-bar" style="color:var(--primary);margin-right:8px;"></i>Monthly Procurement Trends</h3></div>
            <div class="card-body">
                ${monthKeys.length === 0
                    ? '<p style="color:#9CA3AF;text-align:center;padding:20px;">No purchase order data yet.</p>'
                    : `<div style="display:flex;align-items:flex-end;gap:10px;height:200px;padding:10px 0;overflow-x:auto;">${barBars}</div>`}
            </div>
        </div>

        <!-- Spending Summary -->
        <div class="card mb-20">
            <div class="card-header"><h3><i class="fas fa-wallet" style="color:var(--primary);margin-right:8px;"></i>Spending Summary</h3></div>
            <div class="card-body">
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;text-align:center;">
                    <div style="padding:16px;background:#F0FDF4;border-radius:8px;">
                        <div style="font-size:22px;font-weight:700;color:#059669;">${formatCur(paidSpend)}</div>
                        <div style="font-size:13px;color:#6B7280;margin-top:4px;">Paid</div>
                        <div style="margin-top:8px;background:#BBF7D0;border-radius:4px;height:6px;">
                            <div style="background:#059669;height:6px;border-radius:4px;width:${totalSpend ? Math.round((paidSpend/totalSpend)*100) : 0}%;"></div>
                        </div>
                    </div>
                    <div style="padding:16px;background:#FFFBEB;border-radius:8px;">
                        <div style="font-size:22px;font-weight:700;color:#D97706;">${formatCur(pendingSpend)}</div>
                        <div style="font-size:13px;color:#6B7280;margin-top:4px;">Pending</div>
                        <div style="margin-top:8px;background:#FDE68A;border-radius:4px;height:6px;">
                            <div style="background:#D97706;height:6px;border-radius:4px;width:${totalSpend ? Math.round((pendingSpend/totalSpend)*100) : 0}%;"></div>
                        </div>
                    </div>
                    <div style="padding:16px;background:#EFF6FF;border-radius:8px;">
                        <div style="font-size:22px;font-weight:700;color:#2563EB;">${formatCur(totalSpend)}</div>
                        <div style="font-size:13px;color:#6B7280;margin-top:4px;">Total</div>
                        <div style="margin-top:8px;background:#BFDBFE;border-radius:4px;height:6px;">
                            <div style="background:#2563EB;height:6px;border-radius:4px;width:100%;"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Vendor Performance -->
        <div class="card">
            <div class="card-header"><h3><i class="fas fa-trophy" style="color:var(--primary);margin-right:8px;"></i>Vendor Performance Analytics</h3></div>
            <div class="table-responsive">
                <table class="data-table">
                    <thead><tr><th>Vendor</th><th>Quotes</th><th>Won</th><th>Win Rate</th><th>Total Value</th><th>Win Rate Bar</th></tr></thead>
                    <tbody>${vendorRows || '<tr><td colspan="6" style="text-align:center;color:#9CA3AF;padding:20px;">No quotation data yet.</td></tr>'}</tbody>
                </table>
            </div>
        </div>
    `;
}

// ==========================================================================
// MODAL UTILITIES
// ==========================================================================
window.openModal = function (id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
};
window.closeModal = function (id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
};
window.openQuotationModal = function (rfqId, rfqTitle) {
    const titleEl = document.getElementById('quote-modal-rfq-title');
    const idEl    = document.getElementById('quote-rfq-id');
    if (titleEl) titleEl.innerText = `${rfqId} — ${rfqTitle}`;
    if (idEl)    idEl.value        = rfqId;
    openModal('modal-quotation');
};

window.openApprovalModal = function (appId) {
    const form = document.querySelector('#modal-approve form');
    if (form) form.dataset.currentAppId = appId;
    openModal('modal-approve');
};