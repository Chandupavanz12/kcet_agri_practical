/**
 * mockTestDb.js
 * Manages a dedicated Mongoose connection for the mock-test cluster.
 * All NEW mock tests, questions, and results are stored here.
 * The main DB (MONGO_URI) is kept as a read-only fallback so that
 * previously created tests continue to work without any data migration.
 */
import mongoose from 'mongoose';

let mockTestConnection = null;
let connectingPromise = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function connectMockTestDb() {
  const uri = process.env.MONGO_URI_MOCKTEST;
  if (!uri) {
    // No dedicated mock-test DB configured – fall back to main connection.
    console.log('[mongo-mocktest] MONGO_URI_MOCKTEST not set; will fall back to main DB');
    return;
  }

  if (mockTestConnection && mockTestConnection.readyState === 1) return;
  if (connectingPromise) return connectingPromise;

  const maxAttempts = Number(process.env.MONGO_CONNECT_ATTEMPTS || 5);
  const baseDelayMs = Number(process.env.MONGO_CONNECT_DELAY_MS || 500);

  connectingPromise = (async () => {
    let lastErr;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        mockTestConnection = mongoose.createConnection(uri, {
          serverSelectionTimeoutMS: 15000,
          connectTimeoutMS: 15000,
          socketTimeoutMS: 45000,
          minPoolSize: 1,
          maxPoolSize: 10,
          heartbeatFrequencyMS: 10000,
          maxIdleTimeMS: 60000,
        });

        mockTestConnection.on('error', (err) =>
          console.error('[mongo-mocktest] connection error', err)
        );
        mockTestConnection.on('disconnected', () =>
          console.error('[mongo-mocktest] disconnected')
        );

        await mockTestConnection.asPromise();
        console.log('[mongo-mocktest] mock-test db connected successfully');
        return;
      } catch (err) {
        lastErr = err;
        const delay = baseDelayMs * attempt;
        console.error(
          `[mongo-mocktest] connect attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms`,
          err?.message || err
        );
        if (mockTestConnection) {
          try { await mockTestConnection.close(); } catch (_) {}
          mockTestConnection = null;
        }
        await sleep(delay);
      }
    }
    throw lastErr || new Error('Failed to connect to mock-test MongoDB');
  })();

  try {
    await connectingPromise;
  } finally {
    connectingPromise = null;
  }
}

/** Returns the active mock-test Mongoose connection, or null if unavailable. */
export function getMockTestConnection() {
  if (mockTestConnection && mockTestConnection.readyState === 1) {
    return mockTestConnection;
  }
  return null;
}

// ─── Shared schema definitions ────────────────────────────────────────────────
// We reuse the same Mongoose schema shapes as the main DB so documents are
// 100 % compatible.  Each factory re-registers the model on the dedicated
// connection (avoids cross-connection model collisions).

import { Schema } from 'mongoose';

const CounterSchema = new Schema(
  { _id: { type: String, required: true }, seq: { type: Number, required: true, default: 0 } },
  { collection: 'counters' }
);

async function getNextMockId(conn, sequenceName) {
  const Counter = conn.models.Counter || conn.model('Counter', CounterSchema);
  const doc = await Counter.findByIdAndUpdate(
    sequenceName,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();
  return Number(doc.seq);
}

const TestSchema = new Schema(
  {
    id: { type: Number, unique: true, index: true },
    title: { type: String, required: true },
    is_active: { type: Boolean, default: true, index: true },
    question_count: { type: Number, default: 0 },
    per_question_seconds: { type: Number, default: 30 },
    marks_correct: { type: Number, default: 4 },
    created_at: { type: Date, default: () => new Date(), index: true },
    updated_at: { type: Date, default: () => new Date() },
  },
  { collection: 'tests' }
);
TestSchema.pre('save', async function preSave() {
  if (this.isNew && !Number.isFinite(this.id)) {
    this.id = await getNextMockId(this.constructor.db, 'tests');
  }
  this.updated_at = new Date();
});

const TestQuestionSchema = new Schema(
  {
    id: { type: Number, unique: true, index: true },
    test_id: { type: Number, required: true, index: true },
    question_text: { type: String, required: true },
    image_url: { type: String, default: '' },
    option_a: { type: String, required: true },
    option_b: { type: String, required: true },
    option_c: { type: String, required: true },
    option_d: { type: String, required: true },
    correct_option: { type: String, required: true },
    question_order: { type: Number, default: 1, index: true },
    created_at: { type: Date, default: () => new Date() },
  },
  { collection: 'test_questions' }
);
TestQuestionSchema.index({ test_id: 1, question_order: 1 });
TestQuestionSchema.pre('save', async function preSave() {
  if (this.isNew && !Number.isFinite(this.id)) {
    this.id = await getNextMockId(this.constructor.db, 'test_questions');
  }
});

const ResultSchema = new Schema(
  {
    id: { type: Number, unique: true, index: true },
    user_id: { type: Number, required: true, index: true },
    test_id: { type: Number, required: true, index: true },
    score: { type: Number, required: true },
    correct_count: { type: Number, required: true },
    wrong_count: { type: Number, required: true },
    total_questions: { type: Number, required: true },
    accuracy: { type: Number, required: true },
    time_taken_sec: { type: Number, required: true },
    responses_json: { type: String, required: true },
    date: { type: Date, default: () => new Date(), index: true },
    created_at: { type: Date, default: () => new Date() },
  },
  { collection: 'results' }
);
ResultSchema.index({ test_id: 1, score: -1, time_taken_sec: 1, date: 1 });
ResultSchema.pre('save', async function preSave() {
  if (this.isNew && !Number.isFinite(this.id)) {
    this.id = await getNextMockId(this.constructor.db, 'results');
  }
});

/**
 * Returns the Test model bound to the mock-test connection.
 * Falls back to the main DB model if no dedicated connection is available.
 */
export function getMockTestModel() {
  const conn = getMockTestConnection();
  if (conn) {
    return conn.models.MockTest || conn.model('MockTest', TestSchema);
  }
  // Fallback – import lazily to avoid circular deps
  return import('../models/index.js').then((m) => m.Test);
}

export function getMockTestQuestionModel() {
  const conn = getMockTestConnection();
  if (conn) {
    return conn.models.MockTestQuestion || conn.model('MockTestQuestion', TestQuestionSchema);
  }
  return import('../models/index.js').then((m) => m.TestQuestion);
}

export function getMockResultModel() {
  const conn = getMockTestConnection();
  if (conn) {
    return conn.models.MockResult || conn.model('MockResult', ResultSchema);
  }
  return import('../models/index.js').then((m) => m.Result);
}

export async function disconnectMockTestDb() {
  try {
    if (mockTestConnection) {
      await mockTestConnection.close();
      mockTestConnection = null;
    }
  } catch (_) {
    // ignore
  }
}
