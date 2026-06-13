# 记忆库查看器

基于 OpenClaw 记忆库（SQLite）的 Web 查看 & 编辑器，支持 Linux 和 Windows。

---

## Linux

### 快速启动

```bash
cd sqlite-viewer
bash scripts/linux/start.sh
```

### 安装为系统服务（开机自启）

```bash
bash scripts/linux/install.sh
```

安装后服务随 gateway 自动启停。

### 开发模式（热加载）

```bash
bash scripts/linux/start.sh --dev
```

---

## Windows

### 快速启动

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

安装后会注册一个计划任务，开机自动运行守护脚本。守护脚本每 5 秒检测 OpenClaw gateway 进程，gateway 启动时自动拉起后端，gateway 关闭时自动停止。

### 卸载

以管理员身份打开 PowerShell：

```powershell
Unregister-ScheduledTask -TaskName "sqlite-viewer-guard" -Confirm:$false
```

---

## 目录结构

```
sqlite-viewer/
├── config.json         配置（端口、路径、agentID 等）
├── server.cjs          后端服务
├── scripts/
│   ├── linux/              Linux 脚本
│   │   ├── install.sh     安装
│   │   ├── start.sh       启动
│   │   └── guard.sh       守护
│   └── windows/
│       ├── install.ps1 Windows 安装（注册计划任务）
│       ├── start.ps1   Windows 启动
│       └── guard.ps1   Windows 守护（计划任务调用）
├── src/                前端源码
└── dist/               构建产物
```

## 功能说明

### 工作区

显示 IDENTITY.md、MEMORY.md、SOUL.md 等核心文件，支持在线编辑保存。

### 技能

左侧显示所有技能目录，展开后显示目录内文件。点击技能目录直接在右侧编辑 SKILL.md，点击子文件编辑对应文件。

### 数据库

显示 memory/ 目录文件的数据库索引分块，按月分组，支持分块/源码/详情三种视图。

### 记忆

以同样按月分组结构显示 memory/ 下的文件，点击后在右侧编辑器中修改，保存后自动更新数据库索引。

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

### 修改 IDENTITY.md 的名字后页面标题没变？

不需要重启，刷新页面即可。名字从 `IDENTITY.md` 的 `**Name:**` 动态读取。

### 手动在 memory/ 下添加了文件，数据库里没有？

有以下方式触发索引：
- 通过编辑器保存文件（自动触发索引并重启服务）
- 或者重启服务

**Linux:** `fuser -k 18788/tcp`

**Windows:** `Stop-Process -Id (Get-NetTCPConnection -LocalPort 18788).OwningProcess -Force`

### 18788 端口被占用？

改 `config.json` 里的 `port` 字段，重启服务。

### 保存后页面转圈 / 数据没更新？

保存记忆文件时会自动索引并重启服务，等 5-8 秒再刷新即可。如果超过 10 秒还没恢复，手动重启服务。

### 只想试用，不想注册服务？

**Linux:** `bash scripts/linux/start.sh`，Ctrl+C 停止

**Windows:** `.\scripts\windows\start.ps1`，Ctrl+C 停止

### 换设备怎么迁移？

复制整个 `sqlite-viewer/` 目录到新设备，运行对应平台的安装脚本。

**Linux:** `bash scripts/linux/install.sh`

**Windows:** 管理员 PowerShell 运行 `.\scripts\windows\install.ps1`

### 备份文件在哪？

`workspace/backups/` 目录下，每个文件只保留最新一份备份。
