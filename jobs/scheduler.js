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
        startIntervalScraping(30000, 'Morning Slow', onDataUpdate);
    }, cronOptions);

    cron.schedule('50 11 * * 1-5', () => {
        stopIntervalScraping();
        startIntervalScraping(15000, 'Morning Fast', onDataUpdate);
    }, cronOptions);

    // Backup Stop (Save မဖြစ်ခဲ့ရင် ၁၂:၁၀ မှာ အတင်းရပ်မယ်)
    cron.schedule('10 12 * * 1-5', async () => {
        await stopIntervalScraping();
    }, cronOptions);

    // ==========================================
    // 🌇 EVENING SCRAPING SESSION
    // ==========================================
    cron.schedule('50 13 * * 1-5', () => {
        startIntervalScraping(30000, 'Evening Slow', onDataUpdate);
    }, cronOptions);

    cron.schedule('50 15 * * 1-5', () => {
        stopIntervalScraping();
        startIntervalScraping(15000, 'Evening Fast', onDataUpdate);
    }, cronOptions);

    // Backup Stop (Save မဖြစ်ခဲ့ရင် ၄:၄၀ မှာ အတင်းရပ်မယ်)
    cron.schedule('40 16 * * 1-5', async () => {
        await stopIntervalScraping();
    }, cronOptions);


    // ==========================================
    // ⭐ AUTO SAVE CHECKER (Logic Updated)
    // ==========================================

    // ၁။ မနက်ပိုင်း ၁၂:၀၀ မှ ၁၂:၀၅ အတွင်း (Intermission စစ်ရန်)
    cron.schedule('0-5 12 * * 1-5', async () => {
        console.log("⏰ 12:00 PM Check Triggered");
        if(latestDataCache) {
            // ⭐ resultGuard က true ပြန်လာရင် ရပ်တော့မယ်
            const isSaved = await checkAndSaveResult(latestDataCache, io);

            if (isSaved) {
                console.log("🛑 Morning Result Saved. Stopping Scraper Immediately.");
                await stopIntervalScraping();
            }
        }
    }, cronOptions);

    // ၂။ ညနေပိုင်း ၄:၃၀ မှ ၄:၃၅ အတွင်း (Closed စစ်ရန်)
    cron.schedule('30-35 16 * * 1-5', async () => {
        console.log("⏰ 4:30 PM Check Triggered");
        if(latestDataCache) {
            // ⭐ resultGuard က true ပြန်လာရင် ရပ်တော့မယ်
            const isSaved = await checkAndSaveResult(latestDataCache, io);

            if (isSaved) {
                console.log("🛑 Evening Result Saved. Stopping Scraper Immediately.");
                await stopIntervalScraping();
            }
        }
    }, cronOptions);
};

module.exports = startScheduler;

