const mongoose = require('mongoose');
const {Schema} = require("mongoose");
const omenSchema= new Schema({
    name: {
        type: String,
        required: true
    },

    imgUrl:{
        type:String,
        required: true
    },

});

const Omen = mongoose.model("Omen",omenSchema);
module.exports = Omen;



