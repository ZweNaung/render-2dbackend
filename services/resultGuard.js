const updateResultModel = require('../model/updateResultModel');
const historyForTwoDModel = require('../model/HistoryForTwoDModel');

const checkAndSaveResult = async (scrapedResponse, io) => {

    if (!scrapedResponse || !scrapedResponse.results || scrapedResponse.results.length === 0) {
        return false;
    }

    const results = scrapedResponse.results;
    let isSessionClosed = false;

    // ⭐ Server Time (Asia/Yangon)
    const now = new Date();
    // currentHour ကို 0-23 format နဲ့ ရပါမယ် (ဥပမာ: 3 PM = 15, 4 PM = 16)
    const currentHour = parseInt(now.toLocaleString('en-US', { timeZone: 'Asia/Yangon', hour: 'numeric', hour12: false }));

    const uiSessionMap = {
        "12:01:00": "12:01 PM",
        "16:30:00": "4:30 PM"
    };

    const historyTimeMap = {
        "11:00:00": "11:00",
        "12:01:00": "12:00",
        "15:00:00": "3:00",
        "16:30:00": "4:30" // ⚠️ သတိပြုရန်: 4:30 လား 4:00 လား Database နဲ့ပြန်ညှိပါ (မင်း code မှာ 4:30 ဖြစ်နေလို့ပါ)
    };

    for (const item of results) {
        const rawTime = item.openTime;

        // --- (A) UI RESULT သိမ်းခြင်း ---
        const uiSessionName = uiSessionMap[rawTime];
        if (uiSessionName) {
            try {
                // ⭐ အကြံပြုချက်: ဂဏန်းအမှန်ထွက်မှ (Dash မဟုတ်မှ) Save တာ ပိုကောင်းပါတယ်
                // if (item.twod !== "--") {
                const savedResult = await updateResultModel.findOneAndUpdate(
                    { session: uiSessionName },
                    {
                        twoD: item.twod,
                        set: item.set,
                        value: item.value,
                        session: uiSessionName
                    },
                    { upsert: true, new: true }
                );

                if (io) {
                    io.emit("new_2d_result", savedResult);
                    console.log(`🚀 Result Emitted for ${uiSessionName}`);
                }
                // }

                // ===============================================
                // ⭐ STOPPING CONDITION (အလုပ်ရပ်မည့် Logic အမှန်)
                // ===============================================

                // ၁။ မနက်ပိုင်း: ၁၂ နာရီ (12) ရောက်မှသာ ရပ်မယ်
                // (၁၁ နာရီမှာ API က 12:01 ပို့လိုက်ရင် မရပ်အောင်လို့ပါ)
                if (currentHour === 12 && rawTime.includes("12:01")) {
                    console.log("✅ Morning Session Done. Stopping...");
                    isSessionClosed = true;
                }

                    // ၂။ ညနေပိုင်း: ၁၆ နာရီ (4 PM) ရောက်မှသာ ရပ်မယ်
                // (မင်းအဟောင်းက >= 14 ထားခဲ့တော့ 3 PM (15) မှာ ရပ်သွားတာပါ)
                else if (currentHour >= 16 && rawTime.includes("16:30")) {
                    console.log("✅ Evening Session Done. Stopping...");
                    isSessionClosed = true;
                }

            } catch (err) {
                console.error(`❌ UI Result Save Error:`, err.message);
            }
        }

        // --- (B) HISTORY သိမ်းခြင်း ---
        const historyTime = historyTimeMap[rawTime];
        if (historyTime) {
            const dateStr = item.stockDate || new Date().toISOString().split('T')[0];
            const [year, month, day] = dateStr.split('-');
            const formattedDate = `${day}-${month}-${year}`;

            await saveToHistoryDB(formattedDate, historyTime, item);
        }
    }

    return isSessionClosed;
};

// ⭐ Helper Logic (Remove & Push)
async function saveToHistoryDB(date, time, item) {
    try {
        const newEntry = {
            time: time,
            twoD: item.twod,
            set: item.set,
            value: item.value
        };

        await historyForTwoDModel.updateOne(
            { date: date },
            { $pull: { child: { time: time } } }
        );

        await historyForTwoDModel.findOneAndUpdate(
            { date: date },
            { $push: { child: newEntry } },
            { upsert: true, new: true }
        );

        console.log(`📜 History Saved: ${date} [${time}]`);
    } catch (error) {
        console.error(`❌ History Save Error: ${error.message}`);
    }
}

module.exports = { checkAndSaveResult };
//=========================
//
//=========================

