import axios from 'axios';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

export async function parsePdfContent(pdfUrl) {
    try {
        const response = await axios.get(pdfUrl, {
            responseType: 'arraybuffer',
            timeout: 45000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (HTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const data = await pdfParse(response.data);
        const text = data.text;

        // AI Summary logic or basic regex extraction for dates
        const dateRegex = /\b(\d{1,2}(?:st|nd|rd|th)?[\s-]*(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[a-zA-Z]*[\s-]*\d{4}|\d{1,2}[-./]\d{1,2}[-./]\d{2,4})\b/ig;
        let extractedDates = [...new Set(text.match(dateRegex) || [])];
        extractedDates.sort((a, b) => {
            const pa = a.match(/(\d{1,2})[-./](\d{1,2})[-./](\d{2,4})/);
            const pb = b.match(/(\d{1,2})[-./](\d{1,2})[-./](\d{2,4})/);
            if (pa && pb) {
                const da = new Date(`${pa[3]}-${pa[2]}-${pa[1]}`);
                const db = new Date(`${pb[3]}-${pb[2]}-${pb[1]}`);
                return da - db;
            }
            return 0;
        });

        // Fallback simple summary based on initial paragraphs
        let summary = text.split('\n').map(t => t.trim()).filter(t => t.length > 20).slice(0, 3).join(' ');

        const tLower = text.toLowerCase();
        const hasOptionEntry = tLower.includes('option') || tLower.includes('choice') || tLower.includes('ಆಯ್ಕೆ') || tLower.includes('ದಾಖಲು');

        return {
            text,
            dates: extractedDates,
            hasOptionEntry,
            summary: summary.substring(0, 300) + (summary.length > 300 ? '...' : '')
        };
    } catch (err) {
        console.error(`Failed to parse PDF from ${pdfUrl}:`, err);
        return null;
    }
}
