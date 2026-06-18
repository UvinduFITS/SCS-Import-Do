import { PDF_STATUS } from '@scs/shared';

const STYLES: Record<string, string> = {
  [PDF_STATUS.SUCCESS]: 'bg-green-100 text-green-700 ring-green-600/20',
  [PDF_STATUS.PROCESSING]: 'bg-amber-100 text-amber-700 ring-amber-600/20',
  [PDF_STATUS.PENDING]: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  [PDF_STATUS.FAILED]: 'bg-red-100 text-red-700 ring-red-600/20',
};

export function StatusBadge({ status }: { status: string }) {
  const cls = STYLES[status] ?? STYLES[PDF_STATUS.PENDING];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}>
      {status || PDF_STATUS.PENDING}
    </span>
  );
}
