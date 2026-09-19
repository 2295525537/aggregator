// Shared vocabulary & game logic
const WORDS = [
  { word: 'head', meaning: '头', emoji: '👤', type: 'noun', category: 'body' },
  { word: 'eye', meaning: '眼睛', emoji: '👁️', type: 'noun', category: 'body' },
  { word: 'ear', meaning: '耳朵', emoji: '👂', type: 'noun', category: 'body' },
  { word: 'mouth', meaning: '嘴巴', emoji: '👄', type: 'noun', category: 'body' },
  { word: 'hair', meaning: '头发', emoji: '💇', type: 'noun', category: 'body' },
  { word: 'nose', meaning: '鼻子', emoji: '👃', type: 'noun', category: 'body' },
  { word: 'face', meaning: '脸', emoji: '😊', type: 'noun', category: 'body' },
  { word: 'haircut', meaning: '理发；发型', emoji: '✂️', type: 'noun', category: 'appearance' },
  { word: 'long', meaning: '长的', emoji: '📏', type: 'adj', category: 'appearance' },
  { word: 'short', meaning: '短的；个子矮的', emoji: '📐', type: 'adj', category: 'appearance' },
  { word: 'sit', meaning: '坐', emoji: '🪑', type: 'verb', category: 'action' },
  { word: 'see', meaning: '看见', emoji: '👀', type: 'verb', category: 'action' },
  { word: 'like', meaning: '喜欢', emoji: '❤️', type: 'verb', category: 'action' },
  { word: 'have', meaning: '有', emoji: '✋', type: 'verb', category: 'action' },
  { word: 'chair', meaning: '椅子', emoji: '💺', type: 'noun', category: 'object' },
  { word: 'mum', meaning: '妈妈', emoji: '👩', type: 'noun', category: 'people' },
  { word: 'please', meaning: '请', emoji: '🙏', type: 'adv', category: 'function' },
  { word: 'but', meaning: '但是', emoji: '🔗', type: 'conj', category: 'function' },
  { word: 'on', meaning: '在……上', emoji: '⬆️', type: 'prep', category: 'function' },
  { word: 'your', meaning: '你的；你们的', emoji: '👉', type: 'pron', category: 'function' },
  { word: 'you', meaning: '你；你们', emoji: '🧑', type: 'pron', category: 'function' },
  { word: 'a', meaning: '一；一个', emoji: '1️⃣', type: 'art', category: 'function' }
];

const WORD_MAP = Object.fromEntries(WORDS.map(w => [w.word, w]));

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom(arr, n) {
  return shuffle(arr).slice(0, n);
}

function pickDistractors(correctWord, count) {
  return shuffle(WORDS.filter(w => w.word !== correctWord.word)).slice(0, count);
}

// Speak word using Web Speech API - 增强版
let cachedVoices = [];
let voicesReady = false;
let audioUnlocked = false;
let _chromeResumeTimer = null;
let _speakFailCount = 0;
const SPEAK_MAX_RETRY = 2;

// 标记用户已交互（解锁自动播放）
function unlockAudio() {
  audioUnlocked = true;
  // 移除监听，避免重复
  document.removeEventListener('click', unlockAudio);
  document.removeEventListener('touchstart', unlockAudio);
  document.removeEventListener('keydown', unlockAudio);
}
// 页面加载后立即监听用户交互
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('touchstart', unlockAudio, { once: true });
    document.addEventListener('keydown', unlockAudio, { once: true });
  });
} else {
  document.addEventListener('click', unlockAudio, { once: true });
  document.addEventListener('touchstart', unlockAudio, { once: true });
  document.addEventListener('keydown', unlockAudio, { once: true });
}

