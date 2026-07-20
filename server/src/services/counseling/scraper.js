import axios from 'axios';
import * as cheerio from 'cheerio';
import crypto from 'crypto';
import fs from 'fs';
import https from 'https';
import path from 'path';
import { CounsellingNotification, ScraperLog } from '../../models/counseling.js';
import { sendPushNotifications } from './notifier.js';
import { parsePdfContent } from './pdfReader.js';

const KEA_BASE_URL = 'https://cetonline.karnataka.gov.in';
const START_URL = 'https://cetonline.karnataka.gov.in/kea/ugcet2026';

// ─── REJECT PATTERNS ─────────────────────────────────────────────────────────
// Only reject navigation links, truly irrelevant content, and old-year URLs.
const REJECT_TEXT = [
    // Pure navigation / UI chrome
    'ಮುಖಪುಟ', 'ಪ್ರವೇಶಗಳು', 'ಪತ್ರಾಗಾರ', 'ನೇಮಕಾತಿ', 'ವಿಕಸನ', 'ವಿದ್ಯಾರ್ಥಿ ಮಿತ್ರ',
    'ಇ ಮೇಲ್', 'ವೆಬ್ ಸೈಟ್',
    // PH / Physically Handicapped specific lists (separate process)
    'ಪಿಎಚ್ ಪಟ್ಟಿ', 'ph ಪಟ್ಟಿ', 'ph list',
    // Footer / social / policy junk
    'follow us', 'youtube', 'privacy policy', 'refund', 'product / service',
    // Old recruitment / non-counselling
    'recruitment', 'vacancy', 'vikasana', 'vidhyartimitra',
];

const REJECT_URL = [
    'ph_candidates',
    'archive.pdf', 'vikasana', 'privacy', 'refund',
    'cet2020', 'cet2021', 'cet2022', 'cet2023', 'cet2024', 'cet2025',
    'ugcet2025', 'ugcet2024', 'ugcet2023',
];

const CUTOFF_DATE = new Date('2026-07-10');

function resolveUrl(href) {
    if (!href) return null;
    if (href.startsWith('http')) return href;
    if (href.startsWith('/')) return KEA_BASE_URL + href;
    return KEA_BASE_URL + '/kea/' + href;
}

function isNotificationElement($el) {
    const id = ($el.attr('id') || '').trim();
    const cls = ($el.attr('class') || '').toLowerCase();
    const style = ($el.attr('style') || '').toLowerCase();

    if (id.startsWith('lnk')) return true;
    if (/^\d+$/.test(id)) return true;
    if (style.includes('color:black') || style.includes('color: black')) return true;
    if (cls.includes('note-text')) return true;
    return false;
}

function isRelevant(text, href) {
    if (!text || text.trim().length < 2) return false;

    const tl = text.toLowerCase();
    const ul = href ? href.toLowerCase() : '';

    for (const kw of REJECT_TEXT) {
        if (tl.includes(kw.toLowerCase())) return false;
    }
    for (const pat of REJECT_URL) {
        if (ul.includes(pat.toLowerCase())) return false;
    }

    // Reject if URL explicitly belongs to an old year (not 2026)
    if (/cet20(1[0-9]|2[0-5])|ugcet20(1[0-9]|2[0-5])/.test(ul)) return false;

    const combined = text + ' ' + ul;
    // Reject items with dates strictly before July 10, 2026
    const dateMatches = combined.match(/(\d{2})[-/](\d{2})[-/](\d{4})/g) || [];
    for (const dm of dateMatches) {
        const parts = dm.match(/(\d{2})[-/](\d{2})[-/](\d{4})/);
        if (!parts) continue;
        const d = parseInt(parts[1]), m = parseInt(parts[2]), y = parseInt(parts[3]);
        if (y < 2026) return false;
        if (y === 2026) {
            const notifDate = new Date(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
            if (notifDate < CUTOFF_DATE) return false;
        }
    }

    // Also check if the URL embeds an older date (like 0619 = June 19)
    const urlDate = extractUploadDateFromUrl(ul);
    if (urlDate && urlDate < CUTOFF_DATE) return false;

    return true;
}

// Extract a best-guess upload/publish date from a KEA PDF URL filename.
// KEA PDF filenames often embed dates like: 19072026, 0719, etc.
function extractUploadDateFromUrl(url) {
    if (!url) return null;

    // Pattern: DDMMYYYY in filename e.g. 19072026
    let m = url.match(/(\d{2})(0[1-9]|1[0-2])(202\d)(?=[^0-9]|$)/);
    if (m) {
        const d = new Date(`${m[3]}-${m[2]}-${m[1]}`);
        if (!isNaN(d)) return d;
    }

    // Pattern: 4-digit MMDD combo like _0719_ → assume July 19 2026
    m = url.match(/[/_-](\d{4})(?=[^0-9]|[._])/);
    if (m) {
        const raw = m[1];
        const mm = parseInt(raw.substring(0, 2));
        const dd = parseInt(raw.substring(2, 4));
        if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
            const d = new Date(`2026-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`);
            if (!isNaN(d)) return d;
        }
        // Try reversed interpretation: DDMM
        const mm2 = parseInt(raw.substring(2, 4));
        const dd2 = parseInt(raw.substring(0, 2));
        if (mm2 >= 1 && mm2 <= 12 && dd2 >= 1 && dd2 <= 31) {
            const d2 = new Date(`2026-${String(mm2).padStart(2, '0')}-${String(dd2).padStart(2, '0')}`);
            if (!isNaN(d2)) return d2;
        }
    }
    return null;
}

