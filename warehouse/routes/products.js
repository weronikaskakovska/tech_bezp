const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

//CREATE - only for admin/moderator
router.post('/', authMiddleware, roleMiddleware('admin', 'moderator'), async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// READ - all products
router.get('/', authMiddleware, async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// READ - one product by id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Produkt nie znaleziony' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SEARCH - according to pattern
router.get('/search/:pattern', authMiddleware, async (req, res) => {
  try {
    const pattern = req.params.pattern;
    const products = await Product.find({
      $or: [
        { name: { $regex: pattern, $options: 'i' } },
        { description: { $regex: pattern, $options: 'i' } },
        { category: { $regex: pattern, $options: 'i' } }
      ]
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE - only admin/moderator
router.put('/:id', authMiddleware, roleMiddleware('admin', 'moderator'), async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!product) {
      return res.status(404).json({ error: 'Produkt nie znaleziony' });
    }
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE - only admin
router.delete('/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Produkt nie znaleziony' });
    }
    res.json({ message: 'Produkt usunięty', product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;