// 预加载语音列表（多次尝试，兼容不同浏览器）
function loadVoices() {
  if (!('speechSynthesis' in window)) return;
  try {
    cachedVoices = window.speechSynthesis.getVoices();
    if (cachedVoices.length > 0) voicesReady = true;
  } catch(e) {}
}
if ('speechSynthesis' in window) {
  loadVoices();
  if (typeof window.speechSynthesis.onvoiceschanged !== 'undefined') {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
  // 兜底：部分浏览器 voiceschanged 不触发，定时加载几次
  let tries = 0;
  const iv = setInterval(() => {
    loadVoices();
    tries++;
    if (cachedVoices.length > 0 || tries > 10) clearInterval(iv);
  }, 200);
}

// 选择合适的英语语音
function pickEnglishVoice() {
  if (cachedVoices.length === 0) return null;
  // 优先选择 en-US，其次 en-GB，再次任何 en 开头的
  const enUS = cachedVoices.find(v => v.lang === 'en-US' || v.lang === 'en_US');
  if (enUS) return enUS;
  const enGB = cachedVoices.find(v => v.lang === 'en-GB' || v.lang === 'en_GB');
  if (enGB) return enGB;
  const enAny = cachedVoices.find(v => v.lang.toLowerCase().startsWith('en'));
  if (enAny) return enAny;
  // 没有英语语音，返回第一个可用语音
  return cachedVoices[0] || null;
}

// 核心播放函数（内部使用，用于异步重试）
function _speakOnce(text, lang, rate) {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) { resolve(false); return; }
    if (cachedVoices.length === 0) loadVoices();

    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = rate;
    u.pitch = 1;
    u.volume = 1;
    const voice = pickEnglishVoice();
    if (voice) u.voice = voice;

    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      if (_chromeResumeTimer) { clearInterval(_chromeResumeTimer); _chromeResumeTimer = null; }
      resolve(ok);
    };
    u.onstart = () => {
      if (_chromeResumeTimer) clearInterval(_chromeResumeTimer);
      _chromeResumeTimer = setInterval(() => {
        try { if (window.speechSynthesis.speaking) { window.speechSynthesis.pause(); window.speechSynthesis.resume(); } } catch(e) {}
      }, 10000);
    };
    u.onend = () => finish(true);
    u.onerror = (e) => {
      if (e && (e.error === 'interrupted' || e.error === 'canceled')) finish(true);
      else { console.warn('_speakOnce error:', e); finish(false); }
    };
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(u);
    } catch(e) { finish(false); }
  });
}

// 异步重试函数（在 onerror 后调用）
function retrySpeak(text, lang, rate, attempt, resolve) {
  if (attempt > SPEAK_MAX_RETRY) {
    _speakFailCount++;
    if (_speakFailCount >= 3 && typeof toast === 'function') {
      toast('发音播放失败，请检查设备音量或刷新页面', 'error');
    }
    resolve(false);
    return;
  }
  loadVoices();
  setTimeout(async () => {
    const ok = await _speakOnce(text, lang, rate);
    if (ok) {
      _speakFailCount = 0;
      resolve(true);
    } else {
      retrySpeak(text, lang, rate, attempt + 1, resolve);
    }
  }, 100);
}

// 对外暴露的 speak：首次同步调用（保持用户手势上下文），失败时异步重试
function speak(text, lang = 'en-US', rate = 0.85) {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      if (typeof toast === 'function') toast('当前浏览器不支持语音播放', 'error');
      resolve(false);
      return;
    }

    // 确保语音列表已加载
    if (cachedVoices.length === 0) loadVoices();

    // 同步取消当前播放 + 同步播放（关键：保持在用户手势调用栈中，iOS Safari 必需）
    try { window.speechSynthesis.cancel(); } catch(e) {}

    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = rate;
    u.pitch = 1;
    u.volume = 1;

    const voice = pickEnglishVoice();
    if (voice) u.voice = voice;

    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      if (_chromeResumeTimer) {
        clearInterval(_chromeResumeTimer);
        _chromeResumeTimer = null;
      }
      if (ok) _speakFailCount = 0;
      resolve(ok);
    };

    u.onstart = () => {
      // Chrome 15s bug 修复：定期 resume 防止被浏览器自动终止
      if (_chromeResumeTimer) clearInterval(_chromeResumeTimer);
      _chromeResumeTimer = setInterval(() => {
        try {
          if (window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          }
        } catch(e) {}
      }, 10000);
    };
    u.onend = () => finish(true);
    u.onerror = (e) => {
      // 'interrupted' 和 'canceled' 是主动取消，不算失败
      if (e && (e.error === 'interrupted' || e.error === 'canceled')) {
        finish(true);
      } else {
        console.warn('Speech error, retrying:', e);
        // 首次失败，进入异步重试
        if (!done) retrySpeak(text, lang, rate, 1, resolve);
        done = true; // 防止重复 resolve
      }
    };

    try {
      // 同步 resume + speak，保持用户手势上下文
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(u);
    } catch(e) {
      console.warn('Speak exception, retrying:', e);
      retrySpeak(text, lang, rate, 1, resolve);
    }
  });
}

