# 🍽️ Warehouse Canteen — Meal Token System
> 🆕 **v3.1 is here!** This release adds pre-booking, search, photo modal, and a complete launch kit (user manual + scan poster).
> See the latest version in [`v3-no-react/`](v3-no-react/README.md) — or read the full changelog in [CHANGELOG.md](CHANGELOG.md).
> 🆕 **NEW:** A simpler [no-React version is now available in `v3-no-react/`](v3-no-react/README.md) — the entire app lives inside one Google Sheet's Apps Script project. No StackBlitz, no npm, no separate hosting.

> A digital token-based meal management system for third-party warehouse employees, built with React + Google Apps Script + Google Sheets.

**Designed and developed by [Charan A Bijapur](https://github.com/charanbijapur) · IT Analyst · Rentomojo**

---

## 📋 Overview

This system replaces paper-based meal tokens with a mobile-first web application. Third-party warehouse employees claim daily breakfast and lunch tokens from their phones; canteen staff verify and serve meals via a dedicated dashboard. All activity is logged to Google Sheets in real time, providing a complete audit trail and live operational visibility.

### ✨ Key Features

- 📱 **Mobile-first** — works on any modern browser (iOS Safari, Android Chrome)
- 🌅 **Two meals per day** — Breakfast (6 AM – 11 AM) and Lunch (12 PM – 4 PM)
- ⏰ **Time-restricted token windows** — automatic enforcement of meal timings
- 📸 **Photo-based identity verification** at the canteen counter
- 🔐 **Forced password change** on first login (default: `rentomojo123`)
- 📊 **Real-time canteen dashboard** with meal-type filters
- 📈 **Monthly consumption history** for each employee
- 🏢 **Multi-warehouse scoped access** by City + Warehouse
- 💰 **Zero infrastructure cost** — runs on Google's free tier

---

## 🏗️ Architecture

```
[ Employee / Canteen Staff Phone ]
            ↓ HTTPS
[ React Frontend (StackBlitz / Vercel) ]
            ↓ fetch() — JSON over HTTPS
[ Google Apps Script Web App ]
            ↓ Apps Script API
[ Google Sheets + Google Drive ]
```

**Tech Stack:**

| Layer | Technology |
|---|---|
| Frontend | React 18, Tailwind CSS, Lucide React icons |
| Backend | Google Apps Script (V8 runtime) |
| Database | Google Sheets (3 tabs) |
| Media Storage | Google Drive |
| Hosting | StackBlitz / Vercel |

---

## 📁 Repository Structure

```
canteen-token-system/
├── README.md                    ← you are here
├── LICENSE
├── .gitignore
│
├── backend/
│   └── Code.gs                  ← Google Apps Script backend (paste into Apps Script editor)
│
├── frontend/
│   ├── App.js                   ← React main component (paste into StackBlitz src/App.js)
│   ├── index.html               ← HTML entry point with Tailwind CDN
│   └── package.json             ← Dependencies (lucide-react)
│
├── sheet-template/
│   └── SHEET_STRUCTURE.md       ← Required Google Sheet structure and headers
│
└── docs/
    ├── Project_Report.docx      ← Full project report
    ├── DEPLOYMENT_GUIDE.md      ← Step-by-step deployment instructions
    └── API_REFERENCE.md         ← Backend API endpoints documentation
```

---

## 🚀 Quick Start

For full deployment instructions, see [`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md).

### TL;DR

1. **Create a Google Sheet** with three tabs: `user Detals`, `Token List`, `Canteen Person`.
2. **Open Extensions → Apps Script**, paste [`backend/Code.gs`](backend/Code.gs), run `setupSheets()`.
3. **Deploy as Web App** with "Who has access: Anyone". Copy the URL.
4. **Fork a React project on StackBlitz**, paste [`frontend/App.js`](frontend/App.js) and [`frontend/index.html`](frontend/index.html).
5. **Update the `DEFAULT_API_URL`** constant in App.js with your deployed URL.
6. **Add employees** to the `user Detals` tab in your Google Sheet.
7. **Open the StackBlitz preview URL** on any phone — system is live!

---

## 🔐 Default Credentials

- **All users start with password:** `rentomojo123`
- **On first login**, users are forced to set their own password.
- **To reset a password**, clear the Password cell in the Google Sheet — the user will be prompted to set a new one on next login.

---

## 📊 Google Sheet Tabs

### `user Detals` (Employee Master)
| City | Warehouse | Name | Designation | Phone Number | Password | Photo Link | Status |
|---|---|---|---|---|---|---|---|
| Mumbai | Tal-WH | Charan | IT Analyst | 9019773841 | *(blank)* | *(auto)* | Yes |

### `Token List` (Activity Log — append-only)
| Date | City | Warehouse | Name | Designation | Phone Number | Meal Type | Token ID | Canteen Person ID | Food Provided |
|---|---|---|---|---|---|---|---|---|---|
| 2026-05-27 | Mumbai | Tal-WH | Charan | IT Analyst | 9019773841 | breakfast | BRK-A7K2P | RMMUM101 | TRUE |

### `Canteen Person` (Staff Credentials)
| City | Warehouse | User ID | Password |
|---|---|---|---|
| Mumbai | Tal-WH | RMMUM101 | *(blank)* |

---

## 🔄 Workflows

### Employee Flow
1. Open app → tap **Employee Login**
2. Enter phone + password (`rentomojo123` first time)
3. Set new password on first login → take profile photo
4. Dashboard shows two meal cards: Breakfast and Lunch
5. Tap **Use Token** during the meal window → unique token ID appears
6. Show token to canteen staff to claim meal

### Canteen Staff Flow
1. Open app → tap **Canteen Staff**
2. Log in with User ID + password
3. Dashboard shows today's tokens for your warehouse, with employee photos
4. Filter by meal type (All / Breakfast / Lunch) or status (Pending / Served)
5. Verify identity using photo → tap **Food Provided**
6. Sheet updates in real time with timestamp and staff ID

---

## 🛠️ Customization

### Change meal time windows

In [`backend/Code.gs`](backend/Code.gs), update:

```javascript
const MEAL_WINDOWS = {
  breakfast: { startHour: 6,  endHour: 11, label: 'Breakfast' },
  lunch:     { startHour: 12, endHour: 16, label: 'Lunch' }
};
```

### Add a third meal (e.g., dinner)

1. Add to `MEAL_WINDOWS` in Code.gs.
2. Add to `MEALS` constant in App.js.
3. Add a third `<MealCard />` in `EmployeeDashboard`.

### Change default password

In Code.gs, update the constant:

```javascript
const DEFAULT_PASSWORD = 'rentomojo123';
```

---

## 🐛 Troubleshooting

| Issue | Fix |
|---|---|
| "Failed to fetch" | The Apps Script Web App URL is wrong or deployment isn't set to "Anyone". |
| "Phone not whitelisted" | Phone number in sheet has spaces/country code, or Status ≠ "Yes". |
| Photos don't display | Re-run `savePhoto` for affected users — old URL format may be stale. |
| Login keeps asking for default password | The password column in the sheet is still blank or `rentomojo123`. |

---

## 📈 Future Enhancements

- Add dinner as a third meal type
- Move to a custom domain (Vercel / Netlify)
- HRMS integration for automatic employee onboarding
- QR-code-on-token-display for scan-based serving
- Native Android app with offline support
- Migration to PostgreSQL/Supabase at scale

See the [Project Report](docs/Project_Report.docx) for the full roadmap.

---

## 📜 License

MIT — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgements

Thanks to the Rentomojo Warehouse Operations team for clearly articulating the problem and patiently testing each iteration. Thanks also to the canteen vendors for their cooperation during the pilot phase, and to the IT team for their assistance with the Workspace deployment policy.

---

**Built with care by Charan A Bijapur · IT Analyst · Rentomojo · May 2026**
