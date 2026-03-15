const { handleGameCommand, getState, schedulePersist } = require('./game/gameEngine');
const plazaGamble = require('./game/plazaGamble');
const { getNickname } = require('./game/gameEngine');

const SESSION_COOKIE = 'growth_game_sid';

function getOrCreateSessionId(req) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  if (match) {
    try {
      let val = decodeURIComponent(match[1].trim());
      if (val && val.normalize && !val.startsWith('s_')) val = val.normalize('NFC');
      return val;
    } catch (e) {
      return match[1].trim();
    }
  }
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function apiCommand(req, res, body, onAfter) {
  const sid = getOrCreateSessionId(req);
  const result = handleGameCommand(sid, body || {});
  const rawValue = (result.createAccount || result.login) && result.accountId ? result.accountId : sid;
  const cookieValue = encodeURIComponent(rawValue);
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${cookieValue}; Path=/; HttpOnly; SameSite=Lax`);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const payload = {
    checkId: result.checkId || false,
    idAvailable: result.idAvailable,
    createAccount: result.createAccount || false,
    login: result.login || false,
    accountId: result.accountId || null,
    replyText: result.replyText,
    state: result.state !== undefined ? result.state : null,
    caughtFish: result.caughtFish || null,
    levelUp: result.levelUp || false,
    soldGold: result.soldGold,
    soldItems: result.soldItems || null,
    upgraded: result.upgraded,
    activityItem: result.activityItem || null,
    activityGold: result.activityGold != null ? result.activityGold : null,
    activityTier: result.activityTier || null,
    activityRarity: result.activityRarity || null,
    activityContract: result.activityContract || null,
    activityNewTitle: result.activityNewTitle || null,
    buyContract: result.buyContract || null,
    craftContract: result.craftContract || null,
    buyBox: result.buyBox || null,
    plazaBet: result.plazaBet || null,
    lottoOpen: result.lottoOpen || null,
    battle: result.battle || null,
    enhanceCombat: result.enhanceCombat || null,
    useSuperFood: result.useSuperFood || null,
    craftCross: result.craftCross || null,
    adminResult: result.adminResult || null
  };
  if (typeof onAfter === 'function') onAfter(result);
  if (result.state && schedulePersist) schedulePersist();
  res.end(JSON.stringify(payload));
}

function apiGetState(req, res) {
  const sid = getOrCreateSessionId(req);
  const state = getState(sid);
  if (state && schedulePersist) schedulePersist();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ state }));
}

function apiLogout(req, res) {
  const newSid = `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${newSid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ logout: true }));
}

function apiPlazaRound(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const current = plazaGamble.getCurrentRound(getNickname || null);
  const history = plazaGamble.getHistory();
  const config = plazaGamble.getConfig();
  res.end(JSON.stringify({ currentRound: current, history, config }));
}

module.exports = { apiCommand, apiGetState, apiPlazaRound, apiLogout };
