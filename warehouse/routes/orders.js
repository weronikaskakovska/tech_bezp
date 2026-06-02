const express = require('express');
const router = express.Router();
const Order = require('../models/order');
const { keycloak } = require('../server');  // ← ZMIANA

// CREATE
router.post('/', keycloak.protect(), async (req, res) => {  // ← ZMIANA
  try {
    const order = new Order(req.body);
    await order.save();
    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// READ - all
router.get('/', keycloak.protect(), async (req, res) => {  // ← ZMIANA
  try {
    const orders = await Order.find().populate('products.product');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// READ - one
router.get('/:id', keycloak.protect(), async (req, res) => {  // ← ZMIANA
  try {
    const order = await Order.findById(req.params.id).populate('products.product');
    if (!order) {
      return res.status(404).json({ error: 'Zamówienie nie znalezione' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SEARCH
router.get('/search/:pattern', keycloak.protect(), async (req, res) => {  // ← ZMIANA
  try {
    const pattern = req.params.pattern;
    const orders = await Order.find({
      $or: [
        { orderNumber: { $regex: pattern, $options: 'i' } },
        { customer: { $regex: pattern, $options: 'i' } },
        { status: { $regex: pattern, $options: 'i' } }
      ]
    }).populate('products.product');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE
router.put('/:id', keycloak.protect('realm:moderator'), async (req, res) => {  // ← ZMIANA
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!order) {
      return res.status(404).json({ error: 'Zamówienie nie znalezione' });
    }
    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE
router.delete('/:id', keycloak.protect('realm:admin'), async (req, res) => {  // ← ZMIANA
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Zamówienie nie znalezione' });
    }
    res.json({ message: 'Zamówienie usunięte', order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;