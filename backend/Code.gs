/**
 * ═══════════════════════════════════════════════════════════════════
 *  CANTEEN TOKEN SYSTEM — v2 (Two Meals: Breakfast + Lunch)
 * ═══════════════════════════════════════════════════════════════════
 *
 *  SHEET STRUCTURE
 *  ───────────────
 *  Tab "user Detals" (unchanged):
 *    A: City    B: Warehouse    C: Name    D: Designation
 *    E: Phone Number    F: Password    G: Photo Link    H: Status
 *
 *  Tab "Token List" (Meal Type column added at position G):
 *    A: Date    B: City    C: Warehouse    D: Name    E: Designation
 *    F: Phone Number    G: Meal Type    H: Token ID
 *    I: Canteen Person ID    J: Food Provided
 *
 *  Tab "Canteen Person" (unchanged):
 *    A: City    B: Warehouse    C: User ID    D: Password
 *
 *  MEAL WINDOWS (Asia/Kolkata)
 *  ───────────────────────────
 *  Breakfast: 06:00 – 11:00
 *  Lunch:     12:00 – 16:00
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

// Token List — note Meal Type is at column 7 now
const T = { DATE: 1, CITY: 2, WAREHOUSE: 3, NAME: 4, DESIGNATION: 5,
            PHONE: 6, MEAL_TYPE: 7, TOKEN_ID: 8, CANTEEN_PERSON: 9, FOOD_PROVIDED: 10 };

const C = { CITY: 1, WAREHOUSE: 2, USER_ID: 3, PASSWORD: 4 };


// ═════════════ ROUTER ═════════════════════════════════════════════
function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    const handlers = {
      loginEmployee, setEmployeePassword,
      loginCanteen, setCanteenPassword,
      savePhoto, generateToken,
      getMonthlyHistory, getTodayTokens,
      getCanteenTokens, markServed
    };
    const fn = handlers[req.action];
    if (!fn) return json({ ok: false, error: 'Unknown action: ' + req.action });
    return json({ ok: true, ...fn(req) });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function doGet() {
  return json({ ok: true, message: 'Canteen Token API v2 live', time: new Date().toISOString() });
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
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
  const prefix = mealType === 'breakfast' ? 'BRK' : 'LCH';
  return prefix + '-' + code;
}

function getSheet(name) {
  const sh = SS().getSheetByName(name);
  if (!sh) throw new Error('Sheet tab not found: "' + name + '". Run setupSheets() first.');
  return sh;
}

function normPhone(p) { return String(p).replace(/\D/g, ''); }

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
function loginEmployee({ phone, password }) {
  const sh = getSheet(SHEETS.USERS);
  const rows = sh.getDataRange().getValues();
  const target = normPhone(phone);

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (normPhone(r[U.PHONE - 1]) !== target) continue;

    const status = String(r[U.STATUS - 1]).trim().toLowerCase();
    if (status !== 'yes') return { error: 'Account inactive. Contact your supervisor.' };

    const stored = r[U.PASSWORD - 1];
    if (isDefaultPassword(stored)) {
      if (String(password) !== DEFAULT_PASSWORD) {
        return { error: 'Use the default password (' + DEFAULT_PASSWORD + ') to log in for the first time' };
      }
      return {
        mustChangePassword: true,
        employee: {
          phone: target,
          name: r[U.NAME - 1],
          designation: r[U.DESIGNATION - 1]
        }
      };
    }

    if (String(stored) !== String(password)) return { error: 'Incorrect password' };

    return {
      employee: {
        phone: target,
        name: r[U.NAME - 1],
        designation: r[U.DESIGNATION - 1],
        city: r[U.CITY - 1],
        warehouse: r[U.WAREHOUSE - 1],
        photoLink: r[U.PHOTO - 1] || null
      }
    };
  }
  return { error: 'Phone not whitelisted' };
}

function setEmployeePassword({ phone, newPassword }) {
  const err = validateNewPassword(newPassword);
  if (err) return { error: err };

  const sh = getSheet(SHEETS.USERS);
  const rows = sh.getDataRange().getValues();
  const target = normPhone(phone);

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (normPhone(r[U.PHONE - 1]) !== target) continue;
    const status = String(r[U.STATUS - 1]).trim().toLowerCase();
    if (status !== 'yes') return { error: 'Account inactive' };
    if (!isDefaultPassword(r[U.PASSWORD - 1])) {
      return { error: 'Password is already set. Use the login screen.' };
    }
    sh.getRange(i + 1, U.PASSWORD).setValue(newPassword);
    return {
      employee: {
        phone: target,
        name: r[U.NAME - 1],
        designation: r[U.DESIGNATION - 1],
        city: r[U.CITY - 1],
        warehouse: r[U.WAREHOUSE - 1],
        photoLink: r[U.PHOTO - 1] || null
      }
    };
  }
  return { error: 'Phone not found' };
}


// ═════════════ CANTEEN STAFF LOGIN ════════════════════════════════
function loginCanteen({ userId, password }) {
  const sh = getSheet(SHEETS.STAFF);
  const rows = sh.getDataRange().getValues();
  const target = String(userId).trim();

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (String(r[C.USER_ID - 1]).trim() !== target) continue;

    const stored = r[C.PASSWORD - 1];
    if (isDefaultPassword(stored)) {
      if (String(password) !== DEFAULT_PASSWORD) {
        return { error: 'Use the default password (' + DEFAULT_PASSWORD + ') to log in for the first time' };
      }
      return {
        mustChangePassword: true,
        staff: { userId: target }
      };
    }

    if (String(stored) !== String(password)) return { error: 'Incorrect password' };

    return {
      staff: {
        userId: target,
        city: r[C.CITY - 1],
        warehouse: r[C.WAREHOUSE - 1]
      }
    };
  }
  return { error: 'Invalid User ID' };
}

function setCanteenPassword({ userId, newPassword }) {
  const err = validateNewPassword(newPassword);
  if (err) return { error: err };

  const sh = getSheet(SHEETS.STAFF);
  const rows = sh.getDataRange().getValues();
  const target = String(userId).trim();

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (String(r[C.USER_ID - 1]).trim() !== target) continue;
    if (!isDefaultPassword(r[C.PASSWORD - 1])) {
      return { error: 'Password is already set. Use the login screen.' };
    }
    sh.getRange(i + 1, C.PASSWORD).setValue(newPassword);
    return {
      staff: {
        userId: target,
        city: r[C.CITY - 1],
        warehouse: r[C.WAREHOUSE - 1]
      }
    };
  }
  return { error: 'User ID not found' };
}


// ═════════════ PROFILE PHOTO ══════════════════════════════════════
function savePhoto({ phone, photoDataUrl }) {
  const sh = getSheet(SHEETS.USERS);
  const rows = sh.getDataRange().getValues();
  const target = normPhone(phone);

  for (let i = 1; i < rows.length; i++) {
    if (normPhone(rows[i][U.PHONE - 1]) !== target) continue;

    const match = String(photoDataUrl).match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) return { error: 'Invalid photo data' };
    const mime = match[1];
    const bytes = Utilities.base64Decode(match[2]);
    const ext = (mime.split('/')[1] || 'jpg').toLowerCase();

    const folder = getOrCreatePhotoFolder();
    const fileName = `profile_${target}.${ext}`;
    const existing = folder.getFilesByName(fileName);
    while (existing.hasNext()) existing.next().setTrashed(true);

    const file = folder.createFile(Utilities.newBlob(bytes, mime, fileName));
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const viewUrl = `https://lh3.googleusercontent.com/d/${file.getId()}`;
    sh.getRange(i + 1, U.PHOTO).setValue(viewUrl);
    return { photoLink: viewUrl };
  }
  return { error: 'Phone not found' };
}

function getOrCreatePhotoFolder() {
  const folders = DriveApp.getFoldersByName('Canteen Photos');
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder('Canteen Photos');
}


// ═════════════ TOKEN GENERATION (per meal) ════════════════════════
function generateToken({ phone, mealType }) {
  if (!MEAL_WINDOWS[mealType]) return { error: 'Invalid meal type' };

  if (!isMealAvailableNow(mealType)) {
    const w = MEAL_WINDOWS[mealType];
    return { error: `${w.label} is only available from ${w.startHour}:00 to ${w.endHour}:00` };
  }

  const target = normPhone(phone);
  const today = todayKey();
  const lock = LockService.getScriptLock();
  lock.tryLock(5000);

  try {
    // 1. Already issued today for this meal?
    const tSheet = getSheet(SHEETS.TOKENS);
    const tRows = tSheet.getDataRange().getValues();
    for (let i = 1; i < tRows.length; i++) {
      if (normPhone(tRows[i][T.PHONE - 1]) === target &&
          dateMatches(tRows[i][T.DATE - 1], today) &&
          String(tRows[i][T.MEAL_TYPE - 1]).toLowerCase() === mealType) {
        return { token: rowToToken(tRows[i]) };
      }
    }

    // 2. Find employee.
    const uRows = getSheet(SHEETS.USERS).getDataRange().getValues();
    let emp = null;
    for (let i = 1; i < uRows.length; i++) {
      if (normPhone(uRows[i][U.PHONE - 1]) === target) {
        const status = String(uRows[i][U.STATUS - 1]).trim().toLowerCase();
        if (status !== 'yes') return { error: 'Account inactive' };
        emp = {
          city: uRows[i][U.CITY - 1],
          warehouse: uRows[i][U.WAREHOUSE - 1],
          name: uRows[i][U.NAME - 1],
          designation: uRows[i][U.DESIGNATION - 1]
        };
        break;
      }
    }
    if (!emp) return { error: 'Employee not found' };

    const tokenId = generateTokenCode(mealType);
    tSheet.appendRow([
      today, emp.city, emp.warehouse, emp.name, emp.designation,
      "'" + target,
      mealType,
      tokenId,
      '',
      false
    ]);

    return {
      token: {
        date: today, city: emp.city, warehouse: emp.warehouse,
        name: emp.name, designation: emp.designation, phone: target,
        mealType, tokenId, canteenPersonId: '', foodProvided: false,
        generatedAt: nowISO()
      }
    };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}


// ═════════════ TODAY'S TOKENS (for employee dashboard) ════════════
function getTodayTokens({ phone }) {
  const target = normPhone(phone);
  const today = todayKey();
  const rows = getSheet(SHEETS.TOKENS).getDataRange().getValues();
  const out = { breakfast: null, lunch: null };

  for (let i = 1; i < rows.length; i++) {
    if (normPhone(rows[i][T.PHONE - 1]) !== target) continue;
    if (!dateMatches(rows[i][T.DATE - 1], today)) continue;
    const mt = String(rows[i][T.MEAL_TYPE - 1]).toLowerCase();
    if (mt === 'breakfast' || mt === 'lunch') {
      out[mt] = rowToToken(rows[i]);
    }
  }
  return {
    tokens: out,
    serverHour: currentHour(),
    breakfastAvailable: isMealAvailableNow('breakfast'),
    lunchAvailable: isMealAvailableNow('lunch')
  };
}


// ═════════════ MONTHLY HISTORY ════════════════════════════════════
function getMonthlyHistory({ phone }) {
  const target = normPhone(phone);
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
  out.sort((a, b) => {
    if (a.date !== b.date) return String(b.date).localeCompare(String(a.date));
    // breakfast before lunch on same day
    return (a.mealType || '').localeCompare(b.mealType || '');
  });
  return { history: out };
}


// ═════════════ TODAY'S TOKENS FOR CANTEEN ═════════════════════════
function getCanteenTokens({ city, warehouse }) {
  const today = todayKey();
  const tRows = getSheet(SHEETS.TOKENS).getDataRange().getValues();

  const uRows = getSheet(SHEETS.USERS).getDataRange().getValues();
  const photoMap = {};
  for (let i = 1; i < uRows.length; i++) {
    photoMap[normPhone(uRows[i][U.PHONE - 1])] = uRows[i][U.PHOTO - 1] || null;
  }

  const out = [];
  for (let i = 1; i < tRows.length; i++) {
    if (!dateMatches(tRows[i][T.DATE - 1], today)) continue;
    if (String(tRows[i][T.CITY - 1]).trim() !== String(city).trim()) continue;
    if (String(tRows[i][T.WAREHOUSE - 1]).trim() !== String(warehouse).trim()) continue;
    const tok = rowToToken(tRows[i]);
    tok.photoLink = photoMap[tok.phone] || null;
    out.push(tok);
  }
  return { tokens: out, serverHour: currentHour() };
}


// ═════════════ MARK SERVED ════════════════════════════════════════
function markServed({ phone, mealType, served, canteenPersonId }) {
  const target = normPhone(phone);
  const today = todayKey();
  const sh = getSheet(SHEETS.TOKENS);
  const rows = sh.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (normPhone(rows[i][T.PHONE - 1]) !== target) continue;
    if (!dateMatches(rows[i][T.DATE - 1], today)) continue;
    if (String(rows[i][T.MEAL_TYPE - 1]).toLowerCase() !== String(mealType).toLowerCase()) continue;

    const rowNum = i + 1;
    sh.getRange(rowNum, T.FOOD_PROVIDED).setValue(!!served);
    sh.getRange(rowNum, T.CANTEEN_PERSON).setValue(served ? canteenPersonId : '');
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
    date,
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
/**
 * Run once from the editor to (re)create headers.
 * Safe to re-run — it just overwrites row 1 with the correct headers.
 * IMPORTANT: This expects the new column layout. If you have old data
 * in Token List from v1, copy that data out first or migrate manually.
 */
function setupSheets() {
  const ss = SS();
  const ensure = (name, headers) => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold').setBackground('#292524').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
  };
  ensure(SHEETS.USERS,  ['City','Warehouse','Name','Designation','Phone Number','Password','Photo Link','Status']);
  ensure(SHEETS.TOKENS, ['Date','City','Warehouse','Name','Designation','Phone Number','Meal Type','Token ID','Canteen Person ID','Food Provided']);
  ensure(SHEETS.STAFF,  ['City','Warehouse','User ID','Password']);
  Logger.log('✓ Setup complete. Two-meal system ready. Default password: ' + DEFAULT_PASSWORD);
}
