const express = require("express");
const cors = require("cors");
const mqtt = require("./mqtt");
const ws = require("./ws");
const mongoose = require('mongoose');
const Product = require('./models/product.js')
const cookieParser = require('cookie-parser');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(cookieParser());

// middleware
app.use(express.json());
app.use(express.urlencoded({extended: false})) //otherwise we can't add form url-encoded way

// routes
app.use('/api/products', productRoute)


app.get('/', (req, res) => {
  res.send("API server updated");
})


// SERVER

app.listen(3000,()=>{
  console.log("HTTP running");
});

// mongodb
mongoose.connect('mongodb+srv://weronikaskakovska_db_user:ZCYr9Bp7PYGslL5I@backenddb.tds5teg.mongodb.net/?appName=backenddb')
    .then(() => {
        console.log("Connected to database!")
        // mqtt connection
        mqttService.connect();
    })
    .catch(() => {
        console.log("Connection failed :(");
    })