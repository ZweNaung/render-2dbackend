const mongoose = require('mongoose');
const {Schema} = require('mongoose');
const ThaiLotterySchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    imgUrl:{
        type: String,
        required: true,
    },
});

const ThaiLottery = mongoose.model("thaiLottery",ThaiLotterySchema,"thai_Lottery_Collection");

module.exports = ThaiLottery;