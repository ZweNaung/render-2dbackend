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
    const yangonTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Yangon' }));
    const currentHour = yangonTime.getHours();
    const currentMinute = yangonTime.getMinutes();

    const uiSessionMap = {
        "12:01:00": "12:01 PM",
        "16:30:00": "4:30 PM"
    };

    const historyTimeMap = {
        "11:00:00": "11:00",
        "12:01:00": "12:00",
        "15:00:00": "3:00",
        "16:30:00": "4:30"
    };

    for (const item of results) {
        const rawTime = item.openTime;

        // --- (A) UI RESULT သိမ်းခြင်း (SMART SAVE) ---
        const uiSessionName = uiSessionMap[rawTime];
        if (uiSessionName) {
            try {
                // UI မှာ Dash ဖြစ်နေရင် (ဂဏန်းမထွက်သေးရင်) Update မလုပ်ဘူး (Optional)
                // if (item.twod !== "--") {
                const existingResult = await updateResultModel.findOne({
                    session: uiSessionName,
                    twoD: item.twod
                });

                if (!existingResult) {
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
                        console.log(`🚀 Result Emitted for ${uiSessionName} (New/Updated)`);
                    }
                }
                // }

                // ===============================================
                // ⭐ STOPPING CONDITION (Logic ပြင်ဆင်ထားသည်)
                // ===============================================

                // ၁။ မနက်ပိုင်း (၁၂:၀၁ ကျော်ရင် ရပ်မယ်)
                if (currentHour === 12 && currentMinute >= 1 && rawTime.includes("12:01")) {
                    console.log("✅ Morning Session Done (12:01+). Stopping...");
                    isSessionClosed = true;
                }

                    // ၂။ ညနေပိုင်း (၄:၃၅ ကျော်မှ ရပ်မယ် - ဂဏန်းအမှန်ထွက်ဖို့ ၅ မိနစ်စောင့်သည်)
                // ⚠️ ပြင်လိုက်တဲ့နေရာ: currentMinute >= 35
                else if (currentHour === 16 && currentMinute >= 35 && rawTime.includes("16:30")) {
                    console.log("✅ Evening Session Done (4:35+). Stopping...");
                    isSessionClosed = true;
                }

                // Backup Stop (၅ နာရီကျော်ရင် အတင်းရပ်မယ်)
                else if (currentHour >= 17) {
                    isSessionClosed = true;
                }

            } catch (err) {
                console.error(`❌ UI Result Save Error:`, err.message);
            }
        }

        // --- (B) HISTORY သိမ်းခြင်း (SMART SAVE) ---
        const historyTime = historyTimeMap[rawTime];
        if (historyTime) {
            const dateStr = item.stockDate || new Date().toISOString().split('T')[0];
            const [year, month, day] = dateStr.split('-');
            const formattedDate = `${day}-${month}-${year}`;

            // ဂဏန်းထွက်မှ (Dash မဟုတ်မှ) History ထဲ save မယ်ဆိုရင် ဒီ if ခံပါ
            if (item.twod !== "--") {
                await saveToHistoryDB(formattedDate, historyTime, item);
            }
        }
    }

    return isSessionClosed;
};

// ⭐ Helper Logic (Smart Save for History)
async function saveToHistoryDB(date, time, item) {
    try {
        const exists = await historyForTwoDModel.findOne({
            date: date,
            child: {
                $elemMatch: {
                    time: time,
                    twoD: item.twod
                }
            }
        });

        if (exists) return;

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

        console.log(`📜 History Saved: ${date} [${time}] (Updated)`);

    } catch (error) {
        console.error(`❌ History Save Error: ${error.message}`);
    }
}

module.exports = { checkAndSaveResult };



