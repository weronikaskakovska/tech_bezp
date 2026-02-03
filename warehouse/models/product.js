const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 0
  },
  price: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  sku: {
    type: String,
    unique: true,
    required: true
  }
}, { timestamps: true });

const Product = mongoose.model("Product", productSchema);
module.export = Product;