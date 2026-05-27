# Frontend — React App

A single-page React application that runs entirely in the browser. No build step required for the StackBlitz workflow.

## Files

| File | Purpose |
|---|---|
| [`App.js`](App.js) | Main React component — all UI logic |
| [`index.html`](index.html) | HTML entry point with Tailwind CDN |
| [`index.js`](index.js) | React DOM mount point |
| [`package.json`](package.json) | NPM dependencies |

## Configuration

Open [`App.js`](App.js) and update line 14 with your deployed Apps Script URL:

```javascript
const DEFAULT_API_URL = 'https://script.google.com/macros/s/.../exec';
```

## Quick Start (StackBlitz)

1. Go to <https://stackblitz.com/fork/react>
2. Replace `src/App.js` with this `App.js`
3. Replace `public/index.html` with this `index.html`
4. In the terminal: `npm install lucide-react`
5. Update `DEFAULT_API_URL` constant
6. Preview URL on the right is your live app

## Quick Start (Vercel / local)

```bash
npx create-react-app canteen-app
cd canteen-app
npm install lucide-react

# Replace src/App.js with this App.js
# Replace public/index.html with this index.html
# Update DEFAULT_API_URL in App.js

npm start                    # for local dev
npx vercel                   # for production deploy
```

## Dependencies

| Package | Purpose |
|---|---|
| react | UI library |
| react-dom | Browser rendering |
| lucide-react | Icon library |
| Tailwind CSS (CDN) | Styling — loaded via index.html, no install needed |

## Component Tree

```
App
├── RoleSelector          (home screen: employee / canteen choice)
├── SettingsPanel         (API URL configuration)
│
├── EmployeeLogin         (phone + password)
│   └── SetPasswordScreen (forced password change on first login)
│       └── PhotoCapture  (profile photo on first login)
│           └── EmployeeDashboard
│               ├── MealCard (Breakfast)
│               └── MealCard (Lunch)
│
└── CanteenLogin          (User ID + password)
    └── SetPasswordScreen
        └── CanteenDashboard
            ├── MealTab (filter: All / Breakfast / Lunch)
            └── TokenCard (per token)
```

## State Management

Pure React hooks — no Redux, no Context. State is local to each component except for the top-level `view` state in `App`, which controls routing.

## Persistent Storage

The API URL is persisted via `window.localStorage` so users don't need to re-enter it. Resolution order:

1. `window.__CANTEEN_API_URL__` (current session)
2. `localStorage.getItem('canteen_api_url')` (saved override)
3. Hardcoded `DEFAULT_API_URL` (works out of the box)

## Styling

Tailwind CSS, loaded via CDN in `index.html`:

```html
<script src="https://cdn.tailwindcss.com"></script>
```

No PostCSS, no `tailwind.config.js`, no build step. JIT compilation happens in the browser. For production, swap to the proper Tailwind install for better performance.

## Mobile Considerations

- `viewport-fit=cover` for iOS safe areas
- `apple-mobile-web-app-capable` enables home-screen install on iOS
- `overscroll-behavior-y: none` prevents iOS rubber-band scrolling on the body
- File inputs use `capture="user"` for direct camera access on mobile

## Adding Your Own Logo

Currently uses an inline SVG `ForkSpoonLogo`. To replace:

1. Add your logo to `public/logo.png`
2. Replace the `ForkSpoonLogo` component with `<img src="/logo.png" />`
3. Or modify the SVG paths in the component itself
