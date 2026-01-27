const axios = require('axios');

// API URL
const API_URL = 'https://api.thaistock2d.com/live';

async function scrapeData() {
    try {
        // ၁။ API ကို လှမ်းခေါ်မယ် (5 seconds timeout ထားပါ)
        const response = await axios.get(API_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 5000
        });

        const apiData = response.data;

        // Data မပါလာရင် null ပြန်မယ်
        if (!apiData || !apiData.live) {
            console.log("❌ API returns empty data");
            return null;
        }

        // ==========================================
        // ⭐ ခင်ဗျားမေးတဲ့ mappedData ထားရမယ့်နေရာ
        // ==========================================
        const mappedData = {
            set: apiData.live.set,       // "1,334.45"
            value: apiData.live.value,   // "54,241.97"

            // API က 'twod' (d အသေး) နဲ့လာတာကို App ကသိတဲ့ 'twoD' (D အကြီး) ပြောင်းပေးရမယ်
            twoD: apiData.live.twod,

            time: Date.now(),            // Server Current Time

            // ⭐ ဒီ line က resultGuard အတွက် အရမ်းအရေးကြီးပါတယ်
            // API ရဲ့ result array တစ်ခုလုံးကို သယ်သွားပေးတာပါ
            results: apiData.result
        };

        return mappedData;

    } catch (error) {
        console.error("❌ Scrape Data (API) Error:", error.message);
        return null;
    }
}

// Scheduler က လှမ်းခေါ်ရင် error မတက်အောင် ဟန်ပြ function ထားပေးရမယ်
// (API သုံးရင် Browser ပိတ်စရာမလိုလို့ပါ)
const closeBrowser = async () => {
    return true;
};

module.exports = { scrapeData, closeBrowser };






//=================
// playwright
//=================

// const { chromium } = require('playwright');
//
// let browser = null;
// let context = null;
// let page = null;
// let failCount = 0;
//
// const initBrowser = async () => {
//     try {
//         browser = await chromium.launch({
//             headless: true,
//             args: [
//                 '--no-sandbox',
//                 '--disable-setuid-sandbox',
//                 '--disable-dev-shm-usage',
//                 '--disable-gpu',
//                 '--disable-blink-features=AutomationControlled' // Bot detect မမိအောင်
//             ]
//         });
//
//         context = await browser.newContext({
//             // ⭐ Desktop View ဖြစ်အောင် Screen ကြီးကြီးထားမယ်
//             viewport: { width: 1920, height: 1080 },
//             userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
//         });
//
//         // Resource blocking (Image/Font ပိတ်)
//         await context.route('**/*', (route) => {
//             const type = route.request().resourceType();
//             if (['image', 'font', 'media', 'stylesheet', 'other'].includes(type)) {
//                 return route.abort();
//             }
//             return route.continue();
//         });
//
//         page = await context.newPage();
//
//         await page.goto('https://www.set.or.th/en/home', {
//             waitUntil: 'domcontentloaded',
//             timeout: 60000
//         });
//
//         console.log('✅ Playwright Browser initialized');
//         return true;
//
//     } catch (err) {
//         console.error('❌ initBrowser error:', err.message);
//         await closeBrowser();
//         return false;
//     }
// };
//
// const closeBrowser = async () => {
//     try {
//         if (context) await context.close();
//         if (browser) await browser.close();
//     } catch (e) {}
//     browser = null;
//     context = null;
//     page = null;
//     console.log('🛑 Playwright Browser closed');
// };
//
// const scrapeData = async () => {
//     if (!browser || !page) {
//         const ok = await initBrowser();
//         if (!ok) return null;
//     }
//
//     try {
//         // Page Reload
//         try {
//             await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
//         } catch (reloadErr) {
//             console.log("⚠️ Reload timeout, restarting...");
//             throw reloadErr;
//         }
//
//         // ⭐ အဓိက ပြင်ဆင်ချက်: "SET" ဆိုတဲ့ စာလုံးပါတဲ့ Table Cell ပေါ်လာတဲ့အထိ စောင့်မယ်
//         // ဒါမှ Data အစစ်ရမယ်
//         try {
//             await page.waitForSelector('td:has-text("SET")', { state: 'attached', timeout: 20000 });
//         } catch (e) {
//             console.log("⚠️ 'SET' text not found yet (might be loading...)");
//         }
//
//         const result = await page.evaluate(() => {
//             // Table Row တွေကို ရှာမယ်
//             const rows = document.querySelectorAll('tr'); // Selector ကို ပိုကျယ်ကျယ်ရှာမယ်
//
//             for (const row of rows) {
//                 const cells = row.querySelectorAll('td');
//                 if (cells.length > 1) {
//                     const firstCellText = cells[0].innerText.trim();
//
//                     // ⭐ "SET" အတိအကျမဟုတ်ဘဲ ပါဝင်ရင် ယူမယ် (Space တွေကြောင့် လွဲတတ်လို့)
//                     if (firstCellText.includes('SET') && !firstCellText.includes('50') && !firstCellText.includes('100')) {
//                         return {
//                             setVal: cells[1]?.innerText.trim() || "0.00",
//                             // နောက်ဆုံး cell က value ဖြစ်လေ့ရှိတယ်
//                             valText: cells[cells.length - 1]?.innerText.trim() || "0.00"
//                         };
//                     }
//                 }
//             }
//             return null;
//         });
//
//         // Check if data is valid
//         if (!result || result.setVal === "0.00" || result.valText === "0.00") {
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
//         // Data processing
//         const valueArr = String(result.valText).split('\n');
//         const value = valueArr[valueArr.length - 1].trim();
//
//         // 2D Calculation Logic
//         // Remove commas just in case (e.g. 1,450.00)
//         const cleanSet = result.setVal.replace(/,/g, '');
//         const cleanValue = value.replace(/,/g, '');
//
//         const lastSet = cleanSet.slice(-1); // ဂဏန်းရဲ့ နောက်ဆုံးလုံး
//         // Value က တစ်ခါတလေ ဒသမ မပါလာရင် ၀ တပ်ပေးရမယ် သို့မဟုတ် logic စစ်ရမယ်
//         const lastValue = cleanValue.includes('.') ? cleanValue.split('.')[0].slice(-1) : cleanValue.slice(-1);
//
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
//         await closeBrowser();
//         return null;
//     }
// };
//
// module.exports = {
//     scrapeData,
//     closeBrowser
// };
