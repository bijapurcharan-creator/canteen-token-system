# Google Sheet Structure

The application requires **one Google Sheet** with **three tabs**. Tab names must match exactly (case-sensitive, including the typo `user Detals`).

> **TIP:** Don't create headers manually. Just create the empty sheet with three tabs, then run `setupSheets()` from the Apps Script editor — it will create all the headers automatically.

---

## Tab 1 — `user Detals` (Employee Master)

> Yes, "Detals" is intentionally spelled this way. The Apps Script matches this exact name.

| Col | Header | Type | Example | Notes |
|---|---|---|---|---|
| A | City | Text | `Mumbai` | The city where the employee works |
| B | Warehouse | Text | `Tal-WH` | Warehouse code |
| C | Name | Text | `Charan` | Full name (displayed in UI) |
| D | Designation | Text | `IT Analyst` | Job title |
| E | Phone Number | Number | `9019773841` | Must be exactly 10 digits, no country code or spaces |
| F | Password | Text | *(blank)* | Leave blank for new users — they'll set on first login |
| G | Photo Link | URL | *(auto)* | Auto-populated when user uploads their profile photo |
| H | Status | Text | `Yes` | Must be exactly `Yes` to allow login; `No` blocks the account |

**Example rows:**
```
City       Warehouse  Name              Designation     Phone Number  Password  Photo Link  Status
Mumbai     Tal-WH     Charan A Bijapur  IT Analyst      9019773841    (blank)   (blank)     Yes
Kolkata    Inc-WH     Yogesh Patel      Data Scientist  9876543210    (blank)   (blank)     Yes
Bangalore  Mhg-WH     Priya Kumar       Operations      9123456789    (blank)   (blank)     Yes
```

---

## Tab 2 — `Token List` (Activity Log)

This is an **append-only log** — one row per token issued.

| Col | Header | Type | Example | Notes |
|---|---|---|---|---|
| A | Date | Date | `2026-05-27` | YYYY-MM-DD format |
| B | City | Text | `Mumbai` | Copied from employee record |
| C | Warehouse | Text | `Tal-WH` | Copied from employee record |
| D | Name | Text | `Charan` | Copied from employee record |
| E | Designation | Text | `IT Analyst` | Copied from employee record |
| F | Phone Number | Text | `'9019773841` | Stored with leading apostrophe to preserve format |
| G | Meal Type | Text | `breakfast` or `lunch` | Lowercase only |
| H | Token ID | Text | `BRK-A7K2P` | Auto-generated unique code |
| I | Canteen Person ID | Text | `RMMUM101` | Empty until token is served |
| J | Food Provided | Boolean | `TRUE` / `FALSE` | TRUE only after canteen staff confirms |

**Token ID format:**
- Breakfast: `BRK-XXXXX` (5 random alphanumeric characters)
- Lunch: `LCH-XXXXX`
- Excludes confusing characters (0, O, 1, I) for readability

**Example rows:**
```
Date        City    Warehouse  Name    Designation  Phone        Meal Type  Token ID    Canteen Person ID  Food Provided
2026-05-27  Mumbai  Tal-WH     Charan  IT Analyst   9019773841   breakfast  BRK-A7K2P   RMMUM101           TRUE
2026-05-27  Mumbai  Tal-WH     Charan  IT Analyst   9019773841   lunch      LCH-Q3JF8                      FALSE
```

---

## Tab 3 — `Canteen Person` (Staff Credentials)

One row per canteen counter / staff member.

| Col | Header | Type | Example | Notes |
|---|---|---|---|---|
| A | City | Text | `Mumbai` | Restricts which tokens this staff member can see |
| B | Warehouse | Text | `Tal-WH` | Restricts which tokens this staff member can see |
| C | User ID | Text | `RMMUM101` | Used as login username |
| D | Password | Text | *(blank)* | Blank = uses default `rentomojo123`, then forced change |

**Naming convention for User ID:**

`RM<CITY_CODE><COUNTER_NUMBER>` — e.g., `RMMUM101` = Rentomojo Mumbai counter 101

**Example rows:**
```
City       Warehouse  User ID    Password
Mumbai     Tal-WH     RMMUM101   (blank)
Kolkata    Inc-WH     RMKOK101   (blank)
Bangalore  Mhg-WH     RMBLR101   (blank)
```

---

## ⚠️ Common Setup Mistakes

1. **Wrong tab names** — must be exactly `user Detals` (yes, the typo), `Token List`, `Canteen Person`.
2. **Phone number formatting** — should be exactly 10 digits. If you see `9.01977E+09` in the sheet, the column is formatted as a number; change it to "Plain text" via Format → Number → Plain text.
3. **Status column** — must be exactly `Yes` (capital Y). Not `yes`, not `Y`, not `YES`.
4. **Password column** — leave blank for new users. Don't pre-fill with `rentomojo123` — blank is treated the same as default.
5. **Don't delete rows** in the Token List — it's an audit log. Use filters to hide if needed.

---

## 🔒 Sharing Permissions

The Google Sheet should be set to:
- **Owner:** the account that owns the Apps Script
- **Editors:** HR / Operations team members who manage employees
- **Viewers:** Finance / Management for monthly reports

**Do NOT share the sheet publicly.** The Apps Script Web App handles all public access — the sheet itself remains private.

---

## 🎯 Reporting Tips

Use built-in Google Sheets features to generate reports without writing any code:

- **Daily consumption per warehouse:** Use a Pivot Table on `Token List`, group by Date and Warehouse, count Token ID.
- **Per-employee monthly total:** Filter `Token List` by date range + Phone Number.
- **Pending tokens (not served):** Filter where Food Provided = FALSE.
- **Vendor invoice reconciliation:** Filter by Warehouse + date range, count served tokens.
