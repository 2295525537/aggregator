// AI Word Game - Student App
const API_BASE = 'api.php?path=';
let currentStudent = JSON.parse(localStorage.getItem('wordgame_student') || 'null');
let gameState = null;

// ---------- Toast notification ----------
function toast(msg, type = '') {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = 'toast ' + type;
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 2500);
}

// ---------- API helpers ----------
async function api(path, opts = {}) {
  const realPath = path.replace(/^\/api\//, '');
  const url = API_BASE + realPath;
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    const data = await res.json();
    if (data.error) {
      toast(data.error, 'error');
      return null;
    }
    return data;
  } catch (e) {
    toast('网络错误，请检查连接后重试', 'error');
    return null;
  }
}

// ---------- Views ----------
function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  const el = document.getElementById(viewId);
  if (el) el.classList.remove('hidden');
  window.scrollTo(0, 0);
}

function renderHeader() {
  const el = document.getElementById('studentName');
  if (el) el.textContent = currentStudent ? currentStudent.name : '';
}

// ---------- Welcome / Register ----------
async function registerStudent() {
  const input = document.getElementById('nameInput');
  const btn = input.nextElementSibling;
  const name = input.value.trim();
  if (!name) { toast('请输入你的姓名', 'error'); return; }
  btn.classList.add('loading');
  btn.disabled = true;
  const stu = await api('/api/students', { method: 'POST', body: { name } });
  btn.classList.remove('loading');
  btn.disabled = false;
  if (!stu) return;
  currentStudent = stu;
  localStorage.setItem('wordgame_student', JSON.stringify(stu));
  renderHeader();
  showMenu();
}

function showMenu() {
  renderHeader();
  const menuInfo = document.getElementById('menuInfo');
  if (currentStudent.tier) {
    const info = TIER_INFO[currentStudent.tier];
    menuInfo.innerHTML = `
      <div style="text-align:center;padding:20px">
        <div class="tier-badge ${currentStudent.tier}" style="width:64px;height:64px;font-size:28px;margin:0 auto 12px">${currentStudent.tier}</div>
        <h3>${info.name}</h3>
        <p style="color:var(--text-light)">${info.desc}</p>
      </div>`;
  } else {
    menuInfo.innerHTML = `
      <div style="text-align:center;padding:20px">
        <div class="emoji" style="font-size:60px">🎯</div>
        <h3>还没有参与闯关</h3>
        <p style="color:var(--text-light)">先完成单词闯关，AI 将自动为你分层并推送专属任务</p>
      </div>`;
  }
  showView('view-menu');
}

// ---------- Game ----------
function startGame() {
  const questions = generateGame(10);
  gameState = {
    questions,
    current: 0,
    correct: 0,
    wrongWords: [],
    answers: []
  };
  showView('view-game');
  renderQuestion();
}

function quitGame() {
  if (confirm('确定要退出当前闯关吗？进度将不会保存。')) {
    gameState = null;
    showMenu();
  }
}

function renderQuestion() {
  const q = gameState.questions[gameState.current];
  const total = gameState.questions.length;
  const pct = (gameState.current / total) * 100;

  document.getElementById('gameProgress').style.width = pct + '%';
  document.getElementById('gameCounter').textContent = `${gameState.current + 1} / ${total}`;
  document.getElementById('gameType').textContent = q.prompt;

  const box = document.getElementById('questionBox');
  let html = `<div class="question-box pop-in">`;

  if (q.type === 'listen') {
    html += `
      <div class="question-text">🔊 ${q.target.meaning}</div>
      <div class="question-hint">${q.hint}</div>
      <button class="btn btn-primary" onclick="playWord('${q.target.word}',this)" style="margin-bottom:20px">
        🔊 播放发音
      </button>`;
  } else if (q.type === 'picture') {
    html += `
      <span class="question-emoji">${q.target.emoji}</span>
      <div class="question-text">这是什么？</div>
      <div class="question-hint">${q.hint}</div>`;
  } else {
    html += `
      <div class="question-text" style="font-size:30px">${q.target.meaning}</div>
      <div class="question-hint">${q.hint}</div>`;
  }

  html += `<div class="options-grid">`;
  q.options.forEach((opt) => {
    html += `<button class="option-btn" data-word="${opt.word}" onclick="selectOption(this, '${opt.word}')">${opt.word}</button>`;
  });
  html += `</div></div>`;
  box.innerHTML = html;

  // Auto-play for listen type - 仅在用户已解锁音频时自动播放
  if (q.type === 'listen') {
    setTimeout(() => autoSpeak(q.target.word), 400);
  }
}

