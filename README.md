# 🔒 SisLacre — Sistema de Controle de Lacres

Sistema web completo para controle de lacres e envelopes, com backend Node.js e banco de dados MariaDB.

---

## 📋 Requisitos

- **Node.js** 18+ → https://nodejs.org
- **MariaDB** 10.6+ → https://mariadb.org
- **npm** (incluído com Node.js)

---

## 🚀 Instalação e execução

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar o banco de dados

O sistema cria o banco automaticamente ao iniciar.  
Por padrão ele usa:
- Host: `localhost`
- Usuário: `root`
- Senha: *(vazia)*
- Banco: `sistema_lacres`
- Porta: `3306`

Para personalizar, use variáveis de ambiente:

```bash
export DB_HOST=localhost
export DB_USER=root
export DB_PASS=suasenha
export DB_NAME=sistema_lacres
export DB_PORT=3306
```

Ou crie um arquivo `.env` e use o pacote `dotenv`.

### 3. Iniciar o servidor

```bash
npm start
```

O servidor estará disponível em:  
👉 **http://localhost:3000**

### 4. Modo desenvolvimento (com auto-reload)

```bash
npm run dev
```

---

## 🗄️ Estrutura do banco de dados

```sql
-- Cidades
CREATE TABLE cidade (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  uf CHAR(2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Usuários
CREATE TABLE usuario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  login VARCHAR(50) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL,
  tipo ENUM('admin','operador') DEFAULT 'operador',
  cidade_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cidade_id) REFERENCES cidade(id) ON DELETE SET NULL
);

-- Lacres
CREATE TABLE lacre (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero INT NOT NULL,
  cidade_id INT NOT NULL,
  status ENUM('pendente','usado') DEFAULT 'pendente',
  data_uso DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cidade_id) REFERENCES cidade(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_lacre (numero, cidade_id)
);

-- Envelopes
CREATE TABLE envelope (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo_barras VARCHAR(100) NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  valor_conferido DECIMAL(10,2) NULL,
  lacre_id INT NOT NULL,
  cidade_id INT NOT NULL,
  status ENUM('pendente','conferido') DEFAULT 'pendente',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lacre_id) REFERENCES lacre(id),
  FOREIGN KEY (cidade_id) REFERENCES cidade(id)
);
```

> As tabelas são criadas **automaticamente** pelo servidor ao iniciar.

---

## 📁 Estrutura de arquivos

```
sistema-lacres/
├── server.js          # Backend (Express + MariaDB)
├── package.json       # Dependências Node.js
├── public/
│   └── index.html     # Frontend SPA (HTML/CSS/JS puro)
└── README.md
```

---

## 🔌 API REST

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/cidades` | Listar cidades |
| POST | `/api/cidades` | Cadastrar cidade |
| DELETE | `/api/cidades/:id` | Excluir cidade |
| GET | `/api/usuarios` | Listar usuários |
| POST | `/api/usuarios` | Cadastrar usuário |
| DELETE | `/api/usuarios/:id` | Excluir usuário |
| GET | `/api/lacres` | Listar lacres (filtro: `?cidade_id=`) |
| GET | `/api/lacres/pendentes` | Lacres pendentes (filtro: `?cidade_id=`) |
| GET | `/api/lacres/faixas` | Faixas consolidadas por cidade |
| POST | `/api/lacres` | Cadastrar faixa de lacres |
| GET | `/api/envelopes` | Listar envelopes (filtro: `?cidade_id=`) |
| POST | `/api/envelopes` | Lançar envelope |
| GET | `/api/conferencia` | Listar para conferência (filtro: `?cidade_id=`) |
| PUT | `/api/conferencia/:id` | Confirmar conferência |
| GET | `/api/conferencia/:id/imprimir` | Dados para impressão |

---

## 🖥️ Telas do sistema

1. **Início** — Menu visual com acesso a todas as telas
2. **Usuários** — Cadastro com cidade, tipo e listagem
3. **Cidades** — Cadastro de cidades por UF
4. **Lacres** — Faixas numéricas por cidade
5. **Controle de Lacres** — Status pendente/usado com totalizadores
6. **Lançamento de Envelope** — Associar envelope + código de barras + valor ao lacre
7. **Conferência** — Conferir valores e imprimir comprovante

---

## 🔐 Segurança

- Senhas armazenadas com hash **bcrypt** (salt 10)
- Lacre bloqueado automaticamente ao ser usado (transação SQL)
- Validações no backend para todos os campos obrigatórios
