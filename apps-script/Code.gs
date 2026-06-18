/**
 * SCS IMPORT DO — PDF web app (Google Apps Script)
 * ------------------------------------------------
 * Fills a Google Slides template with the record's data and returns the PDF.
 * Runs AS YOU, so it uses your own Drive (no service-account quota issues).
 *
 * SETUP (see docs/APPS_SCRIPT_SETUP.md):
 *   1. script.google.com → New project → paste this file.
 *   2. Set SHARED_SECRET below to a long random string.
 *   3. Deploy → New deployment → Web app:
 *        Execute as: Me
 *        Who has access: Anyone
 *      Authorize the Drive + Slides permissions when prompted.
 *   4. Copy the Web app URL → server/.env APPS_SCRIPT_URL
 *      Set server/.env APPS_SCRIPT_SECRET to the SAME value as SHARED_SECRET.
 *
 * Request body (POST JSON from the server):
 *   { "secret": "...", "templateId": "<slides id>",
 *     "replacements": { "[Consignee_Name]": "ABC", ... }, "filename": "DO_SR1.pdf" }
 * Response: { "pdfBase64": "...", "filename": "..." }  or  { "error": "..." }
 */

var SHARED_SECRET = '47a37707c28f3689682cea9329f7e64a3079fbfa5b738183';

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (!body || body.secret !== SHARED_SECRET) {
      return out({ error: 'unauthorized' });
    }
    var templateId = body.templateId;
    if (!templateId) return out({ error: 'missing templateId' });
    var replacements = body.replacements || {};
    var filename = body.filename || 'delivery-order.pdf';

    // 1. Copy the Slides template (the copy is owned by you).
    var copyId = DriveApp.getFileById(templateId).makeCopy(filename.replace(/\.pdf$/i, '')).getId();

    try {
      // 2. Fill every [Tag] placeholder.
      var pres = SlidesApp.openById(copyId);
      for (var tag in replacements) {
        if (Object.prototype.hasOwnProperty.call(replacements, tag)) {
          var value = replacements[tag];
          pres.replaceAllText(tag, value === null || value === undefined ? '' : String(value));
        }
      }
      pres.saveAndClose();

      // 3. Export the filled copy as a PDF.
      var pdfBytes = DriveApp.getFileById(copyId).getAs('application/pdf').getBytes();
      return out({ pdfBase64: Utilities.base64Encode(pdfBytes), filename: filename });
    } finally {
      // 4. Remove the temporary copy.
      try { DriveApp.getFileById(copyId).setTrashed(true); } catch (ignore) {}
    }
  } catch (err) {
    return out({ error: String(err) });
  }
}

/** Health check (open the web-app URL in a browser to test it's live). */
function doGet() {
  return out({ ok: true, service: 'scs-import-do-pdf' });
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
