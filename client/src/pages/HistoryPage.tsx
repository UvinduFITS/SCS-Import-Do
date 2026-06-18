import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import toast from 'react-hot-toast';
import { PDF_STATUS_VALUES, type ImportDoRecord } from '@scs/shared';
import { api } from '../api/client';
import { StatusBadge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import { RecordModal } from '../components/RecordModal';
import { formatDateTimeDisplay } from '../lib/format';
import { describeApiError } from '../lib/recordForm';
import { exportCsv, exportExcel } from '../lib/export';
import { downloadPdfBlob } from '../lib/pdf';

const columnHelper = createColumnHelper<ImportDoRecord>();

export function HistoryPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['records'],
    queryFn: () => api.listRecords(),
  });
  const records = data?.records ?? [];

  // ── Filters ──
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);
  const [viewing, setViewing] = useState<ImportDoRecord | null>(null);

  const createdByOptions = useMemo(
    () => Array.from(new Set(records.map((r) => r.createdByEmail).filter(Boolean))).sort(),
    [records],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      if (q) {
        const haystack = [r.recordId, r.consigneeName, r.vessel, r.agentDoNo, r.blNo]
          .map((v) => String(v ?? '').toLowerCase())
          .join(' ');
        if (!haystack.includes(q)) return false;
      }
      if (statusFilter && r.pdfStatus !== statusFilter) return false;
      if (createdByFilter && r.createdByEmail !== createdByFilter) return false;
      if (dateFrom && (r.createdAt || '').slice(0, 10) < dateFrom) return false;
      if (dateTo && (r.createdAt || '').slice(0, 10) > dateTo) return false;
      return true;
    });
  }, [records, search, statusFilter, createdByFilter, dateFrom, dateTo]);

  // ── Mutations ──
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['records'] });

  const duplicateMut = useMutation({
    mutationFn: (id: string) => api.duplicate(id),
    onSuccess: () => {
      toast.success('Record duplicated');
      invalidate();
    },
    onError: (e) => toast.error(describeApiError(e)),
  });

  const downloadMut = useMutation({
    mutationFn: async (id: string) => {
      const { blob, filename } = await api.downloadRecordPdf(id);
      downloadPdfBlob(blob, filename);
    },
    onSuccess: () => {
      toast.success('PDF generated & downloaded');
      invalidate();
    },
    onError: (e) => toast.error(describeApiError(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.deleteRecord(id),
    onSuccess: () => {
      toast.success('Record deleted');
      invalidate();
    },
    onError: (e) => toast.error(describeApiError(e)),
  });

  const handleDelete = (record: ImportDoRecord) => {
    if (window.confirm(`Delete record for "${record.consigneeName || record.recordId}"? This cannot be undone.`)) {
      deleteMut.mutate(record.recordId);
    }
  };

  // ── Table columns ──
  const columns = useMemo(
    () => [
      columnHelper.accessor('recordId', {
        header: 'Record ID',
        cell: (info) => <span className="font-mono text-xs text-slate-500">{info.getValue().slice(0, 8)}</span>,
      }),
      columnHelper.accessor('consigneeName', {
        header: 'Consignee',
        cell: (info) => <span className="font-medium text-slate-800">{String(info.getValue() || '—')}</span>,
      }),
      columnHelper.accessor('vessel', { header: 'Vessel', cell: (info) => String(info.getValue() || '—') }),
      columnHelper.accessor('agentDoNo', { header: 'Agent DO No', cell: (info) => String(info.getValue() || '—') }),
      columnHelper.accessor('blNo', { header: 'B/L No', cell: (info) => String(info.getValue() || '—') }),
      columnHelper.accessor('createdAt', {
        header: 'Created',
        cell: (info) => <span className="whitespace-nowrap text-sm text-slate-600">{formatDateTimeDisplay(info.getValue())}</span>,
      }),
      columnHelper.accessor('pdfStatus', {
        header: 'PDF',
        cell: (info) => <StatusBadge status={info.getValue()} />,
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const record = row.original;
          const busy =
            (downloadMut.isPending && downloadMut.variables === record.recordId) ||
            (duplicateMut.isPending && duplicateMut.variables === record.recordId) ||
            (deleteMut.isPending && deleteMut.variables === record.recordId);
          return (
            <div className="flex flex-wrap items-center gap-1.5">
              <button className="text-xs font-medium text-slate-600 hover:text-brand-700" onClick={() => setViewing(record)}>
                View
              </button>
              <span className="text-slate-300">·</span>
              <button
                className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                onClick={() => navigate(`/import-do?load=${encodeURIComponent(record.recordId)}`)}
              >
                Load Into Form
              </button>
              <span className="text-slate-300">·</span>
              <button className="text-xs font-medium text-slate-600 hover:text-brand-700" onClick={() => duplicateMut.mutate(record.recordId)}>
                Duplicate
              </button>
              <span className="text-slate-300">·</span>
              <button className="text-xs font-semibold text-green-700 hover:text-green-800" onClick={() => downloadMut.mutate(record.recordId)}>
                Download PDF
              </button>
              <span className="text-slate-300">·</span>
              <button className="text-xs font-medium text-red-600 hover:text-red-700" onClick={() => handleDelete(record)}>
                Delete
              </button>
              {busy && <Spinner className="h-3.5 w-3.5 text-slate-400" />}
            </div>
          );
        },
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate, downloadMut.isPending, duplicateMut.isPending, deleteMut.isPending],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  });

  const recent = records.slice(0, 5);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Submission History</h2>
          <p className="text-sm text-slate-500">
            Reuse a previous order: <strong>Load Into Form</strong> → edit a few fields → <strong>Create PDF</strong>.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-secondary"
            onClick={() => exportCsv(filtered).catch((e) => toast.error(describeApiError(e)))}
            disabled={!filtered.length}
          >
            Export CSV
          </button>
          <button
            className="btn-secondary"
            onClick={() => exportExcel(filtered).catch((e) => toast.error(describeApiError(e)))}
            disabled={!filtered.length}
          >
            Export Excel
          </button>
          <button className="btn-primary" onClick={() => navigate('/import-do')}>
            New Form
          </button>
        </div>
      </div>

      {/* Recent records widget */}
      {recent.length > 0 && (
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {recent.map((r) => (
            <div key={r.recordId} className="card flex flex-col justify-between p-3">
              <div>
                <p className="truncate text-sm font-medium text-slate-800" title={String(r.consigneeName || '')}>
                  {String(r.consigneeName || '—')}
                </p>
                <p className="truncate text-xs text-slate-500" title={String(r.vessel || '')}>
                  {String(r.vessel || '—')}
                </p>
                <div className="mt-1">
                  <StatusBadge status={r.pdfStatus} />
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                  onClick={() => navigate(`/import-do?load=${encodeURIComponent(r.recordId)}`)}
                >
                  Load
                </button>
                <button className="text-xs font-semibold text-green-700 hover:text-green-800" onClick={() => downloadMut.mutate(r.recordId)}>
                  Download PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search + filters */}
      <div className="card mb-4 grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <label className="field-label">Search (Consignee, Vessel, Agent DO, B/L, Record ID)</label>
          <input
            className="field-input"
            placeholder="Type to search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <label className="field-label">PDF Status</label>
          <select className="field-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            {PDF_STATUS_VALUES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Created By</label>
          <select className="field-input" value={createdByFilter} onChange={(e) => setCreatedByFilter(e.target.value)}>
            <option value="">All</option>
            {createdByOptions.map((email) => (
              <option key={email} value={email}>
                {email}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="field-label">From</label>
            <input type="date" className="field-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="field-label">To</label>
            <input type="date" className="field-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-slate-500">
            <Spinner /> Loading records…
          </div>
        ) : isError ? (
          <div className="p-12 text-center text-red-600">{describeApiError(error)}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No records found. {records.length > 0 ? 'Try adjusting filters.' : 'Create your first Import DO.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((header) => (
                      <th
                        key={header.id}
                        className="cursor-pointer select-none whitespace-nowrap px-4 py-3 font-semibold"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{ asc: ' ▲', desc: ' ▼' }[header.column.getIsSorted() as string] ?? ''}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
            <span>
              {filtered.length} record{filtered.length === 1 ? '' : 's'} · page{' '}
              {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
            </span>
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                Prev
              </button>
              <button className="btn-secondary" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {viewing && <RecordModal record={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
