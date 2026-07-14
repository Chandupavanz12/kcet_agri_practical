/**
 * migrate-mocktest-data.js
 *
 * Migrates mock test data (tests, test_questions, results) from the
 * OLD main database (MONGO_URI) to the NEW dedicated mock-test database
 * (MONGO_URI_MOCKTEST).
 *
 * Steps:
 *  1. Connect to both DBs
 *  2. Check if new DB already has data
 *  3. If new DB is empty → copy all data from old DB → delete from old DB
 *  4. If new DB already has data → just delete from old DB (no copy)
 *
 * Run: node migrate-mocktest-data.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const OLD_URI = process.env.MONGO_URI;
const NEW_URI = process.env.MONGO_URI_MOCKTEST || 'mongodb+srv://apdoddegowda15_db_user:WmjA55WfXfocDPQG@cns.7c1suwu.mongodb.net/?appName=cns';

if (!OLD_URI) {
  console.error('❌ MONGO_URI not set in .env');
  process.exit(1);
}

console.log('🔌 Connecting to OLD database...');
const oldConn = await mongoose.createConnection(OLD_URI, {
  serverSelectionTimeoutMS: 15000,
  connectTimeoutMS: 15000,
}).asPromise();
console.log('✅ Connected to OLD database');

console.log('🔌 Connecting to NEW database...');
const newConn = await mongoose.createConnection(NEW_URI, {
  serverSelectionTimeoutMS: 15000,
  connectTimeoutMS: 15000,
}).asPromise();
console.log('✅ Connected to NEW database');

// ─── Schema (minimal, no validation, just copy raw docs) ─────────────────────
const rawSchema = (collection) => new mongoose.Schema({}, { strict: false, collection });

const OldTest    = oldConn.model('OldTest',     rawSchema('tests'));
const OldQ       = oldConn.model('OldQ',         rawSchema('test_questions'));
const OldResult  = oldConn.model('OldResult',    rawSchema('results'));
const OldCounter = oldConn.model('OldCounter',   rawSchema('counters'));

const NewTest    = newConn.model('NewTest',      rawSchema('tests'));
const NewQ       = newConn.model('NewQ',          rawSchema('test_questions'));
const NewResult  = newConn.model('NewResult',    rawSchema('results'));
const NewCounter = newConn.model('NewCounter',   rawSchema('counters'));

// ─── Helper: bulk insert raw docs ────────────────────────────────────────────
async function bulkInsert(Model, docs, label) {
  if (!docs.length) { console.log(`   ℹ️  No ${label} to insert`); return; }
  // Strip _id so Mongoose doesn't clash; keep all other fields
  const cleaned = docs.map(d => {
    const obj = { ...d };
    delete obj.__v;
    return obj;
  });
  await Model.insertMany(cleaned, { ordered: false, lean: true });
  console.log(`   ✅ Inserted ${cleaned.length} ${label}`);
}

// ─── Step 1: Check new DB ─────────────────────────────────────────────────────
const newTestCount = await NewTest.countDocuments();
console.log(`\n📊 New DB currently has ${newTestCount} test(s)`);

if (newTestCount === 0) {
  console.log('\n📦 New DB is empty → copying data from OLD database...');

  const [oldTests, oldQs, oldResults, oldCounters] = await Promise.all([
    OldTest.find({}).lean(),
    OldQ.find({}).lean(),
    OldResult.find({}).lean(),
    OldCounter.find({ _id: { $in: ['tests', 'test_questions', 'results'] } }).lean(),
  ]);

  console.log(`   Found in OLD DB: ${oldTests.length} tests, ${oldQs.length} questions, ${oldResults.length} results`);

  await bulkInsert(NewTest,    oldTests,    'tests');
  await bulkInsert(NewQ,       oldQs,       'questions');
  await bulkInsert(NewResult,  oldResults,  'results');

  // Copy counters so auto-increment IDs continue correctly
  for (const counter of oldCounters) {
    await NewCounter.updateOne(
      { _id: counter._id },
      { $max: { seq: counter.seq } },
      { upsert: true }
    );
  }
  console.log(`   ✅ Counters synced`);

  console.log('\n✅ Copy complete!');
} else {
  console.log('\n✅ New DB already has data — skipping copy.');
}

// ─── Step 2: Delete mock test data from OLD DB ────────────────────────────────
console.log('\n🗑️  Deleting mock test data from OLD database...');

const [delTests, delQs, delResults] = await Promise.all([
  OldTest.deleteMany({}),
  OldQ.deleteMany({}),
  OldResult.deleteMany({}),
]);

console.log(`   Deleted: ${delTests.deletedCount} tests, ${delQs.deletedCount} questions, ${delResults.deletedCount} results`);
console.log('   ✅ Old database cleaned');

// ─── Done ─────────────────────────────────────────────────────────────────────
await oldConn.close();
await newConn.close();
console.log('\n🎉 Migration complete! All mock test data is now in the new database.');
process.exit(0);
