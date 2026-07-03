/**
 * ═══════════════════════════════════════════════════════════════════
 *  CANTEEN TOKEN SYSTEM — v3 (All-in-Google-Apps-Script)
 * ═══════════════════════════════════════════════════════════════════
 *
 *  This single Apps Script project does EVERYTHING:
 *    • Serves the HTML user interface (doGet)
 *    • Handles all API actions (doPost)
 *    • Reads/writes Google Sheets
 *    • Saves photos to Google Drive
 *
 *  No external hosting required. The Apps Script Web App URL IS
 *  the app URL. Open it in any browser to use the system.
 *
 *  Designed by Charan A Bijapur · IT Analyst · Rentomojo
 * ═══════════════════════════════════════════════════════════════════
 *
 *  SETUP
 *  ─────
 *  1. Google Sheet → Extensions → Apps Script.
 *  2. Paste this Code.gs file. Create a new HTML file named "Index"
 *     and paste the Index.html content there.
 *  3. Save. Run setupSheets() once to create headers.
 *  4. Deploy → New deployment → Web app:
 *       Execute as: Me
 *       Who has access: Anyone
 *     Click Deploy → copy the URL.
 *  5. Open the URL in any browser. The app loads directly.
 *
 *  SHEET TABS
 *  ──────────
 *  user Detals     — Employees (whitelist + status)
 *  Token List      — Append-only token log
 *  Canteen Person  — Canteen staff credentials
 * ═══════════════════════════════════════════════════════════════════
 */

const DEFAULT_PASSWORD = 'rentomojo123';

const MEAL_WINDOWS = {
  breakfast: { startHour: 6,  endHour: 11, label: 'Breakfast' },
  lunch:     { startHour: 12, endHour: 16, label: 'Lunch' }
};

// Window during which employees can pre-book tomorrow's meals (Asia/Kolkata local hours)
const PREBOOK_WINDOW = { startHour: 10, endHour: 18, label: '10 AM – 6 PM' };

const SS = () => SpreadsheetApp.getActiveSpreadsheet();

const SHEETS = {
  USERS: 'user Detals',
  TOKENS: 'Token List',
  STAFF: 'Canteen Person',
  REQUESTS: 'Requests'
};

const U = { CITY: 1, WAREHOUSE: 2, NAME: 3, DESIGNATION: 4,
            PHONE: 5, PASSWORD: 6, PHOTO: 7, STATUS: 8 };

const T = { DATE: 1, CITY: 2, WAREHOUSE: 3, NAME: 4, DESIGNATION: 5,
            PHONE: 6, MEAL_TYPE: 7, TOKEN_ID: 8, CANTEEN_PERSON: 9, FOOD_PROVIDED: 10 };

// Requests tab columns: Date | City | Warehouse | Name | Designation | Phone | Meal Type | Requested At
const R = { DATE: 1, CITY: 2, WAREHOUSE: 3, NAME: 4, DESIGNATION: 5,
            PHONE: 6, MEAL_TYPE: 7, REQUESTED_AT: 8 };

const C = { CITY: 1, WAREHOUSE: 2, USER_ID: 3, PASSWORD: 4 };


// ═════════════ doGet — SERVES THE WEB APP ═════════════════════════
/**
 * When someone opens the Apps Script Web App URL in a browser,
 * doGet runs and returns the HTML page from Index.html.
 *
 * If called with ?api=1, it returns a JSON status check instead
 * (useful for testing the deployment).
 */
