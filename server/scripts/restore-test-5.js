import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const mainUri = process.env.MONGO_URI;
const mockUri = process.env.MONGO_URI_MOCKTEST;

async function restoreTest5() {
  const mainDb = await mongoose.createConnection(mainUri).asPromise();
  const mockDb = await mongoose.createConnection(mockUri).asPromise();
  
  const TestSchema = new mongoose.Schema({}, { strict: false, collection: 'tests' });
  const QuestionSchema = new mongoose.Schema({}, { strict: false, collection: 'test_questions' });
  const ResultSchema = new mongoose.Schema({}, { strict: false, collection: 'results' });

  const MainTest = mainDb.model('Test', TestSchema);
  const MockTest = mockDb.model('Test', TestSchema);
  
  const MainQuestion = mainDb.model('TestQuestion', QuestionSchema);
  const MockQuestion = mockDb.model('TestQuestion', QuestionSchema);
  
  const MainResult = mainDb.model('Result', ResultSchema);
  const MockResult = mockDb.model('Result', ResultSchema);
  
  const testId = 5;
  
  const test = await MainTest.findOne({ id: testId }).lean();
  if (!test) {
    console.log('Test 5 not found in old DB!');
    process.exit(1);
  }
  
  console.log('Restoring Test 5:', test.title);
  await MockTest.updateOne({ id: testId }, { $set: test }, { upsert: true });
  
  const questions = await MainQuestion.find({ test_id: testId }).lean();
  console.log(`Restoring ${questions.length} questions...`);
  for (const q of questions) {
    await MockQuestion.updateOne({ id: q.id }, { $set: q }, { upsert: true });
  }
  
  const results = await MainResult.find({ test_id: testId }).lean();
  console.log(`Restoring ${results.length} results...`);
  const batchSize = 100;
  let count = 0;
  for (let i = 0; i < results.length; i += batchSize) {
    const batch = results.slice(i, i + batchSize);
    const ops = batch.map(r => ({
      updateOne: {
        filter: { id: r.id },
        update: { $set: r },
        upsert: true
      }
    }));
    await MockResult.bulkWrite(ops);
    count += batch.length;
  }
  
  console.log('Restore complete!');
  process.exit(0);
}

restoreTest5();
