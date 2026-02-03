const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// CREATE - rejestration in auth.js

// READ-all (only admin)
router.get('/', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// READ - one
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    // User can only see himself, unless he is admin
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Brak uprawnień' });
    }
    
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'Użytkownik nie znaleziony' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SEARCH (only admin)
router.get('/search/:pattern', authMiddleware, roleMiddleware('admin'), async (req, res) => {
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
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    // User can only edit himself, unless he is admin
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Brak uprawnień' });
    }
    
    // Not allowed to switch roles, unles he is admin
    if (req.body.role && req.user.role !== 'admin') {
      delete req.body.role;
    }
    
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

// DELETE (admin only)
router.delete('/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
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