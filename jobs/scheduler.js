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

                 // app.js ဆီကို Live data ကော Result data ကော ပါတဲ့
                // scrapedResponse တစ်ခုလုံးကို onDataUpdate callback နဲ့ ပို့ပေးလိုက်တာပါ
                if (onDataUpdate) {
                    onDataUpdate(scrapedResponse);
                }

                // ၂။ Database ထဲ သိမ်းဖို့အတွက်လည်း scrapedResponse ကိုပဲ သုံးမယ်
            const shouldStop = await checkAndSaveResult(scrapedResponse, io);

            if (shouldStop) {
                console.log(`🛑 Result confirmed. Stopping ${modeName}...`);
                await stopIntervalScraping();
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
    const runTest = true; // Production တင်ရင် false ထားပါ

    if (runTest) {
        console.log("⚠️ TEST MODE ACTIVATED...");
        startIntervalScraping(10000, 'TEST_RUN', onDataUpdate, io);
    }
};

module.exports = startScheduler;