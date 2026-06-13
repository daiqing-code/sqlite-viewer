#!/bin/bash
# 临时启动（不注册系统服务）
# 用法:
#   bash scripts/start.sh         启动后端
#   bash scripts/start.sh --dev   开发模式 (热加载)

SERVER_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG="$(cd "$(dirname "$0")/.." && pwd)/config.json"
PORT=$(grep -oP '(?<="port": )\d+' "$CONFIG")

echo "🚀 [start] 启动服务"
echo "   目录: $SERVER_DIR"

if [ ! -d "$SERVER_DIR/node_modules" ]; then
  echo ""
  echo "   ❌ node_modules 不存在，请先运行: bash scripts/install.sh"
  exit 1
fi

if [ ! -f "$SERVER_DIR/dist/index.html" ]; then
  echo ""
  echo "   ❌ 前端未构建，请先运行: bash scripts/install.sh"
  exit 1
fi

if ss -tlnp 2>/dev/null | grep -q ":$PORT "; then
  echo ""
  echo "   ⚠️  端口 $PORT 已被占用"
  echo "      fuser -k ${PORT}/tcp"
  exit 1
fi

echo ""
if [ "$1" = "--dev" ]; then
  echo "   🧪 开发模式 (热加载)"
  /usr/bin/node "$SERVER_DIR/server.cjs" &
  SERVER_PID=$!
  cd "$SERVER_DIR"
  npx vite --host
  kill $SERVER_PID 2>/dev/null
else
  echo "   🌐 http://localhost:${PORT}"
  echo ""
  /usr/bin/node "$SERVER_DIR/server.cjs"
fi
