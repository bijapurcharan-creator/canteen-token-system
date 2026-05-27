# Deployment Guide

Complete walkthrough from empty Google Sheet to live system. Total time: ~30 minutes.

---

## Prerequisites

- A Google account (personal Gmail or Workspace account)
- A modern web browser (Chrome, Safari, Edge, Firefox)
- A phone for testing (iOS or Android)

> ⚠️ **Workspace Note:** If your company's Google Workspace restricts "Anyone" access on Apps Script deployments, use a personal `@gmail.com` account instead. The Workspace policy applies to all Workspace users uniformly.

---

## Phase 1 — Google Sheet Setup (3 min)

1. Go to <https://sheets.google.com> and create a new blank spreadsheet.
2. Name it: **Canteen Token System**.
3. Create three tabs by clicking the `+` at the bottom-left. Rename them to exactly:
   - `user Detals` (yes, the typo is intentional)
   - `Token List`
   - `Canteen Person`
4. You can leave the tabs empty — headers will be auto-created in Phase 2.

---

## Phase 2 — Install the Backend (10 min)

1. In your Google Sheet, click **Extensions → Apps Script**. A new tab opens.
2. Delete the default `Code.gs` content.
3. Open [`../backend/Code.gs`](../backend/Code.gs) from this repo, copy everything.
4. Paste into the empty Apps Script editor.
5. Press `Ctrl + S` (or `Cmd + S` on Mac) to save. Name the project: **Canteen Token API**.
6. From the function dropdown at the top, select **`setupSheets`**.
7. Click the **Run ▶** button.
8. A dialog appears: **Authorization required**.
   - Click **Review permissions**.
   - Pick your Google account.
   - Click **Advanced** → **Go to Canteen Token API (unsafe)**.
   - Click **Allow**.
9. Check the Execution log (bottom of the screen). You should see:
   ```
   ✓ Setup complete. Two-meal system ready. Default password: rentomojo123
   ```
10. Switch back to your Google Sheet — all three tabs now have headers in bold with dark backgrounds.

---

## Phase 3 — Deploy as Web App (3 min)

1. In the Apps Script editor, click **Deploy → New deployment** (top right).
2. Click the gear icon ⚙️ next to "Select type" → choose **Web app**.
3. Fill in:
   - **Description:** `Canteen Token API v2`
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
4. Click **Deploy**.
5. **Copy the Web App URL** — it looks like:
   ```
   https://script.google.com/macros/s/AKfycb..../exec
   ```
6. **Verify the URL works:** open it in a new browser tab. You should see:
   ```json
   {"ok":true,"message":"Canteen Token API v2 live","time":"..."}
   ```

> ❌ **If you see "Page not found"** → the deployment didn't complete properly. Re-deploy.
> ❌ **If "Anyone" option is greyed out** → your Workspace blocks external access. Switch to a personal Gmail account.

---

## Phase 4 — Set Up the Frontend (5 min)

### Option A: StackBlitz (easiest, no installation)

1. Go to <https://stackblitz.com/fork/react>. A new React project opens.
2. In the left sidebar, click **`src/App.js`**.
3. Select all (`Ctrl + A`) → Delete.
4. Open [`../frontend/App.js`](../frontend/App.js) from this repo, copy everything.
5. Paste into StackBlitz's empty `App.js`.
6. **Update the API URL:** Find this line near the top:
   ```javascript
   const DEFAULT_API_URL = 'https://script.google.com/macros/s/.../exec';
   ```
   Replace the URL with your own from Phase 3 step 5.
7. Click **`index.html`** in the file tree.
8. Replace its content with [`../frontend/index.html`](../frontend/index.html).
9. Open the terminal (View → Terminal) and run:
   ```bash
   npm install lucide-react
   ```
10. The preview on the right will auto-update. You should see the **Meal Token System** home screen.

### Option B: Vercel (recommended for production)

1. Install Node.js if not already installed.
2. Create a React app:
   ```bash
   npx create-react-app canteen-app
   cd canteen-app
   npm install lucide-react
   ```
3. Replace the contents of `src/App.js` with the file from this repo.
4. Replace `public/index.html` with the one from this repo.
5. Update `DEFAULT_API_URL` in `App.js` with your Apps Script URL.
6. Test locally: `npm start`
7. Deploy: `npx vercel`
8. Follow the prompts → get your permanent URL.

---

## Phase 5 — Add Initial Data (5 min)

### Add at least one employee

In the `user Detals` tab, add a row:

