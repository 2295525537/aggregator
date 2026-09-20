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

// Speak word - 多源 TTS + Web Speech 综合方案
// 核心思路：
// 1. 用户首次交互时，同步播放一段静音音频来"解锁" Audio 元素（iOS 必需）
// 2. playWord 同步调用 audio.play()，浏览器会等待加载完后自动播放
// 3. 加载超时兜底切换到下一个 TTS 源
var cachedVoices = [];
var audioUnlocked = false;
var _speakFailCount = 0;

// 内嵌极短的静音 WAV（44 字节头部 + 少量静音数据）用于解锁 Audio
// 同源 data URL，iOS Safari 也能播放
var _silentWav = 'data:audio/wav;base64,UklGRkwAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSgAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA';

// 全局 Audio 元素（复用同一个，避免 iOS 创建多个 Audio 的限制）
var _ttsAudio = null;
function _getTtsAudio() {
  if (!_ttsAudio) {
    try {
      _ttsAudio = new Audio();
      // iOS 必须 playsinline 才能在网页内播放
      _ttsAudio.setAttribute('playsinline', 'playsinline');
      _ttsAudio.setAttribute('webkit-playsinline', 'webkit-playsinline');
      _ttsAudio.preload = 'auto';
    } catch(e) { return null; }
  }
  return _ttsAudio;
}

// TTS 源列表（按优先级排序）
function _getTtsUrls(text) {
  return [
    'https://dict.youdao.com/dictvoice?audio=' + encodeURIComponent(text) + '&type=2',
    'https://fanyi.baidu.com/gettts?lan=en&text=' + encodeURIComponent(text) + '&spd=3&source=web',
    'https://tts.baidu.com/text2audio?lan=EN&text=' + encodeURIComponent(text) + '&spd=3&per=4'
  ];
}

// 用户首次交互时调用：在同步手势上下文中播放静音音频以"解锁" Audio 元素
// iOS Safari 必须：任何 audio.play() 必须直接在用户手势回调内同步执行过一次
function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  document.removeEventListener('click', unlockAudio);
  document.removeEventListener('touchstart', unlockAudio);
  document.removeEventListener('keydown', unlockAudio);

  // ★ 关键：同步 play() 静音 WAV，让 Audio 元素被"激活"
  var a = _getTtsAudio();
  if (a) {
    try {
      a.src = _silentWav;
      a.volume = 0; // 静音不扰民
      var p = a.play();
      var afterUnlock = function() {
        try { if (typeof initBgm === 'function') initBgm(); } catch(e) {}
      };
      if (p && p.then) p.then(afterUnlock).catch(afterUnlock);
      else afterUnlock();
    } catch(e) {
      try { if (typeof initBgm === 'function') initBgm(); } catch(e2) {}
    }
  } else {
    try { if (typeof initBgm === 'function') initBgm(); } catch(e) {}
  }
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('touchstart', unlockAudio, { once: true });
    document.addEventListener('keydown', unlockAudio, { once: true });
  });
} else {
  document.addEventListener('click', unlockAudio, { once: true });
  document.addEventListener('touchstart', unlockAudio, { once: true });
  document.addEventListener('keydown', unlockAudio, { once: true });
}

