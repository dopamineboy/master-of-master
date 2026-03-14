/**
 * 낚시광 모티브 — 단순 성장형 낚시 게임
 * 루프: 낚시 → 물고기 드랍 → 가방/판매 → 골드로 강화 → 더 좋은 드랍
 * 전투: 먹이사슬, 전투능력 1-50, 강화석, 하루 3회
 */
const crypto = require('crypto');
const plazaGamble = require('./plazaGamble');
const battleSystem = require('./battleSystem');
const users = new Map();

const COMBAT_POWER_MAX = 20;
const BATTLES_PER_DAY = 3;
const FOOD_CHAIN_CRIT_RATE = battleSystem.FOOD_CHAIN_CRIT_RATE;

// 직업별 레어/일반 아이템 ID 목록 (조합용)
const FARM_RARE = ['crop_rare1', 'crop_rare2', 'crop_unique'];
const FARM_NORMAL = ['crop_1', 'crop_2', 'crop_3', 'crop_4', 'crop_5'];
const FISH_RARE = ['fish_rare1', 'fish_rare2', 'fish_unique'];
const FISH_NORMAL = ['fish_1', 'fish_2', 'fish_3', 'fish_4', 'fish_5'];
const MINER_RARE = ['ore_rare1', 'ore_rare2', 'ore_unique'];
const MINER_NORMAL = ['ore_1', 'ore_2', 'ore_3', 'ore_4', 'ore_5'];

const GOLD_NORMAL = 2;
const GOLD_RARE = 10;
const GOLD_UNIQUE = 40;
const UNIQUE_DROP_RATE = 0.01;
const RARE_DROP_RATE = 0.15;

const FISH = {
  fish_1: { name: '민물고기', gold: GOLD_NORMAL, rarity: 'normal' },
  fish_2: { name: '붕어', gold: GOLD_NORMAL, rarity: 'normal' },
  fish_3: { name: '잉어', gold: GOLD_NORMAL, rarity: 'normal' },
  fish_4: { name: '꽁치', gold: GOLD_NORMAL, rarity: 'normal' },
  fish_5: { name: '농어', gold: GOLD_NORMAL, rarity: 'normal' },
  fish_rare1: { name: '황금 송어', gold: GOLD_RARE, rarity: 'rare' },
  fish_rare2: { name: '붉은 도미', gold: GOLD_RARE, rarity: 'rare' },
  fish_unique: { name: '대물', gold: GOLD_UNIQUE, rarity: 'unique' }
};
const FISH_DROP = {
  normal: ['fish_1', 'fish_2', 'fish_3', 'fish_4', 'fish_5'],
  rare: ['fish_rare1', 'fish_rare2'],
  unique: ['fish_unique']
};

const TITLES = [
  { minLevel: 1, name: '평민' },
  { minLevel: 11, name: '견습' },
  { minLevel: 21, name: '초급' },
  { minLevel: 31, name: '숙련' },
  { minLevel: 41, name: '전문가' },
  { minLevel: 51, name: '명인' },
  { minLevel: 61, name: '마스터' }
];

function getTitle(level) {
  let t = TITLES[0].name;
  for (const row of TITLES) {
    if (level >= row.minLevel) t = row.name;
  }
  return t;
}

const FARM_ITEMS = {
  crop_1: { name: '당근', gold: GOLD_NORMAL, rarity: 'normal' },
  crop_2: { name: '감자', gold: GOLD_NORMAL, rarity: 'normal' },
  crop_3: { name: '밀', gold: GOLD_NORMAL, rarity: 'normal' },
  crop_4: { name: '양배추', gold: GOLD_NORMAL, rarity: 'normal' },
  crop_5: { name: '무', gold: GOLD_NORMAL, rarity: 'normal' },
  crop_rare1: { name: '호박', gold: GOLD_RARE, rarity: 'rare' },
  crop_rare2: { name: '상추', gold: GOLD_RARE, rarity: 'rare' },
  crop_unique: { name: '황금 작물', gold: GOLD_UNIQUE, rarity: 'unique' }
};
const FARM_DROP = {
  normal: ['crop_1', 'crop_2', 'crop_3', 'crop_4', 'crop_5'],
  rare: ['crop_rare1', 'crop_rare2'],
  unique: ['crop_unique']
};

const MINER_ITEMS = {
  ore_1: { name: '구리 광석', gold: GOLD_NORMAL, rarity: 'normal' },
  ore_2: { name: '철 광석', gold: GOLD_NORMAL, rarity: 'normal' },
  ore_3: { name: '석탄', gold: GOLD_NORMAL, rarity: 'normal' },
  ore_4: { name: '흑연', gold: GOLD_NORMAL, rarity: 'normal' },
  ore_5: { name: '아연 광석', gold: GOLD_NORMAL, rarity: 'normal' },
  ore_rare1: { name: '은 광석', gold: GOLD_RARE, rarity: 'rare' },
  ore_rare2: { name: '수정', gold: GOLD_RARE, rarity: 'rare' },
  ore_unique: { name: '금 광석', gold: GOLD_UNIQUE, rarity: 'unique' }
};
const MINER_DROP = {
  normal: ['ore_1', 'ore_2', 'ore_3', 'ore_4', 'ore_5'],
  rare: ['ore_rare1', 'ore_rare2'],
  unique: ['ore_unique']
};

// 계약서 아이템 (칭호 획득용, 판매 불가)
const CONTRACT_ITEMS = {
  contract_1: { name: '일반계약서', gold: 0, rarity: 'contract', sellable: false },
  contract_2: { name: '고급계약서', gold: 0, rarity: 'contract', sellable: false },
  contract_3: { name: '전문계약서', gold: 0, rarity: 'contract', sellable: false },
  contract_4: { name: '명인계약서', gold: 0, rarity: 'contract', sellable: false },
  contract_5: { name: '마스터계약서', gold: 0, rarity: 'contract', sellable: false }
};

// 직업별 칭호 5단계: [활동횟수, 필요한 계약서 ID] - 마스터까지 점진적 고난이도
const JOB_TITLE_STAGES = {
  farmer: [
    { name: '초보농사꾼', count: 1000, contract: 'contract_1' },
    { name: '숙련농사꾼', count: 5000, contract: 'contract_2' },
    { name: '전문농사꾼', count: 20000, contract: 'contract_3' },
    { name: '명인농사꾼', count: 60000, contract: 'contract_4' },
    { name: '마스터농사꾼', count: 150000, contract: 'contract_5' }
  ],
  fisherman: [
    { name: '초보낚시꾼', count: 1000, contract: 'contract_1' },
    { name: '숙련낚시꾼', count: 5000, contract: 'contract_2' },
    { name: '전문낚시꾼', count: 20000, contract: 'contract_3' },
    { name: '명인낚시꾼', count: 60000, contract: 'contract_4' },
    { name: '마스터낚시꾼', count: 150000, contract: 'contract_5' }
  ],
  miner: [
    { name: '초보광부', count: 1000, contract: 'contract_1' },
    { name: '숙련광부', count: 5000, contract: 'contract_2' },
    { name: '전문광부', count: 20000, contract: 'contract_3' },
    { name: '명인광부', count: 60000, contract: 'contract_4' },
    { name: '마스터광부', count: 150000, contract: 'contract_5' }
  ],
  merchant: [
    { name: '견습상인', buyTotal: 10000, contract: 'contract_1', profitPercent: 5 },
    { name: '초급상인', buyTotal: 50000, contract: 'contract_2', profitPercent: 10 },
    { name: '숙련상인', buyTotal: 200000, contract: 'contract_3', profitPercent: 15 },
    { name: '전문상인', buyTotal: 600000, contract: 'contract_4', profitPercent: 20 },
    { name: '명인상인', buyTotal: 1500000, contract: 'contract_5', profitPercent: 25 },
    { name: '마스터상인', buyTotal: 4000000, contract: null, profitPercent: 30 }
  ]
};

// 상인조합 풀: 농부/어부/광부가 판매한 아이템 (itemId -> { count, pricePerOne })
const guildPool = {};
// 상인판매 등록 목록: [{ listingId, sellerId, sellerName, itemId, itemName, count, pricePerOne, buyPricePerOne }]
const merchantListings = [];
let nextListingId = 1;

// 계약서: 장터에서 구매 (일반계약서만) + 조합
const CONTRACT_BUY_PRICE = 1000; // 일반계약서 1장 = 1000G
const CONTRACT_CRAFT_RECIPES = {
  contract_2: { from: 'contract_1', need: 10 },   // 10 일반 → 1 고급
  contract_3: { from: 'contract_2', need: 10 },   // 10 고급 → 1 전문
  contract_4: { from: 'contract_3', need: 10 },   // 10 전문 → 1 명인
  contract_5: { from: 'contract_4', need: 10 }    // 10 명인 → 1 마스터
};

// 장터 상자 (일일 구매 한도)
const BOX_ITEMS = {
  lotto_box: { name: '로또상자', price: 10, maxPerDay: 5, rarity: 'box', sellable: false },
  narak_box: { name: '나락상자', price: 100, maxPerDay: 1, rarity: 'box', sellable: false }
};

// 로또상자 오픈 보상: 60% 꽝, 35% 에너지드링크, 4% 이직계약서, 1% 일반계약서
const LOTTO_BOX_REWARDS = [
  { prob: 0.60, result: 'fail', label: '꽝' },
  { prob: 0.35, result: 'energy_drink', label: '에너지드링크' },
  { prob: 0.04, result: 'job_contract', label: '이직계약서' },
  { prob: 0.01, result: 'contract_1', label: '일반계약서' }
];

// 소비/특수 아이템
const CONSUMABLE_ITEMS = {
  energy_drink: { name: '에너지드링크', gold: 0, rarity: 'consumable', sellable: false, useValue: 30 },
  super_food: { name: '슈퍼푸드', gold: 0, rarity: 'consumable', sellable: false, useValue: 50 },
  job_contract: { name: '이직계약서', gold: 0, rarity: 'special', sellable: false },
  enhancement_stone: { name: '강화석', gold: 0, rarity: 'special', sellable: false },
  enhancement_stone_fragment: { name: '강화석 조각', gold: 0, rarity: 'special', sellable: false },
  advanced_enhancement_stone: { name: '고급강화석', gold: 0, rarity: 'special', sellable: false }
};

// 고급 드랍 아이템 ID (레어+유니크) - 고급강화석 조합용
const RARE_ITEM_IDS = [...FARM_RARE, ...FISH_RARE, ...MINER_RARE];

// 크로스 직업 조합: [농부레어5+어부일반10]=슈퍼푸드, [어부레어5+농부일반10]=이직계약서, [광부레어5+어부일반10]=강화석조각
const CROSS_CRAFT_RECIPES = {
  super_food: { rareIds: ['crop_rare1', 'crop_rare2', 'crop_unique'], normalIds: ['fish_1', 'fish_2', 'fish_3', 'fish_4', 'fish_5'], rareCount: 5, normalCount: 10 },
  job_contract: { rareIds: ['fish_rare1', 'fish_rare2', 'fish_unique'], normalIds: ['crop_1', 'crop_2', 'crop_3', 'crop_4', 'crop_5'], rareCount: 5, normalCount: 10 },
  enhancement_stone_fragment: { rareIds: ['ore_rare1', 'ore_rare2', 'ore_unique'], normalIds: ['fish_1', 'fish_2', 'fish_3', 'fish_4', 'fish_5'], rareCount: 5, normalCount: 10 }
};

