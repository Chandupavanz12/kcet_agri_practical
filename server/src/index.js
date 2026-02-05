import dotenv from 'dotenv';

dotenv.config();

import { createApp } from './app.js';
import { connectDb } from './config/db-pg.js';
import { ensureAdminUser } from './seed/ensureAdmin.js';
import { ensureSettings } from './seed/ensureSettings.js';

const PORT = process.env.PORT || 5000;

await connectDb();
await ensureAdminUser();
await ensureSettings();

const app = createApp();

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${PORT}`);
});
