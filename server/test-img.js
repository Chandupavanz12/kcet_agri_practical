import mongoose from 'mongoose';
import { TestQuestion } from './src/models/index.js';
import dotenv from 'dotenv';
import http from 'http';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const q = await TestQuestion.findOne({ image_url: { $ne: null } }).lean();
  if (!q) {
    console.log("No questions with images found.");
    process.exit(0);
  }
  const url = q.image_url;
  console.log("Found image URL:", url);
  
  // Make HTTP request to local server to fetch this image
  const path = url.startsWith('/uploads') ? url : `/uploads/${url}`;
  console.log("Fetching GET", path);
  const req = http.request({
    hostname: 'localhost',
    port: 5001,
    path: path,
    method: 'GET'
  }, res => {
    console.log("HTTP", res.statusCode);
    console.log("Headers:", res.headers);
    let chunks = [];
    res.on('data', c => chunks.push(c));
    res.on('end', () => console.log("Received bytes:", Buffer.concat(chunks).length));
  });
  req.end();
}
run();
