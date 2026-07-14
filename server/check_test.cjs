const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/kcet_agri_practical').then(async () => {
  const db = mongoose.connection.useDb('kcet_agri_practical');
  const TestQuestion = db.collection('test_questions');
  const q = await TestQuestion.findOne({ image_url: { $ne: null } });
  console.log('Sample test_question image_url:', typeof q?.image_url, q?.image_url);
  console.log('All fields:', Object.keys(q || {}));
  mongoose.disconnect();
}).catch(e => console.error(e));
