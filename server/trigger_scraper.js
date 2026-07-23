import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { runScraper } from './src/services/counseling/scraper.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('Connected to DB. Running scraper...');
        await runScraper();
        const count = await mongoose.connection.db.collection('counselling_notifications').countDocuments();
        console.log('Notifications count after scrape:', count);
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
