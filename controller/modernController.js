require('dotenv').config();
const cron = require('node-cron');
const modernModel=require('../model/modernAndInternet');

const createEntry=async(req,res)=>{
    try{
        const {title,modern,internet}=req.body;


        const updatedEntry = await modernModel.findOneAndUpdate(
            {title:title},
        {
           modern:modern,
            internet:internet
        },
            {new:true,upsert:true}
        );

        res.status(200).json({
            success:true,
            message:`${title} added successfully.`,
            data:updatedEntry
        })
    }catch(err){
        res.status(500).json({
            success:false,
            error:err.message,
        })
    }
}

const getEntriesByTitle=async(req,res)=>{
    try {
        const {title}=req.params;
        const entry = await modernModel.findOne({title:title})

        if(!entry){
            return res.status(404).json({ success: false, message: "Data not found" });
        }
        res.status(200).json({
            success:true,
            message:"Successfully found",
            data:entry
        })
    }catch (err){
        res.status(500).json({
            success:false,
            error:err.message,
        })
    }
}

module.exports = {
    createEntry,
    getEntriesByTitle,
}