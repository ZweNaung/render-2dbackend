const updateResultModel = require('../model/updateResultModel');
const historyForTwoDModel = require('../model/HistoryForTwoDModel');

const checkAndSaveResult = async (scrapedResponse, io) => {

    // Log 1: Data ရောက်မရောက် စစ်မယ်
    // console.log("🔍 Guard Checking...", scrapedResponse?.results?.length);

    if (!scrapedResponse || !scrapedResponse.results || scrapedResponse.results.length === 0) {
        return false;
    }

    const results = scrapedResponse.results;
    let isSessionClosed = false;

    // ⭐ လက်ရှိအချိန် (Server Time) ကို ယူမယ် (ရန်ကုန်အချိန်ရအောင် ညှိယူတာ ပိုသေချာပါတယ်)
    const now = new Date();
    const currentHour = parseInt(now.toLocaleString('en-US', { timeZone: 'Asia/Yangon', hour: 'numeric', hour12: false }));

    // ၁။ UI အတွက် Session Map
    const uiSessionMap = {
        "12:01:00": "12:01 PM",
        "16:30:00": "4:30 PM"
    };

    // ၂။ History အတွက် Time Map
    const historyTimeMap = {
        "11:00:00": "11:00",
        "12:01:00": "12:00",
        "15:00:00": "3:00",
        "16:30:00": "4:00"
    };

    for (const item of results) {
        const rawTime = item.openTime; // API ကလာတဲ့အချိန် (ဥပမာ: "12:01:00")

        // --- (A) UI RESULT သိမ်းခြင်း ---
        const uiSessionName = uiSessionMap[rawTime];
        if (uiSessionName) {
            try {
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

                // Socket နဲ့ UI ကိုလှမ်းပို့မယ်
                if (io) {
                    io.emit("new_2d_result", savedResult);
                    console.log(`🚀 Result Emitted for ${uiSessionName}`);
                }

                // ===============================================
                // ⭐ STOPPING CONDITION (အလုပ်ရပ်မည့် အချိန်စစ်ခြင်း)
                // ===============================================

                // ၁။ မနက်ပိုင်း (နေ့လည် ၂ နာရီမတိုင်ခင်) ဆိုရင် '12:01' တွေ့မှ ရပ်မယ်
                if (currentHour < 14 && rawTime.includes("12:01")) {
                    console.log("✅ Morning Session Done. Stopping...");
                    isSessionClosed = true;
                }

                // ၂။ ညနေပိုင်း (နေ့လည် ၂ နာရီကျော်) ဆိုရင် '16:30' တွေ့မှ ရပ်မယ်
                else if (currentHour >= 14 && rawTime.includes("16:30")) {
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

// Helper Function
async function saveToHistoryDB(date, time, item) {
    try {
        const newEntry = {
            time: time,
            twoD: item.twod,
            set: item.set,
            value: item.value
        };

        await historyForTwoDModel.findOneAndUpdate(
            { date: date },
            { $addToSet: { child: newEntry } },
            { upsert: true, new: true }
        );

        // Log အရမ်းရှုပ်ရင် ဒါကို ပိတ်ထားလို့ရပါတယ်
        console.log(`📜 History Saved: ${date} [${time}]`);
    } catch (error) {
        console.error(`❌ History Save Error: ${error.message}`);
    }
}

module.exports = { checkAndSaveResult };