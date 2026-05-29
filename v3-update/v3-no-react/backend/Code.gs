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

const SS = () => SpreadsheetApp.getActiveSpreadsheet();

const SHEETS = {
  USERS: 'user Detals',
  TOKENS: 'Token List',
  STAFF: 'Canteen Person'
};

const U = { CITY: 1, WAREHOUSE: 2, NAME: 3, DESIGNATION: 4,
            PHONE: 5, PASSWORD: 6, PHOTO: 7, STATUS: 8 };

const T = { DATE: 1, CITY: 2, WAREHOUSE: 3, NAME: 4, DESIGNATION: 5,
            PHONE: 6, MEAL_TYPE: 7, TOKEN_ID: 8, CANTEEN_PERSON: 9, FOOD_PROVIDED: 10 };

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
    getCanteenTokens, markServed
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
function monthPrefix(){ return Utilities.formatDate(new Date(), tz(), 'yyyy-MM'); }
function nowISO()     { return new Date().toISOString(); }
function currentHour(){ return parseInt(Utilities.formatDate(new Date(), tz(), 'HH'), 10); }

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
  lock.tryLock(5000);

  try {
    const tSheet = getSheet(SHEETS.TOKENS);
    const tRows = tSheet.getDataRange().getValues();
    for (let i = 1; i < tRows.length; i++) {
      if (normPhone(tRows[i][T.PHONE - 1]) === target &&
          dateMatches(tRows[i][T.DATE - 1], today) &&
          String(tRows[i][T.MEAL_TYPE - 1]).toLowerCase() === mealType) {
        return { token: rowToToken(tRows[i]) };
      }
    }

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
  const rows = getSheet(SHEETS.TOKENS).getDataRange().getValues();
  const out = { breakfast: null, lunch: null };

  for (let i = 1; i < rows.length; i++) {
    if (normPhone(rows[i][T.PHONE - 1]) !== target) continue;
    if (!dateMatches(rows[i][T.DATE - 1], today)) continue;
    const mt = String(rows[i][T.MEAL_TYPE - 1]).toLowerCase();
    if (mt === 'breakfast' || mt === 'lunch') out[mt] = rowToToken(rows[i]);
  }
  return {
    tokens: out, serverHour: currentHour(),
    breakfastAvailable: isMealAvailableNow('breakfast'),
    lunchAvailable: isMealAvailableNow('lunch')
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
  ensure(SHEETS.USERS,  ['City','Warehouse','Name','Designation','Phone Number','Password','Photo Link','Status']);
  ensure(SHEETS.TOKENS, ['Date','City','Warehouse','Name','Designation','Phone Number','Meal Type','Token ID','Canteen Person ID','Food Provided']);
  ensure(SHEETS.STAFF,  ['City','Warehouse','User ID','Password']);
  Logger.log('✓ Setup complete. Default password: ' + DEFAULT_PASSWORD);
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
