const express = require("express");
//const cors = require("cors");
const mqtt = require("./mqtt");
const ws = require("./ws");
const mongoose = require('mongoose');
const Product = require('./models/product.models.js')

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: false})) //otherwise we can't add form urlencoded way
app.use(cookieParser());


//app.use(express.static("public"));


app.get('/', (req, res) => {
  res.send("API server updated");
})


app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find({}); //we're finding everything in the database
  } catch (error) {
    res.status(500).json({message: error.message});
  }
});

app.get('/api/product/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    res.status(200)
  } catch (error) {
      res.status(500).json({message: error.message});
  }
});

//update a product
app.put('/api/product/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product =  await Product.findByIdandUpdate(id, req.body);
    if (!product) {
      return res.status(404).json({message: "Product not found"})
    }
    const updatedProduct = await product.findById(id);
    res.status(200).json(updatedProduct)
  } catch (error) {
      res.status(500).json({message: error.message});
  }
})


//delete a product

app.delete('/api/product/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdandDelete(id);
    if (!product) {
      return res.status(404).json({message: "Product not found"})
    }
    res.status(200).json({message: "Product deleted successfully"})
  } catch (error) {
    res.status(500).json({message: error.message});
  }
})

app.post('api/products', async (req, res) => {
  try {
    const product = await Product.create(req.body)
    res.status(200).json(product)
  } catch (error) {
    res.status(500).json({message: error.message})
  }
})

/* PRODUCTS

app.get("/products",(req,res)=>{
  db.all("SELECT * FROM products",(err,rows)=>{
    res.json(rows);
  });
});

app.post("/products",(req,res)=>{
  const {name, quantity} = req.body;
  db.run("INSERT INTO products(name,quantity) VALUES(?,?)",
  [name,quantity]);
  mqtt.publish("warehouse/products","added");
  ws.broadcast("product added");
  res.json({status:"ok"});
});

app.put("/products/:id",(req,res)=>{
  const {name,quantity}=req.body;
  db.run("UPDATE products SET name=?, quantity=? WHERE id=?",
  [name,quantity,req.params.id]);
  mqtt.publish("warehouse/products","updated");
  ws.broadcast("product updated");
  res.json({status:"updated"});
});

app.delete("/products/:id",(req,res)=>{
  db.run("DELETE FROM products WHERE id=?",[req.params.id]);
  mqtt.publish("warehouse/products","deleted");
  ws.broadcast("product deleted");
  res.json({status:"deleted"});
});

SEARCH

app.get("/products/search/:pattern",(req,res)=>{
  db.all("SELECT * FROM products WHERE name LIKE ?",
  [`%${req.params.pattern}%`],
  (err,rows)=>res.json(rows));
});

LOGIN

app.post("/login",(req,res)=>{
  res.json({message:"logged"});
});

/* SERVER */

app.listen(3000,()=>{
  console.log("HTTP running");
});

/* DATABASE */
mongoose.connect('mongodb+srv://weronikaskakovska_db_user:ZCYr9Bp7PYGslL5I@backenddb.tds5teg.mongodb.net/?appName=backenddb')
    .then(() => {
        console.log("Connected to database!")
    })
    .catch(() => {
        console.log("Connection failed :(");
    })