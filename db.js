const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const DB_PATH = path.join(__dirname, "enempro.json");

function loadDb() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ users: [], purchases: [] }));
  }
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

function saveDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

module.exports = {
  createUser({ name, email, password, plan = "pro" }) {
    const data = loadDb();
    const hash = bcrypt.hashSync(password, 10);
    const user = {
      id: Date.now(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password_hash: hash,
      plan,
      streak: 0,
      score: 0,
      created_at: new Date().toISOString(),
    };
    data.users.push(user);
    saveDb(data);
    return user;
  },

  getUserByEmail(email) {
    const data = loadDb();
    return data.users.find(u => u.email === email.toLowerCase().trim()) || null;
  },

  getUserById(id) {
    const data = loadDb();
    return data.users.find(u => u.id === id) || null;
  },

  updateUserPlan(email, plan) {
    const data = loadDb();
    const user = data.users.find(u => u.email === email.toLowerCase().trim());
    if (user) user.plan = plan;
    saveDb(data);
  },

  updatePassword(email, newPassword) {
    const data = loadDb();
    const user = data.users.find(u => u.email === email.toLowerCase().trim());
    if (user) user.password_hash = bcrypt.hashSync(newPassword, 10);
    saveDb(data);
  },

  checkPassword(user, password) {
    return bcrypt.compareSync(password, user.password_hash);
  },

  logPurchase({ userId, plan, laranjinhaId, amount }) {
    const data = loadDb();
    data.purchases.push({
      id: Date.now(),
      user_id: userId,
      plan,
      laranjinha_id: laranjinhaId,
      amount,
      created_at: new Date().toISOString(),
    });
    saveDb(data);
  },

  getUserCount() {
    const data = loadDb();
    return data.users.length;
  },
};
