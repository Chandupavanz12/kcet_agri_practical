import React, { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../lib/api.js';

function classifyNotification(n) {
  const title = String(n?.title || '').toLowerCase();
  const message = String(n?.message || '').toLowerCase();
  const text = `${title} ${message}`;

  if (/(mock|test)/i.test(text)) return { kind: 'mock_test', icon: '🔔' };
  if (/(video)/i.test(text)) return { kind: 'video', icon: '🎥' };
  if (/(announce|announcement|notice|update)/i.test(text)) return { kind: 'announcement', icon: '📢' };
  return null;
}

function formatLine(n) {
  const c = classifyNotification(n);
  if (!c) return null;
  const title = String(n?.title || '').trim();
  const msg = String(n?.message || '').trim();
  const text = title ? (msg ? `${title}: ${msg}` : title) : msg;
  if (!text) return null;
  return `${c.icon} ${text}`;
}

function joinLines(lines) {
  const out = (lines || []).filter(Boolean);
  if (!out.length) return '';
  return out.join('     •     ');
}

export default function NotificationTicker({ token, initialNotifications = [], autoRefresh = true }) {
  const [items, setItems] = useState(Array.isArray(initialNotifications) ? initialNotifications : []);
  const lastKeyRef = useRef('');

  const importantLines = useMemo(() => {
    const byKind = { mock_test: [], video: [], announcement: [] };
    for (const n of items || []) {
      const c = classifyNotification(n);
      if (!c) continue;
      const line = formatLine(n);
      if (!line) continue;
      if (!byKind[c.kind]) byKind[c.kind] = [];
      byKind[c.kind].push(line);
    }

    const dedupe = (arr) => {
      const uniq = [];
      const seen = new Set();
      for (const l of arr || []) {
        if (seen.has(l)) continue;
        seen.add(l);
        uniq.push(l);
      }
      return uniq;
    };

    return {
      row1: dedupe([...(byKind.mock_test || []), ...(byKind.announcement || [])]),
      row2: dedupe([...(byKind.video || [])]),
    };
  }, [items]);

  useEffect(() => {
    setItems(Array.isArray(initialNotifications) ? initialNotifications : []);
  }, [initialNotifications]);

  useEffect(() => {
    if (!autoRefresh) return;
    if (!token) return;

    const tick = async () => {
      try {
        const res = await apiFetch('/api/student/notifications', { token });
        const next = Array.isArray(res?.notifications) ? res.notifications : [];
        const nextKey = next.map((n) => `${n.id}:${n.title}`).join('|');
        if (nextKey && nextKey !== lastKeyRef.current) {
          lastKeyRef.current = nextKey;
          setItems(next);
        }
      } catch {
        // ignore
      }
    };

    tick();
    const t = setInterval(tick, 20000);
    return () => clearInterval(t);
  }, [token, autoRefresh]);

  const row1Text = joinLines(importantLines.row1) || '🔔 Announcements will appear here';
  const row2Text = joinLines(importantLines.row2) || '🎥 New content updates will appear here';

  return (
    <div className="card overflow-hidden">
      <div className="card-body">
        <div className="grid gap-2">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white">
            <div className="ticker-track whitespace-nowrap px-4 py-2 text-sm font-medium text-slate-800">
              <div className="inline-flex">
                <span className="pr-10">{row1Text}</span>
                <span className="pr-10" aria-hidden="true">{row1Text}</span>
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white">
            <div className="ticker-track-slow whitespace-nowrap px-4 py-2 text-sm font-medium text-slate-800">
              <div className="inline-flex">
                <span className="pr-10">{row2Text}</span>
                <span className="pr-10" aria-hidden="true">{row2Text}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
