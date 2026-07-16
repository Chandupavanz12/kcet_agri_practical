import cron from 'node-cron';
import { runScraper } from './scraper.js';

let isScraping = false;
export function initCounsellingCron() {
    console.log('[Cron] Initializing KEA Counselling Scraper...');
    // Run every minute
    cron.schedule('* * * * *', async () => {
        if (isScraping) {
            console.log('[Cron] Previous job still running, skipping this minute.');
            return;
        }

        console.log('[Cron] Running KEA Scraper job...');
        isScraping = true;
        try {
            await runScraper();
        } catch (err) {
            console.error('[Cron] Scraper job failed', err);
        } finally {
            isScraping = false;
        }
    });
}
