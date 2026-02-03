const express = require('express');
const router = express.Router();
const Supplier = require('../models/Supplier');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// CREATE
router.post('/', authMiddleware, roleMiddleware('admin', 'moderator'), async (req, res) => {
  try {
    const supplier = new Supplier(req.body);
    await supplier.save();
    res.status(201).json(supplier);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// READ - all
router.get('/', authMiddleware, async (req, res) => {
  try {
    const suppliers = await Supplier.find().populate('products');
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// READ - 1
router.get('/:id', authMiddleware, async (req, res) => {
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
router.get('/search/:pattern', authMiddleware, async (req, res) => {
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
router.put('/:id', authMiddleware, roleMiddleware('admin', 'moderator'), async (req, res) => {
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
router.delete('/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
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