function doGet(e) {
  if (e && e.parameter && e.parameter.api === '1') {
    return ContentService
      .createTextOutput(JSON.stringify({
        ok: true, message: 'Canteen Token API v3 live', time: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Warehouse Canteen — Meal Token System')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}


// ═════════════ doPost — HANDLES API ACTIONS ═══════════════════════
function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    const result = dispatch(req);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, ...result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function dispatch(req) {
  const handlers = {
    loginEmployee, setEmployeePassword,
    loginCanteen, setCanteenPassword,
    savePhoto, generateToken,
    getMonthlyHistory, getTodayTokens,
    getCanteenTokens, markServed,
    prebookTomorrow, cancelPrebooking,
    getTomorrowBookings,
    getCanteenHistory,
    getCanteenDetailedReport
  };
  const fn = handlers[req.action];
  if (!fn) throw new Error('Unknown action: ' + req.action);
  return fn(req);
}


// ═════════════ google.script.run BRIDGE ═══════════════════════════
/**
 * The HTML frontend can call this directly using google.script.run
 * — no HTTP requests needed. Same handler logic as doPost.
 * Faster and more reliable than fetch().
 */
function apiCall(action, payload) {
  try {
    const req = Object.assign({ action: action }, payload || {});
    const result = dispatch(req);
    return { ok: true, ...result };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}


// ═════════════ UTILITIES ══════════════════════════════════════════
function tz()         { return SS().getSpreadsheetTimeZone() || 'Asia/Kolkata'; }
function todayKey()   { return Utilities.formatDate(new Date(), tz(), 'yyyy-MM-dd'); }
function tomorrowKey() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return Utilities.formatDate(d, tz(), 'yyyy-MM-dd');
}
function monthPrefix(){ return Utilities.formatDate(new Date(), tz(), 'yyyy-MM'); }
function nowISO()     { return new Date().toISOString(); }
function currentHour(){ return parseInt(Utilities.formatDate(new Date(), tz(), 'HH'), 10); }

function isPrebookOpen() {
  const h = currentHour();
  return h >= PREBOOK_WINDOW.startHour && h < PREBOOK_WINDOW.endHour;
}

function generateTokenCode(mealType) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return (mealType === 'breakfast' ? 'BRK' : 'LCH') + '-' + code;
}

function getSheet(name) {
  const sh = SS().getSheetByName(name);
  if (!sh) throw new Error('Sheet tab not found: "' + name + '". Run setupSheets() first.');
  return sh;
}

function normPhone(p) { return String(p).replace(/\D/g, ''); }

/**
 * Read the photo link for a given row. Photos may be stored as:
 *   - a plain URL string in the cell (legacy)
 *   - a HYPERLINK formula like =HYPERLINK("url","Name")
 * In both cases we want the actual URL.
 */
function readPhotoLink(sheet, rowIndex) {
  const cell = sheet.getRange(rowIndex, U.PHOTO);
  const formula = cell.getFormula();
  if (formula && formula.toUpperCase().indexOf('HYPERLINK') !== -1) {
    // Extract the URL from =HYPERLINK("url","label")
    const m = formula.match(/HYPERLINK\s*\(\s*"([^"]+)"/i);
    if (m && m[1]) return m[1];
  }
  // Fall back to plain text value
  const value = cell.getValue();
  return value ? String(value) : null;
}

/**
 * Read all photo links in one shot — returns a map of normPhone → URL.
 * Faster than calling readPhotoLink() in a loop for big sheets.
 */
function readAllPhotoLinks(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return {};
  const phones = sheet.getRange(2, U.PHONE, lastRow - 1, 1).getValues();
  const photos = sheet.getRange(2, U.PHOTO, lastRow - 1, 1).getValues();
  const formulas = sheet.getRange(2, U.PHOTO, lastRow - 1, 1).getFormulas();
  const map = {};
  for (let i = 0; i < phones.length; i++) {
    const phone = normPhone(phones[i][0]);
    if (!phone) continue;
    const formula = formulas[i][0];
    if (formula && formula.toUpperCase().indexOf('HYPERLINK') !== -1) {
      const m = formula.match(/HYPERLINK\s*\(\s*"([^"]+)"/i);
      map[phone] = (m && m[1]) ? m[1] : null;
    } else {
      map[phone] = photos[i][0] ? String(photos[i][0]) : null;
    }
  }
  return map;
}

function dateMatches(cellValue, key) {
  if (cellValue instanceof Date) {
    return Utilities.formatDate(cellValue, tz(), 'yyyy-MM-dd') === key;
  }
  return String(cellValue).slice(0, 10) === key;
}

function isMealAvailableNow(mealType) {
  const w = MEAL_WINDOWS[mealType];
  if (!w) return false;
  const h = currentHour();
  return h >= w.startHour && h < w.endHour;
}

function isDefaultPassword(stored) {
  if (stored === null || stored === undefined) return true;
  const s = String(stored).trim();
  return s === '' || s === DEFAULT_PASSWORD;
}

function validateNewPassword(p) {
  if (typeof p !== 'string') return 'Password missing';
  if (p.length < 4) return 'Password must be at least 4 characters';
  if (p === DEFAULT_PASSWORD) return 'Please choose a password different from the default';
  return null;
}


// ═════════════ EMPLOYEE LOGIN ═════════════════════════════════════
function loginEmployee(req) {
  const sh = getSheet(SHEETS.USERS);
  const rows = sh.getDataRange().getValues();
  const target = normPhone(req.phone);

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (normPhone(r[U.PHONE - 1]) !== target) continue;

    const status = String(r[U.STATUS - 1]).trim().toLowerCase();
    if (status !== 'yes') return { error: 'Account inactive. Contact your supervisor.' };

    const stored = r[U.PASSWORD - 1];
    if (isDefaultPassword(stored)) {
      if (String(req.password) !== DEFAULT_PASSWORD) {
        return { error: 'Use the default password (' + DEFAULT_PASSWORD + ') to log in for the first time' };
      }
      return {
        mustChangePassword: true,
        employee: { phone: target, name: r[U.NAME - 1], designation: r[U.DESIGNATION - 1] }
      };
    }
    if (String(stored) !== String(req.password)) return { error: 'Incorrect password' };

    return {
      employee: {
        phone: target,
        name: r[U.NAME - 1],
        designation: r[U.DESIGNATION - 1],
        city: r[U.CITY - 1],
        warehouse: r[U.WAREHOUSE - 1],
        photoLink: readPhotoLink(sh, i + 1)
      }
    };
  }
  return { error: 'Phone not whitelisted' };
}

function setEmployeePassword(req) {
  const err = validateNewPassword(req.newPassword);
  if (err) return { error: err };

  const sh = getSheet(SHEETS.USERS);
  const rows = sh.getDataRange().getValues();
  const target = normPhone(req.phone);

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (normPhone(r[U.PHONE - 1]) !== target) continue;
    const status = String(r[U.STATUS - 1]).trim().toLowerCase();
    if (status !== 'yes') return { error: 'Account inactive' };
    if (!isDefaultPassword(r[U.PASSWORD - 1])) {
      return { error: 'Password is already set. Use the login screen.' };
    }
    sh.getRange(i + 1, U.PASSWORD).setValue(req.newPassword);
    return {
      employee: {
        phone: target, name: r[U.NAME - 1], designation: r[U.DESIGNATION - 1],
        city: r[U.CITY - 1], warehouse: r[U.WAREHOUSE - 1],
        photoLink: readPhotoLink(sh, i + 1)
      }
    };
  }
  return { error: 'Phone not found' };
}


// ═════════════ CANTEEN STAFF LOGIN ════════════════════════════════
function loginCanteen(req) {
  const sh = getSheet(SHEETS.STAFF);
  const rows = sh.getDataRange().getValues();
  const target = String(req.userId).trim();

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (String(r[C.USER_ID - 1]).trim() !== target) continue;
    const stored = r[C.PASSWORD - 1];
    if (isDefaultPassword(stored)) {
      if (String(req.password) !== DEFAULT_PASSWORD) {
        return { error: 'Use the default password (' + DEFAULT_PASSWORD + ') to log in for the first time' };
      }
      return { mustChangePassword: true, staff: { userId: target } };
    }
    if (String(stored) !== String(req.password)) return { error: 'Incorrect password' };
    return { staff: { userId: target, city: r[C.CITY - 1], warehouse: r[C.WAREHOUSE - 1] } };
  }
  return { error: 'Invalid User ID' };
}

function setCanteenPassword(req) {
  const err = validateNewPassword(req.newPassword);
  if (err) return { error: err };

  const sh = getSheet(SHEETS.STAFF);
  const rows = sh.getDataRange().getValues();
  const target = String(req.userId).trim();

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (String(r[C.USER_ID - 1]).trim() !== target) continue;
    if (!isDefaultPassword(r[C.PASSWORD - 1])) {
      return { error: 'Password is already set. Use the login screen.' };
    }
    sh.getRange(i + 1, C.PASSWORD).setValue(req.newPassword);
    return { staff: { userId: target, city: r[C.CITY - 1], warehouse: r[C.WAREHOUSE - 1] } };
  }
  return { error: 'User ID not found' };
}


// ═════════════ PROFILE PHOTO ══════════════════════════════════════
function savePhoto(req) {
  const sh = getSheet(SHEETS.USERS);
  const rows = sh.getDataRange().getValues();
  const target = normPhone(req.phone);

  for (let i = 1; i < rows.length; i++) {
    if (normPhone(rows[i][U.PHONE - 1]) !== target) continue;

    const match = String(req.photoDataUrl).match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) return { error: 'Invalid photo data' };
    const mime = match[1];
    const bytes = Utilities.base64Decode(match[2]);
    const ext = (mime.split('/')[1] || 'jpg').toLowerCase();

    const folder = getOrCreatePhotoFolder();
    const fileName = 'profile_' + target + '.' + ext;
    const existing = folder.getFilesByName(fileName);
    while (existing.hasNext()) existing.next().setTrashed(true);

    const file = folder.createFile(Utilities.newBlob(bytes, mime, fileName));
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const viewUrl = 'https://lh3.googleusercontent.com/d/' + file.getId();
    const employeeName = String(rows[i][U.NAME - 1] || 'View Photo').replace(/"/g, '""');

    // Write a HYPERLINK formula so the cell shows the name (clickable) instead of the long URL
    const formula = '=HYPERLINK("' + viewUrl + '","' + employeeName + '")';
    sh.getRange(i + 1, U.PHOTO).setFormula(formula);

    return { photoLink: viewUrl };
  }
  return { error: 'Phone not found' };
}

function getOrCreatePhotoFolder() {
  const folders = DriveApp.getFoldersByName('Canteen Photos');
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder('Canteen Photos');
}


