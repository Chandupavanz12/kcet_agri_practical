import axios from 'axios';
import * as cheerio from 'cheerio';
import 'dotenv/config';

const START_URL = 'https://cetonline.karnataka.gov.in/kea/ugcet2026';

const rejectKeywords = [
    'Recruitment', 'Vacancy', 'Tender', 'Railway', 'Job', 'Employment', 'KPSC', 'Other Exam',
    '2022', '2023', '2024', '2025',
    'Home', 'About Us', 'Contact', 'RTI', 'Sitemap', 'Tenders', 'Gallery', 'Acts',
    'Rules', 'Policies', 'Feedback', 'Help', 'Disclaimer',
    'nic', 'ಮುಖಪುಟ', 'ಪ್ರವೇಶಗಳು', 'ಪತ್ರಾಗಾರ', 'ನೇಮಕಾತಿ', 'ವಿಕಸನ', 'ವಿದ್ಯಾರ್ಥಿ ಮಿತ್ರ', 'privacy', 'refund', 'terms',
    'ph_candidates', 'ph candidates', 'ಪಿಎಚ್ ಪಟ್ಟಿ', 'ph ಪಟ್ಟಿ', 'physically handicapped'
];

function isRelevant(text, href) {
    if (!text || text.trim().length === 0) return false;
    const t = text.toLowerCase();
    const u = href ? href.toLowerCase() : '';
    for (let reject of rejectKeywords) {
        if (t.includes(reject.toLowerCase()) || u.includes(reject.toLowerCase())) return false;
    }
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

console.log('Fetching KEA page...');
try {
    const response = await axios.get(START_URL, {
        timeout: 45000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    console.log('Fetched successfully. Status:', response.status);
    const $ = cheerio.load(response.data);
    const elements = $('a[id^="lnk"], a[id^="1"], a.note-text').toArray();
    console.log(`Found ${elements.length} notification-like anchor elements`);

    let kept = [];
    let rejected = [];

    for (const el of elements) {
        const $el = $(el);
        const cls = $el.attr('class') || '';
        if (cls.includes('dropdown-item') || cls.includes('nav-link')) continue;
        const text = $el.text().trim().replace(/\s+/g, ' ');
        const href = $el.attr('href') || null;
        const relevant = isRelevant(text, href);
        if (relevant) {
            kept.push({ text: text.substring(0, 80), href: href ? href.substring(0, 60) : null, isPdf: href && href.endsWith('.pdf') });
        } else {
            rejected.push(text.substring(0, 60));
        }
    }

    console.log('\n=== KEPT (' + kept.length + ') ===');
    kept.forEach(k => console.log((k.isPdf ? '[PDF]' : '[LNK]'), k.text, '|', k.href));
    console.log('\n=== REJECTED (' + rejected.length + ') ===');
    rejected.slice(0, 10).forEach(r => console.log(' -', r));
} catch (e) {
    console.error('FAIL:', e.message);
}