// 전투능력 강화 확률: 1~20단계. 1단계 60%, 1~10 강화석 / 11~20 고급강화석만, 20단계 극악
function getEnhanceProb(currentLevel) {
  if (currentLevel >= COMBAT_POWER_MAX) return 0;
  if (currentLevel <= 10) {
    return Math.max(0.15, 0.6 - (currentLevel - 1) * 0.05); // 1:60%, 2:55%, ... 10:15%
  }
  const advLevel = currentLevel - 10;
  const probs = [0.10, 0.05, 0.025, 0.01, 0.005, 0.002, 0.001, 0.0005, 0.0002, 0.00001];
  return probs[Math.min(advLevel - 1, 9)] || 0.00001;
}

const ITEMS = {};
Object.entries(FISH).forEach(([id, f]) => {
  ITEMS[id] = { ...f, job: 'fisherman' };
});
Object.entries(FARM_ITEMS).forEach(([id, f]) => {
  ITEMS[id] = { ...f, job: 'farmer' };
});
Object.entries(MINER_ITEMS).forEach(([id, f]) => {
  ITEMS[id] = { ...f, job: 'miner' };
});
Object.entries(CONTRACT_ITEMS).forEach(([id, c]) => {
  ITEMS[id] = { ...c, job: 'contract' };
});
Object.entries(BOX_ITEMS).forEach(([id, b]) => {
  ITEMS[id] = { ...b, job: 'box', gold: 0 };
});
Object.entries(CONSUMABLE_ITEMS).forEach(([id, c]) => {
  ITEMS[id] = { ...c, job: 'consumable' };
});
const JOB_ORDER = ['farmer', 'fisherman', 'miner', 'contract', 'box', 'consumable', 'merchant'];

const ENERGY_MAX = 100;
const ENERGY_PER_ACTION = 2;

/** 한국 시간(KST, UTC+9) 기준 오늘 날짜 YYYY-MM-DD. 매일 00:00 KST에 리셋. */
function getKSTDateString() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
}

function hashPassword(pw) {
  return crypto.createHash('sha256').update(String(pw)).digest('hex');
}

/** 아이디 형식: 2~12자, 한글(가-힣)·영문·숫자. 유니코드 이스케이프 사용으로 인코딩 영향 제거 */
function isValidAccountId(id) {
  const s = normalizeId(id);
  if (!s || s.length < 2 || s.length > 12) return false;
  return /^[\uAC00-\uD7A3a-zA-Z0-9]+$/.test(s);
}

/** 비밀번호 형식: 1~8자, 한글·영문·숫자 */
function isValidPassword(pw) {
  const s = String(pw || '').trim();
  if (!s || s.length < 1 || s.length > 8) return false;
  return /^[\uAC00-\uD7A3a-zA-Z0-9]+$/.test(s);
}

function normalizeId(val) {
  const s = String(val || '').trim();
  return s.normalize ? s.normalize('NFC') : s;
}

const ADMIN_ID = 'admin';

function checkIdAvailable(accountId) {
  const id = normalizeId(accountId);
  if (id === ADMIN_ID) return { ok: false, reason: '해당 아이디는 사용할 수 없습니다.' };
  if (!isValidAccountId(id)) return { ok: false, reason: '아이디는 2~12자(한글·영문·숫자)로 입력하세요.' };
  return { ok: !users.has(id), reason: users.has(id) ? '이미 사용 중인 아이디입니다.' : null };
}

function createAccount(accountId, password) {
  const id = normalizeId(accountId);
  let pw = String(password || '').trim();
  if (pw.normalize) pw = pw.normalize('NFC');
  if (id === ADMIN_ID) return { ok: false, replyText: '해당 아이디는 사용할 수 없습니다.' };
  if (!isValidAccountId(id)) return { ok: false, replyText: '아이디는 2~12자(한글·영문·숫자)로 입력하세요.' };
  if (users.has(id)) return { ok: false, replyText: '이미 사용 중인 아이디입니다.' };
  if (!isValidPassword(pw)) return { ok: false, replyText: '비밀번호는 8자 이내(한글·영문·숫자)로 입력하세요.' };
  const assignedJob = JOBS[Math.floor(Math.random() * JOBS.length)];
  const user = {
    id: id,
    accountId: id,
    passwordHash: hashPassword(pw),
    characterName: id,
    characterType: assignedJob,
    level: 1,
    harvestCount: 0,
    fishCount: 0,
    mineCount: 0,
    jobTitleFarmer: 0,
    jobTitleFisherman: 0,
    jobTitleMiner: 0,
    jobTitleMerchant: 0,
    merchantBuyTotal: 0,
    merchantBuyPrice: {},
    gold: 0,
    energy: ENERGY_MAX,
    maxEnergy: ENERGY_MAX,
    lastResetDate: getKSTDateString(),
    combatPower: 1,
    battlesToday: 0,
    battleHistory: [],
    inventory: {}
  };
  users.set(id, user);
  return { ok: true, accountId: id, state: buildState(user), replyText: `${JOB_LABELS[assignedJob]} ${id}님, 환영합니다!` };
}

function tryLogin(accountId, password) {
  const id = normalizeId(accountId);
  let pw = String(password || '').trim();
  if (pw.normalize) pw = pw.normalize('NFC');
  if (!id || !pw) return { ok: false, replyText: '아이디와 비밀번호를 입력하세요.' };
  const user = users.get(id);
  if (!user || !user.passwordHash) return { ok: false, replyText: '아이디 또는 비밀번호가 일치하지 않습니다.' };
  const hash = hashPassword(pw);
  if (user.passwordHash !== hash) return { ok: false, replyText: '아이디 또는 비밀번호가 일치하지 않습니다.' };
  return { ok: true, accountId: id, state: buildState(user) };
}

// 칭호 1단계당 레어/유니크 드랍 확률 +1%
const DROP_RATE_PER_STAGE = 0.01;
// 수확량 더블 찬스: 칭호 1단계당 +5% (견습 5%, 숙련 10%, ...)
const DOUBLE_CHANCE_PER_STAGE = 0.05;

function pickFromDrop(table, titleStage) {
  const stage = Math.max(0, Math.min(5, titleStage || 0));
  const u = Math.min(0.1, UNIQUE_DROP_RATE + stage * DROP_RATE_PER_STAGE);
  const r = Math.min(0.35, RARE_DROP_RATE + stage * DROP_RATE_PER_STAGE);
  const rand = Math.random();
  if (rand < u && table.unique.length) return table.unique[Math.floor(Math.random() * table.unique.length)];
  if (rand < u + r && table.rare.length) return table.rare[Math.floor(Math.random() * table.rare.length)];
  return table.normal[Math.floor(Math.random() * table.normal.length)];
}

function getDoubleChance(titleStage) {
  const stage = Math.max(0, Math.min(5, titleStage || 0));
  return stage * DOUBLE_CHANCE_PER_STAGE; // 0, 5%, 10%, 15%, 20%, 25%
}

function pickFarmDrop(titleStage) {
  return pickFromDrop(FARM_DROP, titleStage);
}
function pickMinerDrop(titleStage) {
  return pickFromDrop(MINER_DROP, titleStage);
}
function pickFishDrop(titleStage) {
  return pickFromDrop(FISH_DROP, titleStage);
}

function pickLottoReward() {
  const r = Math.random();
  let acc = 0;
  for (const { prob, result } of LOTTO_BOX_REWARDS) {
    acc += prob;
    if (r < acc) return result;
  }
  return 'fail';
}

const MERCHANT_NORMAL_GOLD = 10;
const MERCHANT_RARE_GOLD = 30;
const MERCHANT_UNIQUE_GOLD = 100;

function pickMerchantResult() {
  const r = Math.random();
  if (r < UNIQUE_DROP_RATE) return { gold: MERCHANT_UNIQUE_GOLD, tier: 'unique', label: '땡잡았다' };
  if (r < UNIQUE_DROP_RATE + RARE_DROP_RATE) return { gold: MERCHANT_RARE_GOLD, tier: 'rare', label: '고급판매' };
  return { gold: MERCHANT_NORMAL_GOLD, tier: 'normal', label: '일반판매' };
}

const JOBS = ['farmer', 'fisherman', 'miner', 'merchant'];
const JOB_LABELS = { farmer: '농부', fisherman: '낚시꾼', miner: '광부', merchant: '장사꾼' };

function getOrCreateUser(userId) {
  if (!users.has(userId)) return null;
  const u = users.get(userId);
  if (u.harvestCount == null) u.harvestCount = 0;
  if (u.combatPower == null) u.combatPower = 1;
  if (u.battlesToday == null) u.battlesToday = 0;
  if (u.battleHistory == null) u.battleHistory = [];
  if (u.mineCount == null) u.mineCount = 0;
  if (u.jobTitleFarmer == null) u.jobTitleFarmer = 0;
  if (u.jobTitleFisherman == null) u.jobTitleFisherman = 0;
  if (u.jobTitleMiner == null) u.jobTitleMiner = 0;
  if (u.jobTitleMerchant == null) u.jobTitleMerchant = 0;
  if (u.merchantBuyTotal == null) u.merchantBuyTotal = 0;
  if (u.merchantBuyPrice == null) u.merchantBuyPrice = {};
  if (u.merchantConsecutiveHigh == null) u.merchantConsecutiveHigh = 0;
  if (u.lottoBoxBoughtToday == null) u.lottoBoxBoughtToday = 0;
  if (u.narakBoxBoughtToday == null) u.narakBoxBoughtToday = 0;
  if (u.maxEnergy !== ENERGY_MAX) {
    u.maxEnergy = ENERGY_MAX;
    u.energy = Math.min(u.energy, ENERGY_MAX);
  }
  return u;
}

function _ensureUserFields(u) {
  if (!u) return;
  if (u.harvestCount == null) u.harvestCount = 0;
  if (u.combatPower == null) u.combatPower = 1;
  if (u.battlesToday == null) u.battlesToday = 0;
  if (u.battleHistory == null) u.battleHistory = [];
  if (u.mineCount == null) u.mineCount = 0;
  if (u.jobTitleFarmer == null) u.jobTitleFarmer = 0;
  if (u.jobTitleFisherman == null) u.jobTitleFisherman = 0;
  if (u.jobTitleMiner == null) u.jobTitleMiner = 0;
  if (u.jobTitleMerchant == null) u.jobTitleMerchant = 0;
  if (u.merchantBuyTotal == null) u.merchantBuyTotal = 0;
  if (u.merchantBuyPrice == null) u.merchantBuyPrice = {};
  if (u.merchantConsecutiveHigh == null) u.merchantConsecutiveHigh = 0;
  if (u.lottoBoxBoughtToday == null) u.lottoBoxBoughtToday = 0;
  if (u.narakBoxBoughtToday == null) u.narakBoxBoughtToday = 0;
  if (u.maxEnergy !== ENERGY_MAX) {
    u.maxEnergy = ENERGY_MAX;
    u.energy = Math.min(u.energy, ENERGY_MAX);
  }
}