// const updateResultModel = require('../model/updateResultModel');
// const historyForTwoDModel = require('../model/HistoryForTwoDModel');
//
// const checkAndSaveResult = async (scrapedResponse, io) => {
//
//     if (!scrapedResponse || !scrapedResponse.results || scrapedResponse.results.length === 0) {
//         return false;
//     }
//
//     const results = scrapedResponse.results;
//     let isSessionClosed = false;
//
//     // ⭐ Server Time (Asia/Yangon)
//     const now = new Date();
//     const yangonTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Yangon' }));
//     const currentHour = yangonTime.getHours();
//     const currentMinute = yangonTime.getMinutes();
//
//     const uiSessionMap = {
//         "12:01:00": "12:01 PM",
//         "16:30:00": "4:30 PM"
//     };
//
//     const historyTimeMap = {
//         "11:00:00": "11:00",
//         "12:01:00": "12:00",
//         "15:00:00": "3:00",
//         "16:30:00": "4:30"
//     };
//
//     for (const item of results) {
//         const rawTime = item.openTime;
//
//         // --- (A) UI RESULT သိမ်းခြင်း (SMART SAVE) ---
//         const uiSessionName = uiSessionMap[rawTime];
//
//         if (uiSessionName) {
//             try {
//                 // ၁။ Database ထဲမှာ ဒီ session နဲ့ ဂဏန်းတူတာ ရှိပြီးသားလား စစ်မယ်
//                 const existingResult = await updateResultModel.findOne({
//                     session: uiSessionName,
//                     twoD: item.twod // ဂဏန်းပါ တူနေလား?
//                 });
//
//                 // ၂။ မရှိမှ (သို့) ဂဏန်းမတူမှ Update လုပ်မယ်
//                 if (!existingResult) {
//                     const savedResult = await updateResultModel.findOneAndUpdate(
//                         { session: uiSessionName },
//                         {
//                             twoD: item.twod,
//                             set: item.set,
//                             value: item.value,
//                             session: uiSessionName
//                         },
//                         { upsert: true, new: true }
//                     );
//
//                     if (io) {
//                         io.emit("new_2d_result", savedResult);
//                         console.log(`🚀 Result Emitted for ${uiSessionName} (New/Updated)`);
//                     }
//                 }
//                 // ရှိပြီးသားဆိုရင် ဘာမှမလုပ်ဘူး (Log လည်းမပြတော့ဘူး)
//
//                 // ===============================================
//                 // ⭐ STOPPING CONDITION
//                 // ===============================================
//                 // ၁။ မနက်ပိုင်း (၁၂:၀၁ ကျော်ရင် ရပ်မယ်)
//                 if (currentHour === 12 && currentMinute >= 1 && rawTime.includes("12:01")) {
//                     console.log("✅ Morning Session Done (12:01+). Stopping...");
//                     isSessionClosed = true;
//                 }
//                 // ၂။ ညနေပိုင်း (၄:၃၀ ကျော်ရင် ရပ်မယ်)
//                 else if (currentHour === 16 && currentMinute >= 30 && rawTime.includes("16:30")) {
//                     console.log("✅ Evening Session Done (4:30+). Stopping...");
//                     isSessionClosed = true;
//                 }
//                 // Backup Stop
//                 else if (currentHour >= 17) {
//                     isSessionClosed = true;
//                 }
//
//             } catch (err) {
//                 console.error(`❌ UI Result Save Error:`, err.message);
//             }
//         }
//
//         // --- (B) HISTORY သိမ်းခြင်း (SMART SAVE) ---
//         const historyTime = historyTimeMap[rawTime];
//         if (historyTime) {
//             const dateStr = item.stockDate || new Date().toISOString().split('T')[0];
//             const [year, month, day] = dateStr.split('-');
//             const formattedDate = `${day}-${month}-${year}`;
//
//             await saveToHistoryDB(formattedDate, historyTime, item);
//         }
//     }
//
//     return isSessionClosed;
// };
//
// // ⭐ Helper Logic (Smart Save for History)
// async function saveToHistoryDB(date, time, item) {
//     try {
//         // ၁။ အရင်ဆုံး Database ထဲမှာ ဒီရက်၊ ဒီအချိန်၊ ဒီဂဏန်း နဲ့ ရှိပြီးသားလား စစ်မယ်
//         const exists = await historyForTwoDModel.findOne({
//             date: date,
//             child: {
//                 $elemMatch: {
//                     time: time,
//                     twoD: item.twod // ဂဏန်းပါ တူနေရမယ်
//                 }
//             }
//         });
//
//         // ၂။ ရှိပြီးသားဆိုရင် (Duplicate) ဘာမှမလုပ်ဘဲ ကျော်သွားမယ်
//         if (exists) {
//             return;
//         }
//
//         // ၃။ မရှိသေးဘူး (သို့) ဂဏန်းပြောင်းသွားတယ်ဆိုမှ အဟောင်းဖျက် အသစ်ထည့်မယ်
//         const newEntry = {
//             time: time,
//             twoD: item.twod,
//             set: item.set,
//             value: item.value
//         };
//
//         await historyForTwoDModel.updateOne(
//             { date: date },
//             { $pull: { child: { time: time } } }
//         );
//
//         await historyForTwoDModel.findOneAndUpdate(
//             { date: date },
//             { $push: { child: newEntry } },
//             { upsert: true, new: true }
//         );
//
//         console.log(`📜 History Saved: ${date} [${time}] (Updated)`);
//
//     } catch (error) {
//         console.error(`❌ History Save Error: ${error.message}`);
//     }
// }
//
// module.exports = { checkAndSaveResult };
//
//
