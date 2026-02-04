import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../lib/api.js';

export default function AdminCRUDPage({
  title,
  apiEndpoint,
  endpointPath = null,
  responseKey = null,
  updateEndpointPath = null,
  deleteEndpointPath = null,
  fields,
  initialForm = {},
  disableCreate = false,
  fileUploadField = null,
  listTransform = (r) => r,
  formTransform = (data) => data,
  customCreateHandler = null,
  onEdit = null,
  renderItemActions = null,
  onFormChange = null,
  onAfterSubmit = null,
  onCancelEdit = null,
}) {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const epPath = endpointPath || apiEndpoint;
  const resKey = responseKey || apiEndpoint;
  const updPath = updateEndpointPath || epPath;
  const delPath = deleteEndpointPath || epPath;

  const fetchItems = async () => {
    try {
      const res = await apiFetch(`/api/admin/${epPath}`, { token });
      const raw = Array.isArray(res?.[resKey]) ? res[resKey] : (Array.isArray(res) ? res : []);
      setItems(raw.map(listTransform));
    } catch (err) {
      setMessage(err?.message || 'Failed to load');
    }
  };

  useEffect(() => {
    fetchItems();
  }, [epPath]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const payload = formTransform(form);
      if (editing) {
        await apiFetch(`/api/admin/${updPath}/${editing.id}`, {
          token,
          method: 'PUT',
          body: payload,
        });
        setMessage('Updated');
      } else {
        if (customCreateHandler) {
          await customCreateHandler(payload);
        } else {
          await apiFetch(`/api/admin/${epPath}`, {
            token,
            method: 'POST',
            body: payload,
          });
        }
        setMessage('Created');
      }
      setForm(initialForm);
      setEditing(null);
      fetchItems();
      onAfterSubmit?.();
    } catch (err) {
      setMessage(err?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditing(item);
    setForm(() => {
      const next = item;
      const maybe = onFormChange?.(next);
      return maybe && typeof maybe === 'object' ? maybe : next;
    });
    onEdit?.(item);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this item?')) return;
    try {
      await apiFetch(`/api/admin/${delPath}/${id}`, {
        token,
        method: 'DELETE',
      });
      setMessage('Deleted');
      fetchItems();
    } catch (err) {
      setMessage(err?.message || 'Failed');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev) => {
        const next = { ...prev, [fileUploadField]: reader.result };
        const maybe = onFormChange?.(next, prev);
        return maybe && typeof maybe === 'object' ? maybe : next;
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div className="card overflow-hidden">
        <div className="card-body bg-gradient-to-r from-primary-50 via-white to-secondary-50">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold">{title}</h2>
              <div className="mt-1 text-sm text-slate-700">Create, update and manage items safely.</div>
            </div>
            <span className="badge">⚙️ Admin</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="font-display text-base font-semibold">{editing ? 'Edit item' : disableCreate ? 'Edit item' : 'Create new'}</h3>
        </div>
        <div className="card-body">
          {message && (
            <div className="rounded-2xl border border-slate-200/70 bg-secondary-50 p-3 text-sm text-slate-800 mb-4">
              {message}
            </div>
          )}
          {disableCreate && !editing ? (
            <div className="rounded-2xl border border-slate-200/70 bg-white p-4 text-sm text-slate-700">
              Select an item below and click Edit.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map((field) => (
              <div
                key={field.name}
                className={field.type === 'textarea' || field.type === 'file' ? 'sm:col-span-2' : ''}
              >
                <div className="label">{field.label}</div>
                {field.type === 'textarea' ? (
                  <textarea
                    className="input"
                    disabled={Boolean(field.disabled)}
                    placeholder={field.placeholder}
                    value={form[field.name] || ''}
                    onChange={(e) =>
                      setForm((prev) => {
                        const next = { ...prev, [field.name]: e.target.value };
                        const maybe = onFormChange?.(next, prev);
                        return maybe && typeof maybe === 'object' ? maybe : next;
                      })
                    }
                    rows={3}
                  />
                ) : field.type === 'file' ? (
                  <input
                    type="file"
                    className="input"
                    disabled={Boolean(field.disabled)}
                    onChange={handleFileChange}
                    accept={field.accept}
                  />
                ) : field.type === 'select' ? (
                  <select
                    className="input"
                    disabled={Boolean(field.disabled)}
                    value={form[field.name] || ''}
                    onChange={(e) =>
                      setForm((prev) => {
                        const next = { ...prev, [field.name]: e.target.value };
                        const maybe = onFormChange?.(next, prev);
                        return maybe && typeof maybe === 'object' ? maybe : next;
                      })
                    }
                  >
                    {field.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type || 'text'}
                    className="input"
                    disabled={Boolean(field.disabled)}
                    placeholder={field.placeholder}
                    value={form[field.name] || ''}
                    onChange={(e) =>
                      setForm((prev) => {
                        const next = { ...prev, [field.name]: e.target.value };
                        const maybe = onFormChange?.(next, prev);
                        return maybe && typeof maybe === 'object' ? maybe : next;
                      })
                    }
                  />
                )}
              </div>
            ))}
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setForm(() => {
                      const next = initialForm;
                      const maybe = onFormChange?.(next);
                      return maybe && typeof maybe === 'object' ? maybe : next;
                    });
                    onCancelEdit?.();
                  }}
                  className="btn-ghost"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="font-display text-base font-semibold">Items</h3>
        </div>
        <div className="card-body">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-slate-200/70 bg-white p-4 text-sm text-slate-700">
              No items yet.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="card overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-primary-500 to-secondary-500" />
                  <div className="card-body">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-slate-900">{item.title || item.name || item.id}</div>
                        {item.subject && <div className="mt-1 text-xs text-slate-600">{item.subject}</div>}
                        {item.status && (
                          <div className="mt-2">
                            <span className={`badge ${item.status === 'active' ? 'badge-success' : ''}`}>{item.status}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {renderItemActions ? renderItemActions(item) : null}
                        <button onClick={() => handleEdit(item)} className="btn-ghost text-xs">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="btn-ghost text-xs text-red-600">
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
