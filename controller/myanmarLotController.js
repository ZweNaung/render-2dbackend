require("dotenv").config();
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

        const fileName=`myanmar_lottery/${Date.now()}-${req.file.originalname}`;
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
            status: "success",
            message:"Upload Success",
            data:{
                _id: saveData._id,
                name: saveData.name,
            }
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
            data:{
                _id: deleteToMyanmarLot.id,
                name: deleteToMyanmarLot.name,
            }
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