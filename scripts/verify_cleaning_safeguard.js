const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://127.0.0.1:3000';
const OUT_DIR = 'D:\\DESKTOP\\Pakdee\\docs\\test_screenshots';
const ARTIFACT_DIR = 'C:\\Users\\qishe\\.gemini\\antigravity\\brain\\e87487e9-cb13-47b9-827d-594e1ccdee79';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  console.log('=== VERIFYING CLEANING BUTTON SAFEGUARD & CHECKOUT REDIRECT ===');

  const os = require('os');
  const tempDir = path.join(os.tmpdir(), 'puppeteer_safeguard_' + Date.now());

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    userDataDir: tempDir,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--single-process',
      '--no-zygote',
      '--window-size=1440,900'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

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
      permissions: {
        canDeleteBranch: true,
        canEditBankSettings: true,
        canViewExecutivePL: true,
        canResetSystem: true,
        canManageManagers: true,
      },
    };
    localStorage.setItem('pakdee_auth_session_v1', JSON.stringify(owner));
  });

  await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
  await sleep(1500);

  // 1. Click on Room 104 (or occupied room)
  console.log('1. Opening Occupied Room (104 or 101)...');
  const openedOccupied = await page.evaluate(() => {
    // Look for room card 104 or any occupied room
    const cards = Array.from(document.querySelectorAll('div, button'));
    const r104 = cards.find(el => el.textContent && el.textContent.includes('104') && (el.textContent.includes('มีผู้เช่า') || el.textContent.includes('กัญญารัตน์')));
    if (r104) {
      r104.click();
      return '104';
    }
    const anyOcc = cards.find(el => el.textContent && (el.textContent.includes('มีผู้เช่า') || el.textContent.includes('101')));
    if (anyOcc) {
      anyOcc.click();
      return 'occ';
    }
    return null;
  });
  console.log('Clicked room:', openedOccupied);
  await sleep(1000);

  // Take screenshot of Occupied Room modal
  const ss1 = path.join(OUT_DIR, 'verify_occupied_room_safeguard.png');
  await page.screenshot({ path: ss1 });
  const art1 = path.join(ARTIFACT_DIR, 'verify_occupied_room_safeguard.png');
  fs.copyFileSync(ss1, art1);
  console.log('Saved screenshot 1:', ss1);

  // Check text inside modal
  const modalInfo = await page.evaluate(() => {
    const text = document.body.innerText;
    const hasCleaningBtn = text.includes('แจ้งแม่บ้านทำความสะอาด');
    const hasCheckoutBtn = text.includes('แจ้งย้ายออก / คืนห้อง');
    const hasNaN = text.includes('NaN');
    return { hasCleaningBtn, hasCheckoutBtn, hasNaN };
  });
  console.log('Occupied Room Modal Check:', modalInfo);

  // 2. Click "แจ้งย้ายออก / คืนห้อง" and verify it smoothly redirects to Checkout Settlement view
  console.log('2. Clicking "แจ้งย้ายออก / คืนห้อง"...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent && b.textContent.includes('แจ้งย้ายออก / คืนห้อง'));
    if (btn) btn.click();
  });
  await sleep(1000);

  const ss2 = path.join(OUT_DIR, 'verify_checkout_tab_redirect.png');
  await page.screenshot({ path: ss2 });
  const art2 = path.join(ARTIFACT_DIR, 'verify_checkout_tab_redirect.png');
  fs.copyFileSync(ss2, art2);
  console.log('Saved screenshot 2 (Checkout Settlement):', ss2);

  // 3. Go back to Room Matrix / Dashboard and check a Vacant room
  console.log('3. Checking Vacant Room...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, a'));
    const matrixBtn = buttons.find(b => b.textContent && (b.textContent.includes('ภาพรวมหอพัก') || b.textContent.includes('ผังห้อง')));
    if (matrixBtn) matrixBtn.click();
  });
  await sleep(1000);

  // Click on a vacant room (e.g. 103, 106, 202)
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('div, button'));
    const vacantCard = cards.find(el => el.textContent && el.textContent.includes('ว่าง') && !el.textContent.includes('มีผู้เช่า'));
    if (vacantCard) vacantCard.click();
  });
  await sleep(1000);

  const ss3 = path.join(OUT_DIR, 'verify_vacant_room_modal.png');
  await page.screenshot({ path: ss3 });
  const art3 = path.join(ARTIFACT_DIR, 'verify_vacant_room_modal.png');
  fs.copyFileSync(ss3, art3);
  console.log('Saved screenshot 3 (Vacant Room Modal):', ss3);

  const vacantModalInfo = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      hasCleaningBtn: text.includes('แจ้งแม่บ้านทำความสะอาด'),
      hasCheckoutBtn: text.includes('แจ้งย้ายออก / คืนห้อง'),
    };
  });
  console.log('Vacant Room Modal Check:', vacantModalInfo);

  await browser.close();
  console.log('=== TEST COMPLETED SUCCESSFULLY ===');
})();
