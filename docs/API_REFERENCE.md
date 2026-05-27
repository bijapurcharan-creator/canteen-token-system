# API Reference

All endpoints are accessed via a single URL with a `POST` request and a JSON body containing the `action` field.

**Base URL:** `https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec`

**Content-Type:** `text/plain;charset=utf-8` (this avoids the CORS preflight that Apps Script can't handle)

---

## Request Format

```javascript
fetch(API_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
  body: JSON.stringify({
    action: 'actionName',
    // ...action-specific parameters
  })
});
```

## Response Format

### Success
```json
{
  "ok": true,
  // ...action-specific fields
}
```

### Error
```json
{
  "ok": false,
  "error": "Human-readable error message"
}
```

---

## Endpoints

### 1. `loginEmployee`

Authenticates an employee with their phone and password.

**Request:**
```json
{
  "action": "loginEmployee",
  "phone": "9019773841",
  "password": "rentomojo123"
}
```

**Response (must change password — first login):**
```json
{
  "ok": true,
  "mustChangePassword": true,
  "employee": {
    "phone": "9019773841",
    "name": "Charan",
    "designation": "IT Analyst"
  }
}
```

**Response (existing user):**
```json
{
  "ok": true,
  "employee": {
    "phone": "9019773841",
    "name": "Charan",
    "designation": "IT Analyst",
    "city": "Mumbai",
    "warehouse": "Tal-WH",
    "photoLink": "https://lh3.googleusercontent.com/d/..."
  }
}
```

---

### 2. `setEmployeePassword`

Sets a new password for an employee currently on the default password.

**Request:**
```json
{
  "action": "setEmployeePassword",
  "phone": "9019773841",
  "newPassword": "myNewPass123"
}
```

**Response:**
```json
{
  "ok": true,
  "employee": { /* full employee object */ }
}
```

---

### 3. `loginCanteen`

Authenticates a canteen staff member.

**Request:**
```json
{
  "action": "loginCanteen",
  "userId": "RMMUM101",
  "password": "rentomojo123"
}
```

**Response (existing):**
```json
{
  "ok": true,
  "staff": {
    "userId": "RMMUM101",
    "city": "Mumbai",
    "warehouse": "Tal-WH"
  }
}
```

---

### 4. `setCanteenPassword`

Same as `setEmployeePassword` but for canteen staff.

**Request:**
```json
{
  "action": "setCanteenPassword",
  "userId": "RMMUM101",
  "newPassword": "newPass123"
}
```

---

### 5. `savePhoto`

Uploads an employee's profile photo to Google Drive and writes the URL to the sheet.

**Request:**
```json
{
  "action": "savePhoto",
  "phone": "9019773841",
  "photoDataUrl": "data:image/jpeg;base64,/9j/4AAQSkZJ..."
}
```

**Response:**
```json
{
  "ok": true,
  "photoLink": "https://lh3.googleusercontent.com/d/FILE_ID"
}
```

---

### 6. `generateToken`

Issues a new meal token for an employee. Returns the existing token if one already exists for today + this meal type.

**Request:**
```json
{
  "action": "generateToken",
  "phone": "9019773841",
  "mealType": "breakfast"   // or "lunch"
}
```

**Response:**
```json
{
  "ok": true,
  "token": {
    "date": "2026-05-27",
    "city": "Mumbai",
    "warehouse": "Tal-WH",
    "name": "Charan",
    "designation": "IT Analyst",
    "phone": "9019773841",
    "mealType": "breakfast",
    "tokenId": "BRK-A7K2P",
    "canteenPersonId": "",
    "foodProvided": false,
    "generatedAt": "2026-05-27T07:23:14.123Z"
  }
}
```

**Error responses:**
- `"Breakfast is only available from 6:00 to 11:00"` — outside meal window
- `"Account inactive"` — employee Status is not "Yes"

---

### 7. `getTodayTokens`

Returns today's breakfast and lunch tokens (if any) for an employee, plus current availability flags.

**Request:**
```json
{
  "action": "getTodayTokens",
  "phone": "9019773841"
}
```

**Response:**
```json
{
  "ok": true,
  "tokens": {
    "breakfast": { /* token object or null */ },
    "lunch": { /* token object or null */ }
  },
  "serverHour": 9,
  "breakfastAvailable": true,
  "lunchAvailable": false
}
```

---

### 8. `getMonthlyHistory`

Returns all of an employee's tokens for the current month.

**Request:**
```json
{
  "action": "getMonthlyHistory",
  "phone": "9019773841"
}
```

**Response:**
```json
{
  "ok": true,
  "history": [
    {
      "date": "2026-05-27",
      "mealType": "breakfast",
      "tokenId": "BRK-A7K2P",
      "foodProvided": true,
      // ...other fields
    },
    // ...more entries, newest first
  ]
}
```

---

### 9. `getCanteenTokens`

Returns today's tokens for a specific city + warehouse, with employee photos attached. Used by the canteen dashboard.

**Request:**
```json
{
  "action": "getCanteenTokens",
  "city": "Mumbai",
  "warehouse": "Tal-WH"
}
```

**Response:**
```json
{
  "ok": true,
  "tokens": [
    {
      "date": "2026-05-27",
      "mealType": "breakfast",
      "tokenId": "BRK-A7K2P",
      "name": "Charan",
      "designation": "IT Analyst",
      "phone": "9019773841",
      "photoLink": "https://lh3.googleusercontent.com/d/...",
      "foodProvided": false,
      "canteenPersonId": ""
      // ...
    }
  ],
  "serverHour": 9
}
```

---

### 10. `markServed`

Marks a token as served (or un-served, for undo). Records the canteen staff's User ID.

**Request:**
```json
{
  "action": "markServed",
  "phone": "9019773841",
  "mealType": "breakfast",
  "served": true,
  "canteenPersonId": "RMMUM101"
}
```

**Response:**
```json
{
  "ok": true,
  "updated": true
}
```

---

## Frontend Helper

```javascript
async function api(action, payload = {}) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...payload })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// Examples:
const { employee } = await api('loginEmployee', { phone, password });
const { token } = await api('generateToken', { phone, mealType: 'breakfast' });
await api('markServed', { phone, mealType: 'lunch', served: true, canteenPersonId: 'RMMUM101' });
```

---

## Error Handling

All endpoints can return these generic errors:

| Error | Cause |
|---|---|
| `"Unknown action: X"` | The `action` field doesn't match any registered handler |
| `"Sheet tab not found"` | One of the required tabs is missing or renamed |
| `"Phone not whitelisted"` | Phone number not in `user Detals` |
| `"Account inactive"` | Status column is not "Yes" |
| `"Incorrect password"` | Password doesn't match what's in the sheet |

---

## Rate Limits

Google Apps Script has these default quotas:
- **Custom function URL fetches:** 20,000/day
- **Script runtime:** 6 minutes/execution
- **Daily script runtime:** 90 minutes for free Google accounts, 6 hours for Workspace

For typical warehouse usage (a few hundred employees, two tokens each per day), you're well within free-tier limits.