// 自动播放（用于题目自动播放）：如果未解锁则不播放，避免被浏览器阻止
async function autoSpeak(text) {
  if (!audioUnlocked) return false; // 等用户点击播放按钮
  return speak(text);
}

function tierFromRate(rate) {
  if (rate < 0.6) return 'C';
  if (rate <= 0.85) return 'B';
  return 'A';
}

const TIER_INFO = {
  A: { name: '巩固层', color: '#00b894', desc: '单词掌握较好，拓展提升' },
  B: { name: '基础层', color: '#fdcb6e', desc: '能认读单词，加强运用' },
  C: { name: '入门层', color: '#e17055', desc: '认读薄弱，夯实基础' }
};

// ---------- Game question generators ----------
// Type 1: 听音选词 - listen to word, choose correct English
function genListenQuestion() {
  const target = pickRandom(WORDS.filter(w => w.category !== 'function'), 1)[0] || WORDS[0];
  const distractors = pickDistractors(target, 3);
  const options = shuffle([target, ...distractors]);
  return {
    type: 'listen',
    target,
    options,
    prompt: '听音选词',
    hint: '点击播放按钮听单词，选择正确的单词'
  };
}

// Type 2: 看图猜词 - show emoji, choose English word
function genPictureQuestion() {
  const target = pickRandom(WORDS.filter(w => w.emoji && w.category !== 'function'), 1)[0] || WORDS[0];
  const distractors = pickDistractors(target, 3);
  const options = shuffle([target, ...distractors]);
  return {
    type: 'picture',
    target,
    options,
    prompt: '看图猜词',
    hint: '根据图片选择正确的单词'
  };
}

// Type 3: 词义匹配 - show Chinese meaning, choose English word
function genMeaningQuestion() {
  const target = pickRandom(WORDS, 1)[0];
  const distractors = pickDistractors(target, 3);
  const options = shuffle([target, ...distractors]);
  return {
    type: 'meaning',
    target,
    options,
    prompt: '词义匹配',
    hint: '选择与中文意思对应的单词'
  };
}

// Generate a full game with mix of question types
function generateGame(total = 10) {
  const questions = [];
  const types = [genListenQuestion, genPictureQuestion, genMeaningQuestion];
  for (let i = 0; i < total; i++) {
    const gen = types[i % types.length];
    questions.push(gen());
  }
  return shuffle(questions);
}

// ---------- Task generators by tier ----------

// C layer tasks: 看图匹配单词 + 抄写核心单词 + 5题听音选词
function genCTasks() {
  const coreWords = pickRandom(WORDS.filter(w => w.category === 'body' || w.category === 'appearance'), 6);
  return {
    tier: 'C',
    title: 'C层 · 入门层任务单',
    goal: '认识单词、会读单词，掌握基础词义',
    sections: [
      {
        title: '📖 AI 单词书：点读 + 跟读',
        desc: '点击喇叭听发音，大声跟读，AI 帮你纠正发音',
        type: 'wordbook',
        words: coreWords
      },
      {
        title: '🎯 任务一：看图匹配单词',
        desc: '将图片与对应的单词连起来',
        type: 'match',
        words: pickRandom(coreWords, 4)
      },
      {
        title: '✏️ 任务二：抄写核心单词',
        desc: '在本子上抄写以下单词，每个写 3 遍',
        type: 'copy',
        words: coreWords.slice(0, 5)
      },
      {
        title: '🔍 AI 小检测：5 题听音选单词',
        desc: '听单词，选择正确答案',
        type: 'quiz',
        quizType: 'listen',
        count: 5
      }
    ]
  };
}

