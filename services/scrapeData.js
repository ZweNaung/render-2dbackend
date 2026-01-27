const { chromium } = require('playwright');

let browser = null;
let context = null;
let page = null;
let failCount = 0;

const initBrowser = async () => {
    try {
        browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-blink-features=AutomationControlled' // Bot detect မမိအောင်
            ]
        });

        context = await browser.newContext({
            // ⭐ Desktop View ဖြစ်အောင် Screen ကြီးကြီးထားမယ်
            viewport: { width: 1920, height: 1080 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });

        // Resource blocking (Image/Font ပိတ်)
        await context.route('**/*', (route) => {
            const type = route.request().resourceType();
            if (['image', 'font', 'media', 'stylesheet', 'other'].includes(type)) {
                return route.abort();
            }
            return route.continue();
        });

        page = await context.newPage();

        await page.goto('https://www.set.or.th/en/home', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        console.log('✅ Playwright Browser initialized');
        return true;

    } catch (err) {
        console.error('❌ initBrowser error:', err.message);
        await closeBrowser();
        return false;
    }
};

const closeBrowser = async () => {
    try {
        if (context) await context.close();
        if (browser) await browser.close();
    } catch (e) {}
    browser = null;
    context = null;
    page = null;
    console.log('🛑 Playwright Browser closed');
};

