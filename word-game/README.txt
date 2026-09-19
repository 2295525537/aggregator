========================================
  AI 单词闯关游戏 - 使用说明
========================================

【项目简介】
Unit 3 单词（身体部位与外貌）AI 闯关游戏，包含：
- 学生端：听音选词 / 看图猜词 / 词义匹配 闯关游戏
- AI 自动分层：C入门层(<60%) / B基础层(60-85%) / A巩固层(>85%)
- 分层个性化任务单 + AI自动批改 + 错题本
- 教师后台：实时学情仪表盘 + 分层统计柱状图

【运行环境】
需要安装 Node.js（建议 v16 及以上）
下载地址：https://nodejs.org/

【启动方法】

▶ Windows 用户：
  双击 start.bat 即可自动安装依赖并启动

▶ Mac / Linux 用户：
  终端执行：chmod +x start.sh && ./start.sh

▶ 手动启动：
  1. 打开终端/命令行，进入项目目录
  2. 执行：npm install
  3. 执行：node server.js

【访问地址】
启动成功后，浏览器打开：
  学生端：  http://localhost:3000
  教师后台：http://localhost:3000/dashboard.html
  教师密码：7405211

【注意事项】
1. 不要直接双击打开 index.html，必须通过启动脚本运行服务器后访问
2. 学生数据保存在 data/db.json，删除该文件可清空所有数据
3. 关闭启动窗口即停止服务

【目录结构】
  server.js              后端服务
  package.json           依赖配置
  start.bat              Windows 一键启动
  start.sh               Mac/Linux 启动脚本
  public/
    index.html           学生端页面
    dashboard.html       教师后台页面
    css/style.css        样式文件
    js/data.js           单词库与任务生成
    js/student.js        学生端逻辑
    js/dashboard.js      教师后台逻辑
