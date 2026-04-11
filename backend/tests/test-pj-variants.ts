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

async function tuyaRequest(token: string, method: 'POST', path: string, bodyObj?: object) {
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

async function testVariousProjectorEndpoints() {
    try {
        const token = await getAccessToken();
        const irId = process.env.TUYA_IR_DEVICE_ID;
        const remoteId = process.env.TUYA_PROJECTOR_REMOTE_ID;

        const endpoints = [
            { path: `/v2.0/infrareds/${irId}/remotes/${remoteId}/command`, body: { code: "PowerOn" } },
            { path: `/v2.0/infrareds/${irId}/remotes/${remoteId}/command`, body: { key: "PowerOn" } },
            { path: `/v1.0/infrareds/${irId}/remotes/${remoteId}/command`, body: { code: "PowerOn" } },
            { path: `/v1.0/infrareds/${irId}/remotes/${remoteId}/command`, body: { key: "PowerOn" } },
            { path: `/v1.0/infrareds/${irId}/remotes/${remoteId}/command`, body: { key_id: "5907" } },
            { path: `/v2.0/infrareds/${irId}/categories/6/remotes/${remoteId}/command`, body: { code: "PowerOn" } }
        ];

        for (const e of endpoints) {
            console.log(`Testing: ${e.path} with ${JSON.stringify(e.body)}`);
            const res = await tuyaRequest(token, 'POST', e.path, e.body);
            console.log(` - Result: ${res.code} (${res.msg}) ${res.success ? '✅ SUCCESS' : '❌ FAILED'}`);
            if (res.success) break;
            await new Promise(r => setTimeout(r, 1000));
        }

    } catch (err: any) {
        console.error('Error:', err.response?.data || err.message);
    }
}

testVariousProjectorEndpoints();