function selectOption(btn, word) {
  const q = gameState.questions[gameState.current];
  const buttons = document.querySelectorAll('#questionBox .option-btn');
  buttons.forEach(b => b.disabled = true);

  const correct = word === q.target.word;
  if (correct) {
    btn.classList.add('correct');
    gameState.correct++;
    // 不播放 'correct'，避免打断下一题的自动播放
  } else {
    btn.classList.add('wrong');
    btn.classList.add('shake');
    buttons.forEach(b => {
      if (b.dataset.word === q.target.word) b.classList.add('correct');
    });
    gameState.wrongWords.push(q.target.word);
  }
  gameState.answers.push({ word: q.target.word, correct });

  setTimeout(() => {
    gameState.current++;
    if (gameState.current < gameState.questions.length) {
      renderQuestion();
    } else {
      finishGame();
    }
  }, 1200);
}

async function finishGame() {
  const total = gameState.questions.length;
  const correct = gameState.correct;
  const rate = correct / total;
  const tier = tierFromRate(rate);

  // Submit to backend
  const result = await api(`/api/students/${currentStudent.id}/game`, {
    method: 'POST',
    body: { correct, total, wrongWords: gameState.wrongWords }
  });
  if (result && result.student) {
    currentStudent = result.student;
    localStorage.setItem('wordgame_student', JSON.stringify(currentStudent));
  }

  // Render result
  const color = tier === 'A' ? '#00b894' : tier === 'B' ? '#fdcb6e' : '#e17055';
  document.getElementById('resultRate').textContent = Math.round(rate * 100) + '%';
  document.getElementById('resultCorrect').textContent = `${correct} / ${total}`;
  document.getElementById('resultCircle').style.background = color;

  document.getElementById('resultTierBadge').textContent = tier;
  document.getElementById('resultTierBadge').className = 'tier-badge ' + tier;
  document.getElementById('resultTierName').textContent = TIER_INFO[tier].name;
  document.getElementById('resultTierDesc').textContent = TIER_INFO[tier].desc;

  const wrongList = document.getElementById('wrongWordsList');
  if (gameState.wrongWords.length > 0) {
    const unique = [...new Set(gameState.wrongWords)];
    wrongList.innerHTML = unique.map(w => {
      const wd = WORD_MAP[w];
      return `<span class="word-item" style="display:inline-flex;margin:4px"><span class="w-en">${w}</span> <span class="w-cn">${wd ? wd.meaning : ''}</span></span>`;
    }).join('');
    wrongList.parentElement.classList.remove('hidden');
  } else {
    wrongList.parentElement.classList.add('hidden');
  }

  showView('view-result');
  toast('闯关完成！AI 已为你分层 🎉', 'success');
}

// ---------- Task Sheet ----------
function showTasks() {
  if (!currentStudent.tier) {
    toast('请先完成单词闯关，AI 将为你分层并推送任务', 'error');
    return;
  }
  const tasks = getTasks(currentStudent.tier);
  renderTasks(tasks);
  showView('view-tasks');
}

