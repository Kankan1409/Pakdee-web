const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://127.0.0.1:3000';
const OUT_DIR = 'D:\\DESKTOP\\Pakdee\\docs\\test_screenshots';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  console.log('=== TESTING NEW 3-LEVEL POPUP MODAL SYSTEM ===');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Injected session
  await page.evaluateOnNewDocument(() => {
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

  // -------------------------------------------------------------
  // TEST 1: Level 3 - แจ้งเตือนผิดพลาด (The exact case from user's image!)
  // -------------------------------------------------------------
  console.log('Testing Level 3: แจ้งเตือนผิดพลาด (PromptPay validation error)');
  await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle2' });
  await sleep(1500);

  // Click Banking tab in settings
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const bankTab = buttons.find(b => b.textContent && b.textContent.includes('บัญชีธนาคาร'));
    if (bankTab) bankTab.click();
  });
  await sleep(800);

  // Input invalid promptpay number e.g. "123"
  await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input'));
    const ppInput = inputs.find(i => i.placeholder && i.placeholder.includes('08X') || i.value.includes('081'));
    if (ppInput) {
      ppInput.value = '12345';
      ppInput.dispatchEvent(new Event('input', { bubbles: true }));
      ppInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  // Click Save Settings button
  await page.evaluate(() => {
    const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('บันทึกการตั้งค่า'));
    if (saveBtn) saveBtn.click();
  });
  await sleep(800);

  await page.screenshot({ path: path.join(OUT_DIR, 'popup_level3_error.png') });
  console.log('Saved Level 3 (Error) screenshot -> popup_level3_error.png');

  // Close the popup by clicking confirm button
  await page.evaluate(() => {
    const confirmBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('เข้าใจแล้ว') || b.textContent.includes('รับทราบ')));
    if (confirmBtn) confirmBtn.click();
  });
  await sleep(800);

  // -------------------------------------------------------------
  // TEST 2: Level 1 - แจ้งเตือนทั่วไป (Info)
  // -------------------------------------------------------------
  console.log('Testing Level 1: แจ้งเตือนทั่วไป (LINE OA / Webhook copy)');
  // Click LINE tab in settings
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const lineTab = buttons.find(b => b.textContent && b.textContent.includes('LINE'));
    if (lineTab) lineTab.click();
  });
  await sleep(800);

  // Click Copy Link
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const copyBtn = buttons.find(b => b.textContent && b.textContent.includes('คัดลอกลิงก์'));
    if (copyBtn) copyBtn.click();
  });
  await sleep(800);

  await page.screenshot({ path: path.join(OUT_DIR, 'popup_level1_info.png') });
  console.log('Saved Level 1 (Info) screenshot -> popup_level1_info.png');

  // Close popup
  await page.evaluate(() => {
    const confirmBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('รับทราบ') || b.textContent.includes('เข้าใจแล้ว')));
    if (confirmBtn) confirmBtn.click();
  });
  await sleep(800);

  // -------------------------------------------------------------
  // TEST 3: Level 2 - แจ้งเตือนแก้ไข / ยืนยัน (Warning / Confirmation)
  // -------------------------------------------------------------
  console.log('Testing Level 2: แจ้งเตือนแก้ไข (Confirmation)');
  await page.goto(`${BASE_URL}/rooms`, { waitUntil: 'networkidle2' });
  await sleep(1000);

  // Open first room modal
  await page.evaluate(() => {
    const firstCard = document.querySelector('div.group');
    if (firstCard) firstCard.click();
  });
  await sleep(800);

  // Click "ลบห้องนี้" to trigger warning popup
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const delBtn = buttons.find(b => b.textContent && b.textContent.includes('ลบห้องนี้'));
    if (delBtn) delBtn.click();
  });
  await sleep(800);

  await page.screenshot({ path: path.join(OUT_DIR, 'popup_level2_warning.png') });
  console.log('Saved Level 2 (Warning) screenshot -> popup_level2_warning.png');

  await browser.close();
  console.log('=== POPUP TESTING COMPLETED SUCCESSFULLY ===');
})();
