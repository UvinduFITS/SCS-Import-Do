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
| `JWT_SECRET` | **yes** | — | Secret used to sign login tokens (long random string) |
| `JWT_EXPIRES_IN` | no | `7d` | Login token lifetime |
| `GOOGLE_SHEET_ID` | **yes** | — | Spreadsheet ID from its URL (records + USERS tabs) |
| `GOOGLE_SHEET_TAB` | no | `SCS_IMPORT_DO_HISTORY` | Records/history tab (auto-created locally) |
| `GOOGLE_USERS_TAB` | no | `USERS` | Users/login tab (auto-created locally) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | yes* | — | **Full** service-account JSON on one line. **Use this on Vercel / any serverless or cloud host** (no filesystem there) |
| `GOOGLE_SERVICE_ACCOUNT_FILE` | yes* | — | Path to a service-account key file. **LOCAL DEV ONLY** — git-ignored, not deployed |
| `GOOGLE_SLIDES_TEMPLATE_ID` | for PDF | — | Slides template id (filled by the Apps Script web app) |
| `APPS_SCRIPT_URL` | for PDF | — | Apps Script web-app URL (`…/exec`) |
| `APPS_SCRIPT_SECRET` | for PDF | — | Shared secret matching `apps-script/Code.gs` |
| `LOG_LEVEL` | no | `info` | `debug` / `info` / `warn` / `error` |

\* Provide **one** of `GOOGLE_SERVICE_ACCOUNT_JSON` or `GOOGLE_SERVICE_ACCOUNT_FILE`.
`GOOGLE_SERVICE_ACCOUNT_JSON` is checked first. On Vercel you **must** use the JSON
env var — the file option only works for local development. Credentials are loaded
lazily, so a bad/missing key returns a clean error from `GET /api/health` rather than
crashing the server.

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