function extractDates(text) {
    const dateRegex = /\b(\d{1,2}(?:st|nd|rd|th)?[\s-]*(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[a-zA-Z]*[\s-]*\d{4}|\d{1,2}[-./]\d{1,2}[-./]\d{2,4})\b/ig;
    let dates = [...new Set(text.match(dateRegex) || [])];
    dates.sort((a, b) => {
        const pa = a.match(/(\d{1,2})[-./](\d{1,2})[-./](\d{2,4})/);
        const pb = b.match(/(\d{1,2})[-./](\d{1,2})[-./](\d{2,4})/);
        if (pa && pb) {
            return new Date(`${pa[3]}-${pa[2]}-${pa[1]}`) - new Date(`${pb[3]}-${pb[2]}-${pb[1]}`);
        }
        return 0;
    });
    return dates;
}

function detectCategory(t) {
    if (t.includes('neet')) return 'UGNEET';
    if (t.includes('ugcet') || t.includes('ಯುಜಿ ಸಿಇಟಿ') || t.includes('ಯುಜಿಸಿಇಟಿ')) return 'UGCET';
    return 'General';
}

function detectType(t) {
    if (t.includes('result') || t.includes('ಫಲಿತಾಂಶ')) return 'Result';
    if (t.includes('mock') || t.includes('ಅಣಕು')) return 'Mock Allotment';
    if (t.includes('seat matrix') || t.includes('ಸೀಟ್ ಮ್ಯಾಟ್ರಿಕ್ಸ್') || t.includes('ಸೀಟ್ ಮ್ಯಾಟ್ರಿಕ್')) return 'Seat Matrix';
    if (t.includes('cut') || t.includes('ಕಟ್-ಆಫ್')) return 'Cutoff';
    if (t.includes('extended') || t.includes('ವಿಸ್ತರಿತ')) return 'Extended Round';
    if (t.includes('2nd round') || t.includes('second round') || t.includes('ಎರಡನೇ ಸುತ್ತು') || t.includes('2 ನೇ ಸುತ್ತು')) return '2nd Round';
    if (t.includes('1st round') || t.includes('first round') || t.includes('ಮೊದಲ ಸುತ್ತು') || t.includes('1 ನೇ ಸುತ್ತು')) return '1st Round';
    return 'General';
}

function buildPushBody(title, pdfData, finalDates) {
    const t = title.toLowerCase();
    const isOptionEntry = t.includes('option') || t.includes('choice') || t.includes('ಆಯ್ಕೆ') || t.includes('ದಾಖಲು') || (pdfData && pdfData.hasOptionEntry);

    let body = (pdfData && pdfData.summary) ? pdfData.summary.substring(0, 80) : title.substring(0, 80);

    if (isOptionEntry) {
        body = `⚠️ OPTION/CHOICE ENTRY ALERT! Check immediately. ${body}`;
    }

    if (finalDates && finalDates.length > 0) {
        const dts = finalDates.length === 1
            ? `Deadline: ${finalDates[0]}`
            : `Starts: ${finalDates[0]} | Closes: ${finalDates[finalDates.length - 1]}`;
        body = `📌 ${dts}. ${body}`;
    }

    return body.substring(0, 150) + (body.length > 150 ? '...' : '');
}

function isHighPriority(title, notifType, pdfData) {
    const t = title.toLowerCase();
    return ['Result', 'Mock Allotment', 'Seat Matrix', 'Cutoff'].includes(notifType) ||
        t.includes('option') || t.includes('choice') || t.includes('ಆಯ್ಕೆ') || t.includes('ದಾಖಲು') ||
        t.includes('fee') || t.includes('reporting') ||
        (pdfData && pdfData.hasOptionEntry);
}

export async function runScraper() {
    const startTime = new Date();
    let pagesScanned = 0;
    let pdfsScanned = 0;
    let notificationsCreated = 0;
    let errors = [];

    try {
        let htmlData = null;

        try {
            const httpsAgent = new https.Agent({ family: 4 }); // Force IPv4 to prevent EAI_AGAIN
            const response = await axios.get(START_URL, {
                timeout: 45000,
                httpsAgent,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Connection': 'keep-alive'
                }
            });
            htmlData = response.data;
        } catch (err) {
            errors.push(`Failed to fetch KEA page via network: ${err.message}. Trying local fallback.`);
            try {
                const fallbackPaths = [
                    path.resolve(process.cwd(), '../kea_live.html'),
                    path.resolve(process.cwd(), 'kea_live.html'),
                    path.resolve(process.cwd(), '../../kea_live.html')
                ];
                let foundPath = null;
                for (let p of fallbackPaths) {
                    if (fs.existsSync(p)) { foundPath = p; break; }
                }
                if (foundPath) {
                    htmlData = fs.readFileSync(foundPath, 'utf8');
                } else {
                    errors.push('Local fallback kea_live.html not found!');
                    await new ScraperLog({ pagesScanned, pdfsScanned, notificationsCreated, errors, lastRun: startTime }).save();
                    return;
                }
            } catch (fsErr) {
                errors.push(`Local fallback error: ${fsErr.message}`);
                await new ScraperLog({ pagesScanned, pdfsScanned, notificationsCreated, errors, lastRun: startTime }).save();
                return;
            }
        }

        pagesScanned = 1;
        const $ = cheerio.load(htmlData);

        const elements = $('a, span, p, div, marquee, li, td').toArray().reverse();

        let seenTexts = new Set();

        for (const el of elements) {
            const $el = $(el);

            if (!isNotificationElement($el)) continue;

            const text = $el.text().trim().replace(/\s+/g, ' ');
            if (text.length < 2) continue;

            // Prevent duplicate alert vs link for nested elements (like span inside a)
            if (el.tagName !== 'a' && $el.closest('a').length > 0) continue;

            const rawHref = $el.attr('href') || null;
            const href = resolveUrl(rawHref);

            // Deduplicate if we saw exact same text + url on this run
            const normText = text.toLowerCase() + (href ? href.toLowerCase() : '');
            if (seenTexts.has(normText)) continue;

            if (!isRelevant(text, href)) continue;

            seenTexts.add(normText);

            if (href && href.toLowerCase().endsWith('.pdf')) {
                pdfsScanned++;
                try {
                    const created = await processPdfLink(text, href, START_URL);
                    if (created) notificationsCreated++;
                } catch (e) {
                    errors.push(`PDF error [${text.substring(0, 40)}]: ${e.message}`);
                }
            } else {
                try {
                    const created = await processNonPdfLink(text, href, rawHref, START_URL);
                    if (created) notificationsCreated++;
                } catch (e) {
                    errors.push(`Link error [${text.substring(0, 40)}]: ${e.message}`);
                }
            }
        }
    } catch (err) {
        errors.push(`Critical Scraper Error: ${err.message}`);
    }

    try {
        await new ScraperLog({ pagesScanned, pdfsScanned, notificationsCreated, errors, lastRun: startTime }).save();
    } catch (e) {
        console.error('Failed to save scraper log', e);
    }
}

