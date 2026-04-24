import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const folderPath = 'C:\\Users\\aisle\\Richco\\Projects - Documents\\Projects - Photos\\Richco - OfficeWarehouse';
const siteId = 'office-warehouse';
const siteName = 'Richco Office Warehouse';

function extractDateFromFilename(filename) {
  const dateMatch = filename.match(/(\w{3})\s+(\d{1,2})\s+(\d{4})\s+(\d{1,2})_(\d{2})([ap]m)/i);
  if (dateMatch) {
    const [, month, day, year, hour, minute, meridiem] = dateMatch;
    let hourNum = parseInt(hour);
    if (meridiem.toLowerCase() === 'pm' && hourNum !== 12) hourNum += 12;
    if (meridiem.toLowerCase() === 'am' && hourNum === 12) hourNum = 0;

    const dateStr = `${month} ${day} ${year} ${hourNum}:${minute}`;
    return new Date(dateStr).getTime();
  }
  return Date.now();
}

async function importPhotos() {
  try {
    const files = fs.readdirSync(folderPath).filter(f =>
      /\.(jpg|jpeg|png|gif)$/i.test(f)
    );

    console.log(`Found ${files.length} image files`);
    console.log('Converting to base64... this will take a minute or two\n');

    const photos = [];
    files.forEach((file, index) => {
      if ((index + 1) % 50 === 0) {
        console.log(`Processing: ${index + 1}/${files.length}`);
      }

      const filePath = path.join(folderPath, file);
      const fileBuffer = fs.readFileSync(filePath);
      const base64 = fileBuffer.toString('base64');
      const dataUrl = `data:image/jpeg;base64,${base64}`;
      const timestamp = extractDateFromFilename(file);

      photos.push({
        id: `photo-${Date.now()}-${index}`,
        url: dataUrl,
        thumbnailUrl: dataUrl,
        siteId,
        siteName,
        submittedBy: 'Bulk Import',
        submittedById: 'bulk',
        timestamp,
        category: 'Site Conditions',
        caption: '',
      });
    });

    // Write the data to a migration file
    const migrationCode = `
// Auto-generated photo import script
// Run this in browser console to import photos

(function() {
  const photos = ${JSON.stringify(photos)};

  try {
    const stored = localStorage.getItem('richco-photos') || '[]';
    const existing = JSON.parse(stored);
    const all = [...photos, ...existing];
    localStorage.setItem('richco-photos', JSON.stringify(all));
    console.log('✅ Successfully imported ' + photos.length + ' photos');
    console.log('Refresh the page to see them');
  } catch (err) {
    console.error('❌ Failed to import photos:', err);
  }
})();
`;

    const outputPath = path.join(__dirname, 'photoMigration.js');
    fs.writeFileSync(outputPath, migrationCode);

    console.log(`\n✅ Done! Created migration script: ${outputPath}`);
    console.log(`\nTo import ${photos.length} photos:`);
    console.log('1. Open your app in browser');
    console.log('2. Open DevTools Console (F12)');
    console.log(`3. Go to: ${outputPath}`);
    console.log('4. Copy the entire contents');
    console.log('5. Paste into browser console and press Enter');
    console.log('6. Refresh the page\n');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

importPhotos();
