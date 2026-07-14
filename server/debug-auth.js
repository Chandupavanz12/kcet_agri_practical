import mongoose from 'mongoose';
import { User } from './src/models/index.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const users = await User.find({ role: 'student' }).sort({ created_at: -1 }).limit(10).lean();
    console.log(`Found ${users.length} recent students.`);
    for (const u of users) {
      console.log(`User: ${u.email}`);
      console.log(`  Hash: ${u.password_hash}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