function renderTasks(tasks) {
  document.getElementById('taskTitle').textContent = tasks.title;
  document.getElementById('taskGoal').textContent = '🎯 目标：' + tasks.goal;
  const container = document.getElementById('taskSections');
  container.innerHTML = '';

  tasks.sections.forEach((sec, idx) => {
    const div = document.createElement('div');
    div.className = 'task-section';
    let inner = `<h3>${sec.title}</h3><p style="color:var(--text-light);font-size:14px;margin-bottom:12px">${sec.desc}</p>`;

    if (sec.type === 'wordbook') {
      inner += `<div class="word-list">`;
      sec.words.forEach(w => {
        inner += `<div class="word-item">
          <button class="speaker" onclick="playWord('${w.word}',this)">🔊</button>
          <div><div class="w-en">${w.word}</div><div class="w-cn">${w.meaning}</div></div>
        </div>`;
      });
      inner += `</div>`;
      inner += `<div style="margin-top:12px">
        <button class="btn btn-outline" onclick="startPronunciationPractice('${sec.words.map(w=>w.word).join(',')}')">🎤 跟读练习</button>
      </div>`;
    }
    else if (sec.type === 'match') {
      inner += `<div id="matchArea${idx}"></div>`;
    }
    else if (sec.type === 'copy') {
      inner += `<div class="word-list">`;
      sec.words.forEach(w => {
        inner += `<div class="word-item">
          <button class="speaker" onclick="playWord('${w.word}',this)">🔊</button>
          <div><div class="w-en">${w.word}</div><div class="w-cn">${w.meaning}</div></div>
        </div>`;
      });
      inner += `</div>`;
    }
    else if (sec.type === 'sentence') {
      inner += `<div>`;
      sec.sentences.forEach(s => {
        inner += `<div class="task-question">
          <div class="q-text">${s.en}</div>
          <div style="color:var(--text-light);font-size:14px">${s.cn}</div>
          <button class="btn btn-ghost btn-small" style="margin-top:8px" onclick="playWord('${s.en.replace('___',s.answer)}',this)">🔊 跟读</button>
        </div>`;
      });
      inner += `</div>`;
    }
    else if (sec.type === 'fillblank') {
      inner += `<div>`;
      sec.items.forEach((it, i) => {
        const opts = shuffle([it.answer, ...pickDistractors(WORD_MAP[it.word] || WORDS[0], 2).map(w=>w.word)]);
        inner += `<div class="task-question">
          <div class="q-text">${it.en}</div>
          <div style="color:var(--text-light);font-size:13px;margin-bottom:8px">${it.cn}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">`;
        opts.forEach(o => {
          inner += `<button class="btn btn-outline btn-small" data-word="${o}" onclick="checkFill(this,'${o}','${it.answer}')">${o}</button>`;
        });
        inner += `</div></div>`;
      });
      inner += `</div>`;
    }
    else if (sec.type === 'translate') {
      inner += `<div>`;
      sec.words.forEach(w => {
        inner += `<div class="task-question">
          <div class="q-text">${w.word}</div>
          <input class="input" style="max-width:300px" placeholder="写出中文意思" onchange="checkTranslate(this,'${w.meaning}')">
        </div>`;
      });
      inner += `</div>`;
    }
    else if (sec.type === 'extend') {
      inner += `<div class="word-list">`;
      sec.words.forEach(w => {
        inner += `<div class="word-item">
          <div><div class="w-en">${w.word} ${w.antonym ? '(反义)' : '(拓展)'}</div><div class="w-cn">${w.meaning} ← 关联 ${w.related}</div></div>
        </div>`;
      });
      inner += `</div>`;
    }
    else if (sec.type === 'write') {
      inner += `<div>`;
      sec.words.forEach(w => {
        inner += `<div class="task-question">
          <div class="q-text">用 "${w.word}" (${w.meaning}) 写一个句子：</div>
          <textarea class="input" rows="2" placeholder="在此写下你的句子..."></textarea>
        </div>`;
      });
      inner += `</div>`;
    }
    else if (sec.type === 'dialogue') {
      inner += `<div class="task-question" style="background:rgba(108,92,231,0.05)">
        <div class="q-text">${sec.scenario}</div>
        <div style="color:var(--text-light);font-size:14px;margin-top:8px">提示：<br>${sec.tips.map(t=>'• '+t).join('<br>')}</div>
      </div>`;
    }
    else if (sec.type === 'quiz') {
      inner += `<button class="btn btn-primary" onclick="startTaskQuiz('${tasks.tier}','${sec.quizType}',${sec.count})">开始小检测 (${sec.count}题)</button>`;
    }

    div.innerHTML = inner;
    container.appendChild(div);

    // Init match area
    if (sec.type === 'match') {
      initMatch(`matchArea${idx}`, sec.words);
    }
  });
}

function initMatch(containerId, words) {
  const area = document.getElementById(containerId);
  const leftItems = shuffle(words.map(w => ({ ...w, side: 'en' })));
  const rightItems = shuffle(words.map(w => ({ ...w, side: 'cn' })));
  let html = `<div class="match-grid">`;
  leftItems.forEach(w => {
    html += `<div class="match-item" data-word="${w.word}" data-side="en" onclick="matchSelect(this)">${w.word}</div>`;
  });
  rightItems.forEach(w => {
    html += `<div class="match-item" data-word="${w.word}" data-side="cn" onclick="matchSelect(this)">${w.meaning}</div>`;
  });
  html += `</div>`;
  area.innerHTML = html;
}

