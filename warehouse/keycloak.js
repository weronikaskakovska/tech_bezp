const KeycloakConnect = require('keycloak-connect');
const session = require('express-session');

const memoryStore = new session.MemoryStore();

const keycloak = new KeycloakConnect({ store: memoryStore }, {
  realm: process.env.KEYCLOAK_REALM || 'warehouse',
  'auth-server-url': process.env.KEYCLOAK_URL || 'http://localhost:8080',
  resource: process.env.KEYCLOAK_CLIENT_ID || 'warehouse-backend',
  credentials: {
    secret: process.env.KEYCLOAK_CLIENT_SECRET || 'changeme'
  },
  'bearer-only': true
});

module.exports = { keycloak, memoryStore };