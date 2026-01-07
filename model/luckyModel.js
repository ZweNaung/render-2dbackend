const mongoose = require('mongoose');
const {Schema} = require('mongoose');
const luckySchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    imgUrl:{
        type: String,
        required: true,
    },
    section:{
        type: String,
        required: true,
        enum:['week','day']
    }
});

const Lucky = mongoose.model("Lucky", luckySchema,"lucky_collection");
module.exports = Lucky;

//testing
