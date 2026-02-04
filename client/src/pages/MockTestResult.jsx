import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../lib/api.js';

export default function MockTestResult() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const testId = search.get('testId');

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await apiFetch(`/api/student/results?testId=${testId}`, { token });
        if (!alive) return;
        const latest = res.results?.[0];
        if (!latest) throw new Error('Result not found');
        const detail = await apiFetch(`/api/student/results/${latest.id}`, { token });
        if (!alive) return;
        setResult(detail.result);
      } catch (err) {
        if (!alive) return;
        alert(err?.message || 'Failed to load result');
        navigate('/student/dashboard', { replace: true });
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, testId, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading result...</div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Result not found</div>
      </div>
    );
  }

  const {
    score,
    outOf,
    accuracy,
    correctCount,
    wrongCount,
    totalQuestions,
    timeTakenSec,
    rank,
    date,
    responses,
  } = result;

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="card">
            <div className="card-body">
              <h1 className="text-2xl font-semibold">Test Result</h1>
              <p className="mt-1 text-sm text-slate-600">{result.testTitle}</p>
            </div>
          </div>

          {/* Score Card */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card">
              <div className="card-body">
                <div className="text-sm font-semibold text-slate-800">Score</div>
                <div className="mt-2 text-4xl font-bold text-primary-600">
                  {score} / {outOf}
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <div className="text-sm font-semibold text-slate-800">Rank</div>
                <div className="mt-2 text-4xl font-bold text-slate-700">#{rank}</div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="card">
              <div className="card-body">
                <div className="text-sm font-semibold text-slate-800">Accuracy</div>
                <div className="mt-2 text-2xl font-semibold">{accuracy}%</div>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <div className="text-sm font-semibold text-slate-800">Correct</div>
                <div className="mt-2 text-2xl font-semibold text-green-600">{correctCount}</div>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <div className="text-sm font-semibold text-slate-800">Wrong</div>
                <div className="mt-2 text-2xl font-semibold text-red-600">{wrongCount}</div>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <div className="text-sm font-semibold text-slate-800">Time</div>
                <div className="mt-2 text-2xl font-semibold">
                  {Math.floor(timeTakenSec / 60)}:{(timeTakenSec % 60).toString().padStart(2, '0')}
                </div>
              </div>
            </div>
          </div>

          {/* Response Review */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold">Answer Review</h2>
            </div>
            <div className="card-body space-y-6">
              {responses.sort((a, b) => a.questionOrder - b.questionOrder).map((r, idx) => (
                <div key={r.questionId} className="border rounded-lg p-4 space-y-4">
                  {/* Question Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold">
                        {idx + 1}
                      </div>
                      <div>
                        <h3 className="font-medium">{r.questionText}</h3>
                        <div className={`text-sm ${r.correct ? 'text-green-600' : 'text-red-600'}`}>
                          {r.correct ? '✓ Correct' : '✗ Wrong'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Question Image */}
                  {r.imageUrl && (
                    <div className="flex justify-center">
                      <img
                        src={r.imageUrl.startsWith('http') ? r.imageUrl : `http://localhost:5001${r.imageUrl}`}
                        alt={`Question ${idx + 1}`}
                        className="h-48 w-auto rounded-lg border object-contain"
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/400x300?text=Image+Not+Available';
                          e.target.onerror = null;
                        }}
                      />
                    </div>
                  )}

                  {/* Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {r.options.map((option, optionIdx) => {
                      const optionLetter = String.fromCharCode(65 + optionIdx);
                      const isSelected = r.selectedIndex === optionIdx;
                      const isCorrect = r.correctOption === optionLetter;
                      
                      return (
                        <div
                          key={optionIdx}
                          className={`p-3 rounded-lg border-2 text-sm ${
                            isSelected && isCorrect
                              ? 'border-green-500 bg-green-50'
                              : isSelected && !isCorrect
                              ? 'border-red-500 bg-red-50'
                              : isCorrect
                              ? 'border-green-300 bg-green-50'
                              : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              isSelected
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-gray-300'
                            }`}>
                              {isSelected && (
                                <div className="w-2 h-2 bg-white rounded-full" />
                              )}
                            </div>
                            <span className="font-medium">{optionLetter}.</span>
                            <span>{option}</span>
                            {isCorrect && (
                              <span className="ml-auto text-green-600 text-xs font-semibold">✓ Correct</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Answer Summary */}
                  <div className="text-sm text-slate-600 border-t pt-3">
                    <div>
                      <span className="font-medium">Your Answer:</span>{' '}
                      {r.selected !== null ? `${r.selected} (${String.fromCharCode(65 + r.selectedIndex)})` : 'Not answered'}
                    </div>
                    <div>
                      <span className="font-medium">Correct Answer:</span> {r.correctOption}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/student/dashboard')}
              className="btn-primary"
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => navigate(`/student/mock-test/${testId}`)}
              className="btn-secondary"
            >
              Retake Test
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
