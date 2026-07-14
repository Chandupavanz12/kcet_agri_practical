import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const mainUri = process.env.MONGO_URI;
const mockUri = process.env.MONGO_URI_MOCKTEST;

const ResultSchema = new mongoose.Schema({}, { collection: 'results', strict: false });
const CounterSchema = new mongoose.Schema({ _id: { type: String, required: true }, seq: { type: Number, required: true, default: 0 } }, { collection: 'counters' });

async function fastMigrate() {
  const mainDb = await mongoose.createConnection(mainUri).asPromise();
  const mockDb = await mongoose.createConnection(mockUri).asPromise();

  const MainResult = mainDb.model('Result', ResultSchema);
  const MockResult = mockDb.model('Result', ResultSchema);
  const MainCounter = mainDb.model('Counter', CounterSchema);
  const MockCounter = mockDb.model('Counter', CounterSchema);

  const results = await MainResult.find({}).lean();
  console.log(`Found ${results.length} results to migrate in fast mode.`);

  let count = 0;
  const batchSize = 250;
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
    console.log(`Migrated ${count} results...`);
  }

  const counters = await MainCounter.find({ _id: { $in: ['tests', 'test_questions', 'results'] } }).lean();
  for (const c of counters) {
    await MockCounter.updateOne({ _id: c._id }, { $set: { seq: c.seq } }, { upsert: true });
  }

  console.log('Fast migration done!');
  process.exit(0);
}

fastMigrate();
