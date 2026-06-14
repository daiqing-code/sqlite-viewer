# 记忆库查看器

基于 OpenClaw 记忆库（SQLite）的 Web 查看 & 编辑器，支持 Linux 和 Windows。

---

## Linux

### 快速启动（自动装依赖 + 构建 + 启动）

```bash
cd sqlite-viewer
bash scripts/linux/start.sh
```

### 安装为系统服务（开机自启）

装依赖 → 构建前端 → 注册 systemd 服务 → 开机自启。

```bash
bash scripts/linux/install.sh
```

### 开发模式（热加载）

```bash
bash scripts/linux/start.sh --dev
```

---

## Windows

### 快速启动（自动装依赖 + 构建 + 启动）

以管理员身份打开 PowerShell：

```powershell
cd sqlite-viewer
.\scripts\windows\start.ps1
```

### 安装守护服务（开机自启）

以管理员身份打开 PowerShell：

```powershell
.\scripts\windows\install.ps1
```

---

## 目录结构

```
sqlite-viewer/
├── config.json          配置（端口、路径、agentID 等）
├── server.cjs           后端服务
├── scripts/             启动/安装/守护脚本
├── src/                 前端源码
│   ├── App.tsx          主应用（竖排 tab 导航 + 侧边栏 + 编辑器）
│   ├── main.tsx         入口
│   ├── utils/api.ts     API 层
│   ├── types/           类型定义
│   ├── styles/          CSS（按模块拆分为 6 个小文件）
│   └── themes.json      主题色配置（亮/暗 + 5 种强调色）
├── dist/                构建产物
└── GIT_HELP.md          本地 Git 备忘（不上传）
```

## 功能说明

### 导航

竖排 tab 栏在左侧，从上到下：
- **工作区** — 显示核心文件（IDENTITY.md、MEMORY.md 等），支持在线编辑保存
- **技能** — 展开显示技能目录及文件，点击编辑
- **数据库** — memory/ 的 SQLite 索引分块（按月分组），支持搜索和多视图
- **设置**（底部齿轮图标）— Logo、标题、强调色、亮暗模式

### 自定义外观

在设置页可配置：
- **Logo** 支持 Emoji 点选或预设 SVG 图标（8 个内置图标）
- **标题** 自定义头部显示标题
- **强调色** 5 种可选（靛蓝、翠绿、琥珀、玫瑰、紫罗兰）
- **亮暗模式**

## 配置

编辑 `config.json` 可修改：

| 字段 | 默认值 | 说明 |
|------|--------|------|
| port | 18788 | 服务端口 |
| dbSubPath | .openclaw/memory/main.sqlite | 数据库路径（相对于 OPENCLAW_HOME 或 HOME） |
| workspaceSubPath | .openclaw/workspace | 工作区路径 |
| backupDirName | backups | 文件修改时的备份目录名 |
| agentId | "" | 记忆索引使用的 agent ID（为空时自动检测） |
| indexTimeoutMs | 30000 | memory index 超时时间 |
| restartDelayMs | 2000 | 索引完成后自动重启延迟 |

## 常见问题

### 端口 18788 被占用？

改 `config.json` 里的 `port` 字段，重启服务。

### 只想试用，不想注册服务？

**Linux:** `bash scripts/linux/start.sh`，Ctrl+C 停止

**Windows:** `.\scripts\windows\start.ps1`，Ctrl+C 停止

### 换设备怎么迁移？

复制整个 `sqlite-viewer/` 目录到新设备，运行对应平台的安装脚本。

**Linux:** `bash scripts/linux/install.sh`

**Windows:** 管理员 PowerShell 运行 `.\scripts\windows\install.ps1`
