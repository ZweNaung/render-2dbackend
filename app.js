const dotenv = require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require("path");
const http = require("node:http");
const { Server } = require("socket.io");
const cron = require('node-cron');

const startScheduler = require("./jobs/scheduler");
const modernModel = require('./model/modernAndInternet');
const apiRoute = require('./routes/apiRoute');
const updateResultModel = require('./model/updateResultModel');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
        cors: { origin: "*" },
        pingInterval: 10000,
        pingTimeout:5000
});
app.set('socketio', io);

// ===============================
// ⭐ (1) Global Latest Data (SERVER MEMORY)
// ===============================
let globalLatestData = {
        set: "0.00",
        value: "0.00",
        twoD: "--",
        updatedAt: 0
};

// ===============================
// ⭐ (2) Socket Connection
// ===============================
io.on('connection', (socket) => {
        console.log("A user connected:", socket.id);

        // ❗ valid data ရှိမှသာ client ကို ပို့
        if (globalLatestData.twoD !== "--") {
                socket.emit("live_2d_data", globalLatestData);
        }
});

app.use((req, res, next) => {
        req.io = io;
        next();
});

app.set("view engine", "ejs");
app.set('views', 'views');

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.use("/api", apiRoute);

// ===============================
// ⭐ (3) Live API (fallback / testing)
// ===============================
app.get('/api/live', (req, res) => {
        res.status(200).json({
                success: true,
                data: globalLatestData,
                message: "Latest Real-time 2D Data (From Server Memory)"
        });
});

// ===============================
// ⭐ (4) Scheduler → Socket Emit Logic
// ===============================
let lastTwoD = null;

startScheduler((newData) => {
        if (!newData) return;

        // ❗ data မပြောင်းရင် emit မလုပ်
        if (newData.twoD === lastTwoD) return;

        lastTwoD = newData.twoD;

        globalLatestData = {
                ...newData,
                updatedAt: newData.time   // ❗ scrape time ကိုပဲသုံး
        };

        io.emit("live_2d_data", globalLatestData);
        console.log("📡 Real-time data emitted:", globalLatestData.twoD);
});

// ===============================
// ⭐ (5) Daily Reset Cron (OK)
// ===============================
cron.schedule('0 0 * * *', async () => {
        try {
                await modernModel.updateMany({}, {
                        modern: "-",
                        internet: "-"
                });

                await updateResultModel.deleteMany({});

                io.emit("daily_clear_event", {
                        message: "New day started, data cleared",
                        timestamp: Date.now()
                });

                globalLatestData = {
                        set: "0.00",
                        value: "0.00",
                        twoD: "--",
                        updatedAt: Date.now()
                };

                io.emit("live_2d_data", globalLatestData);

        } catch (err) {
                console.error("Cron Job Error:", err);
        }
}, {
        scheduled: true,
        timezone: "Asia/Yangon"
});

// ===============================
// ⭐ (6) Mongo + Server Start
// ===============================
mongoose.connect(process.env.MONGODB_URL)
    .then(() => {
            server.listen(process.env.PORT || 3000, () => {
                    console.log(`Server listening on port ${process.env.PORT || 3000}`);
            });
            console.log("Connected to MongoDB");
    })
    .catch((err) => {
            console.log("MongoDB connection error:", err);
    });




// const dotenv = require('dotenv').config();
// const express = require('express');
// const mongoose = require('mongoose');
// const bodyParser = require('body-parser');
// const path = require("path");
// const http = require("node:http");
// const { Server } = require("socket.io");
// const cron = require('node-cron'); // Cron ကို အပေါ်နားပို့လိုက်တယ် (သပ်ရပ်အောင်လို့ပါ)
//
// const startScheduler = require("./jobs/scheduler");
// const modernModel = require('./model/modernAndInternet');
// const apiRoute = require('./routes/apiRoute');
// const updateResultModel = require('./model/updateResultModel');
//
// const app = express();
// const server = http.createServer(app);
// const io = new Server(server, {
//         cors: { origin: "*" }
// });
// app.set('socketio', io);
//
// // ⭐ ပြင်ဆင်ချက် (၁): Global Variable ကြေငြာမယ်
// let globalLatestData = {
//         set: "0.00",
//         value: "0.00",
//         twoD: "--",
//         updatedAt: new Date()
// };
//
// io.on('connection', (socket) => {
//         console.log("A user connected: " + socket.id);
//         // ⭐ ပြင်ဆင်ချက် (၂): ကြေငြာထားတဲ့ variable ကို ပို့မယ်
//         socket.emit("live_2d_data", globalLatestData);
// });
//
// app.use((req, res, next) => {
//         req.io = io;
//         next();
// });
//
// app.set("view engine", "ejs");
// app.set('views', 'views');
//
// app.use(express.static(path.join(__dirname, 'public')));
// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(express.json());
//
// app.use("/api", apiRoute);
//
// // ⭐ ပြင်ဆင်ချက် (၃): API ကနေ Live data လှမ်းခေါ်ရင် ရအောင် ဒီမှာပဲ Route လုပ်လိုက်တာ ပိုလွယ်တယ်
// // (apiRoute.js ထဲကနေ data အသစ်ကို လှမ်းယူဖို့ ခက်လို့ပါ)
// app.get('/api/live', (req, res) => {
//         res.status(200).json({
//                 success: true,
//                 data: globalLatestData,
//                 message: "Latest Real-time 2D Data (From Server Memory)"
//         });
// });
//
// startScheduler((newData) => {
//         if (newData) {
//                 // ⭐ ပြင်ဆင်ချက် (၄): Global variable ကို update လုပ်မယ်
//                 globalLatestData = {
//                         ...newData,
//                         updatedAt: new Date()
//                 };
//
//                 // Client တွေကို ပို့မယ်
//                 io.emit("live_2d_data", globalLatestData);
//                 console.log("📡 Real-time data emitted!", globalLatestData.twoD);
//         }
// });
//
// cron.schedule('0 0 * * *', async () => {
//         try {
//                 await modernModel.updateMany({}, {
//                         modern: "-",
//                         internet: "-"
//                 });
//
//                 //update result
//                 await updateResultModel.deleteMany({});
//                 io.emit("daily_clear_event", {
//                         message: "New day started, data cleared",
//                         timestamp: new Date()
//                 });
//
//                 //live data
//                 globalLatestData = {
//                         set: "0.00",
//                         value: "0.00",
//                         twoD: "--",
//                         updatedAt: new Date()
//                 };
//                 io.emit("live_2d_data", globalLatestData);
//
//         } catch (err) {
//                 console.error("Cron Job Error:", err);
//         }
// }, {
//         scheduled: true,
//         timezone: "Asia/Yangon"
// });
//
//
// mongoose.connect(process.env.MONGODB_URL)
//     .then(() => {
//             // server.listen သုံးတာ မှန်ပါတယ်
//             server.listen(process.env.PORT || 3000, () => {
//                     console.log(`Server listening on port ${process.env.PORT || 3000}!`);
//             });
//             console.log("Connected to Mongodb database");
//     })
//     .catch((err) => { console.log(`Error connecting to Mongodb database ${err}`) });