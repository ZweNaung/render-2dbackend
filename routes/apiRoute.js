// routes/apiRoute.js
const express = require('express');
const router = express.Router();
const multer = require('multer');

// Controllers
const dataController = require('../controller/dataController');
const omenController = require('../controller/omenController');
const luckyController = require("../controller/LuckyController");
const threeDController = require("../controller/threeDController");
const thaiLotteryController = require("../controller/thaiLotteryController");
const myanmarLotteryController = require("../controller/myanmarLotController");
const modernAndInternetController = require("../controller/modernController");
const updateResultController = require("../controller/updateResultController");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

//----update Result-----
router.post('/live-result', updateResultController.updateResult);
router.get('/live-result', updateResultController.getTodayResults);

//----Insert Data-----
router.post('/insert/11am', dataController.elevenInsertAPI);
router.post('/insert/12pm', dataController.twelveInsertAPI);
router.post('/insert/3pm', dataController.threeInsertAPI);
router.post('/insert/4pm', dataController.fourInsertAPI);

//api/allHistory 2D result
router.get('/allHistory/', dataController.getAllHistory);

//get by data
router.get("/dailyResult/:date", dataController.getDailyData);

//edit child array 2D result
router.put('/updateChild/:date/child/:childId', dataController.updateChildResult);

//------OMEN-----
router.post('/omen', upload.single('omenImage'), omenController.omenInsertData);
router.get('/omen', omenController.getAllOmens);
router.get('/omen/image/:id', omenController.getOmenImage);
router.patch('/omen/:id', upload.single('omenImage'), omenController.updateOmen);
router.delete('/omen/deleteall', omenController.deleteAllOmens);
router.delete('/omen/:id', omenController.deleteOmen);

//------Lucky-----
router.post('/lucky/', upload.single('luckyImage'), luckyController.luckyUpload);
router.get('/lucky/', luckyController.getAllLucky);
router.delete('/lucky/:id', luckyController.deleteLucky);

//----Three_D----
router.get('/threeD/all', threeDController.getAllThreeD);
router.post('/threeD/', threeDController.entryThreeD);
router.delete('/threeD/:id', threeDController.deleteEntries);

//---Thai_Lottery---
router.get('/thaiLottery/all', thaiLotteryController.getAllThaiLottery);
router.post('/thaiLottery/', upload.single('thaiLotImg'), thaiLotteryController.uploadThaiLottery);
router.delete('/thaiLottery/:id', thaiLotteryController.deleteThaiLottery);

//---Myanmar Lottery---
router.get('/myanmarLot/all', myanmarLotteryController.getAllMyanmarLot);
router.post('/myanmarLot/', upload.single('myanmarLotImg'), myanmarLotteryController.uploadMyanmarLot);
router.delete('/myanmarLot/:id', myanmarLotteryController.deleteMyanmarLot);

//modern and internet
router.post('/modern/', modernAndInternetController.createEntry);
router.get('/modern/:title', modernAndInternetController.getEntriesByTitle);

// ⚠️ Note: /live route နဲ့ socket logic ကို app.js သို့ ရွှေ့လိုက်ပါပြီ။

module.exports = router;