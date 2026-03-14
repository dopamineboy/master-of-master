/**
 * 전투 시스템: 먹이사슬, 매달 체인지, 랜덤 매칭
 */
const JOBS = ['farmer', 'fisherman', 'miner', 'merchant'];
const JOB_LABELS = { farmer: '농부', fisherman: '낚시꾼', miner: '광부', merchant: '장사꾼' };

// 먹이사슬: A > B 이면 A가 B를 이김. 매달 순환
// 기본: farmer > miner > fisherman > merchant > farmer
const BASE_CHAIN = ['farmer', 'miner', 'fisherman', 'merchant'];

function getFoodChainMonth() {
  const now = new Date();
  return now.getFullYear() * 12 + now.getMonth();
}

function getFoodChain() {
  const month = getFoodChainMonth();
  const rotate = month % 4;
  const chain = [];
  for (let i = 0; i < 4; i++) {
    chain.push(BASE_CHAIN[(rotate + i) % 4]);
  }
  return chain;
}

/** A가 B를 이기는지 (먹이사슬 우위) */
function doesABeatB(attackerJob, defenderJob) {
  const chain = getFoodChain();
  const aIdx = chain.indexOf(attackerJob);
  const bIdx = chain.indexOf(defenderJob);
  if (aIdx < 0 || bIdx < 0) return false;
  return (aIdx + 1) % 4 === bIdx;
}

/** 먹이사슬 크리티컬 확률 (우위일 때 낮은 전투능력으로도 승리 가능) */
const FOOD_CHAIN_CRIT_RATE = 0.25;

function findOpponent(users, myUserId, myJob) {
  const others = [];
  users.forEach((u, id) => {
    if (id === myUserId) return;
    if (!u.characterName || !u.characterType) return;
    if (u.characterType === myJob) return;
    others.push({ id, user: u });
  });
  if (others.length === 0) return null;
  const picked = others[Math.floor(Math.random() * others.length)];
  return picked;
}

function resolveBattle(attacker, defender, attackerJob, defenderJob, attackerId, defenderId) {
  const attPower = attacker.combatPower || 1;
  const defPower = defender.combatPower || 1;
  const attHasAdvantage = doesABeatB(attackerJob, defenderJob);

  // 먹이사슬 크리티컬: 우위일 때 25% 확률로 무조건 승리
  if (attHasAdvantage && Math.random() < FOOD_CHAIN_CRIT_RATE) {
    return { result: 'win', reason: '먹이사슬 크리티컬!' };
  }

  // 전투능력 비교
  if (attPower > defPower) return { result: 'win', reason: '전투능력 우위' };
  if (attPower < defPower) return { result: 'lose', reason: '전투능력 열세' };

  // 동점: 50% 확률
  return Math.random() < 0.5
    ? { result: 'win', reason: '접전 승리' }
    : { result: 'lose', reason: '접전 패배' };
}

module.exports = {
  JOBS,
  JOB_LABELS,
  getFoodChain,
  getFoodChainMonth,
  doesABeatB,
  findOpponent,
  resolveBattle,
  FOOD_CHAIN_CRIT_RATE
};
