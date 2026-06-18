/**
 * /api/pdf — generate a Delivery Order PDF directly from form values WITHOUT
 * saving a record. Streams the PDF as a download. Handy for a quick "download
 * only" or when Sheets persistence isn't needed.
 */

import { Router } from 'express';
import { importDoSchema, type ImportDoForm } from '@scs/shared';
import { asyncHandler } from '../middleware/errorHandler.js';
import { generatePdfFromForm } from '../services/pdf.js';
import { safe } from '../lib/strings.js';
import { config } from '../config.js';

export const pdfRouter = Router();

pdfRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const body =
      req.body && typeof req.body === 'object' && 'form' in req.body ? req.body.form : req.body;
    const form = importDoSchema.parse(body) as ImportDoForm;

    const pdf = await generatePdfFromForm(form);
    const token = safe(String((form as Record<string, unknown>).serialNo || 'document'));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${config.pdf.filenamePrefix}_${token}.pdf"`);
    res.send(pdf);
  }),
);
