async function load(){
 const r = await fetch("/products");
 const data = await r.json();
 list.innerHTML="";
 data.forEach(p=>{
   list.innerHTML+=`<li>${p.name} (${p.quantity})</li>`;
 });
}

async function add(){
 await fetch("/products",{
   method:"POST",
   headers:{"Content-Type":"application/json"},
   body:JSON.stringify({
     name:name.value,
     quantity:qty.value
   })
 });
 load();
}

const ws = new WebSocket("ws://localhost:8080");
ws.onmessage = e => console.log("WS:",e.data);