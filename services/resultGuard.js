const puppeteer = require('puppeteer-extra');
const updateResultModel = require('../model/updateResultModel'); // Path မှန်အောင်ကြည့်ပါ

// User ပေးထားတဲ့ Status Check Function
const statusCheck = async () => {
    let browser = null;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        // Resource block (မြန်အောင်)
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'font', 'media'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        await page.goto('https://www.set.or.th/en/market/index/set/overview', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        const marketStatus = await page.evaluate(() => {
            const container = document.querySelector('.quote-market-status');
            if (container) {
                const spanElement = container.querySelector('span');
                return spanElement ? spanElement.innerText.trim() : null;
            }
            return null;
        });

        return marketStatus;

    } catch (error) {
        console.error("❌ Error in statusCheck:", error.message);
        return null;
    } finally {
        if (browser) await browser.close();
    }
};

// ⭐ Main Logic: Status စစ်ပြီး DB ထဲသိမ်းခြင်း
const checkAndSaveResult = async (currentLiveData, io) => {
    if (!currentLiveData || currentLiveData.twoD === "--") {
        console.log("⚠️ No live data to save yet.");
        return false;
    }

    console.log("🔍 Checking Market Status for Auto-Save...");
    const status = await statusCheck();
    console.log(`📊 Current Market Status: ${status}`);

    let sessionToSave = null;

    // Logic: Status ပေါ်မူတည်ပြီး Session ရွေးမယ်
    if (status === 'Intermission') {
        sessionToSave = "12:01 PM";
    } else if (status === 'Closed' || status === 'Close') {
        sessionToSave = "4:30 PM";
    }

    // Save ရမည့် Status ဖြစ်မှ ဆက်လုပ်မယ်
    if (sessionToSave) {
        try {
            const savedResult = await updateResultModel.findOneAndUpdate(
                { session: sessionToSave },
                {
                    twoD: currentLiveData.twoD,
                    set: currentLiveData.set,
                    value: currentLiveData.value,
                    session: sessionToSave
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            console.log(`✅ Auto-Saved Result for ${sessionToSave}: ${savedResult.twoD}`);

            // UI ကို Update ချက်ချင်းလုပ်ဖို့ Socket ပို့မယ်
            if (io) {
                io.emit("new_2d_result", {
                    twoD: savedResult.twoD,
                    set: savedResult.set,
                    value: savedResult.value,
                    session: savedResult.session
                });
            }

            // ⭐ IMPORTANT: Save လုပ်ပြီးကြောင်း အချက်ပြရန် true ပြန်ပေးမယ်
            return true;

        } catch (err) {
            console.error("❌ DB Save Error:", err);
            return false;
        }
    } else {
        console.log("ℹ️ Market is Open/Unknown. No save needed.");
        return false;
    }
};

module.exports = { checkAndSaveResult };