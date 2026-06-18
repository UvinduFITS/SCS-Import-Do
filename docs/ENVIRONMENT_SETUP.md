# Environment Setup

All backend configuration lives in **`server/.env`**. Start from the template:

```bash
cp .env.example server/.env
```

The server validates these on boot (see `server/src/config.ts`) and fails fast with
a clear message if a required value is missing.

## Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | no | `4000` | Port the API listens on |
| `NODE_ENV` | no | `development` | `development` / `production` |
| `CORS_ORIGIN` | no | `http://localhost:5173` | Comma-separated list of allowed frontend origins |
| `GOOGLE_SHEET_ID` | **yes** | — | Spreadsheet ID from its URL |
| `GOOGLE_SHEET_TAB` | no | `SCS_IMPORT_DO_HISTORY` | Worksheet/tab name (auto-created if missing) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | yes* | — | Inline service-account JSON (recommended for cloud hosts) |
| `GOOGLE_SERVICE_ACCOUNT_FILE` | yes* | — | Path to a service-account key file (recommended for local dev) |
| `PORTANT_WEBHOOK_URL` | **yes** | — | Portant webhook endpoint (server-side only) |
| `PORTANT_TIMEOUT_MS` | no | `30000` | Per-attempt timeout for Portant calls |
| `PORTANT_MAX_RETRIES` | no | `3` | Retry attempts on Portant failure |
| `PORTANT_PDF_URL_PATH` | no | — | Dotted path to the PDF URL in Portant's response (e.g. `data.url`). Common keys are auto-detected if omitted |
| `LOG_LEVEL` | no | `info` | `debug` / `info` / `warn` / `error` |

\* Provide **one** of `GOOGLE_SERVICE_ACCOUNT_JSON` or `GOOGLE_SERVICE_ACCOUNT_FILE`.
Inline JSON takes precedence.

### Client variables (`client/.env`, optional — these are PUBLIC)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | empty (uses dev proxy `/api`) | Base URL of the API in production |
| `VITE_API_PROXY` | `http://localhost:4000` | Where the dev server proxies `/api` |
| `VITE_DEFAULT_USER_EMAIL` | empty | Default value for `createdByEmail` |

> Never put secrets in `client/.env` — anything prefixed `VITE_` is bundled into the
> browser. The Google and Portant secrets belong only in `server/.env`.

## Inline JSON tip

When pasting the service-account JSON into a single env var, keep it on one line.
`\n` escapes inside `private_key` are handled automatically by the loader.

```
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","client_email":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n", ...}
```
