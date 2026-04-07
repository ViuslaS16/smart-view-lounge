const axios = require('axios');
async function test() {
  try {
    const res = await axios.post('https://www.smslenz.lk/api/send-sms', {
      user_id: "1566",
      api_key: "5d638a57-f817-4f8b-8493-96ed333469ec",
      sender_id: "",
      contact: "0771234567",
      message: "Testing 123 from CLI"
    });
    console.log("Success:", res.data);
  } catch (err) {
    if (err.response) {
      console.log("Error status:", err.response.status);
      console.log("Error data:", err.response.data);
    } else {
      console.log("Error:", err.message);
    }
  }
}
test();
