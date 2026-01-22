// const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Stealth မလိုရင် comment ထားလည်းရ
// puppeteer.use(StealthPlugin());
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin()); // Optional: ဆိုက်က bot မှန်း မသိအောင် ကာကွယ်ရန်

let browser = null;
let page = null;
let failCount = 0;

/**
 * Browser ကို တစ်ခါပဲ start
 */
const initBrowser = async () => {
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-zygote'
            ]
        });

        page = await browser.newPage();

        // Resource block (RAM save) - Image/Font တွေကို ပိတ်ထားမယ်
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const type = req.resourceType();
            if (['image', 'font', 'media', 'stylesheet'].includes(type)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        await page.setViewport({ width: 1280, height: 720 });

        // ပထမဆုံးအကြိမ် Website ဖွင့်မယ်
        await page.goto('https://www.set.or.th/en/home', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        console.log('✅ Browser initialized');
        return true;

    } catch (err) {
        console.error('❌ initBrowser error:', err.message);
        if (browser) await browser.close();
        browser = null;
        page = null;
        return false;
    }
};

/**
 * Browser ပိတ်
 */
const closeBrowser = async () => {
    try {
        if (browser) await browser.close();
    } catch (e) {}
    browser = null;
    page = null;
    console.log('🛑 Browser closed');
};

/**
 * Scrape SET data
 */
const scrapeData = async () => {
    // Browser မရှိသေးရင် အသစ်ဖွင့်
    if (!browser || !page) {
        const ok = await initBrowser();
        if (!ok) return null;
    }

    try {
        // ❗❗ အရေးကြီးဆုံး ပြင်ဆင်ချက် ❗❗
        // အကြိမ်တိုင်းမှာ Data အသစ်ရအောင် Page ကို Reload လုပ်ပေးရမယ်
        try {
            await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
        } catch (reloadErr) {
            console.log("⚠️ Reload timeout, restarting browser...");
            throw reloadErr; // Catch block ကို ရောက်သွားပြီး browser ပိတ်ပြီး ပြန်စလိမ့်မယ်
        }

        // Table row ပေါ်လာအောင် စောင့်
        await page.waitForSelector('table tbody tr', { timeout: 15000 });

        const result = await page.evaluate(() => {
            // SET website structure ပြောင်းလဲနိုင်လို့ class တွေနဲ့မဟုတ်ဘဲ table structure နဲ့ပဲ ရှာထားတာ ကောင်းပါတယ်
            const rows = document.querySelectorAll('table tbody tr');

            for (const row of rows) {
                const cells = row.querySelectorAll('td');
                // ပထမဆုံး cell မှာ 'SET' စာသားပါရင် လိုချင်တဲ့ row ဖြစ်တယ်
                if (cells.length && cells[0].innerText.trim() === 'SET') {
                    return {
                        setVal: cells[1]?.innerText.trim() || "0.00",
                        // နောက်ဆုံး column က value ဖြစ်လေ့ရှိတယ်
                        valText: cells[cells.length - 1]?.innerText.trim() || "0.00"
                    };
                }
            }
            return null;
        });

        // Data မရရင် retry count တိုး
        if (!result || result.setVal === "0.00") {
            failCount++;
            console.log(`⚠️ Empty data (${failCount})`);

            if (failCount >= 3) {
                console.log('♻️ Restarting browser due to repeated empty data...');
                await closeBrowser();
                failCount = 0;
            }
            return null;
        }

        failCount = 0;

        // Value process (Format ရှင်းထုတ်ခြင်း)
        const valueArr = String(result.valText).split('\n');
        const value = valueArr[valueArr.length - 1].trim();

        const lastSet = result.setVal.slice(-1);
        const lastValue = value.length >= 2 ? value.slice(-2, -1) : "0"; // ဒသမ မတိုင်ခင် ဂဏန်းကို ယူရန်

        // 2D တွက်နည်း (Set နောက်ဆုံးဂဏန်း + Value ဒသမရှေ့ဂဏန်း)
        // ဥပမာ: Set 1450.34, Value 12345.67 => 4 + 6 = 46 (ဒါက Logic မှန်ဖို့လိုတယ်နော်)
        // မင်းရေးထားတဲ့ Logic အတိုင်း:
        // Value က 10.50 ဆိုရင် .slice(-2, -1) က '5' ကိုရမယ်။
        const twoD = lastSet + lastValue;

        return {
            set: result.setVal,
            value,
            twoD,
            time: Date.now()
        };

    } catch (err) {
        console.error('⚠️ scrapeData error:', err.message);
        // Error တက်ရင် Browser ပိတ်လိုက်တာ ပိုစိတ်ချရတယ်၊ နောက်တစ်ခေါက်ကျ အသစ်ပြန်ဖွင့်လိမ့်မယ်
        await closeBrowser();
        return null;
    }
};

module.exports = {
    scrapeData,
    closeBrowser
};


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
//         // console.log("🔄 Launching Browser...");
//         browser = await puppeteer.launch({
//             headless: "new",
//             args: [
//                 '--no-sandbox',
//                 '--disable-setuid-sandbox',
//                 '--disable-dev-shm-usage',
//                 '--disable-gpu',
//                 '--no-zygote'
//             ]
//         });
//
//         page = await browser.newPage();
//
//         // =====================================================
//         // ⭐ အရေးကြီးဆုံး: ပုံတွေ၊ Font တွေ၊ CSS တွေကို Block မယ်
//         // =====================================================
//         await page.setRequestInterception(true);
//         page.on('request', (req) => {
//             if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
//                 req.abort(); // မလိုအပ်တာတွေ မဒေါင်းဘူး
//             } else {
//                 req.continue();
//             }
//         });
//
//         await page.setViewport({ width: 1280, height: 720 });
//
//         // Timeout ကို 60s ပေးထားမယ် (Network နှေးရင် စောင့်နိုင်အောင်)
//         await page.goto("https://www.set.or.th/en/home", {
//             waitUntil: 'domcontentloaded',
//             timeout: 60000
//         });
//
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
//         try {
//             await browser.close();
//         } catch(e) {}
//         browser = null;
//         page = null;
//         console.log("🛑 Browser Closed.");
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
//         // Reload လုပ်မယ် (Timeout 30s)
//         try {
//             await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
//         } catch(e) {
//             // Timeout ဖြစ်လည်း ကိစ္စမရှိ၊ Data ရှိမရှိ ဆက်စစ်မယ်
//             console.log("⚠️ Reload timeout (checking data anyway)...");
//         }
//
//         // Table ပေါ်လာအောင် ခဏစောင့်မယ်
//         try {
//             await page.waitForSelector('table tbody tr', { timeout: 5000 });
//         } catch(e) { }
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
//         // Data မရှိရင် (0.00) Browser ပိတ်ပြီး ပြန်စမယ်
//         if (!result || result.setVal === "0.00") {
//             // console.log("⚠️ Empty Data, restarting browser...");
//             await closeBrowser();
//             return null;
//         }
//
//         const safeValText = result.valText || "0.00";
//         const safeSetVal = result.setVal || "0.00";
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


