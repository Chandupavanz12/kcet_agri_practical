import axios from 'axios';
import * as cheerio from 'cheerio';
import crypto from 'crypto';
import { CounsellingNotification, ScraperLog } from '../../models/counseling.js';
import { sendPushNotifications } from './notifier.js';
import { parsePdfContent } from './pdfReader.js';

const KEA_BASE_URL = 'https://cetonline.karnataka.gov.in';
const START_URL = 'https://cetonline.karnataka.gov.in/kea/ugcet2026';

const allowKeywords = [
    'UGCET', 'UG NEET', 'NEET Counselling', 'Medical Counselling', 'Seat Matrix',
    'Mock Allotment', 'Cutoff', 'Option Entry', 'Verification', 'Admission Order',
    'Round 1', 'Round 2', 'Extended Round', 'Document Verification', 'Fee Payment',
    'Counselling Schedule', 'Result', 'Admission'
];

const rejectKeywords = [
    'Recruitment', 'Vacancy', 'Tender', 'Railway', 'Job', 'Employment', 'KPSC', 'Other Exam'
];

function isRelevant(text) {
    const t = text.toLowerCase();
    for (let reject of rejectKeywords) {
        if (t.includes(reject.toLowerCase())) return false;
    }
    for (let allow of allowKeywords) {
        if (t.includes(allow.toLowerCase())) return true;
    }
    return false;
}

function resolveUrl(href) {
    if (!href) return null;
    if (href.startsWith('http')) return href;
    if (href.startsWith('/')) return KEA_BASE_URL + href;
    return KEA_BASE_URL + '/kea/' + href;
}

export async function runScraper() {
    const startTime = new Date();
    let pagesScanned = 0;
    let pdfsScanned = 0;
    let notificationsCreated = 0;
    let errors = [];

    const visited = new Set();
    const queue = [START_URL];

    try {
        while (queue.length > 0 && pagesScanned < 50) { // Limit depth
            const currentUrl = queue.shift();
            if (visited.has(currentUrl)) continue;
            visited.add(currentUrl);

            try {
                const response = await axios.get(currentUrl, { timeout: 15000 });
                pagesScanned++;
                const $ = cheerio.load(response.data);

                $('a').each((i, el) => {
                    const text = $(el).text().trim().replace(/\\s+/g, ' ');
                    const href = resolveUrl($(el).attr('href'));

                    if (!href) return;

                    if (href.toLowerCase().endsWith('.pdf')) {
                        if (isRelevant(text)) {
                            pdfsScanned++;
                            processPdfLink(text, href, currentUrl).then(created => {
                                if (created) notificationsCreated++;
                            }).catch(e => errors.push(e.message));
                        }
                    } else if (href.includes('kea') || href.includes('ugcet2026')) {
                        // Only queue internal links loosely matching our target domain
                        if (!visited.has(href)) {
                            queue.push(href);
                        }
                    }
                });

            } catch (err) {
                errors.push(`Failed to fetch ${currentUrl}: ${err.message}`);
            }
        }
    } catch (err) {
        errors.push(`Critical Scraper Error: ${err.message}`);
    }

    try {
        await new ScraperLog({
            pagesScanned,
            pdfsScanned,
            notificationsCreated,
            errors,
            lastRun: startTime
        }).save();
    } catch (e) {
        console.error('Failed to save scraper log', e);
    }
}

async function processPdfLink(title, pdfUrl, sourceUrl) {
    const hashObj = crypto.createHash('sha256');
    hashObj.update(title + pdfUrl);
    const documentHash = hashObj.digest('hex');

    const existing = await CounsellingNotification.findOne({ documentHash }).lean();
    if (existing) return false; // Duplicate prevention

    let category = 'General';
    let notificationType = 'General';
    const t = title.toLowerCase();
    if (t.includes('ugcet')) category = 'UGCET';
    if (t.includes('neet')) category = 'UGNEET';

    if (t.includes('result')) notificationType = 'Result';
    else if (t.includes('mock')) notificationType = 'Mock Allotment';
    else if (t.includes('seat matrix')) notificationType = 'Seat Matrix';
    else if (t.includes('cutoff')) notificationType = 'Cutoff';

    // Read PDF asynchronously
    const pdfData = await parsePdfContent(pdfUrl);

    let summary = pdfData?.summary || `New update released on KEA: ${title}`;

    const notif = await new CounsellingNotification({
        title,
        summary,
        description: pdfData?.text ? pdfData.text.split('\n').slice(0, 10).join('\n') : '',
        category,
        pdfUrl,
        sourceUrl,
        notificationType,
        uploadDate: new Date(),
        documentHash
    }).save();

    // Determine priority
    let priority = 'NORMAL PRIORITY';
    if (['Result', 'Mock Allotment', 'Seat Matrix', 'Cutoff'].includes(notificationType) ||
        t.includes('fee payment') || t.includes('option entry') || t.includes('reporting')) {
        priority = 'HIGH PRIORITY';
    }

    // Send push notification
    let body = summary.substring(0, 100);
    if (body.length === 100) body += '...';

    let pushTitle = priority === 'HIGH PRIORITY' ? '🚨 KEA ALERT' : 'ℹ️ KEA UPDATE';
    if (priority === 'HIGH PRIORITY') {
        pushTitle += ': ' + title.substring(0, 30);
    }

    await sendPushNotifications(pushTitle, body, { id: notif._id, url: pdfUrl });
    return true;
}