// 预加载语音列表（Web Speech 备用方案）
function loadVoices() {
  if (!('speechSynthesis' in window)) return;
  try { cachedVoices = window.speechSynthesis.getVoices(); } catch(e) {}
}
if ('speechSynthesis' in window) {
  loadVoices();
  if (typeof window.speechSynthesis.onvoiceschanged !== 'undefined') {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
  var _vtries = 0;
  var _viv = setInterval(function() {
    loadVoices();
    _vtries++;
    if (cachedVoices.length > 0 || _vtries > 10) clearInterval(_viv);
  }, 200);
}

function pickEnglishVoice() {
  if (cachedVoices.length === 0) return null;
  var enUS = cachedVoices.find(function(v) { return v.lang === 'en-US' || v.lang === 'en_US'; });
  if (enUS) return enUS;
  var enGB = cachedVoices.find(function(v) { return v.lang === 'en-GB' || v.lang === 'en_GB'; });
  if (enGB) return enGB;
  var enAny = cachedVoices.find(function(v) { return v.lang.toLowerCase().startsWith('en'); });
  return enAny || null;
}

// Web Speech API 播放（备用方案）
function _speakWithWebSpeech(text, lang, rate) {
  return new Promise(function(resolve) {
    if (!('speechSynthesis' in window)) { resolve(false); return; }
    if (cachedVoices.length === 0) loadVoices();
    try { window.speechSynthesis.cancel(); } catch(e) {}
    var u = new SpeechSynthesisUtterance(text);
    u.lang = lang || 'en-US';
    u.rate = rate || 0.85;
    u.pitch = 1;
    u.volume = 1;
    var voice = pickEnglishVoice();
    if (voice) u.voice = voice;
    var done = false;
    var finish = function(ok) { if (done) return; done = true; resolve(ok); };
    u.onend = function() { finish(true); };
    u.onerror = function(e) {
      if (e && (e.error === 'interrupted' || e.error === 'canceled')) finish(true);
      else finish(false);
    };
    try { window.speechSynthesis.resume(); window.speechSynthesis.speak(u); }
    catch(e) { finish(false); }
    setTimeout(function() { finish(false); }, 5000);
  });
}

// 对外暴露的 speak（异步，用于自动播放等场景）
function speak(text, lang, rate) {
  lang = lang || 'en-US';
  rate = rate || 0.85;
  return _speakWithWebSpeech(text, lang, rate);
}

// 自动播放
function autoSpeak(text) {
  if (!audioUnlocked) return Promise.resolve(false);
  return speak(text);
}

// ★ 核心函数：用户点击播放按钮时调用
// 关键：audio.play() 在同步调用栈中执行（iOS Safari 必须在用户手势内）
// 已在 unlockAudio 时通过静音 WAV 解锁过 Audio 元素
function playWord(text, btn) {
  // 1. 视觉动画反馈（即使播放失败也有效）
  if (btn) {
    btn.classList.add('speaking');
    setTimeout(function() { btn.classList.remove('speaking'); }, 1500);
  }

  // 2. 同步调用 audio.play()（保持在用户手势上下文中）
  var audio = _getTtsAudio();
  if (!audio) {
    _speakWithWebSpeech(text, 'en-US', 0.85);
    return;
  }

  var urls = _getTtsUrls(text);
  var sourceIdx = 0;
  var loadTimeout = null;
  var settled = false;

  // 清理：取消之前的加载超时、重置事件
  function _cleanup() {
    if (loadTimeout) { clearTimeout(loadTimeout); loadTimeout = null; }
    audio.oncanplay = null;
    audio.onended = null;
    audio.onerror = null;
  }

  // 切换到下一个 TTS 源（在异步上下文中调用）
  function _tryNextSource(reason) {
    if (settled) return;
    settled = true;
    _cleanup();
    sourceIdx++;
    if (sourceIdx < urls.length) {
      // 尝试下一个 TTS 源 - 注意此时已脱离用户手势上下文
      // 但因为 Audio 元素已被 unlockAudio 解锁，仍可正常播放
      audio.src = urls[sourceIdx];
      audio.currentTime = 0;
      audio.volume = 1;
      _attachEvents();
      var p2 = audio.play();
      if (p2 && p2.catch) p2.catch(function() { _tryWebSpeechFallback(text); });
    } else {
      // 所有 TTS 源都失败，回退 Web Speech
      _tryWebSpeechFallback(text);
    }
  }

  // 绑定事件
  function _attachEvents() {
    // 加载超时兜底（防止网络慢或跨域被拦导致一直不响应）
    if (loadTimeout) clearTimeout(loadTimeout);
    loadTimeout = setTimeout(function() {
      // 2.5 秒还没到可播放状态，切换源
      if (audio.readyState < 3) { // HAVE_FUTURE_DATA = 3
        _tryNextSource('load-timeout');
      }
    }, 2500);

    audio.oncanplay = function() {
      // 加载到可播放状态，清除超时
      if (loadTimeout) { clearTimeout(loadTimeout); loadTimeout = null; }
    };

    audio.onended = function() {
      _speakFailCount = 0;
      _cleanup();
    };

    audio.onerror = function() {
      _tryNextSource('onerror');
    };
  }

  // 设置第一个 TTS 源并同步播放
  audio.src = urls[0];
  audio.currentTime = 0;
  audio.volume = 1;
  _attachEvents();

  // 同步调用 play()（iOS 必须在用户手势的直接调用栈中）
  // 浏览器会等待音频加载完成后自动开始播放
  var promise = audio.play();
  if (promise && promise.catch) {
    promise.catch(function() {
      // play() 被拒绝（可能是自动播放策略），尝试下一个源
      _tryNextSource('play-rejected');
    });
  }
}

// Web Speech 回退
function _tryWebSpeechFallback(text) {
  _speakWithWebSpeech(text, 'en-US', 0.85).then(function(ok) {
    if (!ok) {
      _speakFailCount++;
      if (_speakFailCount >= 3 && typeof toast === 'function') {
        toast('发音播放失败，请检查网络和设备音量', 'error');
      }
    } else {
      _speakFailCount = 0;
    }
  });
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

// ========== 欢快背景音乐（Web Audio API 生成，无需外部文件） ==========
var _bgmCtx = null;
var _bgmGain = null;
var _bgmPlaying = false;
var _bgmTimer = null;
var _bgmNoteIndex = 0;

// 欢快旋律（C大调，简单音符序列）
// 格式: [频率, 持续拍数]
var _bgmMelody = [
  [523.25,1],[587.33,1],[659.25,1],[698.46,1], // C D E F
  [783.99,2],[659.25,1],[783.99,1],             // G.. E G
  [880.00,2],[698.46,1],[587.33,1],             // A.. F D
  [523.25,1],[587.33,1],[659.25,2],             // C D E..
  [523.25,1],[659.25,1],[783.99,1],[880.00,1], // C E G A
  [987.77,2],[880.00,1],[783.99,1],             // B.. A G
  [659.25,1],[698.46,1],[587.33,1],[523.25,2], // E F D C..
  [659.25,1],[523.25,2],[0,1]                   // E C. (休止)
];
// 低音和声（每2拍变化）
var _bgmBass = [
  [130.81,4],[196.00,4],  // C2, G2
  [174.61,4],[130.81,4],  // F2, C2
  [196.00,4],[130.81,4],  // G2, C2
  [174.61,4],[130.81,4]   // F2, C2
];

function _bgmInitCtx() {
  if (_bgmCtx) return;
  try {
    _bgmCtx = new (window.AudioContext || window.webkitAudioContext)();
    _bgmGain = _bgmCtx.createGain();
    _bgmGain.gain.value = 0.12; // 音量（轻柔）
    _bgmGain.connect(_bgmCtx.destination);
  } catch(e) { _bgmCtx = null; }
}

// 播放单个音符
function _bgmPlayNote(freq, duration, isBass) {
  if (!_bgmCtx || freq === 0) return;
  var now = _bgmCtx.currentTime;
  var osc = _bgmCtx.createOscillator();
  var gain = _bgmCtx.createGain();
  osc.type = isBass ? 'sine' : 'triangle';
  osc.frequency.value = freq;

  // 包络：快速淡入 + 缓慢淡出
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(isBass ? 0.06 : 0.1, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.9);

  osc.connect(gain);
  gain.connect(_bgmGain);
  osc.start(now);
  osc.stop(now + duration);
}

// 定时器循环播放旋律
function _bgmTick() {
  if (!_bgmPlaying || !_bgmCtx) return;
  var tempo = 0.32; // 每拍秒数（约 187 BPM，欢快）
  var note = _bgmMelody[_bgmNoteIndex % _bgmMelody.length];
  var bassNote = _bgmBass[Math.floor(_bgmNoteIndex / 4) % _bgmBass.length];

  // 主旋律
  _bgmPlayNote(note[0], note[1] * tempo, false);
  // 低音和声（每4拍变化，取第一拍时播放）
  if (_bgmNoteIndex % 4 === 0) {
    _bgmPlayNote(bassNote[0], bassNote[1] * tempo, true);
  }

  _bgmNoteIndex++;
  _bgmTimer = setTimeout(_bgmTick, note[1] * tempo * 1000);
}

// 初始化背景音乐（用户首次交互后调用）
// 自动启动 BGM，让用户打开网页就有欢快音乐（用户希望"页面整体加一点欢快的音乐"）
function initBgm() {
  if (_bgmCtx) {
    // 如果之前暂停过，恢复
    if (_bgmCtx.state === 'suspended') _bgmCtx.resume();
    // 如果用户没主动关闭过，自动开始播放
    if (!_bgmPlaying && !_bgmUserStopped) {
      _startBgm();
    }
    return;
  }
  _bgmInitCtx();
  // 首次初始化后，自动开始播放
  if (_bgmCtx && !_bgmPlaying && !_bgmUserStopped) {
    _startBgm();
  }
}

// 标记用户是否主动关闭过 BGM（避免自动播放打扰用户）
var _bgmUserStopped = false;

// 开始播放 BGM
function _startBgm() {
  if (!_bgmCtx || _bgmPlaying) return;
  _bgmPlaying = true;
  if (_bgmCtx.state === 'suspended') _bgmCtx.resume();
  _bgmTick();
  var btn = document.getElementById('bgmBtn');
  if (btn) { btn.classList.add('playing'); btn.innerHTML = '🔊 音乐'; }
}

// 切换播放/暂停（用户手动控制）
function toggleBgm() {
  var btn = document.getElementById('bgmBtn');
  if (!_bgmCtx) _bgmInitCtx();
  if (!_bgmCtx) return;

  if (_bgmPlaying) {
    // 暂停
    _bgmPlaying = false;
    _bgmUserStopped = true; // 用户主动关闭，之后不再自动启动
    if (_bgmTimer) { clearTimeout(_bgmTimer); _bgmTimer = null; }
    if (_bgmCtx.state === 'running') _bgmCtx.suspend();
    if (btn) { btn.classList.remove('playing'); btn.innerHTML = '🎵 音乐'; }
  } else {
    // 播放
    _bgmUserStopped = false;
    _startBgm();
  }
}
