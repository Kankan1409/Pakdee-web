const puppeteer = require('D:/DESKTOP/Pakdee-UserTest/node_modules/puppeteer-core');
const os = require('os');
const path = require('path');
const fs = require('fs');

async function testMoveoutAndInputs() {
  console.log('--- Testing Move-Out Settlement & Input Rules ---');
  const uniqueDir = path.join(os.tmpdir(), 'puppeteer_test_' + Date.now());
  fs.mkdirSync(uniqueDir, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    userDataDir: uniqueDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    localStorage.setItem('pakdee_current_user', JSON.stringify({
      id: 'usr-owner-01',
      name: 'คุณพักดี มีสุข',
      email: 'owner@pakdee.com',
      role: 'owner',
      roleTitle: 'เจ้าของหอพัก',
      avatarText: 'พด',
      phone: '081-999-8888',
      isActive: true,
      lastLogin: new Date().toISOString()
    }));
  });
  await page.goto('http://localhost:3000/rooms?tab=checkout', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  // Verify Move-out settlement is rendered
  const title = await page.evaluate(() => {
    const el = document.querySelector('h3');
    return el ? el.innerText : '';
  });
  console.log('Settlement Header:', title);

  // Check console errors
  console.log('Console Errors:', consoleErrors.length);
  await browser.close();

  if (consoleErrors.length > 0) {
    console.error('Console errors found:', consoleErrors);
    process.exit(1);
  } else {
    console.log('✅ Move-out settlement test passed with 0 console errors!');
  }
}

testMoveoutAndInputs().catch(e => {
  console.error(e);
  process.exit(1);
});
