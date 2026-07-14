import dotenv from 'dotenv';

dotenv.config();

import { createApp } from './app.js';
import { connectDb } from './config/db.js';
import { connectMockTestDb } from './config/mockTestDb.js';
import { ensureAdminUser } from './seed/ensureAdmin.js';
import { ensureSettings } from './seed/ensureSettings.js';

import { initCounsellingCron } from './services/counseling/cron.js';

const PORT = process.env.PORT || 5000;

await connectDb();
await connectMockTestDb();
await ensureAdminUser();
await ensureSettings();

const app = createApp();

initCounsellingCron();

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${PORT}`);
});