function getOrCreateUser_OLD(userId) {
  if (!users.has(userId)) {
    users.set(userId, {
      id: userId,
      characterName: null,
      characterType: null,
      level: 1,
      harvestCount: 0,
      fishCount: 0,
      mineCount: 0,
      jobTitleFarmer: 0,
      jobTitleFisherman: 0,
      jobTitleMiner: 0,
      jobTitleMerchant: 0,
      merchantBuyTotal: 0,
      merchantBuyPrice: {},
      gold: 0,
      energy: ENERGY_MAX,
      maxEnergy: ENERGY_MAX,
      lastResetDate: getKSTDateString(),
      combatPower: 1,
      battlesToday: 0,
      battleHistory: [],
      inventory: {}
    });
  }
  const u = users.get(userId);
  if (u.harvestCount == null) u.harvestCount = 0;
  if (u.combatPower == null) u.combatPower = 1;
  if (u.battlesToday == null) u.battlesToday = 0;
  if (u.battleHistory == null) u.battleHistory = [];
  if (u.mineCount == null) u.mineCount = 0;
  if (u.jobTitleFarmer == null) u.jobTitleFarmer = 0;
  if (u.jobTitleFisherman == null) u.jobTitleFisherman = 0;
  if (u.jobTitleMiner == null) u.jobTitleMiner = 0;
  if (u.jobTitleMerchant == null) u.jobTitleMerchant = 0;
  if (u.merchantBuyTotal == null) u.merchantBuyTotal = 0;
  if (u.merchantBuyPrice == null) u.merchantBuyPrice = {};
  if (u.merchantConsecutiveHigh == null) u.merchantConsecutiveHigh = 0;
  if (u.lottoBoxBoughtToday == null) u.lottoBoxBoughtToday = 0;
  if (u.narakBoxBoughtToday == null) u.narakBoxBoughtToday = 0;
  if (u.maxEnergy !== ENERGY_MAX) {
    u.maxEnergy = ENERGY_MAX;
    u.energy = Math.min(u.energy, ENERGY_MAX);
  }
  return u;
}

function ensureDailyEnergy(user) {
  const today = getKSTDateString();
  if (user.lastResetDate !== today) {
    user.lastResetDate = today;
    user.energy = user.maxEnergy;
    user.lottoBoxBoughtToday = 0;
    user.narakBoxBoughtToday = 0;
    user.battlesToday = 0;
  }
}

function pickDrop(rodLevel) {
  return pickFishDrop();
}

function addToInv(inv, id, n) {
  inv[id] = (inv[id] || 0) + n;
}

function getMerchantProfitMargin(user) {
  const stages = JOB_TITLE_STAGES.merchant;
  if (!stages) return 0;
  const stage = user.jobTitleMerchant || 0;
  if (stage <= 0) return 0;
  const req = stages[stage - 1];
  return req && req.profitPercent != null ? req.profitPercent : 0;
}

// 직업별 칭호 업그레이드 시도: 조건 충족 시 계약서 소비 후 칭호 획득
function tryUpgradeJobTitle(user, jobType) {
  const stages = JOB_TITLE_STAGES[jobType];
  if (!stages) return null;
  let count = 0;
  let titleStage = 0;
  if (jobType === 'farmer') { count = user.harvestCount || 0; titleStage = user.jobTitleFarmer || 0; }
  else if (jobType === 'fisherman') { count = user.fishCount || 0; titleStage = user.jobTitleFisherman || 0; }
  else if (jobType === 'miner') { count = user.mineCount || 0; titleStage = user.jobTitleMiner || 0; }
  else if (jobType === 'merchant') { count = user.merchantBuyTotal || 0; titleStage = user.jobTitleMerchant || 0; }
  else return null;
  if (titleStage >= stages.length) return null;
  const req = stages[titleStage];
  const threshold = req.buyTotal != null ? req.buyTotal : req.count;
  const hasContract = req.contract ? (user.inventory[req.contract] || 0) >= 1 : true;
  if (count >= threshold && hasContract) {
    if (req.contract) {
      user.inventory[req.contract] = (user.inventory[req.contract] || 1) - 1;
      if (!user.inventory[req.contract]) delete user.inventory[req.contract];
    }
    if (jobType === 'farmer') user.jobTitleFarmer = titleStage + 1;
    else if (jobType === 'fisherman') user.jobTitleFisherman = titleStage + 1;
    else if (jobType === 'miner') user.jobTitleMiner = titleStage + 1;
    else if (jobType === 'merchant') user.jobTitleMerchant = titleStage + 1;
    return req.name;
  }
  return null;
}

function getJobTitle(user, jobType) {
  const stages = JOB_TITLE_STAGES[jobType];
  if (!stages) return null;
  let stage = 0;
  if (jobType === 'farmer') stage = user.jobTitleFarmer || 0;
  else if (jobType === 'fisherman') stage = user.jobTitleFisherman || 0;
  else if (jobType === 'miner') stage = user.jobTitleMiner || 0;
  else if (jobType === 'merchant') stage = user.jobTitleMerchant || 0;
  if (stage <= 0) return null;
  return stages[stage - 1].name;
}

function getNextTitleRequirement(user, jobType) {
  const stages = JOB_TITLE_STAGES[jobType];
  if (!stages) return null;
  let stage = 0;
  let count = 0;
  if (jobType === 'farmer') { stage = user.jobTitleFarmer || 0; count = user.harvestCount || 0; }
  else if (jobType === 'fisherman') { stage = user.jobTitleFisherman || 0; count = user.fishCount || 0; }
  else if (jobType === 'miner') { stage = user.jobTitleMiner || 0; count = user.mineCount || 0; }
  else if (jobType === 'merchant') { stage = user.jobTitleMerchant || 0; count = user.merchantBuyTotal || 0; }
  if (stage >= stages.length) return null;
  const req = stages[stage];
  const threshold = req.buyTotal != null ? req.buyTotal : req.count;
  const contractName = req.contract ? (CONTRACT_ITEMS[req.contract]?.name || req.contract) : null;
  const activityLabel = jobType === 'farmer' ? '채집' : jobType === 'fisherman' ? '낚시' : jobType === 'miner' ? '채광' : '상인조합 구매';
  return { name: req.name, count: threshold, current: count, contract: contractName, activityLabel };
}

function buildState(user) {
  const list = [];
  for (const [id, count] of Object.entries(user.inventory)) {
    if (count <= 0) continue;
    const it = ITEMS[id] || FISH[id];
    const name = it ? it.name : id;
    const job = it && it.job ? it.job : 'fisherman';
    const goldPer = it && it.gold != null ? it.gold : 0;
    list.push({ id, name, count, gold: goldPer * count, job });
  }
  list.sort((a, b) => {
    const ji = JOB_ORDER.indexOf(a.job) - JOB_ORDER.indexOf(b.job);
    if (ji !== 0) return ji;
    return (a.name || '').localeCompare(b.name || '');
  });
  const jobType = user.characterType;
  const jobTitle = ['farmer', 'fisherman', 'miner', 'merchant'].includes(jobType) ? getJobTitle(user, jobType) : null;
  const displayTitle = jobTitle || getTitle(user.level);
  const nextReq = ['farmer', 'fisherman', 'miner', 'merchant'].includes(jobType) ? getNextTitleRequirement(user, jobType) : null;
  const guildPoolList = Object.entries(guildPool).map(([id, v]) => ({
    itemId: id,
    itemName: (ITEMS[id] || FARM_ITEMS[id] || MINER_ITEMS[id])?.name || id,
    count: v.count,
    pricePerOne: v.pricePerOne
  }));
  const merchantListingsList = merchantListings.map(l => ({ ...l }));
  return {
    accountId: user.accountId || user.id,
    characterName: user.characterName,
    characterType: user.characterType,
    level: user.level,
    title: displayTitle,
    gold: user.gold,
    energy: user.energy,
    maxEnergy: user.maxEnergy,
    harvestCount: user.harvestCount || 0,
    fishCount: user.fishCount || 0,
    mineCount: user.mineCount || 0,
    jobTitleFarmer: user.jobTitleFarmer || 0,
    jobTitleFisherman: user.jobTitleFisherman || 0,
    jobTitleMiner: user.jobTitleMiner || 0,
    jobTitleMerchant: user.jobTitleMerchant || 0,
    merchantBuyTotal: user.merchantBuyTotal || 0,
    merchantProfitPercent: jobType === 'merchant' ? getMerchantProfitMargin(user) : 0,
    merchantBuyPrices: jobType === 'merchant' && user.merchantBuyPrice ? { ...user.merchantBuyPrice } : {},
    nextTitleRequirement: nextReq,
    lottoBoxRemaining: Math.max(0, 5 - (user.lottoBoxBoughtToday || 0)),
    narakBoxRemaining: user.narakBoxBoughtToday ? 0 : 1,
    combatPower: user.combatPower || 1,
    battlesRemaining: Math.max(0, BATTLES_PER_DAY - (user.battlesToday || 0)),
    battleHistory: (user.battleHistory || []).slice(0, 50),
    inventory: { ...user.inventory },
    inventoryList: list,
    guildPoolList,
    merchantListingsList
  };
}

