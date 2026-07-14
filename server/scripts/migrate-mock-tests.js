import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const mainUri = process.env.MONGO_URI;
const mockUri = process.env.MONGO_URI_MOCKTEST;

if (!mainUri || !mockUri) {
  console.error('Both MONGO_URI and MONGO_URI_MOCKTEST must be set in .env');
  process.exit(1);
}

const Schema = mongoose.Schema;

// Schemas
const TestSchema = new Schema({}, { collection: 'tests', strict: false });
const TestQuestionSchema = new Schema({}, { collection: 'test_questions', strict: false });
const ResultSchema = new Schema({}, { collection: 'results', strict: false });
const CounterSchema = new Schema({ _id: { type: String, required: true }, seq: { type: Number, required: true, default: 0 } }, { collection: 'counters' });

async function migrate() {
  console.log('Connecting to databases...');
  
  const mainDb = await mongoose.createConnection(mainUri).asPromise();
  console.log('Connected to Main DB');
  
  const mockDb = await mongoose.createConnection(mockUri).asPromise();
  console.log('Connected to Mock Test DB');

  const MainTest = mainDb.model('Test', TestSchema);
  const MainTestQuestion = mainDb.model('TestQuestion', TestQuestionSchema);
  const MainResult = mainDb.model('Result', ResultSchema);
  const MainCounter = mainDb.model('Counter', CounterSchema);

  const MockTest = mockDb.model('Test', TestSchema);
  const MockTestQuestion = mockDb.model('TestQuestion', TestQuestionSchema);
  const MockResult = mockDb.model('Result', ResultSchema);
  const MockCounter = mockDb.model('Counter', CounterSchema);

  try {
    // 1. Migrate Tests
    console.log('Fetching Tests from Main DB...');
    const tests = await MainTest.find({}).lean();
    console.log(`Found ${tests.length} tests to migrate.`);
    for (const test of tests) {
      await MockTest.updateOne({ id: test.id }, { $set: test }, { upsert: true });
    }
    console.log('Tests migrated successfully.');

    // 2. Migrate Test Questions
    console.log('Fetching Test Questions from Main DB...');
    const questions = await MainTestQuestion.find({}).lean();
    console.log(`Found ${questions.length} questions to migrate.`);
    for (const q of questions) {
      await MockTestQuestion.updateOne({ id: q.id }, { $set: q }, { upsert: true });
    }
    console.log('Test Questions migrated successfully.');

    // 3. Migrate Results
    console.log('Fetching Results from Main DB...');
    const results = await MainResult.find({}).lean();
    console.log(`Found ${results.length} results to migrate.`);
    for (const r of results) {
      await MockResult.updateOne({ id: r.id }, { $set: r }, { upsert: true });
    }
    console.log('Results migrated successfully.');

    // 4. Migrate Counters
    console.log('Fetching Counters from Main DB...');
    const counters = await MainCounter.find({ _id: { $in: ['tests', 'test_questions', 'results'] } }).lean();
    console.log(`Found ${counters.length} counters to migrate.`);
    for (const c of counters) {
      const existing = await MockCounter.findById(c._id).lean();
      if (!existing || existing.seq < c.seq) {
        await MockCounter.updateOne({ _id: c._id }, { $set: { seq: c.seq } }, { upsert: true });
      }
    }
    console.log('Counters migrated successfully.');

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await mainDb.close();
    await mockDb.close();
    process.exit(0);
  }
}

migrate();
