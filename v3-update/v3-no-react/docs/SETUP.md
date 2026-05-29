# 🚀 Deployment Guide — All-in-Google-Apps-Script Version

## What's Different in This Version

The **entire app** (frontend + backend + database) now lives inside Google Apps Script.

- ❌ No StackBlitz
- ❌ No React
- ❌ No npm install
- ❌ No separate hosting
- ❌ No CORS issues, ever
- ✅ Just one Google Sheet with two files attached: `Code.gs` + `Index.html`
- ✅ Opening the Apps Script URL = opening the app

---

## Step 1 — Set Up Your Google Sheet (2 min)

If you already have a sheet from the previous version, skip to Step 2.

1. Go to <https://sheets.google.com> → create a new blank sheet
2. Name it: **Canteen Token System v3**
3. Save (auto-saves)

---

## Step 2 — Open Apps Script (1 min)

1. In your Google Sheet, click **Extensions → Apps Script**
2. A new tab opens with `Code.gs` file

---

## Step 3 — Paste Code.gs (2 min)

1. In the Apps Script editor, select all the default code → Delete
2. Open the `Code.gs` file I gave you
3. Copy everything → paste into the empty editor
4. Save (Ctrl+S) — name the project: **Canteen Token API v3**

---

## Step 4 — Create the HTML File (2 min)

This is the key new step.

1. In the Apps Script editor, look at the left sidebar
2. Find the **`+`** icon next to "Files"
3. Click it → select **HTML**
4. Name the file: **`Index`** (exactly this, capital I, no extension)
5. The editor opens a new tab with default HTML
6. Select all → Delete
7. Open the `Index.html` file I gave you
8. Copy everything → paste into the empty Index.html
9. Save (Ctrl+S)

You should now have **two files** in your Apps Script project:
- `Code.gs` ← backend logic
- `Index.html` ← frontend UI

---

## Step 5 — Run setupSheets (1 min)

1. In the function dropdown at the top of Apps Script, select **`setupSheets`**
2. Click **Run ▶**
3. If asked for authorization:
   - **Review permissions** → pick your account
   - **Advanced** → **Go to project (unsafe)** → **Allow**
4. Check the Execution log — you should see: `✓ Setup complete. Default password: rentomojo123`

Open your Google Sheet → all three tabs should now have headers:
- `user Detals`
- `Token List`
- `Canteen Person`

---

## Step 6 — Deploy as Web App (3 min)

This is what makes the app accessible.

1. Top right → **Deploy → New deployment**
2. Click the **gear ⚙️** icon → select **Web app**
3. Fill in:
   - **Description:** `Canteen Token System v3`
   - **Execute as:** `Me`
   - **Who has access:** `Anyone` ⚠️ critical
4. Click **Deploy**
5. **Copy the Web App URL** — it ends in `/exec`

---

## Step 7 — Open the App (1 min)

1. Open the Web App URL in any browser
2. You should see the **Meal Token System** home screen with the fork-spoon logo and two buttons

🎉 **That's it!** The app is live.

---

## Step 8 — Add Your Data (5 min)

In the Google Sheet:

### `user Detals` tab — add at least one employee
```
City    | Warehouse | Name       | Designation | Phone Number | Password | Photo Link | Status
Mumbai  | Tal-WH    | Charan     | IT Analyst  | 9019773841   | (blank)  | (blank)    | Yes
```

### `Canteen Person` tab — add at least one canteen counter
```
City    | Warehouse | User ID   | Password
Mumbai  | Tal-WH    | RMMUM101  | (blank)
```

---

## Step 9 — Test (10 min)

1. **Open the Web App URL on your phone**
2. Tap **Employee Login** → phone `9019773841` → password `rentomojo123`
3. Set a new password → take a photo
4. See the dashboard with Breakfast and Lunch cards
5. Tap **Use Token** during the meal window → token appears
6. **In a different browser**, open the same URL → tap **Canteen Staff** → log in as `RMMUM101` / `rentomojo123` → set password
7. See the employee's token → tap **Food Provided**
8. Refresh the employee app → status updates to **Served**

---

## Step 10 — Share With Your Team (2 min)

The Web App URL is what you share:

```
https://script.google.com/macros/s/.../exec
```

### Distribute it:
- **QR code:** generate a QR for the URL using any free QR generator
- **Print and post** at warehouse entrances and canteen counters
- **Bookmark on phones:** users tap once → add to home screen → it's like an app
- **Share via WhatsApp** with the warehouse team

---

## How to Update the App Later

### If you change `Code.gs`:
1. Save in Apps Script (Ctrl+S)
2. **Deploy → Manage deployments → pencil ✏️ → New version → Deploy**
3. URL stays the same. No frontend changes needed.

### If you change `Index.html`:
Same as above. Always deploy a **new version** for changes to take effect.

> ⚠️ Forgetting "New version" is the #1 reason "my changes aren't showing up."

---

## File Structure in Apps Script

```
Canteen Token API v3 (Apps Script project)
│
├── Code.gs           ← Backend logic + serves the HTML page (doGet)
└── Index.html        ← The entire user interface (vanilla HTML/JS/Tailwind)
```

That's it. Two files. No React, no npm, no build step.

---

## How It Works Technically

When someone opens the Web App URL:
1. Google routes the request to `doGet()` in `Code.gs`
2. `doGet()` reads `Index.html` and returns it as a rendered HTML page
3. The browser displays it
4. When the user clicks buttons, JavaScript inside `Index.html` calls `google.script.run.apiCall()`
5. `apiCall()` runs in the same Apps Script project, reads/writes Google Sheets, returns JSON
6. The frontend updates without a page reload

**No CORS, no fetch, no separate hosting.** Everything's in one place.

---

## Comparing to the React Version

| Feature | React Version | v3 (This Version) |
|---|---|---|
| Hosting | StackBlitz / Vercel | None — Apps Script serves the app |
| Updates require | Editing StackBlitz | Editing Index.html in Apps Script |
| URL to share | StackBlitz URL | Apps Script Web App URL |
| Tech to learn | React, npm, JSX | Plain HTML/JS |
| Performance | Faster initial load | Slightly slower first load, then identical |
| Maintainability | Needs React knowledge | Anyone with HTML/JS skills can edit |
| Cost | $0 | $0 |

---

## Troubleshooting

### "Script function not found: apiCall"
The `apiCall` function exists at the top level of `Code.gs`. If you renamed the script project or copied only part of the file, paste it again.

### "Index template file not found"
You named the HTML file something other than `Index`. The name must be exactly `Index` (capital I, no extension shown).

### Page loads but says "Sorry, the file you have requested does not exist"
Your deployment isn't set to "Anyone" access. Redo Step 6.

### App loads but actions don't work
Open your browser's developer console (F12 → Console tab) and look for errors. Common cause: trailing comma in JavaScript or a typo somewhere in `Code.gs`.

### Photos don't display
Re-run `savePhoto` for affected users — older photos may have a stale URL format.

---

## What You Just Built (Simplified Recap)

You have a complete production-ready system that:
- Lives in Google Workspace (no external services)
- Has zero ongoing cost
- Works on any phone with a browser
- Tracks meal tokens in real time
- Has photo verification
- Has a complete audit trail
- Is documented and shareable

**All in two files. Brilliant.** 🎉

---

**Built with ❤️ by Charan A Bijapur · IT Analyst · Rentomojo**
