const fs = require('fs');
const path = require('path');

const logFilePath = path.join(__dirname, '../logs/app.log');

// checking if folder logs exists
if (!fs.existsSync(path.join(__dirname, '../logs'))) {
  fs.mkdirSync(path.join(__dirname, '../logs'));
}

const logger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const log = `[${timestamp}] ${req.method} ${req.url} - IP: ${req.ip}\n`;
  
  fs.appendFile(logFilePath, log, (err) => {
    if (err) console.error('Błąd zapisu logu:', err);
  });
  
  next();
};

module.exports = logger;