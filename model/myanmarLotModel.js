const mongoose = require('mongoose');
const {Schema} = require('mongoose');
const myanmarLotSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    imgUrl:{
        type: String,
        required: true,
    },
});

const myanmarLot = mongoose.model("myanmarLot",myanmarLotSchema,"myanmar_Lot_Collection");

module.exports = myanmarLot;