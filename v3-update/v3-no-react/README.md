# 🍽️ Warehouse Canteen — Meal Token System (v3)

> A complete digital replacement for paper-based canteen tokens at warehouse sites — built entirely on Google Workspace (Apps Script + Sheets), running on the smartphones employees already carry. **Zero infrastructure cost. No biometric machines required.**

**Designed and developed by [Charan A Bijapur](https://github.com/bijapurcharan-creator) · IT Engineer · Rentomojo**

---

## ✨ Why This System

Traditional meal-tracking solutions at warehouses rely on **biometric machines** — fingerprint or facial recognition devices installed at every canteen counter. This means:

❌ Significant capital expenditure per warehouse
❌ Annual cloud subscription per device
❌ Hygiene concerns (shared fingerprint surface)
❌ Hardware maintenance and replacement cycles
❌ Vendor lock-in for software and reporting

**This system delivers the same outcome — identity-verified meal tracking with full audit trail — using only the tools we already pay for, and the smartphones every employee already has in their pocket.**

✅ ₹0 hardware cost
✅ ₹0 subscription fee
✅ Photo-based identity verification (no touchpoints)
✅ Real-time multi-warehouse dashboards
✅ Full audit trail in Google Sheets
✅ Onboards a new warehouse in minutes

---

## 🎯 Features at a Glance

| Feature | Description |
|---------|-------------|
| 📱 **Mobile-first** | Works on any phone with a browser — no app install |
| 🍳 **Two meals/day** | Breakfast (6 AM – 11 AM) · Lunch (12 PM – 4 PM) |
| ⏰ **Time-window enforcement** | Tokens only generated during meal windows |
| 📸 **Photo verification** | One-time selfie capture for identity check at counter |
| 🔍 **Search** | Canteen staff can search by phone or token (last 5 digits) |
| 🖼️ **Photo enlargement** | Tap any photo for full-screen identity verification |
| 📆 **Pre-booking** | Employees can pre-book tomorrow's meals (10 AM – 6 PM) — helps canteen plan headcount and reduce wastage |
| 📊 **Live counters** | Real-time totals by meal type |
| 📜 **Monthly history** | Each employee sees their served-meal record |
| 🏢 **Multi-warehouse** | Canteen staff scoped to their City + Warehouse only |
| 💾 **Session persistence** | 12-hour session — refresh-safe |
| 🔗 **Clean Google Sheet** | Hyperlink-formatted photo column displays names, not raw URLs |
| 🔐 **Force password change** | Default `rentomojo123` must be changed on first login |
| 🆔 **Audit trail** | Every transaction logged with timestamp + serving staff ID |

---

## 📁 Folder Structure

```
v3-no-react/
├── README.md                  ← you are here
├── backend/
│   └── Code.gs                ← Apps Script — serves HTML + handles all API actions
├── frontend/
│   └── Index.html             ← Complete UI (vanilla HTML/JS/Tailwind via CDN)
├── docs/
│   ├── SETUP.md               ← Step-by-step deployment guide
│   ├── User_Manual.docx       ← Visual manual with real screenshots for end users
│   ├── Scan_Poster.docx       ← Printable A4 QR-code launch poster
│   └── Project_Report.docx    ← Formal project report
└── assets/
    └── canteen_qr_code.png    ← QR code linking to the live app
```

**Just two code files: `Code.gs` and `Index.html`.** That's the entire system.

---

## 🚀 Quick Start

Already have a Google Sheet ready? Three commands to deploy:

1. Open your sheet → Extensions → Apps Script
2. Paste [`backend/Code.gs`](backend/Code.gs) into Code.gs and [`frontend/Index.html`](frontend/Index.html) into a new HTML file named `Index`
3. Run `setupSheets()` once → Deploy as Web App with "Anyone" access → share the URL

For the full step-by-step guide with screenshots, see **[docs/SETUP.md](docs/SETUP.md)**.

---

## 🏗️ Architecture

```
[ User opens Apps Script Web App URL on phone ]
                  │
                  ▼
    [ doGet() in Code.gs ]
                  │
                  ▼
   [ Serves Index.html as the rendered page ]
                  │
                  ▼
   [ JavaScript inside Index.html calls
     google.script.run.apiCall(action, payload) ]
                  │
                  ▼
   [ apiCall() in Code.gs reads/writes
     the same Google Sheet — returns JSON ]
                  │
                  ▼
   [ Frontend updates the screen ]
```

**No CORS, no fetch, no external hosting.** Everything lives inside one Apps Script project bound to a single Google Sheet.

---

## 📊 Google Sheet Structure

Four sheet tabs, all created automatically by `setupSheets()`:

### `user Detals` — Employee Master
| City | Warehouse | Name | Designation | Phone Number | Password | Photo Link | Status |
|------|-----------|------|-------------|--------------|----------|------------|--------|

### `Token List` — Real Meal Tokens (Audit Log)
| Date | City | Warehouse | Name | Designation | Phone | Meal Type | Token ID | Canteen Person ID | Food Provided |
|------|------|-----------|------|-------------|-------|-----------|----------|-------------------|---------------|

### `Canteen Person` — Staff Credentials
| City | Warehouse | User ID | Password |
|------|-----------|---------|----------|

### `Requests` — Pre-bookings (Headcount Only)
| Date | City | Warehouse | Name | Designation | Phone | Meal Type | Requested At |
|------|------|-----------|------|-------------|-------|-----------|--------------|

> Pre-bookings live in their own sheet. Real tokens are only ever created when the employee taps "Use Token" within the meal window — keeping the Token List clean for vendor billing and audit reports.

---

## 🔄 Daily Operations

| Task | How |
|------|-----|
| Add new employee | Add a row in `user Detals` tab · Status = Yes · Password blank |
| Block an employee | Change Status to `No` in `user Detals` |
| Reset a password | Clear the Password cell — user re-sets on next login |
| Update meal hours | Edit `MEAL_WINDOWS` in `Code.gs` → Deploy new version |
| Update pre-booking hours | Edit `PREBOOK_WINDOW` in `Code.gs` → Deploy new version |
| Update UI | Edit `Index.html` → Deploy new version |
| Monthly report | Pivot table on `Token List` tab |
| Tomorrow's headcount | Filter `Requests` sheet by tomorrow's date |

---

## 🛠️ One-Time Migrations (Optional)

Run these once from the Apps Script editor if you're upgrading from an older version:

- **`migratePhotoLinks()`** — converts old raw photo URLs in `Photo Link` column into clean `=HYPERLINK("url","Name")` formulas so cells display employee names instead of long URLs.
- **`migrateRequestedToRequestsSheet()`** — moves any leftover `REQUESTED` rows from `Token List` into the dedicated `Requests` sheet (safe to re-run).

Both are no-ops if there's nothing to migrate.

---

## 📱 Launch Kit Included

This repository includes everything needed for a real-world launch:

| File | Purpose |
|------|---------|
| **[docs/User_Manual.docx](docs/User_Manual.docx)** | 30-page visual manual with real app screenshots for both employees and canteen staff |
| **[docs/Scan_Poster.docx](docs/Scan_Poster.docx)** | Print-ready A4 poster with the QR code, meal timings, default password, and HRBP contact instruction |
| **[assets/canteen_qr_code.png](assets/canteen_qr_code.png)** | Standalone QR code image for use in WhatsApp messages, emails, or other materials |
| **[docs/Project_Report.docx](docs/Project_Report.docx)** | Formal project report for internal stakeholders |

---

## 🆚 Choosing Between Versions

This repository contains two versions of the system:

| Aspect | v2 (root folder) | **v3 (this folder)** |
|--------|------------------|----------------------|
| Frontend | React + StackBlitz | Vanilla HTML/JS |
| Deployment | Two separate URLs | Single Apps Script URL |
| Tech to learn | React, JSX, npm | Plain HTML & JS |
| Maintenance | Needs React knowledge | Anyone with HTML skills can edit |
| Files | 50+ React files | **2 files** |
| Build step | npm install required | None |

Both versions read from the same Google Sheet structure — you can switch between them without data loss.

**Recommended:** v3 (this folder) — simpler, no external dependencies, easier to hand off.

---

## 📞 Support

For questions, password resets, new employee additions, feature requests, or bug reports — contact:

**CHARAN A BIJAPUR**
IT Engineer · Rentomojo
System designer & developer

---

## 📄 License

Internal Rentomojo project. All rights reserved.

---

**Built with care for warehouse operations · 2026**
