#!/bin/bash
# 临时启动（自动装依赖 + 构建，不注册服务）
# 用法:
#   bash scripts/linux/start.sh         启动后端
#   bash scripts/linux/start.sh --dev   开发模式 (热加载)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG="$PROJECT_DIR/config.json"
PORT=$(grep -oP '(?<="port": )\d+' "$CONFIG" 2>/dev/null || echo 18788)

echo "🚀 [start] 启动服务"

# 1. 检查/安装依赖
if [ ! -d "$PROJECT_DIR/node_modules" ]; then
  echo "   📥 安装依赖..."
  cd "$PROJECT_DIR" && npm install --silent
  echo "   ✅"
fi

# 2. 检查/构建前端
if [ ! -f "$PROJECT_DIR/dist/index.html" ]; then
  echo "   🔨 构建前端..."
  cd "$PROJECT_DIR" && npm run build
  echo "   ✅"
fi

# 3. 检查端口
if ss -tlnp 2>/dev/null | grep -q ":$PORT "; then
  echo ""
  echo "   ⚠️  端口 $PORT 已被占用"
  echo "      fuser -k ${PORT}/tcp"
  exit 1
fi

echo ""
echo "   🌐 http://localhost:${PORT}"
echo ""

if [ "$1" = "--dev" ]; then
  echo "   🧪 开发模式 (热加载)"
  /usr/bin/node "$PROJECT_DIR/server.cjs" &
  SERVER_PID=$!
  cd "$PROJECT_DIR" && npx vite --host
  kill $SERVER_PID 2>/dev/null
else
  /usr/bin/node "$PROJECT_DIR/server.cjs"
fi
