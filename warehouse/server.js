//Tworzy serwer HTTP (Express)
//Podłącza middleware (keycloak, cors, logger)
//Rejestruje wszystkie endpointy (/api/products, /api/orders itd.)
//Łączy się z MongoDB
//Uruchamia WebSocket (powiadomienia w czasie rzeczywistym)
//Łączy się z MQTT (broker wiadomości IoT)


require('dotenv').config();
const express = require("express");
const cors = require("cors");
const WebSocket = require('ws');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const http = require('http');
const logger = require('./middleware/logger');
const mqttService = require('./services/mqtt');
const session = require('express-session');

const { keycloak, memoryStore } = require('./keycloak');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
app.use(express.static('public'));

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(cookieParser());
app.use(logger);

// Static files (html client)
app.use(express.static('public'));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'warehouse-backend',
    version: '1.0.0'
  });
});

app.use(session({
  secret: process.env.JWT_SECRET || 'some-secret',
  resave: false,
  saveUninitialized: true,
  store: memoryStore
}));

app.use(keycloak.middleware());

app.use(keycloak.middleware());


// ── NOWE: endpoint /health — niezabezpieczony ───────────────────────────────
//
// Dlaczego musi być niezabezpieczony?
// Kubernetes co kilka sekund "puka" do /health żeby sprawdzić czy aplikacja żyje.
// Gdyby wymagał logowania — Kubernetes myślałby że aplikacja padła i ją restartował.
//

// ── NOWE: endpoint /metrics — dla Prometheusa (bonus punktowy) ──────────────
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send('# HELP warehouse_up Is the warehouse backend up\n# TYPE warehouse_up gauge\nwarehouse_up 1\n');
});
// ───────────────────────────────────────────────────────────────────────────

// routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/users', require('./routes/users'));

// ws real time notif
const clients = new Set();

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  clients.add(ws);
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('WebSocket received:', data);

      // Broadcast to all clients
      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'broadcast',
            data: data,
            timestamp: new Date()
          }));
        }
      });
    } catch (error) {
      console.error('WebSocket error:', error);
    }
  });

  ws.on('close', () => {
    console.log('Closed WebSocket connection');
    clients.delete(ws);
  });

  // Sending welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    message: 'Połączono z serwerem magazynu',
    timestamp: new Date()
  }));
});


// Broadcast function to all WebSocket clients
function broadcastToClients(data) {
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}


// MQTT integration with WebSocket
mqttService.subscribe('warehouse/stock/low', (message) => {
  broadcastToClients({
    type: 'stock-alert',
    data: JSON.parse(message)
  });
});

mqttService.subscribe('warehouse/orders/new', (message) => {
  broadcastToClients({
    type: 'new-order',
    data: JSON.parse(message)
  });
});

mqttService.subscribe('warehouse/alerts', (message) => {
  broadcastToClients({
    type: 'alert',
    data: JSON.parse(message)
  });
});

// Endpoint to test MQTT
app.post('/api/mqtt/test', (req, res) => {
  const { topic, message } = req.body;
  mqttService.publish(topic, message);
  res.json({ success: true, message: 'Wiadomość wysłana' });
});

// Root endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'API Systemu Zarządzania Magazynem',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      orders: '/api/orders',
      suppliers: '/api/suppliers',
      users: '/api/users',
      health: '/health'
    }
  });
});


// mongodb
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("Connected to database!")
        // mqtt connection
        mqttService.connect();

        const PORT = process.env.PORT || 3000;
        server.listen(PORT, () => {
          console.log(`Serwer działa na porcie ${PORT}`);
          console.log(`HTTP: http://localhost:${PORT}`);
          console.log(`WebSocket: ws://localhost:${PORT}`);
    });
    })
    .catch((error) => {
        console.log("Database connection failed:", error);
    });

// ── NOWE: eksportuj keycloak żeby routes mogły go używać ────────────────────
module.exports = { app, server, broadcastToClients, keycloak };