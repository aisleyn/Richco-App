import { chromium } from 'playwright';

(async () => {
  let browser;
  try {
    console.log('Launching browser...');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('Navigating to app...');
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });

    console.log('Waiting for login page...');
    await page.waitForTimeout(1000);

    // Try to find and click the mock login button
    const mockLoginBtn = await page.$('button:has-text("Continue with Mock Data")');
    if (mockLoginBtn) {
      console.log('Found mock login button, clicking...');
      await mockLoginBtn.click();
      console.log('Waiting for navigation after login...');
      await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
      await page.waitForTimeout(2000);
    } else {
      console.log('Mock login button not found. Trying direct JavaScript...');
      // Try to click any button that looks like the dev mode button
      const btns = await page.$$('button');
      for (const btn of btns) {
        const text = await btn.textContent();
        if (text && text.includes('Continue')) {
          console.log('Found continue button, clicking...');
          await btn.click();
          await page.waitForTimeout(2000);
          break;
        }
      }
    }

    // Check for video element
    const videoInfo = await page.evaluate(() => {
      const video = document.querySelector('video');
      if (!video) {
        return { found: false, error: 'No video element found' };
      }

      const rect = video.getBoundingClientRect();
      const style = getComputedStyle(video);

      return {
        found: true,
        src: video.src,
        visible: rect.width > 0 && rect.height > 0 && style.display !== 'none',
        rect: {
          width: rect.width,
          height: rect.height,
          top: rect.top,
          left: rect.left
        },
        style: {
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity,
          width: style.width,
          height: style.height
        },
        paused: video.paused,
        src: video.src
      };
    });

    console.log('\n=== VIDEO ELEMENT INFO ===');
    console.log(JSON.stringify(videoInfo, null, 2));

    // Take full page screenshot
    console.log('\nTaking full screenshot...');
    await page.screenshot({
      path: 'C:\\Users\\aisle\\Richco\\richco-app\\weather-card.png',
      fullPage: true
    });
    console.log('Screenshot saved to: C:\\Users\\aisle\\Richco\\richco-app\\weather-card.png');

    await context.close();
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();
