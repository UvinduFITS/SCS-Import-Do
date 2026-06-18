/**
 * Google access diagnostic. Verifies the service account can read + write the
 * history Sheet (PDFs are rendered by the Apps Script web app, so only the Sheet
 * needs service-account access).
 *
 *   npm run check:google -w server
 */

import { config, loadServiceAccount } from '../config.js';
import { ensureSheetReady } from '../services/sheets.js';

async function main() {
  const email = loadServiceAccount().client_email;
  console.log(`\nService account: ${email}`);
  console.log('Share the history Sheet with THIS email as "Editor".\n');

  try {
    await ensureSheetReady();
    console.log(`✓ Sheet OK (read + write)   id=${config.google.sheetId}`);
    console.log('\nGoogle Sheet access OK. 🎉\n');
    process.exit(0);
  } catch (err) {
    console.log(`✗ Sheet FAILED              id=${config.google.sheetId}`);
    console.log(`    ${(err as Error).message}`);
    console.log(`    → Open the Sheet → Share → add ${email} as Editor.\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
