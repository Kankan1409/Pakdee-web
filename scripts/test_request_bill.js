const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

process.chdir(path.join(__dirname, '..'));

async function testRequestBill() {
  console.log('--- Testing "ขอบิล" from Bound Room 101 Tenant ---');
  
  const channelSecret = "5a3c837da6ba0045ed0073e06cc45de6";
  const testUserId = "U493d0e71d8e3f42c80af850d3ea53bca";
  
  const payload = {
    destination: "U2194666a693e00291bea284af3ccaa3d",
    events: [
      {
        type: "message",
        message: {
          type: "text",
          id: "test-msg-bill-" + Date.now(),
          text: "ขอบิล"
        },
        timestamp: Date.now(),
        source: {
          type: "user",
          userId: testUserId
        },
        replyToken: "test_reply_token_" + Date.now(),
        mode: "active"
      }
    ]
  };

  const rawBody = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', channelSecret)
    .update(rawBody)
    .digest('base64');

  const res = await fetch('http://127.0.0.1:3000/api/line/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-line-signature': signature
    },
    body: rawBody
  });

  console.log('Webhook Response Status:', res.status);
  const json = await res.json();
  console.log('Webhook Response Body:', json);
}

testRequestBill();
