/**
 * /api/meta — non-secret form metadata so the client can render the form
 * dynamically from the same registry the server uses. No secrets here.
 */

import { Router } from 'express';
import { COLUMN_TITLES, FIELDS, PDF_STATUS_VALUES } from '@scs/shared';

export const metaRouter = Router();

metaRouter.get('/fields', (_req, res) => {
  res.json({
    columnTitles: COLUMN_TITLES,
    fields: FIELDS,
    pdfStatuses: PDF_STATUS_VALUES,
  });
});
