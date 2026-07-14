import mongoose from 'mongoose';
import { User } from './src/models/index.js';
import { verifyPassword, hashPassword } from './src/utils/auth.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const users = await User.find({ role: 'student' }).limit(5).lean();
  console.log('Found students:', users.length);
  for (const u of users) {
    console.log(`Student: ${u.email}, hash: ${u.password_hash?.substring(0, 15)}...`);
  }
  
  const adminDoc = await User.findOne({ role: 'admin' }).lean();
  if (adminDoc) {
     console.log(`Admin: ${adminDoc.email}`);
  }
  process.exit(0);
}
run().catch(console.error);
