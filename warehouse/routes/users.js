const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { keycloak } = require('../server');  // ← ZMIANA

// CREATE - rejestracja jest w auth.js

// READ - all (tylko admin)
router.get('/', keycloak.protect('realm:admin'), async (req, res) => {  // ← ZMIANA
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// READ - one
router.get('/:id', keycloak.protect(), async (req, res) => {  // ← ZMIANA
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'Użytkownik nie znaleziony' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SEARCH (tylko admin)
router.get('/search/:pattern', keycloak.protect('realm:admin'), async (req, res) => {  // ← ZMIANA
  try {
    const pattern = req.params.pattern;
    const users = await User.find({
      $or: [
        { username: { $regex: pattern, $options: 'i' } },
        { email: { $regex: pattern, $options: 'i' } }
      ]
    }).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE
router.put('/:id', keycloak.protect(), async (req, res) => {  // ← ZMIANA
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'Użytkownik nie znaleziony' });
    }
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE (tylko admin)
router.delete('/:id', keycloak.protect('realm:admin'), async (req, res) => {  // ← ZMIANA
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Użytkownik nie znaleziony' });
    }
    res.json({ message: 'Użytkownik usunięty', user: { id: user._id, username: user.username } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;