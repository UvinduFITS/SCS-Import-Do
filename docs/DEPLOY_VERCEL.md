# Deploy to Vercel

The whole app runs on **one Vercel project**:

- **Frontend** — the React/Vite app, served as static files from `client/dist`.
- **Backend** — the Express API runs as a **serverless function** at `/api/*`
  (`api/[...path].ts`, bundled from `server/src/app.ts` by `scripts/build-api.mjs`).
- **Data + auth** — everything lives in your **Google Sheet**; the function reads its
  Google credentials from **environment variables** (no key file is deployed).

Same domain for the site and the API, so no CORS/extra config — the client calls `/api`.

---

## 1. Prerequisites
- The Google Sheet is already set up (it has the `SCS_IMPORT_DO_HISTORY` + `USERS`
  tabs and an admin user — they were created when you ran it locally). Vercel does
  **not** auto-create them, so a brand-new/empty sheet must be initialized by running
  locally once (`npm run dev:server`) before relying on it in production.
- Push this repo to GitHub/GitLab/Bitbucket.

## 2. Import the project on Vercel
1. **vercel.com → Add New → Project → import your repo.**
2. Framework Preset: **Other** (the included `vercel.json` already configures the build:
   build command `npm run build:vercel`, output `client/dist`, and the `/api` function).
3. Don't deploy yet — add the env vars first (next step).

## 3. Environment Variables (Project → Settings → Environment Variables)
Add these (Production + Preview). **These are the only place secrets live.**

| Variable | Required | Value |
| --- | --- | --- |
| `JWT_SECRET` | ✅ | A long random string (signs login tokens) |
| `GOOGLE_SHEET_ID` | ✅ | `1ghqu8_94O_Os2qi-kQES2T2ND-aAGNwpRfVp7cef0AE` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | ✅ | The **entire** service-account JSON, **on one line** (see below) |
| `APPS_SCRIPT_URL` | ✅ (for PDF) | Your Apps Script web-app URL (`…/exec`) |
| `APPS_SCRIPT_SECRET` | ✅ (for PDF) | Same secret as in `apps-script/Code.gs` |
| `GOOGLE_SLIDES_TEMPLATE_ID` | ✅ (for PDF) | `1PxjP7GcUszFD5MoUqz3FTfxx_vRXx3sfkeDMyfs-g7Q` |
| `GOOGLE_SHEET_TAB` | optional | defaults `SCS_IMPORT_DO_HISTORY` |
| `GOOGLE_USERS_TAB` | optional | defaults `USERS` |
| `NODE_ENV` | optional | `production` |

> **`GOOGLE_SERVICE_ACCOUNT_JSON`** — open `server/google-service-account.json`, copy
> its full contents, and paste as the value. It must be valid JSON on a single line
> (escaped `\n` inside `private_key` is fine — that's how the file already stores it).
> This replaces the local `GOOGLE_SERVICE_ACCOUNT_FILE` setting, which can't be used on
> Vercel (no file is uploaded).

You do **not** need any `VITE_*` vars — the frontend calls the API at the relative path
`/api` on the same domain.

## 4. Deploy
Click **Deploy**. Vercel will:
1. `npm install` (workspaces),
2. `npm run build:vercel` → builds the client **and** bundles the API (`api/_app.mjs`),
3. publish `client/dist` + the `/api` function.

Open the deployment URL and sign in with your admin account.

## 5. After deploy
- **Add the Vercel domain to Google** only if you tighten things later — not required,
  since the service account talks to Sheets server-side.
- The Apps Script web app is unaffected (it's separate). PDF + history work as locally.

---

## Notes & limits
- **Cold starts:** the first request after idle is a little slower while the function
  spins up. Fine for an internal tool.
- **Function timeout:** set to 60s in `vercel.json` (`maxDuration`) for the PDF round-trip.
- **No bootstrap on Vercel:** the serverless function does not create tabs or seed the
  admin (that only runs locally via `index.ts`). Keep the sheet pre-initialized.
- **If the build fails on the API bundle**, run `npm run build:api` locally to see the
  error; the bundle is plain esbuild and not Vercel-specific.
- Prefer a separate always-on Node host? The same `server/` runs anywhere with
  `npm start` + the env vars above (set `GOOGLE_SERVICE_ACCOUNT_JSON`); then host only
  the client on Vercel and point it at that API via `VITE_API_BASE_URL`.
