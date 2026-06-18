import { useState } from 'react';
import toast from 'react-hot-toast';
import { COLUMN_TITLES, fieldsForColumn, type FieldColumn, type ImportDoRecord } from '@scs/shared';
import { StatusBadge } from './ui/Badge';
import { Spinner } from './ui/Spinner';
import { formatDateTimeDisplay } from '../lib/format';
import { api } from '../api/client';
import { downloadPdfBlob } from '../lib/pdf';
import { describeApiError } from '../lib/recordForm';

const COLUMNS: FieldColumn[] = [1, 2, 3];

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

export function RecordModal({ record, onClose }: { record: ImportDoRecord; onClose: () => void }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    const toastId = toast.loading('Generating PDF…');
    try {
      const { blob, filename } = await api.downloadRecordPdf(record.recordId);
      downloadPdfBlob(blob, filename);
      toast.dismiss(toastId);
      toast.success('PDF generated & downloaded');
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(describeApiError(err));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <div
        className="my-8 w-full max-w-5xl rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div>
            <h3 className="text-base font-semibold text-slate-800">
              {displayValue(record.consigneeName)} — {displayValue(record.vessel)}
            </h3>
            <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
              <span className="font-mono">{record.recordId}</span>
              <StatusBadge status={record.pdfStatus} />
              <span>Created {formatDateTimeDisplay(record.createdAt)}</span>
            </p>
          </div>
          <button className="btn-ghost" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2 lg:grid-cols-3">
          {COLUMNS.map((col) => (
            <div key={col}>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-700">
                {COLUMN_TITLES[col]}
              </h4>
              <dl className="space-y-1.5">
                {fieldsForColumn(col).map((field) => (
                  <div key={field.key} className="grid grid-cols-2 gap-2 text-sm">
                    <dt className="text-slate-500">{field.label}</dt>
                    <dd className="text-slate-800">
                      {displayValue((record as Record<string, unknown>)[field.key])}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button className="btn-secondary" onClick={handleDownload} disabled={downloading}>
            {downloading ? <Spinner /> : null} Download PDF
          </button>
          <button className="btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
