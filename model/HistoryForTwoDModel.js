const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({

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
    },

})

const HistoryTwoDDateSchema = new mongoose.Schema({
    date:{
        type: String,
        required: true,
        unique: true,
    },
    child:[historySchema],
})


module.exports = mongoose.model('HistoryTwoD', HistoryTwoDDateSchema,'HistoryForTwoD');