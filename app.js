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

// Socket Setup (Connection Timeouts are optimized)
const io = new Server(server, {
        cors: { origin: "*" },
        pingInterval: 25000, // 25 seconds (ပုံမှန်ထားလေ့ရှိတဲ့ တန်ဖိုး)
        pingTimeout: 20000,  // 20 seconds (လိုင်းနှေးလည်း စောင့်ပေးမယ်)
        transports: ['websocket','polling' ] // ဒါလေးပါ ထည့်ထားပါ
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


startScheduler((scrapedResponse) => {
        if (!scrapedResponse || !scrapedResponse.live) return;

        const liveData = scrapedResponse.live;

        lastTwoD = liveData.twoD;

        globalLatestData = {
                set: liveData.set,
                value: liveData.value,
                twoD: liveData.twoD,
                updatedAt: Date.now(),
        };

        // Socket နဲ့ Live ပြမယ်
        io.emit("live_2d_data", globalLatestData);
        console.log("📡 Live Data Updated:", globalLatestData.twoD );
        console.log("📡 Live Data Updated:", globalLatestData.set);
        console.log("📡 Live Data Updated:", globalLatestData.value );
        console.log("📡 Live Data Updated:", globalLatestData.updatedAt );
}, io);

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



