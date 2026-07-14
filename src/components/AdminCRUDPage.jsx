import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../api/client.js';

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

  const handleSubmit = async () => {
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

  const handleDelete = (id) => {
    Alert.alert('Delete', 'Delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
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
        },
      },
    ]);
  };

  const updateForm = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field.name]: value };
      const maybe = onFormChange?.(next, prev);
      return maybe && typeof maybe === 'object' ? maybe : next;
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>Create, update and manage items safely.</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>⚙️ Admin</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{editing ? 'Edit item' : disableCreate ? 'Edit item' : 'Create new'}</Text>
        </View>
        <View style={styles.cardBody}>
          {!!message && (
            <View style={styles.messageBox}>
              <Text style={styles.messageText}>{message}</Text>
            </View>
          )}

          {disableCreate && !editing ? (
            <Text style={styles.infoText}>Select an item below and click Edit.</Text>
          ) : (
            <View style={styles.formContainer}>
              {fields.map((field) => (
                <View key={field.name} style={styles.formGroup}>
                  <Text style={styles.label}>{field.label}</Text>
                  {field.type === 'textarea' ? (
                    <TextInput
                      style={[styles.input, styles.textarea]}
                      placeholder={field.placeholder}
                      value={String(form[field.name] || '')}
                      onChangeText={(val) => updateForm(field, val)}
                      editable={!field.disabled}
                      multiline
                      numberOfLines={3}
                    />
                  ) : field.type === 'select' ? (
                    <View style={styles.selectFallback}>
                      <TextInput
                        style={styles.input}
                        placeholder={field.placeholder || 'Enter value...'}
                        value={String(form[field.name] || '')}
                        onChangeText={(val) => updateForm(field, val)}
                        editable={!field.disabled}
                      />
                      <Text style={styles.helperText}>Expected: {field.options.map(o => o.value).join(', ')}</Text>
                    </View>
                  ) : field.type === 'file' ? (
                    <View style={styles.fileFallback}>
                      <Text style={styles.helperText}>File upload via app not fully supported yet in this fallback UI. Use web or provide Base64/URL.</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="File data (Base64/URL)"
                        value={String(form[field.name] || '')}
                        onChangeText={(val) => updateForm(field, val)}
                        editable={!field.disabled}
                      />
                    </View>
                  ) : (
                    <TextInput
                      style={styles.input}
                      placeholder={field.placeholder}
                      value={String(form[field.name] || '')}
                      onChangeText={(val) => updateForm(field, val)}
                      editable={!field.disabled}
                      secureTextEntry={field.type === 'password'}
                      keyboardType={field.type === 'number' ? 'numeric' : 'default'}
                    />
                  )}
                </View>
              ))}

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.btnPrimary} onPress={handleSubmit} disabled={loading}>
                  <Text style={styles.btnPrimaryText}>{loading ? 'Saving...' : editing ? 'Update' : 'Create'}</Text>
                </TouchableOpacity>

                {editing && (
                  <TouchableOpacity
                    style={styles.btnGhost}
                    onPress={() => {
                      setEditing(null);
                      setForm(() => {
                        const next = initialForm;
                        const maybe = onFormChange?.(next);
                        return maybe && typeof maybe === 'object' ? maybe : next;
                      });
                      onCancelEdit?.();
                    }}
                  >
                    <Text style={styles.btnGhostText}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Items</Text>
        </View>
        <View style={styles.cardBody}>
          {items.length === 0 ? (
            <Text style={styles.infoText}>No items yet.</Text>
          ) : (
            <View style={styles.itemsList}>
              {items.map((item) => (
                <View key={item.id} style={styles.itemCard}>
                  <View style={styles.itemHeaderLine} />
                  <View style={styles.itemCardBody}>
                    <View style={styles.itemRow}>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemTitle}>{item.title || item.name || item.id}</Text>
                        {item.subject && <Text style={styles.itemSubject}>{item.subject}</Text>}
                        {item.status && (
                          <View style={styles.statusBadge}>
                            <Text style={styles.statusBadgeText}>{item.status}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.itemActions}>
                        {renderItemActions ? renderItemActions(item) : null}
                        <TouchableOpacity style={styles.actionBtn} onPress={() => handleEdit(item)}>
                          <Text style={styles.actionBtnText}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item.id)}>
                          <Text style={styles.actionBtnTextRed}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 24,
  },
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    padding: 24,
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
    marginTop: 4,
  },
  badge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  cardBody: {
    padding: 16,
  },
  messageBox: {
    backgroundColor: '#f0fdfa',
    borderColor: '#ccfbf1',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  messageText: {
    color: '#0f766e',
    fontSize: 14,
  },
  infoText: {
    fontSize: 14,
    color: '#475569',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  formContainer: {
    gap: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  textarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  selectFallback: {},
  fileFallback: {},
  helperText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  btnPrimary: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnPrimaryText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
  btnGhost: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  btnGhostText: {
    color: '#334155',
    fontWeight: '500',
    fontSize: 14,
  },
  itemsList: {
    gap: 12,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  itemHeaderLine: {
    height: 4,
    backgroundColor: '#3b82f6',
  },
  itemCardBody: {
    padding: 16,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemInfo: {
    flex: 1,
    marginRight: 16,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  itemSubject: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
  },
  statusBadge: {
    marginTop: 8,
    backgroundColor: '#dcfce7',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#166534',
    textTransform: 'uppercase',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    padding: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#334155',
  },
  actionBtnTextRed: {
    fontSize: 12,
    fontWeight: '500',
    color: '#dc2626',
  },
});
