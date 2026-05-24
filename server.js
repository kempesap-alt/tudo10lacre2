const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── DB CONFIG ─────────────────────────────────────────────────────────────
// Railway injeta automaticamente: MYSQLHOST, MYSQLUSER, MYSQLPASSWORD,
// MYSQLDATABASE, MYSQLPORT quando você adiciona o plugin MySQL.
// Para rodar local, crie um arquivo .env com as variáveis DB_HOST etc.
const dbConfig = {
  host:     process.env.MYSQLHOST     || process.env.DB_HOST     || 'localhost',
  user:     process.env.MYSQLUSER     || process.env.DB_USER     || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASS     || '',
  database: process.env.MYSQLDATABASE || process.env.DB_NAME     || 'sistema_lacres',
  port:     process.env.MYSQLPORT     || process.env.DB_PORT     || 3306,
  ssl: process.env.MYSQLHOST ? { rejectUnauthorized: false } : undefined,
};

let db;
async function getDb() {
  if (!db) {
    db = await mysql.createPool({ ...dbConfig, waitForConnections: true, connectionLimit: 10 });
  }
  return db;
}

// ─── INIT DATABASE ──────────────────────────────────────────────────────────
async function initDb() {
  // No Railway o banco já existe — pula o CREATE DATABASE.
  // Localmente tenta criar caso não exista.
  if (!process.env.MYSQLHOST) {
    try {
      const conn = await mysql.createConnection({
        host: dbConfig.host, user: dbConfig.user,
        password: dbConfig.password, port: dbConfig.port,
      });
      await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
      await conn.end();
    } catch (e) {
      console.warn('Aviso ao criar banco:', e.message);
    }
  }

  const pool = await getDb();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cidade (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nome VARCHAR(100) NOT NULL,
      uf CHAR(2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuario (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nome VARCHAR(100) NOT NULL,
      login VARCHAR(50) NOT NULL UNIQUE,
      senha VARCHAR(255) NOT NULL,
      tipo ENUM('admin','operador') DEFAULT 'operador',
      cidade_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cidade_id) REFERENCES cidade(id) ON DELETE SET NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS lacre (
      id INT AUTO_INCREMENT PRIMARY KEY,
      numero INT NOT NULL,
      cidade_id INT NOT NULL,
      status ENUM('pendente','usado') DEFAULT 'pendente',
      data_uso DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cidade_id) REFERENCES cidade(id) ON DELETE CASCADE,
      UNIQUE KEY uniq_lacre (numero, cidade_id)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS envelope (
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
    )
  `);
  console.log('✅ Banco de dados inicializado.');
}

// ═══════════════════════════════════════════════════════════════════════════
// CIDADE
// ═══════════════════════════════════════════════════════════════════════════
app.get('/api/cidades', async (req, res) => {
  try {
    const pool = await getDb();
    const [rows] = await pool.query('SELECT * FROM cidade ORDER BY nome');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/cidades', async (req, res) => {
  try {
    const { nome, uf } = req.body;
    if (!nome || !uf) return res.status(400).json({ error: 'Nome e UF obrigatórios.' });
    const pool = await getDb();
    const [result] = await pool.query('INSERT INTO cidade (nome, uf) VALUES (?, ?)', [nome.trim(), uf.trim().toUpperCase()]);
    res.json({ id: result.insertId, nome, uf: uf.toUpperCase() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/cidades/:id', async (req, res) => {
  try {
    const pool = await getDb();
    await pool.query('DELETE FROM cidade WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════
// USUÁRIO
// ═══════════════════════════════════════════════════════════════════════════
app.get('/api/usuarios', async (req, res) => {
  try {
    const pool = await getDb();
    const [rows] = await pool.query(`
      SELECT u.id, u.nome, u.login, u.tipo, u.cidade_id, c.nome AS cidade_nome, c.uf
      FROM usuario u LEFT JOIN cidade c ON u.cidade_id = c.id ORDER BY u.nome
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/usuarios', async (req, res) => {
  try {
    const { nome, login, senha, tipo, cidade_id } = req.body;
    if (!nome || !login || !senha) return res.status(400).json({ error: 'Nome, login e senha obrigatórios.' });
    const hash = await bcrypt.hash(senha, 10);
    const pool = await getDb();
    const [result] = await pool.query(
      'INSERT INTO usuario (nome, login, senha, tipo, cidade_id) VALUES (?, ?, ?, ?, ?)',
      [nome.trim(), login.trim(), hash, tipo || 'operador', cidade_id || null]
    );
    res.json({ id: result.insertId });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Login já existe.' });
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/usuarios/:id', async (req, res) => {
  try {
    const pool = await getDb();
    await pool.query('DELETE FROM usuario WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════
// LACRE
// ═══════════════════════════════════════════════════════════════════════════
app.get('/api/lacres', async (req, res) => {
  try {
    const pool = await getDb();
    const where = req.query.cidade_id ? 'WHERE l.cidade_id = ?' : '';
    const params = req.query.cidade_id ? [req.query.cidade_id] : [];
    const [rows] = await pool.query(`
      SELECT l.*, c.nome AS cidade_nome, c.uf FROM lacre l
      JOIN cidade c ON l.cidade_id = c.id ${where} ORDER BY l.numero
    `, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/lacres/pendentes', async (req, res) => {
  try {
    const pool = await getDb();
    const where = req.query.cidade_id ? 'AND l.cidade_id = ?' : '';
    const params = req.query.cidade_id ? [req.query.cidade_id] : [];
    const [rows] = await pool.query(`
      SELECT l.*, c.nome AS cidade_nome FROM lacre l
      JOIN cidade c ON l.cidade_id = c.id
      WHERE l.status = 'pendente' ${where} ORDER BY l.numero
    `, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/lacres', async (req, res) => {
  try {
    const { cidade_id, numero_inicial, numero_final } = req.body;
    if (!cidade_id || !numero_inicial || !numero_final)
      return res.status(400).json({ error: 'Campos obrigatórios.' });
    if (parseInt(numero_inicial) > parseInt(numero_final))
      return res.status(400).json({ error: 'Número inicial deve ser menor ou igual ao final.' });
    if (parseInt(numero_final) - parseInt(numero_inicial) > 10000)
      return res.status(400).json({ error: 'Faixa máxima de 10.000 lacres por vez.' });

    const pool = await getDb();
    const values = [];
    for (let n = parseInt(numero_inicial); n <= parseInt(numero_final); n++) {
      values.push([n, cidade_id, 'pendente']);
    }
    let inserted = 0, skipped = 0;
    for (const v of values) {
      try {
        await pool.query('INSERT INTO lacre (numero, cidade_id, status) VALUES (?, ?, ?)', v);
        inserted++;
      } catch (e) { if (e.code === 'ER_DUP_ENTRY') skipped++; else throw e; }
    }
    res.json({ inserted, skipped });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/lacres/faixas', async (req, res) => {
  try {
    const pool = await getDb();
    const [rows] = await pool.query(`
      SELECT c.nome AS cidade_nome, c.uf, l.cidade_id,
        MIN(l.numero) AS num_inicial, MAX(l.numero) AS num_final,
        COUNT(*) AS total,
        SUM(CASE WHEN l.status='pendente' THEN 1 ELSE 0 END) AS pendentes,
        SUM(CASE WHEN l.status='usado' THEN 1 ELSE 0 END) AS usados
      FROM lacre l JOIN cidade c ON l.cidade_id = c.id
      GROUP BY l.cidade_id ORDER BY c.nome
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════
// ENVELOPE
// ═══════════════════════════════════════════════════════════════════════════
app.get('/api/envelopes', async (req, res) => {
  try {
    const pool = await getDb();
    const where = req.query.cidade_id ? 'WHERE e.cidade_id = ?' : '';
    const params = req.query.cidade_id ? [req.query.cidade_id] : [];
    const [rows] = await pool.query(`
      SELECT e.*, l.numero AS lacre_numero, c.nome AS cidade_nome, c.uf
      FROM envelope e
      JOIN lacre l ON e.lacre_id = l.id
      JOIN cidade c ON e.cidade_id = c.id
      ${where} ORDER BY e.created_at DESC
    `, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/envelopes', async (req, res) => {
  try {
    const { codigo_barras, valor, lacre_id, cidade_id } = req.body;
    if (!codigo_barras || !valor || !lacre_id || !cidade_id)
      return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });

    const pool = await getDb();
    const [[lacre]] = await pool.query('SELECT * FROM lacre WHERE id = ?', [lacre_id]);
    if (!lacre) return res.status(404).json({ error: 'Lacre não encontrado.' });
    if (lacre.status === 'usado') return res.status(400).json({ error: 'Lacre já utilizado!' });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [result] = await conn.query(
        'INSERT INTO envelope (codigo_barras, valor, lacre_id, cidade_id) VALUES (?, ?, ?, ?)',
        [codigo_barras.trim(), parseFloat(valor), lacre_id, cidade_id]
      );
      await conn.query(
        "UPDATE lacre SET status = 'usado', data_uso = NOW() WHERE id = ?",
        [lacre_id]
      );
      await conn.commit();
      res.json({ id: result.insertId });
    } catch (e) { await conn.rollback(); throw e; }
    finally { conn.release(); }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════
// CONFERÊNCIA
// ═══════════════════════════════════════════════════════════════════════════
app.get('/api/conferencia', async (req, res) => {
  try {
    const pool = await getDb();
    const where = req.query.cidade_id ? 'WHERE e.cidade_id = ?' : '';
    const params = req.query.cidade_id ? [req.query.cidade_id] : [];
    const [rows] = await pool.query(`
      SELECT e.id, l.numero AS lacre_numero, e.codigo_barras, e.valor,
        e.valor_conferido, e.status,
        COALESCE(e.valor_conferido, 0) - e.valor AS diferenca,
        c.nome AS cidade_nome, c.uf, e.created_at
      FROM envelope e
      JOIN lacre l ON e.lacre_id = l.id
      JOIN cidade c ON e.cidade_id = c.id
      ${where} ORDER BY l.numero
    `, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/conferencia/:id', async (req, res) => {
  try {
    const { valor_conferido } = req.body;
    if (valor_conferido === undefined) return res.status(400).json({ error: 'Valor conferido obrigatório.' });
    const pool = await getDb();
    await pool.query(
      "UPDATE envelope SET valor_conferido = ?, status = 'conferido' WHERE id = ?",
      [parseFloat(valor_conferido), req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/conferencia/:id/imprimir', async (req, res) => {
  try {
    const pool = await getDb();
    const [[row]] = await pool.query(`
      SELECT e.*, l.numero AS lacre_numero, c.nome AS cidade_nome, c.uf
      FROM envelope e
      JOIN lacre l ON e.lacre_id = l.id
      JOIN cidade c ON e.cidade_id = c.id
      WHERE e.id = ?
    `, [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Envelope não encontrado.' });
    res.json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── SERVE FRONTEND ─────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── START ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
initDb().then(() => {
  app.listen(PORT, () => console.log(`🚀 Servidor rodando em http://localhost:${PORT}`));
}).catch(err => {
  console.error('❌ Erro ao inicializar banco:', err.message);
  process.exit(1);
});
