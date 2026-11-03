const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

process.chdir(path.join(__dirname, '..'));

async function runTest() {
  console.log('--- Testing LINE Webhook Integration ---');
  
  const dbFile = path.join(__dirname, '..', 'data', 'db_port3000.json');
  console.log('1. DB File exists:', fs.existsSync(dbFile));
  
  const rawDb = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
  const channelSecret = "5a3c837da6ba0045ed0073e06cc45de6";
  const testUserId = "U493d0e71d8e3f42c80af850d3ea53bca"; // Real user LINE userId from live webhook log
  
  const payload = {
    destination: "U2194666a693e00291bea284af3ccaa3d",
    events: [
      {
        type: "message",
        message: {
          type: "text",
          id: "test-msg-" + Date.now(),
          text: "101"
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

  console.log('2. Sending simulated webhook POST with valid HMAC signature...');
  try {
    const res = await fetch('http://127.0.0.1:3000/api/line/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-line-signature': signature
      },
      body: rawBody
    });
    console.log('   Response Status:', res.status);
    const json = await res.json();
    console.log('   Response Body:', json);
  } catch (e) {
    console.error('   Fetch Error:', e.message);
  }

  // 3. Inspect db_port3000.json
  const updatedDb = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
  const tenants = updatedDb.pakdee_dev_tenants || updatedDb.tenants || [];
  const bound = tenants.find(t => t.lineUserId === testUserId);
  console.log('3. Bound Tenant in DB file:', bound ? `SUCCESS! Room: ${bound.roomNumber}, Name: ${bound.fullName}, LineID: ${bound.lineUserId}` : 'FAILED: Not found');

  const rooms = updatedDb.pakdee_dev_rooms || updatedDb.rooms || [];
  const r101 = rooms.find(r => r.roomNumber === '101');
  console.log('4. Room 101 in DB file:', r101?.status, 'Tenant LineUser:', r101?.currentTenant?.lineUserId);
}

runTest();
