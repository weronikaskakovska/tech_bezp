const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { authMiddleware } = require('../middleware/auth');
const { keycloak } = require('../keycloak');

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

    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('client_id', 'warehouse-frontend');
    params.append('username', username);
    params.append('password', password);

    const response = await fetch(
      `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
      { method: 'POST', body: params }
    );

    const data = await response.json();
    console.log('Keycloak response status:', response.status);
    console.log('Keycloak response data:', JSON.stringify(data));

    if (!response.ok) {
      return res.status(401).json({ error: 'Nieprawidłowe dane logowania' });
    }

    res.cookie('token', data.access_token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({
      message: 'Zalogowano pomyślnie',
      token: data.access_token,
      refresh_token: data.refresh_token,
      user: { username }
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