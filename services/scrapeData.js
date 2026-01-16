const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

let browser = null;
let page = null;

const initBrowser = async () => {
    try {
        // console.log("🔄 Launching Browser...");
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', // Docker/VPS အတွက် အရေးကြီး
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ]
        });

        page = await browser.newPage();

        // =====================================================
        // ⭐ အရေးကြီးဆုံး: ပုံတွေ၊ Font တွေ၊ CSS တွေကို Block မယ်
        // =====================================================
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
                req.abort(); // မလိုအပ်တာတွေ မဒေါင်းဘူး
            } else {
                req.continue();
            }
        });

        await page.setViewport({ width: 1280, height: 720 });

        // Timeout ကို 60s ပေးထားမယ် (Network နှေးရင် စောင့်နိုင်အောင်)
        await page.goto("https://www.set.or.th/en/home", {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        return true;
    } catch (err) {
        console.error("❌ Browser Init Error:", err.message);
        if(browser) await browser.close();
        return false;
    }
};

const closeBrowser = async () => {
    if (browser) {
        try {
            await browser.close();
        } catch(e) {}
        browser = null;
        page = null;
        console.log("🛑 Browser Closed.");
    }
};

const scrapeData = async () => {
    if (!browser || !page) {
        const success = await initBrowser();
        if(!success) return null;
    }

    try {
        // Reload လုပ်မယ် (Timeout 30s)
        try {
            await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
        } catch(e) {
            // Timeout ဖြစ်လည်း ကိစ္စမရှိ၊ Data ရှိမရှိ ဆက်စစ်မယ်
            console.log("⚠️ Reload timeout (checking data anyway)...");
        }

        // Table ပေါ်လာအောင် ခဏစောင့်မယ်
        try {
            await page.waitForSelector('table tbody tr', { timeout: 5000 });
        } catch(e) { }

        const result = await page.evaluate(() => {
            let setVal = "0.00";
            let valText = "0.00";
            const rows = document.querySelectorAll('table tbody tr');

            for (let row of rows) {
                const text = row.innerText;
                if (text.includes('SET') && !text.includes('SET50') && !text.includes('SET100')) {
                    const cells = row.querySelectorAll('td');
                    if (cells.length > 1) {
                        setVal = cells[1].innerText.trim();
                        if (cells.length > 0) {
                            valText = cells[cells.length - 1].innerText.trim();
                        }
                    }
                    break;
                }
            }
            return { setVal, valText };
        });

        // Data မရှိရင် (0.00) Browser ပိတ်ပြီး ပြန်စမယ်
        if (!result || result.setVal === "0.00") {
            // console.log("⚠️ Empty Data, restarting browser...");
            await closeBrowser();
            return null;
        }

        const safeValText = result.valText || "0.00";
        const safeSetVal = result.setVal || "0.00";

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
        await closeBrowser();
        return null;
    }
};

module.exports = { scrapeData, closeBrowser };


