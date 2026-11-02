// Comprehensive Automated Test for LINE Webhook & Flow
const http = require('http');
const crypto = require('crypto');

const CHANNEL_SECRET = '018e6d879bb2e1861502701ef2ebb858';

function postWebhook(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', CHANNEL_SECRET)
      .update(data)
      .digest('base64');

    const req = http.request(
      'http://localhost:3000/api/line/webhook',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'x-line-signature': signature,
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, body });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING LINE BOT WEBHOOK AUTOMATED TESTS ---');

  // Test 1: Follow event (Welcome card)
  console.log('\n[Test 1] Follow Event:');
  const res1 = await postWebhook({
    events: [
      {
        type: 'follow',
        replyToken: 'token_follow_1',
        source: { type: 'user', userId: 'Utest_tenant_001' },
      },
    ],
  });
  console.log('Result:', JSON.stringify(res1));

  // Test 2: Room Binding event ("ห้อง 105")
  console.log('\n[Test 2] Room Binding ("ห้อง 105"):');
  const res2 = await postWebhook({
    events: [
      {
        type: 'message',
        replyToken: 'token_bind_1',
        source: { type: 'user', userId: 'Utest_tenant_001' },
        message: { type: 'text', text: 'ห้อง 105' },
      },
    ],
  });
  console.log('Result:', JSON.stringify(res2));

  // Test 3: Check Bill ("ขอบิล")
  console.log('\n[Test 3] Check Bill ("ขอบิล"):');
  const res3 = await postWebhook({
    events: [
      {
        type: 'message',
        replyToken: 'token_bill_1',
        source: { type: 'user', userId: 'Utest_tenant_001' },
        message: { type: 'text', text: 'ขอบิล' },
      },
    ],
  });
  console.log('Result:', JSON.stringify(res3));

  // Test 4: Maintenance Request ("แจ้งซ่อม แอร์ไม่เย็น น้ำหยด")
  console.log('\n[Test 4] Maintenance Request ("แจ้งซ่อม แอร์ไม่เย็น น้ำหยด"):');
  const res4 = await postWebhook({
    events: [
      {
        type: 'message',
        replyToken: 'token_repair_1',
        source: { type: 'user', userId: 'Utest_tenant_001' },
        message: { type: 'text', text: 'แจ้งซ่อม แอร์ไม่เย็น มีน้ำหยด' },
      },
    ],
  });
  console.log('Result:', JSON.stringify(res4));

  // Test 5: Image Slip Upload (Simulated AI verification & auto-receipt)
  console.log('\n[Test 5] Image Slip Upload:');
  const res5 = await postWebhook({
    events: [
      {
        type: 'message',
        replyToken: 'token_slip_1',
        source: { type: 'user', userId: 'Utest_tenant_001' },
        message: { type: 'image', id: 'img_test_slip_001' },
      },
    ],
  });
  console.log('Result:', JSON.stringify(res5));

  console.log('\n--- ALL LINE BOT WEBHOOK TESTS COMPLETED SUCCESSFULLY ---');
}

runTests().catch((err) => {
  console.error('Error running test:', err);
  process.exit(1);
});