async function processPdfLink(title, pdfUrl, sourceUrl) {
    const hash = crypto.createHash('sha256').update(title + pdfUrl).digest('hex');
    if (await CounsellingNotification.findOne({ documentHash: hash }).lean()) return false;

    const t = title.toLowerCase();
    const category = detectCategory(t);
    const notificationType = detectType(t);
    const pdfData = await parsePdfContent(pdfUrl);

    const finalDates = (pdfData && pdfData.dates && pdfData.dates.length > 0) ? pdfData.dates : extractDates(title);
    const summary = (pdfData && pdfData.summary) ? pdfData.summary : `New KEA update: ${title}`;

    // Try to parse actual publish date from URL filename for correct date ordering
    const urlDate = extractUploadDateFromUrl(pdfUrl);
    const uploadDate = urlDate || new Date();

    const notif = await new CounsellingNotification({
        title, summary,
        description: pdfData && pdfData.text ? pdfData.text.split('\n').slice(0, 10).join('\n') : '',
        category, pdfUrl, sourceUrl, notificationType,
        uploadDate, documentHash: hash
    }).save();

    const pushTitle = isHighPriority(title, notificationType, pdfData) ? '🚨 KEA ALERT' : 'ℹ️ KEA UPDATE';
    const body = buildPushBody(title, pdfData, finalDates);
    await sendPushNotifications(pushTitle, body, { id: notif._id, url: pdfUrl });
    return true;
}

async function processNonPdfLink(title, linkUrl, rawHref, sourceUrl) {
    const key = title + (linkUrl || sourceUrl);
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    if (await CounsellingNotification.findOne({ documentHash: hash }).lean()) return false;

    const t = title.toLowerCase();
    const category = detectCategory(t);
    const notificationType = detectType(t);
    const finalDates = extractDates(title);
    const urlDate = extractUploadDateFromUrl(linkUrl);
    const uploadDate = urlDate || new Date();

    const notif = await new CounsellingNotification({
        title,
        summary: title,
        description: rawHref && rawHref !== '#' ? `Visit: ${linkUrl}` : 'Text notification from KEA portal.',
        category, notificationType, sourceUrl,
        pdfUrl: (linkUrl && linkUrl !== sourceUrl) ? linkUrl : null,
        uploadDate, documentHash: hash, isRead: false
    }).save();

    const highPri = isHighPriority(title, notificationType, null);
    const pushTitle = highPri ? '🚨 KEA ALERT' : 'ℹ️ KEA UPDATE';
    const body = buildPushBody(title, null, finalDates);
    await sendPushNotifications(pushTitle, body, { id: notif._id, url: linkUrl || sourceUrl });
    return true;
}
