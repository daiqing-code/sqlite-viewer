$OutputEncoding = [console]::OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 > $null 2>&1


# 安装 & 注册守护服务（计划任务开机自启）
# 以管理员身份运行
# 用法: .\scripts\windows\install.ps1

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Resolve-Path "$ScriptDir\..\.."
$TaskName = "sqlite-viewer-guard"

# 检查管理员权限
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ 请以管理员身份运行 PowerShell"
    exit 1
}

Write-Host "📦 [install] 安装部署..."
Write-Host "   目录: $ProjectDir"

# 1. 安装依赖
Write-Host ""
Write-Host "📥 [1/4] 安装依赖..."
Set-Location $ProjectDir
npm install --silent
Write-Host "   ✅"

# 2. 构建前端
Write-Host ""
Write-Host "🔨 [2/4] 构建前端..."
npm run build
Write-Host "   ✅"

# 3. 注册计划任务（开机自启 + 登录时启动守护）
Write-Host ""
Write-Host "⚙️  [3/4] 注册计划任务 (${TaskName})..."

$guardPs1 = "$ProjectDir\scripts\windows\guard.ps1"
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$guardPs1`" -Action guard"
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest -Force
Write-Host "   ✅"

# 4. 启动守护
Write-Host ""
Write-Host "🚀 [4/4] 启动守护..."
Start-Process powershell.exe -ArgumentList "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$guardPs1`" -Action guard"
Write-Host "   ✅"

Write-Host ""
Write-Host "  🌐 http://localhost:18788"
Write-Host ""
Write-Host "  守护脚本已注册为计划任务，每次登录自动运行。"
Write-Host "  OpenClaw gateway 启动时自动拉起服务，关闭时自动停止。"
Write-Host ""
Write-Host "  卸载: Unregister-ScheduledTask -TaskName `"$TaskName`" -Confirm:`$false"
