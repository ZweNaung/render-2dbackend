
const updateResultModel =require("../model/updateResultModel");

exports.updateResult = async (req, res) => {

    try{
        const {twoD, set,value} = req.body;

        if (!twoD || !set || !value || !session) {
            return res.status(400).json({ message: "Data incomplete" });
        }

        const validSessions = ["12:01 PM", "4:30 PM"];

        if(!validSessions.includes(session)){
            return res.status(400).json({
                success: false,
                message: "Invalid session! Only '12:01 PM' or '4:30 PM' allowed."
            });
        }

        const newResult = new updateResultModel({
            twoD: twoD,
            set: set,
            value: value,
            session: session
        });

        await newResult.save();

        req.io.emit("new_2d_result", {
            twoD: twoD,
            set: set,
            value: value,
            session: session
        });


        res.status(201).json({
            success: true,
            message: `Result for ${session} added successfully`,
            data: newResult
        });

    }catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};