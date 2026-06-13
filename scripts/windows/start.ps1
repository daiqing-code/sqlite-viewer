param(
    [string]$Action = "start"
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Resolve-Path "$ScriptDir\..\.."

function Write-Step {
    param([string]$Msg)
    Write-Host "   $Msg"
}

Write-Host "🚀 [start] 启动服务"
Write-Host "   目录: $ProjectDir"

$node = Get-Command "node" -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host ""
    Write-Host "   ❌ 未找到 Node.js，请先安装 https://nodejs.org"
    exit 1
}

if (-not (Test-Path "$ProjectDir\node_modules")) {
    Write-Host ""
    Write-Host "   ❌ node_modules 不存在，请先运行:"
    Write-Host "      .\scripts\windows\install.ps1"
    exit 1
}

if (-not (Test-Path "$ProjectDir\dist\index.html")) {
    Write-Host ""
    Write-Host "   ❌ 前端未构建，请先运行:"
    Write-Host "      .\scripts\windows\install.ps1"
    exit 1
}

# 检查端口
$portInUse = (Get-NetTCPConnection -LocalPort 18788 -ErrorAction SilentlyContinue)
if ($portInUse) {
    Write-Host ""
    Write-Host "   ⚠️  端口 18788 已被占用"
    exit 1
}

Write-Host ""
if ($Action -eq "dev") {
    Write-Host "   🧪 开发模式 (热加载)"
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "cmd.exe"
    $psi.Arguments = "/c start `"Vite Dev`" cmd /k cd /d `"$ProjectDir`" && npx vite --host"
    $psi.UseShellExecute = $true
    [System.Diagnostics.Process]::Start($psi)

    node "$ProjectDir\server.cjs"
} else {
    Write-Host "   🌐 http://localhost:18788"
    Write-Host ""
    node "$ProjectDir\server.cjs"
}
