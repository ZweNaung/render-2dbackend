const cron = require('node-cron');
const { scrapeData, closeBrowser } = require('../services/scrapeData');
const { checkAndSaveResult } = require('../services/resultGuard');

let isScraping = false;
let intervalId = null;

const startIntervalScraping = (intervalMs, modeName, onDataUpdate, io) => {
    if (intervalId) return;

    console.log(`▶️ ${modeName} started (${intervalMs / 1000}s)`);

    intervalId = setInterval(async () => {
        if (isScraping) return;

        isScraping = true;
        try {
            const scrapedResponse = await scrapeData();

            // scrapedResponse ရှိမှ ဆက်လုပ်မယ်
            if (scrapedResponse && scrapedResponse.live) {

                // ၁။ Socket နဲ့ Data ပို့ဖို့ app.js ဆီ Response တစ်ခုလုံး ပို့မယ်
                if (onDataUpdate) {
                    onDataUpdate(scrapedResponse);
                }

                // ၂။ Result Auto Save စစ်ဆေးမယ်
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

const stopIntervalScraping = async () => {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        console.log('⏹️ Interval stopped');
    }
    await closeBrowser();
};

const startScheduler = (onDataUpdate, io) => {
    console.log('✅ Scheduler Started (Asia/Yangon)');

    const cronOptions = {
        scheduled: true,
        timezone: 'Asia/Yangon'
    };

    // ==========================================
    // ☀️ MORNING SESSION
    // ==========================================
    cron.schedule('50 09 * * 1-5', () => {
        startIntervalScraping(15000, 'Morning Slow', onDataUpdate, io);
    }, cronOptions);

    cron.schedule('50 11 * * 1-5', () => {
        stopIntervalScraping();
        startIntervalScraping(5000, 'Morning Fast', onDataUpdate, io);
    }, cronOptions);

    cron.schedule('10 12 * * 1-5', async () => {
        await stopIntervalScraping();
    }, cronOptions);

    // ==========================================
    // 🌇 EVENING SESSION
    // ==========================================
    cron.schedule('50 13 * * 1-5', () => {
        startIntervalScraping(15000, 'Evening Slow', onDataUpdate, io);
    }, cronOptions);

    // 3:50 PM မှာ Fast Mode စမယ်
    cron.schedule('50 15 * * 1-5', () => {
        stopIntervalScraping();
        startIntervalScraping(5000, 'Evening Fast', onDataUpdate, io);
    }, cronOptions);

    // 4:40 PM မှာ Backup အနေနဲ့ အတင်းပိတ်မယ် (resultGuard က 4:35 မှာ မပိတ်လိုက်နိုင်ရင် ဒါက ပိတ်ပေးလိမ့်မယ်)
    cron.schedule('40 16 * * 1-5', async () => {
        await stopIntervalScraping();
    }, cronOptions);

    // ==========================================
    // 🧪 TEST MODE
    // ==========================================
    const runTest = false; // Production အတွက် false ထားပါ

    if (runTest) {
        console.log("⚠️ TEST MODE ACTIVATED...");
        startIntervalScraping(10000, 'TEST_RUN', onDataUpdate, io);
    }
};

module.exports = startScheduler;