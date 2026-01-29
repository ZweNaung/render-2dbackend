// 1. Live စာရင်းအတွက် Model (Nested Class)
class LiveData {
    constructor(data) {
        this.set = data?.set || "0.00";
        this.value = data?.value || "0.00";
        this.time = data?.time || "";
        this.twod = data?.twod || "--";
        this.date = data?.date || "";
    }
}

// 2. Result ထဲက အချိန်အလိုက်ထွက်တဲ့ စာရင်းအတွက် Model
class HistoryItem {
    constructor(data) {
        this.set = data?.set || "--";
        this.value = data?.value || "--";
        this.openTime = data?.open_time || "";
        this.twod = data?.twod || "--";
        this.stockDate = data?.stock_date || "";
        this.stockDatetime = data?.stock_datetime || "";
        this.historyId = data?.history_id || null;
    }
}

// 3. Holiday အတွက် Model
class HolidayData {
    constructor(data) {
        this.status = data?.status || "";
        this.date = data?.date || "";
        this.name = data?.name || null;
    }
}

// 4. Main Response Model (Root)
class StockApiResponse {
    constructor(data) {
        this.serverTime = data?.server_time || "";

        // Nested Object ဖြစ်တဲ့အတွက် Class ပြန်ဆောက်ပေးရမယ်
        this.live = new LiveData(data?.live || {});

        // Array ဖြစ်တဲ့အတွက် map သုံးပြီး Object ပြောင်းပေးရမယ်
        this.result = (data?.result || []).map(item => new HistoryItem(item));

        this.holiday = new HolidayData(data?.holiday || {});
    }
}

module.exports = StockApiResponse;