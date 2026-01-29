// API URL

const axios = require('axios');
const API_URL = 'https://api.thaistock2d.com/live';
const StockApiResponse = require('../model/thaistock2d'); // Model ကို import လုပ်ပါ


async function scrapeData() {
    try {
        // ၁။ API ကို လှမ်းခေါ်မယ် (5 seconds timeout ထားပါ)
        const response = await axios.get(API_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 5000
        });

        const stockData = new StockApiResponse(response.data);

        // console.log("Raw API Results:", stockData.result);

        // Data မပါလာရင် null ပြန်မယ်
        if (!stockData || !stockData.live) {
            console.log("❌ API returns empty data");
            return null;
        }

        //=====================
        //Live data
        //=====================
        const LiveData ={
            set: stockData.live.set,
            value: stockData.live.value,
            twoD: stockData.live.twod,
            updatedAt: stockData.serverTime
        }

        return {
            live: LiveData,
            results: stockData.result // ဒါက resultGuard အတွက် ပါသွားအောင်လို့
        };

        //=========================
        //update Result
        //==========================
        // ၁။ ၁၂:၀၁ နဲ့ ၄:၃၀ အချိန်တွေကို array တစ်ခုထဲထည့်ထားပါ
        const targetSessions = ["12:01", "16:30"];

        // ၂။ Result array ထဲကနေ လိုချင်တဲ့ အချိန်တွေကို loop ပတ်ပြီး ရှာပါမယ်
        for (const targetTime of targetSessions) {

            // openTime မှာ "12:01" ပါတာကို ရှာတာဖြစ်ပါတယ်
            const foundItem = stockData.result.find(item => item.openTime.includes(targetTime));

            if (foundItem) {
                // ၃။ Schema Format အတိုင်း data ပြင်ဆင်မယ်
                const updateResultData = {
                    twoD: foundItem.twod,
                    set: foundItem.set,
                    value: foundItem.value,
                    // Enum နဲ့ကိုက်အောင် format ပြန်ပြောင်းပေးပါ (ဥပမာ: 12:01 -> 12:01 PM)
                    session: targetTime === "12:01" ? "12:01 PM" : "4:30 PM"
                };

                console.log(`✅ Found data for session: ${updateResultData.session}`);
                console.log(`✅ Found data for session: ${updateResultData.twoD}`);
                console.log(`✅ Found data for session: ${updateResultData.set}`);
                console.log(`✅ Found data for session: ${updateResultData.value}`);

                // ဒီနေရာမှာ Database ထဲ update/save လုပ်တဲ့ code ရေးနိုင်ပါတယ်
                // await updateResultModel.findOneAndUpdate({ session: updateResultData.session }, updateResultData, { upsert: true });
            }
        }

        //==========================
        //History For Two D
        //==========================
        // ၁။ API ကလာတဲ့ Result array ထဲမှာ data ရှိမရှိ အရင်စစ်မယ်
        if (stockData.result && stockData.result.length > 0) {

            // ၁။ API ကလာတဲ့ format (2026-01-29) ကို ယူပါ
            const rawDate = stockData.result[0]?.stockDate || ""
            // ၂။ "-" နဲ့ ခွဲထုတ်ပြီး ပုံစံပြန်စီပါ
            const [year, month, day] = rawDate.split('-');
            const formattedDate = `${day}-${month}-${year}`; // "29-01-2026" ရပါပြီ

            // ၃။ Schema ထဲက child array အတွက် data format ပြင်မယ်
            const historyEntries = stockData.result.map(item => ({
                time: item.openTime,
                twoD: item.twod,
                set: item.set,
                value: item.value
            }));

            const historyfor2dData = {
                date: formattedDate,
                child: historyEntries
            };

            console.log("📊 History Data to Save:", JSON.stringify(historyfor2dData, null, 2));

            /* Database ထဲ သိမ်းမည့်ပုံစံ (ဥပမာ):
            await HistoryTwoD.findOneAndUpdate(
                { date: currentDate },
                { $set: { child: historyEntries } },
                { upsert: true, new: true }
            );
            */
        }


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

// if (require.main === module) {
//     scrapeData().then(() => console.log("Done!"));
// }

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