// ═════════════ TOKEN GENERATION ═══════════════════════════════════
function generateToken(req) {
  const mealType = req.mealType;
  if (!MEAL_WINDOWS[mealType]) return { error: 'Invalid meal type' };

  if (!isMealAvailableNow(mealType)) {
    const w = MEAL_WINDOWS[mealType];
    return { error: w.label + ' is only available from ' + w.startHour + ':00 to ' + w.endHour + ':00' };
  }

  const target = normPhone(req.phone);
  const today = todayKey();
  const lock = LockService.getScriptLock();

  // CRITICAL: tryLock returns false if lock can't be acquired. If we don't check
  // this, the code below runs WITHOUT a lock and concurrent calls create duplicate
  // tokens (seen in production: one user got 5 breakfast tokens by rapid-tapping).
  if (!lock.tryLock(15000)) {
    return { error: 'System is busy — please wait a moment and try again.' };
  }

  try {
    const tSheet = getSheet(SHEETS.TOKENS);
    const tRows = tSheet.getDataRange().getValues();

    // If a real token already exists today, return it
    for (let i = 1; i < tRows.length; i++) {
      if (normPhone(tRows[i][T.PHONE - 1]) === target &&
          dateMatches(tRows[i][T.DATE - 1], today) &&
          String(tRows[i][T.MEAL_TYPE - 1]).toLowerCase() === mealType) {
        return { token: rowToToken(tRows[i]) };
      }
    }

    // Look up employee
    const uRows = getSheet(SHEETS.USERS).getDataRange().getValues();
    let emp = null;
    for (let i = 1; i < uRows.length; i++) {
      if (normPhone(uRows[i][U.PHONE - 1]) === target) {
        const status = String(uRows[i][U.STATUS - 1]).trim().toLowerCase();
        if (status !== 'yes') return { error: 'Account inactive' };
        emp = {
          city: uRows[i][U.CITY - 1], warehouse: uRows[i][U.WAREHOUSE - 1],
          name: uRows[i][U.NAME - 1], designation: uRows[i][U.DESIGNATION - 1]
        };
        break;
      }
    }
    if (!emp) return { error: 'Employee not found' };

    // NOTE: We intentionally do NOT delete the matching pre-booking row from the
    // Requests sheet. The Requests sheet is a historical log of every pre-booking
    // ever made — it stays as-is so we have a complete audit of requests vs tokens.
    // Rows are removed from Requests ONLY when the employee explicitly cancels.

    // Always create a fresh row in Token List with the real generated token
    const tokenId = generateTokenCode(mealType);
    tSheet.appendRow([
      today, emp.city, emp.warehouse, emp.name, emp.designation,
      "'" + target, mealType, tokenId, '', false
    ]);

    return {
      token: {
        date: today, city: emp.city, warehouse: emp.warehouse,
        name: emp.name, designation: emp.designation, phone: target,
        mealType: mealType, tokenId: tokenId, canteenPersonId: '', foodProvided: false,
        generatedAt: nowISO()
      }
    };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}


// ═════════════ TODAY'S TOKENS (employee) ══════════════════════════
function getTodayTokens(req) {
  const target = normPhone(req.phone);
  const today = todayKey();
  const tomorrow = tomorrowKey();
  const todayTokens = { breakfast: null, lunch: null };
  const tomorrowTokens = { breakfast: null, lunch: null };

  // Today's REAL tokens come from Token List
  const tRows = getSheet(SHEETS.TOKENS).getDataRange().getValues();
  for (let i = 1; i < tRows.length; i++) {
    if (normPhone(tRows[i][T.PHONE - 1]) !== target) continue;
    const mt = String(tRows[i][T.MEAL_TYPE - 1]).toLowerCase();
    if (mt !== 'breakfast' && mt !== 'lunch') continue;
    if (dateMatches(tRows[i][T.DATE - 1], today)) {
      todayTokens[mt] = rowToToken(tRows[i]);
    }
  }

  // Tomorrow's PRE-BOOKINGS come from Requests sheet
  const rRows = getSheet(SHEETS.REQUESTS).getDataRange().getValues();
  for (let i = 1; i < rRows.length; i++) {
    if (normPhone(rRows[i][R.PHONE - 1]) !== target) continue;
    if (!dateMatches(rRows[i][R.DATE - 1], tomorrow)) continue;
    const mt = String(rRows[i][R.MEAL_TYPE - 1]).toLowerCase();
    if (mt === 'breakfast' || mt === 'lunch') {
      tomorrowTokens[mt] = requestRowToObject(rRows[i]);
    }
  }

  return {
    tokens: todayTokens,
    tomorrowTokens: tomorrowTokens,
    tomorrowDate: tomorrow,
    serverHour: currentHour(),
    breakfastAvailable: isMealAvailableNow('breakfast'),
    lunchAvailable: isMealAvailableNow('lunch'),
    prebookOpen: isPrebookOpen(),
    prebookWindow: PREBOOK_WINDOW.label
  };
}


// ═════════════ PRE-BOOK TOMORROW'S MEAL ═══════════════════════════
function prebookTomorrow(req) {
  const mealType = req.mealType;
  if (!MEAL_WINDOWS[mealType]) return { error: 'Invalid meal type' };

  if (!isPrebookOpen()) {
    return { error: 'Pre-booking is only open from ' + PREBOOK_WINDOW.label + ' today' };
  }

  const target = normPhone(req.phone);
  const tomorrow = tomorrowKey();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    return { error: 'System is busy — please wait a moment and try again.' };
  }

  try {
    const rSheet = getSheet(SHEETS.REQUESTS);
    const rRows = rSheet.getDataRange().getValues();

    // If already requested, return existing — don't duplicate
    for (let i = 1; i < rRows.length; i++) {
      if (normPhone(rRows[i][R.PHONE - 1]) === target &&
          dateMatches(rRows[i][R.DATE - 1], tomorrow) &&
          String(rRows[i][R.MEAL_TYPE - 1]).toLowerCase() === mealType) {
        return { booking: requestRowToObject(rRows[i]), alreadyBooked: true };
      }
    }

    // Look up employee details
    const uRows = getSheet(SHEETS.USERS).getDataRange().getValues();
    let emp = null;
    for (let i = 1; i < uRows.length; i++) {
      if (normPhone(uRows[i][U.PHONE - 1]) === target) {
        const status = String(uRows[i][U.STATUS - 1]).trim().toLowerCase();
        if (status !== 'yes') return { error: 'Account inactive' };
        emp = {
          city: uRows[i][U.CITY - 1], warehouse: uRows[i][U.WAREHOUSE - 1],
          name: uRows[i][U.NAME - 1], designation: uRows[i][U.DESIGNATION - 1]
        };
        break;
      }
    }
    if (!emp) return { error: 'Employee not found' };

    // Write to Requests sheet — no token ID at all; this is purely a headcount marker.
    rSheet.appendRow([
      tomorrow, emp.city, emp.warehouse, emp.name, emp.designation,
      "'" + target, mealType, nowISO()
    ]);

    return {
      booking: {
        date: tomorrow, city: emp.city, warehouse: emp.warehouse,
        name: emp.name, designation: emp.designation, phone: target,
        mealType: mealType, tokenId: '', canteenPersonId: '', foodProvided: false,
        requested: true
      }
    };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}


// ═════════════ CANCEL A PRE-BOOKING ═══════════════════════════════
function cancelPrebooking(req) {
  if (!isPrebookOpen()) {
    return { error: 'Pre-booking changes are only allowed during ' + PREBOOK_WINDOW.label };
  }

  const target = normPhone(req.phone);
  const tomorrow = tomorrowKey();
  const mealType = req.mealType;
  const sh = getSheet(SHEETS.REQUESTS);
  const rows = sh.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (normPhone(rows[i][R.PHONE - 1]) !== target) continue;
    if (!dateMatches(rows[i][R.DATE - 1], tomorrow)) continue;
    if (String(rows[i][R.MEAL_TYPE - 1]).toLowerCase() !== mealType) continue;
    sh.deleteRow(i + 1);
    return { cancelled: true };
  }
  return { error: 'Booking not found' };
}


// ═════════════ TOMORROW'S BOOKINGS (for canteen) ══════════════════
function getTomorrowBookings(req) {
  const tomorrow = tomorrowKey();
  const rRows = getSheet(SHEETS.REQUESTS).getDataRange().getValues();
  const photoMap = readAllPhotoLinks(getSheet(SHEETS.USERS));

  const out = [];
  for (let i = 1; i < rRows.length; i++) {
    if (!dateMatches(rRows[i][R.DATE - 1], tomorrow)) continue;
    if (String(rRows[i][R.CITY - 1]).trim() !== String(req.city).trim()) continue;
    if (String(rRows[i][R.WAREHOUSE - 1]).trim() !== String(req.warehouse).trim()) continue;
    const tok = requestRowToObject(rRows[i]);
    tok.photoLink = photoMap[tok.phone] || null;
    out.push(tok);
  }

  const breakfastCount = out.filter(function(t){ return t.mealType === 'breakfast'; }).length;
  const lunchCount = out.filter(function(t){ return t.mealType === 'lunch'; }).length;

  return {
    bookings: out,
    breakfastCount: breakfastCount,
    lunchCount: lunchCount,
    tomorrowDate: tomorrow,
    prebookOpen: isPrebookOpen(),
    prebookWindow: PREBOOK_WINDOW.label
  };
}


