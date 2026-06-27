# VendorBridge ERP 

![VendorBridge Banner](https://img.shields.io/badge/Status-Live_Prototype-success) ![JavaScript](https://img.shields.io/badge/Frontend-Vanilla_JS-yellow) ![Python](https://img.shields.io/badge/Backend-Django_Python-blue) 

*VendorBridge* is a modern Procurement and Vendor Management System (VMS) built to streamline the B2B purchasing lifecycle. It bridges the gap between Procurement Officers, Workflow Managers, and Vendors through a secure, data-driven, and highly automated platform.

## ✨ Key Features (Hackathon Highlights)

* 🧠 *Smart Quote Analysis:* An automated comparator that instantly evaluates competing vendor quotes and visually highlights the most cost-effective bid for the Procurement Officer.
* 🔒 *Immutable Audit Trail:* A legally compliant logging system that records every critical action (quote submissions, manager approvals, user creations). Logs are displayed in a filterable UI and securely transmitted to a locked-down Django database that rejects edits or deletions.
* 👥 *Dynamic Role-Based Access (RBAC):* Secure, customized dashboards for 4 distinct user types: System Admin, Procurement Officer (PO), Workflow Manager, and Registered Vendor.
* 💾 *Hybrid Architecture:* Utilizes rapid in-memory Javascript state management for seamless UI navigation during demos, while bridging to a Python/Django backend via REST APIs for permanent, secure data storage (Quotations and Audit Logs).
* 📊 *Live Dashboard & Analytics:* Features dynamic reporting including active RFQ tracking, pending quote counters, and interactive timeline activities.
* 📄 *Automated Document Export:* One-click generation and print-formatting of Purchase Orders and Invoices.

## 🛠️ Tech Stack

*Frontend:*
* *HTML5:* Semantic structure with modular screens and modal overlays.
* *CSS3:* Custom styling with CSS variables, responsive grids, and print-media optimization for PDF exports.
* *Vanilla JavaScript (ES6+):* State management, DOM manipulation, and asynchronous API communication (fetch).
* *FontAwesome:* Scalable vector icons for the UI.

*Backend (Integration Ready):*
* *Python / Django:* Designed to connect to a Django REST API for immutable audit logging and secure quote management (http://127.0.0.1:8000/api/).
* *SQLite:* Default lightweight database for rapid prototyping and local persistence.

## 🚀 Quick Start Guide

### Running the Frontend (Client-Side Only)
You do not need a server to view the main UI!
1. Clone the repository.
2. Locate the index.html file.
3. Double-click to open it in any modern web browser.
4. Note: Data such as mock users will persist only during your current session. Real database interactions require the backend.

### Running the Full-Stack Application (With Django)
To enable the Immutable Audit Log and permanent database storage:
1. Navigate to your Django backend directory (vendorbridge_backend).
2. Run migrations: python manage.py makemigrations followed by python manage.py migrate
3. Start the server: python manage.py runserver
4. Open the index.html frontend. It will automatically route API calls to http://127.0.0.1:8000/.

## 💡 The "Golden Path" Demo Workflow

To experience the full power of VendorBridge, follow this exact workflow:

1. *System Setup:* Log in as *Admin* (select Admin from the dropdown). Navigate to User Management, click *Add User*, and create a new Vendor profile.
2. *Submit a Quote:* Log out, then log back in as a *Vendor. Go to *Open RFQs, click *Submit Quote* on an active request, and enter your bid. (This triggers a REST API call to Django).
3. *Quote Analysis:* Log out, log in as a *Procurement Officer. Go to *Compare Quotes. Watch the system automatically filter the bids and highlight the best overall value. Click *Recommend for Approval*.
4. *Manager Approval:* Log in as a *Manager, go to *Pending Approvals, and officially approve the PO request.
5. *Audit Verification:* Log back in as *Admin. Check the *Activity & Logs tab. You will see the secure, immutable history of the entire process you just completed, synchronized with the Django backend!

---
Built for the 2026 Hackathon
