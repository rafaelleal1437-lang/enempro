const nodemailer = require("nodemailer");

const PLAN_NAMES = {
  pro: "Pro — R$39/mês",
  elite: "Elite — R$79/mês",
  vitalicio: "Vitalício",
};

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Google App Password (não a senha normal)
  },
});

// ── TEMPLATE BASE ─────────────────────────────────────────────────
function baseTemplate(content) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#F0FDF4;font-family:Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1.5px solid #BBF7D0;box-shadow:0 4px 24px rgba(22,101,52,0.08)">
    <!-- HEADER -->
    <div style="background:linear-gradient(135deg,#14532D 0%,#16A34A 100%);padding:28px 32px;text-align:center">
      <div style="display:inline-block;width:44px;height:44px;background:#fff;border-radius:10px;line-height:44px;font-size:26px;font-weight:900;color:#166534;margin-bottom:10px">E</div>
      <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:3px;font-weight:900">ENEMPRO</h1>
      <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:12px">Sua plataforma de aprovação no ENEM</p>
    </div>
    <!-- CONTENT -->
    <div style="padding:32px">
      ${content}
    </div>
    <!-- FOOTER -->
    <div style="border-top:1px solid #BBF7D0;padding:16px 32px;text-align:center;background:#F0FDF4">
      <p style="color:#9CA3AF;font-size:11px;margin:0">© 2026 ENEMPro · Todos os direitos reservados</p>
      <p style="color:#9CA3AF;font-size:11px;margin:4px 0 0">Dúvidas? Responda este e-mail · <a href="mailto:${process.env.EMAIL_USER}" style="color:#16A34A">${process.env.EMAIL_USER}</a></p>
    </div>
  </div>
</body></html>`;
}

// ── E-MAIL DE BOAS-VINDAS (NOVA CONTA) ───────────────────────────
async function sendWelcomeEmail(user, password, plan) {
  const planName = PLAN_NAMES[plan] || plan;
  const siteUrl = process.env.SITE_URL || "https://seusite.com.br";

  const content = `
    <h2 style="color:#14532D;margin:0 0 6px">Bem-vindo, ${user.name}! 🎉</h2>
    <p style="color:#6B7280;margin:0 0 20px;line-height:1.7">
      Sua conta ENEMPro <strong style="color:#166534">${planName}</strong> foi criada com sucesso.
      Abaixo estão seus dados de acesso — guarde em local seguro.
    </p>

    <!-- CREDENCIAIS -->
    <div style="background:#F0FDF4;border:1.5px solid #86EFAC;border-radius:12px;padding:20px;margin-bottom:20px">
      <p style="margin:0 0 4px;color:#6B7280;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px">Seus dados de acesso</p>
      <table style="width:100%;border-collapse:collapse;margin-top:10px">
        <tr>
          <td style="padding:6px 0;color:#6B7280;font-size:13px;width:80px">E-mail</td>
          <td style="padding:6px 0;color:#111827;font-weight:600;font-size:14px">${user.email}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#6B7280;font-size:13px">Senha</td>
          <td style="padding:6px 0">
            <span style="background:#DCFCE7;border:1px solid #86EFAC;padding:4px 12px;border-radius:6px;font-family:monospace;font-size:15px;color:#14532D;font-weight:700;letter-spacing:2px">${password}</span>
          </td>
        </tr>
      </table>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin:24px 0">
      <a href="${siteUrl}" style="background:#166534;color:#ffffff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:800;font-size:16px;display:inline-block;box-shadow:0 4px 12px rgba(22,101,52,0.3)">
        Acessar Plataforma →
      </a>
    </div>

    <!-- O QUE ESTÁ INCLUSO -->
    <div style="background:#fff;border:1.5px solid #BBF7D0;border-radius:12px;padding:18px;margin-bottom:20px">
      <p style="margin:0 0 12px;color:#14532D;font-weight:700;font-size:13px">✅ O que está incluso no seu plano ${planName}:</p>
      ${getPlanFeatures(plan)}
    </div>

    <!-- AVISO -->
    <div style="background:#FEF3C7;border:1px solid #FCD34D;border-radius:10px;padding:12px 16px">
      <p style="margin:0;color:#92400E;font-size:13px;line-height:1.6">
        💡 <strong>Importante:</strong> Troque sua senha no primeiro acesso em <em>Configurações → Segurança</em>.
        Em caso de dúvidas, responda este e-mail.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"ENEMPro" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `🎉 Sua conta ENEMPro foi criada! — Login e senha aqui`,
    html: baseTemplate(content),
  });

  console.log(`✅ E-mail de boas-vindas enviado para ${user.email}`);
}

// ── E-MAIL DE UPGRADE ─────────────────────────────────────────────
async function sendUpgradeEmail(user, plan) {
  const planName = PLAN_NAMES[plan] || plan;
  const siteUrl = process.env.SITE_URL || "https://seusite.com.br";

  const content = `
    <h2 style="color:#14532D;margin:0 0 6px">Upgrade realizado! ⚡</h2>
    <p style="color:#6B7280;margin:0 0 20px;line-height:1.7">
      Olá, <strong>${user.name}</strong>! Seu plano foi atualizado para
      <strong style="color:#166534">${planName}</strong>. Todos os novos recursos
      já estão disponíveis na sua conta.
    </p>

    <div style="background:#F0FDF4;border:1.5px solid #86EFAC;border-radius:12px;padding:18px;margin-bottom:20px">
      <p style="margin:0 0 12px;color:#14532D;font-weight:700;font-size:13px">🚀 Novos recursos liberados:</p>
      ${getPlanFeatures(plan)}
    </div>

    <div style="text-align:center;margin:24px 0">
      <a href="${siteUrl}" style="background:#166534;color:#ffffff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:800;font-size:16px;display:inline-block">
        Acessar Agora →
      </a>
    </div>
  `;

  await transporter.sendMail({
    from: `"ENEMPro" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `⚡ Seu plano ENEMPro foi atualizado para ${planName}!`,
    html: baseTemplate(content),
  });

  console.log(`✅ E-mail de upgrade enviado para ${user.email}`);
}

// ── HELPER: FEATURES POR PLANO ────────────────────────────────────
function getPlanFeatures(plan) {
  const features = {
    pro: ["Exercícios ilimitados", "2 simulados por mês", "Correção de redação por IA", "Estatísticas detalhadas", "Suporte por e-mail"],
    elite: ["Tudo do Pro", "Simulados ilimitados", "Redação corrigida por professor", "Mentoria semanal ao vivo", "Suporte prioritário 24h", "Grupo exclusivo no WhatsApp"],
    vitalicio: ["Acesso permanente para sempre", "Tudo do Elite incluso", "Todos os ENEMs futuros", "Atualizações de conteúdo vitalícias", "Mentoria ao vivo permanente", "Suporte VIP 24h"],
  };

  const items = features[plan] || features.pro;
  return items
    .map(f => `<p style="margin:0 0 6px;color:#374151;font-size:13px">✓ <strong>${f}</strong></p>`)
    .join("");
}

module.exports = { sendWelcomeEmail, sendUpgradeEmail };
