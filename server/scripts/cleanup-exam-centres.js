// Cleanup script for orphaned exam centres (created without numeric id)
// Run with: node scripts/cleanup-exam-centres.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('MONGO_URI not set in .env');
  process.exit(1);
}

async function cleanup() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // Find all exam centres without an id
    const orphaned = await db.collection('exam_centres').find({ id: { $exists: false } }).toArray();
    console.log(`Found ${orphaned.length} orphaned exam centres (without id)`);

    if (orphaned.length === 0) {
      console.log('No orphaned centres to clean up!');
      await mongoose.disconnect();
      return;
    }

    // Show orphaned centres
    console.log('Orphaned centres:');
    orphaned.forEach(c => console.log(`  - _id: ${c._id}, name: "${c.name}"`));

    // Get the current max id
    const maxIdDoc = await db.collection('exam_centres').find({ id: { $exists: true } }).sort({ id: -1 }).limit(1).toArray();
    let nextId = maxIdDoc.length > 0 ? maxIdDoc[0].id + 1 : 1;
    console.log(`Starting ID assignment from: ${nextId}`);

    // Fix each orphaned centre
    for (const centre of orphaned) {
      await db.collection('exam_centres').updateOne(
        { _id: centre._id },
        { $set: { id: nextId++ } }
      );
      console.log(`Assigned id ${nextId - 1} to centre: ${centre.name}`);
    }

    // Update the counter
    await db.collection('counters').updateOne(
      { _id: 'exam_centres' },
      { $set: { seq: nextId - 1 } },
      { upsert: true }
    );
    console.log(`Updated counter to ${nextId - 1}`);

    console.log('Cleanup complete!');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

cleanup();