function handleGameCommand(userId, body) {
  const isObject = body && typeof body === 'object';
  const action = isObject && body.action != null ? String(body.action).trim() : '';

  // 회원가입 / 로그인 / 아이디 중복확인 (세션 불필요)
  if (action === 'checkId') {
    const r = checkIdAvailable(body.accountId);
    return { checkId: true, idAvailable: r.ok, replyText: r.reason || (r.ok ? '사용 가능한 아이디입니다.' : r.reason) };
  }
  if (action === 'createAccount') {
    try {
      const r = createAccount(body.accountId, body.password);
      if (!r.ok) return { replyText: r.replyText || '계정 생성에 실패했습니다.', state: null };
      return { createAccount: true, accountId: r.accountId, replyText: r.replyText, state: r.state };
    } catch (err) {
      return { replyText: err.message || '캐릭터 생성 중 오류가 발생했습니다.', state: null };
    }
  }
  if (action === 'login') {
    const r = tryLogin(body.accountId, body.password);
    if (!r.ok) return { replyText: r.replyText, state: null };
    return { login: true, accountId: r.accountId, state: r.state };
  }

  const user = getOrCreateUser(userId);
  if (!user) return { replyText: '로그인이 필요합니다.', state: null };
  ensureDailyEnergy(user);
  const t = (isObject ? body.text : body) != null ? String(isObject ? body.text : body).trim().replace(/^\//, '') : '';
  const cmd = (t || (isObject && body.action != null ? String(body.action) : '')).trim();

  if (cmd === '메뉴' || cmd === '') {
    return {
      replyText: '',
      state: buildState(user),
      quickReplies: []
    };
  }

  function tryConsumeEnergy() {
    if (user.energy < ENERGY_PER_ACTION) {
      return { ok: false, reply: '에너지가 부족합니다. (필요 ' + ENERGY_PER_ACTION + ')' };
    }
    user.energy -= ENERGY_PER_ACTION;
    return { ok: true };
  }

  if (cmd === '채집') {
    const e = tryConsumeEnergy();
    if (!e.ok) return { replyText: e.reply, state: buildState(user), activityItem: null };
    user.harvestCount = (user.harvestCount || 0) + 1;
    const titleStage = user.jobTitleFarmer || 0;
    const itemId = pickFarmDrop(titleStage);
    let yieldCount = 1;
    if (Math.random() < getDoubleChance(titleStage)) yieldCount = 2;
    addToInv(user.inventory, itemId, yieldCount);
    const newTitle = tryUpgradeJobTitle(user, 'farmer');
    const item = ITEMS[itemId] || FARM_ITEMS[itemId];
    return {
      replyText: '',
      state: buildState(user),
      activityItem: { id: itemId, name: item.name, gold: item.gold, rarity: item.rarity, count: yieldCount, doubled: yieldCount === 2 },
      activityNewTitle: newTitle,
      activityGold: null
    };
  }

  if (cmd === '낚시') {
    const e = tryConsumeEnergy();
    if (!e.ok) return { replyText: e.reply, state: buildState(user), activityItem: null, caughtFish: null };
    user.fishCount = (user.fishCount || 0) + 1;
    const titleStage = user.jobTitleFisherman || 0;
    const fishId = pickFishDrop(titleStage);
    let yieldCount = 1;
    if (Math.random() < getDoubleChance(titleStage)) yieldCount = 2;
    addToInv(user.inventory, fishId, yieldCount);
    const newTitle = tryUpgradeJobTitle(user, 'fisherman');
    const fish = FISH[fishId];
    return {
      replyText: '',
      state: buildState(user),
      activityItem: { id: fishId, name: fish.name, gold: fish.gold, rarity: fish.rarity, count: yieldCount, doubled: yieldCount === 2 },
      caughtFish: { id: fishId, name: fish.name, gold: fish.gold, rarity: fish.rarity, count: yieldCount },
      activityNewTitle: newTitle,
      activityGold: null
    };
  }

  if (cmd === '채광') {
    const e = tryConsumeEnergy();
    if (!e.ok) return { replyText: e.reply, state: buildState(user), activityItem: null };
    user.mineCount = (user.mineCount || 0) + 1;
    const titleStage = user.jobTitleMiner || 0;
    const itemId = pickMinerDrop(titleStage);
    let yieldCount = 1;
    if (Math.random() < getDoubleChance(titleStage)) yieldCount = 2;
    addToInv(user.inventory, itemId, yieldCount);
    const newTitle = tryUpgradeJobTitle(user, 'miner');
    const item = ITEMS[itemId] || MINER_ITEMS[itemId];
    return {
      replyText: '',
      state: buildState(user),
      activityItem: { id: itemId, name: item.name, gold: item.gold, rarity: item.rarity, count: yieldCount, doubled: yieldCount === 2 },
      activityNewTitle: newTitle,
      activityGold: null
    };
  }

  if (cmd === '판매' || cmd === '장사') {
    const e = tryConsumeEnergy();
    if (!e.ok) return { replyText: e.reply, state: buildState(user), activityItem: null, activityGold: null, activityTier: null };
    let result;
    let isConsecutiveBonus = false;
    if ((user.merchantConsecutiveHigh || 0) >= 2) {
      result = { gold: MERCHANT_UNIQUE_GOLD, tier: 'unique', label: '땡잡았다' };
      user.merchantConsecutiveHigh = 0;
      isConsecutiveBonus = true;
    } else {
      result = pickMerchantResult();
      if (result.tier === 'rare') {
        user.merchantConsecutiveHigh = (user.merchantConsecutiveHigh || 0) + 1;
      } else {
        user.merchantConsecutiveHigh = 0;
      }
    }
    user.gold += result.gold;
    const tierLabel = isConsecutiveBonus ? result.label + ' (2연속 고급 보너스!)' : result.label;
    return {
      replyText: '',
      state: buildState(user),
      activityItem: null,
      activityGold: result.gold,
      activityTier: tierLabel,
      activityRarity: result.tier
    };
  }

  if (cmd === '가방') {
    return {
      replyText: '',
      state: buildState(user),
      quickReplies: []
    };
  }

  if (cmd === '전부 판매') {
    const inv = user.inventory;
    let total = 0;
    const sold = [];
    for (const [id, n] of Object.entries(inv)) {
      if (n <= 0) continue;
      const it = ITEMS[id];
      if (it && it.sellable === false) continue; // 계약서 등 판매 불가 아이템 제외
      const g = (it && it.gold != null ? it.gold : 0) * n;
      total += g;
      sold.push({ id, name: it ? it.name : id, count: n, gold: g });
      inv[id] = 0;
    }
    Object.keys(inv).forEach(k => { if (!inv[k]) delete inv[k]; });
    user.gold += total;
    return {
      replyText: total === 0 ? '팔 아이템이 없습니다.' : '',
      state: buildState(user),
      soldGold: total,
      soldItems: sold,
      quickReplies: []
    };
  }

  // 장터: 일반계약서 구매 (1장 1000G)
  if (cmd === '계약서구매' || cmd === 'buyContract') {
    const count = Math.max(1, Math.min(99, parseInt(isObject && body.buyCount != null ? body.buyCount : 1, 10) || 1));
    const cost = CONTRACT_BUY_PRICE * count;
    if (user.gold < cost) {
      return {
        replyText: `골드 부족 (일반계약서 ${count}장 = ${cost}G 필요)`,
        state: buildState(user),
        quickReplies: []
      };
    }
    user.gold -= cost;
    addToInv(user.inventory, 'contract_1', count);
    const item = CONTRACT_ITEMS.contract_1;
    return {
      replyText: `일반계약서 ${count}장 구매 완료! (-${cost}G)`,
      state: buildState(user),
      buyContract: { id: 'contract_1', name: item.name, count, cost },
      quickReplies: []
    };
  }

  // 계약서 조합: 10장 → 상위 1장
  if (cmd === '계약서조합' || cmd === 'craftContract') {
    const targetId = (isObject && body.targetId) ? String(body.targetId) : '';
    const recipe = CONTRACT_CRAFT_RECIPES[targetId];
    if (!recipe) {
      return {
        replyText: '조합할 계약서를 선택해 주세요. (고급/전문/명인/마스터)',
        state: buildState(user),
        quickReplies: []
      };
    }
    const have = user.inventory[recipe.from] || 0;
    if (have < recipe.need) {
      const fromName = CONTRACT_ITEMS[recipe.from]?.name || recipe.from;
      const toName = CONTRACT_ITEMS[targetId]?.name || targetId;
      return {
        replyText: `${toName} 조합 실패. ${fromName} ${recipe.need}장 필요 (보유 ${have}장)`,
        state: buildState(user),
        quickReplies: []
      };
    }
    user.inventory[recipe.from] = have - recipe.need;
    if (!user.inventory[recipe.from]) delete user.inventory[recipe.from];
    addToInv(user.inventory, targetId, 1);
    const toName = CONTRACT_ITEMS[targetId]?.name || targetId;
    const fromName = CONTRACT_ITEMS[recipe.from]?.name || recipe.from;
    return {
      replyText: `${fromName} ${recipe.need}장 → ${toName} 1장 조합 완료!`,
      state: buildState(user),
      craftContract: { from: recipe.from, to: targetId, toName },
      quickReplies: []
    };
  }

  // 로또상자 열기
  if (cmd === '로또상자열기' || cmd === 'lottoBoxOpen') {
    const have = user.inventory['lotto_box'] || 0;
    if (have < 1) {
      return { replyText: '로또상자가 없습니다.', state: buildState(user), quickReplies: [] };
    }
    addToInv(user.inventory, 'lotto_box', -1);
    if (!user.inventory['lotto_box']) delete user.inventory['lotto_box'];
    const result = pickLottoReward();
    let rewardLabel = '꽝';
    let addItemId = null;
    if (result === 'energy_drink') {
      addItemId = 'energy_drink';
      rewardLabel = '에너지드링크';
      addToInv(user.inventory, addItemId, 1);
    } else if (result === 'job_contract') {
      addItemId = 'job_contract';
      rewardLabel = '이직계약서';
      addToInv(user.inventory, addItemId, 1);
    } else if (result === 'contract_1') {
      addItemId = 'contract_1';
      rewardLabel = '일반계약서';
      addToInv(user.inventory, addItemId, 1);
    }
    return {
      replyText: rewardLabel === '꽝' ? '꽝! 아무것도 없습니다.' : `${rewardLabel} 획득!`,
      state: buildState(user),
      lottoOpen: { result: rewardLabel, itemId: addItemId },
      quickReplies: []
    };
  }

  // 에너지드링크 사용 (에너지 +30)
  if (cmd === '에너지드링크사용' || cmd === 'useEnergyDrink') {
    const have = user.inventory['energy_drink'] || 0;
    if (have < 1) {
      return { replyText: '에너지드링크가 없습니다.', state: buildState(user), quickReplies: [] };
    }
    addToInv(user.inventory, 'energy_drink', -1);
    if (!user.inventory['energy_drink']) delete user.inventory['energy_drink'];
    const gain = CONSUMABLE_ITEMS.energy_drink.useValue || 30;
    user.energy = Math.min((user.energy || 0) + gain, user.maxEnergy || ENERGY_MAX);
    return {
      replyText: `에너지드링크 사용! 에너지 +${gain} (현재 ${user.energy}/${user.maxEnergy})`,
      state: buildState(user),
      useEnergyDrink: { gained: gain, current: user.energy, max: user.maxEnergy },
      quickReplies: []
    };
  }

  // 광장 가위바위보 배팅
  if (cmd === '광장배팅' || cmd === 'plazaBet') {
    const choice = String(isObject && body.choice != null ? body.choice : '').trim();
    const amount = Math.floor(Number(isObject && body.amount != null ? body.amount : 0) || 0);
    if (!choice) {
      return { replyText: '철수 승, 영희 승, 무승부 중 선택하세요.', state: buildState(user), quickReplies: [], plazaBet: null };
    }
    if (user.gold < amount) {
      return { replyText: `골드 부족 (보유 ${user.gold}G, 배팅 ${amount}G)`, state: buildState(user), quickReplies: [], plazaBet: null };
    }
    const result = plazaGamble.placeBet(userId, user.characterName, choice, amount);
    if (!result.ok) {
      return { replyText: result.error, state: buildState(user), quickReplies: [], plazaBet: null };
    }
    user.gold -= amount;
    return {
      replyText: `${choice} ${amount}G 배팅 완료! (배당 ${result.bet.odds}배)`,
      state: buildState(user),
      quickReplies: [],
      plazaBet: { choice, amount, odds: result.bet.odds }
    };
  }

  // 상인조합: 농부/어부/광부가 드랍 아이템 판매
  if (cmd === '상인조합판매' || cmd === 'guildSell') {
    const jobType = user.characterType;
    if (jobType !== 'farmer' && jobType !== 'fisherman' && jobType !== 'miner') {
      return { replyText: '농부, 어부, 광부만 상인조합에 판매할 수 있습니다.', state: buildState(user), guildSell: null };
    }
    const itemId = String(isObject && body.itemId ? body.itemId : '').trim();
    const sellCount = Math.max(1, Math.min(999, parseInt(isObject && body.count != null ? body.count : 1, 10) || 1));
    if (!itemId) {
      return { replyText: '판매할 아이템을 선택하세요.', state: buildState(user), guildSell: null };
    }
    const it = ITEMS[itemId];
    if (!it || (it.job !== 'farmer' && it.job !== 'fisherman' && it.job !== 'miner')) {
      return { replyText: '상인조합에는 농부/어부/광부 드랍 아이템만 판매 가능합니다.', state: buildState(user), guildSell: null };
    }
    if (it.sellable === false) return { replyText: '해당 아이템은 판매할 수 없습니다.', state: buildState(user), guildSell: null };
    const have = user.inventory[itemId] || 0;
    if (have < sellCount) {
      return { replyText: `${it.name} 부족 (보유 ${have}개, 판매 ${sellCount}개 요청)`, state: buildState(user), guildSell: null };
    }
    const pricePer = it.gold != null ? it.gold : 0;
    const totalGold = pricePer * sellCount;
    addToInv(user.inventory, itemId, -sellCount);
    if (!user.inventory[itemId]) delete user.inventory[itemId];
    user.gold += totalGold;
    if (!guildPool[itemId]) guildPool[itemId] = { count: 0, pricePerOne: pricePer };
    guildPool[itemId].count += sellCount;
    guildPool[itemId].pricePerOne = pricePer;
    return {
      replyText: `${it.name} x${sellCount}개 상인조합 판매 완료! +${totalGold}G`,
      state: buildState(user),
      guildSell: { itemId, itemName: it.name, count: sellCount, gold: totalGold },
      quickReplies: []
    };
  }

  // 상인조합: 장사꾼만 구매
  if (cmd === '상인조합구매' || cmd === 'guildBuy') {
    if (user.characterType !== 'merchant') {
      return { replyText: '장사꾼만 상인조합에서 아이템을 구매할 수 있습니다.', state: buildState(user), guildBuy: null };
    }
    const itemId = String(isObject && body.itemId ? body.itemId : '').trim();
    const buyCount = Math.max(1, Math.min(999, parseInt(isObject && body.count != null ? body.count : 1, 10) || 1));
    if (!itemId) {
      return { replyText: '구입할 아이템을 선택하세요.', state: buildState(user), guildBuy: null };
    }
    const slot = guildPool[itemId];
    if (!slot || slot.count < buyCount) {
      const avail = slot ? slot.count : 0;
      return { replyText: `상인조합에 해당 아이템 부족 (보유 ${avail}개)`, state: buildState(user), guildBuy: null };
    }
    const pricePer = slot.pricePerOne || (ITEMS[itemId] && ITEMS[itemId].gold) || 0;
    const cost = pricePer * buyCount;
    if (user.gold < cost) {
      return { replyText: `골드 부족 (필요 ${cost}G)`, state: buildState(user), guildBuy: null };
    }
    user.gold -= cost;
    addToInv(user.inventory, itemId, buyCount);
    user.merchantBuyTotal = (user.merchantBuyTotal || 0) + cost;
    if (!user.merchantBuyPrice) user.merchantBuyPrice = {};
    user.merchantBuyPrice[itemId] = pricePer;
    guildPool[itemId].count -= buyCount;
    if (guildPool[itemId].count <= 0) delete guildPool[itemId];
    const it = ITEMS[itemId];
    const newTitle = tryUpgradeJobTitle(user, 'merchant');
    return {
      replyText: `${it ? it.name : itemId} x${buyCount}개 구매 완료! (-${cost}G)`,
      state: buildState(user),
      guildBuy: { itemId, itemName: it ? it.name : itemId, count: buyCount, cost },
      activityNewTitle: newTitle,
      quickReplies: []
    };
  }

  // 상인판매: 장사꾼이 구매한 아이템 등록 (이윤 한도 내 가격 설정)
  if (cmd === '상인판매등록' || cmd === 'merchantList') {
    if (user.characterType !== 'merchant') {
      return { replyText: '장사꾼만 상인판매에 물건을 올릴 수 있습니다.', state: buildState(user), merchantList: null };
    }
    const itemId = String(isObject && body.itemId ? body.itemId : '').trim();
    const listCount = Math.max(1, Math.min(999, parseInt(isObject && body.count != null ? body.count : 1, 10) || 1));
    const pricePer = Math.floor(Number(isObject && body.pricePerOne != null ? body.pricePerOne : 0) || 0);
    if (!itemId) {
      return { replyText: '등록할 아이템을 선택하세요.', state: buildState(user), merchantList: null };
    }
    const have = user.inventory[itemId] || 0;
    if (have < listCount) {
      return { replyText: `아이템 부족 (보유 ${have}개)`, state: buildState(user), merchantList: null };
    }
    const buyPrice = user.merchantBuyPrice && user.merchantBuyPrice[itemId] != null
      ? user.merchantBuyPrice[itemId]
      : (ITEMS[itemId] && ITEMS[itemId].gold) || 0;
    const margin = getMerchantProfitMargin(user);
    const maxPrice = Math.ceil(buyPrice * (1 + margin / 100));
    if (pricePer <= 0 || pricePer > maxPrice) {
      return { replyText: `가격은 1~${maxPrice}G (구매가 ${buyPrice}G + 최대 ${margin}% 이윤)`, state: buildState(user), merchantList: null };
    }
    addToInv(user.inventory, itemId, -listCount);
    if (!user.inventory[itemId]) delete user.inventory[itemId];
    merchantListings.push({
      listingId: nextListingId++,
      sellerId: userId,
      sellerName: user.characterName,
      itemId,
      itemName: (ITEMS[itemId] && ITEMS[itemId].name) || itemId,
      count: listCount,
      pricePerOne: pricePer,
      buyPricePerOne: buyPrice
    });
    return {
      replyText: `${(ITEMS[itemId] && ITEMS[itemId].name) || itemId} x${listCount}개 ${pricePer}G에 등록!`,
      state: buildState(user),
      merchantList: { itemId, count: listCount, pricePerOne: pricePer },
      quickReplies: []
    };
  }

  // 상인판매: 모든 유저가 구매 가능
  if (cmd === '상인판매구매' || cmd === 'merchantBuy') {
    const listingId = parseInt(isObject && body.listingId != null ? body.listingId : 0, 10);
    const buyCount = Math.max(1, parseInt(isObject && body.count != null ? body.count : 1, 10) || 1);
    const listing = merchantListings.find(l => l.listingId === listingId);
    if (!listing) {
      return { replyText: '해당 등록물을 찾을 수 없습니다.', state: buildState(user), merchantBuy: null };
    }
    if (listing.count < buyCount) {
      return { replyText: `수량 부족 (등록 ${listing.count}개)`, state: buildState(user), merchantBuy: null };
    }
    const cost = listing.pricePerOne * buyCount;
    if (user.gold < cost) {
      return { replyText: `골드 부족 (필요 ${cost}G)`, state: buildState(user), merchantBuy: null };
    }
    user.gold -= cost;
    addToInv(user.inventory, listing.itemId, buyCount);
    listing.count -= buyCount;
    const seller = users.get(listing.sellerId);
    if (seller) seller.gold = (seller.gold || 0) + cost;
    if (listing.count <= 0) {
      const idx = merchantListings.findIndex(l => l.listingId === listingId);
      if (idx >= 0) merchantListings.splice(idx, 1);
    }
    return {
      replyText: `${listing.itemName} x${buyCount}개 구매! (-${cost}G)`,
      state: buildState(user),
      merchantBuy: { itemName: listing.itemName, count: buyCount, cost },
      quickReplies: []
    };
  }

  // 장터: 로또상자/나락상자 구매 (일일 한도)
  if (cmd === '로또상자구매' || cmd === '나락상자구매' || (cmd === '상자구매' && (body.boxId === 'lotto_box' || body.boxId === 'narak_box'))) {
    const boxId = cmd === '로또상자구매' ? 'lotto_box' : cmd === '나락상자구매' ? 'narak_box' : String(body.boxId || '');
    const box = BOX_ITEMS[boxId];
    if (!box) {
      return { replyText: '구매할 상자를 선택해 주세요.', state: buildState(user), quickReplies: [] };
    }
    if (user.gold < box.price) {
      return { replyText: `골드 부족 (${box.name} ${box.price}G 필요)`, state: buildState(user), quickReplies: [] };
    }
    const bought = boxId === 'lotto_box' ? (user.lottoBoxBoughtToday || 0) : (user.narakBoxBoughtToday || 0);
    if (bought >= box.maxPerDay) {
      return { replyText: `${box.name} 오늘 구매 한도 초과 (${box.maxPerDay}개/일)`, state: buildState(user), quickReplies: [] };
    }
    user.gold -= box.price;
    addToInv(user.inventory, boxId, 1);
    if (boxId === 'lotto_box') user.lottoBoxBoughtToday = bought + 1;
    else user.narakBoxBoughtToday = 1;
    return {
      replyText: `${box.name} 구매 완료! (-${box.price}G)`,
      state: buildState(user),
      buyBox: { id: boxId, name: box.name, price: box.price },
      quickReplies: []
    };
  }

  // 전투: 하루 3회, 다른 직업 랜덤 매칭, 골드±10%, 무승부 에너지-10
  if (cmd === '전투' || cmd === 'battle') {
    const battlesDone = user.battlesToday || 0;
    if (battlesDone >= BATTLES_PER_DAY) {
      return { replyText: `오늘 전투 기회를 모두 사용했습니다. (${BATTLES_PER_DAY}회/일)`, state: buildState(user), quickReplies: [], battle: null };
    }
    const opponent = battleSystem.findOpponent(users, userId, user.characterType);
    if (!opponent) {
      return { replyText: '전투할 상대가 없습니다. (다른 직업 유저 필요)', state: buildState(user), quickReplies: [], battle: null };
    }
    const def = opponent.user;
    const outcome = battleSystem.resolveBattle(user, def, user.characterType, def.characterType, userId, opponent.id);
    user.battlesToday = battlesDone + 1;
    let goldChange = 0;
    let energyChange = 0;
    if (outcome.result === 'win') {
      goldChange = Math.floor((def.gold || 0) * 0.1);
      user.gold = (user.gold || 0) + goldChange;
      def.gold = Math.max(0, (def.gold || 0) - goldChange);
    } else if (outcome.result === 'lose') {
      goldChange = -Math.floor((user.gold || 0) * 0.1);
      user.gold = Math.max(0, (user.gold || 0) + goldChange);
      def.gold = (def.gold || 0) + (-goldChange);
    } else {
      energyChange = -10;
      user.energy = Math.max(0, (user.energy || 0) + energyChange);
    }
    const entry = { result: outcome.result, reason: outcome.reason, vs: def.characterName, vsJob: def.characterType, goldChange, energyChange, at: Date.now() };
    (user.battleHistory || []).unshift(entry);
    if (user.battleHistory.length > 50) user.battleHistory.pop();
    return {
      replyText: '',
      state: buildState(user),
      battle: { ...entry, opponentName: def.characterName, opponentJob: def.characterType },
      quickReplies: []
    };
  }

  // 전투능력 강화: 1~10 강화석, 11~20 고급강화석만 (최대 20)
  if (cmd === '전투능력강화' || cmd === 'enhanceCombat') {
    const cur = user.combatPower || 1;
    if (cur >= COMBAT_POWER_MAX) {
      return { replyText: '전투능력이 이미 최대(20)입니다.', state: buildState(user), quickReplies: [], combatEnhance: null };
    }
    const needAdvanced = cur >= 11;
    if (needAdvanced) {
      const advStones = user.inventory['advanced_enhancement_stone'] || 0;
      if (advStones < 1) {
        return { replyText: '11단계부터는 고급강화석이 필요합니다. (강화석 1 + 레어/유니크 아이템 5개 → 고급강화석 조합)', state: buildState(user), quickReplies: [], combatEnhance: null };
      }
      addToInv(user.inventory, 'advanced_enhancement_stone', -1);
      if (!user.inventory['advanced_enhancement_stone']) delete user.inventory['advanced_enhancement_stone'];
    } else {
      const stones = user.inventory['enhancement_stone'] || 0;
      if (stones < 1) {
        return { replyText: '강화석이 없습니다. (강화석 조각 10개 → 강화석 조합)', state: buildState(user), quickReplies: [], combatEnhance: null };
      }
      addToInv(user.inventory, 'enhancement_stone', -1);
      if (!user.inventory['enhancement_stone']) delete user.inventory['enhancement_stone'];
    }
    const prob = getEnhanceProb(cur);
    const success = Math.random() < prob;
    if (success) {
      user.combatPower = cur + 1;
      return { replyText: `전투능력 강화 성공! ${cur} → ${user.combatPower}단계`, state: buildState(user), combatEnhance: { success: true, from: cur, to: user.combatPower }, quickReplies: [] };
    }
    return { replyText: `강화 실패... (${cur}단계 유지, 성공확률 ${(prob * 100).toFixed(2)}%)`, state: buildState(user), combatEnhance: { success: false, from: cur }, quickReplies: [] };
  }

  // 고급강화석 조합: 강화석 1 + 레어/유니크 아이템 5개
  if (cmd === '고급강화석조합' || cmd === 'craftAdvancedEnhancementStone') {
    const stone = user.inventory['enhancement_stone'] || 0;
    if (stone < 1) return { replyText: '강화석 1개가 필요합니다.', state: buildState(user), quickReplies: [] };
    const rareTotal = RARE_ITEM_IDS.reduce((s, id) => s + (user.inventory[id] || 0), 0);
    if (rareTotal < 5) return { replyText: `레어/유니크 아이템 5개 필요 (보유 ${rareTotal}개)`, state: buildState(user), quickReplies: [] };
    addToInv(user.inventory, 'enhancement_stone', -1);
    if (!user.inventory['enhancement_stone']) delete user.inventory['enhancement_stone'];
    let left = 5;
    for (const id of RARE_ITEM_IDS) {
      if (left <= 0) break;
      const have = user.inventory[id] || 0;
      const take = Math.min(have, left);
      if (take > 0) {
        addToInv(user.inventory, id, -take);
        if (!user.inventory[id]) delete user.inventory[id];
        left -= take;
      }
    }
    addToInv(user.inventory, 'advanced_enhancement_stone', 1);
    return { replyText: '고급강화석 조합 완료!', state: buildState(user), quickReplies: [] };
  }

  // 슈퍼푸드 사용 (에너지 +50)
  if (cmd === '슈퍼푸드사용' || cmd === 'useSuperFood') {
    const have = user.inventory['super_food'] || 0;
    if (have < 1) return { replyText: '슈퍼푸드가 없습니다.', state: buildState(user), quickReplies: [] };
    addToInv(user.inventory, 'super_food', -1);
    if (!user.inventory['super_food']) delete user.inventory['super_food'];
    const gain = CONSUMABLE_ITEMS.super_food.useValue || 50;
    user.energy = Math.min((user.energy || 0) + gain, user.maxEnergy || ENERGY_MAX);
    return { replyText: `슈퍼푸드 사용! 에너지 +${gain}`, state: buildState(user), useSuperFood: { gained: gain }, quickReplies: [] };
  }

  // 크로스 조합: 슈퍼푸드, 이직계약서, 강화석조각
  if (cmd === '크로스조합' || cmd === 'crossCraft') {
    const targetId = (isObject && body.craftTarget) ? String(body.craftTarget) : '';
    const recipe = CROSS_CRAFT_RECIPES[targetId];
    if (!recipe) {
      return { replyText: '조합 대상을 선택하세요. (슈퍼푸드 / 이직계약서 / 강화석조각)', state: buildState(user), quickReplies: [] };
    }
    const rareSum = recipe.rareIds.reduce((s, id) => s + (user.inventory[id] || 0), 0);
    const normalSum = recipe.normalIds.reduce((s, id) => s + (user.inventory[id] || 0), 0);
    if (rareSum < recipe.rareCount || normalSum < recipe.normalCount) {
      return { replyText: `재료 부족. 레어 ${recipe.rareCount}개, 일반 ${recipe.normalCount}개 필요`, state: buildState(user), quickReplies: [] };
    }
    let rLeft = recipe.rareCount;
    let nLeft = recipe.normalCount;
    recipe.rareIds.forEach(id => { const t = Math.min(user.inventory[id] || 0, rLeft); addToInv(user.inventory, id, -t); rLeft -= t; if (!user.inventory[id]) delete user.inventory[id]; });
    recipe.normalIds.forEach(id => { const t = Math.min(user.inventory[id] || 0, nLeft); addToInv(user.inventory, id, -t); nLeft -= t; if (!user.inventory[id]) delete user.inventory[id]; });
    addToInv(user.inventory, targetId, 1);
    const toName = CONSUMABLE_ITEMS[targetId]?.name || ITEMS[targetId]?.name || targetId;
    return { replyText: `${toName} 조합 완료!`, state: buildState(user), craftCross: { to: targetId, toName }, quickReplies: [] };
  }

  // 강화석 조각 10개 → 강화석
  if (cmd === '강화석조합' || cmd === 'craftEnhancementStone') {
    const have = user.inventory['enhancement_stone_fragment'] || 0;
    if (have < 10) return { replyText: `강화석 조각 10개 필요 (보유 ${have}개)`, state: buildState(user), quickReplies: [] };
    addToInv(user.inventory, 'enhancement_stone_fragment', -10);
    if (!user.inventory['enhancement_stone_fragment']) delete user.inventory['enhancement_stone_fragment'];
    addToInv(user.inventory, 'enhancement_stone', 1);
    return { replyText: '강화석 조합 완료!', state: buildState(user), craftEnhancementStone: true, quickReplies: [] };
  }

  // 고급강화석 조합: 강화석 1 + 고급드랍(레어/유니크) 5개
  if (cmd === '고급강화석조합' || cmd === 'craftAdvancedEnhancementStone') {
    const stone = user.inventory['enhancement_stone'] || 0;
    if (stone < 1) return { replyText: '강화석 1개가 필요합니다.', state: buildState(user), quickReplies: [] };
    const rareTotal = RARE_ITEM_IDS.reduce((s, id) => s + (user.inventory[id] || 0), 0);
    if (rareTotal < 5) return { replyText: `고급 드랍(레어/유니크) 5개 필요 (보유 ${rareTotal}개)`, state: buildState(user), quickReplies: [] };
    addToInv(user.inventory, 'enhancement_stone', -1);
    if (!user.inventory['enhancement_stone']) delete user.inventory['enhancement_stone'];
    let left = 5;
    for (const id of RARE_ITEM_IDS) {
      if (left <= 0) break;
      const n = Math.min(user.inventory[id] || 0, left);
      if (n > 0) {
        addToInv(user.inventory, id, -n);
        if (!user.inventory[id]) delete user.inventory[id];
        left -= n;
      }
    }
    addToInv(user.inventory, 'advanced_enhancement_stone', 1);
    return { replyText: '고급강화석 조합 완료!', state: buildState(user), craftAdvancedEnhancementStone: true, quickReplies: [] };
  }

  // 전투 (하루 3회, 다른 직업 유저와 랜덤 매칭)
  if (cmd === '전투' || cmd === 'battle') {
    const battlesDone = user.battlesToday || 0;
    if (battlesDone >= BATTLES_PER_DAY) {
      return { replyText: '오늘 전투 가능 횟수를 모두 사용했습니다.', state: buildState(user), quickReplies: [], battle: null };
    }
    const opponent = battleSystem.findOpponent(users, userId, user.characterType);
    if (!opponent) {
      return { replyText: '매칭 가능한 상대가 없습니다.', state: buildState(user), quickReplies: [], battle: null };
    }
    const battleResult = battleSystem.resolveBattle(user, opponent.user, user.characterType, opponent.user.characterType, userId, opponent.id);
    user.battlesToday = battlesDone + 1;

    const myGold = user.gold || 0;
    const oppGold = opponent.user.gold || 0;
    const stealPct = 0.1;
    let goldChange = 0;
    let energyChange = 0;

    if (battleResult.result === 'win') {
      goldChange = Math.floor(oppGold * stealPct);
      if (goldChange > 0) {
        opponent.user.gold = Math.max(0, oppGold - goldChange);
        user.gold = myGold + goldChange;
      }
    } else if (battleResult.result === 'lose') {
      goldChange = -Math.floor(myGold * stealPct);
      user.gold = Math.max(0, myGold + goldChange);
    } else {
      energyChange = -10;
      user.energy = Math.max(0, (user.energy || 0) + energyChange);
    }

    const record = {
      result: battleResult.result,
      reason: battleResult.reason,
      opponentName: opponent.user.characterName || '???',
      opponentJob: opponent.user.characterType,
      goldChange,
      energyChange,
      at: Date.now()
    };
    (user.battleHistory || []).unshift(record);
    if (user.battleHistory.length > 50) user.battleHistory.pop();

    return {
      replyText: '',
      state: buildState(user),
      quickReplies: [],
      battle: { ...record, opponentJobLabel: JOB_LABELS[opponent.user.characterType] }
    };
  }

  // 전투능력 강화 (강화석 1개 소진, 확률 성공)
  if (cmd === '전투능력강화' || cmd === 'enhanceCombat') {
    const stones = user.inventory['enhancement_stone'] || 0;
    if (stones < 1) {
      return { replyText: '강화석이 없습니다.', state: buildState(user), quickReplies: [], enhanceCombat: null };
    }
    const cp = user.combatPower || 1;
    if (cp >= COMBAT_POWER_MAX) {
      return { replyText: '이미 전투능력 최대입니다.', state: buildState(user), quickReplies: [], enhanceCombat: null };
    }
    addToInv(user.inventory, 'enhancement_stone', -1);
    if (!user.inventory['enhancement_stone']) delete user.inventory['enhancement_stone'];

    const prob = getEnhanceProb(cp);
    const success = Math.random() < prob;
    if (success) {
      user.combatPower = cp + 1;
      return {
        replyText: `전투능력 강화 성공! ${cp} → ${user.combatPower}단계`,
        state: buildState(user),
        quickReplies: [],
        enhanceCombat: { success: true, newLevel: user.combatPower }
      };
    }
    return {
      replyText: '강화 실패... 강화석만 소모되었습니다.',
      state: buildState(user),
      quickReplies: [],
      enhanceCombat: { success: false }
    };
  }

  // 슈퍼푸드 사용 (에너지 +50)
  if (cmd === '슈퍼푸드사용' || cmd === 'useSuperFood') {
    const have = user.inventory['super_food'] || 0;
    if (have < 1) {
      return { replyText: '슈퍼푸드가 없습니다.', state: buildState(user), quickReplies: [] };
    }
    addToInv(user.inventory, 'super_food', -1);
    if (!user.inventory['super_food']) delete user.inventory['super_food'];
    const gain = CONSUMABLE_ITEMS.super_food.useValue || 50;
    user.energy = Math.min((user.energy || 0) + gain, user.maxEnergy || ENERGY_MAX);
    return {
      replyText: `슈퍼푸드 사용! 에너지 +${gain} (현재 ${user.energy}/${user.maxEnergy})`,
      state: buildState(user),
      useSuperFood: { gained: gain, current: user.energy, max: user.maxEnergy },
      quickReplies: []
    };
  }

  // 크로스 직업 조합 (슈퍼푸드/이직계약서/강화석조각)
  if (cmd === '크로스조합' || cmd === 'craftCross') {
    const targetId = (isObject && body.craftTarget) ? String(body.craftTarget) : '';
    const recipe = CROSS_CRAFT_RECIPES[targetId];
    if (!recipe) {
      return {
        replyText: '조합할 아이템을 선택하세요. (슈퍼푸드/이직계약서/강화석조각)',
        state: buildState(user),
        quickReplies: []
      };
    }
    const rareTotal = recipe.rareIds.reduce((s, id) => s + (user.inventory[id] || 0), 0);
    const normalTotal = recipe.normalIds.reduce((s, id) => s + (user.inventory[id] || 0), 0);
    if (rareTotal < recipe.rareCount || normalTotal < recipe.normalCount) {
      return {
        replyText: `조합 실패. 레어 ${recipe.rareCount}개 + 일반 ${recipe.normalCount}개 필요 (레어 ${rareTotal}, 일반 ${normalTotal})`,
        state: buildState(user),
        quickReplies: []
      };
    }
    for (const id of recipe.rareIds) {
      const need = Math.min(user.inventory[id] || 0, recipe.rareCount);
      if (need > 0) {
        addToInv(user.inventory, id, -need);
        if (!user.inventory[id]) delete user.inventory[id];
        recipe.rareCount -= need;
      }
      if (recipe.rareCount <= 0) break;
    }
    for (const id of recipe.normalIds) {
      const need = Math.min(user.inventory[id] || 0, recipe.normalCount);
      if (need > 0) {
        addToInv(user.inventory, id, -need);
        if (!user.inventory[id]) delete user.inventory[id];
        recipe.normalCount -= need;
      }
      if (recipe.normalCount <= 0) break;
    }
    addToInv(user.inventory, targetId, 1);
    const toName = CONSUMABLE_ITEMS[targetId]?.name || targetId;
    return {
      replyText: `${toName} 1개 조합 완료!`,
      state: buildState(user),
      craftCross: { targetId, toName },
      quickReplies: []
    };
  }

  // 강화석 조각 10개 → 강화석
  if (cmd === '강화석조합' || cmd === 'craftEnhancementStone') {
    const frags = user.inventory['enhancement_stone_fragment'] || 0;
    if (frags < 10) {
      return {
        replyText: `강화석 조각 10개 필요 (보유 ${frags}개)`,
        state: buildState(user),
        quickReplies: []
      };
    }
    addToInv(user.inventory, 'enhancement_stone_fragment', -10);
    if (!user.inventory['enhancement_stone_fragment']) delete user.inventory['enhancement_stone_fragment'];
    addToInv(user.inventory, 'enhancement_stone', 1);
    return {
      replyText: '강화석 조각 10개 → 강화석 1개 조합 완료!',
      state: buildState(user),
      craftEnhancementStone: true,
      quickReplies: []
    };
  }

  // 전투 (하루 3회, 다른 직업 유저와 랜덤 매칭)
  if (cmd === '전투' || cmd === 'battle') {
    const used = user.battlesToday || 0;
    if (used >= BATTLES_PER_DAY) {
      return { replyText: `오늘 전투 기회를 모두 사용했습니다. (${BATTLES_PER_DAY}회/일)`, state: buildState(user), quickReplies: [] };
    }
    const opp = battleSystem.findOpponent(users, userId, user.characterType);
    if (!opp) {
      return { replyText: '전투할 상대를 찾을 수 없습니다. (다른 직업 유저가 없음)', state: buildState(user), quickReplies: [], battle: null };
    }
    const defender = opp.user;
    const battleResult = battleSystem.resolveBattle(user, defender, user.characterType, defender.characterType, userId, opp.id);
    user.battlesToday = used + 1;
    const historyEntry = {
      opponentName: defender.characterName,
      opponentJob: defender.characterType,
      result: battleResult.result,
      reason: battleResult.reason,
      goldChange: 0,
      energyChange: 0,
      at: Date.now()
    };
    if (battleResult.result === 'win') {
      const gain = Math.floor((defender.gold || 0) * 0.1);
      if (gain > 0) {
        defender.gold = Math.max(0, (defender.gold || 0) - gain);
        user.gold = (user.gold || 0) + gain;
        historyEntry.goldChange = gain;
      }
    } else if (battleResult.result === 'lose') {
      const loss = Math.floor((user.gold || 0) * 0.1);
      if (loss > 0) {
        user.gold = Math.max(0, (user.gold || 0) - loss);
        defender.gold = (defender.gold || 0) + loss;
        historyEntry.goldChange = -loss;
      }
    } else {
      user.energy = Math.max(0, (user.energy || 0) - 10);
      historyEntry.energyChange = -10;
    }
    (user.battleHistory = user.battleHistory || []).unshift(historyEntry);
    if (user.battleHistory.length > 50) user.battleHistory.pop();
    return {
      replyText: '',
      state: buildState(user),
      quickReplies: [],
      battle: {
        result: battleResult.result,
        reason: battleResult.reason,
        opponentName: defender.characterName,
        opponentJob: defender.characterType,
        goldChange: historyEntry.goldChange,
        energyChange: historyEntry.energyChange
      }
    };
  }

  // 전투능력 강화 (강화석 1개 소모, 확률성)
  if (cmd === '전투능력강화' || cmd === 'enhanceCombat') {
    const cur = user.combatPower || 1;
    if (cur >= COMBAT_POWER_MAX) {
      return { replyText: '전투능력이 이미 최대(20)입니다.', state: buildState(user), quickReplies: [], enhanceCombat: null };
    }
    const stones = user.inventory['enhancement_stone'] || 0;
    if (stones < 1) {
      return { replyText: '강화석이 없습니다. (강화석 조각 10개 조합 → 강화석)', state: buildState(user), quickReplies: [], enhanceCombat: null };
    }
    user.inventory['enhancement_stone'] = stones - 1;
    if (!user.inventory['enhancement_stone']) delete user.inventory['enhancement_stone'];
    const prob = getEnhanceProb(cur);
    const success = Math.random() < prob;
    if (success) {
      user.combatPower = cur + 1;
      return {
        replyText: `전투능력 강화 성공! ${cur} → ${cur + 1}단계`,
        state: buildState(user),
        quickReplies: [],
        enhanceCombat: { success: true, from: cur, to: cur + 1 }
      };
    }
    return {
      replyText: `강화 실패... (${cur}단계 유지, 성공확률 ${(prob * 100).toFixed(1)}%)`,
      state: buildState(user),
      quickReplies: [],
      enhanceCombat: { success: false, from: cur, to: cur }
    };
  }

  // 슈퍼푸드 사용 (에너지 +50)
  if (cmd === '슈퍼푸드사용' || cmd === 'useSuperFood') {
    const have = user.inventory['super_food'] || 0;
    if (have < 1) {
      return { replyText: '슈퍼푸드가 없습니다.', state: buildState(user), quickReplies: [] };
    }
    addToInv(user.inventory, 'super_food', -1);
    if (!user.inventory['super_food']) delete user.inventory['super_food'];
    const gain = 50;
    user.energy = Math.min((user.energy || 0) + gain, user.maxEnergy || ENERGY_MAX);
    return {
      replyText: `슈퍼푸드 사용! 에너지 +${gain} (현재 ${user.energy}/${user.maxEnergy})`,
      state: buildState(user),
      useSuperFood: { gained: gain, current: user.energy, max: user.maxEnergy },
      quickReplies: []
    };
  }

  // 크로스 조합: 슈퍼푸드, 이직계약서, 강화석조각
  if (cmd === '크로스조합' || cmd === 'crossCraft') {
    const targetId = (isObject && body.craftTarget) ? String(body.craftTarget) : '';
    const recipe = CROSS_CRAFT_RECIPES[targetId];
    if (!recipe) {
      return {
        replyText: '조합할 아이템을 선택하세요. (super_food / job_contract / enhancement_stone_fragment)',
        state: buildState(user),
        quickReplies: []
      };
    }
    const rareSum = recipe.rareIds.reduce((s, id) => s + (user.inventory[id] || 0), 0);
    const normalSum = recipe.normalIds.reduce((s, id) => s + (user.inventory[id] || 0), 0);
    if (rareSum < recipe.rareCount || normalSum < recipe.normalCount) {
      const toName = CONSUMABLE_ITEMS[targetId]?.name || ITEMS[targetId]?.name || targetId;
      return {
        replyText: `${toName} 조합 실패. 레어 ${recipe.rareCount}개 + 일반 ${recipe.normalCount}개 필요 (보유 레어 ${rareSum}, 일반 ${normalSum})`,
        state: buildState(user),
        quickReplies: []
      };
    }
    let taken = 0;
    for (const id of recipe.rareIds) {
      const n = Math.min(user.inventory[id] || 0, recipe.rareCount - taken);
      if (n > 0) {
        user.inventory[id] = (user.inventory[id] || 0) - n;
        if (!user.inventory[id]) delete user.inventory[id];
        taken += n;
      }
      if (taken >= recipe.rareCount) break;
    }
    taken = 0;
    for (const id of recipe.normalIds) {
      const n = Math.min(user.inventory[id] || 0, recipe.normalCount - taken);
      if (n > 0) {
        user.inventory[id] = (user.inventory[id] || 0) - n;
        if (!user.inventory[id]) delete user.inventory[id];
        taken += n;
      }
      if (taken >= recipe.normalCount) break;
    }
    addToInv(user.inventory, targetId, 1);
    const toName = CONSUMABLE_ITEMS[targetId]?.name || ITEMS[targetId]?.name || targetId;
    return {
      replyText: `크로스 조합 완료! ${toName} 1개 획득`,
      state: buildState(user),
      craftCross: { targetId, toName },
      quickReplies: []
    };
  }

  // 강화석 조각 10개 → 강화석 1개
  if (cmd === '강화석조합' || cmd === 'craftEnhancementStone') {
    const frags = user.inventory['enhancement_stone_fragment'] || 0;
    if (frags < 10) {
      return {
        replyText: `강화석 조각이 부족합니다. (10개 필요, 보유 ${frags}개)`,
        state: buildState(user),
        quickReplies: []
      };
    }
    user.inventory['enhancement_stone_fragment'] = frags - 10;
    if (!user.inventory['enhancement_stone_fragment']) delete user.inventory['enhancement_stone_fragment'];
    addToInv(user.inventory, 'enhancement_stone', 1);
    return {
      replyText: '강화석 조각 10개 → 강화석 1개 조합 완료!',
      state: buildState(user),
      craftEnhancementStone: { fragmentsUsed: 10 },
      quickReplies: []
    };
  }

  // 전투 (하루 3회, 다른 직업 랜덤 매칭)
  if (cmd === '전투' || cmd === 'battle') {
    const battlesDone = user.battlesToday || 0;
    if (battlesDone >= BATTLES_PER_DAY) {
      return { replyText: '오늘 전투 횟수를 모두 사용했습니다. (3회/일)', state: buildState(user), quickReplies: [], battle: null };
    }
    const opp = battleSystem.findOpponent(users, userId, user.characterType);
    if (!opp) {
      return { replyText: '전투할 상대를 찾을 수 없습니다. (다른 직업 유저 필요)', state: buildState(user), quickReplies: [], battle: null };
    }
    const defender = opp.user;
    const outcome = battleSystem.resolveBattle(user, defender, user.characterType, defender.characterType, userId, opp.id);
    user.battlesToday = battlesDone + 1;
    const myGold = user.gold || 0;
    const oppGold = defender.gold || 0;
    let goldChange = 0;
    let energyChange = 0;
    if (outcome.result === 'win') {
      goldChange = Math.min(Math.floor(oppGold * 0.1), oppGold);
      if (goldChange > 0 && opp.id) {
        const def = users.get(opp.id);
        if (def) def.gold = Math.max(0, (def.gold || 0) - goldChange);
      }
      user.gold = myGold + goldChange;
    } else if (outcome.result === 'lose') {
      goldChange = -Math.min(Math.floor(myGold * 0.1), myGold);
      user.gold = Math.max(0, myGold + goldChange);
      if (goldChange < 0 && opp.id) {
        const def = users.get(opp.id);
        if (def) def.gold = (def.gold || 0) + Math.abs(goldChange);
      }
    } else {
      energyChange = -10;
      user.energy = Math.max(0, (user.energy || 0) + energyChange);
    }
    const record = {
      result: outcome.result,
      vsName: defender.characterName || '???',
      vsJob: JOB_LABELS[defender.characterType] || defender.characterType,
      goldChange,
      energyChange,
      reason: outcome.reason,
      at: Date.now()
    };
    (user.battleHistory || []).unshift(record);
    if (user.battleHistory.length > 50) user.battleHistory.pop();
    return {
      replyText: '',
      state: buildState(user),
      battle: record,
      quickReplies: []
    };
  }

  // 전투능력 강화 (강화석 1개 소모)
  if (cmd === '전투능력강화' || cmd === 'enhanceCombat') {
    const cur = user.combatPower || 1;
    if (cur >= COMBAT_POWER_MAX) {
      return { replyText: '전투능력이 이미 최대(20)입니다.', state: buildState(user), quickReplies: [], enhanceCombat: null };
    }
    const stones = user.inventory['enhancement_stone'] || 0;
    if (stones < 1) {
      return { replyText: '강화석이 없습니다. (강화석 조각 10개 조합)', state: buildState(user), quickReplies: [], enhanceCombat: null };
    }
    const prob = getEnhanceProb(cur);
    const success = Math.random() < prob;
    addToInv(user.inventory, 'enhancement_stone', -1);
    if (!user.inventory['enhancement_stone']) delete user.inventory['enhancement_stone'];
    if (success) {
      user.combatPower = cur + 1;
      return {
        replyText: `전투능력 강화 성공! ${cur} → ${cur + 1}`,
        state: buildState(user),
        enhanceCombat: { success: true, from: cur, to: cur + 1 },
        quickReplies: []
      };
    }
    return {
      replyText: `전투능력 강화 실패! (${cur}단계 유지)`,
      state: buildState(user),
      enhanceCombat: { success: false, level: cur },
      quickReplies: []
    };
  }

  // 슈퍼푸드 사용 (에너지 +50)
  if (cmd === '슈퍼푸드사용' || cmd === 'useSuperFood') {
    const have = user.inventory['super_food'] || 0;
    if (have < 1) {
      return { replyText: '슈퍼푸드가 없습니다.', state: buildState(user), quickReplies: [] };
    }
    addToInv(user.inventory, 'super_food', -1);
    if (!user.inventory['super_food']) delete user.inventory['super_food'];
    const gain = CONSUMABLE_ITEMS.super_food.useValue || 50;
    user.energy = Math.min((user.energy || 0) + gain, user.maxEnergy || ENERGY_MAX);
    return {
      replyText: `슈퍼푸드 사용! 에너지 +${gain} (현재 ${user.energy}/${user.maxEnergy})`,
      state: buildState(user),
      useSuperFood: { gained: gain, current: user.energy, max: user.maxEnergy },
      quickReplies: []
    };
  }

  // 크로스 조합: 슈퍼푸드, 이직계약서, 강화석조각
  if (cmd === '크로스조합' || cmd === 'crossCraft') {
    const targetId = (isObject && body.targetId) ? String(body.targetId) : '';
    const recipe = CROSS_CRAFT_RECIPES[targetId];
    if (!recipe) {
      return {
        replyText: '조합할 아이템을 선택하세요. (super_food / job_contract / enhancement_stone_fragment)',
        state: buildState(user),
        quickReplies: []
      };
    }
    const rareCount = recipe.rareIds.reduce((s, id) => s + (user.inventory[id] || 0), 0);
    const normalCount = recipe.normalIds.reduce((s, id) => s + (user.inventory[id] || 0), 0);
    if (rareCount < recipe.rareCount || normalCount < recipe.normalCount) {
      const toName = CONSUMABLE_ITEMS[targetId]?.name || ITEMS[targetId]?.name || targetId;
      return {
        replyText: `${toName} 조합 실패. 레어 ${recipe.rareCount}개 + 일반 ${recipe.normalCount}개 필요 (보유 레어 ${rareCount}, 일반 ${normalCount})`,
        state: buildState(user),
        quickReplies: []
      };
    }
    recipe.rareIds.forEach(id => {
      const n = user.inventory[id] || 0;
      const consume = Math.min(n, recipe.rareCount - recipe.rareIds.slice(0, recipe.rareIds.indexOf(id)).reduce((s, rid) => s + (user.inventory[rid] || 0), 0));
      if (consume > 0) {
        addToInv(user.inventory, id, -recipe.rareCount);
        let consumed = 0;
        for (const rid of recipe.rareIds) {
          const have = user.inventory[rid] || 0;
          const need = recipe.rareCount - consumed;
          if (need <= 0) break;
          const take = Math.min(have, need);
          if (take > 0) {
            user.inventory[rid] = have - take;
            if (!user.inventory[rid]) delete user.inventory[rid];
            consumed += take;
          }
        }
      }
    });
    let rareConsumed = 0;
    for (const id of recipe.rareIds) {
      if (rareConsumed >= recipe.rareCount) break;
      const have = user.inventory[id] || 0;
      const take = Math.min(have, recipe.rareCount - rareConsumed);
      if (take > 0) {
        user.inventory[id] = have - take;
        if (!user.inventory[id]) delete user.inventory[id];
        rareConsumed += take;
      }
    }
    let normalConsumed = 0;
    for (const id of recipe.normalIds) {
      if (normalConsumed >= recipe.normalCount) break;
      const have = user.inventory[id] || 0;
      const take = Math.min(have, recipe.normalCount - normalConsumed);
      if (take > 0) {
        user.inventory[id] = have - take;
        if (!user.inventory[id]) delete user.inventory[id];
        normalConsumed += take;
      }
    }
    addToInv(user.inventory, targetId, 1);
    const toName = CONSUMABLE_ITEMS[targetId]?.name || ITEMS[targetId]?.name || targetId;
    return {
      replyText: `${toName} 조합 완료!`,
      state: buildState(user),
      crossCraft: { targetId, toName },
      quickReplies: []
    };
  }

  // 강화석 조각 10개 → 강화석
  if (cmd === '강화석조합' || cmd === 'craftEnhancementStone') {
    const have = user.inventory['enhancement_stone_fragment'] || 0;
    if (have < 10) {
      return {
        replyText: `강화석 조합 실패. 강화석 조각 10개 필요 (보유 ${have}개)`,
        state: buildState(user),
        quickReplies: []
      };
    }
    addToInv(user.inventory, 'enhancement_stone_fragment', -10);
    if (!user.inventory['enhancement_stone_fragment']) delete user.inventory['enhancement_stone_fragment'];
    addToInv(user.inventory, 'enhancement_stone', 1);
    return {
      replyText: '강화석 조각 10개 → 강화석 1개 조합 완료!',
      state: buildState(user),
      craftEnhancementStone: { from: 10, to: 1 },
      quickReplies: []
    };
  }

  return {
    replyText: '알 수 없는 명령입니다.',
    state: buildState(user),
    quickReplies: []
  };
}

function getState(userId) {
  const user = getOrCreateUser(userId);
  if (!user) return null;
  ensureDailyEnergy(user);
  return user.characterName ? buildState(user) : null;
}

function addGoldToUser(userId, amount) {
  const user = users.get(userId);
  if (user && amount > 0) {
    user.gold = (user.gold || 0) + amount;
    return true;
  }
  return false;
}

function getNickname(userId) {
  const user = users.get(userId);
  return (user && user.characterName) ? user.characterName : '손님';
}

/** 관리자 계정 초기화 (서버 시작 시, 다른 사용자가 admin 사용 불가) */
function initAdminAccount() {
  const ADMIN_PW = process.env.ADMIN_PASSWORD || 'admin123';
  if (users.has(ADMIN_ID)) return;
  const user = {
    id: ADMIN_ID,
    accountId: ADMIN_ID,
    passwordHash: hashPassword(ADMIN_PW),
    characterName: '관리자',
    characterType: 'farmer',
    isAdmin: true,
    level: 1,
    harvestCount: 0,
    fishCount: 0,
    mineCount: 0,
    jobTitleFarmer: 0,
    jobTitleFisherman: 0,
    jobTitleMiner: 0,
    jobTitleMerchant: 0,
    merchantBuyTotal: 0,
    merchantBuyPrice: {},
    gold: 0,
    energy: ENERGY_MAX,
    maxEnergy: ENERGY_MAX,
    lastResetDate: getKSTDateString(),
    combatPower: 1,
    battlesToday: 0,
    battleHistory: [],
    inventory: {}
  };
  users.set(ADMIN_ID, user);
}
initAdminAccount();

module.exports = { handleGameCommand, getState, addGoldToUser, getNickname, users, FISH, JOBS, JOB_LABELS };
