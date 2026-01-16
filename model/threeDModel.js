const mongoose = require("mongoose");
const {Schema} = require("mongoose");
const threeDSchema = new Schema({
    result: {
        type: String,
        required: true,
    },
    date:{
        type: String,
        required: true,
        unique: true
    }
})

const ThreeD=mongoose.model("ThreeD",threeDSchema,"three_D_Collection");

module.exports = ThreeD;