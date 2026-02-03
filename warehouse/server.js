const express = require("express");
const cors = require("cors");
const mqtt = require("./mqtt");
const ws = require("./ws");
const mongoose = require('mongoose');
const Product = require('./models/product.js')
const cookieParser = require('cookie-parser');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
app.use(express.static('public'));


// middleware
app.use(express.json());
app.use(express.urlencoded({extended: false})) //otherwise we can't add form url-encoded way
app.use(cors());
app.use(cookieParser());
app.use(logger);

// Static files (html client)
app.use(express.static('public'));


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


//Broadcast function to all WebSocket clients
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
      users: '/api/users'
    }
  });
});



// SERVER

app.listen(3000,()=>{
  console.log("HTTP running");
});

// mongodb
mongoose.connect('mongodb+srv://weronikaskakovska_db_user:ZCYr9Bp7PYGslL5I@backenddb.tds5teg.mongodb.net/?appName=backenddb')
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

module.exports = { app, server, broadcastToClients };