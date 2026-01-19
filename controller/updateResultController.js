
const updateResultModel =require("../model/updateResultModel");

exports.getTodayResults = async (req, res) => {
    try {

        const results = await updateResultModel.find().sort({ _id: 1 });

        res.status(200).json({
            success: true,
            message: "Successfully fetch Results",
            data: results
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Server Error while fetching data"
        });
    }
};

exports.updateResult = async (req, res) => {
    try {
        const { twoD, set, value, session } = req.body;

        // 1. Validation
        if (!twoD || !set || !value || !session) {
            return res.status(400).json({ message: "Data incomplete." });
        }

        const validSessions = ["12:01 PM", "4:30 PM"];
        if (!validSessions.includes(session)) {
            return res.status(400).json({
                message: "Invalid session! Only '12:01 PM' or '4:30 PM' allowed."
            });
        }


        const savedResult = await updateResultModel.findOneAndUpdate(
            { session: session },
            {
                twoD: twoD,
                set: set,
                value: value,
                session: session
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // 3. Socket နဲ့ App ကိုလှမ်းပစ်မယ် (Update ဖြစ်သွားရင်လည်း UI မှာ ချက်ခြင်းပြောင်းသွားအောင်)
        req.io.emit("new_2d_result", {
            twoD: savedResult.twoD,
            set: savedResult.set,
            value: savedResult.value,
            session: savedResult.session
        });

        res.status(200).json({
            success: true,
            message: `Result for ${session} saved/updated successfully`,
            data: savedResult
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};