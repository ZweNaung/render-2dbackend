require('dotenv').config();
const threeDModel = require('../model/threeDModel');


const entryThreeD = async(req,res)=>{
    try{
        const {result , date} = req.body;
        if(!result || !date){
            return res.status(400).json({
                error: "Missing required fields"
            });
        }

        if(!/^\d{3}$/.test(result)){
            return res.status(400).json({
                error: "Result must be exactly 3 digits"
            })
        }

        if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){
            return res.status(400).json({
                error: "Invalid date format. Use yyyy-MM-dd (e.g., 2025-06-27)"
            })
        }

            const newEntry = new threeDModel({
                result: result,
                date: date
            });
            const saveData = await newEntry.save();
            return res.status(201).json({
                success: true,
                message: 'Data saved successfully.',
                data: saveData
            })

    }catch (e) {
        if(e.code === 11000){
            return res.status(400).json({
                error: "Data for this date already exists"
            });
        }
        return res.status(500).json({
            error: e.message
        });
    }
}

const getAllThreeD = async(req,res)=>{
    try{
        const allData = await threeDModel.find().sort({date: -1});

        return res.status(200).json({
            success: true,
            message: 'All data successfully.',
            data: allData
        });
    }catch (e) {
        return res.status(500).json({
            error: e.message
        })
    }
}

const deleteEntries = async(req,res)=>{
    try {
        const {id} = req.params;
        const entryDelete = await threeDModel.findByIdAndDelete(id);
        if(!entryDelete){
            return res.status(404).json({
                error: "Entry not found"
            })
        }
        res.status(200).json({
            success: true,
            message: 'Entry deleted successfully.',
            data: entryDelete
        })
    }catch (e){
        return res.status(500).json({
            error: e.message
        })
    }
}

module.exports ={
    entryThreeD,
    getAllThreeD,
    deleteEntries,
}