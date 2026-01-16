const mongoose = require('mongoose');
const {Schema} = require('mongoose');

const modernSchema = new Schema({
    title: {type: String, required: true},
    modern: {type: String, required: true},
    internet:{type:String,required: true},
})

const ModernAndInternet=mongoose.model('modern',modernSchema,"modern_Collection");

module.exports= ModernAndInternet