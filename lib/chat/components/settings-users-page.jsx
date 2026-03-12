'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { UserIcon, PlusIcon, TrashIcon } from './icons.js';
import { getUsers, addUser, editUser, removeUser, resetPassword } from '../../auth/actions.js';

function formatDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function Dialog({ open, onClose, title, children }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div ref={ref} className="relative z-50 w-full max-w-sm mx-4 rounded-lg border border-border bg-background p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        {children}
      </div>
    </div>,
    document.body
  );
}

function EditUserDialog({ open, user, onSave, onCancel }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('admin');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && user) {
      setEmail(user.email);
      setRole(user.role || 'admin');
      setError(null);
    }
  }, [open, user]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const result = await editUser(user.id, { email, role });
    setSaving(false);
    if (result.error) {
      setError(result.error);
    } else {
      onSave();
    }
  };

  return (
    <Dialog open={open} onClose={onCancel} title="Edit user">
      {error && <p className="text-sm text-destructive mb-3">{error}</p>}
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium mb-1 block">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
          />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={user?.isSelf}
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground disabled:opacity-50"
          >
            <option value="admin">Admin</option>
          </select>
          {user?.isSelf && <p className="text-xs text-muted-foreground mt-1">Cannot change your own role.</p>}
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-md px-3 py-1.5 text-sm font-medium border border-border bg-background hover:bg-muted"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md px-3 py-1.5 text-sm font-medium bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </Dialog>
  );
}

function ResetPasswordDialog({ open, user, onSave, onCancel }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setPassword('');
      setError(null);
    }
  }, [open]);

  const handleSave = async () => {
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setSaving(true);
    setError(null);
    const result = await resetPassword(user.id, password);
    setSaving(false);
    if (result.error) {
      setError(result.error);
    } else {
      onSave();
    }
  };

  return (
    <Dialog open={open} onClose={onCancel} title="Reset password">
      <p className="text-sm text-muted-foreground mb-3">Set a new password for {user?.email}.</p>
      {error && <p className="text-sm text-destructive mb-3">{error}</p>}
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="New password (min 8 characters)"
        autoFocus
        className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
      />
      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-md px-3 py-1.5 text-sm font-medium border border-border bg-background hover:bg-muted"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || password.length < 8}
          className="rounded-md px-3 py-1.5 text-sm font-medium bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </Dialog>
  );
}

export function SettingsUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [resettingUser, setResettingUser] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [error, setError] = useState(null);

  // Add form state
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('admin');
  const [creating, setCreating] = useState(false);

  const loadUsers = async () => {
    try {
      const result = await getUsers();
      setUsers(Array.isArray(result) ? result : []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreate = async () => {
    if (creating || !newEmail.trim() || !newPassword) return;
    setCreating(true);
    setError(null);
    const result = await addUser(newEmail.trim(), newPassword, newRole);
    setCreating(false);
    if (result.error) {
      setError(result.error);
    } else {
      setNewEmail('');
      setNewPassword('');
      setNewRole('admin');
      setShowAddForm(false);
      await loadUsers();
    }
  };

  const handleDelete = async (id) => {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete(null), 3000);
      return;
    }
    setError(null);
    const result = await removeUser(id);
    if (result.error) {
      setError(result.error);
    } else {
      setUsers((prev) => prev.filter((u) => u.id !== id));
    }
    setConfirmDelete(null);
  };

  const handleEditSave = async () => {
    setEditingUser(null);
    await loadUsers();
  };

  const handleResetSave = async () => {
    setResettingUser(null);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-16 animate-pulse rounded-md bg-border/50" />
        <div className="h-16 animate-pulse rounded-md bg-border/50" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-medium">Users</h2>
          <p className="text-sm text-muted-foreground">Manage admin accounts that can access this instance.</p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium bg-foreground text-background hover:bg-foreground/90 shrink-0"
          >
            <PlusIcon size={14} />
            Add user
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive mb-4">{error}</p>
      )}

      {/* Add user form */}
      {showAddForm && (
        <div className="rounded-lg border border-dashed bg-card p-4 mb-4">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Email</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="user@example.com"
                autoFocus
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
              >
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleCreate}
              disabled={!newEmail.trim() || !newPassword || newPassword.length < 8 || creating}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button
              onClick={() => { setShowAddForm(false); setNewEmail(''); setNewPassword(''); setError(null); }}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium border border-border text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* User list */}
      {users.length > 0 ? (
        <div className="rounded-lg border bg-card">
          <div className="divide-y divide-border">
            {users.map((u) => (
              <div key={u.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-4">
                <div className="flex items-center gap-2 min-w-0">
                  <UserIcon size={14} className="text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{u.email}</div>
                    <div className="text-xs text-muted-foreground">
                      <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium mr-1.5">{u.role || 'admin'}</span>
                      Created {formatDate(u.createdAt)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                  <button
                    onClick={() => setEditingUser(u)}
                    className="rounded-md px-2.5 py-1.5 text-xs font-medium border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setResettingUser(u)}
                    className="rounded-md px-2.5 py-1.5 text-xs font-medium border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    Reset password
                  </button>
                  <button
                    onClick={() => handleDelete(u.id)}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium border shrink-0 ${
                      confirmDelete === u.id
                        ? 'border-destructive text-destructive hover:bg-destructive/10'
                        : 'border-border text-muted-foreground hover:text-destructive hover:border-destructive/50'
                    }`}
                  >
                    <TrashIcon size={12} />
                    {confirmDelete === u.id ? 'Confirm' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : !showAddForm && (
        <div className="rounded-lg border border-dashed bg-card p-8 flex flex-col items-center text-center">
          <p className="text-sm text-muted-foreground mb-3">No users configured</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium bg-foreground text-background hover:bg-foreground/90"
          >
            <PlusIcon size={14} />
            Add user
          </button>
        </div>
      )}

      {/* Edit dialog */}
      <EditUserDialog
        open={!!editingUser}
        user={editingUser}
        onSave={handleEditSave}
        onCancel={() => setEditingUser(null)}
      />

      {/* Reset password dialog */}
      <ResetPasswordDialog
        open={!!resettingUser}
        user={resettingUser}
        onSave={handleResetSave}
        onCancel={() => setResettingUser(null)}
      />
    </div>
  );
}
