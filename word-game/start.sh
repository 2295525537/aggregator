#!/bin/bash
echo "========================================"
echo "  AI 单词闯关游戏 - 启动中..."
echo "========================================"
echo ""

if ! command -v node &> /dev/null; then
    echo "[错误] 未检测到 Node.js，请先安装 Node.js"
    echo "下载地址: https://nodejs.org/"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "[1/2] 首次运行，正在安装依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "[错误] 依赖安装失败，请检查网络"
        exit 1
    fi
fi

echo "[2/2] 启动服务器..."
echo ""
echo "========================================"
echo "  服务已启动！"
echo "  学生端:  http://localhost:3000"
echo "  教师后台: http://localhost:3000/dashboard.html"
echo "  教师密码: 7405211"
echo "========================================"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

node server.js
