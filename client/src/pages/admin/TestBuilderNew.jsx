import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { apiFetch } from '../../lib/api.js';

export default function TestBuilder() {
  const { token } = useAuth();
  const [title, setTitle] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [perQuestionSeconds, setPerQuestionSeconds] = useState(30);
  const [marksCorrect, setMarksCorrect] = useState(4);
  const [status, setStatus] = useState('active');
  const [createdTestId, setCreatedTestId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState('');
  const [allTests, setAllTests] = useState([]);

  const loadTests = async () => {
    try {
      const res = await apiFetch('/api/admin/tests', { token });
      setAllTests(Array.isArray(res?.tests) ? res.tests : []);
    } catch {
      // ignore
    }
  };

  const emptyQuestion = () => ({
    questionText: '',
    imageUrl: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctOption: 'A',
    uploading: false,
    error: ''
  });

  useEffect(() => {
    // Initialize with default questions
    const initialQuestions = [];
    for (let i = 0; i < questionCount; i++) {
      initialQuestions.push(emptyQuestion());
    }
    setQuestions(initialQuestions);
  }, [questionCount]);

  useEffect(() => {
    if (!token) return;
    loadTests();
  }, [token]);

  const updateQuestion = (idx, updates) => {
    const next = [...questions];
    next[idx] = { ...next[idx], ...updates };
    setQuestions(next);
  };

  const uploadImage = async (idx, file) => {
    if (!file) return;
    updateQuestion(idx, { uploading: true, error: '' });
    
    const fd = new FormData();
    fd.append('file', file);
    
    try {
      const res = await apiFetch('/api/admin/upload/specimen-image', {
        token,
        method: 'POST',
        body: fd,
        headers: {},
      });
      updateQuestion(idx, { imageUrl: res.url || '', uploading: false });
    } catch (err) {
      updateQuestion(idx, { uploading: false, error: err?.message || 'Upload failed' });
    }
  };

  const isValid = () => {
    return Boolean(
      title.trim() &&
      questions.every((q, idx) => 
        q.questionText.trim() &&
        q.imageUrl.trim() &&
        q.optionA.trim() &&
        q.optionB.trim() &&
        q.optionC.trim() &&
        q.optionD.trim() &&
        ['A', 'B', 'C', 'D'].includes(q.correctOption)
      )
    );
  };

  const submit = async () => {
    setServerError('');
    setSuccess('');
    if (!isValid()) {
      setServerError('Please fill all required fields correctly.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        isActive: status === 'active',
        perQuestionSeconds: Number(perQuestionSeconds),
        marksCorrect: Number(marksCorrect),
        questionCount: Number(questionCount),
        questions: questions.map((q, idx) => ({
          questionText: q.questionText.trim(),
          imageUrl: q.imageUrl.trim(),
          optionA: q.optionA.trim(),
          optionB: q.optionB.trim(),
          optionC: q.optionC.trim(),
          optionD: q.optionD.trim(),
          correctOption: q.correctOption,
          questionOrder: idx + 1
        })),
      };
      const res = await apiFetch('/api/admin/tests/builder', {
        token,
        method: 'POST',
        body: payload,
      });
      const newId = res?.test?.id ?? null;
      setCreatedTestId(newId);
      setSuccess(`Test created (ID: ${res.test?.id}) with ${res.test?.questionCount} questions.`);
      loadTests();
      setTitle('');
      setQuestionCount(10);
      setQuestions([]);
    } catch (err) {
      setServerError(err?.message || 'Failed to create test');
    } finally {
      setSaving(false);
    }
  };

  const deleteCreatedTest = async () => {
    if (!createdTestId) return;
    if (!confirm('Delete this test?')) return;
    try {
      setServerError('');
      setSuccess('');
      await apiFetch(`/api/admin/tests/${createdTestId}`, { token, method: 'DELETE' });
      setSuccess('Test deleted');
      setCreatedTestId(null);
      loadTests();
    } catch (err) {
      setServerError(err?.message || 'Failed to delete test');
    }
  };

  const updateTestStatus = async (id, nextStatus) => {
    try {
      await apiFetch(`/api/admin/tests/${id}`, {
        token,
        method: 'PUT',
        body: { isActive: nextStatus === 'active' },
      });
      loadTests();
    } catch (err) {
      setServerError(err?.message || 'Failed to update test');
    }
  };

  const deleteTest = async (id) => {
    if (!confirm('Delete this test?')) return;
    try {
      await apiFetch(`/api/admin/tests/${id}`, { token, method: 'DELETE' });
      loadTests();
    } catch (err) {
      setServerError(err?.message || 'Failed to delete test');
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Create Test</h2>
        </div>
        <div className="card-body space-y-4">
          {serverError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{serverError}</div>
          ) : null}
          {success ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="label">Test Title</div>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter test title" />
            </div>
            <div>
              <div className="label">Number of Questions</div>
              <select className="input" value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))}>
                {Array.from({ length: 50 }, (_, i) => i + 1).map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="label">Time per Question (seconds)</div>
              <input className="input" type="number" value={perQuestionSeconds} onChange={(e) => setPerQuestionSeconds(Number(e.target.value))} min="10" max="300" />
            </div>
            <div>
              <div className="label">Marks per Correct Answer</div>
              <input className="input" type="number" value={marksCorrect} onChange={(e) => setMarksCorrect(Number(e.target.value))} min="1" max="10" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="label">Status</div>
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="flex items-end">
              {createdTestId ? (
                <button type="button" className="btn-ghost w-full" onClick={deleteCreatedTest}>
                  Delete Created Test
                </button>
              ) : (
                <div className="text-xs text-slate-500">Create a test to enable delete.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="text-base font-semibold">Questions</h3>
        </div>
        <div className="card-body">
          <div className="space-y-6">
            {questions.map((q, idx) => (
              <div key={idx} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Question {idx + 1}</h4>
                </div>

                <div>
                  <div className="label">Question Text</div>
                  <input 
                    className="input" 
                    value={q.questionText} 
                    onChange={(e) => updateQuestion(idx, { questionText: e.target.value })}
                    placeholder="e.g., Identify the specimen below"
                  />
                </div>

                <div>
                  <div className="label">Upload Image</div>
                  <input 
                    className="input" 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => uploadImage(idx, e.target.files?.[0])} 
                  />
                  {q.uploading ? <div className="mt-1 text-xs text-slate-500">Uploading…</div> : null}
                  {q.error ? <div className="mt-1 text-xs text-red-600">{q.error}</div> : null}
                  {q.imageUrl ? <img src={q.imageUrl} alt="" className="mt-2 h-40 w-auto rounded border object-contain" /> : null}
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <div className="label">Option A</div>
                    <input 
                      className="input" 
                      value={q.optionA} 
                      onChange={(e) => updateQuestion(idx, { optionA: e.target.value })}
                      placeholder="Option A"
                    />
                  </div>
                  <div>
                    <div className="label">Option B</div>
                    <input 
                      className="input" 
                      value={q.optionB} 
                      onChange={(e) => updateQuestion(idx, { optionB: e.target.value })}
                      placeholder="Option B"
                    />
                  </div>
                  <div>
                    <div className="label">Option C</div>
                    <input 
                      className="input" 
                      value={q.optionC} 
                      onChange={(e) => updateQuestion(idx, { optionC: e.target.value })}
                      placeholder="Option C"
                    />
                  </div>
                  <div>
                    <div className="label">Option D</div>
                    <input 
                      className="input" 
                      value={q.optionD} 
                      onChange={(e) => updateQuestion(idx, { optionD: e.target.value })}
                      placeholder="Option D"
                    />
                  </div>
                </div>

                <div>
                  <div className="label">Correct Option</div>
                  <select 
                    className="input" 
                    value={q.correctOption} 
                    onChange={(e) => updateQuestion(idx, { correctOption: e.target.value })}
                  >
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4">
            <button 
              className="btn-primary w-full" 
              onClick={submit}
              disabled={!isValid || saving}
            >
              {saving ? 'Creating Test...' : 'Create Test'}
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="text-base font-semibold">Manage Tests</h3>
        </div>
        <div className="card-body">
          {allTests.length === 0 ? (
            <div className="text-sm text-slate-600">No tests found.</div>
          ) : (
            <div className="space-y-2">
              {allTests.map((t) => (
                <div key={t.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-900">{t.title}</div>
                    <div className="text-xs text-slate-500">Questions: {t.questionCount} • {t.perQuestionSeconds}s • +{t.marksCorrect}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className="input"
                      value={t.isActive ? 'active' : 'inactive'}
                      onChange={(e) => updateTestStatus(t.id, e.target.value)}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                    <button type="button" className="btn-ghost text-xs" onClick={() => deleteTest(t.id)}>
                      Delete
                    </button>
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
