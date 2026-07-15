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
    'Counselling Schedule', 'Result', 'Admission', '1st round', '2nd round', '2nd extended round',
    'ಮೊದಲ ಸುತ್ತಿನ', 'ಎರಡನೇ ಸುತ್ತಿನ', 'ಕಟ್-ಆಫ್', 'ಅಣಕು ಫಲಿತಾಂಶದ', '1 ನೇ ಸುತ್ತಿನ', '2 ನೇ ಸುತ್ತಿನ', 'ವಿಸ್ತರಿತ ಸುತ್ತಿನ',
    'ಸೀಟು ಹಂಚಿಕೆ', 'ಫಲಿತಾಂಶ', 'ಸೂಚನೆ', 'ತಾತ್ಕಾಲಿಕ'
];

const rejectKeywords = [
    'Recruitment', 'Vacancy', 'Tender', 'Railway', 'Job', 'Employment', 'KPSC', 'Other Exam',
    '2022', '2023', '2024', '2025',
    'Home', 'About Us', 'Contact', 'RTI', 'Sitemap', 'Tenders', 'Gallery', 'Acts',
    'Rules', 'Policies', 'Feedback', 'Help', 'Disclaimer'
];

function isRelevant(text, href) {
    const t = text.toLowerCase();
    const u = href ? href.toLowerCase() : '';
    for (let reject of rejectKeywords) {
        if (t.includes(reject.toLowerCase()) || u.includes(reject.toLowerCase())) return false;
    }

    // Strict block for dates older than July 10, 2026
    const combinedStr = text + ' ' + (href || '');
    const dateMatch = combinedStr.match(/(\d{2})[-/]?(\d{2})[-/]?(\d{4})/);
    if (dateMatch) {
        const d = parseInt(dateMatch[1]);
        const m = parseInt(dateMatch[2]);
        const y = parseInt(dateMatch[3]);
        if (y < 2026) return false;
        if (y === 2026) {
            if (m < 7) return false;
            if (m === 7 && d < 10) return false;
        }
    }

    return true;
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

                const elements = $('a, marquee').toArray().reverse(); // Reverse to process bottom up (top becomes newest)
                for (const el of elements) {
                    const $el = $(el);
                    const cls = $el.attr('class') || '';
                    // Exclude generic navbar/dropdown menus (these leak random KEA exams)
                    if (cls.includes('dropdown-item') || cls.includes('nav-link')) continue;

                    const text = $el.text().trim().replace(/\s+/g, ' ');
                    const href = resolveUrl($el.attr('href'));

                    if (isRelevant(text, href)) {
                        if (href && href.toLowerCase().endsWith('.pdf')) {
                            pdfsScanned++;
                            try {
                                const created = await processPdfLink(text, href, currentUrl);
                                if (created) notificationsCreated++;
                            } catch (e) {
                                errors.push(e.message);
                            }
                        } else {
                            try {
                                const linkUrl = href || currentUrl;
                                const created = await processNonPdfLink(text, linkUrl, currentUrl);
                                if (created) notificationsCreated++;
                            } catch (e) {
                                errors.push(e.message);
                            }
                        }
                    }
                }

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

    if (t.includes('result') || t.includes('ಫಲಿತಾಂಶ')) notificationType = 'Result';
    else if (t.includes('mock') || t.includes('ಅಣಕು')) notificationType = 'Mock Allotment';
    else if (t.includes('seat matrix') || t.includes('ಸೀಟು ಹಂಚಿಕೆ')) notificationType = 'Seat Matrix';
    else if (t.includes('cutoff') || t.includes('ಕಟ್-ಆಫ್')) notificationType = 'Cutoff';
    else if (t.includes('1st round') || t.includes('1 ನೇ ಸುತ್ತಿನ') || t.includes('ಮೊದಲ ಸುತ್ತಿನ')) notificationType = '1st Round';
    else if (t.includes('2nd round') || t.includes('2 ನೇ ಸುತ್ತಿನ') || t.includes('ಎರಡನೇ ಸುತ್ತಿನ')) notificationType = '2nd Round';
    else if (t.includes('extended round') || t.includes('ವಿಸ್ತರಿತ ಸುತ್ತಿನ')) notificationType = 'Extended Round';

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

async function processNonPdfLink(title, linkUrl, sourceUrl) {
    const hashObj = crypto.createHash('sha256');
    hashObj.update(title + linkUrl);
    const documentHash = hashObj.digest('hex');

    const existing = await CounsellingNotification.findOne({ documentHash }).lean();
    if (existing) return false;

    let category = 'General';
    let notificationType = 'General';
    const t = title.toLowerCase();
    if (t.includes('ugcet')) category = 'UGCET';
    else if (t.includes('ugneet') || t.includes('ug neet')) category = 'UGNEET';

    if (t.includes('mock allotment') || t.includes('ಅಣಕು')) notificationType = 'Mock Allotment';
    else if (t.includes('seat matrix') || t.includes('ಸೀಟು ಹಂಚಿಕೆ')) notificationType = 'Seat Matrix';
    else if (t.includes('cutoff') || t.includes('ಕಟ್-ಆಫ್')) notificationType = 'Cutoff';
    else if (t.includes('result') || t.includes('ಫಲಿತಾಂಶ')) notificationType = 'Result';
    else if (t.includes('1st round') || t.includes('1 ನೇ ಸುತ್ತಿನ') || t.includes('ಮೊದಲ ಸುತ್ತಿನ')) notificationType = '1st Round';
    else if (t.includes('2nd round') || t.includes('2 ನೇ ಸುತ್ತಿನ') || t.includes('ಎರಡನೇ ಸುತ್ತಿನ')) notificationType = '2nd Round';
    else if (t.includes('extended round') || t.includes('ವಿಸ್ತರಿತ ಸುತ್ತಿನ')) notificationType = 'Extended Round';

    const notif = await new CounsellingNotification({
        title,
        summary: 'Important Web Link Notification',
        description: 'Please visit the linked webpage for more details directly from KEA.',
        category,
        notificationType,
        sourceUrl,
        pdfUrl: linkUrl,
        documentHash,
        isRead: false
    });
    await notif.save();

    await sendPushNotifications(`🚨 KEA ALERT: ${notificationType}`, title, { type: 'counseling_notification', id: notif.id, url: linkUrl });
    return true;
}