// B layer tasks: 情境句跟读 + 选词填空 + 中英互译 + 8题运用
function genBTasks() {
  const words = pickRandom(WORDS, 8);
  const sentences = [
    { en: 'I have a big ___ .', cn: '我有一个大鼻子。', answer: 'nose', word: 'nose' },
    { en: 'She has ___ hair.', cn: '她有长头发。', answer: 'long', word: 'long' },
    { en: 'Please ___ on the chair.', cn: '请坐在椅子上。', answer: 'sit', word: 'sit' },
    { en: 'I like your new ___ .', cn: '我喜欢你的新发型。', answer: 'haircut', word: 'haircut' },
    { en: 'I ___ your new look!', cn: '我喜欢你的新造型！', answer: 'like', word: 'like' },
    { en: 'He is ___ but strong.', cn: '他个子矮但很强壮。', answer: 'short', word: 'short' }
  ];
  return {
    tier: 'B',
    title: 'B层 · 基础层任务单',
    goal: '读懂单词，能在短句中使用单词',
    sections: [
      {
        title: '📖 AI 单词书：情境句跟读',
        desc: '在句子中理解单词用法，大声跟读',
        type: 'sentence',
        sentences: sentences
      },
      {
        title: '🎯 任务一：选词填空',
        desc: '选择正确的单词填入句子',
        type: 'fillblank',
        items: sentences.slice(0, 4)
      },
      {
        title: '🔤 任务二：中英互译',
        desc: '写出单词的中文意思 / 写出中文对应的单词',
        type: 'translate',
        words: pickRandom(words, 6)
      },
      {
        title: '🔍 AI 小检测：8 题单词运用题',
        desc: '在语境中选择正确的单词',
        type: 'quiz',
        quizType: 'sentence',
        count: 8
      }
    ]
  };
}

// A layer tasks: 拓展词/同义反义词 + 仿写句子 + 口头创编对话
function genATasks() {
  const word = pickRandom(WORDS.filter(w => w.category !== 'function'), 1)[0];
  const extensions = [
    { word: 'eyebrow', meaning: '眉毛', related: 'eye' },
    { word: 'cheek', meaning: '脸颊', related: 'face' },
    { word: 'forehead', meaning: '额头', related: 'face' },
    { word: 'tall', meaning: '高的', related: 'short', antonym: true },
    { word: 'hate', meaning: '讨厌', related: 'like', antonym: true },
    { word: 'gaze', meaning: '凝视', related: 'see' },
    { word: 'seat', meaning: '座位', related: 'sit' }
  ];
  return {
    tier: 'A',
    title: 'A层 · 巩固层任务单',
    goal: '活用单词，拓展词汇，提升表达',
    sections: [
      {
        title: '📖 AI 单词书：拓展词汇 + 同义/反义词',
        desc: '学习与单元单词相关的拓展词、同义词和反义词',
        type: 'extend',
        words: extensions
      },
      {
        title: '✍️ 任务一：用单元单词仿写句子',
        desc: '用以下单词各写一个句子，发挥想象',
        type: 'write',
        words: pickRandom(WORDS.filter(w => w.category !== 'function'), 5)
      },
      {
        title: '💬 任务二：AI 情景创编对话',
        desc: 'AI 生成情景，口头创编简单对话',
        type: 'dialogue',
        scenario: '情景：你和朋友在理发店，互相评价新发型。请用本单元单词创编一段 4-6 句的对话。',
        tips: ['可以用 hair, haircut, long, short, like, see 等单词', '尝试用 "You look great!" 来赞美']
      },
      {
        title: '🔍 AI 小检测：综合运用题',
        desc: '在语境中选择正确单词，并理解拓展词义',
        type: 'quiz',
        quizType: 'mixed',
        count: 8
      }
    ]
  };
}

function getTasks(tier) {
  if (tier === 'A') return genATasks();
  if (tier === 'B') return genBTasks();
  return genCTasks();
}
