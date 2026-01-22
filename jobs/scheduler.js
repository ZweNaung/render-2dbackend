const cron = require('node-cron');
const { scrapeData, closeBrowser } = require('../services/scrapeData');

let isScraping = false;
let intervalId = null;

/**
 * Interval-based scraper (safe for puppeteer)
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
        console.log('⏹️ Interval stopped');
    }
    await closeBrowser();
};

/**
 * Scheduler entry
 */
const startScheduler = (onDataUpdate) => {
    console.log('✅ Scheduler Started (Asia/Yangon)');

    const cronOptions = {
        scheduled: true,
        timezone: 'Asia/Yangon'
    };

    // =============================
    // ☀️ MORNING SESSION
    // =============================

    cron.schedule('50 11 * * 1-5', () => {
        startIntervalScraping(30000, 'Morning Slow', onDataUpdate);
    }, cronOptions);

    cron.schedule('57 11 * * 1-5', () => {
        stopIntervalScraping();
        startIntervalScraping(15000, 'Morning Fast', onDataUpdate);
    }, cronOptions);

    cron.schedule('2 12 * * 1-5', async () => {
        await stopIntervalScraping();
    }, cronOptions);

    // =============================
    // 🌇 EVENING SESSION
    // =============================

    cron.schedule('50 15 * * 1-5', () => {
        startIntervalScraping(30000, 'Evening Slow', onDataUpdate);
    }, cronOptions);

    cron.schedule('59 15 * * 1-5', () => {
        stopIntervalScraping();
        startIntervalScraping(15000, 'Evening Fast', onDataUpdate);
    }, cronOptions);

    cron.schedule('32 16 * * 1-5', async () => {
        await stopIntervalScraping();
    }, cronOptions);

    // =============================
    // 🧪 TEST MODE (MANUAL TOGGLE)
    // =============================
    // 👉 TEST MODE ON ချင်ရင် "//" ဖယ်ပါ
    // 👉 TEST MODE OFF ချင်ရင် "//" ထားပါ

    startIntervalScraping(15000, 'TEST MODE', onDataUpdate);
};

module.exports = startScheduler;


// const cron = require('node-cron');
// const { scrapeData, closeBrowser } = require('../services/scrapeData');
//
// let isScraping = false;
//
// const startScheduler = (onDataUpdate) => {
//     console.log("✅ Scheduler Started (Myanmar Time) + Test Mode ON...");
//
//     const runScraperSafe = async (modeName) => {
//         if (isScraping) return;
//
//         isScraping = true;
//         try {
//             const data = await scrapeData();
//             if (data) {
//                 console.log(`[${modeName}] 🕒 ${new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Yangon', hour12: false })} -> 2D: ${data.twoD} (Val: ${data.value})`);
//             }
//             if(onDataUpdate){
//                 onDataUpdate(data)
//             }
//         } catch (error) {
//             console.error(`❌ Job Error:`, error.message);
//         } finally {
//             isScraping = false;
//         }
//     };
//
//     const cronOptions = {
//         scheduled: true,
//         timezone: "Asia/Yangon"
//     };
//
//     // ==========================================
//     // 🧪 TEST MODE (စမ်းသပ်ရန် - ၁၀ စက္ကန့်တစ်ခါ)
//     // ==========================================
//     cron.schedule('*/10 * * * * *', () => {
//         runScraperSafe("🚀 TEST MODE");
//     }, cronOptions);
//
//
//     // ==========================================
//     // ☀️ MORNING SESSION (11:50 - 12:01)
//     // ==========================================
//     cron.schedule('*/30 50-56 11 * * 1-5', () => runScraperSafe("Morning Slow"), cronOptions);
//     cron.schedule('*/5 57-59 11 * * 1-5', () => runScraperSafe("Morning Fast"), cronOptions);
//     cron.schedule('*/5 0-1 12 * * 1-5', () => runScraperSafe("Morning Fast"), cronOptions);
//
//     // 🛑 12:02 -> Close Browser
//     cron.schedule('0 2 12 * * 1-5', async () => await closeBrowser(), cronOptions);
//
//     // ==========================================
//     // 🌇 EVENING SESSION (15:50 - 16:31)
//     // ==========================================
//     cron.schedule('*/30 50-58 15 * * 1-5', () => runScraperSafe("Evening Slow"), cronOptions);
//     cron.schedule('*/5 59 15 * * 1-5', () => runScraperSafe("Evening Fast"), cronOptions);
//     cron.schedule('*/5 0-31 16 * * 1-5', () => runScraperSafe("Evening Fast"), cronOptions);
//
//     // 🛑 16:32 -> Close Browser
//     cron.schedule('0 32 16 * * 1-5', async () => await closeBrowser(), cronOptions);
// };
//
// module.exports = startScheduler;