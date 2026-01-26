require("dotenv").config();
const path = require('path');
const myanmarLotModel = require("../model/myanmarLotModel");
const {PutObjectCommand,S3Client,DeleteObjectCommand} = require("@aws-sdk/client-s3");


// R2 (S3) Client Setup
const s3Client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    }
})

//get all
const getAllMyanmarLot = async (req, res) => {
    try {
        const allMyanmarLot= await myanmarLotModel.find({});
        res.status(200).json({
            success: true,
            message: "Fetch Data Successfully",
            data: allMyanmarLot
        });
    }catch(err){
        res.status(500).json({ error:"An error occurred while fetching data."})
    }
}

//upload
const uploadMyanmarLot =async (req,res)=>{
    try {
        const {name}=req.body;

        if(!name || !req.file){
            return res.status(400).json({ error: "Missing required fields: name, or image" });
        }

        // const fileName=`myanmar_lottery/${Date.now()}-${req.file.originalname}`;

        // ဖိုင် extension (.jpg, .png) ကိုပဲ ယူမယ်
        const ext = path.extname(req.file.originalname);
        // နာမည်ကို Date အတိအကျနဲ့ပဲ ပေးမယ် (User ပေးတဲ့နာမည် မယူတော့ဘူး)
        const fileName = `thai_lottery/${Date.now()}${ext}`;
        const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: fileName,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
        })

        await  s3Client.send(command);
        const publicUrl =`${process.env.R2_PUBLIC_DOMAIN}/${fileName}`;

        const newMyanmarLotData =new myanmarLotModel({
            name: name,
            imgUrl:publicUrl,
        })

        const saveData = await newMyanmarLotData.save();

        res.status(200).json({
            success: true,
            status: "success",
            message:"Upload Success",
            data:saveData
        });

    }catch(err){
        res.status(500).json({error:"An error occurred on the server while inserting data."})
    }
}

//delete
const deleteMyanmarLot = async (req,res,next)=>{
    try {
        const {id} = req.params;
        const deleteToMyanmarLot = await myanmarLotModel.findById(id);

        if(!deleteToMyanmarLot){
            return res.status(404).json({error:"MyanmarLottery not found"})
        }

        if(deleteToMyanmarLot.imgUrl){
            const urlParts = deleteToMyanmarLot.imgUrl.split('/');

            const fileName = urlParts.slice(-2).join('/');

            const command = new DeleteObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: fileName,
            })

            await s3Client.send(command)
        }

        await myanmarLotModel.findByIdAndDelete(id)

        res.status(200).json({
            success: true,
            message:"Deleted Successfully",
            data:deleteToMyanmarLot
        })
    }catch (e) {
        res.status(500).json({ error: "An error occurred while deleting data." });
    }
}

module.exports={
    getAllMyanmarLot,
    uploadMyanmarLot,
    deleteMyanmarLot,
}