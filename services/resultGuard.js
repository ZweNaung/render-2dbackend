const updateResultModel = require('../model/updateResultModel');
const historyForTwoDModel = require('../model/HistoryForTwoDModel');

const checkAndSaveResult = async (currentLiveData, io) => {

    // API Result မပါရင် ပြန်ထွက်မယ်
    if (!currentLiveData || !currentLiveData.results) {
        return false;
    }

    const results = currentLiveData.results;
    let isSessionClosed = false;

    // ==========================================
    // ⭐ MAPPING (ဒီအချိန်တွေကို သေချာကြည့်ပါ)
    // ==========================================

    // API ကလာတဲ့အချိန် -> DB ထဲထည့်မယ့်အချိန်
    const historyTimeMap = {
        "11:00:00": "11:00",
        "12:01:00": "12:00",
        "15:00:00": "3:00",
        "16:30:00": "4:00"
    };

    // UI Session (၁၂:၀၁ နဲ့ ၄:၃၀ သာ)
    const uiSessionMap = {
        "12:01:00": "12:01 PM",
        "16:30:00": "4:30 PM"
    };

    // ==========================================
    // LOOP & SAVE
    // ==========================================
    for (const item of results) {

        // (A) History Auto Save Logic (၁၁, ၁၂, ၃, ၄ အကုန်စစ်မယ်)
        const historyTime = historyTimeMap[item.open_time];

        if (historyTime) {
            // stock_date မပါရင် ဒီနေ့ရက်စွဲယူမယ်
            const dateStr = item.stock_date || new Date().toISOString().split('T')[0];

            // ⭐ ဒီ function က ရှိပြီးသားဆိုရင် ထပ်မထည့်အောင် ကာကွယ်ပြီးသားပါ
            await saveToHistoryDB(dateStr, historyTime, item);
        }

        // (B) UI Update Logic (၁၂:၀၁ နဲ့ ၄:၃၀ သာ)
        const dbSession = uiSessionMap[item.open_time];
        if (dbSession) {
            try {
                const savedResult = await updateResultModel.findOneAndUpdate(
                    { session: dbSession },
                    {
                        twoD: item.twod,
                        set: item.set,
                        value: item.value,
                        session: dbSession
                    },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );

                if (io) io.emit("new_2d_result", savedResult);

                // ၁၂:၀၀ နဲ့ ၄:၃၀ တွေ့မှ Scraper ရပ်မယ် (၁၁ နာရီမှာ မရပ်ဘူး)
                isSessionClosed = true;

            } catch (err) {
                console.error(`❌ UI Save Error:`, err.message);
            }
        }
    }

    return isSessionClosed;
};

// ... (saveToHistoryDB နဲ့ cleanupOldHistory က အရင်အတိုင်း မှန်ပါတယ်) ...
// (အပြည့်အစုံ လိုချင်ရင် အရင်အဖြေက code ကိုပဲ ကူးထည့်ပါ၊ အောက်ပိုင်း မပြောင်းပါဘူး)

async function saveToHistoryDB(date, time, item) {
    try {
        let dailyDoc = await historyForTwoDModel.findOne({ date });
        const newEntry = {
            time: time,
            twoD: item.twod,
            set: item.set,
            value: item.value
        };

        if (dailyDoc) {
            // ရှိပြီးသားလား စစ်တယ်
            const isTimeExists = dailyDoc.child.some(c => c.time === time);
            if (!isTimeExists && dailyDoc.child.length < 4) {
                dailyDoc.child.push(newEntry);
                await dailyDoc.save();
                console.log(`📜 History Auto-Saved: ${date} [${time}]`);
            }
        } else {
            // မရှိရင် အသစ်ဆောက်တယ်
            await historyForTwoDModel.create({
                date: date,
                child: [newEntry]
            });
            console.log(`📜 New History Created: ${date}`);
        }
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
