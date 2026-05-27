const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const path = require("path");

const db = new Database(path.join(__dirname, "enempro.db"));

// ── CRIAR TABELAS ─────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT    NOT NULL,
    email        TEXT    UNIQUE NOT NULL,
    password_hash TEXT   NOT NULL,
    plan         TEXT    DEFAULT 'pro',
    streak       INTEGER DEFAULT 0,
    score        INTEGER DEFAULT 0,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS purchases (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL,
    plan          TEXT    NOT NULL,
    laranjinha_id TEXT,
    amount        REAL,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

module.exports = {
  // ── USUÁRIOS ────────────────────────────────────────────────────
  createUser({ name, email, password, plan = "pro" }) {
    const hash = bcrypt.hashSync(password, 10);
    const stmt = db.prepare(
      "INSERT INTO users (name, email, password_hash, plan) VALUES (?, ?, ?, ?)"
    );
    const result = stmt.run(name.trim(), email.toLowerCase().trim(), hash, plan);
    return this.getUserById(result.lastInsertRowid);
  },

  getUserByEmail(email) {
    return db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(email.toLowerCase().trim());
  },

  getUserById(id) {
    return db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  },

  updateUserPlan(email, plan) {
    db.prepare(
      "UPDATE users SET plan = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?"
    ).run(plan, email.toLowerCase().trim());
  },

  updatePassword(email, newPassword) {
    const hash = bcrypt.hashSync(newPassword, 10);
    db.prepare(
      "UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?"
    ).run(hash, email.toLowerCase().trim());
  },

  checkPassword(user, password) {
    return bcrypt.compareSync(password, user.password_hash);
  },

  // ── COMPRAS ─────────────────────────────────────────────────────
  logPurchase({ userId, plan, laranjinhaId, amount }) {
    db.prepare(
      "INSERT INTO purchases (user_id, plan, laranjinha_id, amount) VALUES (?, ?, ?, ?)"
    ).run(userId, plan, laranhinhaId || null, amount || null);
  },

  getUserCount() {
    return db.prepare("SELECT COUNT(*) as total FROM users").get().total;
  },
};
