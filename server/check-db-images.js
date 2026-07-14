import mongoose from 'mongoose';
import { connectMockTestDb, getMockTestQuestionModel } from './src/config/mockTestDb.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await connectMockTestDb();
  const Q = await getMockTestQuestionModel();
  const qs = await Q.find({}).limit(5).lean();
  console.log("Sample image_urls:", qs.map(q => q.image_url));
  process.exit(0);
}
run();