// const updateResultModel = require('../model/updateResultModel');
//
// // ⭐ Playwright မလိုတော့ပါ
//
// const checkAndSaveResult = async (currentLiveData, io) => {
//     // 1. Data မပါလာရင် ဘာမှမလုပ်ဘူး
//     if (!currentLiveData || !currentLiveData.results) {
//         return false;
//     }
//
//     const results = currentLiveData.results;
//     let isSaved = false;
//
//     // API ကလာတဲ့ အချိန်ကို DB session နဲ့ ညှိပေးရမယ် (Mapping)
//     const targetTimes = {
//         "12:01:00": "12:01 PM", // API က 12:01:00 လို့လာရင် 12:01 PM session ထဲထည့်မယ်
//         "16:30:00": "4:30 PM"   // API က 16:30:00 လို့လာရင် 4:30 PM session ထဲထည့်မယ်
//     };
//
//     // 2. Result Array ထဲမှာ ထွက်ပြီးသားစာရင်းတွေ လိုက်စစ်မယ်
//     for (const item of results) {
//         const dbSession = targetTimes[item.open_time];
//
//         // ကိုယ်လိုချင်တဲ့ Session (၁၂:၀၁ သို့ ၄:၃၀) ဟုတ်ခဲ့ရင်
//         if (dbSession) {
//             try {
//                 // DB ထဲမှာ ရှိပြီးသားလား၊ မရှိသေးရင် အသစ်ထည့်၊ ရှိရင် update လုပ်
//                 // (Set, Value, TwoD အားလုံးကို Result list ထဲကအတိုင်း အတိအကျယူမယ်)
//                 const savedResult = await updateResultModel.findOneAndUpdate(
//                     { session: dbSession },
//                     {
//                         twoD: item.twod,   // API result array မှာ d အသေးနဲ့ လာတတ်လို့ သတိထားပါ
//                         set: item.set,
//                         value: item.value,
//                         session: dbSession
//                     },
//                     { upsert: true, new: true, setDefaultsOnInsert: true }
//                 );
//
//                 console.log(`✅ Auto-Saved Result from API for ${dbSession}: ${savedResult.twoD}`);
//
//                 // Client တွေကို Notification ပို့မယ်
//                 if (io) {
//                     io.emit("new_2d_result", {
//                         twoD: savedResult.twoD,
//                         set: savedResult.set,
//                         value: savedResult.value,
//                         session: savedResult.session
//                     });
//                 }
//
//                 // တခုခု Save ဖြစ်သွားတာနဲ့ true ပြန်ပေးမယ် (Scheduler ရပ်ဖို့အတွက်)
//                 isSaved = true;
//
//             } catch (err) {
//                 console.error(`❌ DB Save Error for ${dbSession}:`, err.message);
//             }
//         }
//     }
//
//     return isSaved;
// };
//
// module.exports = { checkAndSaveResult };





//==========================
//PlayWright
//==========================


// const { chromium } = require('playwright');
// const updateResultModel = require('../model/updateResultModel');
//
// // Status Check Function (Playwright)
// const statusCheck = async () => {
//     let browser = null;
//     try {
//         browser = await chromium.launch({
//             headless: true,
//             args: ['--no-sandbox', '--disable-setuid-sandbox']
//         });
//
//         const context = await browser.newContext();
//
//         // Resource block
//         await context.route('**/*', (route) => {
//             if (['image', 'font', 'media'].includes(route.request().resourceType())) {
//                 return route.abort();
//             }
//             return route.continue();
//         });
//
//         const page = await context.newPage();
//
//         await page.goto('https://www.set.or.th/en/market/index/set/overview', {
//             waitUntil: 'domcontentloaded',
//             timeout: 60000
//         });
//
//         // Status စာသားရှာခြင်း
//         const marketStatus = await page.evaluate(() => {
//             const container = document.querySelector('.quote-market-status');
//             if (container) {
//                 const spanElement = container.querySelector('span');
//                 return spanElement ? spanElement.innerText.trim() : null;
//             }
//             return null;
//         });
//
//         return marketStatus;
//
//     } catch (error) {
//         console.error("❌ Error in statusCheck:", error.message);
//         return null;
//     } finally {
//         if (browser) await browser.close();
//     }
// };
//
// // ⭐ Main Logic: Status စစ်ပြီး DB ထဲသိမ်းခြင်း
// const checkAndSaveResult = async (currentLiveData, io) => {
//     if (!currentLiveData || currentLiveData.twoD === "--") {
//         console.log("⚠️ No live data to save yet.");
//         return false;
//     }
//
//     console.log("🔍 Checking Market Status for Auto-Save...");
//     const status = await statusCheck();
//     console.log(`📊 Current Market Status: ${status}`);
//
//     let sessionToSave = null;
//
//     if (status === 'Intermission') {
//         sessionToSave = "12:01 PM";
//     } else if (status === 'Closed' || status === 'Close') {
//         sessionToSave = "4:30 PM";
//     }
//
//     if (sessionToSave) {
//         try {
//             const savedResult = await updateResultModel.findOneAndUpdate(
//                 { session: sessionToSave },
//                 {
//                     twoD: currentLiveData.twoD,
//                     set: currentLiveData.set,
//                     value: currentLiveData.value,
//                     session: sessionToSave
//                 },
//                 { upsert: true, new: true, setDefaultsOnInsert: true }
//             );
//
//             console.log(`✅ Auto-Saved Result for ${sessionToSave}: ${savedResult.twoD}`);
//
//             if (io) {
//                 io.emit("new_2d_result", {
//                     twoD: savedResult.twoD,
//                     set: savedResult.set,
//                     value: savedResult.value,
//                     session: savedResult.session
//                 });
//             }
//
//             // ⭐ Save လုပ်ပြီးကြောင်း true ပြန်ပေး
//             return true;
//
//         } catch (err) {
//             console.error("❌ DB Save Error:", err);
//             return false;
//         }
//     } else {
//         console.log("ℹ️ Market is Open/Unknown. No save needed.");
//         return false;
//     }
// };
//
// module.exports = { checkAndSaveResult };
//
