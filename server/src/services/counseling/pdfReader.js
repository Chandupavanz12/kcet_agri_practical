import axios from 'axios';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

export async function parsePdfContent(pdfUrl) {
    try {
        const response = await axios.get(pdfUrl, { responseType: 'arraybuffer', timeout: 10000 });
        const data = await pdfParse(response.data);
        const text = data.text;

        // AI Summary logic or basic regex extraction for dates
        const dateRegex = /\b(\d{1,2}(?:st|nd|rd|th)?[\s-]*(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[a-zA-Z]*[\s-]*\d{4}|\d{1,2}[-./]\d{1,2}[-./]\d{2,4})\b/ig;
        const extractedDates = [...new Set(text.match(dateRegex))];

        // Fallback simple summary based on initial paragraphs
        let summary = text.split('\n').map(t => t.trim()).filter(t => t.length > 20).slice(0, 3).join(' ');

        return {
            text,
            dates: extractedDates,
            summary: summary.substring(0, 300) + (summary.length > 300 ? '...' : '')
        };
    } catch (err) {
        console.error(`Failed to parse PDF from ${pdfUrl}:`, err);
        return null;
    }
}
