# Changelog

All notable changes to the Warehouse Canteen Meal Token System.

## [3.1.0] — 2026-06-02

### 🎉 Major Additions

#### Pre-booking Feature
- New **`Requests` sheet tab** dedicated to next-day meal pre-bookings (kept separate from real tokens for clean Token List reports)
- Employees can pre-book tomorrow's breakfast and/or lunch between **10 AM – 6 PM today**
- New big amber-orange gradient banner on employee dashboard for "Pre-book for Tomorrow"
- Cancel button (✕) lets employees withdraw a request before 6 PM
- Pre-booking does NOT generate a token immediately — it's purely a headcount marker
- When tomorrow arrives and the employee taps "Use Token" during the meal window, a real `BRK-`/`LCH-` token is created and the matching `Requests` row is consumed
- New **`Tomorrow's Prep`** section at the bottom of the canteen dashboard:
  - Big count cards showing total breakfasts and lunches needed for tomorrow
  - List of all employees who pre-booked (with photos)
  - Open/closed status indicator (`Booking open until 6 PM` / `Booking closed for tomorrow`)

#### Canteen Dashboard — Search & Photo Modal
- **Search bar** at the top of the canteen dashboard
  - Search by phone number (full or partial)
  - Search by token last 5 digits (e.g., `FM2GC` finds `BRK-FM2GC`)
  - Search by full token code
  - Auto-clears Pending/Served filter while searching so all matches surface — with an amber banner explaining this
- **Photo enlargement modal** — tap any small thumbnail to see the photo full-screen with employee name, location, meal type, and token ID. Tap outside or press ESC to close.

#### Employee Dashboard — Compact Layout
- History moved out of the inline scroll into its own dedicated screen (`screen-emp-history`)
- New pill button at the top of the dashboard: `📜 History [count]` opens the history screen
- History stats grid showing three counters: served breakfasts, served lunches, total served
- History now shows **only served meals** — pending tokens and pre-bookings are excluded so this is a true "meals eaten" record

### 🎨 UI/UX Improvements
- **Refresh & Sign Out buttons** now visible with proper styling on both employee and canteen dark headers (previously they were nearly invisible)
- Refresh button shows a spinning icon during fetch instead of triggering the full-screen loader
- Auto-refresh on canteen dashboard runs silently every 15 seconds; employee dashboard auto-refreshes every 30 seconds
- The "Tomorrow" section heading is now a big bold amber-to-orange gradient banner
- "Undo" button removed from served tokens — meals once marked served are now final (audit-correctness)

### 🔧 Backend Improvements
- New `PREBOOK_WINDOW` constant for easy adjustment of pre-booking hours
- New helper: `readPhotoLink(sheet, rowIndex)` and `readAllPhotoLinks(sheet)` to safely read photo URLs whether stored as plain URL or HYPERLINK formula
- New helper: `requestRowToObject(row)` for converting Requests sheet rows
- `savePhoto()` now stores photo links as `=HYPERLINK("url","Name")` formulas so the sheet displays employee names instead of long URLs
- `generateToken()` consumes any matching pre-booking from `Requests` sheet when an employee taps "Use Token"
- LockService still protects against duplicate token generation on rapid taps
- Fixed: `addMetaTag` error on deployment by removing disallowed `apple-mobile-web-app-capable` and `theme-color` meta tags
- HTML escaping for names, designations, and token IDs (protects against names with quotes/apostrophes)

### 📚 Documentation
- New comprehensive **User Manual** (`docs/User_Manual.docx`) with real app screenshots — 8 employee steps + 8 canteen staff steps + Quick Reference Card + Common Issues
- New printable **Scan Poster** (`docs/Scan_Poster.docx`) — A4 launch poster with QR code, meal timings, default password, and HRBP contact
- QR code image (`assets/canteen_qr_code.png`) for distribution materials
- Migration helpers added: `migratePhotoLinks()` and `migrateRequestedToRequestsSheet()` — safe to re-run, both are no-ops when nothing to migrate

---

## [3.0.0] — 2026-05-29

### Added
- **All-in-Google-Apps-Script architecture** — removed React entirely
- **Session persistence** — 12-hour login persists across page refreshes
- Designer credit ("Charan A Bijapur · IT Engineer") on home screen and footer

### Changed
- Frontend code moved from React/JSX (App.js, 1235 lines) to vanilla HTML/JS (Index.html)
- Deployment is now a single Apps Script Web App URL — no StackBlitz needed
- Token ID column in sheet now correctly tracked alongside meal type

---

## [2.0.0] — 2026-05-27

### Added
- Two-meal support — Breakfast (6 AM – 11 AM) and Lunch (12 PM – 4 PM)
- Token ID prefixes: `BRK-` for breakfast, `LCH-` for lunch
- Meal-type filter tabs on canteen dashboard (All / Breakfast / Lunch)
- Status sub-filter (Pending / Served / All)
- Time-window enforcement at the backend
- Fork-spoon SVG logo
- Two-button photo capture (Camera + Gallery)

### Changed
- `Token List` sheet gained a new `Meal Type` column
- Profile photos use `lh3.googleusercontent.com/d/` URLs (more reliable rendering)

---

## [1.0.0] — 2026-05-26

### Added
- Initial release with single daily meal token
- Phone + password login
- Force password change on first login
- Photo capture and Drive storage
- Canteen dashboard with photo verification
- Monthly history
- LockService-protected token generation

---

**Project owner:** Charan A Bijapur · IT Engineer · Rentomojo
