/**
 * 광장 철수 vs 영희 겜블 — 30분마다 승부, 골드 배팅
 */
const ROUND_INTERVAL_MS = 30 * 60 * 1000; // 30분
const CHOICES = ['철수승', '영희승', '무승부'];
const ODDS = { 철수승: 2, 영희승: 2, 무승부: 6 };
const MIN_BET = 30;
const MAX_BET = 100;
const HISTORY_MAX = 20;
const ICONS = { 철수승: '👦', 영희승: '👧', 무승부: '🤝' };

let currentRound = null;
let roundHistory = [];
let resolveTimer = null;
let resolveCallbacks = null;
let onRoundResolvedCb = null;

function setResolveCallbacks(getNickname, addGold) {
  resolveCallbacks = { getNickname, addGold };
}
function setOnRoundResolved(cb) {
  onRoundResolvedCb = cb;
}

function getRoundEndTime(startTime) {
  return startTime + ROUND_INTERVAL_MS;
}

function ensureCurrentRound() {
  const now = Date.now();
  if (currentRound) {
    if (currentRound.result != null) return; // 이미 결산됨
    if (now < getRoundEndTime(currentRound.startTime)) return; // 아직 진행 중
    // 시간 경과했으면 resolve는 별도 호출에서 처리
    return;
  }
  // 새 라운드 시작
  currentRound = {
    roundId: 'r_' + now,
    startTime: now,
    bets: [],
    result: null,
    resolvedAt: null
  };
  if (resolveTimer) clearTimeout(resolveTimer);
  const remaining = ROUND_INTERVAL_MS;
  const cb = resolveCallbacks;
  resolveTimer = setTimeout(() => tryResolve(cb && cb.getNickname, cb && cb.addGold), remaining);
}

function pickRandomResult() {
  return CHOICES[Math.floor(Math.random() * 3)];
}

function tryResolve(getNickname, addGold) {
  const now = Date.now();
  if (!currentRound) return null;
  if (currentRound.result != null) return null;
  if (now < getRoundEndTime(currentRound.startTime)) return null;

  const result = pickRandomResult();
  currentRound.result = result;
  currentRound.resolvedAt = now;

  const winners = currentRound.bets.filter(b => b.choice === result);
  const payouts = [];
  if (addGold && getNickname) {
    winners.forEach(b => {
      const payout = Math.floor(b.amount * ODDS[b.choice]);
      addGold(b.userId, payout);
      payouts.push({
        userId: b.userId,
        nickname: b.nickname || '알 수 없음',
        choice: b.choice,
        amount: b.amount,
        payout
      });
    });
  }

  roundHistory.unshift({
    roundId: currentRound.roundId,
    result,
    bets: currentRound.bets.map(b => ({
      userId: b.userId,
      nickname: b.nickname,
      choice: b.choice,
      amount: b.amount,
      won: b.choice === result
    })),
    winners: payouts,
    resolvedAt: currentRound.resolvedAt
  });
  if (roundHistory.length > HISTORY_MAX) roundHistory.pop();

  const completed = { ...currentRound, winners: payouts };
  currentRound = null;
  if (typeof onRoundResolvedCb === 'function') onRoundResolvedCb(completed);

  // 다음 라운드
  ensureCurrentRound();
  if (resolveTimer) clearTimeout(resolveTimer);
  const cb = resolveCallbacks;
  if (cb) {
    resolveTimer = setTimeout(() => {
      const completedNext = tryResolve(cb.getNickname, cb.addGold);
      if (completedNext && typeof onRoundResolvedCb === 'function') onRoundResolvedCb(completedNext);
    }, ROUND_INTERVAL_MS);
  }

  return completed;
}

function placeBet(userId, nickname, choice, amount) {
  ensureCurrentRound();
  if (!currentRound || currentRound.result != null) {
    return { ok: false, error: '배팅 받는 시간이 아닙니다.' };
  }
  if (!CHOICES.includes(choice)) {
    return { ok: false, error: '철수 승, 영희 승, 무승부 중 선택하세요.' };
  }
  const amt = Math.floor(Number(amount) || 0);
  if (amt < MIN_BET) return { ok: false, error: `최소 ${MIN_BET}G 이상 배팅하세요.` };
  if (amt > MAX_BET) return { ok: false, error: `최대 ${MAX_BET}G 이하로 배팅하세요.` };

  const alreadyBet = currentRound.bets.find(b => b.userId === userId);
  if (alreadyBet) return { ok: false, error: '이미 이번 라운드에 배팅했습니다.' };

  currentRound.bets.push({
    userId,
    nickname: String(nickname || '알 수 없음').slice(0, 20),
    choice,
    amount: amt
  });

  return {
    ok: true,
    bet: { choice, amount: amt, odds: ODDS[choice] }
  };
}

function getCurrentRound(getNickname) {
  ensureCurrentRound();
  if (!currentRound) return null;
  const getName = getNickname || (() => null);
  return {
    roundId: currentRound.roundId,
    startTime: currentRound.startTime,
    endTime: getRoundEndTime(currentRound.startTime),
    result: currentRound.result,
    bets: currentRound.bets.map(b => ({
      userId: b.userId,
      nickname: b.nickname,
      choice: b.choice,
      amount: b.amount,
      odds: ODDS[b.choice]
    })),
    totalByChoice: {
      철수승: currentRound.bets.filter(b => b.choice === '철수승').reduce((s, b) => s + b.amount, 0),
      영희승: currentRound.bets.filter(b => b.choice === '영희승').reduce((s, b) => s + b.amount, 0),
      무승부: currentRound.bets.filter(b => b.choice === '무승부').reduce((s, b) => s + b.amount, 0)
    }
  };
}

function getHistory() {
  return [...roundHistory];
}

function getConfig() {
  return {
    choices: CHOICES,
    odds: { ...ODDS },
    icons: { ...ICONS },
    minBet: MIN_BET,
    maxBet: MAX_BET,
    roundIntervalMs: ROUND_INTERVAL_MS
  };
}

// 서버 시작 시 타이머 초기화를 위해 resolve 체크 (getNickname, addGold는 의존성 주입)
function startRoundScheduler(getNickname, addGold) {
  setResolveCallbacks(getNickname, addGold);
  tryResolve(getNickname, addGold); // 이미 시간 지났으면 결산
  ensureCurrentRound(); // 현재 라운드 없으면 시작
}

module.exports = {
  placeBet,
  getCurrentRound,
  getHistory,
  getConfig,
  tryResolve,
  startRoundScheduler,
  setOnRoundResolved,
  CHOICES,
  ODDS,
  MIN_BET,
  MAX_BET,
  ICONS
};