// ═════════════ CANTEEN MONTHLY SERVICE HISTORY ════════════════════
/**
 * Returns month-wise breakdown of tokens GENERATED vs ACTUALLY SERVED
 * for the given canteen's city + warehouse, split by meal type.
 *
 * "Generated"  = employee tapped "Use Token" — row exists in Token List
 * "Served"     = canteen staff tapped "Food Provided" — Food Provided = TRUE
 *
 * Returns months sorted newest first.
 */
function getCanteenHistory(req) {
  const tRows = getSheet(SHEETS.TOKENS).getDataRange().getValues();
  const tz_ = tz();
  const city = String(req.city || '').trim();
  const warehouse = String(req.warehouse || '').trim();
  const months = {}; // monthKey -> { breakfast: { gen, srv }, lunch: { gen, srv } }

  for (let i = 1; i < tRows.length; i++) {
    const row = tRows[i];
    if (String(row[T.CITY - 1]).trim() !== city) continue;
    if (String(row[T.WAREHOUSE - 1]).trim() !== warehouse) continue;

    const mealType = String(row[T.MEAL_TYPE - 1] || '').toLowerCase();
    if (mealType !== 'breakfast' && mealType !== 'lunch') continue;

    const dateVal = row[T.DATE - 1];
    let monthKey;
    if (dateVal instanceof Date) {
      monthKey = Utilities.formatDate(dateVal, tz_, 'yyyy-MM');
    } else {
      monthKey = String(dateVal).slice(0, 7);
    }
    if (!monthKey || monthKey.length !== 7) continue;

    const fp = row[T.FOOD_PROVIDED - 1];
    const served = fp === true || String(fp).toLowerCase() === 'true';

    if (!months[monthKey]) {
      months[monthKey] = {
        breakfast: { generated: 0, served: 0 },
        lunch:     { generated: 0, served: 0 }
      };
    }
    months[monthKey][mealType].generated++;
    if (served) months[monthKey][mealType].served++;
  }

  // Sort newest month first
  const keys = Object.keys(months).sort().reverse();
  const out = keys.map(function(key) {
    const d = months[key];
    return {
      monthKey: key,
      breakfast: d.breakfast,
      lunch: d.lunch,
      total: {
        generated: d.breakfast.generated + d.lunch.generated,
        served: d.breakfast.served + d.lunch.served
      }
    };
  });

  return { months: out };
}


// ═════════════ CANTEEN DETAILED REPORT (for Excel export) ════════
/**
 * Returns a flat list of every token generated for the given canteen's
 * city + warehouse within the given month — with full transactional detail
 * (who, when, what meal, served Y/N, served by).
 *
 * Used by the frontend "Export to Excel" feature on the Service History screen.
 */
function getCanteenDetailedReport(req) {
  const tRows = getSheet(SHEETS.TOKENS).getDataRange().getValues();
  const tz_ = tz();
  const city = String(req.city || '').trim();
  const warehouse = String(req.warehouse || '').trim();
  const monthKey = String(req.monthKey || '').trim();  // "yyyy-MM"

  const out = [];
  for (let i = 1; i < tRows.length; i++) {
    const row = tRows[i];
    if (String(row[T.CITY - 1]).trim() !== city) continue;
    if (String(row[T.WAREHOUSE - 1]).trim() !== warehouse) continue;

    const mealType = String(row[T.MEAL_TYPE - 1] || '').toLowerCase();
    if (mealType !== 'breakfast' && mealType !== 'lunch') continue;

    const dateVal = row[T.DATE - 1];
    let dateStr, rowMonthKey;
    if (dateVal instanceof Date) {
      dateStr      = Utilities.formatDate(dateVal, tz_, 'yyyy-MM-dd');
      rowMonthKey  = Utilities.formatDate(dateVal, tz_, 'yyyy-MM');
    } else {
      dateStr      = String(dateVal).slice(0, 10);
      rowMonthKey  = String(dateVal).slice(0, 7);
    }
    if (monthKey && rowMonthKey !== monthKey) continue;

    const fp = row[T.FOOD_PROVIDED - 1];
    const served = fp === true || String(fp).toLowerCase() === 'true';

    out.push({
      date: dateStr,
      name: String(row[T.NAME - 1] || ''),
      phone: normPhone(row[T.PHONE - 1]),
      designation: String(row[T.DESIGNATION - 1] || ''),
      mealType: mealType === 'breakfast' ? 'Breakfast' : 'Lunch',
      tokenId: String(row[T.TOKEN_ID - 1] || ''),
      foodProvided: served ? 'Yes' : 'No',
      canteenPersonId: served ? String(row[T.CANTEEN_PERSON - 1] || '') : ''
    });
  }

  // Sort by date ascending, then meal (Breakfast before Lunch)
  out.sort(function(a, b) {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.mealType < b.mealType ? -1 : (a.mealType > b.mealType ? 1 : 0);
  });

  return { rows: out, monthKey: monthKey, city: city, warehouse: warehouse };
}


// ═════════════ REQUEST ROW → OBJECT ═══════════════════════════════
function requestRowToObject(r) {
  const dateVal = r[R.DATE - 1];
  const date = dateVal instanceof Date
    ? Utilities.formatDate(dateVal, tz(), 'yyyy-MM-dd')
    : String(dateVal).slice(0, 10);
  return {
    date: date,
    city: r[R.CITY - 1],
    warehouse: r[R.WAREHOUSE - 1],
    name: r[R.NAME - 1],
    designation: r[R.DESIGNATION - 1],
    phone: normPhone(r[R.PHONE - 1]),
    mealType: String(r[R.MEAL_TYPE - 1] || '').toLowerCase(),
    tokenId: '',
    canteenPersonId: '',
    foodProvided: false,
    requested: true
  };
}


// ═════════════ MONTHLY HISTORY ════════════════════════════════════
function getMonthlyHistory(req) {
  const target = normPhone(req.phone);
  const prefix = monthPrefix();
  const rows = getSheet(SHEETS.TOKENS).getDataRange().getValues();
  const out = [];

  for (let i = 1; i < rows.length; i++) {
    if (normPhone(rows[i][T.PHONE - 1]) !== target) continue;
    const dateStr = rows[i][T.DATE - 1] instanceof Date
      ? Utilities.formatDate(rows[i][T.DATE - 1], tz(), 'yyyy-MM-dd')
      : String(rows[i][T.DATE - 1]).slice(0, 10);
    if (dateStr.startsWith(prefix)) out.push(rowToToken(rows[i]));
  }
  out.sort(function(a, b) {
    if (a.date !== b.date) return String(b.date).localeCompare(String(a.date));
    return (a.mealType || '').localeCompare(b.mealType || '');
  });
  return { history: out };
}


// ═════════════ CANTEEN TOKENS ═════════════════════════════════════
function getCanteenTokens(req) {
  const today = todayKey();
  const tRows = getSheet(SHEETS.TOKENS).getDataRange().getValues();

  const usersSheet = getSheet(SHEETS.USERS);
  const photoMap = readAllPhotoLinks(usersSheet);

  const out = [];
  for (let i = 1; i < tRows.length; i++) {
    if (!dateMatches(tRows[i][T.DATE - 1], today)) continue;
    if (String(tRows[i][T.CITY - 1]).trim() !== String(req.city).trim()) continue;
    if (String(tRows[i][T.WAREHOUSE - 1]).trim() !== String(req.warehouse).trim()) continue;
    const tok = rowToToken(tRows[i]);
    tok.photoLink = photoMap[tok.phone] || null;
    out.push(tok);
  }
  return { tokens: out, serverHour: currentHour() };
}


