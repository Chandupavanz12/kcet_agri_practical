import mongoose from 'mongoose';
import { TestQuestion } from './src/models/index.js';
import dotenv from 'dotenv';
import http from 'http';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const q = await TestQuestion.findOne({ image_url: { $ne: null } }).lean();
  if (!q) process.exit(0);
  const url = q.image_url;
  const path = url.startsWith('/uploads') ? url : `/uploads/${url}`;
  
  const req = http.request({
    hostname: 'localhost',
    port: 5001,
    path: path,
    method: 'GET'
  }, res => {
    let chunks = [];
    res.on('data', c => chunks.push(c));
    res.on('end', () => console.log("Body:", Buffer.concat(chunks).toString()));
  });
  req.end();
}
run();
