# Backend — Google Apps Script

The complete server-side logic for the Canteen Token System lives in [`Code.gs`](Code.gs).

## What this code does

- Exposes a REST-like API via `doPost`
- Authenticates employees and canteen staff
- Generates time-restricted meal tokens
- Saves profile photos to Google Drive
- Logs every action to the `Token List` tab in Google Sheets

## Setup

See [`../docs/DEPLOYMENT_GUIDE.md`](../docs/DEPLOYMENT_GUIDE.md) → Phase 2.

**TL;DR:**
1. Google Sheet → **Extensions → Apps Script**
2. Paste this `Code.gs` content
3. Save → Run `setupSheets()` → Authorize
4. **Deploy → New deployment → Web app → Who has access: Anyone**
5. Copy the URL → paste it into the frontend's `DEFAULT_API_URL`

## Constants you can change

At the top of `Code.gs`:

```javascript
const DEFAULT_PASSWORD = 'rentomojo123';

const MEAL_WINDOWS = {
  breakfast: { startHour: 6,  endHour: 11, label: 'Breakfast' },
  lunch:     { startHour: 12, endHour: 16, label: 'Lunch' }
};
```

## API endpoints

See [`../docs/API_REFERENCE.md`](../docs/API_REFERENCE.md) for full request/response documentation.

| Endpoint | Purpose |
|---|---|
| `loginEmployee` / `setEmployeePassword` | Employee auth |
| `loginCanteen` / `setCanteenPassword` | Canteen staff auth |
| `savePhoto` | Profile photo upload |
| `generateToken` | Issue meal token |
| `getTodayTokens` | Get today's tokens for an employee |
| `getMonthlyHistory` | Get employee's monthly consumption |
| `getCanteenTokens` | Get today's tokens for a warehouse |
| `markServed` | Mark a meal as served |

## Updating the deployed script

After editing `Code.gs`:

1. Save (`Ctrl + S`)
2. **Deploy → Manage deployments**
3. Click the pencil ✏️ icon to edit
4. **Version: New version**
5. Click **Deploy**
6. URL stays the same — frontend needs no changes

> ⚠️ Forgetting "New version" is the #1 cause of "my changes aren't working." Apps Script keeps the old deployment running until you explicitly deploy a new version.