// ═════════════ MARK SERVED ════════════════════════════════════════
function markServed(req) {
  const target = normPhone(req.phone);
  const today = todayKey();
  const sh = getSheet(SHEETS.TOKENS);
  const rows = sh.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (normPhone(rows[i][T.PHONE - 1]) !== target) continue;
    if (!dateMatches(rows[i][T.DATE - 1], today)) continue;
    if (String(rows[i][T.MEAL_TYPE - 1]).toLowerCase() !== String(req.mealType).toLowerCase()) continue;

    const rowNum = i + 1;
    sh.getRange(rowNum, T.FOOD_PROVIDED).setValue(!!req.served);
    sh.getRange(rowNum, T.CANTEEN_PERSON).setValue(req.served ? req.canteenPersonId : '');
    return { updated: true };
  }
  return { error: 'Token not found for today' };
}


// ═════════════ ROW → OBJECT ═══════════════════════════════════════
function rowToToken(r) {
  const dateVal = r[T.DATE - 1];
  const date = dateVal instanceof Date
    ? Utilities.formatDate(dateVal, tz(), 'yyyy-MM-dd')
    : String(dateVal).slice(0, 10);
  const food = r[T.FOOD_PROVIDED - 1];
  return {
    date: date,
    city: r[T.CITY - 1],
    warehouse: r[T.WAREHOUSE - 1],
    name: r[T.NAME - 1],
    designation: r[T.DESIGNATION - 1],
    phone: normPhone(r[T.PHONE - 1]),
    mealType: String(r[T.MEAL_TYPE - 1] || '').toLowerCase(),
    tokenId: r[T.TOKEN_ID - 1],
    canteenPersonId: r[T.CANTEEN_PERSON - 1] || '',
    foodProvided: food === true || String(food).toLowerCase() === 'true'
  };
}


// ═════════════ SETUP HELPER ═══════════════════════════════════════
function setupSheets() {
  const ss = SS();
  const ensure = function(name, headers) {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold').setBackground('#292524').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
  };
  ensure(SHEETS.USERS,    ['City','Warehouse','Name','Designation','Phone Number','Password','Photo Link','Status']);
  ensure(SHEETS.TOKENS,   ['Date','City','Warehouse','Name','Designation','Phone Number','Meal Type','Token ID','Canteen Person ID','Food Provided']);
  ensure(SHEETS.STAFF,    ['City','Warehouse','User ID','Password']);
  ensure(SHEETS.REQUESTS, ['Date','City','Warehouse','Name','Designation','Phone Number','Meal Type','Requested At']);
  Logger.log('✓ Setup complete. Default password: ' + DEFAULT_PASSWORD);
}


// ═════════════ ONE-TIME MIGRATION ═══════════════════════════════════
/**
 * Moves existing "REQUESTED" rows from Token List → Requests sheet.
 * Run this once after deploying v4. Safe to re-run.
 */
function migrateRequestedToRequestsSheet() {
  const tSheet = getSheet(SHEETS.TOKENS);
  const rSheet = getSheet(SHEETS.REQUESTS);
  const rows = tSheet.getDataRange().getValues();
  let moved = 0;
  let skipped = 0;

  // Iterate top-down to capture rows, bottom-up to delete safely
  const rowsToMove = [];
  for (let i = 1; i < rows.length; i++) {
    const tokenId = String(rows[i][T.TOKEN_ID - 1] || '').toUpperCase();
    if (tokenId === 'REQUESTED') {
      rowsToMove.push({ index: i, data: rows[i] });
    }
  }

  // Append to Requests sheet
  rowsToMove.forEach(function(item) {
    const r = item.data;
    rSheet.appendRow([
      r[T.DATE - 1], r[T.CITY - 1], r[T.WAREHOUSE - 1], r[T.NAME - 1],
      r[T.DESIGNATION - 1], r[T.PHONE - 1], r[T.MEAL_TYPE - 1], nowISO()
    ]);
    moved++;
  });

  // Delete from Token List (bottom-up so indices stay valid)
  for (let i = rowsToMove.length - 1; i >= 0; i--) {
    tSheet.deleteRow(rowsToMove[i].index + 1);
  }

  const summary = '✓ Migration complete.\n' +
                  '  Moved REQUESTED rows from Token List → Requests: ' + moved + '\n' +
                  '  Skipped: ' + skipped;
  Logger.log(summary);
  return summary;
}


// ═════════════ ONE-TIME MIGRATION ═════════════════════════════════
/**
 * Converts existing long photo URLs in the "Photo Link" column into
 * clean HYPERLINK formulas that display the employee's name instead.
 *
 * Safe to re-run — skips rows that are already hyperlinks or empty.
 * Run this once from the editor: select migratePhotoLinks → Run.
 */
function migratePhotoLinks() {
  const sh = getSheet(SHEETS.USERS);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) {
    Logger.log('No data rows to migrate.');
    return;
  }

  let converted = 0;
  let skippedEmpty = 0;
  let skippedAlreadyLink = 0;

  for (let i = 2; i <= lastRow; i++) {
    const cell = sh.getRange(i, U.PHOTO);
    const formula = cell.getFormula();
    const value = cell.getValue();

    // Already a HYPERLINK formula — skip
    if (formula && formula.toUpperCase().indexOf('HYPERLINK') !== -1) {
      skippedAlreadyLink++;
      continue;
    }

    const url = String(value || '').trim();
    if (!url || url.indexOf('http') !== 0) {
      skippedEmpty++;
      continue;
    }

    const name = String(sh.getRange(i, U.NAME).getValue() || 'View Photo').replace(/"/g, '""');
    cell.setFormula('=HYPERLINK("' + url + '","' + name + '")');
    converted++;
  }

  const summary = '✓ Migration complete.\n' +
                  '  Converted to hyperlink: ' + converted + '\n' +
                  '  Already hyperlink (skipped): ' + skippedAlreadyLink + '\n' +
                  '  Empty / not a URL (skipped): ' + skippedEmpty;
  Logger.log(summary);
  return summary;
}

