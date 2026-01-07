const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

let browser = null;
let page = null;

// browser open
const initBrowser = async () => {
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ]
        });
        page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 768 });

        // first time load website
        await page.goto("https://www.set.or.th/en/home", { waitUntil: 'networkidle2', timeout: 60000 });
        return true;
    } catch (err) {
        console.error("❌ Browser Init Error:", err.message);
        return false;
    }
};

// Close browser and clean ram
const closeBrowser = async () => {
    if (browser) {
        await browser.close();
        browser = null;
        page = null;
        console.log("🛑 Browser Closed (RAM Cleaned).");
    }
};

const scrapeData = async () => {
    // if not browser open new
    if (!browser || !page) {
        await initBrowser();
    }

    try {
        // Page Reload
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });

        // wait table (Max 5s)
        try {
            await page.waitForSelector('table tbody tr', { timeout: 5000 });
        } catch(e) { }

        // Pull data
        const result = await page.evaluate(() => {
            let setVal = "0.00";
            let valText = "0.00";
            const rows = document.querySelectorAll('table tbody tr');

            for (let row of rows) {
                const text = row.innerText;
                //find SET , not SET50 & SET100
                if (text.includes('SET') && !text.includes('SET50') && !text.includes('SET100')) {
                    const cells = row.querySelectorAll('td');
                    if (cells.length > 1) {
                        setVal = cells[1].innerText.trim(); // Index Value
                        if (cells.length > 0) {
                            valText = cells[cells.length - 1].innerText.trim(); // Total Value (Last Column)
                        }
                    }
                    break;
                }
            }
            return { setVal, valText };
        });

        // 2D
        const safeValText = result && result.valText ? result.valText : "0.00";
        const safeSetVal = result && result.setVal ? result.setVal : "0.00";

        const valueArr = String(safeValText).split('\n');
        const getValue = valueArr.length > 0 ? valueArr[valueArr.length - 1].trim() : "0.00";

        let lastSet = safeSetVal.slice(-1);
        let lastValue = "0";

        if (getValue.length >= 4) {
            lastValue = getValue.slice(-4, -3);
        } else if (getValue.length > 0) {
            lastValue = getValue.slice(-1);
        }

        const towD = lastSet + lastValue;

        return {
            set: safeSetVal,
            value: getValue,
            twoD: towD
        };

    } catch (err) {
        console.error("⚠️ Scrape Error:", err.message);
        // Error Browser close (Next run or Fresh Start)
        await closeBrowser();
        return null;
    }
};

module.exports = { scrapeData, closeBrowser };