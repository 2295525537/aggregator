const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: '10mb' }));

// 兼容前端 api.php 路径（虚拟主机 PHP 后端），本地 Node.js 环境自动转写到 /api/
// 必须在 express.static 之前，否则 api.php 会被当作静态文件返回源码
app.use((req, res, next) => {
  if (req.path === '/api.php') {
    const p = req.query.path || '';
    const token = req.query.token || '';
    req.url = '/api/' + p;
    req.query = token ? { token } : {};
  } else if (req.path.startsWith('/api.php/')) {
    req.url = req.url.replace('/api.php', '/api');
  }
  next();
});

// 根路径映射到 index.php（Express 默认只认 index.html）
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.php')));

// 静态资源：优先从根目录（PHP 虚拟主机结构），再从 public/（Node.js 结构）
app.use(express.static(path.join(__dirname)));
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Data persistence ----------
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const defaultDB = { students: [], teacherPassword: '7405211' };

function loadDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultDB, null, 2));
      return { ...defaultDB };
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return { ...defaultDB };
  }
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// ---------- Vocabulary (Unit 3) ----------
const WORDS = [
  { word: 'head', meaning: '头', type: 'noun', category: 'body' },
  { word: 'eye', meaning: '眼睛', type: 'noun', category: 'body' },
  { word: 'ear', meaning: '耳朵', type: 'noun', category: 'body' },
  { word: 'mouth', meaning: '嘴巴', type: 'noun', category: 'body' },
  { word: 'hair', meaning: '头发', type: 'noun', category: 'body' },
  { word: 'nose', meaning: '鼻子', type: 'noun', category: 'body' },
  { word: 'face', meaning: '脸', type: 'noun', category: 'body' },
  { word: 'haircut', meaning: '理发；发型', type: 'noun', category: 'appearance' },
  { word: 'long', meaning: '长的', type: 'adj', category: 'appearance' },
  { word: 'short', meaning: '短的；个子矮的', type: 'adj', category: 'appearance' },
  { word: 'sit', meaning: '坐', type: 'verb', category: 'action' },
  { word: 'see', meaning: '看见', type: 'verb', category: 'action' },
  { word: 'like', meaning: '喜欢', type: 'verb', category: 'action' },
  { word: 'have', meaning: '有', type: 'verb', category: 'action' },
  { word: 'chair', meaning: '椅子', type: 'noun', category: 'object' },
  { word: 'mum', meaning: '妈妈', type: 'noun', category: 'people' },
  { word: 'please', meaning: '请', type: 'adv', category: 'function' },
  { word: 'but', meaning: '但是', type: 'conj', category: 'function' },
  { word: 'on', meaning: '在……上', type: 'prep', category: 'function' },
  { word: 'your', meaning: '你的；你们的', type: 'pron', category: 'function' },
  { word: 'you', meaning: '你；你们', type: 'pron', category: 'function' },
  { word: 'a', meaning: '一；一个', type: 'art', category: 'function' }
];

// ---------- Helpers ----------
function tierFromRate(rate) {
  if (rate < 0.6) return 'C';
  if (rate <= 0.85) return 'B';
  return 'A';
}

function nowISO() {
  return new Date().toISOString();
}

// ---------- API: Words ----------
app.get('/api/words', (req, res) => {
  res.json({ words: WORDS });
});

// ---------- API: Students ----------
app.post('/api/students', (req, res) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: '请输入姓名' });
  const db = loadDB();
  const student = {
    id: 'stu_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    name: name.trim(),
    tier: null,
    createdAt: nowISO(),
    gameResults: [],
    taskResults: [],
    errorBook: []
  };
  db.students.push(student);
  saveDB(db);
  res.json(student);
});

app.get('/api/students/:id', (req, res) => {
  const db = loadDB();
  const stu = db.students.find(s => s.id === req.params.id);
  if (!stu) return res.status(404).json({ error: '未找到学生' });
  res.json(stu);
});

