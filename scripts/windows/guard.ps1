param(
    [string]$Action = "start"
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Resolve-Path "$ScriptDir\..\.."
$Port = 18788
$LogFile = "$env:TEMP\sqlite-viewer.log"
$PidFile = "$env:TEMP\sqlite-viewer.pid"

function Write-Log {
    param([string]$Msg)
    $time = Get-Date -Format "HH:mm:ss"
    Write-Host "$time $Msg"
}

function Start-Service {
    if (Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -match "server\.cjs" }) {
        Write-Log "服务已在运行"
        return
    }

    $node = Get-Command "node" -ErrorAction SilentlyContinue
    if (-not $node) {
        Write-Log "❌ 未找到 node，请先安装 Node.js"
        return
    }

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "node"
    $psi.Arguments = """$ProjectDir\server.cjs"""
    $psi.WorkingDirectory = $ProjectDir
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true

    $p = [System.Diagnostics.Process]::Start($psi)
    $p.Id | Out-File -FilePath $PidFile -Force
    Write-Log "✅ 服务已启动 (PID: $($p.Id)) http://localhost:$Port"
}

function Stop-Service {
    if (Test-Path $PidFile) {
        $pid = Get-Content $PidFile
        try {
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            Write-Log "服务已停止"
        } catch {}
        Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
    }

    Get-Process -Name "node" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -match "server\.cjs" } |
        ForEach-Object { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue }
}

function Test-GatewayRunning {
    $processes = Get-Process -Name "node" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -match "gateway" }
    return ($processes -ne $null -and $processes.Count -gt 0)
}

switch ($Action) {
    "start" {
        if (-not (Test-Path "$ProjectDir\node_modules")) {
            Write-Log "❌ node_modules 不存在，请先运行 install.ps1"
            exit 1
        }
        if (-not (Test-Path "$ProjectDir\dist\index.html")) {
            Write-Log "❌ 前端未构建，请先运行 install.ps1"
            exit 1
        }
        Start-Service
        Write-Log "按 Ctrl+C 停止"
        Read-Host
        Stop-Service
    }
    "guard" {
        Write-Log "🔍 开始监控 OpenClaw gateway 进程..."
        while ($true) {
            if (Test-GatewayRunning) {
                if (-not (Get-Process -Name "node" -ErrorAction SilentlyContinue |
                    Where-Object { $_.CommandLine -match "server\.cjs" })) {
                    Write-Log "gateway 已启动 → 启动服务"
                    Start-Service
                }
            } else {
                if (Get-Process -Name "node" -ErrorAction SilentlyContinue |
                    Where-Object { $_.CommandLine -match "server\.cjs" }) {
                    Write-Log "gateway 已关闭 → 停止服务"
                    Stop-Service
                }
            }
            Start-Sleep -Seconds 5
        }
    }
}
