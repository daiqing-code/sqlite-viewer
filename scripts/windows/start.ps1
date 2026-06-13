$OutputEncoding = [console]::OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 > $null 2>&1


param(
    [string]$Action = "start"
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Resolve-Path "$ScriptDir\..\.."
$ConfigFile = "$ProjectDir\config.json"
$Port = (Get-Content $ConfigFile | ConvertFrom-Json).port

Write-Host "🚀 [start] 启动服务"
Write-Host "   目录: $ProjectDir"

# 1. 检查/安装依赖
if (-not (Test-Path "$ProjectDir\node_modules")) {
    Write-Host "   📥 安装依赖..."
    Set-Location $ProjectDir
    npm install --silent
    Write-Host "   ✅"
}

# 2. 检查/构建前端
if (-not (Test-Path "$ProjectDir\dist\index.html")) {
    Write-Host "   🔨 构建前端..."
    Set-Location $ProjectDir
    npm run build
    Write-Host "   ✅"
}

# 3. 检查端口
$portInUse = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host ""
    Write-Host "   ⚠️  端口 $Port 已被占用"
    exit 1
}

Write-Host ""
Write-Host "   🌐 http://localhost:$Port"
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
    node "$ProjectDir\server.cjs"
}
