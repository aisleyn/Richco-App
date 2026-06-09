import { chromium } from 'playwright';

(async () => {
  let browser;
  try {
    console.log('Launching browser...');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const logs = [];
    const errors = [];

    // Capture all console messages
    page.on('console', msg => {
      logs.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location()
      });
      if (msg.type() === 'error' || msg.type() === 'warning') {
        errors.push(`[${msg.type()}] ${msg.text()}`);
      }
    });

    // Capture uncaught exceptions
    page.on('pageerror', err => {
      errors.push(`[exception] ${err.message}`);
    });

    console.log('Navigating to app...');
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });

    console.log('Waiting for page...');
    await page.waitForTimeout(3000);

    console.log('\n=== ERRORS AND WARNINGS ===');
    if (errors.length > 0) {
      errors.forEach(e => console.log(e));
    } else {
      console.log('No errors or warnings found');
    }

    // Check the current URL and page content
    const url = page.url();
    const title = await page.title();
    console.log(`\nCurrent URL: ${url}`);
    console.log(`Page Title: ${title}`);

    // Check if the app is showing login or home screen
    const hasLoginBtn = await page.$('button:has-text("Sign in with Microsoft")');
    const hasWeatherCard = await page.$('[class*="WeatherCard"]');
    const hasHome = await page.$('main');

    console.log(`\nPage elements found:`);
    console.log(`  - Login button: ${hasLoginBtn ? 'yes' : 'no'}`);
    console.log(`  - Weather card: ${hasWeatherCard ? 'yes' : 'no'}`);
    console.log(`  - Main element: ${hasHome ? 'yes' : 'no'}`);

    // Check source code for WeatherCard import/export
    const source = await page.evaluate(() => {
      return {
        hasWeatherCardExport: window.__WEATHER_CARD_LOADED__ !== undefined,
        windowKeys: Object.keys(window).filter(k => k.includes('Weather')).slice(0, 10)
      };
    });

    console.log(`\nWindow object info:`, source);

    // Try to access the WeatherCard function if it exists
    const weatherCardInfo = await page.evaluate(() => {
      const script = document.querySelector('script');
      if (script) {
        const text = script.textContent || '';
        return {
          hasWeatherCardInScript: text.includes('WeatherCard'),
          hasVideoInScript: text.includes('video'),
          hasGetWeatherVideoInScript: text.includes('getWeatherVideo')
        };
      }
      return { error: 'No script found' };
    });

    console.log(`\nScript content info:`, weatherCardInfo);

    // Take screenshot
    await page.screenshot({
      path: 'C:\\Users\\aisle\\Richco\\richco-app\\error-check.png'
    });
    console.log(`\nScreenshot saved to: error-check.png`);

    await context.close();
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();
