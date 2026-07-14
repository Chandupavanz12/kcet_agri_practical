import mongoose from 'mongoose';
import { getMockResultModel, getMockTestQuestionModel } from './src/models/index.js';

async function test() {
    await mongoose.connect('mongodb://127.0.0.1:27017/kcet_agri');
    const MockResult = await getMockResultModel();
    const res = await MockResult.findOne().sort({ id: -1 }).lean();
    if (!res) { console.log('no result'); process.exit(0); }
    console.log('Result responses_json length:', res.responses_json.length);
    const resp = JSON.parse(res.responses_json);
    console.log('First response questionId:', resp[0].questionId);

    const MockQuestion = await getMockTestQuestionModel();
    const q = await MockQuestion.findOne({ id: resp[0].questionId }).lean();
    if (!q) { console.log('q null'); process.exit(0); }
    console.log('Question id:', q.id, 'Image length:', q.image_url ? q.image_url.length : 0);
    process.exit(0);
}
test().catch(console.error);
