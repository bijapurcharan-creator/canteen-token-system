# Changelog

## [3.0.0] — 2026-05-29

### Added
- **All-in-Google-Apps-Script architecture** — removed React entirely
- **Session persistence** — 12-hour login persists across page refreshes
- **Visible Refresh & Sign out buttons** on both dashboards (employee + canteen)
- **Search bar** on canteen dashboard — search by phone number or last 5 digits of token ID
- **Photo enlargement modal** — tap any photo on canteen dashboard for full-screen view with employee details
- **Auto-refresh** — silent every 30s on employee dashboard, 15s on canteen
- **Clean hyperlinks** — photo URLs in Google Sheet now display as employee names (using HYPERLINK formula)
- **migratePhotoLinks() function** — one-time helper to convert existing long URLs to hyperlinks
- **Designer credit** — "Charan A Bijapur · IT Analyst" on home screen and settings
- **Smart search behavior** — when searching, status filter is automatically ignored so matches are always shown

### Changed
- Frontend code moved from React/JSX (App.js, 1235 lines) to vanilla HTML/JS (Index.html, 1120 lines)
- Deployment is now a single Apps Script Web App URL — no StackBlitz needed
- Token ID column in sheet now correctly tracked alongside meal type
- Undo button removed from served tokens — once served, it's final (audit-correctness)

### Fixed
- Meta tag deployment error in `doGet()` (removed disallowed apple-mobile-web-app-capable and theme-color tags)
- Refresh button now spins the icon (visual feedback) instead of full-screen spinner
- Auto-refresh no longer triggers full-screen spinner — feels smoother
- HTML escaping for names, designations, and token IDs (handles apostrophes, quotes safely)

## [2.0.0] — 2026-05-27

### Added
- Two-meal support — Breakfast (6 AM – 11 AM) and Lunch (12 PM – 4 PM)
- Token ID prefixes: `BRK-` for breakfast, `LCH-` for lunch
- Meal-type filter tabs on canteen dashboard
- Status sub-filter (Pending / Served / All)
- Time-window enforcement at the backend
- Fork-spoon SVG logo
- Two-button photo capture (Camera + Gallery)

### Changed
- `Token List` sheet gained a new `Meal Type` column
- Profile photos use `lh3.googleusercontent.com/d/` URLs (more reliable rendering)

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

**Project owner:** Charan A Bijapur · IT Analyst · Rentomojo
