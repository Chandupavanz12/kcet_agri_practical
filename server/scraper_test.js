import * as cheerio from 'cheerio';
import fs from 'fs';
const html = fs.readFileSync('kea_live.html', 'utf8');
const $ = cheerio.load(html);
$('a, span, p, div, li, td').each((i, el) => {
    const $el = $(el);
    const id = ($el.attr('id') || '').trim();
    const cls = ($el.attr('class') || '').toLowerCase();
    const style = ($el.attr('style') || '').toLowerCase();
    let isNotif = false;
    if (id.startsWith('lnk')) isNotif = true;
    if (/^\d+$/.test(id)) isNotif = true;
    if (style.includes('color:black') || style.includes('color: black')) isNotif = true;
    if (cls.includes('note-text')) isNotif = true;
    if (isNotif) {
        console.log($el[0].name, 'id:', id, 'class:', cls, 'text:', $el.text().substring(0, 40).replace(/\n/g, ' '));
    }
});
