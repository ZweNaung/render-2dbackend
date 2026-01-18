const mongoose = require('mongoose');
const {Schema} = require('mongoose');

const updateResultSchema = new Schema({

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
    session: {
        type: String,
        required: true,
        enum: ["12:01 PM", "4:30 PM"]
    },
})

const updateResultModel=mongoose.model('updateResult',updateResultSchema,"updateResult_Collection");

module.exports= updateResultModel;