let matchSelected = null;
function matchSelect(el) {
  if (el.classList.contains('matched')) return;
  if (!matchSelected) {
    el.classList.add('selected');
    matchSelected = el;
  } else if (matchSelected === el) {
    el.classList.remove('selected');
    matchSelected = null;
  } else {
    if (matchSelected.dataset.word === el.dataset.word && matchSelected.dataset.side !== el.dataset.side) {
      matchSelected.classList.remove('selected');
      matchSelected.classList.add('matched');
      el.classList.add('matched');
      toast('匹配正确！', 'success');
    } else {
      matchSelected.classList.remove('selected');
      el.classList.add('shake');
      setTimeout(() => el.classList.remove('shake'), 300);
    }
    matchSelected = null;
  }
}

function checkFill(btn, chosen, answer) {
  const btns = btn.parentElement.querySelectorAll('button');
  btns.forEach(b => b.disabled = true);
  if (chosen === answer) {
    btn.classList.remove('btn-outline');
    btn.classList.add('btn-success');
  } else {
    btn.classList.remove('btn-outline');
    btn.classList.add('btn-danger');
    btns.forEach(b => {
      if (b.dataset.word === answer) {
        b.classList.remove('btn-outline');
        b.classList.add('btn-success');
      }
    });
  }
}

function checkTranslate(input, answer) {
  const val = input.value.trim();
  if (val === answer) {
    input.style.borderColor = 'var(--success)';
    input.style.background = 'rgba(0,184,148,0.1)';
  } else {
    input.style.borderColor = 'var(--danger)';
    input.style.background = 'rgba(225,112,85,0.1)';
  }
}

// Pronunciation practice
function startPronunciationPractice(wordsStr) {
  const words = wordsStr.split(',');
  toast('请大声朗读单词，注意发音口型 🎤', 'success');
  // Auto-speak first word to demo
  if (words.length > 0) autoSpeak(words[0]);
}

// Task quiz
let taskQuizState = null;
function startTaskQuiz(tier, quizType, count) {
  const questions = [];
  for (let i = 0; i < count; i++) {
    if (quizType === 'listen') questions.push(genListenQuestion());
    else if (quizType === 'sentence') {
      const sentences = [
        { en: 'I have a big ___ .', answer: 'nose', meaning: '鼻子' },
        { en: 'She has ___ hair.', answer: 'long', meaning: '长的' },
        { en: 'Please ___ on the chair.', answer: 'sit', meaning: '坐' },
        { en: 'I like your new ___ .', answer: 'haircut', meaning: '发型' },
        { en: 'He is ___ but strong.', answer: 'short', meaning: '矮的' },
        { en: 'I can ___ a bird.', answer: 'see', meaning: '看见' },
        { en: 'I ___ your new look!', answer: 'like', meaning: '喜欢' },
        { en: 'Sit ___ the chair.', answer: 'on', meaning: '在...上' }
      ];
      const s = sentences[i % sentences.length];
      const target = WORD_MAP[s.answer];
      const distractors = pickDistractors(target, 3);
      questions.push({
        type: 'meaning',
        target,
        options: shuffle([target, ...distractors]),
        prompt: '选词填空',
        hint: s.en.replace('___', '_____'),
        extraCn: s.meaning
      });
    } else {
      questions.push(Math.random() > 0.5 ? genMeaningQuestion() : genPictureQuestion());
    }
  }
  taskQuizState = { questions, current: 0, correct: 0, wrongWords: [], tier };
  showView('view-taskquiz');
  renderTaskQuestion();
}

function quitTaskQuiz() {
  if (confirm('确定要退出小检测吗？')) {
    taskQuizState = null;
    showTasks();
  }
}

function renderTaskQuestion() {
  const q = taskQuizState.questions[taskQuizState.current];
  const total = taskQuizState.questions.length;
  document.getElementById('tqProgress').style.width = (taskQuizState.current / total * 100) + '%';
  document.getElementById('tqCounter').textContent = `${taskQuizState.current + 1} / ${total}`;
  document.getElementById('tqType').textContent = q.prompt;

  const box = document.getElementById('tqBox');
  let html = `<div class="question-box pop-in">`;
  if (q.type === 'listen') {
    html += `<div class="question-text">🔊 听音选词</div>
      <button class="btn btn-primary" onclick="playWord('${q.target.word}',this)" style="margin:12px 0 20px">🔊 播放</button>`;
  } else if (q.extraCn) {
    html += `<div class="question-text" style="font-size:22px">${q.hint}</div>
      <div class="question-hint">选择正确的单词填入空格</div>`;
  } else {
    html += `<div class="question-text">${q.target.meaning}</div>
      <div class="question-hint">${q.hint}</div>`;
  }
  html += `<div class="options-grid">`;
  q.options.forEach(opt => {
    html += `<button class="option-btn" data-word="${opt.word}" onclick="selectTaskOption(this,'${opt.word}')">${opt.word}</button>`;
  });
  html += `</div></div>`;
  box.innerHTML = html;

  if (q.type === 'listen') setTimeout(() => autoSpeak(q.target.word), 300);
}

