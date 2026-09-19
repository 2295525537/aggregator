@echo off
chcp 65001 >nul
echo ========================================
echo   AI 单词闯关游戏 - 启动中...
echo ========================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js
    echo 下载地址: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

if not exist node_modules (
    echo [1/2] 首次运行，正在安装依赖...
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败，请检查网络
        pause
        exit /b 1
    )
)

echo [2/2] 启动服务器...
echo.
echo ========================================
echo   服务已启动！
echo   学生端:  http://localhost:3000
echo   教师后台: http://localhost:3000/dashboard.html
echo   教师密码: 7405211
echo ========================================
echo.
echo 关闭此窗口即停止服务
echo.

node server.js
pause
