/**
 * 채널별 실시간 채팅 — 농부/낚시꾼/광부/장사꾼 채널
 */
const MAX_HISTORY = 50;

const channels = new Map();

function getChannel(name) {
  if (!channels.has(name)) {
    channels.set(name, { clients: new Set(), history: [] });
  }
  return channels.get(name);
}

function addToHistory(channelName, msg) {
  const ch = getChannel(channelName);
  ch.history.push(msg);
  if (ch.history.length > MAX_HISTORY) ch.history.shift();
}

function broadcast(channelName, payload, excludeWs) {
  const ch = getChannel(channelName);
  const data = JSON.stringify(payload);
  ch.clients.forEach(function (entry) {
    if (entry.ws === excludeWs) return;
    if (entry.ws.readyState === 1) entry.ws.send(data);
  });
}

function attachChat(wss) {
  wss.on('connection', function (ws, req) {
    let channelName = null;
    let nickname = '손님';

    ws.on('message', function (raw) {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'join') {
          channelName = String(msg.channel || 'farmer').toLowerCase();
          nickname = String(msg.nickname || '손님').trim().slice(0, 20) || '손님';
          const ch = getChannel(channelName);
          ch.clients.add({ ws, nickname });
          const history = ch.history.slice(-MAX_HISTORY);
          ws.send(JSON.stringify({ type: 'history', messages: history }));
          broadcast(channelName, {
            type: 'system',
            text: nickname + '님이 입장했습니다.'
          }, ws);
          return;
        }
        if (msg.type === 'chat' && channelName) {
          const text = String(msg.text || '').trim().slice(0, 500);
          if (!text) return;
          const payload = {
            type: 'message',
            nickname: nickname,
            text: text,
            time: new Date().toISOString()
          };
          addToHistory(channelName, payload);
          broadcast(channelName, payload, ws);
        }
      } catch (e) {
        // ignore parse error
      }
    });

    ws.on('close', function () {
      if (channelName) {
        const ch = getChannel(channelName);
        let toRemove = null;
        ch.clients.forEach(function (entry) {
          if (entry.ws === ws) toRemove = entry;
        });
        if (toRemove) ch.clients.delete(toRemove);
        broadcast(channelName, { type: 'system', text: nickname + '님이 퇴장했습니다.' });
      }
    });
  });
}

module.exports = { attachChat };
