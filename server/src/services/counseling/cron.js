import cron from 'node-cron';
import { runScraper } from './scraper.js';

export function initCounsellingCron() {
    console.log('[Cron] Initializing KEA Counselling Scraper...');
    // Run every minute
    cron.schedule('* * * * *', async () => {
        console.log('[Cron] Running KEA Scraper job...');
        try {
            await runScraper();
        } catch (err) {
            console.error('[Cron] Scraper job failed', err);
        }
    });
}
