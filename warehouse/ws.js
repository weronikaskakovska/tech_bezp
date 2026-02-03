const WebSocket = require("ws");
const wss = new WebSocket.Server({ port:8080 });

function broadcast(message){
  wss.clients.forEach(client=>{
    if(client.readyState === WebSocket.OPEN){
      client.send(message);
    }
  });
}

module.exports = { broadcast };