| City | Warehouse | Name | Designation | Phone Number | Password | Photo Link | Status |
|---|---|---|---|---|---|---|---|
| Mumbai | Tal-WH | Test User | Loader | `9019773841` | *(blank)* | *(blank)* | `Yes` |

### Add at least one canteen staff

In the `Canteen Person` tab, add a row:

| City | Warehouse | User ID | Password |
|---|---|---|---|
| Mumbai | Tal-WH | RMMUM101 | *(blank)* |

> ⚠️ **Make sure city + warehouse match exactly** between an employee and the canteen staff who will see their tokens.

---

## Phase 6 — Test End-to-End (10 min)

### Test as employee

1. On your phone or in a browser, open the app URL.
2. Tap **Employee Login**.
3. Enter phone: `9019773841`, password: `rentomojo123`.
4. You'll be asked to **Set Your Password** — enter a new one (e.g., `test1234`), confirm, save.
5. **Take a photo** using the device camera, save.
6. Land on the dashboard — you should see two meal cards: Breakfast and Lunch.
7. If the current time is within the meal window, tap **Use Token** — a token like `BRK-A7K2P` appears.
8. Check your Google Sheet → `Token List` — a new row should appear.

### Test as canteen staff

1. Open the app in a **different browser** or incognito window.
2. Tap **Canteen Staff** → log in as `RMMUM101` / `rentomojo123`.
3. Set a new password.
4. Dashboard shows the employee's token with their photo and name.
5. Tap **Food Provided**.
6. Check your Google Sheet → `Token List` → that row now shows `TRUE` in Food Provided and `RMMUM101` in Canteen Person ID.
7. Switch back to the employee app → refresh — status now shows **Served**.

---

## Phase 7 — Go Live (5 min)

1. **Generate a QR code** for your live app URL (any free QR generator works).
2. **Print and laminate** the QR code.
3. **Display** it at warehouse entrances and the canteen counter.
4. **Provide canteen counters** with a dedicated tablet or phone, with the URL bookmarked.
5. **Brief warehouse employees:**
   > "Open the app on your phone. Enter your phone number. Password is `rentomojo123` the first time. You'll be asked to set your own password. Take a photo. Every day, tap **Use Token** to get your meal code. Show the code at the canteen."
6. **Brief canteen staff:**
   > "Log in with your User ID. Look at today's tokens, verify the photo matches the person, tap **Food Provided** to serve. Use filters if needed."
7. **Monitor the `Token List` tab** during the first day for any anomalies.

---

## Day-to-Day Operations

| Task | How |
|---|---|
| Add a new employee | Add a row in `user Detals`, Status = Yes, leave Password blank |
| Block an employee | Change their Status to `No` |
| Reset a password | Clear their Password cell — they'll be prompted to set a new one |
| Add a canteen counter | Add a row in `Canteen Person`, leave Password blank |
| Monthly report | Open `Token List`, use Data → Pivot Table grouped by Warehouse + Meal Type |
| Update meal times | Edit `MEAL_WINDOWS` in `Code.gs` → Deploy → Manage deployments → New version |
| Change UI design | Edit `App.js` in your hosting (StackBlitz/Vercel) — auto-deploys |

---

## Troubleshooting

### "Failed to fetch"
The Apps Script URL is wrong or the deployment isn't set to "Anyone". Re-check Phase 3.

### "Phone not whitelisted"
Phone number in the sheet has spaces, country code, or is formatted as a number. It must be exactly 10 plain digits. Or the Status column doesn't say exactly `Yes`.

### Login keeps asking for default password
The user's Password cell in `user Detals` is blank or contains `rentomojo123`. Manually enter a password OR have the user log in with `rentomojo123` and complete the set-password flow.

### Photos don't appear on canteen dashboard
The photo Link uses an old URL format. Re-take the photo on the employee side — it will save the new URL automatically.

### "Anyone" option is greyed out when deploying
Your Workspace admin has restricted this. Either request the change or migrate to a personal Gmail account.

### Two employees tap "Use Token" at the same instant
The script uses `LockService` to prevent duplicates. If somehow two rows are created, manually delete the duplicate in the sheet.

---

## Updating the System

### To update backend code:
1. Edit `Code.gs` in Apps Script.
2. **Deploy → Manage deployments → pencil icon → Version: New version → Deploy.**
3. URL stays the same; no frontend changes needed.

### To update frontend code:
1. Edit `App.js` in StackBlitz/Vercel.
2. Auto-deploys. Users get the update on next page load.

---

**Need help? See [`../docs/Project_Report.docx`](Project_Report.docx) for the complete project documentation.**
