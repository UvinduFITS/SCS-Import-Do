# SCS IMPORT DO

A production-ready rebuild of the Bubble.io **SCS Import DO** app. Users fill an
Import Delivery Order form, generate a PDF via Portant, and — most importantly —
**reuse previous submissions** so they never retype the same shipment data twice.

> **Primary feature:** the History page acts as a reusable database. Load a past
> record into the form → change a few fields → generate a new PDF → it's saved as
> a **brand-new** record (the original is never overwritten).

---

## Tech stack

| Layer    | Technology |
|----------|------------|
| Frontend | React, TypeScript, Vite, Tailwind CSS, React Hook Form, Zod, React Router, TanStack Table, TanStack Query, react-hot-toast |
| Backend  | Node.js, Express, TypeScript |
| Database | Google Sheets (`SCS_IMPORT_DO_HISTORY`) via the Sheets API |
| PDF      | Portant webhook |

---

## Monorepo layout

```
scs_import_do/
├── shared/          @scs/shared — the SINGLE SOURCE OF TRUTH
│   └── src/
│       ├── fields.ts        field registry (labels, types, columns, defaults, required)
│       ├── schema.ts        Zod schema (built from the registry) + types
│       ├── constants.ts     enums + option lists (PDF status, container sizes…)
│       └── index.ts         + SHEET_COLUMNS (sheet column order)
├── server/          Express API (secrets live ONLY here)
│   └── src/
│       ├── index.ts             app + routes wiring
│       ├── config.ts            validated env loading
│       ├── routes/              records.ts, meta.ts
│       ├── services/            sheets.ts, portant.ts, pdf.ts
│       └── lib/                 transform.ts, portant.mapping.ts, errors.ts
├── client/          React + Vite frontend
│   └── src/
│       ├── pages/               ImportDoPage.tsx, HistoryPage.tsx
│       ├── components/          Header, RecordModal, form/FormField, ui/…
│       ├── api/client.ts        typed API calls
│       └── lib/                 draft.ts (autosave), export.ts (CSV/Excel), format.ts
├── docs/            setup & deployment guides
├── .env.example     copy to server/.env
└── package.json     npm workspaces + scripts
```

Because the form is generated from one **field registry**, adding/renaming/reordering
a field (or toggling `required`) is a **one-line change in `shared/src/fields.ts`** that
automatically updates the form UI, validation, sheet columns, and Portant payload.

---

## Quick start

```bash
# 1. Install everything (workspaces)
npm install

# 2. Configure the backend
cp .env.example server/.env
#   then fill in GOOGLE_SHEET_ID, Google service-account creds, PORTANT_WEBHOOK_URL
#   (see docs/GOOGLE_SHEETS_SETUP.md and docs/PORTANT_SETUP.md)

# 3. Run both apps (server :4000, client :5173)
npm run dev
```

Open <http://localhost:5173>. The client proxies `/api` to the server in dev.

### Useful scripts (run from the repo root)

| Command | What it does |
|---------|--------------|
| `npm run dev` | Run server + client together |
| `npm run dev:server` / `npm run dev:client` | Run one side |
| `npm run build` | Production build of the client (`client/dist`) |
| `npm run start` | Start the API server |
| `npm run typecheck` | Type-check all three workspaces |

---

## How the key flows work

### Create PDF (form page)
`Create PDF` → validate (Zod) → **create a new row** in Google Sheets
(`pdfStatus = PROCESSING`) → send to Portant (server-side, with retries/timeout) →
store the returned `pdfUrl` (`pdfStatus = SUCCESS`) → the **Download PDF** button
enables and opens the URL in a new tab. On failure the row is marked `FAILED` and
can be retried from the form or History.

### Load Into Form (history page — the headline feature)
`Load Into Form` → fetch the record → navigate to `/import-do?load=<id>` → the form
is fully populated → edit anything → `Create PDF` → **saved as a NEW record**. The
source record is never modified.

### Duplicate
Instantly clones a record's field values into a new row (no PDF yet), so it appears
in History to edit/generate later. (`Load Into Form` is the edit-then-save variant.)

### Auto-save drafts
The form saves to `localStorage` every 30s and on change. After a refresh you're
prompted to **Restore Draft**.

---

## Data model (Google Sheet columns)

`recordId, createdAt, updatedAt, createdByEmail, <all form fields…>, pdfStatus, pdfUrl, lastGeneratedAt`

- Dates/datetimes stored as ISO-style strings.
- Multi-select / checkbox-group values stored as JSON arrays (round-trip safely).
- `pdfStatus` ∈ `PENDING | PROCESSING | SUCCESS | FAILED`.

---

## Validation rules (per spec)

- **Required:** Consignee Name, Vessel, Agent DO No, Serial No, B/L No. Everything
  else optional. Toggle any field by editing `required` in `shared/src/fields.ts`.
- **Numbers:** reject negatives, accept `0`+.
- **Phones:** digits, spaces, `+ - ( ) *`.

---

## Security

All secrets are **server-side only** and never shipped to the browser:
`GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_SHEET_ID`, `PORTANT_WEBHOOK_URL`.
See [`.gitignore`](.gitignore) — credential files and `.env` are never committed.

---

## Documentation

- [docs/ENVIRONMENT_SETUP.md](docs/ENVIRONMENT_SETUP.md) — every env var explained
- [docs/GOOGLE_SHEETS_SETUP.md](docs/GOOGLE_SHEETS_SETUP.md) — service account + sheet sharing
- [docs/PORTANT_SETUP.md](docs/PORTANT_SETUP.md) — webhook + template merge-tag mapping
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — deploying the API and the static frontend
