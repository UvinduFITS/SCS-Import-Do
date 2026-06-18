# Deployment Guide

The app has two deployable pieces:

1. **API server** (`server/`) — a long-running Node process. Needs the secrets.
2. **Client** (`client/`) — static files (`client/dist`) served by any static host/CDN.

You can host them separately (recommended) or behind one domain.

---

## 1. Deploy the API server

Any Node host works (Render, Railway, Fly.io, a VM, etc.). Node **18.17+** required.

**Build/run commands**
- Install: `npm install`
- Start: `npm run start` (runs `tsx server/src/index.ts`)

> The server runs TypeScript directly via `tsx`, so no separate compile step is
> needed. If your platform requires a single workspace, deploy from the repo root —
> `npm run start` proxies to the `server` workspace.

**Environment variables** (set in the host's dashboard — see
[ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md)):
- `GOOGLE_SHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_JSON` (inline JSON is easiest on cloud hosts)
- `GOOGLE_SHEET_TAB` (optional)
- `PORTANT_WEBHOOK_URL`
- `PORT` (many hosts inject this automatically)
- `CORS_ORIGIN` → set to your **frontend's** URL, e.g. `https://scs.yourcompany.com`

Health check endpoint for the platform: `GET /api/health`.

---

## 2. Deploy the client

**Build**
```bash
# from repo root
VITE_API_BASE_URL=https://api.yourcompany.com npm run build
# output: client/dist
```

Set `VITE_API_BASE_URL` to the **public URL of your API** at build time. Then upload
`client/dist` to any static host (Netlify, Vercel, Cloudflare Pages, S3+CloudFront,
Nginx…).

**SPA routing:** the app uses client-side routes (`/import-do`, `/history`).
Configure your host to rewrite all unknown paths to `/index.html`:

- Netlify: add `client/public/_redirects` with `/*  /index.html  200`
- Vercel: a rewrite of `/(.*)` → `/index.html`
- Nginx: `try_files $uri /index.html;`

**Logo:** drop your `logo.png` into `client/public/` before building (falls back to
`logo.svg`/text badge if absent).

---

## 3. Single-domain option (one origin, no CORS)

Put the API and the static client behind one reverse proxy:

- Route `/api/*` → the Node server.
- Route everything else → the static `client/dist` (with SPA fallback).

Then you can leave `VITE_API_BASE_URL` empty (the client calls relative `/api`), and
`CORS_ORIGIN` becomes irrelevant.

Example Nginx:
```nginx
location /api/ { proxy_pass http://127.0.0.1:4000; }
location /     { root /var/www/scs/dist; try_files $uri /index.html; }
```

---

## 4. Post-deploy checklist

- [ ] `GET /api/health` returns `{"status":"ok"}`.
- [ ] Server logs `Google Sheet ready` (else re-check sheet sharing / Sheets API).
- [ ] Create a test record → row appears in the sheet, `pdfStatus` becomes `SUCCESS`.
- [ ] **Download PDF** opens the Portant file.
- [ ] History → **Load Into Form** populates the form; saving creates a *new* row.
- [ ] `CORS_ORIGIN` matches the frontend URL (no CORS errors in the browser console).
- [ ] Secrets are set as env vars, **not** committed to git.

---

## 5. Security notes

- Secrets (`GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_SHEET_ID`, `PORTANT_WEBHOOK_URL`)
  exist only on the server. The frontend never receives them.
- Restrict the service account to just the one spreadsheet (share only that sheet).
- Consider putting the API behind your own auth/gateway if it's internet-facing;
  this build focuses on the data + PDF workflow and does not ship a user-auth layer.
