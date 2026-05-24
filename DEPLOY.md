# 🚀 Deploy no Railway — Sistema de Lacres

## Passo 1 — Criar conta no GitHub
Acesse https://github.com e crie uma conta gratuita (se ainda não tiver).

---

## Passo 2 — Subir o projeto no GitHub

1. Clique em **New repository** (botão verde no GitHub)
2. Nome: `sistema-lacres`
3. Deixe **Public** ou **Private** (Railway aceita os dois)
4. Clique em **Create repository**

Na tela seguinte, o GitHub mostra os comandos. No terminal da sua máquina,
dentro da pasta `sistema-lacres`:

```bash
git init
git add .
git commit -m "primeiro commit"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/sistema-lacres.git
git push -u origin main
```

---

## Passo 3 — Criar conta no Railway
Acesse https://railway.app e clique em **Login with GitHub**.
Autorize o Railway a acessar seus repositórios.

---

## Passo 4 — Criar o projeto no Railway

1. Clique em **New Project**
2. Escolha **Deploy from GitHub repo**
3. Selecione o repositório `sistema-lacres`
4. O Railway detecta automaticamente que é Node.js ✅

---

## Passo 5 — Adicionar o banco MySQL

1. No painel do projeto, clique em **+ New**
2. Escolha **Database → MySQL**
3. O Railway cria o banco e injeta as variáveis automaticamente:
   - `MYSQLHOST`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`, `MYSQLPORT`

O `server.js` já está configurado para ler essas variáveis. ✅

---

## Passo 6 — Configurar a porta

O Railway define a porta via variável `PORT`. O `server.js` já usa:
```js
const PORT = process.env.PORT || 3000;
```
Nenhuma configuração extra necessária. ✅

---

## Passo 7 — Acessar o sistema

1. No painel do Railway, clique no serviço Node.js
2. Clique em **Settings → Networking → Generate Domain**
3. O Railway gera uma URL pública tipo:
   `https://sistema-lacres-production.up.railway.app`

Pronto! 🎉

---

## Variáveis de ambiente (Railway preenche automaticamente)

| Variável | Descrição |
|---|---|
| `MYSQLHOST` | Host do banco |
| `MYSQLUSER` | Usuário |
| `MYSQLPASSWORD` | Senha |
| `MYSQLDATABASE` | Nome do banco |
| `MYSQLPORT` | Porta (3306) |
| `PORT` | Porta do servidor web |

---

## Atualizar o sistema depois

Sempre que fizer mudanças locais, basta:
```bash
git add .
git commit -m "descrição da mudança"
git push
```
O Railway detecta o push e faz o redeploy automaticamente. ✅

---

## Plano gratuito Railway

- 500 horas/mês de execução (suficiente para uso contínuo)
- 1 GB de banco MySQL
- Deploy ilimitado
- URL pública gerada automaticamente
