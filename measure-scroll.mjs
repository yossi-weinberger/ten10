import { chromium } from 'playwright';

const viewports = [
  { width: 320, height: 568, label: '320x568 (portrait)' },
  { width: 390, height: 844, label: '390x844 (portrait)' },
  { width: 430, height: 932, label: '430x932 (portrait)' },
  { width: 844, height: 390, label: '844x390 (landscape)' },
];

async function measureScrollWidth() {
  const browser = await chromium.launch();
  
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport,
      hasTouch: true,
      isMobile: true,
    });
    
    const page = await context.newPage();
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    
    // Wait for content to load
    await page.waitForTimeout(2000);
    
    const measurements = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        overflow: doc.scrollWidth - doc.clientWidth,
      };
    });
    
    console.log(`${viewport.label}:`);
    console.log(`  scrollWidth: ${measurements.scrollWidth}px`);
    console.log(`  clientWidth: ${measurements.clientWidth}px`);
    console.log(`  overflow: ${measurements.overflow}px`);
    console.log('');
    
    await context.close();
  }
  
  await browser.close();
}

measureScrollWidth().catch(console.error);
