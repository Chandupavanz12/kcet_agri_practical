import dotenv from 'dotenv';
import mongoose from 'mongoose';
import * as pdfReader from './src/services/counseling/pdfReader.js';

// Mock the pdf reader so it doesn't take 20 minutes due to DNS timeout!
pdfReader.parsePdfContent = async (url) => { return null; };

import { runScraper } from './src/services/counseling/scraper.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        const db = mongoose.connection.db;
        await db.collection('counselling_notifications').deleteMany({});
        console.log('Cleared DB. Running FAST scraper...');
        await runScraper();

        const total = await db.collection('counselling_notifications').countDocuments();
        const pdfs = await db.collection('counselling_notifications').countDocuments({ pdfUrl: { $regex: /\.pdf$/i } });

        console.log('Total notifications:', total);
        console.log('PDF notifications:', pdfs);
        console.log('Non-PDF:', total - pdfs);

        process.exit(0);
    })
    .catch(err => { console.error(err); process.exit(1); });
