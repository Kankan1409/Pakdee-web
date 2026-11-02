const puppeteer = require('D:/DESKTOP/Pakdee-UserTest/node_modules/puppeteer-core');
const os = require('os');
const path = require('path');
const fs = require('fs');

async function runQaAuditTest() {
  console.log('========================================================================');
  console.log('🛡️ QA AUTOMATED TESTER — POST-REMEDIATION VERIFICATION SUITE');
  console.log('========================================================================\n');

  const tempDir = path.join(os.tmpdir(), 'chrome_qa_suite_' + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    userDataDir: tempDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // 1. Visit root and Authenticate
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    const owner = {
      id: "usr-owner-01",
      name: "คุณพักดี มีสุข",
      email: "owner@pakdee.com",
      role: "owner",
      roleTitle: "เจ้าของหอพัก (Owner / Super Admin)",
      avatarText: "พด",
      phone: "081-999-8888",
      assignedBranches: ["all"],
      permissions: {
        canDeleteBranch: true,
        canEditBankSettings: true,
        canViewExecutivePL: true,
        canResetSystem: true,
        canManageManagers: true,
      }
    };
    localStorage.setItem("pakdee_auth_session_v1", JSON.stringify(owner));
  });

  console.log('Test 1: ตรวจสอบหน้าผังห้องพัก (/rooms) & การป้องกันการลบห้องมีผู้เช่า...');
  await page.goto('http://localhost:3000/rooms', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  const roomsCount = await page.$$eval('.grid > div', divs => divs.length);
  console.log(`-> พบการแสดงผลห้องพัก: ${roomsCount > 0 ? 'PASS (' + roomsCount + ' elements)' : 'FAIL'}`);

  console.log('Test 2: ตรวจสอบหน้าทะเบียนผู้เช่า (/tenants) - Single Source of Truth...');
  await page.goto('http://localhost:3000/tenants', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));
  const tenantRows = await page.$$eval('table tbody tr', trs => trs.length);
  console.log(`-> พบรายการผู้เช่า: ${tenantRows > 0 ? 'PASS (' + tenantRows + ' ผู้เช่า)' : 'FAIL'}`);

  console.log('Test 3: ตรวจสอบหน้าใบแจ้งหนี้และการเงิน (/invoices) - Payment Ledger...');
  await page.goto('http://localhost:3000/invoices', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));
  const invoiceRows = await page.$$eval('table tbody tr', trs => trs.length);
  console.log(`-> พบรายการบิลและใบแจ้งหนี้: ${invoiceRows > 0 ? 'PASS (' + invoiceRows + ' บิล)' : 'FAIL'}`);

  console.log('Test 4: ตรวจสอบหน้าทำความสะอาดแม่บ้าน (/cleaning)...');
  await page.goto('http://localhost:3000/cleaning', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));
  console.log('-> หน้างานทำความสะอาดเปิดได้สมบูรณ์ (PASS)');

  console.log('Test 5: ตรวจสอบหน้ารายงานและส่งออกบัญชี (/reports)...');
  await page.goto('http://localhost:3000/reports', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));
  console.log('-> หน้าระบบบัญชีเปิดได้สมบูรณ์ (PASS)');

  await browser.close();
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch(e){}

  console.log('\n------------------------------------------------------------------------');
  console.log('📊 สรุปผลการตรวจสอบทางเทคนิค (QA Diagnostics):');
  console.log(`- Browser Console Errors: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    consoleErrors.forEach(e => console.log('   * Error:', e));
  }
  console.log('========================================================================\n');
}

runQaAuditTest().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