// const puppeteer = require('puppeteer-extra');
// const StealthPlugin = require('puppeteer-extra-plugin-stealth');
//
// puppeteer.use(StealthPlugin());
//
// let browser = null;
// let page = null;
//
// const initBrowser = async () => {
//     try {
//         console.log("🔄 Launching Browser on Render...");
//         browser = await puppeteer.launch({
//             headless: "new",
//             args: [
//                 '--no-sandbox',
//                 '--disable-setuid-sandbox',
//                 '--disable-dev-shm-usage', // Memory ပြဿနာအတွက် အရေးကြီး
//                 '--disable-accelerated-2d-canvas',
//                 '--no-first-run',
//                 '--no-zygote',
//                 '--single-process',
//                 '--disable-gpu',
//                 '--disable-speech-api', // အသံပိုင်းဆိုင်ရာ ပိတ်မယ်
//                 '--disable-background-networking',
//                 '--disable-background-timer-throttling',
//                 '--disable-backgrounding-occluded-windows',
//                 '--disable-breakpad',
//                 '--disable-client-side-phishing-detection',
//                 '--disable-component-update',
//                 '--disable-default-apps',
//                 '--disable-domain-reliability',
//                 '--disable-extensions',
//                 '--disable-features=AudioServiceOutOfProcess',
//                 '--disable-hang-monitor',
//                 '--disable-ipc-flooding-protection',
//                 '--disable-notifications',
//                 '--disable-offer-store-unmasked-wallet-cards',
//                 '--disable-popup-blocking',
//                 '--disable-print-preview',
//                 '--disable-prompt-on-repost',
//                 '--disable-renderer-backgrounding',
//                 '--disable-sync',
//                 '--force-color-profile=srgb',
//                 '--metrics-recording-only',
//                 '--no-default-browser-check',
//                 '--password-store=basic',
//                 '--use-mock-keychain',
//             ]
//         });
//
//         page = await browser.newPage();
//
//         // =====================================================
//         // ⭐ အရေးကြီးဆုံးအချက်: Resource Blocker
//         // ပုံတွေ၊ Font တွေ၊ CSS တွေကို Block လုပ်မှ Render မှာ run နိုင်မယ်
//         // =====================================================
//         await page.setRequestInterception(true);
//         page.on('request', (req) => {
//             const resourceType = req.resourceType();
//             if (['image', 'stylesheet', 'font', 'media', 'script'].includes(resourceType)) {
//                 // Script ကိုပါ ပိတ်ထားကြည့်မယ် (SET web က static data ပါရင် ရနိုင်တယ်)
//                 // အကယ်၍ Data မရရင် 'script' ကို ဒီ list ထဲက ပြန်ထုတ်ပေးပါ
//                 if(resourceType === 'script') req.continue(); // JS လိုရင် ဒါကိုဖွင့်
//                 else req.abort();
//             } else {
//                 req.continue();
//             }
//         });
//
//         // Viewport အသေးဆုံးထားမယ် (RAM သက်သာအောင်)
//         await page.setViewport({ width: 800, height: 600 });
//
//         // Timeout ကို 2 မိနစ်ထိ တိုးပေးမယ်
//         await page.goto("https://www.set.or.th/en/home", {
//             waitUntil: 'domcontentloaded', // networkidle2 ထက် ဒါက ပိုမြန်တယ်
//             timeout: 120000
//         });
//
//         console.log("✅ Browser Ready on Render!");
//         return true;
//     } catch (err) {
//         console.error("❌ Browser Init Error:", err.message);
//         if(browser) await browser.close();
//         return false;
//     }
// };
//
// const closeBrowser = async () => {
//     if (browser) {
//         await browser.close();
//         browser = null;
//         page = null;
//         console.log("🛑 Browser Closed (RAM Cleaned).");
//     }
// };
//
// const scrapeData = async () => {
//     if (!browser || !page) {
//         const success = await initBrowser();
//         if(!success) return null;
//     }
//
//     try {
//         // Reload လုပ်ရင် Timeout တိုးထားမယ်
//         await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
//
//         try {
//             await page.waitForSelector('table tbody tr', { timeout: 10000 });
//         } catch(e) {
//             console.log("⚠️ Selector wait timeout, trying to extract anyway...");
//         }
//
//         const result = await page.evaluate(() => {
//             let setVal = "0.00";
//             let valText = "0.00";
//             const rows = document.querySelectorAll('table tbody tr');
//
//             for (let row of rows) {
//                 const text = row.innerText;
//                 if (text.includes('SET') && !text.includes('SET50') && !text.includes('SET100')) {
//                     const cells = row.querySelectorAll('td');
//                     if (cells.length > 1) {
//                         setVal = cells[1].innerText.trim();
//                         if (cells.length > 0) {
//                             valText = cells[cells.length - 1].innerText.trim();
//                         }
//                     }
//                     break;
//                 }
//             }
//             return { setVal, valText };
//         });
//
//         const safeValText = result && result.valText ? result.valText : "0.00";
//         const safeSetVal = result && result.setVal ? result.setVal : "0.00";
//
//         const valueArr = String(safeValText).split('\n');
//         const getValue = valueArr.length > 0 ? valueArr[valueArr.length - 1].trim() : "0.00";
//
//         let lastSet = safeSetVal.slice(-1);
//         let lastValue = "0";
//
//         if (getValue.length >= 4) {
//             lastValue = getValue.slice(-4, -3);
//         } else if (getValue.length > 0) {
//             lastValue = getValue.slice(-1);
//         }
//
//         const towD = lastSet + lastValue;
//
//         return {
//             set: safeSetVal,
//             value: getValue,
//             twoD: towD
//         };
//
//     } catch (err) {
//         console.error("⚠️ Scrape Error:", err.message);
//         await closeBrowser();
//         return null;
//     }
// };
//
// module.exports = { scrapeData, closeBrowser };
