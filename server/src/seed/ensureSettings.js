import { Settings } from '../models/index.js';

export async function ensureSettings() {
  await Settings.updateOne({ id: 1 }, { $setOnInsert: { id: 1 } }, { upsert: true });
  const row = await Settings.findOne({ id: 1 }).lean();
  return row;
}
