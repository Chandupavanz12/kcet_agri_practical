import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../lib/api.js';

export default function MockTest() {
  const { testId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [startTime] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const intervalRef = useRef(null);
  const submittedRef = useRef(false);

  const current = questions[currentIndex];

  // Load test and questions
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setLoadError('');

        let resolvedTestId = testId;
        if (!resolvedTestId) {
          const list = await apiFetch('/api/student/tests', { token });
          const first = list.tests?.[0];
          if (!first?.id) throw new Error('No active tests available');
          resolvedTestId = String(first.id);
          navigate(`/student/mock-test/${resolvedTestId}`, { replace: true });
          return;
        }

        const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('Test load timeout')), 12000));
        const res = await Promise.race([
          apiFetch(`/api/student/tests/${resolvedTestId}/start`, { token }),
          timeout,
        ]);
        if (!alive) return;
        setTest(res.test);
        setQuestions(Array.isArray(res.questions) ? res.questions : []);
        setSecondsLeft((res.test?.questionCount || 0) * (res.test?.perQuestionSeconds || 0));
        if (!res.test || !Array.isArray(res.questions) || res.questions.length === 0) {
          throw new Error('No questions returned for this test');
        }
      } catch (err) {
        if (!alive) return;
        setLoadError(err?.message || 'Failed to start test');
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [testId, token, navigate]);

  // Timer
  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) {
      if (secondsLeft === 0) handleSubmit();
      return;
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft((v) => {
        if (v <= 1) {
          clearInterval(intervalRef.current);
          handleSubmit();
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [secondsLeft]);

  const handleSelect = useCallback((optionIndex) => {
    setResponses((r) => ({ ...r, [current.id]: optionIndex }));
    // Auto-next after selection (optional)
    // setTimeout(() => handleNext(), 300);
  }, [current]);

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (submitting || submittedRef.current) return;
    setSubmitting(true);
    submittedRef.current = true;
    try {
      const timeTakenSec = Math.round((Date.now() - startTime) / 1000);
      const mappedResponses = questions.map((q) => ({
        specimenId: q.id,
        selected: responses[q.id] ?? null,
      }));
      const resolvedTestId = testId || test?.id;
      await apiFetch(`/api/student/tests/${resolvedTestId}/submit`, {
        token,
        method: 'POST',
        body: { responses: mappedResponses, timeTakenSec },
      });
      navigate(`/student/mock-test/result?testId=${resolvedTestId}`, { replace: true });
    } catch (err) {
      alert(err?.message || 'Failed to submit test');
      setSubmitting(false);
      submittedRef.current = false;
    }
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading test...</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="card max-w-lg w-full">
          <div className="card-body space-y-3">
            <div className="text-lg font-semibold">Unable to load test</div>
            <div className="text-sm text-slate-600">{loadError}</div>
            <div className="flex gap-2">
              <button className="btn-primary" onClick={() => window.location.reload()}>
                Retry
              </button>
              <button className="btn-ghost" onClick={() => navigate('/student/dashboard')}>
                Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!test || !current) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Test not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <div className="text-sm font-medium">{test.title}</div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-600">
              Question {currentIndex + 1} of {questions.length}
            </div>
            <div className={`text-sm font-semibold ${secondsLeft <= 30 ? 'text-red-600' : 'text-slate-700'}`}>
              {formatTime(secondsLeft)}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {/* OMR-style grid */}
        <div className="card">
          <div className="card-body">
            {/* Image */}
            <div className="mb-6 flex justify-center">
              <img
                src={current.imageUrl}
                alt={`Specimen ${currentIndex + 1}`}
                className="h-64 w-auto rounded-lg border object-contain"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/400x300?text=Image+Not+Available';
                  e.target.onerror = null;
                }}
              />
            </div>

            {/* Options */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {current.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelect(idx)}
                  disabled={submitting}
                  className={`relative rounded-xl border-2 p-4 text-center transition ${
                    responses[current.id] === idx
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  } ${submitting ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  <div className="text-lg font-bold">{String.fromCharCode(65 + idx)}</div>
                  <div className="mt-1 text-sm">{opt}</div>
                </button>
              ))}
            </div>

            {/* Navigation */}
            <div className="mt-6 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                No back button • Auto-submit when time ends
              </div>
              <button
                onClick={handleNext}
                disabled={submitting}
                className={`btn-primary ${submitting ? 'opacity-60' : ''}`}
              >
                {currentIndex < questions.length - 1 ? 'Next' : 'Submit'}
              </button>
            </div>
          </div>
        </div>

        {/* Quick OMR strip */}
        <div className="mt-6 card">
          <div className="card-body">
            <div className="text-sm font-semibold mb-2">Quick Navigation</div>
            <div className="grid grid-cols-10 gap-1">
              {questions.map((q, idx) => {
                const answered = responses[q.id] !== undefined;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    disabled={submitting}
                    className={`aspect-square rounded text-xs font-medium transition ${
                      answered
                        ? 'bg-primary-600 text-white'
                        : 'bg-slate-200 text-slate-700'
                    } ${idx === currentIndex ? 'ring-2 ring-primary-600' : ''}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
