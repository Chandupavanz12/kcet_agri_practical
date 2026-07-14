import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: './.env' });

async function testGridFsBulk() {
  await mongoose.connect(process.env.DATABASE_URI);
  console.log('Connected');

  const db = mongoose.connection.db;
  const files = await db.collection('uploads.files').find().limit(1).toArray();
  if (!files.length) {
    console.log('No files found');
    process.exit(0);
  }

  const objId = files[0]._id;
  console.time('Sequential GridFS Stream');
  const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });
  const stream = bucket.openDownloadStream(objId);
  const chunksArr = [];
  await new Promise((resolve, reject) => {
    stream.on('data', d => chunksArr.push(d));
    stream.on('end', resolve);
    stream.on('error', reject);
  });
  console.timeEnd('Sequential GridFS Stream');
  console.log('Length:', Buffer.concat(chunksArr).length);

  console.time('Bulk Chunks Fetch');
  const chunks = await db.collection('uploads.chunks').find({ files_id: objId }).sort({ n: 1 }).toArray();
  const fileData = Buffer.concat(chunks.map(c => c.data.buffer));
  console.timeEnd('Bulk Chunks Fetch');
  console.log('Length:', fileData.length);

  process.exit(0);
}

testGridFsBulk().catch(console.error);
