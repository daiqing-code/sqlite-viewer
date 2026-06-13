#!/bin/bash
# 安装 & 注册系统服务
# 用法: bash scripts/install.sh

set -e

SERVER_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG="${SERVER_DIR}/config.json"
SERVICE_NAME="sqlite-viewer"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

echo "📦 [install] 安装部署..."
echo "   目录: $SERVER_DIR"

echo ""
echo "📥 [1/4] 安装依赖..."
cd "$SERVER_DIR"
npm install --silent
echo "   ✅"

echo ""
echo "🔨 [2/4] 构建前端..."
npm run build
echo "   ✅"

echo ""
echo "⚙️  [3/4] 注册系统服务..."
cat > /tmp/${SERVICE_NAME}.service << EOF
[Unit]
Description=记忆库服务 (端口 $(grep -oP '(?<="port": )\d+' "$CONFIG"))
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=${SERVER_DIR}
ExecStart=/usr/bin/node ${SERVER_DIR}/server.cjs
Restart=on-failure
RestartSec=5
StandardOutput=append:/tmp/${SERVICE_NAME}.log
StandardError=append:/tmp/${SERVICE_NAME}.log

[Install]
WantedBy=multi-user.target
EOF

sudo mv /tmp/${SERVICE_NAME}.service "$SERVICE_FILE"
sudo systemctl daemon-reload
sudo systemctl enable ${SERVICE_NAME}
echo "   ✅"

echo ""
echo "🚀 [4/4] 启动服务..."
sudo systemctl restart ${SERVICE_NAME}
sleep 2

if systemctl is-active --quiet ${SERVICE_NAME}; then
  echo "   ✅"
  echo ""
  echo "  🌐 http://localhost:$(grep -oP '(?<="port": )\d+' "$CONFIG")"
  echo "  📋 systemctl status ${SERVICE_NAME}"
  echo "  🛑 systemctl stop ${SERVICE_NAME}"
  echo "  🔄 systemctl restart ${SERVICE_NAME}"
  echo "  ❌ systemctl disable --now ${SERVICE_NAME}"
else
  echo "   ⚠️  启动失败，查看日志: journalctl -u ${SERVICE_NAME} -n 30"
fi
