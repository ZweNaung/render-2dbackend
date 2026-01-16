const nineModel = require("../model/dailyResultModel")

exports.viewDateByDate = async (req,res) => {
    try{
        const {date}= req.query;
        const record = await nineModel.findOne({date});
        if(!record){
            return res.render('viewDate',{date,childData:[],message:"No date found this day"});
        }

        res.render('viewDate',{
            date:record.date,
            childData:record.child,
            message:null
        });

    }catch(e){
        res.status(500).render('viewData',{
            data:null,
        child:[],
            message:`Error fetching data : ${e}`});
    }
}

exports.renderEditChild = async (req, res) => {
    const { date, index } = req.query;
    const record = await nineModel.findOne({ date });

    if (!record || !record.child[index]) {
        return res.render('home', { message: "Entry not found." });
    }

    res.render('editChild', {
        date,
        index,
        item: record.child[index]
    });
};

exports.updateChild = async (req, res) => {
    const { date, index, time, twoD, set, value } = req.body;
    try {
        const record = await nineModel.findOne({ date });

        if (!record || !record.child[index]) {
            return res.render('home', { message: "Entry not found." });
        }

        // Update the specific entry
        record.child[index].twoD = twoD;
        record.child[index].set = set;
        record.child[index].value = value;

        await record.save();

        res.redirect(`/viewData?date=${date}`);
    } catch (e) {
        res.status(500).render('home', { message: `Error updating data: ${e}` });
    }
};
