const puppeteer = require('D:/DESKTOP/Pakdee-UserTest/node_modules/puppeteer-core');
const os = require('os');
const path = require('path');
const fs = require('fs');

async function checkInvoices() {
  const tempDir = path.join(os.tmpdir(), 'chrome_inv_check_' + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    userDataDir: tempDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
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

  await page.goto('http://localhost:3000/invoices', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  const rows = await page.$$eval('table tbody tr', trs => trs.length);
  console.log('-> Invoices rendered count:', rows);

  const textContent = await page.evaluate(() => {
    const tbody = document.querySelector('table tbody');
    return tbody ? tbody.innerText.substring(0, 300) : 'NO TBODY';
  });
  console.log('-> Invoices table sample:\n', textContent);

  await browser.close();
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch(e){}
}

checkInvoices().catch(console.error);
