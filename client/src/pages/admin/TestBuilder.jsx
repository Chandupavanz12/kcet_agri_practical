import React, { useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { apiFetch } from '../../lib/api.js';

function emptyQuestion() {
  return { imageUrl: '', questionText: '', options: ['', '', '', ''], correct: 0, uploading: false, error: '' };
}

export default function TestBuilder() {
  const { token } = useAuth();
  const [title, setTitle] = useState('');
  const [perQuestionSeconds, setPerQuestionSeconds] = useState(30);
  const [marksCorrect, setMarksCorrect] = useState(4);
  const [isActive, setIsActive] = useState(true);
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState('');

  const valid = useMemo(() => {
    if (!title.trim()) return false;
    if (!Number.isFinite(Number(perQuestionSeconds)) || Number(perQuestionSeconds) <= 0) return false;
    if (!Number.isFinite(Number(marksCorrect)) || Number(marksCorrect) <= 0) return false;
    if (!questions.length) return false;
    return questions.every((q) => {
      if (!q.imageUrl.trim()) return false;
      if (!Array.isArray(q.options) || q.options.length !== 4) return false;
      if (q.options.some((o) => !o.trim())) return false;
      const c = Number(q.correct);
      if (!Number.isInteger(c) || c < 0 || c > 3) return false;
      return true;
    });
  }, [title, perQuestionSeconds, marksCorrect, questions]);

  const addQuestion = () => setQuestions((qs) => [...qs, emptyQuestion()]);
  const removeQuestion = (idx) => setQuestions((qs) => (qs.length === 1 ? qs : qs.filter((_, i) => i !== idx)));

  const updateQ = (idx, patch) => {
    setQuestions((qs) => qs.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };

  const uploadImage = async (idx, file) => {
    if (!file) return;
    updateQ(idx, { uploading: true, error: '' });
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiFetch('/api/admin/upload/specimen-image', {
        token,
        method: 'POST',
        body: fd,
        headers: {},
      });
      updateQ(idx, { imageUrl: res.url || '', uploading: false });
    } catch (err) {
      updateQ(idx, { uploading: false, error: err?.message || 'Upload failed' });
    }
  };

  const submit = async () => {
    setServerError('');
    setSuccess('');
    if (!valid) {
      setServerError('Please fix validation errors before submitting.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        isActive,
        perQuestionSeconds: Number(perQuestionSeconds),
        marksCorrect: Number(marksCorrect),
        questions: questions.map((q) => ({
          imageUrl: q.imageUrl.trim(),
          questionText: q.questionText.trim() || null,
          options: q.options.map((o) => o.trim()),
          correct: Number(q.correct),
        })),
      };
      const res = await apiFetch('/api/admin/tests/builder', {
        token,
        method: 'POST',
        body: payload,
      });
      setSuccess(`Test created (ID: ${res.test?.id}) with ${res.test?.questionCount} questions.`);
      setTitle('');
      setQuestions([emptyQuestion()]);
    } catch (err) {
      setServerError(err?.message || 'Failed to create test');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Add Test (Builder)</h2>
        </div>
        <div className="card-body space-y-4">
          {serverError ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{serverError}</div> : null}
          {success ? <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</div> : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="label">Test Title</div>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <div className="label">Active</div>
              <select className="input" value={isActive ? '1' : '0'} onChange={(e) => setIsActive(e.target.value === '1')}>
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </div>
            <div>
              <div className="label">Seconds per Question</div>
              <input className="input" type="number" value={perQuestionSeconds} onChange={(e) => setPerQuestionSeconds(e.target.value)} />
            </div>
            <div>
              <div className="label">Marks per Correct</div>
              <input className="input" type="number" value={marksCorrect} onChange={(e) => setMarksCorrect(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Questions ({questions.length})</div>
            <button className="btn-ghost" type="button" onClick={addQuestion}>Add Question</button>
          </div>

          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Question {idx + 1}</div>
                  <button className="btn-ghost text-red-600" type="button" onClick={() => removeQuestion(idx)}>
                    Remove
                  </button>
                </div>

                <div>
                  <div className="label">Upload Image</div>
                  <input className="input" type="file" accept="image/*" onChange={(e) => uploadImage(idx, e.target.files?.[0])} />
                  {q.uploading ? <div className="mt-1 text-xs text-slate-500">Uploading…</div> : null}
                  {q.error ? <div className="mt-1 text-xs text-red-600">{q.error}</div> : null}
                  {q.imageUrl ? <img src={q.imageUrl} alt="" className="mt-2 h-40 w-auto rounded border object-contain" /> : null}
                </div>

                <div>
                  <div className="label">Question Text</div>
                  <input className="input" value={q.questionText} onChange={(e) => updateQ(idx, { questionText: e.target.value })} />
                </div>

                <div>
                  <div className="label">Options</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {q.options.map((opt, optIdx) => (
                      <input
                        key={optIdx}
                        className="input"
                        placeholder={`Option ${optIdx + 1}`}
                        value={opt}
                        onChange={(e) => {
                          const next = [...q.options];
                          next[optIdx] = e.target.value;
                          updateQ(idx, { options: next });
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <div className="label">Correct Option</div>
                  <select className="input" value={String(q.correct)} onChange={(e) => updateQ(idx, { correct: Number(e.target.value) })}>
                    <option value="0">Option 1 (A)</option>
                    <option value="1">Option 2 (B)</option>
                    <option value="2">Option 3 (C)</option>
                    <option value="3">Option 4 (D)</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          <button className="btn-primary" type="button" disabled={!valid || saving} onClick={submit}>
            {saving ? 'Creating…' : 'Create Test'}
          </button>
        </div>
      </div>
    </div>
  );
}
