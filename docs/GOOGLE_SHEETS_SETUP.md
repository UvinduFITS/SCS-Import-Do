# Google Sheets API Configuration

The app uses one Google Sheet as its database. One row = one Import DO record.
The server reads/writes it with a **service account** (no per-user OAuth needed).

## 1. Create the spreadsheet

1. Create a new Google Sheet (any name — e.g. `SCS Import DO`).
2. The app will create/maintain a tab named **`SCS_IMPORT_DO_HISTORY`** automatically
   and write the header row on first run. (You can change the tab name via
   `GOOGLE_SHEET_TAB`.)
3. Copy the **spreadsheet ID** from the URL and set it as `GOOGLE_SHEET_ID`:

   ```
   https://docs.google.com/spreadsheets/d/<THIS_IS_THE_ID>/edit
   ```

## 2. Create a Google Cloud project + service account

1. Go to <https://console.cloud.google.com/> and create (or pick) a project.
2. **APIs & Services → Library →** enable **Google Sheets API**.
3. **APIs & Services → Credentials → Create credentials → Service account.**
   - Name it (e.g. `scs-import-do`), create, and finish.
4. Open the service account → **Keys → Add key → Create new key → JSON**.
   A `.json` key file downloads. **Keep it secret.**

## 3. Share the sheet with the service account

Open the JSON file and copy the `client_email`
(looks like `scs-import-do@your-project.iam.gserviceaccount.com`).

In the Google Sheet, click **Share** and add that email as an **Editor**.

> This step is the most common cause of `403 / The caller does not have permission`.
> The service account can only access sheets explicitly shared with it.

## 4. Provide the credentials to the server

Pick one option in `server/.env`:

**Local dev (file):**
```
GOOGLE_SERVICE_ACCOUNT_FILE=./google-service-account.json
```
Place the JSON key file at `server/google-service-account.json` (it's git-ignored).

**Cloud host (inline):**
```
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account", ... }
```
Paste the whole JSON on one line.

Also set:
```
GOOGLE_SHEET_ID=your-spreadsheet-id
GOOGLE_SHEET_TAB=SCS_IMPORT_DO_HISTORY
```

## 5. Verify

Start the server (`npm run dev:server`). On success you'll see:

```
{"level":"info","message":"Google Sheet ready","meta":{"tab":"SCS_IMPORT_DO_HISTORY"}}
```

and the header row will appear in the sheet. If you see an init error, re-check the
share step and that the Sheets API is enabled.

## Column layout (managed automatically)

```
recordId | createdAt | updatedAt | createdByEmail | <all form fields…> | pdfStatus | pdfUrl | lastGeneratedAt
```

Don't reorder or rename these columns by hand — the order is defined in
`shared/src/index.ts` (`SHEET_COLUMNS`) and the server re-asserts the header on boot.
