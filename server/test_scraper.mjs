import axios from 'axios';
import https from 'https';
const START_URL = 'https://cetonline.karnataka.gov.in/kea/ugcet2026';
(async () => {
    try {
        const httpsAgent = new https.Agent({ family: 4 });
        const res = await axios.get(START_URL, { timeout: 10000, httpsAgent });
        console.log('Success, response length:', res.data.length);
    } catch (e) {
        console.error('Error:', e.message);
    }
})();
