import 'dotenv/config';
import { connectMockTestDb, getMockTestQuestionModel } from './src/config/mockTestDb.js';

async function run() {
  await connectMockTestDb();
  const MockQuestion = await getMockTestQuestionModel();
  const q = await MockQuestion.aggregate([
      { $match: { test_id: 15 } },
      { $project: {
          id: 1,
          has_image: { $cond: [ { $and: [ { $ne: ["$image_url", null] }, { $ne: ["$image_url", ""] } ] }, true, false ] }
      }}
  ]);
  console.log('Total questions:', q.length);
  console.log('Questions with has_image true:', q.filter(x => x.has_image).length);
  process.exit(0);
}
run();
