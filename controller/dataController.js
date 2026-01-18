const dailyResultForHistoryModel = require('../model/dailyResultForHistoryModel');

// ==========================================
// 1. INSERTION LOGIC (Android App Usage)
// ==========================================

const dailyDataInsertController = async (req, res, fixedTime) => {
    try {
        const { date, twoD, set, value } = req.body;

        if (!date || !twoD || !set || !value) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        if (twoD.length !== 2 || set.length !== 6 || value.length !== 7) {
            return res.status(400).json({ message: "Invalid input format" });
        }

        const child = [{ time: fixedTime, twoD, set, value }];
        const dateCheck = await dailyResultForHistoryModel.findOne({ date });

        if (dateCheck) {
            if (dateCheck.child.length >= 4) {
                return res.status(400).json({ message: "Limit reached: Only 4 entries allowed per day" });
            }
            const timeExists = dateCheck.child.some(c => c.time === fixedTime);
            if(timeExists){
                return res.status(400).json({ message: `Entry for ${fixedTime} already exists!` });
            }
            await dailyResultForHistoryModel.updateOne({ date }, { $push: { child: { $each: child } } });

        } else {

            const data = new dailyResultForHistoryModel({ date, child });
            await data.save();

            const totalCount = await dailyResultForHistoryModel.countDocuments();

            if (totalCount > 90) {
                const deleteCount = totalCount - 90;

                const oldDocs = await dailyResultForHistoryModel.find()
                    .sort({ _id: 1 })
                    .limit(deleteCount);

                const idsToDelete = oldDocs.map(doc => doc._id);
                await dailyResultForHistoryModel.deleteMany({ _id: { $in: idsToDelete } });

                console.log(`Auto-Deleted ${deleteCount} old records to maintain 90 limit.`);
            }
        }

        res.status(200).json({ message: "Success" });

    } catch (error) {
        res.status(500).json({ message: `Error: ${error.message}` });
    }
};

// ==========================================
// 2. RETRIEVAL & UPDATE LOGIC (Common Usage)
// ==========================================

// Get data by date
const handleGetDailyData = async (req, res) => {
    try {
        const { date } = req.params;
        if (!date) {
            return res.status(400).json({ success: false, message: "Invalid date" });
        }
        const dailyResult = await dailyResultForHistoryModel.findOne({ date });
        if (!dailyResult) {
            return res.status(404).json({ success: false, message: "No data found" }); // Changed 400 to 404 for 'Not Found'
        }
        res.status(200).json({ success: true, data: dailyResult });
    } catch (error) {
        console.log(`Error fetching daily data: ${error}`);
        res.status(500).json({ success: false, message: "Error fetching daily data" });
    }
}

// Get all history
const getAllHistory = async (req, res) => {
    try {
        const allHistory = await dailyResultForHistoryModel.find();
        res.status(200).json(allHistory);
    } catch (error) {
        res.status(500).json({ message: `Error fetching data: ${error.message}` });
    }
}

// Edit child array
const updateChildResult = async (req, res) => {
    try {
        const { date, childId } = req.params;
        const updateData = req.body;

        const dailyResult = await dailyResultForHistoryModel.findOne({ date });

        if (!dailyResult) {
            return res.status(404).json({ message: 'DailyResult not found' });
        }

        const childItem = dailyResult.child.id(childId);
        if (!childItem) {
            return res.status(404).json({ message: 'Child not found' });
        }

        Object.assign(childItem, updateData);

        await dailyResult.save();

        res.status(200).json({
            success: 'Child item updated successfully',
            updatedChild: childItem
        });
    } catch (error) {
        res.status(500).json({ message: `Server error.`, error: error.message });
    }
}

// ==========================================
// 3. EXPORTS
// ==========================================

// Insertion Wrappers (Router uses these names)
exports.elevenInsertAPI = (req, res) => dailyDataInsertController(req, res, "11:00");
exports.twelveInsertAPI = (req, res) => dailyDataInsertController(req, res, "12:00");
exports.threeInsertAPI = (req, res) => dailyDataInsertController(req, res, "3:00");
exports.fourInsertAPI = (req, res) => dailyDataInsertController(req, res, "4:00");

// Retrieval Functions (Router uses these names)
exports.getDailyData = handleGetDailyData;
exports.getAllHistory = getAllHistory;
exports.updateChildResult = updateChildResult;

