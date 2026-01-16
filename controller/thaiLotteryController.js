require("dotenv").config();
const thaiLotteryModel = require("../model/thaiLotteryModel");
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
const getAllThaiLottery = async (req, res) => {
    try {
        const allThaiLottery= await thaiLotteryModel.find({});
        res.status(200).json({
            success: true,
            message: "Fetch Data Successfully",
            data: allThaiLottery
        });
    }catch(err){
        res.status(500).json({ error:"An error occurred while fetching data."})
    }
}

//upload
const uploadThaiLottery =async (req,res)=>{
    try {
        const {name}=req.body;

        if(!name || !req.file){
            return res.status(400).json({ error: "Missing required fields: name, or image" });
        }

        const fileName=`thai_lottery/${Date.now()}-${req.file.originalname}`;
        const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: fileName,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
        })

        await  s3Client.send(command);
        const publicUrl =`${process.env.R2_PUBLIC_DOMAIN}/${fileName}`;

        const newThiaLotteryData =new thaiLotteryModel({
            name: name,
            imgUrl:publicUrl,
            })

        const saveData = await newThiaLotteryData.save();

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
const deleteThaiLottery = async (req,res)=>{
    try {
        const {id} = req.params;
        const deleteToThaiLottery = await thaiLotteryModel.findById(id);

        if(!deleteToThaiLottery){
            return res.status(404).json({error:"ThaiLottery not found"})
        }

        if(deleteToThaiLottery.imgUrl){
            const urlParts = deleteToThaiLottery.imgUrl.split('/');

            const fileName = urlParts.slice(-2).join('/');

            const command = new DeleteObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: fileName,
            })

            await s3Client.send(command)
        }

        await thaiLotteryModel.findByIdAndDelete(id)

        res.status(200).json({
            success: true,
            message:"Deleted Successfully",
            data:{
                _id: deleteToThaiLottery.id,
                name: deleteToThaiLottery.name,
            }
        })
    }catch (e) {
        res.status(500).json({ error: "An error occurred while deleting data." });
    }
}

module.exports = {
    getAllThaiLottery,
    uploadThaiLottery,
    deleteThaiLottery,
}