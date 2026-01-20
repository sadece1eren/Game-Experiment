const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Stone House Survival - Multiplayer Server Running\n');
});

const wss = new WebSocket.Server({ server });

const players = new Map();

wss.on('connection', (ws) => {
  console.log('New player connected');
  let playerName = null;

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);

      if (message.type === 'playerUpdate') {
        playerName = message.name;
        players.set(playerName, {
          ws: ws,
          data: message,
          lastUpdate: Date.now()
        });

        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(data);
          }
        });

        broadcastPlayerCount();
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    if (playerName) {
      console.log('Player disconnected:', playerName);
      players.delete(playerName);
      
      const leaveMessage = JSON.stringify({
        type: 'playerLeft',
        name: playerName
      });

      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(leaveMessage);
        }
      });

      broadcastPlayerCount();
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

function broadcastPlayerCount() {
  const countMessage = JSON.stringify({
    type: 'playerCount',
    count: players.size
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(countMessage);
    }
  });
}

setInterval(() => {
  const now = Date.now();
  players.forEach((player, name) => {
    if (now - player.lastUpdate > 30000) {
      console.log('Removing stale player:', name);
      players.delete(name);
      if (player.ws.readyState === WebSocket.OPEN) {
        player.ws.close();
      }
    }
  });
}, 30000);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready for connections`);
});
