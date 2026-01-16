const mongoose = require('mongoose');

const DailyResultChildSchema = new mongoose.Schema({

    time: {
        type: String,
        required: true,
    },
    twoD: {
        type: String,
        required: true,
    },
    set: {
        type: String,
        required: true,
    },
    value: {
        type: String,
        required: true,
    }
})

const DateSchema = new mongoose.Schema({
    date:{
        type: String,
        required: true,
        unique: true,
    },
    child:[DailyResultChildSchema],
})


module.exports = mongoose.model('DailyResult', DateSchema,'daily_results');