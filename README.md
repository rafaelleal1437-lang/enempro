# ENEMPro Backend — Guia de Deploy no Railway

## O que esse backend faz

Quando alguém compra na Laranjinha:
1. Laranjinha envia um "aviso" (webhook) para este servidor
2. O servidor cria a conta do aluno automaticamente
3. Gera uma senha segura
4. Manda o e-mail de boas-vindas com login e senha
5. O aluno já pode entrar no site

---

## PASSO 1 — Preparar o Gmail

Você precisa de uma **Senha de App** do Google (não é a senha normal).

1. Acesse: https://myaccount.google.com/security
2. Ative a **Verificação em duas etapas** (se ainda não tiver)
3. Volte em Segurança → procure **"Senhas de app"**
4. Crie uma senha para "E-mail" → copie os 16 caracteres gerados
5. Guarde — vai usar no próximo passo

---

## PASSO 2 — Subir no Railway (gratuito)

### 2.1 — Criar conta
1. Acesse https://railway.app
2. Clique em **"Start a New Project"**
3. Faça login com GitHub (crie uma conta no GitHub se não tiver)

### 2.2 — Subir os arquivos
**Opção A — Via GitHub (recomendado):**
1. Crie um repositório no GitHub e envie estes arquivos
2. No Railway, clique **"Deploy from GitHub repo"**
3. Selecione o repositório

**Opção B — Via upload direto:**
1. No Railway, clique **"New Project → Empty Project"**
2. Instale o Railway CLI: `npm install -g @railway/cli`
3. Na pasta do backend, rode:
   ```bash
   railway login
   railway init
   railway up
   ```

### 2.3 — Configurar as variáveis de ambiente
No Railway, vá em seu projeto → **Variables** → adicione:

| Variável | Valor |
|----------|-------|
| `JWT_SECRET` | Uma frase longa e aleatória |
| `EMAIL_USER` | seuemail@gmail.com |
| `EMAIL_PASS` | A senha de app do Gmail (16 caracteres) |
| `SITE_URL` | https://seusite.com.br |

### 2.4 — Pegar a URL do servidor
Após o deploy, o Railway gera uma URL assim:
```
https://enempro-backend-production.up.railway.app
```
**Anote essa URL — você vai precisar dela.**

---

## PASSO 3 — Configurar o Webhook na Laranjinha

1. No painel da Laranjinha, vá em **Integrações → Webhook**
2. Coloque a URL do webhook:
   ```
   https://SUA-URL-RAILWAY.up.railway.app/webhook/laranjinha
   ```
3. Salve

**Teste:** Faça uma compra de teste na Laranjinha e verifique:
- O terminal do Railway mostra o log da compra
- O comprador recebe o e-mail com login e senha

---

## PASSO 4 — Testar manualmente

Você pode testar o webhook sem fazer uma compra real.
Use o site https://hoppscotch.io ou o Postman:

**POST** `https://SUA-URL.up.railway.app/webhook/laranjinha`
```json
{
  "status": "approved",
  "customer": {
    "name": "João Teste",
    "email": "joao@teste.com"
  },
  "product_id": "enempro-pro",
  "amount": 39
}
```

Se tudo estiver certo, `joao@teste.com` vai receber o e-mail de boas-vindas.

---

## PASSO 5 — Conectar o site ao backend

No arquivo `enempro.jsx`, troque a função `login`:

```js
// ANTES (mock)
const login = (name, email) => {
  setUser({ name, email, plan:"pro" });
  ...
};

// DEPOIS (real — com o backend)
const API = "https://SUA-URL-RAILWAY.up.railway.app";

const login = async (email, password) => {
  const res = await fetch(`${API}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (data.token) {
    localStorage.setItem("enempro_token", data.token);
    setUser(data.user);
    go("dashboard");
  } else {
    alert(data.error || "Erro ao fazer login");
  }
};
```

---

## Rotas disponíveis

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/` | Status do servidor |
| POST | `/webhook/laranjinha` | Recebe compras da Laranjinha |
| POST | `/api/login` | Login do aluno |
| POST | `/api/register` | Cadastro manual |
| GET | `/api/me` | Dados do usuário logado |
| POST | `/api/change-password` | Trocar senha |

---

## Suporte

Qualquer problema, verifique os logs no Railway:
Projeto → **Deployments → View Logs**
