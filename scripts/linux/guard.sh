#!/bin/bash
# 守护脚本 — 检测 gateway 进程 + 监控 memory/ 目录自动索引
# 用法: bash scripts/guard.sh

CONFIG="$(cd "$(dirname "$0")/.." && pwd)/config.json"
PORT=$(grep -oP '(?<="port": )\d+' "$CONFIG")
AGENT_ID=$(grep -oP '(?<="agentId": ")[^"]*' "$CONFIG")
if [ -z "$AGENT_ID" ]; then AGENT_ID="main"; fi
SERVER_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVER_CMD="/usr/bin/node ${SERVER_DIR}/server.cjs"
PIDFILE="/tmp/guarded-sqlite-viewer.pid"
WATCH_PIDFILE="/tmp/guarded-sqlite-watcher.pid"
WORKSPACE_DIR="${SERVER_DIR}/.."
MEMORY_DIR="${WORKSPACE_DIR}/memory"

cleanup() {
  local pid
  if [[ -f "$PIDFILE" ]]; then
    pid=$(cat "$PIDFILE" 2>/dev/null)
    [[ -n "$pid" ]] && kill "$pid" 2>/dev/null
    rm -f "$PIDFILE"
  fi
  if [[ -f "$WATCH_PIDFILE" ]]; then
    pid=$(cat "$WATCH_PIDFILE" 2>/dev/null)
    [[ -n "$pid" ]] && kill "$pid" 2>/dev/null
    rm -f "$WATCH_PIDFILE"
  fi
  orphan_pid=$(pgrep -f "server\.cjs" 2>/dev/null)
  if [[ -n "$orphan_pid" ]]; then
    kill "$orphan_pid" 2>/dev/null
  fi
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

INOTIFY_AVAILABLE=false
if command -v inotifywait &>/dev/null; then
  INOTIFY_AVAILABLE=true
fi

echo "🔍 [守护] 开始监控..."
echo "   端口: $PORT"
if $INOTIFY_AVAILABLE; then
  echo "   文件监听: inotify ✅"
else
  echo "   文件监听: 轮询模式"
fi

start_watcher() {
  if [[ -f "$WATCH_PIDFILE" ]] && kill -0 "$(cat "$WATCH_PIDFILE" 2>/dev/null)" 2>/dev/null; then
    return
  fi

  if $INOTIFY_AVAILABLE && [[ -d "$MEMORY_DIR" ]]; then
    (
      while true; do
        inotifywait -q -r -e modify -e create -e delete -e move "$MEMORY_DIR" 2>/dev/null
        if [[ $? -eq 0 ]]; then
          echo "[守护] memory/ 文件变更 → 触发索引"
          openclaw memory index --agent $AGENT_ID 2>/dev/null
        fi
      done
    ) &
    echo $! > "$WATCH_PIDFILE"
  elif [[ -d "$MEMORY_DIR" ]]; then
    (
      declare -A last_mtimes
      for f in "$MEMORY_DIR"/*.md; do
        [[ -f "$f" ]] && last_mtimes["$f"]=$(stat -c %Y "$f")
      done
      while true; do
        sleep 1
        for f in "$MEMORY_DIR"/*.md; do
          [[ -f "$f" ]] || continue
          current=$(stat -c %Y "$f")
          if [[ "${last_mtimes[$f]:-0}" -ne "$current" ]]; then
            last_mtimes["$f"]=$current
            echo "[守护] 文件变更: $(basename "$f") → 触发索引"
            openclaw memory index --agent $AGENT_ID 2>/dev/null
            break
          fi
        done
      done
    ) &
    echo $! > "$WATCH_PIDFILE"
  fi
}

stop_watcher() {
  if [[ -f "$WATCH_PIDFILE" ]]; then
    local pid=$(cat "$WATCH_PIDFILE" 2>/dev/null)
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null
    fi
    rm -f "$WATCH_PIDFILE"
  fi
}

while true; do
  if pgrep -f "index\.js.*gateway" >/dev/null 2>&1 || pgrep -f "openclaw.*gateway" >/dev/null 2>&1 || pgrep -f "hermes.*gateway" >/dev/null 2>&1; then
    if ! pgrep -f "server\.cjs" >/dev/null 2>&1; then
      echo "[守护] gateway 已启动 → 启动服务"
      nohup $SERVER_CMD > /tmp/sqlite-viewer.log 2>&1 &
      echo $! > "$PIDFILE"
      start_watcher
    fi
  else
    local_pid=$(cat "$PIDFILE" 2>/dev/null)
    if [[ -n "$local_pid" ]] && kill -0 "$local_pid" 2>/dev/null; then
      echo "[守护] gateway 已关闭 → 停止服务"
      kill "$local_pid" 2>/dev/null
      rm -f "$PIDFILE"
    fi
    stop_watcher
    orphan_pid=$(pgrep -f "server\.cjs" 2>/dev/null)
    if [[ -n "$orphan_pid" ]]; then
      kill "$orphan_pid" 2>/dev/null
    fi
  fi
  sleep 5
done
