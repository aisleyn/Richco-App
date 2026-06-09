import chromium from 'chromium';
import { launch } from 'puppeteer-core';

(async () => {
  const browser = await launch({
    executablePath: chromium.executablePath(),
    headless: true,
  });

  const page = await browser.newPage();

  // Capture console logs and errors
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });

  // Capture request errors
  const failedRequests = [];
  page.on('requestfailed', request => {
    failedRequests.push({
      url: request.url(),
      failure: request.failure().errorText
    });
  });

  try {
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle0', timeout: 10000 });

    // Wait for the main content
    await page.waitForSelector('main, div[class*="HomeScreen"]', { timeout: 5000 });

    // Get video element information
    const videoData = await page.evaluate(() => {
      const video = document.querySelector('video');
      if (!video) return { error: 'No video element found' };

      return {
        src: video.src,
        autoplay: video.autoplay,
        muted: video.muted,
        loop: video.loop,
        paused: video.paused,
        ended: video.ended,
        duration: video.duration,
        currentTime: video.currentTime,
        readyState: video.readyState,
        networkState: video.networkState,
        error: video.error,
        style: {
          display: getComputedStyle(video).display,
          visibility: getComputedStyle(video).visibility,
          opacity: getComputedStyle(video).opacity,
          width: getComputedStyle(video).width,
          height: getComputedStyle(video).height
        }
      };
    });

    console.log('=== VIDEO INFORMATION ===');
    console.log(JSON.stringify(videoData, null, 2));

    console.log('\n=== CONSOLE LOGS ===');
    consoleLogs.forEach(log => console.log(log));

    console.log('\n=== FAILED REQUESTS ===');
    failedRequests.forEach(req => console.log(JSON.stringify(req, null, 2)));

    // Take a screenshot
    await page.screenshot({ path: 'weather-card-screenshot.png', fullPage: true });
    console.log('\nScreenshot saved to: weather-card-screenshot.png');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
