const express = require('express');
const router = express.Router();
const Product = require('../models/product');
const { keycloak } = require('../server');  // ← ZMIANA: zamiast authMiddleware/roleMiddleware

//CREATE - only for admin/moderator
router.post('/', keycloak.protect('realm:moderator'), async (req, res) => {  // ← ZMIANA
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// READ - all products
router.get('/', keycloak.protect(), async (req, res) => {  // ← ZMIANA
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// READ - one product by id
router.get('/:id', keycloak.protect(), async (req, res) => {  // ← ZMIANA
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
router.get('/search/:pattern', keycloak.protect(), async (req, res) => {  // ← ZMIANA
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
router.put('/:id', keycloak.protect('realm:moderator'), async (req, res) => {  // ← ZMIANA
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
router.delete('/:id', keycloak.protect('realm:admin'), async (req, res) => {  // ← ZMIANA
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