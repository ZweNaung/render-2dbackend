const dotenv = require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require("path")
const cron = require('node-cron');
const modernModel=require('./model/modernAndInternet');
const app = express();

const apiRoute =  require('./routes/apiRoute');
const http = require("node:http");
const {Server} = require("socket.io");
const server = http.createServer(app);
const io = new Server(server);
const updateResultModel = require('./model/dailyResultForHistoryModel')

app.use((req, res, next) => {
        req.io = io;
        next();
})

app.set("view engine","ejs");
app.set('views','views')

app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.use("/api",apiRoute)


cron.schedule('0 0 * * *', async () => {
        try {
                await modernModel.updateMany({}, {
                        modern: "-",
                        internet: "-"
                });

                await updateResultModel.deleteMany({});

        } catch (err) {
        }
}, {
        scheduled: true,
        timezone: "Asia/Yangon"
});

mongoose.connect(process.env.MONGODB_URL)
    .then(()=>{
        app.listen(process.env.PORT,()=>{console.log(`Listening on port ${process.env.PORT}!`);});
        console.log("Connected to Mongodb database")})
    .catch((err)=>{console.log(`Error connecting to Mongodb database ${err}`)})

