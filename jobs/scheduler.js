const cron = require('node-cron');
const { scrapeData, closeBrowser } = require('../services/scrapeData');
// resultGuard ကို လှမ်းခေါ်မယ်
const { checkAndSaveResult } = require('../services/resultGuard');

let isScraping = false;
let intervalId = null;

/**
 * Interval-based scraper
 */
const startIntervalScraping = (intervalMs, modeName, onDataUpdate, io) => {
    if (intervalId) return;

    console.log(`▶️ ${modeName} started (${intervalMs / 1000}s)`);

    intervalId = setInterval(async () => {
        if (isScraping) return;

        isScraping = true;
        try {
            // ⭐ ပြင်လိုက်တဲ့နေရာ (၁) - response တစ်ခုလုံးကို ဆွဲယူလိုက်တယ်
            const scrapedResponse = await scrapeData();

            // ⭐ ပြင်လိုက်တဲ့နေရာ (၂) - live data ပါမှ အလုပ်လုပ်မယ်
            if (scrapedResponse && scrapedResponse.live) {
                const data = scrapedResponse.live;

                // Socket နဲ့ Live ပြဖို့ app.js ရဲ့ callback ဆီ ပို့တယ်
                if (onDataUpdate) onDataUpdate(data);

                // ⭐ ပြင်လိုက်တဲ့နေရာ (၃) - ရလာတဲ့ result တွေကို DB ထဲ auto-save ဖို့ resultGuard ဆီ ပို့တယ်
                // scrapedResponse ထဲမှာ live ရော results (array) ရော ပါသွားပြီ
                const shouldStop = await checkAndSaveResult(scrapedResponse, io);

                if (shouldStop) {
                    console.log(`🛑 Result confirmed. Stopping ${modeName}...`);
                    await stopIntervalScraping();
                }
            }

        } catch (e) {
            console.error('❌ Scrape error:', e.message);
        } finally {
            isScraping = false;
        }
    }, intervalMs);
};

/**
 * Stop interval safely
 */
const stopIntervalScraping = async () => {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        console.log('⏹️ Interval stopped');
    }
    // API သုံးထားလို့ closeBrowser က error မတက်ပေမယ့် ထည့်ထားတာ ပိုစိတ်ချရပါတယ်
    await closeBrowser();
};

/**
 * Scheduler entry
 */
const startScheduler = (onDataUpdate, io) => {
    console.log('✅ Scheduler Started (Asia/Yangon)');

    const cronOptions = {
        scheduled: true,
        timezone: 'Asia/Yangon'
    };

    // ==========================================
    // ☀️ MORNING SESSION (9:50 - 12:10)
    // ==========================================
    cron.schedule('50 09 * * 1-5', () => {
        startIntervalScraping(15000, 'Morning Slow', onDataUpdate, io);
    }, cronOptions);

    cron.schedule('50 11 * * 1-5', () => {
        stopIntervalScraping();
        startIntervalScraping(5000, 'Morning Fast', onDataUpdate, io);
    }, cronOptions);

    // Force Stop at 12:10 (Backup)
    cron.schedule('10 12 * * 1-5', async () => {
        await stopIntervalScraping();
    }, cronOptions);

    // ==========================================
    // 🌇 EVENING SESSION (1:50 - 4:40)
    // ==========================================
    cron.schedule('50 13 * * 1-5', () => {
        startIntervalScraping(15000, 'Evening Slow', onDataUpdate, io);
    }, cronOptions);

    cron.schedule('50 15 * * 1-5', () => {
        stopIntervalScraping();
        startIntervalScraping(5000, 'Evening Fast', onDataUpdate, io);
    }, cronOptions);

    // Force Stop at 16:40 (Backup)
    cron.schedule('40 16 * * 1-5', async () => {
        await stopIntervalScraping();
    }, cronOptions);

    // ==========================================
    // 🧪 TEST MODE
    // ==========================================
    const runTest = false; // Production တင်ရင် false ထားပါ

    if (runTest) {
        console.log("⚠️ TEST MODE ACTIVATED...");
        startIntervalScraping(10000, 'TEST_RUN', onDataUpdate, io);
    }
};

module.exports = startScheduler;