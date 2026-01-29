const axios = require('axios');
const StockApiResponse = require('../model/thaistock2d'); // Model ကို import လုပ်ပါ

async function getStockData() {
    try {
        const response = await axios.get('https://api.thaistock2d.com/live',
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
                },
                timeout: 5000
            }
            );

        // Raw JSON ကို Model Class ထဲ ထည့်လိုက်ပါ
        const stockData = new StockApiResponse(response.data);

        // အခုဆိုရင် Dot notation (.) နဲ့ လှမ်းခေါ်လို့ရပါပြီ
        console.log(`Server Time: ${stockData.serverTime}`);
        console.log(`Current 2D: ${stockData.live.twod}`);
        console.log(`Current Set: ${stockData.live.set}`);
        console.log(`Current Value: ${stockData.live.value}`);

        // List (Array) ကို Loop ပတ်ပြီး ထုတ်ကြည့်ခြင်း
        console.log("--- History ---");
        stockData.result.forEach(history => {
            console.log(`Time: ${history.openTime} | TwoD: ${history.twod}`);
            console.log(`Time: ${history.openTime} | Set: ${history.set}`);
            console.log(`Time: ${history.openTime} | Value: ${history.value}`);
        });

        return stockData;

    } catch (error) {
        console.error("Error fetching data", error);
    }
}

getStockData();