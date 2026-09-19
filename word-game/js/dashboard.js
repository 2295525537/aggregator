// Teacher Dashboard
// API 使用查询字符串传参（兼容所有 PHP 虚拟主机，无需 PATH_INFO 支持）
const API_BASE = 'api.php?path=';
let teacherToken = localStorage.getItem('wordgame_teacher_token') || null;
let allStudents = [];
let currentFilter = 'all';

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (teacherToken) headers['Authorization'] = 'Bearer ' + teacherToken;
  const realPath = path.replace(/^\/api\//, '');
  const url = API_BASE + realPath;
  const res = await fetch(url, { headers, ...opts, body: opts.body ? JSON.stringify(opts.body) : undefined });
  return res.json();
}

function logout() {
  teacherToken = null;
  localStorage.removeItem('wordgame_teacher_token');
  document.getElementById('view-login').classList.remove('hidden');
  document.getElementById('view-dashboard').classList.add('hidden');
}

async function doLogin() {
  const pwd = document.getElementById('pwdInput').value;
  if (!pwd) { alert('请输入密码'); return; }
  const res = await api('/api/teacher/login', { method: 'POST', body: { password: pwd } });
  if (res.ok) {
    teacherToken = res.token;
    localStorage.setItem('wordgame_teacher_token', teacherToken);
    document.getElementById('view-login').classList.add('hidden');
    document.getElementById('view-dashboard').classList.remove('hidden');
    loadStats();
  } else {
    alert(res.error || '登录失败');
    document.getElementById('pwdInput').value = '';
  }
}

async function loadStats() {
  const stats = await api('/api/teacher/stats');
  if (stats.error) { logout(); return; }

  document.getElementById('statStudents').textContent = stats.totalStudents;
  document.getElementById('statGames').textContent = stats.totalGames;
  document.getElementById('statRate').textContent = Math.round(stats.overallRate * 100) + '%';
  let taskCount = 0;
  stats.students.forEach(s => taskCount += s.taskCount);
  document.getElementById('statTasks').textContent = taskCount;

  renderBarChart(stats.tierCount);
  allStudents = stats.students;
  renderStudentList();
}

function renderBarChart(tierCount) {
  const tiers = [
    { key: 'A', name: 'A 巩固层', desc: '正确率 > 85%', color: '#00b894', count: tierCount.A || 0 },
    { key: 'B', name: 'B 基础层', desc: '正确率 60%-85%', color: '#fdcb6e', count: tierCount.B || 0 },
    { key: 'C', name: 'C 入门层', desc: '正确率 < 60%', color: '#e17055', count: tierCount.C || 0 },
    { key: 'unranked', name: '未参与', desc: '暂无数据', color: '#b2bec3', count: tierCount.unranked || 0 }
  ];
  const max = Math.max(...tiers.map(t => t.count), 1);
  const chart = document.getElementById('barChart');
  chart.innerHTML = tiers.map(t => `
    <div class="bar-col">
      <div style="position:relative">
        <div class="bar" style="height:${(t.count/max)*180}px;background:${t.color};min-height:4px">
          <div class="bar-label-top">${t.count}</div>
        </div>
      </div>
      <div class="bar-label">${t.name}</div>
      <div class="bar-sub">${t.desc}</div>
    </div>
  `).join('');
}

