import * as cheerio from 'cheerio';
import fs from 'fs';
const html = fs.readFileSync('../kea_live.html', 'utf8');
const $ = cheerio.load(html);
console.log('Elements in kea_live.html:', $('a').length);
