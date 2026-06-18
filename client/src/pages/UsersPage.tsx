import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { USER_ROLES, type SafeUser, type UserRole } from '@scs/shared';
import { usersApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/ui/Spinner';
import { formatDateTimeDisplay } from '../lib/format';
import { describeApiError } from '../lib/recordForm';

export function UsersPage() {
  const queryClient = useQueryClient();
  const { user: me } = useAuth();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users'] });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
  });
  const users = data?.users ?? [];

  // ── Add user form ──
  const [form, setForm] = useState<{ email: string; name: string; role: UserRole; password: string }>({
    email: '',
    name: '',
    role: 'user',
    password: '',
  });

  const createMut = useMutation({
    mutationFn: () => usersApi.create(form),
    onSuccess: () => {
      toast.success('User added');
      setForm({ email: '', name: '', role: 'user', password: '' });
      invalidate();
    },
    onError: (e) => toast.error(describeApiError(e)),
  });

  const updateMut = useMutation({
    mutationFn: (args: { id: string; patch: { role?: UserRole; active?: boolean } }) =>
      usersApi.update(args.id, args.patch),
    onSuccess: () => {
      toast.success('User updated');
      invalidate();
    },
    onError: (e) => toast.error(describeApiError(e)),
  });

  const resetMut = useMutation({
    mutationFn: (args: { id: string; password: string }) => usersApi.resetPassword(args.id, args.password),
    onSuccess: () => toast.success('Password reset'),
    onError: (e) => toast.error(describeApiError(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => {
      toast.success('User deleted');
      invalidate();
    },
    onError: (e) => toast.error(describeApiError(e)),
  });

  const handleResetPassword = (u: SafeUser) => {
    const pw = window.prompt(`Set a new password for ${u.email} (min 6 characters):`);
    if (pw === null) return;
    if (pw.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    resetMut.mutate({ id: u.userId, password: pw });
  };

  const handleDelete = (u: SafeUser) => {
    if (window.confirm(`Delete user ${u.email}? This cannot be undone.`)) deleteMut.mutate(u.userId);
  };

  const onAddSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.email || form.password.length < 6) {
      toast.error('Email and a password of at least 6 characters are required.');
      return;
    }
    createMut.mutate();
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-800">User Management</h2>
        <p className="text-sm text-slate-500">Add users and set their role. Admins can manage users and use the system; users can only use the system.</p>
      </div>

      {/* Add user */}
      <form onSubmit={onAddSubmit} className="card mb-5 grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <label className="field-label">Email</label>
          <input
            type="email"
            required
            className="field-input"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="user@fitsexpress.io"
          />
        </div>
        <div>
          <label className="field-label">Name</label>
          <input
            className="field-input"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Full name"
          />
        </div>
        <div>
          <label className="field-label">Role</label>
          <select
            className="field-input"
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
          >
            {USER_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Temp password</label>
          <input
            type="text"
            className="field-input"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="min 6 chars"
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-5">
          <button type="submit" className="btn-primary" disabled={createMut.isPending}>
            {createMut.isPending ? <Spinner /> : null} Add user
          </button>
        </div>
      </form>

      {/* Users table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-slate-500">
            <Spinner /> Loading users…
          </div>
        ) : isError ? (
          <div className="p-12 text-center text-red-600">{describeApiError(error)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Last login</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u.userId === me?.userId;
                  return (
                    <tr key={u.userId} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {u.email}
                        {isSelf && <span className="ml-1 text-xs text-slate-400">(you)</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{u.name || '—'}</td>
                      <td className="px-4 py-3">
                        <select
                          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm disabled:opacity-50"
                          value={u.role}
                          disabled={isSelf || updateMut.isPending}
                          onChange={(e) => updateMut.mutate({ id: u.userId, patch: { role: e.target.value as UserRole } })}
                        >
                          {USER_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                            u.active
                              ? 'bg-green-100 text-green-700 ring-green-600/20'
                              : 'bg-slate-100 text-slate-500 ring-slate-500/20'
                          }`}
                        >
                          {u.active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                        {u.lastLoginAt ? formatDateTimeDisplay(u.lastLoginAt) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            className="text-xs font-medium text-slate-600 hover:text-brand-700 disabled:opacity-40"
                            disabled={isSelf || updateMut.isPending}
                            onClick={() => updateMut.mutate({ id: u.userId, patch: { active: !u.active } })}
                          >
                            {u.active ? 'Disable' : 'Enable'}
                          </button>
                          <span className="text-slate-300">·</span>
                          <button
                            className="text-xs font-medium text-slate-600 hover:text-brand-700"
                            onClick={() => handleResetPassword(u)}
                          >
                            Reset password
                          </button>
                          <span className="text-slate-300">·</span>
                          <button
                            className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-40"
                            disabled={isSelf}
                            onClick={() => handleDelete(u)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
