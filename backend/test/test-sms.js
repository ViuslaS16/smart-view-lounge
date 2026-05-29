// test-sms.js — Quick SMS test for SMSLenz API
// Run with: node test/test-sms.js

require('dotenv').config();
const axios = require('axios');

function normalizeMobile(number) {
  const digits = number.replace(/\D/g, '');
  if (digits.startsWith('94') && digits.length === 11) return digits;
  if (digits.startsWith('0')  && digits.length === 10) return '94' + digits.slice(1);
  return digits;
}

async function testSMS() {
  const userId   = process.env.SMSLENZ_USER_ID;
  const apiKey   = process.env.SMSLENZ_API_KEY;
  const senderId = process.env.SMSLENZ_SENDER_ID || '';
  const to       = '0786714988';
  const contact  = normalizeMobile(to);
  const message  = 'SmartView Lounge: SMS service test successful! ✅';

  console.log('─────────────────────────────────');
  console.log('SMSLenz Test');
  console.log('─────────────────────────────────');
  console.log(`User ID   : ${userId}`);
  console.log(`API Key   : ${apiKey}`);
  console.log(`Sender ID : ${senderId}`);
  console.log(`To        : ${contact}  (original: ${to})`);
  console.log(`Message   : ${message}`);
  console.log('─────────────────────────────────');

  try {
    const response = await axios.post('https://www.smslenz.lk/api/send-sms', {
      user_id:   userId,
      api_key:   apiKey,
      sender_id: senderId,
      contact,
      message,
    });

    console.log('✅ SUCCESS!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (err) {
    console.error('❌ FAILED!');
    if (err.response) {
      console.error('Status :', err.response.status);
      console.error('Body   :', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('Error  :', err.message);
    }
  }
}

testSMS();
