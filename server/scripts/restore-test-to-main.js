import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function restoreToMain() {
  const mainDb = await mongoose.createConnection(process.env.MONGO_URI).asPromise();
  const mockDb = await mongoose.createConnection(process.env.MONGO_URI_MOCKTEST).asPromise();
  
  const TestSchema = new mongoose.Schema({}, { strict: false, collection: 'tests' });
  const QuestionSchema = new mongoose.Schema({}, { strict: false, collection: 'test_questions' });
  const ResultSchema = new mongoose.Schema({}, { strict: false, collection: 'results' });

  const MainTest = mainDb.model('Test', TestSchema);
  const MockTest = mockDb.model('Test', TestSchema);
  
  const MainQuestion = mainDb.model('TestQuestion', QuestionSchema);
  const MockQuestion = mockDb.model('TestQuestion', QuestionSchema);
  
  const MainResult = mainDb.model('Result', ResultSchema);
  const MockResult = mockDb.model('Result', ResultSchema);
  
  const testId = 15;
  
  const test = await MockTest.findOne({ id: testId }).lean();
  if (test) {
    console.log('Restoring Test 15 to Main DB...');
    await MainTest.updateOne({ id: testId }, { $set: test }, { upsert: true });
  }
  
  const questions = await MockQuestion.find({ test_id: testId }).lean();
  console.log(`Restoring ${questions.length} questions to Main DB...`);
  for (const q of questions) {
    await MainQuestion.updateOne({ id: q.id }, { $set: q }, { upsert: true });
  }
  
  const results = await MockResult.find({ test_id: testId }).lean();
  console.log(`Restoring ${results.length} results to Main DB...`);
  const batchSize = 100;
  for (let i = 0; i < results.length; i += batchSize) {
    const batch = results.slice(i, i + batchSize);
    const ops = batch.map(r => ({
      updateOne: { filter: { id: r.id }, update: { $set: r }, upsert: true }
    }));
    await MainResult.bulkWrite(ops);
  }
  
  console.log('Restore to Main DB complete!');
  process.exit(0);
}

restoreToMain();
