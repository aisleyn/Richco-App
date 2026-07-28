import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Opening app...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 10000 }).catch(e => console.log('Nav error:', e.message));
  
  // Wait for page to load
  await page.waitForTimeout(2000);
  
  // Take screenshot of initial state
  await page.screenshot({ path: 'app-initial.png' });
  console.log('Screenshot saved: app-initial.png');
  
  // Check if we're logged in
  const isLoggedIn = await page.evaluate(() => {
    return !!localStorage.getItem('currentUserEmail');
  }).catch(() => false);
  
  console.log('Logged in?', isLoggedIn);
  
  if (isLoggedIn) {
    const email = await page.evaluate(() => localStorage.getItem('currentUserEmail'));
    console.log('Current user:', email);
  }
  
  await browser.close();
})().catch(console.error);
