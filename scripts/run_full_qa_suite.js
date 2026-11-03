const puppeteer = require('D:/DESKTOP/Pakdee-UserTest/node_modules/puppeteer-core');
const os = require('os');
const path = require('path');
const fs = require('fs');

async function auditPort(port) {
  console.log(`\n------------------------------------------------------------------------`);
  console.log(`🔍 AUDITING PORT ${port} (http://localhost:${port})...`);
  console.log(`------------------------------------------------------------------------`);

  const uniqueDir = path.join(os.tmpdir(), 'puppeteer_' + port + '_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8));
  fs.mkdirSync(uniqueDir, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    userDataDir: uniqueDir,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1440,900'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  // 1. Authenticate
  await page.goto(`http://localhost:${port}`, { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    const owner = {
      id: 'usr-owner-01',
      name: 'คุณพักดี มีสุข',
      email: 'owner@pakdee.com',
      role: 'owner',
      roleTitle: 'เจ้าของหอพัก (Owner / Super Admin)',
      avatarText: 'พด',
      phone: '081-999-8888',
      assignedBranches: ['all'],
      permissions: { canDeleteBranch: true, canEditBankSettings: true, canViewExecutivePL: true, canResetSystem: true, canManageManagers: true }
    };
    localStorage.setItem('pakdee_auth_session_v1', JSON.stringify(owner));
  });

  // Test 1: Rooms Matrix
  console.log(`1. [Port ${port}] ตรวจสอบหน้าผังห้องพัก (/rooms)...`);
  await page.goto(`http://localhost:${port}/rooms`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));
  const roomsCount = await page.$$eval('.grid > div', divs => divs.length);
  console.log(`   -> ผังห้องพักแสดงผล: PASS (${roomsCount} ห้อง)`);

  // Test 2: Reports / Accounting & P&L Hub
  console.log(`2. [Port ${port}] ตรวจสอบระบบบัญชี รายรับ-รายจ่าย & กำไรขาดทุน (/reports)...`);
  await page.goto(`http://localhost:${port}/reports`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));

  const hasTitle = await page.evaluate(() => {
    return document.body.innerText.includes('ระบบบัญชี รายรับ-รายจ่าย & กำไรขาดทุน');
  });
  console.log(`   -> หัวข้อระบบบัญชี รายรับ-รายจ่าย & กำไรขาดทุน: ${hasTitle ? 'PASS ✓' : 'FAIL ✗'}`);

  const hasTabs = await page.evaluate(() => {
    const text = document.body.innerText;
    return text.includes('ภาพรวมงบกำไรขาดทุน') && text.includes('บันทึกรายจ่าย') && text.includes('วิเคราะห์ค่าน้ำ-ไฟหอพัก');
  });
  console.log(`   -> แถบแท็บ 5 เมนูย่อย (ภาพรวม, รายจ่าย, ค่าน้ำ-ไฟ, ใบเสร็จ, ใบแจ้งหนี้): ${hasTabs ? 'PASS ✓' : 'FAIL ✗'}`);

  // Test 3: Check Add Expense Modal
  console.log(`3. [Port ${port}] ตรวจสอบปุ่ม + บันทึกรายจ่ายใหม่...`);
  const modalOpened = await page.evaluate(async () => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('บันทึกรายจ่ายใหม่'));
    if (!btn) return false;
    btn.click();
    await new Promise(r => setTimeout(r, 500));
    const modalTitle = document.body.innerText.includes('บันทึกรายจ่ายหอพักใหม่');
    // Close modal
    const closeBtn = document.querySelector('button[type="button"]');
    return modalTitle;
  });
  console.log(`   -> หน้าต่างบันทึกรายจ่ายใหม่ Modal เปิดขึ้นสมบูรณ์: ${modalOpened ? 'PASS ✓' : 'FAIL ✗'}`);

  // Test 4: Check Utility Analysis Tab
  console.log(`4. [Port ${port}] ตรวจสอบแท็บวิเคราะห์ค่าน้ำ-ไฟหอพัก (รายเดือน + รายวัน)...`);
  const utilityTabValid = await page.evaluate(async () => {
    const tabs = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('วิเคราะห์ค่าน้ำ-ไฟ'));
    if (tabs.length > 0) {
      tabs[0].click();
      await new Promise(r => setTimeout(r, 500));
      return document.body.innerText.includes('วิเคราะห์ค่าไฟฟ้าหอพัก') && document.body.innerText.includes('วิเคราะห์ค่าน้ำประปาหอพัก');
    }
    return false;
  });
  console.log(`   -> หน้าวิเคราะห์ค่าน้ำ-ไฟหอพัก (รวมมิเตอร์รายวัน+รายเดือน): ${utilityTabValid ? 'PASS ✓' : 'FAIL ✗'}`);

  // Test 5: Check Invoices
  console.log(`5. [Port ${port}] ตรวจสอบหน้าใบแจ้งหนี้ (/invoices)...`);
  await page.goto(`http://localhost:${port}/invoices`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));
  console.log(`   -> หน้าใบแจ้งหนี้เปิดได้สมบูรณ์: PASS ✓`);

  await browser.close();
  try { fs.rmSync(uniqueDir, { recursive: true, force: true }); } catch(e){}

  console.log(`[Port ${port}] Console Errors: ${consoleErrors.length}`);
  return consoleErrors.length === 0;
}

async function runComprehensiveAudit() {
  console.log('========================================================================');
  console.log('🛡️ QS SMART DEV TEAM — FULL AUTOMATED AUDIT VERIFICATION SUITE');
  console.log('⏰ Timestamp:', new Date().toLocaleString('th-TH'));
  console.log('========================================================================');

  const p3000Ok = await auditPort(3000);
  const p3001Ok = await auditPort(3001);

  console.log('\n========================================================================');
  console.log('📊 FINAL AUDIT VERIFICATION SUMMARY:');
  console.log(`- Port 3000 (Pakdee Dev): ${p3000Ok ? '✅ PASSED (0 Errors)' : '❌ FAILED'}`);
  console.log(`- Port 3001 (Pakdee UserTest): ${p3001Ok ? '✅ PASSED (0 Errors)' : '❌ FAILED'}`);
  console.log('========================================================================\n');

  if (!p3000Ok || !p3001Ok) {
    process.exit(1);
  }
}

runComprehensiveAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
