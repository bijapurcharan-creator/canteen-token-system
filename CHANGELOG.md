# Changelog

All notable changes to this project will be documented in this file.

## [3.2.2] — 2026-07-03

### Fixed
- CRITICAL: Race condition that allowed duplicate tokens when users rapid-tapped "Use Token"
  * Added LockService.tryLock() check in generateToken() and prebookTomorrow()
  * Prevents concurrent executions from bypassing duplicate detection
  * Frontend re-entry guards added for additional protection

### Added
- Daily audit email system (runs automatically at 10 PM)
  * Sends detailed report: tokens generated vs served
  * Per-warehouse breakdown with conversion rates
  * Automatic anomaly detection (duplicates, orphan employees)
  * Tomorrow's pre-booking preview
  * Recipient: charan.bijapur@rentomojo.com + bijapurcharan@gmail.com

### Tech
- Added escapeHtml() helper for safe HTML email generation
- Added cleanupDuplicateTokens() function for historical cleanup
- Added previewDuplicateCleanup() for safe dry-run testing
- Fixed SHEETS.CANTEEN → SHEETS.STAFF constant reference

## [2.0.0] — 2026-05-27

### Added
- **Two-meal support** — Breakfast (6 AM – 11 AM) and Lunch (12 PM – 4 PM)
- New `Meal Type` column in `Token List` sheet
- Token ID prefixes: `BRK-` for breakfast, `LCH-` for lunch
- Meal-type filter tabs on canteen dashboard (All / Breakfast / Lunch)
- Status sub-filter (Pending / Served / All)
- Auto-refresh every 15 seconds on canteen dashboard
- Time-window enforcement at the backend
- Fork-spoon SVG logo on home and login screens
- Two-button photo capture (Camera + Gallery) for cross-browser compatibility
- Server-side `getTodayTokens` endpoint returning both meals' status

### Changed
- Token ID format reduced from 6 to 5 random characters (prefix added)
- Profile photos now use `lh3.googleusercontent.com/d/` URLs (more reliable rendering)
- Hardcoded `DEFAULT_API_URL` constant — works out of the box
- Designer credit updated to show "Charan A Bijapur · IT Analyst"

### Fixed
- "undefined is not an object (res.employee.photoLink)" crash on first login
- API URL persistence via localStorage across browser sessions
- LockService wrapping for concurrent token generation safety

## [1.0.0] — 2026-05-26

### Added
- Initial release
- Single daily meal token system
- Phone + password login
- Forced password change on first login
- Photo capture and Drive storage
- Canteen staff dashboard with photo verification
- Monthly consumption history for employees
- Status flag for employee activation/deactivation
- City + Warehouse scoped access for canteen staff
- LockService-protected token generation

---

**Project owner:** Charan A Bijapur · IT Analyst · Rentomojo
