const mqtt = require('mqtt');

class MQTTService {
  constructor() {
    this.client = null;
    this.subscribers = new Map();
  }

  connect() {
    this.client = mqtt.connect(process.env.MQTT_BROKER || 'mqtt://localhost:1883');

    this.client.on('connect', () => {
      console.log('✓ Połączono z brokerem MQTT');
      
      // Subscribe to new topics
      this.client.subscribe('warehouse/stock/low');
      this.client.subscribe('warehouse/orders/new');
      this.client.subscribe('warehouse/alerts');
    });

    this.client.on('message', (topic, message) => {
      const data = message.toString();
      console.log(`MQTT [${topic}]: ${data}`);
      
      // Notify subscribers
      if (this.subscribers.has(topic)) {
        this.subscribers.get(topic).forEach(callback => callback(data));
      }
    });

    this.client.on('error', (error) => {
      console.error('Błąd MQTT:', error);
    });
  }

  // Publishing messages
  publish(topic, message) {
    if (this.client && this.client.connected) {
      this.client.publish(topic, JSON.stringify(message));
      console.log(`Opublikowano na ${topic}:`, message);
    }
  }

  // Topic subscription
  subscribe(topic, callback) {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, []);
      if (this.client) {
        this.client.subscribe(topic);
      }
    }
    this.subscribers.get(topic).push(callback);
  }

  // Notification about low stock
  notifyLowStock(product) {
    this.publish('warehouse/stock/low', {
      productId: product._id,
      name: product.name,
      quantity: product.quantity,
      timestamp: new Date()
    });
  }

  // Notification about a new order
  notifyNewOrder(order) {
    this.publish('warehouse/orders/new', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      customer: order.customer,
      totalPrice: order.totalPrice,
      timestamp: new Date()
    });
  }

  // Sending alert
  sendAlert(message, level = 'info') {
    this.publish('warehouse/alerts', {
      message,
      level,
      timestamp: new Date()
    });
  }

  disconnect() {
    if (this.client) {
      this.client.end();
    }
  }
}

module.exports = new MQTTService();