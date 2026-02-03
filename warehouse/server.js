const express = require("express");
const cors = require("cors");
const mqtt = require("./mqtt");
const ws = require("./ws");
const mongoose = require('mongoose');
const Product = require('./models/product.js')

const app = express();
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

// DATABASE
mongoose.connect('mongodb+srv://weronikaskakovska_db_user:ZCYr9Bp7PYGslL5I@backenddb.tds5teg.mongodb.net/?appName=backenddb')
    .then(() => {
        console.log("Connected to database!")
    })
    .catch(() => {
        console.log("Connection failed :(");
    })