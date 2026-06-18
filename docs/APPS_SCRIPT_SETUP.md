# PDF via Google Apps Script + Slides template

PDFs are produced by a small **Google Apps Script web app** that you deploy. It runs
**as you**, so it can copy your **Slides template**, fill the `[Tag]` placeholders,
export a PDF, and return it — no service-account Drive quota limits, no domain-wide
delegation. The Node server calls this web app when you click **Download / Create PDF**
and streams the PDF to your browser.

```
Browser → Server (save record, build [Tag]→value map) → Apps Script web app (runs as you)
        → copy Slides template → replaceAllText → export PDF → return base64 → download
```

## 1. Create the script
1. Go to **https://script.google.com** → **New project**.
2. Delete the sample code, paste the contents of [`apps-script/Code.gs`](../apps-script/Code.gs).
3. Set `SHARED_SECRET` (top of the file) to a long random string — e.g. run
   `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"` and paste it.
4. **Save**.

## 2. Deploy as a web app
1. **Deploy** → **New deployment** → gear icon → **Web app**.
2. **Description:** anything. **Execute as: Me.** **Who has access: Anyone.**
3. **Deploy** → **Authorize access** → pick your Google account → allow the
   **Drive** and **Slides** permissions (you'll see an "unverified app" screen — it's
   your own script; click **Advanced → Go to … (unsafe)** → **Allow**).
4. Copy the **Web app URL** (ends in `/exec`).

> Whenever you change the script, **Deploy → Manage deployments → edit → New version**
> (or create a new deployment) so the URL serves the latest code.

## 3. Point the server at it
In `server/.env`:
```ini
APPS_SCRIPT_URL=https://script.google.com/macros/s/XXXXXXXX/exec
APPS_SCRIPT_SECRET=<the same SHARED_SECRET you set in the script>
GOOGLE_SLIDES_TEMPLATE_ID=1PxjP7GcUszFD5MoUqz3FTfxx_vRXx3sfkeDMyfs-g7Q
```
Restart the server. **Create PDF** now renders from your Slides template.

## 4. Test the web app directly (optional)
Open the `…/exec` URL in a browser — it should show `{"ok":true,"service":"scs-import-do-pdf"}`.

## Placeholder names
The server sends a `[Tag] → value` map built from
[`server/src/lib/slides.mapping.ts`](../server/src/lib/slides.mapping.ts). If a tag in
your template differs, change it there (one place). Tags are case-sensitive, e.g.
`[Consignee_Name]`, `[Vessel]`, `[Agent_DO_No]`.

## Notes
- The template must be openable by the Google account that owns the script (it is, if
  you created both).
- If `APPS_SCRIPT_URL` is left empty, the server falls back to a built-in local PDF
  layout (no Google needed) — handy before the script is deployed.
- Records + History still use the Google Sheet via the service account, so that Sheet
  must be shared with the service-account email as **Editor** (`npm run check:google -w server`).