// ═════════════ ONE-TIME CLEANUP ═════════════════════════════════
// Removes duplicate rows from Token List where (phone + date + meal_type)
// appears more than once. Keeps the row with Food Provided = TRUE if any,
// otherwise keeps the first occurrence. Safe to re-run.
//
// HOW TO RUN:
//   1. Open Apps Script editor
//   2. Select 'cleanupDuplicateTokens' from the function dropdown (top toolbar)
//   3. Click ▶ Run
//   4. Check the Execution log for the report
//
// WARNING: This permanently deletes rows. Recommend taking a backup of
// your Google Sheet first (File → Make a copy).
function cleanupDuplicateTokens() {
  const sheet = getSheet(SHEETS.TOKENS);
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    Logger.log('No data — nothing to clean.');
    return { dupGroups: 0, deletedRows: 0 };
  }

  // Group rows by (phone + date + meal_type)
  const groups = {};
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const phone = normPhone(row[T.PHONE - 1]);
    const dateVal = row[T.DATE - 1];
    let dateStr;
    if (dateVal instanceof Date) {
      dateStr = Utilities.formatDate(dateVal, tz(), 'yyyy-MM-dd');
    } else {
      dateStr = String(dateVal).slice(0, 10);
    }
    const meal = String(row[T.MEAL_TYPE - 1] || '').toLowerCase();
    if (!phone || !dateStr || !meal) continue;
    const key = phone + '|' + dateStr + '|' + meal;
    if (!groups[key]) groups[key] = [];
    const fp = row[T.FOOD_PROVIDED - 1];
    const served = fp === true || String(fp).toLowerCase() === 'true';
    groups[key].push({
      rowNum: i + 1,    // 1-indexed sheet row
      tokenId: row[T.TOKEN_ID - 1],
      name: row[T.NAME - 1],
      served: served
    });
  }

  // Find duplicates and decide which to keep
  const rowsToDelete = [];
  const report = [];
  let dupGroups = 0;
  for (const key in groups) {
    const items = groups[key];
    if (items.length <= 1) continue;
    dupGroups++;

    // Keeper logic: prefer the served row; otherwise keep the first.
    let keeperIdx = 0;
    for (let i = 0; i < items.length; i++) {
      if (items[i].served) { keeperIdx = i; break; }
    }
    const keeper = items[keeperIdx];
    const losers = items.filter((_, i) => i !== keeperIdx);
    losers.forEach(l => rowsToDelete.push(l.rowNum));

    report.push(
      'Group: ' + key + ' — kept ' + keeper.tokenId +
      ' (served=' + keeper.served + '), deleted ' +
      losers.map(l => l.tokenId).join(', ')
    );
  }

  // Delete bottom-up so row indices don't shift
  rowsToDelete.sort((a, b) => b - a);
  rowsToDelete.forEach(n => sheet.deleteRow(n));

  Logger.log('=== CLEANUP REPORT ===');
  Logger.log('Duplicate groups found: ' + dupGroups);
  Logger.log('Rows deleted: ' + rowsToDelete.length);
  Logger.log('---');
  report.forEach(r => Logger.log(r));

  return { dupGroups: dupGroups, deletedRows: rowsToDelete.length };
}

// Dry-run version — shows what WOULD be deleted without actually deleting.
// Run this FIRST to see what cleanupDuplicateTokens() would do.
function previewDuplicateCleanup() {
  const sheet = getSheet(SHEETS.TOKENS);
  const data = sheet.getDataRange().getValues();

  const groups = {};
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const phone = normPhone(row[T.PHONE - 1]);
    const dateVal = row[T.DATE - 1];
    const dateStr = dateVal instanceof Date
      ? Utilities.formatDate(dateVal, tz(), 'yyyy-MM-dd')
      : String(dateVal).slice(0, 10);
    const meal = String(row[T.MEAL_TYPE - 1] || '').toLowerCase();
    if (!phone || !dateStr || !meal) continue;
    const key = phone + '|' + dateStr + '|' + meal;
    if (!groups[key]) groups[key] = [];
    groups[key].push({
      rowNum: i + 1,
      tokenId: row[T.TOKEN_ID - 1],
      name: row[T.NAME - 1],
      served: row[T.FOOD_PROVIDED - 1] === true || String(row[T.FOOD_PROVIDED - 1]).toLowerCase() === 'true'
    });
  }

  let dupGroups = 0;
  let wouldDelete = 0;
  Logger.log('=== DUPLICATE PREVIEW (dry run, no changes made) ===');
  for (const key in groups) {
    const items = groups[key];
    if (items.length <= 1) continue;
    dupGroups++;
    Logger.log('');
    Logger.log('GROUP: ' + key);
    items.forEach(item => {
      Logger.log('  Row ' + item.rowNum + ': ' + item.tokenId +
                 ' (' + item.name + ', served=' + item.served + ')');
    });
    wouldDelete += items.length - 1;
  }
  Logger.log('');
  Logger.log('Total duplicate groups: ' + dupGroups);
  Logger.log('Rows that would be deleted: ' + wouldDelete);
  return { dupGroups: dupGroups, wouldDelete: wouldDelete };
}

// =================================================================
//  DAILY AUDIT EMAIL
//  Sends a daily summary covering: today's tokens (generated vs served),
//  per-warehouse breakdown, anomalies (duplicates, orphans, unserved),
//  and tomorrow's pre-booking outlook.
//
//  SETUP (one-time):
//    1. Edit AUDIT_CONFIG.recipients below - comma-separated emails
//    2. Run installDailyAuditTrigger() once from the Apps Script editor
//    3. Grant Gmail permissions when prompted
//    4. The audit will run every day at the chosen hour
//
//  To test immediately, run dailyAudit() directly from the editor.
//  To remove the trigger later, run removeDailyAuditTrigger().
// =================================================================

