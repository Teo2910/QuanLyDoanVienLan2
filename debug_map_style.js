const { chromium } = require('@playwright/test');

async function run() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 375, height: 812 });

    try {
        await page.goto('http://localhost:5050/Account/Login');
        await page.fill('input[name="Email"]', 'teongu2210@gmail.com');
        await page.fill('input[name="Password"]', 'fIN72210*');
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle' }),
            page.click('button[type="submit"]')
        ]);
        
        await page.goto('http://localhost:5050/statistics/map');
        await page.waitForTimeout(5000);

        const info = await page.evaluate(() => {
            const mapEl = document.getElementById('map');
            if (!mapEl) return "No map element";
            
            // Get all styles
            const computed = window.getComputedStyle(mapEl);
            const inline = mapEl.getAttribute('style');
            
            // Find stylesheet rules
            const matchedRules = [];
            for (let i = 0; i < document.styleSheets.length; i++) {
                try {
                    const sheet = document.styleSheets[i];
                    for (let j = 0; j < sheet.cssRules.length; j++) {
                        const rule = sheet.cssRules[j];
                        if (rule.selectorText && rule.selectorText.includes('#map')) {
                            matchedRules.push(rule.cssText);
                        }
                    }
                } catch (e) {
                    // cross origin stylesheets might throw
                }
            }

            return {
                inline: inline,
                height: computed.height,
                minHeight: computed.minHeight,
                display: computed.display,
                position: computed.position,
                matchedRules: matchedRules,
                outerHTML: mapEl.outerHTML.substring(0, 500)
            };
        });

        console.log("Map Debug Info:", JSON.stringify(info, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
}

run();
