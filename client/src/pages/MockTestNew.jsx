import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../lib/api.js';

export default function MockTest() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const [markedForReview, setMarkedForReview] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [startTime] = useState(Date.now());
  const [secondsLeft, setSecondsLeft] = useState(0);
  const submittedRef = useRef(false);

  const current = questions[currentIndex];

  // Load test data
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        console.log('[MockTest] Loading test with ID:', testId);
        const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('Test load timeout')), 12000));
        const res = await Promise.race([
          apiFetch(`/api/student/tests/${testId}/start`, { token }),
          timeout,
        ]);
        if (!alive) return;
        console.log('[MockTest] Test data received:', res);
        setTest(res.test);
        setQuestions(res.questions || []);
        const initialSeconds = res.test.questionCount * res.test.perQuestionSeconds;
        setSecondsLeft(initialSeconds);
        console.log('[MockTest] Questions loaded:', res.questions?.length);
        console.log('[MockTest] Initial timer set to:', initialSeconds, 'seconds');
        
        // Log image URLs for debugging
        res.questions?.forEach((q, idx) => {
          console.log(`[MockTest] Question ${idx + 1} image URL:`, q.imageUrl);
        });
      } catch (err) {
        if (!alive) return;
        console.error('[MockTest] Error loading test:', err);
        setLoadError(err?.message || 'Failed to load test');
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [testId, token]);

  // Timer
  useEffect(() => {
    // Only run timer when test is loaded and we have questions
    if (!test || questions.length === 0) {
      console.log('[MockTest] Timer - test not loaded yet, skipping');
      return;
    }
    
    console.log('[MockTest] Timer effect - secondsLeft:', secondsLeft);
    if (secondsLeft <= 0) {
      console.log('[MockTest] Timer expired - submitting test');
      handleSubmit();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft(secondsLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, test, questions.length]);

  const handleSelect = useCallback((optionIndex) => {
    if (submitting) return;
    const questionId = current.id;
    setResponses((prev) => ({ ...prev, [questionId]: optionIndex }));
  }, [current?.id, submitting]);

  const toggleMarkForReview = useCallback(() => {
    const questionId = current.id;
    setMarkedForReview((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  }, [current?.id]);

  const goToQuestion = useCallback((index) => {
    if (index >= 0 && index < questions.length) {
      setCurrentIndex(index);
    }
  }, [questions.length]);

  const goToNext = useCallback(() => {
    goToQuestion(currentIndex + 1);
  }, [currentIndex, goToQuestion]);

  const goToPrevious = useCallback(() => {
    goToQuestion(currentIndex - 1);
  }, [currentIndex, goToQuestion]);

  const skipQuestion = useCallback(() => {
    // Clear any response for current question
    const questionId = current.id;
    setResponses((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
    goToNext();
  }, [current?.id, goToNext]);

  const handleSubmit = async () => {
    if (submitting || submittedRef.current) return;
    setSubmitting(true);
    submittedRef.current = true;
    try {
      const timeTakenSec = Math.round((Date.now() - startTime) / 1000);
      const mappedResponses = questions.map((q) => ({
        questionId: q.id,
        selected: responses[q.id] ?? null,
      }));
      await apiFetch(`/api/student/tests/${testId}/submit`, {
        token,
        method: 'POST',
        body: { responses: mappedResponses, timeTakenSec },
      });
      navigate(`/student/mock-test/result?testId=${testId}`, { replace: true });
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

  if (!test) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Test not found</div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="card max-w-lg w-full">
          <div className="card-body space-y-3">
            <div className="text-lg font-semibold">No Questions Available</div>
            <div className="text-sm text-slate-600">This test doesn't have any questions yet. Please contact your administrator.</div>
            <button className="btn-ghost" onClick={() => navigate('/student/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Question not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
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

      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="card">
              <div className="card-body">
                {/* Question Header */}
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    Q{currentIndex + 1}. {current.questionText}
                  </h3>
                  <button
                    onClick={toggleMarkForReview}
                    className={`px-3 py-1 text-sm rounded-md ${
                      markedForReview.has(current.id)
                        ? 'bg-orange-100 text-orange-700 border border-orange-300'
                        : 'bg-gray-100 text-gray-700 border border-gray-300'
                    }`}
                  >
                    {markedForReview.has(current.id) ? '✓ Marked for Review' : 'Mark for Review'}
                  </button>
                </div>

                {/* Image */}
                <div className="mb-6 flex justify-center">
                  <img
                    src={current.imageUrl.startsWith('http') ? current.imageUrl : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'}${current.imageUrl}`}
                    alt={`Question ${currentIndex + 1}`}
                    className="h-64 w-auto rounded-lg border object-contain"
                    onError={(e) => {
                      console.log('[MockTest] Image failed to load:', e.target.src);
                      e.target.src = 'https://via.placeholder.com/400x300?text=Image+Not+Available';
                      e.target.onerror = null;
                    }}
                    onLoad={() => {
                      console.log('[MockTest] Image loaded successfully:', e.target.src);
                    }}
                  />
                </div>

                {/* Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {current.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelect(idx)}
                      disabled={submitting}
                      className={`p-4 text-left border-2 rounded-lg transition-colors ${
                        responses[current.id] === idx
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          responses[current.id] === idx
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300'
                        }`}>
                          {responses[current.id] === idx && (
                            <div className="w-2 h-2 bg-white rounded-full" />
                          )}
                        </div>
                        <span className="font-medium">{String.fromCharCode(65 + idx)}.</span>
                        <span>{opt}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Navigation Buttons */}
                <div className="mt-6 flex flex-wrap gap-2 justify-between">
                  <div className="flex gap-2">
                    <button
                      onClick={goToPrevious}
                      disabled={currentIndex === 0}
                      className="btn-ghost"
                    >
                      ← Previous
                    </button>
                    <button
                      onClick={skipQuestion}
                      disabled={submitting}
                      className="btn-ghost"
                    >
                      Skip
                    </button>
                  </div>
                  <div className="flex gap-2">
                    {currentIndex < questions.length - 1 ? (
                      <button
                        onClick={goToNext}
                        disabled={submitting}
                        className="btn-primary"
                      >
                        Next →
                      </button>
                    ) : (
                      <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="btn-primary"
                      >
                        Submit Test
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Question Palette */}
          <div className="lg:col-span-1">
            <div className="card">
              <div className="card-body">
                <h3 className="font-semibold mb-3">Question Palette</h3>
                <div className="grid grid-cols-5 gap-2">
                  {questions.map((q, idx) => {
                    const isAnswered = responses[q.id] !== undefined;
                    const isMarked = markedForReview.has(q.id);
                    const isCurrent = idx === currentIndex;
                    
                    return (
                      <button
                        key={q.id}
                        onClick={() => goToQuestion(idx)}
                        className={`w-10 h-10 rounded text-sm font-medium transition-colors ${
                          isCurrent
                            ? 'bg-blue-500 text-white'
                            : isAnswered
                            ? isMarked
                              ? 'bg-orange-500 text-white'
                              : 'bg-green-500 text-white'
                            : isMarked
                            ? 'bg-orange-100 text-orange-700 border border-orange-300'
                            : 'bg-gray-100 text-gray-700 border border-gray-300'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
                
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span>Answered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-orange-500 rounded"></div>
                    <span>Answered & Marked</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-orange-100 border border-orange-300 rounded"></div>
                    <span>Marked for Review</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
                    <span>Not Answered</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="btn-primary w-full"
                  >
                    {submitting ? 'Submitting...' : 'Submit Test'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
