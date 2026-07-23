import dotenv from 'dotenv';
import mongoose from 'mongoose';
dotenv.config();

import { runScraper } from './src/services/counseling/scraper.js';

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const db = mongoose.connection.db;

    console.log('Clearing old notifications from DB...');
    await db.collection('counselling_notifications').deleteMany({});

    console.log('Running scraper...');
    await runScraper();

    process.exit(0);
});
