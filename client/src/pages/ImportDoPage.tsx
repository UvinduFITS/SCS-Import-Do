import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  COLUMN_TITLES,
  PDF_STATUS,
  buildDefaultValues,
  fieldsForColumn,
  importDoSchema,
  type FieldColumn,
  type ImportDoForm,
  type ImportDoRecord,
} from '@scs/shared';
import { FormField } from '../components/form/FormField';
import { Spinner } from '../components/ui/Spinner';
import { StatusBadge } from '../components/ui/Badge';
import { api } from '../api/client';
import { clearDraft, loadDraft, saveDraft, type SavedDraft } from '../lib/draft';
import { describeApiError, recordToForm } from '../lib/recordForm';
import { downloadBase64Pdf, downloadPdfBlob } from '../lib/pdf';

const COLUMNS: FieldColumn[] = [1, 2, 3];
const AUTOSAVE_MS = 30_000;

export function ImportDoPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const loadId = searchParams.get('load');

  const form = useForm<ImportDoForm>({
    resolver: zodResolver(importDoSchema),
    defaultValues: buildDefaultValues(),
    mode: 'onBlur',
  });
  const { register, handleSubmit, reset, getValues, watch, formState } = form;
  const { errors, isSubmitting } = formState;

  const [currentRecord, setCurrentRecord] = useState<ImportDoRecord | null>(null);
  const [pdf, setPdf] = useState<{ base64?: string; filename: string } | null>(null);
  const [draftPrompt, setDraftPrompt] = useState<SavedDraft | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const loadedRef = useRef<string | null>(null);

  // ── Load a record into the form (Load Into Form / Duplicate land here) ──
  useEffect(() => {
    if (!loadId || loadedRef.current === loadId) return;
    loadedRef.current = loadId;
    (async () => {
      try {
        const { record } = await api.getRecord(loadId);
        reset(recordToForm(record));
        setCurrentRecord(null); // saving will create a NEW record, never overwrite
        setPdf(null);
        toast.success('Record Loaded Successfully');
      } catch (err) {
        toast.error(describeApiError(err));
      } finally {
        setSearchParams({}, { replace: true });
      }
    })();
  }, [loadId, reset, setSearchParams]);

  // ── Offer to restore a saved draft (only on a fresh, non-load visit) ──
  useEffect(() => {
    if (loadId) return;
    const draft = loadDraft();
    if (draft) setDraftPrompt(draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-save: every 30s + on change ──
  useEffect(() => {
    const id = setInterval(() => {
      saveDraft(getValues());
      setLastSaved(new Date());
    }, AUTOSAVE_MS);
    return () => clearInterval(id);
  }, [getValues]);

  useEffect(() => {
    const sub = watch((values) => saveDraft(values as ImportDoForm));
    return () => sub.unsubscribe();
  }, [watch]);

  const restoreDraft = () => {
    if (draftPrompt) {
      reset(draftPrompt.values);
      toast.success('Draft Restored');
    }
    setDraftPrompt(null);
  };
  const dismissDraft = () => {
    clearDraft();
    setDraftPrompt(null);
  };

  const resetForm = () => {
    reset(buildDefaultValues());
    clearDraft();
    setCurrentRecord(null);
    setPdf(null);
    toast('Form cleared', { icon: '🧹' });
  };

  // ── Create PDF: validate -> save record (best-effort) -> render PDF -> download ──
  const onSubmit = useCallback(async (values: ImportDoForm) => {
    const toastId = toast.loading('Generating PDF…');
    try {
      const { record, pdfBase64, filename, savedToHistory } = await api.createRecord(values, true);
      setCurrentRecord(record);
      clearDraft();
      toast.dismiss(toastId);
      if (pdfBase64) {
        const fn = filename || 'delivery-order.pdf';
        setPdf({ base64: pdfBase64, filename: fn });
        downloadBase64Pdf(pdfBase64, fn);
        if (savedToHistory === false) {
          toast('PDF downloaded — not saved to History yet (share your Google Sheet).', {
            icon: '⚠️',
            duration: 7000,
          });
        } else {
          toast.success('PDF generated & downloaded');
        }
      } else if (record?.pdfStatus === PDF_STATUS.FAILED) {
        toast.error('PDF generation failed — record saved, retry below');
      } else if (savedToHistory === false) {
        toast.error('Could not save to History — check the Google Sheet sharing.');
      } else {
        toast.success('Record saved');
      }
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(describeApiError(err));
    }
  }, []);

  const onInvalid = () => toast.error('Please fix the highlighted required fields.');

  const handleRegenerate = async () => {
    if (!currentRecord) return;
    setRegenerating(true);
    const toastId = toast.loading('Generating PDF…');
    try {
      const { record, pdfBase64, filename } = await api.generatePdf(currentRecord.recordId);
      setCurrentRecord(record);
      toast.dismiss(toastId);
      if (pdfBase64) {
        const fn = filename || 'delivery-order.pdf';
        setPdf({ base64: pdfBase64, filename: fn });
        downloadBase64Pdf(pdfBase64, fn);
        toast.success('PDF generated & downloaded');
      } else {
        toast.error('PDF Generation Failed');
      }
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(describeApiError(err));
    } finally {
      setRegenerating(false);
    }
  };

  const handleDownload = async () => {
    // Prefer the already-generated PDF; otherwise (re)generate from the saved record.
    if (pdf?.base64) {
      downloadBase64Pdf(pdf.base64, pdf.filename);
      return;
    }
    if (!currentRecord) return;
    setDownloading(true);
    const toastId = toast.loading('Generating PDF…');
    try {
      const { blob, filename } = await api.downloadRecordPdf(currentRecord.recordId);
      downloadPdfBlob(blob, filename);
      toast.dismiss(toastId);
      toast.success('PDF downloaded');
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(describeApiError(err));
    } finally {
      setDownloading(false);
    }
  };

  const canDownload = Boolean(currentRecord) || Boolean(pdf?.base64);
  const busy = isSubmitting;

  // Only these fields are user-editable (blue inputs). Every other text/number/date
  // field is locked / read-only (greyed). Delivery Agent fields are intentionally
  // NOT editable — they stay locked at their fixed Fits Express default values.
  // (Selection controls — radios, checkboxes, multi-selects — remain interactive.)
  const EDITABLE_KEYS = new Set([
    // Column 1
    'consigneeName',
    'consigneeAddress01',
    'consigneeAddress02',
    'voyageNo',
    'vessel',
    'portOfLoading',
    'serialNo',
    'blNo',
    // Column 2
    'containersDestuffedStuffed',
    'marksAndNo',
    'containerNos',
    // Column 3
    'pkgType',
    'descriptionOfGoods',
    'grossWeightKg',
    'cbmM3',
    'numberOfPkgsInNumbers',
    'skVerifyMeasurementDcCargo',
    'forwardersDoNo',
    'documentToBeUsedAs',
  ]);
  // #5: "DO Expires On" is editable ONLY when FCL is selected; otherwise locked.
  const fclSelection = watch('fclLclSelection');
  const isFieldDisabled = (key: string) =>
    key === 'doExpiresOn' ? fclSelection !== 'FCL' : !EDITABLE_KEYS.has(key);

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)}>
      {/* Draft restore banner */}
      {draftPrompt && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
          <span className="text-sm text-amber-800">
            A saved draft from <strong>{new Date(draftPrompt.savedAt).toLocaleString()}</strong> was found. Restore it?
          </span>
          <div className="flex gap-2">
            <button type="button" className="btn-primary" onClick={restoreDraft}>
              Restore Draft
            </button>
            <button type="button" className="btn-secondary" onClick={dismissDraft}>
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Action bar */}
      <div className="sticky top-16 z-10 mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-slate-800">Import Delivery Order</h2>
          {currentRecord && (
            <span className="flex items-center gap-2 text-xs text-slate-500">
              <StatusBadge status={currentRecord.pdfStatus} />
              <span className="font-mono">{currentRecord.recordId.slice(0, 8)}</span>
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {lastSaved && (
            <span className="mr-1 hidden text-xs text-slate-400 sm:inline">
              Draft saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <button type="button" className="btn-ghost" onClick={resetForm} disabled={busy}>
            Clear
          </button>
          {currentRecord && currentRecord.pdfStatus !== PDF_STATUS.SUCCESS && (
            <button type="button" className="btn-secondary" onClick={handleRegenerate} disabled={regenerating}>
              {regenerating ? <Spinner /> : null} Retry PDF
            </button>
          )}
          <button
            type="button"
            className="btn-secondary"
            disabled={!canDownload || downloading}
            onClick={handleDownload}
            title={canDownload ? 'Download generated PDF' : 'Create a PDF first'}
          >
            {downloading ? <Spinner /> : null} Download PDF
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? <Spinner /> : null} Create PDF
          </button>
        </div>
      </div>

      {/* Three-column responsive form */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {COLUMNS.map((col) => (
          <section key={col} className="card p-4">
            <h3 className="mb-4 border-b border-slate-100 pb-2 text-sm font-semibold uppercase tracking-wide text-brand-700">
              {COLUMN_TITLES[col]}
            </h3>
            <div className="space-y-3.5">
              {fieldsForColumn(col).map((field) => (
                <FormField
                  key={field.key}
                  field={field}
                  register={register}
                  errors={errors}
                  disabled={isFieldDisabled(field.key)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? <Spinner /> : null} Create PDF
        </button>
      </div>
    </form>
  );
}
