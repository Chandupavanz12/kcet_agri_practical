import dotenv from 'dotenv';
import mongoose from 'mongoose';
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const db = mongoose.connection.db;
    const notifs = await db.collection('counselling_notifications').find({}).sort({ uploadDate: -1 }).toArray();
    console.log(`TOTAL: ${notifs.length}`);

    // Count duplicates by title + pdfUrl
    let seen = new Set();
    let dups = [];
    let pdfs = 0;

    for (let n of notifs) {
        if ((n.pdfUrl || '').toLowerCase().endsWith('.pdf')) pdfs++;

        let key = n.title.trim().toLowerCase();
        if (seen.has(key)) {
            dups.push(n.title);
        } else {
            seen.add(key);
        }
    }

    console.log(`PDFs: ${pdfs} | Non-PDFs: ${notifs.length - pdfs} | Duplicates by Title: ${dups.length}`);
    if (dups.length > 0) {
        console.log('Sample Duplicates:', dups.slice(0, 5));
    }

    // Check old notifications
    let old = notifs.filter(n => new Date(n.uploadDate) < new Date('2026-07-10'));
    console.log(`Older than 10th July: ${old.length}`);
    if (old.length > 0) {
        console.log('Sample Old:', old.slice(0, 3).map(n => ({ date: n.uploadDate, title: n.title })));
    }

    // Check missing today's notifications
    let today = notifs.filter(n => {
        const u = new Date(n.uploadDate);
        return u.getFullYear() === 2026 && u.getMonth() === 6 && u.getDate() === 20; // July 20th
    });
    console.log(`Today's notifications (July 20): ${today.length}`);
    if (today.length > 0) {
        console.log('Sample Today:', today.slice(0, 3).map(n => n.title));
    }

    process.exit(0);
});
