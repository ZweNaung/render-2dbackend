require('dotenv').config();
const omenModel = require("../model/omenModel");
// const {PutObjectCommand, S3Client,DeleteObjectCommand} = require("@aws-sdk/client-s3");
const { PutObjectCommand, S3Client, DeleteObjectCommand, DeleteObjectsCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({

    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    }
});

//New Upload
const omenUploadData = async (req, res)=>{
    try {
        const {name}= req.body;

        if( !name || !req.file){

            return res.status(400).json({error:"Missing required fields: name and image are required"});
        }


        const fileName = `omen/${Date.now()}-${req.file.originalname}`;
        const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: fileName,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
        });
        await s3Client.send(command);

        const publicUrl =`${process.env.R2_PUBLIC_DOMAIN}/${fileName}`;

        const newOmenData =new omenModel({
            name: name,
            imgUrl:publicUrl,
        })

          const saveData = await newOmenData.save();

        res.status(201).json({
            "success": true,
            message:"Upload Success",
            data: {
                _id: saveData._id,
                name: saveData.name,
            }
        });
    }catch (e) {
        console.error(e);
        res.status(500).json({error:"An error occurred on the server while inserting data."});
    }
}


//Get All
const getAllOmens = async function(req, res){

    try {
        const allOmen = await omenModel.find({});
        res.status(200).json({
            success:true,
            message: 'Fetch Data Successfully.',
            data: allOmen
        });
    }catch (e) {
        console.error(e);
        res.status(500).json({ error:"An error occurred while fetching data."})
    }
}



//view Image
const getOmenById = async (req, res) => {
    try {
       const omen = await omenModel.findById(req.params.id);
       if(!omen){
           return res.status(404).json({error:"Omen not found"});
       }

       res.status(200).json({
           message: 'Success',
           data: omen
       })

    } catch (e) {
        console.error("Error occurred in getOmenById:", e);
        res.status(500).json({ error: "An error occurred while fetching the image." });
    }
};




//update omen
const updateOmen = async function(req, res) {
    try {
        const { id } = req.params;
        const { name } = req.body;

        const updateData = {};

        const existingOmen = await omenModel.findById(id);

        if (!existingOmen) {
            return res.status(404).json({ error: "Omen not found" });
        }

        if (name) {
            updateData.name = name;
        }

        if (req.file) {
            console.log("New file detected. Processing update...");

            // delete photo from R2
            if (existingOmen.imgUrl) {
                try {
                    const oldUrlParts = existingOmen.imgUrl.split('/');
                    const oldFileName = oldUrlParts.slice(-2).join('/');

                    const deleteCommand = new DeleteObjectCommand({
                        Bucket: process.env.R2_BUCKET_NAME,
                        Key: oldFileName,
                    });
                    await s3Client.send(deleteCommand);
                    console.log(`Successfully deleted old file from R2: ${oldFileName}`);
                } catch (e) {
                    console.error("Could not delete old file from R2, continuing with update anyway:", e);
                }
            }

            //new photo upload to R2
            const newFileName = `omen/${Date.now()}-${req.file.originalname}`;
            const uploadCommand = new PutObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: newFileName,
                Body: req.file.buffer,
                ContentType: req.file.mimetype,
            });
            await s3Client.send(uploadCommand);

            const newPublicUrl = `${process.env.R2_PUBLIC_DOMAIN}/${newFileName}`;
            updateData.imgUrl = newPublicUrl;
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No update data provided. Please provide a name or an image." });
        }

        // DB update and response send if(req.file) block
        const updatedOmen = await omenModel.findByIdAndUpdate(id, updateData, { new: true });

        res.status(200).json({
            success:true,
            message: 'Successfully updated omen',
            data: updatedOmen
        });

    } catch (e) {
        console.error("Error occurred in updateOmen:", e);
        res.status(500).json({ error: "An error occurred while updating data." });
    }
}

//Delete Data
const deleteOmen = async function(req, res){
    try{
        const {id} = req.params;
        const omenToDelete = await omenModel.findById(id);

        if(!omenToDelete){
            return res.status(404).json({error:"Omen not found"})
        }

        if(omenToDelete.imgUrl){
            const urlParts = omenToDelete.imgUrl.split('/');

            // const fileName = urlParts[urlParts.length - 1];
            const fileName= urlParts.slice(-2).join('/');

            const command = new DeleteObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: fileName,
            })

            await s3Client.send(command)
            console.log(`Successfully deleted ${fileName} from R2.`);
        }

        await omenModel.findByIdAndDelete(id)

        res.status(200).json({
            success: true,
            message: 'Successfully deleted omen',
            data: {
                _id: omenToDelete.id,
                name: omenToDelete.name,
            }
        })
    }catch (e) {
        console.error(e);
        res.status(500).json({ error: "An error occurred while deleting data." });
    }
}

// Delete All Omens
const deleteAllOmens = async function(req, res) {
    try {
        const allOmens = await omenModel.find({});

        if (allOmens.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No omens found to delete."
            });
        }

        // 2. R2 ကနေ ဖျက်မယ့် ပုံတွေရဲ့ Key (fileName) တွေကို Array လုပ်မယ်
        const keysToDelete = allOmens
            .filter(omen => omen.imgUrl) // imgUrl ရှိတဲ့ data တွေကိုပဲ စစ်ထုတ်မယ်
            .map(omen => {
                const urlParts = omen.imgUrl.split('/');
                return { Key: urlParts.slice(-2).join('/') }; // R2 အတွက် လိုအပ်တဲ့ format { Key: 'path/file' }
            });

        // 3. အကယ်၍ ဖျက်စရာပုံတွေရှိရင် R2 ကနေ Bulk Delete (အပြုံလိုက်) ဖျက်မယ်
        if (keysToDelete.length > 0) {
            const deleteParams = {
                Bucket: process.env.R2_BUCKET_NAME,
                Delete: {
                    Objects: keysToDelete,
                    Quiet: false // true ဆိုရင် error တက်မှ အကြောင်းပြန်မယ်၊ false ဆိုရင် အကုန်ပြန်ပြောမယ်
                }
            };

            const command = new DeleteObjectsCommand(deleteParams);
            await s3Client.send(command);
            console.log(`Successfully deleted ${keysToDelete.length} files from R2.`);
        }

        // 4. MongoDB Database ထဲက data အားလုံးကို ဖျက်မယ်
        await omenModel.deleteMany({});

        res.status(200).json({
            success: true,
            message: `Successfully deleted all omens and their ${keysToDelete.length} images.`,
        });

    } catch (e) {
        console.error("Error occurred in deleteAllOmens:", e);
        res.status(500).json({ error: "An error occurred while deleting all data." });
    }
}

module.exports = {
    omenInsertData: omenUploadData,
    getAllOmens,
    getOmenImage: getOmenById,
    updateOmen,
    deleteOmen,
    deleteAllOmens
}