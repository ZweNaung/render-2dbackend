const cron = require('node-cron');
const { scrapeData, closeBrowser } = require('../services/scrapeData');
const { checkAndSaveResult } = require('../services/resultGuard');

let isScraping = false;
let intervalId = null;
let latestDataCache = null;

/**
 * Interval-based scraper
 */
const startIntervalScraping = (intervalMs, modeName, onDataUpdate) => {
    if (intervalId) return;

    console.log(`▶️ ${modeName} started (${intervalMs / 1000}s)`);

    intervalId = setInterval(async () => {
        if (isScraping) return;

        isScraping = true;
        try {
            const data = await scrapeData();
            if (data) {
                latestDataCache = data;

                console.log(
                    `[${modeName}] ${new Date().toLocaleTimeString(
                        'en-US',
                        { timeZone: 'Asia/Yangon', hour12: false }
                    )} -> 2D: ${data.twoD}`
                );

                if (onDataUpdate) {
                    onDataUpdate(data);
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
 * Stop interval + close browser safely
 */
const stopIntervalScraping = async () => {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        console.log('⏹️ Interval stopped by Scheduler');
    }
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
    // ☀️ MORNING SCRAPING SESSION
    // ==========================================
    cron.schedule('50 09 * * 1-5', () => {
        startIntervalScraping(15000, 'Morning Slow', onDataUpdate);
    }, cronOptions);

    cron.schedule('50 11 * * 1-5', () => {
        stopIntervalScraping();
        startIntervalScraping(5000, 'Morning Fast', onDataUpdate);
    }, cronOptions);

    // Backup Stop (Save မဖြစ်ခဲ့ရင် ၁၂:၁၀ မှာ အတင်းရပ်မယ်)
    cron.schedule('10 12 * * 1-5', async () => {
        await stopIntervalScraping();
    }, cronOptions);

    // ==========================================
    // 🌇 EVENING SCRAPING SESSION
    // ==========================================
    cron.schedule('50 13 * * 1-5', () => {
        startIntervalScraping(15000, 'Evening Slow', onDataUpdate);
    }, cronOptions);

    cron.schedule('50 15 * * 1-5', () => {
        stopIntervalScraping();
        startIntervalScraping(5000, 'Evening Fast', onDataUpdate);
    }, cronOptions);

    // Backup Stop (Save မဖြစ်ခဲ့ရင် ၄:၄၀ မှာ အတင်းရပ်မယ်)
    cron.schedule('40 16 * * 1-5', async () => {
        await stopIntervalScraping();
    }, cronOptions);


    // ==========================================
    // ⭐ AUTO SAVE CHECKERS (4 Times)
    // ==========================================

    // ၁။ ☀️ 11:00 AM Check (အသစ်ထည့်ထားသည်)
    // ၁၁:၀၀ ကနေ ၁၁:၀၅ အတွင်း စစ်မယ်၊ တွေ့ရင် Save မယ်၊ Scraper မရပ်ဘူး
    cron.schedule('0-5 11 * * 1-5', async () => {
        console.log("⏰ 11:00 AM Check Triggered");
        if(latestDataCache) {
            await checkAndSaveResult(latestDataCache, io);
        }
    }, cronOptions);

    // ၂။ ☀️ 12:00 PM Check (Logic: 12:01 Result)
    cron.schedule('0-10 12 * * 1-5', async () => {
        console.log("⏰ 12:00 PM Check Triggered");
        if(latestDataCache) {
            // ⭐ 12:00 မှာ Result ရရင် Scraper ရပ်မယ် (true ပြန်လာရင်)
            const isSaved = await checkAndSaveResult(latestDataCache, io);
            if (isSaved) {
                console.log("🛑 Morning Result Saved. Stopping Scraper Immediately.");
                await stopIntervalScraping();
            }
        }
    }, cronOptions);

    // ၃။ 🌇 3:00 PM Check (အသစ်ထည့်ထားသည်)
    // ၃:၀၀ ကနေ ၃:၀၅ အတွင်း စစ်မယ်၊ တွေ့ရင် Save မယ်၊ Scraper မရပ်ဘူး
    cron.schedule('0-5 15 * * 1-5', async () => {
        console.log("⏰ 3:00 PM Check Triggered");
        if(latestDataCache) {
            await checkAndSaveResult(latestDataCache, io);
        }
    }, cronOptions);

    // ၄။ 🌇 4:30 PM Check (Logic: 16:30 Result)
    cron.schedule('30-40 16 * * 1-5', async () => {
        console.log("⏰ 4:30 PM Check Triggered");
        if(latestDataCache) {
            // ⭐ 4:30 မှာ Result ရရင် Scraper ရပ်မယ် (true ပြန်လာရင်)
            const isSaved = await checkAndSaveResult(latestDataCache, io);
            if (isSaved) {
                console.log("🛑 Evening Result Saved. Stopping Scraper Immediately.");
                await stopIntervalScraping();
            }
        }
    }, cronOptions);

    // ==========================================
    // 🧪 TEST MODE
    // ==========================================

    // 👇 Production တင်ရင် false ပြောင်းပါ
    const runTest = true;

    if (runTest) {
        console.log("⚠️ TEST MODE ACTIVATED: Running immediate scrape...");
        startIntervalScraping(10000, 'TEST_RUN', onDataUpdate);

        setTimeout(async () => {
            console.log("🧪 Test Mode: Auto-stopping after 2 minutes.");
            await stopIntervalScraping();
        }, 120000);
    }
};

module.exports = startScheduler;