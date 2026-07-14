import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { apiFetch } from '../api/client.js';

function classifyNotification(n) {
  const title = String(n?.title || '').toLowerCase();
  const message = String(n?.message || '').toLowerCase();
  const text = `${title} ${message}`;

  if (/(mock|test)/i.test(text)) return { kind: 'mock_test', icon: '🔔' };
  if (/(video)/i.test(text)) return { kind: 'video', icon: '🎥' };
  if (/(announce|announcement|notice|update)/i.test(text)) return { kind: 'announcement', icon: '📢' };
  return { kind: 'announcement', icon: '🔔' };
}

function formatLine(n) {
  const msg = String(n?.message || '').trim();
  if (!msg) return null;
  return msg;
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

  const row1Text = joinLines(importantLines.row1);
  const row2Text = joinLines(importantLines.row2);

  if (!row1Text && !row2Text) return null;

  return (
    <View style={styles.card}>
      <View style={styles.body}>
        <View style={styles.grid}>
          {row1Text ? (
            <View style={styles.trackContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.track}>
                <Text style={styles.text}>{row1Text}</Text>
              </ScrollView>
            </View>
          ) : null}
          {row2Text ? (
            <View style={styles.trackContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.track}>
                <Text style={styles.text}>{row2Text}</Text>
              </ScrollView>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
    marginHorizontal: 16,
  },
  body: {
    padding: 12,
  },
  grid: {
    gap: 8,
  },
  trackContainer: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.7)',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  track: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
});
