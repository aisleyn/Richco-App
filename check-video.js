import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

(async () => {
  try {
    const response = await fetch('http://localhost:5174');
    const html = await response.text();

    // Check for video elements in the initial HTML
    const $ = cheerio.load(html);
    const videos = $('video');

    console.log('=== Initial HTML Analysis ===');
    console.log(`Video elements found in initial HTML: ${videos.length}`);

    videos.each((i, elem) => {
      console.log(`\nVideo ${i}:`);
      console.log(`  src: ${$(elem).attr('src')}`);
      console.log(`  autoPlay: ${$(elem).attr('autoplay')}`);
      console.log(`  muted: ${$(elem).attr('muted')}`);
      console.log(`  loop: ${$(elem).attr('loop')}`);
      console.log(`  class: ${$(elem).attr('class')}`);
    });

    // Check for the WeatherCard component
    const weatherCard = $('[class*="WeatherCard"], .weather-card, [data-testid*="weather"]');
    console.log(`\nWeatherCard elements found: ${weatherCard.length}`);

  } catch (error) {
    console.error('Error:', error.message);
  }
})();
