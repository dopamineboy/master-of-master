/**
 * MongoDB 연결 및 User 모델
 * MONGODB_URI 환경변수가 없으면 사용하지 않음
 */
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  accountId: String,
  passwordHash: { type: String, required: true },
  characterName: String,
  characterType: String,
  level: Number,
  harvestCount: Number,
  fishCount: Number,
  mineCount: Number,
  jobTitleFarmer: Number,
  jobTitleFisherman: Number,
  jobTitleMiner: Number,
  jobTitleMerchant: Number,
  merchantBuyTotal: Number,
  merchantBuyPrice: mongoose.Schema.Types.Mixed,
  gold: Number,
  energy: Number,
  maxEnergy: Number,
  lastResetDate: String,
  combatPower: Number,
  battlesToday: Number,
  battleHistory: Array,
  inventory: mongoose.Schema.Types.Mixed,
  merchantConsecutiveHigh: Number,
  lottoBoxBoughtToday: Number,
  narakBoxBoughtToday: Number
}, { collection: 'users', strict: false });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function connect() {
  const uri = process.env.MONGODB_URI;
  if (!uri || !uri.includes('mongodb')) {
    return false;
  }
  try {
    await mongoose.connect(uri);
    console.log('MongoDB 연결됨:', mongoose.connection.db?.databaseName || 'growth_game');
    return true;
  } catch (e) {
    console.warn('MongoDB 연결 실패:', e.message);
    return false;
  }
}

async function loadAllUsers() {
  if (mongoose.connection.readyState !== 1) return [];
  try {
    const docs = await User.find({ id: { $ne: 'admin' } }).lean();
    return docs;
  } catch (e) {
    console.warn('MongoDB users 로드 실패:', e.message);
    return [];
  }
}

async function saveUser(user) {
  if (mongoose.connection.readyState !== 1 || !user || user.id === 'admin') return;
  try {
    await User.findOneAndUpdate(
      { id: user.id },
      { $set: user },
      { upsert: true }
    );
  } catch (e) {
    console.warn('MongoDB user 저장 실패:', e.message);
  }
}

async function saveAllUsers(usersMap) {
  if (mongoose.connection.readyState !== 1) return;
  try {
    const list = Array.from(usersMap.entries())
      .filter(([id]) => id !== 'admin')
      .map(([, u]) => u);
    for (const u of list) {
      await User.findOneAndUpdate(
        { id: u.id },
        { $set: u },
        { upsert: true }
      );
    }
  } catch (e) {
    console.warn('MongoDB users 일괄 저장 실패:', e.message);
  }
}

module.exports = { connect, User, loadAllUsers, saveUser, saveAllUsers };
