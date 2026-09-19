<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI 单词闯关 - Unit 3</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <div class="container">
    <!-- Welcome / Register -->
    <div id="view-welcome" class="view">
      <div class="login-wrap" style="min-height:auto;padding:60px 0">
        <div class="login-card">
          <div style="font-size:60px;margin-bottom:12px">🎮</div>
          <h1>AI 单词闯关</h1>
          <p class="subtitle">Unit 3 · Body & Appearance<br>完成闯关，AI 自动分层推送个性化任务</p>
          <input id="nameInput" class="input" placeholder="请输入你的姓名" autofocus>
          <button class="btn btn-primary btn-block" style="margin-top:16px" onclick="registerStudent()">开始闯关</button>
          <p style="margin-top:20px;font-size:13px;color:var(--text-light)">
            <a href="dashboard.php" style="color:var(--primary)">教师入口 →</a>
          </p>
        </div>
      </div>
    </div>

    <!-- Menu -->
    <div id="view-menu" class="view hidden">
      <div class="app-header">
        <h1>🎮 AI 单词闯关</h1>
        <p>Unit 3 · Body & Appearance — 欢迎你，<span id="studentName"></span></p>
        <div class="header-right">
          <button class="btn btn-ghost" style="color:white;border-color:rgba(255,255,255,0.4)" onclick="logout()">退出</button>
        </div>
      </div>
      <div class="card" id="menuInfo"></div>
      <div class="stats-grid">
        <div class="stat-card" onclick="startGame()" style="cursor:pointer">
          <div style="font-size:40px">🎯</div>
          <div class="stat-label">单词闯关</div>
          <div style="font-size:13px;color:var(--primary);margin-top:4px">听音 / 看图 / 词义</div>
        </div>
        <div class="stat-card" onclick="showTasks()" style="cursor:pointer">
          <div style="font-size:40px">📋</div>
          <div class="stat-label">AI 专属任务单</div>
          <div style="font-size:13px;color:var(--primary);margin-top:4px">分层个性化学习</div>
        </div>
        <div class="stat-card" onclick="showErrorBook()" style="cursor:pointer">
          <div style="font-size:40px">📕</div>
          <div class="stat-label">错题本</div>
          <div style="font-size:13px;color:var(--primary);margin-top:4px">错题自动收录</div>
        </div>
      </div>

      <div class="card">
        <h3 style="margin-bottom:12px">🔄 浏览各层任务单</h3>
        <p style="color:var(--text-light);font-size:14px;margin-bottom:12px">查看不同层级的 AI 任务单（仅预览，实际任务由 AI 根据你的闯关成绩推送）</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-outline" onclick="browseTierTasks('C')">C 入门层</button>
          <button class="btn btn-outline" onclick="browseTierTasks('B')">B 基础层</button>
          <button class="btn btn-outline" onclick="browseTierTasks('A')">A 巩固层</button>
        </div>
      </div>
    </div>

    <!-- Game -->
    <div id="view-game" class="view hidden">
      <div class="app-header">
        <h1>🎮 单词闯关</h1>
        <p><span id="gameType"></span> · 第 <span id="gameCounter">0 / 0</span> 题</p>
      </div>
      <div class="progress-bar"><div id="gameProgress" class="progress-fill" style="width:0%"></div></div>
      <div class="card" id="questionBox"></div>
    </div>

    <!-- Game Result -->
    <div id="view-result" class="view hidden">
      <div class="app-header">
        <h1>🎉 闯关完成！</h1>
        <p>AI 已根据你的答题情况自动分层</p>
      </div>
      <div class="card" style="text-align:center">
        <div id="resultCircle" class="result-circle" style="background:#6c5ce7">
          <span id="resultRate">0%</span>
        </div>
        <div style="font-size:18px;margin-bottom:8px">正确题数：<strong id="resultCorrect">0 / 0</strong></div>
        <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin:16px 0">
          <div id="resultTierBadge" class="tier-badge">?</div>
          <div style="text-align:left">
            <div style="font-size:20px;font-weight:700" id="resultTierName">-</div>
            <div style="color:var(--text-light);font-size:14px" id="resultTierDesc">-</div>
          </div>
        </div>
        <div class="hidden" id="wrongWordsSection">
          <h4 style="margin-bottom:8px">❌ 答错的单词</h4>
          <div id="wrongWordsList"></div>
        </div>
        <div style="margin-top:20px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="showTasks()">领取 AI 专属任务单 →</button>
          <button class="btn btn-outline" onclick="startGame()">再玩一次</button>
          <button class="btn btn-ghost" onclick="showMenu()">返回主页</button>
        </div>
      </div>
    </div>

    <!-- Tasks -->
    <div id="view-tasks" class="view hidden">
      <div class="app-header">
        <h1 id="taskTitle">📋 AI 专属任务单</h1>
        <p id="taskGoal"></p>
        <div class="header-right">
          <button class="btn btn-ghost" style="color:white;border-color:rgba(255,255,255,0.4)" onclick="showMenu()">← 返回</button>
        </div>
      </div>
      <div id="taskSections"></div>
    </div>

    <!-- Task Quiz -->
    <div id="view-taskquiz" class="view hidden">
      <div class="app-header">
        <h1>🔍 AI 小检测</h1>
        <p><span id="tqType"></span> · 第 <span id="tqCounter">0 / 0</span> 题</p>
      </div>
      <div class="progress-bar"><div id="tqProgress" class="progress-fill" style="width:0%"></div></div>
      <div class="card" id="tqBox"></div>
    </div>

    <!-- Error Book -->
    <div id="view-errorbook" class="view hidden">
      <div class="app-header">
        <h1>📕 我的错题本</h1>
        <p>AI 自动收录你答错的单词，方便针对性复习</p>
        <div class="header-right">
          <button class="btn btn-ghost" style="color:white;border-color:rgba(255,255,255,0.4)" onclick="showMenu()">← 返回</button>
        </div>
      </div>
      <div class="card">
        <div id="errorBookList"></div>
      </div>
    </div>
  </div>

  <script src="js/data.js"></script>
  <script src="js/student.js"></script>
</body>
</html>
