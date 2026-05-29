# 🍽️ Canteen Token System — v3 (No React)

> **All-in-Google-Apps-Script version** — the entire app lives inside one Google Sheet's Apps Script project. No StackBlitz, no React, no separate hosting.

**Designed and developed by [Charan A Bijapur](https://github.com/bijapurcharan-creator) · IT Analyst · Rentomojo**

---

## 📋 What Changed From v2 (React Version)

| Feature | v2 (React) | v3 (No React) |
|---|---|---|
| Frontend hosting | StackBlitz / Vercel | None — Apps Script serves the HTML |
| Frontend code | React + JSX + npm | Plain HTML + JavaScript + Tailwind CDN |
| Files to edit | App.js (1235 lines, React) | Index.html (1120 lines, vanilla JS) |
| Deployment URL | StackBlitz preview URL | Apps Script Web App URL |
| Tech to learn | React, hooks, JSX | Plain HTML/JS — anyone can edit |
| Build step | npm install required | None |

**Same Google Sheet, same database structure, same UX, same features** — just simpler tech.

---

## ✨ Features

- 📱 Mobile-first — works on any browser (iOS Safari, Android Chrome)
- 🌅 Two meals per day — Breakfast (6 AM – 11 AM) and Lunch (12 PM – 4 PM)
- ⏰ Time-restricted token windows
- 📸 Photo-based identity verification with **tap-to-enlarge** modal
- 🔍 **Search by phone or token** on canteen dashboard
- 🔐 Forced password change on first login (default: `rentomojo123`)
- 📊 Real-time canteen dashboard with meal-type and status filters
- 📈 Monthly consumption history for each employee
- 🏢 Multi-warehouse scoped access by City + Warehouse
- 💾 **Session persistence** — refresh-safe (12-hour session)
- 🔗 **Clean hyperlinks** in Google Sheet (names instead of long URLs)
- 💰 Zero infrastructure cost — runs on Google's free tier

---

## 📁 Folder Structure

```
v3-no-react/
├── README.md             ← you are here
├── backend/
│   └── Code.gs           ← Apps Script — serves HTML + handles all API actions
├── frontend/
│   └── Index.html        ← Complete UI (vanilla HTML/JS/Tailwind)
└── docs/
    ├── SETUP.md          ← Step-by-step setup guide
    └── Project_Report.docx
```

**Just two code files: `Code.gs` and `Index.html`.** That's the entire app.

---

## 🚀 Quick Start

See **[docs/SETUP.md](docs/SETUP.md)** for the full step-by-step guide. TL;DR:

1. Create a new Google Sheet
2. Extensions → Apps Script
3. Paste `Code.gs` into the editor
4. Create a new HTML file named exactly **`Index`** → paste `Index.html`
5. Run `setupSheets()` → authorize
6. Deploy → New deployment → Web app → "Who has access: Anyone"
7. Open the URL → app loads in any browser

---

## 🏗️ How It Works

```
[ User opens Apps Script Web App URL ]
                    ↓
[ doGet() runs in Code.gs ]
                    ↓
[ Returns Index.html as a rendered page ]
                    ↓
[ User interacts → JavaScript calls google.script.run.apiCall() ]
                    ↓
[ apiCall() runs in same Apps Script → reads/writes Google Sheets ]
                    ↓
[ Returns JSON → frontend updates ]
```

**No CORS. No fetch. No external hosting.** Everything in one place.

---

## 🔄 Daily Operations

| Task | How |
|---|---|
| Add new employee | Add a row in `user Detals` tab, Status = Yes, leave Password blank |
| Block an employee | Change Status to `No` |
| Reset a password | Clear the Password cell — user re-sets on next login |
| Update meal hours | Edit `MEAL_WINDOWS` in `Code.gs` → Deploy new version |
| Update UI | Edit `Index.html` → Deploy new version |
| Monthly report | Pivot table on `Token List` tab |

---

## 📊 Google Sheet Structure (Same as v2)

### `user Detals` — Employee Master
| City | Warehouse | Name | Designation | Phone | Password | Photo Link | Status |

### `Token List` — Activity Log (append-only)
| Date | City | Warehouse | Name | Designation | Phone | Meal Type | Token ID | Canteen Person ID | Food Provided |

### `Canteen Person` — Staff Credentials
| City | Warehouse | User ID | Password |

---

## 🆚 Which Version Should You Use?

- **Use v3 (this folder)** if you want the simplest possible deployment — everything inside Google
- **Use v2 (root folder)** if you prefer a React-based codebase or plan to host frontend separately

Both versions read from the **same Google Sheet structure**, so you can switch between them without data loss.

---

**Built with ❤️ by Charan A Bijapur · IT Analyst · Rentomojo · May 2026**
