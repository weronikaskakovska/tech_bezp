const express = require('express');
const router = express.Router();
const Supplier = require('../models/supplier');
const { keycloak } = require('../keycloak');

// CREATE
router.post('/', keycloak.protect('realm:moderator'), async (req, res) => {  // ← ZMIANA
  try {
    const supplier = new Supplier(req.body);
    await supplier.save();
    res.status(201).json(supplier);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// READ - all
router.get('/', keycloak.protect(), async (req, res) => {  // ← ZMIANA
  try {
    const suppliers = await Supplier.find().populate('products');
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// READ - 1
router.get('/:id', keycloak.protect(), async (req, res) => {  // ← ZMIANA
  try {
    const supplier = await Supplier.findById(req.params.id).populate('products');
    if (!supplier) {
      return res.status(404).json({ error: 'Dostawca nie znaleziony' });
    }
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SEARCH
router.get('/search/:pattern', keycloak.protect(), async (req, res) => {  // ← ZMIANA
  try {
    const pattern = req.params.pattern;
    const suppliers = await Supplier.find({
      $or: [
        { name: { $regex: pattern, $options: 'i' } },
        { email: { $regex: pattern, $options: 'i' } },
        { address: { $regex: pattern, $options: 'i' } }
      ]
    }).populate('products');
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE
router.put('/:id', keycloak.protect('realm:moderator'), async (req, res) => {  // ← ZMIANA
  try {
    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!supplier) {
      return res.status(404).json({ error: 'Dostawca nie znaleziony' });
    }
    res.json(supplier);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE
router.delete('/:id', keycloak.protect('realm:admin'), async (req, res) => {  // ← ZMIANA
  try {
    const supplier = await Supplier.findByIdAndDelete(req.params.id);
    if (!supplier) {
      return res.status(404).json({ error: 'Dostawca nie znaleziony' });
    }
    res.json({ message: 'Dostawca usunięty', supplier });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;