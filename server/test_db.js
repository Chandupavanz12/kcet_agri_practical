import dotenv from 'dotenv';
import mongoose from 'mongoose';
dotenv.config();

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        const db = mongoose.connection.db;
        const count = await db.collection('counselling_notifications').countDocuments();
        console.log('Notifications count:', count);
        const logs = await db.collection('scraper_logs').find().sort({ _id: -1 }).limit(2).toArray();
        console.log('Logs:', JSON.stringify(logs, null, 2));
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