const scrapeData = async () => {
    if (!browser || !page) {
        const ok = await initBrowser();
        if (!ok) return null;
    }

    try {
        // Page Reload
        try {
            await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
        } catch (reloadErr) {
            console.log("⚠️ Reload timeout, restarting...");
            throw reloadErr;
        }

        // ⭐ အဓိက ပြင်ဆင်ချက်: "SET" ဆိုတဲ့ စာလုံးပါတဲ့ Table Cell ပေါ်လာတဲ့အထိ စောင့်မယ်
        // ဒါမှ Data အစစ်ရမယ်
        try {
            await page.waitForSelector('td:has-text("SET")', { state: 'attached', timeout: 20000 });
        } catch (e) {
            console.log("⚠️ 'SET' text not found yet (might be loading...)");
        }

        const result = await page.evaluate(() => {
            // Table Row တွေကို ရှာမယ်
            const rows = document.querySelectorAll('tr'); // Selector ကို ပိုကျယ်ကျယ်ရှာမယ်

            for (const row of rows) {
                const cells = row.querySelectorAll('td');
                if (cells.length > 1) {
                    const firstCellText = cells[0].innerText.trim();

                    // ⭐ "SET" အတိအကျမဟုတ်ဘဲ ပါဝင်ရင် ယူမယ် (Space တွေကြောင့် လွဲတတ်လို့)
                    if (firstCellText.includes('SET') && !firstCellText.includes('50') && !firstCellText.includes('100')) {
                        return {
                            setVal: cells[1]?.innerText.trim() || "0.00",
                            // နောက်ဆုံး cell က value ဖြစ်လေ့ရှိတယ်
                            valText: cells[cells.length - 1]?.innerText.trim() || "0.00"
                        };
                    }
                }
            }
            return null;
        });

        // Check if data is valid
        if (!result || result.setVal === "0.00" || result.valText === "0.00") {
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

        // Data processing
        const valueArr = String(result.valText).split('\n');
        const value = valueArr[valueArr.length - 1].trim();

        // 2D Calculation Logic
        // Remove commas just in case (e.g. 1,450.00)
        const cleanSet = result.setVal.replace(/,/g, '');
        const cleanValue = value.replace(/,/g, '');

        const lastSet = cleanSet.slice(-1); // ဂဏန်းရဲ့ နောက်ဆုံးလုံး
        // Value က တစ်ခါတလေ ဒသမ မပါလာရင် ၀ တပ်ပေးရမယ် သို့မဟုတ် logic စစ်ရမယ်
        const lastValue = cleanValue.includes('.') ? cleanValue.split('.')[0].slice(-1) : cleanValue.slice(-1);

        const twoD = lastSet + lastValue;

        return {
            set: result.setVal,
            value,
            twoD,
            time: Date.now()
        };

    } catch (err) {
        console.error('⚠️ scrapeData error:', err.message);
        await closeBrowser();
        return null;
    }
};

module.exports = {
    scrapeData,
    closeBrowser
};

// const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Stealth မလိုရင် comment ထားလည်းရ
// puppeteer.use(StealthPlugin());
// const StealthPlugin = require('puppeteer-extra-plugin-stealth');
// const puppeteer = require('puppeteer-extra');
// puppeteer.use(StealthPlugin()); // Optional: ဆိုက်က bot မှန်း မသိအောင် ကာကွယ်ရန်
//
// let browser = null;
// let page = null;
// let failCount = 0;
//
// /**
//  * Browser ကို တစ်ခါပဲ start
//  */
// const initBrowser = async () => {
//     try {
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
//         // Resource block (RAM save) - Image/Font တွေကို ပိတ်ထားမယ်
//         await page.setRequestInterception(true);
//         page.on('request', (req) => {
//             const type = req.resourceType();
//             if (['image', 'font', 'media', 'stylesheet'].includes(type)) {
//                 req.abort();
//             } else {
//                 req.continue();
//             }
//         });
//
//         await page.setViewport({ width: 1280, height: 720 });
//
//         // ပထမဆုံးအကြိမ် Website ဖွင့်မယ်
//         await page.goto('https://www.set.or.th/en/home', {
//             waitUntil: 'domcontentloaded',
//             timeout: 60000
//         });
//
//         console.log('✅ Browser initialized');
//         return true;
//
//     } catch (err) {
//         console.error('❌ initBrowser error:', err.message);
//         if (browser) await browser.close();
//         browser = null;
//         page = null;
//         return false;
//     }
// };
//
// /**
//  * Browser ပိတ်
//  */
// const closeBrowser = async () => {
//     try {
//         if (browser) await browser.close();
//     } catch (e) {}
//     browser = null;
//     page = null;
//     console.log('🛑 Browser closed');
// };
//
// /**
//  * Scrape SET data
//  */
// const scrapeData = async () => {
//     // Browser မရှိသေးရင် အသစ်ဖွင့်
//     if (!browser || !page) {
//         const ok = await initBrowser();
//         if (!ok) return null;
//     }
//
//     try {
//         // ❗❗ အရေးကြီးဆုံး ပြင်ဆင်ချက် ❗❗
//         // အကြိမ်တိုင်းမှာ Data အသစ်ရအောင် Page ကို Reload လုပ်ပေးရမယ်
//         try {
//             await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
//         } catch (reloadErr) {
//             console.log("⚠️ Reload timeout, restarting browser...");
//             throw reloadErr; // Catch block ကို ရောက်သွားပြီး browser ပိတ်ပြီး ပြန်စလိမ့်မယ်
//         }
//
//         // Table row ပေါ်လာအောင် စောင့်
//         await page.waitForSelector('table tbody tr', { timeout: 15000 });
//
//         const result = await page.evaluate(() => {
//             // SET website structure ပြောင်းလဲနိုင်လို့ class တွေနဲ့မဟုတ်ဘဲ table structure နဲ့ပဲ ရှာထားတာ ကောင်းပါတယ်
//             const rows = document.querySelectorAll('table tbody tr');
//
//             for (const row of rows) {
//                 const cells = row.querySelectorAll('td');
//                 // ပထမဆုံး cell မှာ 'SET' စာသားပါရင် လိုချင်တဲ့ row ဖြစ်တယ်
//                 if (cells.length && cells[0].innerText.trim() === 'SET') {
//                     return {
//                         setVal: cells[1]?.innerText.trim() || "0.00",
//                         // နောက်ဆုံး column က value ဖြစ်လေ့ရှိတယ်
//                         valText: cells[cells.length - 1]?.innerText.trim() || "0.00"
//                     };
//                 }
//             }
//             return null;
//         });
//
//         // Data မရရင် retry count တိုး
//         if (!result || result.setVal === "0.00") {
//             failCount++;
//             console.log(`⚠️ Empty data (${failCount})`);
//
//             if (failCount >= 3) {
//                 console.log('♻️ Restarting browser due to repeated empty data...');
//                 await closeBrowser();
//                 failCount = 0;
//             }
//             return null;
//         }
//
//         failCount = 0;
//
//         // Value process (Format ရှင်းထုတ်ခြင်း)
//         const valueArr = String(result.valText).split('\n');
//         const value = valueArr[valueArr.length - 1].trim();
//
//         const lastSet = result.setVal.slice(-1);
//         const lastValue = value.split('.')[0].slice(-1);
//         // const lastValue = value.length >= 2 ? value.slice(-2, -1) : "0"; // ဒသမ မတိုင်ခင် ဂဏန်းကို ယူရန်
//
//         // 2D တွက်နည်း (Set နောက်ဆုံးဂဏန်း + Value ဒသမရှေ့ဂဏန်း)
//         // ဥပမာ: Set 1450.34, Value 12345.67 => 4 + 6 = 46 (ဒါက Logic မှန်ဖို့လိုတယ်နော်)
//         // မင်းရေးထားတဲ့ Logic အတိုင်း:
//         // Value က 10.50 ဆိုရင် .slice(-2, -1) က '5' ကိုရမယ်။
//         const twoD = lastSet + lastValue;
//
//         return {
//             set: result.setVal,
//             value,
//             twoD,
//             time: Date.now()
//         };
//
//     } catch (err) {
//         console.error('⚠️ scrapeData error:', err.message);
//         // Error တက်ရင် Browser ပိတ်လိုက်တာ ပိုစိတ်ချရတယ်၊ နောက်တစ်ခေါက်ကျ အသစ်ပြန်ဖွင့်လိမ့်မယ်
//         await closeBrowser();
//         return null;
//     }
// };
//
// module.exports = {
//     scrapeData,
//     closeBrowser
// };
//
//