function renderStudentList() {
  const list = document.getElementById('studentList');
  let students = allStudents;
  if (currentFilter !== 'all') {
    students = students.filter(s => s.tier === currentFilter);
  }
  if (students.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="emoji">📭</div><p>暂无学生数据</p></div>`;
    return;
  }
  list.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>姓名</th>
          <th>层级</th>
          <th>闯关次数</th>
          <th>最近正确率</th>
          <th>任务完成</th>
          <th>错题数</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        ${students.map(s => `
          <tr>
            <td><strong>${s.name}</strong></td>
            <td>${s.tier ? `<span class="tag tag-tier-${s.tier}">${s.tier} ${TIER_INFO[s.tier].name}</span>` : '<span style="color:var(--text-light)">未分层</span>'}</td>
            <td>${s.gameCount}</td>
            <td>${s.lastGame ? Math.round(s.lastGame.rate*100)+'%' : '-'}</td>
            <td>${s.taskCount}</td>
            <td>${s.errorBook.length}</td>
            <td>
              <button class="btn btn-ghost" style="padding:4px 10px" onclick="showDetail('${s.id}')">详情</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function filterStudents(tier, btn) {
  currentFilter = tier;
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderStudentList();
}

function showDetail(sid) {
  const s = allStudents.find(x => x.id === sid);
  if (!s) return;
  document.getElementById('detailName').textContent = s.name + ' 的学情详情';
  const body = document.getElementById('detailBody');

  const tierOptions = ['A','B','C'].map(t => `<option value="${t}" ${s.tier===t?'selected':''}>${t} - ${TIER_INFO[t].name}</option>`).join('');

  let html = `
    <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px">
      <div class="tier-badge ${s.tier||''}" style="width:48px;height:48px;font-size:20px">${s.tier||'?'}</div>
      <div>
        <div style="font-weight:700;font-size:18px">${s.name}</div>
        <div style="color:var(--text-light);font-size:13px">加入时间：${new Date(s.createdAt).toLocaleString('zh-CN')}</div>
      </div>
    </div>

    <div class="task-section">
      <h3>🏷️ 调整学生层级</h3>
      <div style="display:flex;gap:8px;align-items:center">
        <select class="input" style="max-width:200px" id="tierSelect">
          <option value="" ${!s.tier?'selected':''}>未分层</option>
          ${tierOptions}
        </select>
        <button class="btn btn-primary" onclick="updateTier('${s.id}')">保存</button>
      </div>
    </div>

    <div class="task-section">
      <h3>🎮 闯关记录</h3>
      ${s.gameResults.length === 0 ? '<p style="color:var(--text-light)">暂无闯关记录</p>' :
        s.gameResults.slice().reverse().map((r,i) => `
          <div class="task-question">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div>
                <strong>第 ${s.gameResults.length - i} 次</strong>
                <span class="tag tag-tier-${r.tier}" style="margin-left:8px">${r.tier}</span>
              </div>
              <div style="color:var(--text-light);font-size:13px">${new Date(r.date).toLocaleString('zh-CN')}</div>
            </div>
            <div style="margin-top:6px">正确 <strong>${r.correct}</strong> / ${r.total} · 正确率 <strong>${Math.round(r.rate*100)}%</strong></div>
            ${r.wrongWords.length > 0 ? `<div style="margin-top:4px;color:var(--danger);font-size:13px">错题：${r.wrongWords.join(', ')}</div>` : ''}
          </div>
        `).join('')
      }
    </div>

    <div class="task-section">
      <h3>📋 任务完成记录</h3>
      ${s.taskResults.length === 0 ? '<p style="color:var(--text-light)">暂无任务记录</p>' :
        s.taskResults.slice().reverse().map(r => `
          <div class="task-question">
            <div style="display:flex;justify-content:space-between">
              <div><strong>${r.taskTier}层 · ${r.taskType}</strong></div>
              <div style="color:var(--text-light);font-size:13px">${new Date(r.date).toLocaleString('zh-CN')}</div>
            </div>
            <div style="margin-top:6px">正确 <strong>${r.correct}</strong> / ${r.total} · 正确率 <strong>${Math.round(r.rate*100)}%</strong></div>
            ${r.wrongWords.length > 0 ? `<div style="margin-top:4px;color:var(--danger);font-size:13px">错题：${r.wrongWords.join(', ')}</div>` : ''}
          </div>
        `).join('')
      }
    </div>

    <div class="task-section">
      <h3>📕 错题本 (${s.errorBook.length})</h3>
      ${s.errorBook.length === 0 ? '<p style="color:var(--text-light)">暂无错题</p>' :
        `<div class="word-list">${s.errorBook.map(w => {
          const wd = WORD_MAP[w];
          return `<div class="word-item"><div><div class="w-en">${w}</div><div class="w-cn">${wd?wd.meaning:''}</div></div></div>`;
        }).join('')}</div>`
      }
    </div>
  `;
  body.innerHTML = html;
  document.getElementById('detailModal').classList.remove('hidden');
}

function closeDetail() {
  document.getElementById('detailModal').classList.add('hidden');
}

async function updateTier(sid) {
  const tier = document.getElementById('tierSelect').value || null;
  if (!tier) { alert('请选择层级'); return; }
  await api(`/api/students/${sid}/tier`, { method: 'POST', body: { tier } });
  alert('层级已更新');
  closeDetail();
  loadStats();
}

// Init
document.getElementById('pwdInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});
if (teacherToken) {
  document.getElementById('view-login').classList.add('hidden');
  document.getElementById('view-dashboard').classList.remove('hidden');
  loadStats();
}

// Auto-refresh every 10 seconds
setInterval(() => {
  if (teacherToken && !document.getElementById('view-dashboard').classList.contains('hidden')) {
    loadStats();
  }
}, 10000);
