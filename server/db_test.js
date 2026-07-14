import mongoose from 'mongoose';
import fs from 'fs';

async function main() {
  try {
    await mongoose.connect('mongodb://localhost:27017/kcet_agri_practical');
    const db = mongoose.connection.useDb('kcet_agri_practical');
    const TestQuestion = db.collection('test_questions');
    const qs = await TestQuestion.find({}).limit(5).toArray();
    fs.writeFileSync('d:/newweb/server/db_test.txt', JSON.stringify(qs, null, 2));
    await mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    fs.writeFileSync('d:/newweb/server/db_test.txt', String(e));
    process.exit(1);
  }
}

main();
