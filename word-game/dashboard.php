<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>教师后台 - AI 单词闯关学情仪表盘</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <button class="bgm-btn" id="bgmBtn" onclick="toggleBgm()" title="点击开关背景音乐">🎵</button>
  <!-- Login -->
  <div id="view-login" class="login-wrap">
    <div class="login-card">
      <div class="deco-emoji">👨‍🏫</div>
      <h1>教师后台</h1>
      <p class="subtitle">AI 单词闯关 · 实时学情仪表盘</p>
      <input id="pwdInput" type="password" class="input" placeholder="请输入登录密码" autofocus>
      <div id="loginError" style="color:var(--danger);font-size:13px;margin-top:8px;min-height:18px"></div>
      <button class="btn btn-primary btn-block" style="margin-top:8px" onclick="doLogin()">登录</button>
      <p style="margin-top:16px;font-size:13px;color:var(--text-light)">
        <a href="index.php" style="color:var(--primary)">← 返回学生端</a>
      </p>
    </div>
  </div>

  <!-- Dashboard -->
  <div id="view-dashboard" class="hidden">
    <div class="container">
      <div class="app-header">
        <h1>📊 AI 学情仪表盘</h1>
        <p>实时统计学生答题数据，自动分层一目了然</p>
        <div class="header-right">
          <button class="btn btn-ghost" style="color:white;border-color:rgba(255,255,255,0.4)" onclick="loadStats()">🔄 刷新</button>
          <button class="btn btn-ghost" style="color:white;border-color:rgba(255,255,255,0.4)" onclick="logout()">退出</button>
        </div>
      </div>

      <!-- Stats overview -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value" id="statStudents">0</div>
          <div class="stat-label">参与学生数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" id="statGames">0</div>
          <div class="stat-label">闯关总次数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" id="statRate">0%</div>
          <div class="stat-label">整体正确率</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" id="statTasks">0</div>
          <div class="stat-label">任务完成次数</div>
        </div>
      </div>

      <!-- Tier bar chart -->
      <div class="card">
        <h3 style="margin-bottom:16px">📈 学生分层统计</h3>
        <div class="bar-chart" id="barChart"></div>
      </div>

      <!-- Student list -->
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px">
          <h3>👥 学生完成情况</h3>
          <div style="display:flex;gap:8px">
            <button class="nav-tab active" onclick="filterStudents('all',this)">全部</button>
            <button class="nav-tab" onclick="filterStudents('A',this)">A 巩固层</button>
            <button class="nav-tab" onclick="filterStudents('B',this)">B 基础层</button>
            <button class="nav-tab" onclick="filterStudents('C',this)">C 入门层</button>
          </div>
        </div>
        <div id="studentList"></div>
      </div>
    </div>
  </div>

  <!-- Student detail modal -->
  <div id="detailModal" class="modal-overlay hidden">
    <div class="modal" style="max-width:700px;max-height:85vh;overflow-y:auto">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <h3 id="detailName">学生详情</h3>
        <button class="btn btn-ghost" onclick="closeDetail()" style="padding:4px 10px">✕</button>
      </div>
      <div id="detailBody"></div>
    </div>
  </div>

  <script src="js/data.js"></script>
  <script src="js/dashboard.js"></script>
</body>
</html>
