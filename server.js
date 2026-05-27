require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const db = require("./db");
const emailService = require("./emailService");

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "enempro-secret-troque-em-producao";

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── HEALTH CHECK ──────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    status: "✅ ENEMPro Backend online",
    version: "1.0.0",
    users: db.getUserCount(),
    timestamp: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────────────────────────────
//  WEBHOOK DA LARANJINHA
//  Configure na Laranjinha: Integrações → Webhook → URL abaixo:
//  https://SEU-DOMINIO-RAILWAY.up.railway.app/webhook/laranjinha
// ─────────────────────────────────────────────────────────────────
app.post("/webhook/laranjinha", async (req, res) => {
  try {
    console.log("📦 Webhook recebido:", JSON.stringify(req.body, null, 2));

    const payload = req.body;

    // ── Verificar se venda foi APROVADA ──
    const status = (
      payload.status ||
      payload.payment_status ||
      payload.order_status ||
      ""
    ).toLowerCase();

    const isApproved = ["approved", "paid", "completed", "active"].includes(status);

    if (!isApproved) {
      console.log(`ℹ️  Evento ignorado — status: "${status}"`);
      return res.status(200).json({ ok: true, message: "Evento ignorado" });
    }

    // ── Extrair dados do comprador ──
    const email =
      payload?.customer?.email ||
      payload?.buyer?.email ||
      payload?.client?.email ||
      payload?.email ||
      payload?.buyer_email;

    const name =
      payload?.customer?.name ||
      payload?.buyer?.name ||
      payload?.client?.name ||
      payload?.name ||
      payload?.buyer_name ||
      "Aluno";

    const productId =
      payload?.product?.id ||
      payload?.product_id ||
      payload?.offer_id ||
      payload?.plan_id ||
      "";

    const amount =
      payload?.amount ||
      payload?.price ||
      payload?.total ||
      null;

    if (!email) {
      console.error("❌ E-mail não encontrado no payload");
      return res.status(400).json({ error: "E-mail não encontrado no webhook" });
    }

    // ── Determinar plano comprado pelo ID do produto ──
    const productStr = String(productId).toLowerCase();
    let plan = "pro"; // padrão
    if (productStr.includes("elite")) plan = "elite";
    else if (productStr.includes("vitalicio") || productStr.includes("lifetime") || productStr.includes("vitalício")) plan = "vitalicio";
    else if (Number(amount) >= 200) plan = "vitalicio";
    else if (Number(amount) >= 60) plan = "elite";

    console.log(`🛒 Compra aprovada | Email: ${email} | Plano: ${plan} | Valor: R$${amount}`);

    // ── Verificar se usuário já existe ──
    let user = db.getUserByEmail(email);

    if (user) {
      // Usuário já existe → atualizar plano
      db.updateUserPlan(email, plan);
      user = db.getUserByEmail(email); // recarregar
      await emailService.sendUpgradeEmail(user, plan);
      console.log(`🔄 Plano atualizado para ${plan}: ${email}`);
    } else {
      // Novo usuário → criar conta e mandar credenciais
      const password = generatePassword();
      user = db.createUser({ name: firstName(name), email, password, plan });
      await emailService.sendWelcomeEmail(user, password, plan);
      console.log(`✅ Nova conta criada: ${email} | Plano: ${plan}`);
    }

    // Registrar compra
    db.logPurchase({
      userId: user.id,
      plan,
      laranjinhaId: payload?.id || payload?.transaction_id || null,
      amount: Number(amount) || null,
    });

    res.status(200).json({ ok: true, userId: user.id, plan });
  } catch (err) {
    console.error("❌ Erro no webhook:", err);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// ─────────────────────────────────────────────────────────────────
//  AUTH — LOGIN
// ─────────────────────────────────────────────────────────────────
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "E-mail e senha são obrigatórios" });
  }

  const user = db.getUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: "E-mail ou senha incorretos" });
  }

  const valid = db.checkPassword(user, password);
  if (!valid) {
    return res.status(401).json({ error: "E-mail ou senha incorretos" });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: "30d" }
  );

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      plan: user.plan,
      streak: user.streak,
      score: user.score,
    },
  });
});

// ─────────────────────────────────────────────────────────────────
//  AUTH — REGISTRO MANUAL (caso necessário)
// ─────────────────────────────────────────────────────────────────
app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Nome, e-mail e senha são obrigatórios" });
  }

  if (db.getUserByEmail(email)) {
    return res.status(409).json({ error: "E-mail já cadastrado" });
  }

  const user = db.createUser({ name, email, password, plan: "free" });

  const token = jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: "30d" }
  );

  res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email, plan: user.plan },
  });
});

// ─────────────────────────────────────────────────────────────────
//  AUTH — VERIFICAR TOKEN / PERFIL
// ─────────────────────────────────────────────────────────────────
app.get("/api/me", authMiddleware, (req, res) => {
  const user = db.getUserById(req.userId);
  if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    plan: user.plan,
    streak: user.streak,
    score: user.score,
  });
});

// ─────────────────────────────────────────────────────────────────
//  AUTH — TROCAR SENHA
// ─────────────────────────────────────────────────────────────────
app.post("/api/change-password", authMiddleware, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = db.getUserById(req.userId);

  if (!db.checkPassword(user, currentPassword)) {
    return res.status(401).json({ error: "Senha atual incorreta" });
  }

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: "Nova senha deve ter pelo menos 6 caracteres" });
  }

  db.updatePassword(user.email, newPassword);
  res.json({ ok: true, message: "Senha atualizada com sucesso" });
});

// ─────────────────────────────────────────────────────────────────
//  MIDDLEWARE DE AUTENTICAÇÃO
// ─────────────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token não fornecido" });
  }

  try {
    const decoded = jwt.verify(auth.replace("Bearer ", ""), JWT_SECRET);
    req.userId = decoded.id;
    req.userEmail = decoded.email;
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
}

// ─────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────
function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let pass = "";
  for (let i = 0; i < 8; i++) pass += chars[Math.floor(Math.random() * chars.length)];
  return pass;
}

function firstName(fullName) {
  return fullName.trim().split(" ")[0];
}

// ─────────────────────────────────────────────────────────────────
//  START
// ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 ENEMPro Backend rodando na porta ${PORT}`);
  console.log(`📌 Webhook URL: http://localhost:${PORT}/webhook/laranjinha`);
  console.log(`📌 Login URL:   http://localhost:${PORT}/api/login\n`);
});
