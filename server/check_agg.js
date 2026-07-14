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
      }},
      { $limit: 1 }
  ]);
  console.log(q);
  process.exit(0);
}
run();
