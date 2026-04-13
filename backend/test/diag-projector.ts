import 'dotenv/config';
import axios from 'axios';
import crypto from 'crypto';

const BASE_URL = process.env.TUYA_API_ENDPOINT || 'https://openapi.tuyaeu.com';
const CLIENT_ID = process.env.TUYA_CLIENT_ID || '';
const CLIENT_SECRET = process.env.TUYA_CLIENT_SECRET || '';

async function getAccessToken() {
    const t = Date.now().toString();
    const nonce = crypto.randomUUID();
    const path = '/v1.0/token?grant_type=1';
    const cHash = crypto.createHash('sha256').update('').digest('hex');
    const signStr = `${CLIENT_ID}${t}${nonce}GET\n${cHash}\n\n${path}`;
    const sign = crypto.createHmac('sha256', CLIENT_SECRET).update(signStr).digest('hex').toUpperCase();

    const res = await axios.get(`${BASE_URL}${path}`, {
        headers: { client_id: CLIENT_ID, sign, t, nonce, sign_method: 'HMAC-SHA256' }
    });
    return res.data.result.access_token;
}

async function tuyaRequest(token: string, method: 'GET' | 'POST', path: string, bodyObj?: object) {
    const t = Date.now().toString();
    const nonce = crypto.randomUUID();
    const body = bodyObj ? JSON.stringify(bodyObj) : '';
    const contentHash = crypto.createHash('sha256').update(body).digest('hex');
    const stringToSign = [method, contentHash, '', path].join('\n');
    const signStr = `${CLIENT_ID}${token}${t}${nonce}${stringToSign}`;
    const sign = crypto.createHmac('sha256', CLIENT_SECRET).update(signStr).digest('hex').toUpperCase();

    const res = await axios({
        method,
        url: `${BASE_URL}${path}`,
        headers: {
            client_id: CLIENT_ID,
            access_token: token,
            sign,
            t,
            nonce,
            sign_method: 'HMAC-SHA256',
            'Content-Type': 'application/json'
        },
        data: body || undefined
    });
    return res.data;
}

async function diagnoseProjector() {
    try {
        const token = await getAccessToken();
        const irId = process.env.TUYA_IR_DEVICE_ID;
        const remoteId = process.env.TUYA_PROJECTOR_REMOTE_ID;

        console.log(`Diagnosing Projector Remote: ${remoteId} on IR Blaster: ${irId}`);

        // 1. Get Device Info (to check category)
        console.log('\n--- Remote Device Info ---');
        const deviceInfo = await tuyaRequest(token, 'GET', `/v1.0/devices/${remoteId}`);
        console.log(JSON.stringify(deviceInfo, null, 2));

        // 2. Get Remote Keys (standard library remotes)
        console.log('\n--- Remote Standard Keys ---');
        const keys = await tuyaRequest(token, 'GET', `/v2.0/infrareds/${irId}/remotes/${remoteId}/keys`);
        console.log(JSON.stringify(keys, null, 2));

    } catch (err: any) {
        console.error('Error:', err.response?.data || err.message);
    }
}

diagnoseProjector();
