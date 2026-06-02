const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { authMiddleware } = require('../middleware/auth');
const { keycloak } = require('../server');

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    
    const user = new User({
      username,
      email,
      password,
      role: role || 'user'
    });
    
    await user.save();
    
    res.status(201).json({ 
      message: 'Użytkownik zarejestrowany',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Log in
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Nieprawidłowe dane logowania' });
    }
    
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Nieprawidłowe dane logowania' });
    }
    
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Setting cookies with token
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24h
    });
    
    res.json({
      message: 'Zalogowano pomyślnie',
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Log out
router.post('/logout', authMiddleware, (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Wylogowano pomyślnie' });
});

// Checking logged in user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;