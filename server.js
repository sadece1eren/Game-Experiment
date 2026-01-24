const WebSocket = require('ws');
const port = process.env.PORT || 8080;

const wss = new WebSocket.Server({ port });

const players = new Map();

console.log(`WebSocket server starting on port ${port}...`);

wss.on('listening', () => {
  console.log(`Server is listening on port ${port}`);
});

wss.on('connection', (ws) => {
  console.log('New client connected');
  let playerName = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('Received:', data.type, 'from', data.name);
      
      if (data.type === 'join') {
        playerName = data.name;
        players.set(playerName, { ws, data });
        console.log(`${playerName} joined. Total players: ${players.size}`);
        
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'playerJoined',
              player: data
            }));
          }
        });
      }
      
      if (data.type === 'update') {
        wss.clients.forEach(client => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'playerUpdate',
              player: data
            }));
          }
        });
      }
      
      if (data.type === 'mineBlock' || data.type === 'secretMode') {
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
          }
        });
      }
      
    } catch (err) {
      console.error('Error parsing message:', err);
    }
  });

  ws.on('close', () => {
    if (playerName) {
      players.delete(playerName);
      console.log(`${playerName} left. Total players: ${players.size}`);
      
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'playerLeft',
            name: playerName
          }));
        }
      });
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

wss.on('error', (error) => {
  console.error('Server error:', error);
});