function selectTaskOption(btn, word) {
  const q = taskQuizState.questions[taskQuizState.current];
  const buttons = document.querySelectorAll('#tqBox .option-btn');
  buttons.forEach(b => b.disabled = true);
  const correct = word === q.target.word;
  if (correct) { btn.classList.add('correct'); taskQuizState.correct++; }
  else {
    btn.classList.add('wrong');
    buttons.forEach(b => { if (b.dataset.word === q.target.word) b.classList.add('correct'); });
    taskQuizState.wrongWords.push(q.target.word);
  }
  setTimeout(() => {
    taskQuizState.current++;
    if (taskQuizState.current < taskQuizState.questions.length) renderTaskQuestion();
    else finishTaskQuiz();
  }, 1000);
}

async function finishTaskQuiz() {
  const total = taskQuizState.questions.length;
  const correct = taskQuizState.correct;
  await api(`/api/students/${currentStudent.id}/task`, {
    method: 'POST',
    body: {
      taskTier: taskQuizState.tier,
      taskType: 'quiz',
      correct, total,
      wrongWords: [...new Set(taskQuizState.wrongWords)]
    }
  });
  // Update local student
  const stu = await api(`/api/students/${currentStudent.id}`);
  if (stu) {
    currentStudent = stu;
    localStorage.setItem('wordgame_student', JSON.stringify(stu));
  }

  // Render quiz result
  document.getElementById('tqResultRate').textContent = Math.round(correct/total*100) + '%';
  document.getElementById('tqResultCorrect').textContent = `${correct} / ${total}`;
  const tqWrong = document.getElementById('tqWrongWords');
  if (taskQuizState.wrongWords.length > 0) {
    const unique = [...new Set(taskQuizState.wrongWords)];
    tqWrong.innerHTML = unique.map(w => {
      const wd = WORD_MAP[w];
      return `<span class="word-item" style="display:inline-flex;margin:4px"><span class="w-en">${w}</span> <span class="w-cn">${wd ? wd.meaning : ''}</span></span>`;
    }).join('');
    tqWrong.parentElement.classList.remove('hidden');
  } else {
    tqWrong.parentElement.classList.add('hidden');
  }
  showView('view-tqresult');
  toast('小检测完成！答错的单词已收录到错题本 📕', 'success');
}

// ---------- Error Book ----------
async function showErrorBook() {
  const stu = await api(`/api/students/${currentStudent.id}`);
  if (stu) {
    currentStudent = stu;
  }
  const errors = (currentStudent && currentStudent.errorBook) || [];
  const list = document.getElementById('errorBookList');
  if (errors.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="emoji">🎉</div><p>太棒了！你还没有错题</p></div>`;
  } else {
    list.innerHTML = `<div class="word-list">` + errors.map(w => {
      const wd = WORD_MAP[w];
      return `<div class="word-item">
        <button class="speaker" onclick="playWord('${w}',this)">🔊</button>
        <div><div class="w-en">${w}</div><div class="w-cn">${wd ? wd.meaning : ''}</div></div>
      </div>`;
    }).join('') + `</div>`;
  }
  showView('view-errorbook');
}

// ---------- Switch tier tasks (for browsing) ----------
function browseTierTasks(tier) {
  const tasks = getTasks(tier);
  renderTasks(tasks);
  showView('view-tasks');
}

function logout() {
  if (confirm('确定要退出吗？')) {
    currentStudent = null;
    localStorage.removeItem('wordgame_student');
    showView('view-welcome');
  }
}

// ---------- Init ----------
function init() {
  const input = document.getElementById('nameInput');
  if (input) {
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') registerStudent();
    });
  }
  if (currentStudent) {
    showMenu();
  } else {
    showView('view-welcome');
  }
}

window.addEventListener('DOMContentLoaded', init);
