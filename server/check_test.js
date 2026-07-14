import mongoose from 'mongoose';

async function main() {
  try {
    await mongoose.connect('mongodb://localhost:27017/kcet_agri_practical');
    const db = mongoose.connection.useDb('kcet_agri_practical');
    const TestQuestion = db.collection('test_questions');
    const q = await TestQuestion.findOne({ image_url: { $ne: null } });
    console.log('Sample test_question:');
    console.log(q);
    await mongoose.disconnect();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();
