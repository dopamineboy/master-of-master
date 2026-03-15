const http = require('http');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const { apiCommand, apiGetState, apiPlazaRound, apiLogout } = require('./webApi');
const { attachChat } = require('./chatServer');
const plazaGamble = require('./game/plazaGamble');
const { addGoldToUser, getNickname } = require('./game/gameEngine');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, '..', 'public');

function broadcastGamble(wss, payload) {
  const data = JSON.stringify(payload);
  wss.clients.forEach(ws => {
    if (ws.readyState === 1) ws.send(data);
  });
}

function serveStatic(req, res, filePath) {
  const ext = path.extname(filePath);
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.ico': 'image/x-icon'
  };
  res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && (req.url === '/api/state' || req.url === '/api/state/')) {
    apiGetState(req, res);
    return;
  }
  if (req.method === 'GET' && (req.url === '/api/logout' || req.url === '/api/logout/')) {
    apiLogout(req, res);
    return;
  }
  if (req.method === 'GET' && (req.url === '/api/plaza/round' || req.url === '/api/plaza/round/')) {
    apiPlazaRound(req, res);
    return;
  }
  if (req.method === 'POST' && (req.url === '/api/command' || req.url === '/api/command/')) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = body ? JSON.parse(body) : {};
        const onAfter = (result) => {
          if (result.plazaBet) {
            const current = plazaGamble.getCurrentRound(getNickname);
            broadcastGamble(wss, { type: 'gamble', event: 'bet', currentRound: current });
          }
        };
        apiCommand(req, res, data, onAfter);
      } catch (e) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        const errMsg = e instanceof SyntaxError ? 'Invalid JSON' : (e.message || '서버 오류');
        res.end(JSON.stringify({ error: errMsg, replyText: errMsg }));
      }
    });
    return;
  }

  let filePath = path.join(PUBLIC, req.url === '/' ? 'index.html' : path.normalize(req.url));
  if (!path.relative(PUBLIC, filePath).startsWith('..') && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    serveStatic(req, res, filePath);
    return;
  }
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end('Not Found');
});

const wss = new WebSocket.Server({ server: server });
attachChat(wss);

plazaGamble.setOnRoundResolved((completed) => {
  const current = plazaGamble.getCurrentRound(getNickname);
  const history = plazaGamble.getHistory();
  broadcastGamble(wss, { type: 'gamble', event: 'resolved', completed, currentRound: current, history });
});
plazaGamble.startRoundScheduler(getNickname, addGoldToUser);

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