// Submit game result -> auto tier
app.post('/api/students/:id/game', (req, res) => {
  const { correct, total, wrongWords } = req.body || {};
  if (typeof correct !== 'number' || typeof total !== 'number') {
    return res.status(400).json({ error: '参数错误' });
  }
  const db = loadDB();
  const idx = db.students.findIndex(s => s.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: '未找到学生' });

  const rate = total > 0 ? correct / total : 0;
  const tier = tierFromRate(rate);
  const result = {
    correct, total, rate, tier,
    wrongWords: wrongWords || [],
    date: nowISO()
  };
  db.students[idx].gameResults.push(result);
  db.students[idx].tier = tier;
  // Add wrong words to error book (dedupe)
  const ww = wrongWords || [];
  ww.forEach(w => {
    if (!db.students[idx].errorBook.includes(w)) db.students[idx].errorBook.push(w);
  });
  saveDB(db);
  res.json({ ok: true, tier, rate, student: db.students[idx] });
});

// Submit task result
app.post('/api/students/:id/task', (req, res) => {
  const { taskTier, taskType, correct, total, wrongWords } = req.body || {};
  if (typeof correct !== 'number' || typeof total !== 'number') {
    return res.status(400).json({ error: '参数错误' });
  }
  const db = loadDB();
  const idx = db.students.findIndex(s => s.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: '未找到学生' });

  const result = {
    taskTier, taskType, correct, total,
    rate: total > 0 ? correct / total : 0,
    wrongWords: wrongWords || [],
    date: nowISO()
  };
  db.students[idx].taskResults.push(result);
  // Update error book
  const ww = wrongWords || [];
  ww.forEach(w => {
    if (!db.students[idx].errorBook.includes(w)) db.students[idx].errorBook.push(w);
  });
  saveDB(db);
  res.json({ ok: true, result, errorBook: db.students[idx].errorBook });
});

// Update tier manually (teacher)
app.post('/api/students/:id/tier', (req, res) => {
  const { tier } = req.body || {};
  if (tier !== '' && !['A', 'B', 'C'].includes(tier)) return res.status(400).json({ error: '层级无效' });
  const db = loadDB();
  const idx = db.students.findIndex(s => s.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: '未找到学生' });
  db.students[idx].tier = tier === '' ? null : tier;
  saveDB(db);
  res.json({ ok: true, student: db.students[idx] });
});

// ---------- API: Teacher ----------
app.post('/api/teacher/login', (req, res) => {
  const { password } = req.body || {};
  const db = loadDB();
  if (password === db.teacherPassword) {
    res.json({ ok: true, token: 'teacher_token_' + Date.now() });
  } else {
    res.status(401).json({ error: '密码错误' });
  }
});

// Teacher stats (simple token check, supports header or query param)
app.get('/api/teacher/stats', (req, res) => {
  const token = req.headers.authorization || (req.query.token ? 'Bearer ' + req.query.token : '');
  if (!token || !token.startsWith('Bearer teacher_token_')) {
    return res.status(401).json({ error: '未授权' });
  }
  const db = loadDB();
  const students = db.students;
  const tierCount = { A: 0, B: 0, C: 0, unranked: 0 };
  let totalGames = 0;
  let totalCorrect = 0;
  let totalQuestions = 0;

  students.forEach(s => {
    if (s.tier) tierCount[s.tier] = (tierCount[s.tier] || 0) + 1;
    else tierCount.unranked++;
    s.gameResults.forEach(r => {
      totalGames++;
      totalCorrect += r.correct;
      totalQuestions += r.total;
    });
  });

  const overallRate = totalQuestions > 0 ? totalCorrect / totalQuestions : 0;

  res.json({
    totalStudents: students.length,
    tierCount,
    overallRate,
    totalGames,
    students: students.map(s => {
      const lastGame = s.gameResults[s.gameResults.length - 1];
      return {
        id: s.id,
        name: s.name,
        tier: s.tier,
        createdAt: s.createdAt,
        gameCount: s.gameResults.length,
        taskCount: s.taskResults.length,
        lastGame: lastGame ? { rate: lastGame.rate, tier: lastGame.tier, date: lastGame.date } : null,
        errorBook: s.errorBook,
        gameResults: s.gameResults,
        taskResults: s.taskResults
      };
    })
  });
});

// ---------- Start ----------
app.listen(PORT, () => {
  console.log(`AI 单词游戏服务器运行在 http://localhost:${PORT}`);
});
