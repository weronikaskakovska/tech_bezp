const mqtt = require("mqtt");
const client = mqtt.connect("mqtt://localhost:1883");

client.on("connect", ()=>{
  console.log("MQTT connected");
});

function publish(topic, msg){
  client.publish(topic, msg);
}

module.exports = { publish };