var AUDIT_CONFIG = {
  recipients: 'charan.bijapur@rentomojo.com, bijapurcharan@gmail.com',
  triggerHour: 22,
  subjectPrefix: 'Canteen Daily Audit'
};

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function dailyAudit() {
  var today    = todayKey();
  var tomorrow = tomorrowKey();
  var tz_      = tz();
  var todayHuman = Utilities.formatDate(new Date(), tz_, 'EEEE, d MMMM yyyy');

  // Read all sheets once
  var tRows = getSheet(SHEETS.TOKENS).getDataRange().getValues();
  var rRows = getSheet(SHEETS.REQUESTS).getDataRange().getValues();
  var uRows = getSheet(SHEETS.USERS).getDataRange().getValues();
  var cRows = getSheet(SHEETS.STAFF).getDataRange().getValues();

  // Today's token analysis
  var todayTotal = 0, todayServed = 0;
  var todayBkf = { gen: 0, srv: 0 };
  var todayLch = { gen: 0, srv: 0 };
  var warehouseStats = {};
  var dupCheck = {};

  for (var i = 1; i < tRows.length; i++) {
    var row = tRows[i];
    var dateVal = row[T.DATE - 1];
    var dateStr = dateVal instanceof Date
      ? Utilities.formatDate(dateVal, tz_, 'yyyy-MM-dd')
      : String(dateVal).slice(0, 10);
    if (dateStr !== today) continue;

    var city  = String(row[T.CITY - 1] || '').trim();
    var wh    = String(row[T.WAREHOUSE - 1] || '').trim();
    var phone = normPhone(row[T.PHONE - 1]);
    var meal  = String(row[T.MEAL_TYPE - 1] || '').toLowerCase();
    var fp    = row[T.FOOD_PROVIDED - 1];
    var served = fp === true || String(fp).toLowerCase() === 'true';

    todayTotal++;
    if (served) todayServed++;
    if (meal === 'breakfast') { todayBkf.gen++; if (served) todayBkf.srv++; }
    else if (meal === 'lunch') { todayLch.gen++; if (served) todayLch.srv++; }

    var whKey = city + '|' + wh;
    if (!warehouseStats[whKey]) {
      warehouseStats[whKey] = { city: city, wh: wh, gen: 0, srv: 0,
                                bkfGen: 0, bkfSrv: 0, lchGen: 0, lchSrv: 0 };
    }
    var ws = warehouseStats[whKey];
    ws.gen++;
    if (served) ws.srv++;
    if (meal === 'breakfast') { ws.bkfGen++; if (served) ws.bkfSrv++; }
    else if (meal === 'lunch') { ws.lchGen++; if (served) ws.lchSrv++; }

    var dupKey = phone + '|' + meal;
    if (!dupCheck[dupKey]) dupCheck[dupKey] = [];
    dupCheck[dupKey].push({
      tokenId: String(row[T.TOKEN_ID - 1] || ''),
      name:    String(row[T.NAME - 1] || ''),
      served:  served,
      city:    city,
      wh:      wh
    });
  }

  // Find duplicate groups today
  var duplicates = [];
  for (var k in dupCheck) {
    if (dupCheck[k].length > 1) duplicates.push({ key: k, items: dupCheck[k] });
  }

  // Tomorrow's pre-bookings
  var tomorrowBkf = 0, tomorrowLch = 0;
  var tomorrowByWarehouse = {};
  for (var j = 1; j < rRows.length; j++) {
    var rRow = rRows[j];
    var rDateVal = rRow[R.DATE - 1];
    var rDateStr = rDateVal instanceof Date
      ? Utilities.formatDate(rDateVal, tz_, 'yyyy-MM-dd')
      : String(rDateVal).slice(0, 10);
    if (rDateStr !== tomorrow) continue;
    var rMeal = String(rRow[R.MEAL_TYPE - 1] || '').toLowerCase();
    var rCity = String(rRow[R.CITY - 1] || '').trim();
    var rWh   = String(rRow[R.WAREHOUSE - 1] || '').trim();
    if (rMeal === 'breakfast') tomorrowBkf++;
    else if (rMeal === 'lunch') tomorrowLch++;
    var tk = rCity + '|' + rWh;
    if (!tomorrowByWarehouse[tk]) tomorrowByWarehouse[tk] = { city: rCity, wh: rWh, bkf: 0, lch: 0 };
    if (rMeal === 'breakfast') tomorrowByWarehouse[tk].bkf++;
    else if (rMeal === 'lunch') tomorrowByWarehouse[tk].lch++;
  }

  // Orphan check
  var validCanteens = {};
  for (var c = 1; c < cRows.length; c++) {
    var cCity = String(cRows[c][0] || '').trim();
    var cWh   = String(cRows[c][1] || '').trim();
    if (cCity && cWh) validCanteens[cCity + '|' + cWh] = true;
  }
  var orphans = [];
  for (var u = 1; u < uRows.length; u++) {
    var uCity = String(uRows[u][0] || '').trim();
    var uWh   = String(uRows[u][1] || '').trim();
    var uName = String(uRows[u][2] || '');
    var uPhone = String(uRows[u][4] || '');
    var uStatus = String(uRows[u][7] || '').toLowerCase();
    if (uStatus !== 'yes') continue;
    if (!uCity || !uWh) continue;
    if (!validCanteens[uCity + '|' + uWh]) {
      orphans.push({ name: uName, phone: uPhone, city: uCity, wh: uWh });
    }
  }

  // Conversion rate
  var rate = todayTotal > 0 ? Math.round((todayServed / todayTotal) * 100) : 0;
  var rateGood = rate >= 95;
  var rateLabel = rateGood ? 'OK' : 'CHECK';

  // Build HTML email
  var html = '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#fafaf9;font-family:Arial,Helvetica,sans-serif;">';
  html += '<div style="max-width:640px;margin:0 auto;background:white;">';

  // Header
  html += '<div style="background:#1c1917;padding:32px 28px;border-left:8px solid #b45309;">';
  html += '<div style="color:#f59e0b;font-size:11px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;">Daily Audit</div>';
  html += '<div style="color:white;font-size:24px;font-weight:bold;margin-top:8px;">' + todayHuman + '</div>';
  html += '<div style="color:#a8a29e;font-size:13px;margin-top:4px;">Warehouse Canteen Meal Token System</div>';
  html += '</div>';

  // Stat strip
  html += '<div style="background:#292524;padding:24px 28px;">';
  html += '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr>';
  html += '<td width="33%" style="text-align:center;padding:8px;">';
  html += '<div style="color:#f59e0b;font-size:36px;font-weight:bold;line-height:1;">' + todayTotal + '</div>';
  html += '<div style="color:#a8a29e;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-top:6px;">Tokens Today</div>';
  html += '</td>';
  html += '<td width="33%" style="text-align:center;padding:8px;border-left:1px solid #44403c;border-right:1px solid #44403c;">';
  html += '<div style="color:#34d399;font-size:36px;font-weight:bold;line-height:1;">' + todayServed + '</div>';
  html += '<div style="color:#a8a29e;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-top:6px;">Served</div>';
  html += '</td>';
  html += '<td width="33%" style="text-align:center;padding:8px;">';
  html += '<div style="color:' + (rateGood ? '#34d399' : '#fbbf24') + ';font-size:36px;font-weight:bold;line-height:1;">' + rate + '%</div>';
  html += '<div style="color:#a8a29e;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-top:6px;">Conversion ' + rateLabel + '</div>';
  html += '</td>';
  html += '</tr></table>';
  html += '</div>';

  // Meal breakdown
  html += '<div style="padding:24px 28px;">';
  html += '<div style="font-size:11px;font-weight:bold;color:#b45309;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px;">By Meal Type</div>';
  html += '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">';
  html += '<tr><td style="padding:10px 0;border-bottom:1px solid #e7e5e4;">';
  html += '<span style="font-size:14px;font-weight:600;color:#292524;">Breakfast</span>';
  html += '</td><td style="text-align:right;font-size:14px;color:#57534e;">' + todayBkf.gen + ' generated</td>';
  html += '<td style="text-align:right;padding-left:20px;font-size:14px;font-weight:bold;color:#b45309;">' + todayBkf.srv + ' served</td></tr>';
  html += '<tr><td style="padding:10px 0;border-bottom:1px solid #e7e5e4;">';
  html += '<span style="font-size:14px;font-weight:600;color:#292524;">Lunch</span>';
  html += '</td><td style="text-align:right;font-size:14px;color:#57534e;">' + todayLch.gen + ' generated</td>';
  html += '<td style="text-align:right;padding-left:20px;font-size:14px;font-weight:bold;color:#ea580c;">' + todayLch.srv + ' served</td></tr>';
  html += '</table>';
  html += '</div>';

  // Per-warehouse
  var whKeys = Object.keys(warehouseStats).sort();
  if (whKeys.length > 0) {
    html += '<div style="padding:0 28px 24px;">';
    html += '<div style="font-size:11px;font-weight:bold;color:#b45309;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px;">By Warehouse</div>';
    html += '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e7e5e4;">';
    html += '<tr style="background:#fafaf9;">';
    html += '<th style="text-align:left;padding:10px 12px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#78716c;border-bottom:1px solid #e7e5e4;">Location</th>';
    html += '<th style="text-align:center;padding:10px 8px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#78716c;border-bottom:1px solid #e7e5e4;">Breakfast</th>';
    html += '<th style="text-align:center;padding:10px 8px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#78716c;border-bottom:1px solid #e7e5e4;">Lunch</th>';
    html += '<th style="text-align:center;padding:10px 8px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#78716c;border-bottom:1px solid #e7e5e4;">Total</th>';
    html += '<th style="text-align:center;padding:10px 8px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#78716c;border-bottom:1px solid #e7e5e4;">Rate</th>';
    html += '</tr>';
    for (var w = 0; w < whKeys.length; w++) {
      var wsi = warehouseStats[whKeys[w]];
      var wRate = wsi.gen > 0 ? Math.round((wsi.srv / wsi.gen) * 100) : 0;
      var wRateColor = wRate >= 95 ? '#047857' : '#b45309';
      var rowBg = w % 2 === 1 ? '#fafaf9' : 'white';
      html += '<tr style="background:' + rowBg + ';">';
      html += '<td style="padding:10px 12px;font-size:13px;color:#292524;font-weight:600;">' + escapeHtml(wsi.city) + ' / ' + escapeHtml(wsi.wh) + '</td>';
      html += '<td style="text-align:center;padding:10px 8px;font-size:13px;color:#57534e;">' + wsi.bkfSrv + '/' + wsi.bkfGen + '</td>';
      html += '<td style="text-align:center;padding:10px 8px;font-size:13px;color:#57534e;">' + wsi.lchSrv + '/' + wsi.lchGen + '</td>';
      html += '<td style="text-align:center;padding:10px 8px;font-size:14px;font-weight:bold;color:#292524;">' + wsi.srv + '/' + wsi.gen + '</td>';
      html += '<td style="text-align:center;padding:10px 8px;font-size:13px;font-weight:bold;color:' + wRateColor + ';">' + wRate + '%</td>';
      html += '</tr>';
    }
    html += '</table>';
    html += '<div style="font-size:11px;color:#a8a29e;margin-top:8px;font-style:italic;">Format: served / generated</div>';
    html += '</div>';
  }

  // Anomalies
  var hasAnomalies = duplicates.length > 0 || orphans.length > 0;
  if (hasAnomalies) {
    html += '<div style="padding:0 28px 24px;">';
    html += '<div style="font-size:11px;font-weight:bold;color:#b91c1c;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px;">Anomalies Detected</div>';
    html += '<div style="background:#fef2f2;border:1px solid #fecaca;padding:16px;">';

    if (duplicates.length > 0) {
      html += '<div style="font-size:13px;font-weight:bold;color:#991b1b;margin-bottom:8px;">Duplicate tokens detected (' + duplicates.length + ' groups)</div>';
      html += '<div style="font-size:12px;color:#7f1d1d;margin-bottom:12px;">If you have deployed the lock fix, duplicates should be 0. Investigate immediately.</div>';
      var dShow = Math.min(duplicates.length, 5);
      for (var d = 0; d < dShow; d++) {
        var dg = duplicates[d];
        var dParts = dg.key.split('|');
        var dSample = dg.items[0];
        html += '<div style="font-size:12px;color:#7f1d1d;padding:6px 0;border-top:1px solid #fecaca;">';
        html += '<b>' + escapeHtml(dSample.name) + '</b> (' + escapeHtml(dParts[0]) + ') - ' + escapeHtml(dParts[1]) + ' - ';
        var dParts2 = [];
        for (var dx = 0; dx < dg.items.length; dx++) {
          dParts2.push(escapeHtml(dg.items[dx].tokenId) + (dg.items[dx].served ? ' [served]' : ' [unserved]'));
        }
        html += dParts2.join(', ');
        html += '</div>';
      }
      if (duplicates.length > 5) {
        html += '<div style="font-size:11px;color:#7f1d1d;font-style:italic;margin-top:8px;">...and ' + (duplicates.length - 5) + ' more</div>';
      }
    }

    if (orphans.length > 0) {
      if (duplicates.length > 0) html += '<div style="height:1px;background:#fecaca;margin:14px 0;"></div>';
      html += '<div style="font-size:13px;font-weight:bold;color:#991b1b;margin-bottom:8px;">Orphan employees (' + orphans.length + ')</div>';
      html += '<div style="font-size:12px;color:#7f1d1d;margin-bottom:12px;">Active employees whose City+Warehouse has no canteen account. Their tokens cannot be served.</div>';
      var oShow = Math.min(orphans.length, 10);
      for (var o = 0; o < oShow; o++) {
        var op = orphans[o];
        html += '<div style="font-size:12px;color:#7f1d1d;padding:6px 0;border-top:1px solid #fecaca;">';
        html += '<b>' + escapeHtml(op.name) + '</b> - ' + escapeHtml(op.city) + ' / ' + escapeHtml(op.wh);
        if (op.phone) html += ' - ' + escapeHtml(op.phone);
        html += '</div>';
      }
      if (orphans.length > 10) {
        html += '<div style="font-size:11px;color:#7f1d1d;font-style:italic;margin-top:8px;">...and ' + (orphans.length - 10) + ' more</div>';
      }
    }

    html += '</div>';
    html += '</div>';
  }

  // Tomorrow outlook
  html += '<div style="padding:0 28px 28px;">';
  html += '<div style="font-size:11px;font-weight:bold;color:#b45309;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px;">Tomorrows Pre-Bookings</div>';
  if (tomorrowBkf + tomorrowLch === 0) {
    html += '<div style="background:#fafaf9;border:1px dashed #d6d3d1;padding:20px;text-align:center;color:#a8a29e;font-size:13px;">No pre-bookings yet for tomorrow.</div>';
  } else {
    html += '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr>';
    html += '<td width="50%" style="padding-right:8px;">';
    html += '<div style="background:#fef3c7;padding:18px;text-align:center;">';
    html += '<div style="font-size:28px;font-weight:bold;color:#92400e;line-height:1;">' + tomorrowBkf + '</div>';
    html += '<div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#92400e;margin-top:6px;">Breakfast</div>';
    html += '</div></td>';
    html += '<td width="50%" style="padding-left:8px;">';
    html += '<div style="background:#fed7aa;padding:18px;text-align:center;">';
    html += '<div style="font-size:28px;font-weight:bold;color:#9a3412;line-height:1;">' + tomorrowLch + '</div>';
    html += '<div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#9a3412;margin-top:6px;">Lunch</div>';
    html += '</div></td>';
    html += '</tr></table>';

    var twKeys = Object.keys(tomorrowByWarehouse);
    if (twKeys.length > 1) {
      html += '<div style="margin-top:14px;font-size:12px;color:#57534e;">';
      twKeys.sort();
      for (var tw = 0; tw < twKeys.length; tw++) {
        var twi = tomorrowByWarehouse[twKeys[tw]];
        html += '<div style="padding:6px 0;border-bottom:1px solid #e7e5e4;">';
        html += '<b>' + escapeHtml(twi.city) + ' / ' + escapeHtml(twi.wh) + ':</b> ' + twi.bkf + ' breakfast, ' + twi.lch + ' lunch';
        html += '</div>';
      }
      html += '</div>';
    }
  }
  html += '</div>';

  // Footer
  html += '<div style="background:#fafaf9;padding:20px 28px;border-top:1px solid #e7e5e4;text-align:center;">';
  html += '<div style="font-size:11px;color:#a8a29e;">Automated audit - sent daily at ' + AUDIT_CONFIG.triggerHour + ':00</div>';
  html += '<div style="font-size:10px;color:#a8a29e;margin-top:4px;">To stop these emails, run removeDailyAuditTrigger() in Apps Script.</div>';
  html += '</div>';

  html += '</div></body></html>';

  // Subject + send
  var subject = AUDIT_CONFIG.subjectPrefix + ' - ' +
                Utilities.formatDate(new Date(), tz_, 'd MMM') +
                ' - ' + todayTotal + ' tokens, ' + todayServed + ' served';
  if (duplicates.length > 0 || orphans.length > 0) subject = '[ALERT] ' + subject;

  MailApp.sendEmail({
    to: AUDIT_CONFIG.recipients,
    subject: subject,
    htmlBody: html,
    name: 'Canteen Token System'
  });

  Logger.log('Daily audit sent to ' + AUDIT_CONFIG.recipients);
  Logger.log('Today: ' + todayTotal + ' tokens, ' + todayServed + ' served (' + rate + '%)');
  if (duplicates.length > 0) Logger.log('Duplicates: ' + duplicates.length + ' groups');
  if (orphans.length > 0) Logger.log('Orphans: ' + orphans.length + ' employees');
}

// Install the daily trigger - run this ONCE from the Apps Script editor
function installDailyAuditTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  var removed = 0;
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'dailyAudit') {
      ScriptApp.deleteTrigger(triggers[i]);
      removed++;
    }
  }
  ScriptApp.newTrigger('dailyAudit')
    .timeBased()
    .atHour(AUDIT_CONFIG.triggerHour)
    .everyDays(1)
    .inTimezone(tz())
    .create();
  Logger.log('Daily audit trigger installed.');
  Logger.log('Will run every day at ' + AUDIT_CONFIG.triggerHour + ':00 ' + tz());
  Logger.log('Email goes to: ' + AUDIT_CONFIG.recipients);
  if (removed > 0) Logger.log('(Removed ' + removed + ' existing trigger(s) first)');
}

// Remove the daily trigger
function removeDailyAuditTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  var removed = 0;
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'dailyAudit') {
      ScriptApp.deleteTrigger(triggers[i]);
      removed++;
    }
  }
  Logger.log('Removed ' + removed + ' daily audit trigger(s).');
}
