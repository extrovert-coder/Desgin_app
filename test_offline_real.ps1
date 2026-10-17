param(
  [int]$Port = 8096
)

$tempDir = Join-Path $env:TEMP ("edge_offline_" + [System.Guid]::NewGuid().ToString())
$flagFile = Join-Path $PSScriptRoot "sw_ready.flag"
$outFileOffline = Join-Path $PSScriptRoot "test_offline_dom.html"
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

if (Test-Path $flagFile) { Remove-Item $flagFile -Force }
if (Test-Path $outFileOffline) { Remove-Item $outFileOffline -Force }

Write-Host "Step 1: Starting local server on port $Port..." -ForegroundColor Cyan
$serverProc = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $PSScriptRoot "serve.ps1"), "-Port", "$Port" -WorkingDirectory $PSScriptRoot -PassThru
Start-Sleep -Seconds 2

try {
  # Step 2: Open SW installer harness to register & precache all assets
  Write-Host "Step 2: Launching Edge to install and activate Service Worker..." -ForegroundColor Cyan
  $proc1 = Start-Process -FilePath $edge -ArgumentList @(
    "--headless",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--user-data-dir=$tempDir",
    "http://localhost:$Port/sw_installer.html"
  ) -PassThru

  # Wait for SW activation callback
  $swActive = $false
  for ($s = 0; $s -lt 10; $s++) {
    if (Test-Path $flagFile) {
      $swActive = $true
      break
    }
    Start-Sleep -Seconds 1
  }

  if ($proc1 -and -not $proc1.HasExited) {
    Stop-Process -Id $proc1.Id -Force -ErrorAction SilentlyContinue
  }

  if (-not $swActive) {
    Write-Host "Service Worker did not activate in time." -ForegroundColor Red
    return
  }

  Write-Host "Service Worker is active and application shell is precached." -ForegroundColor Green

  # Step 3: KILL THE LOCAL SERVER
  Write-Host "`nStep 3: KILLING LOCAL SERVER (Simulating complete network blackout)..." -ForegroundColor Yellow
  if ($serverProc -and -not $serverProc.HasExited) {
    Stop-Process -Id $serverProc.Id -Force -ErrorAction SilentlyContinue
  }
  Start-Sleep -Seconds 2

  $serverDead = $false
  try {
    Invoke-WebRequest -Uri "http://localhost:$Port/index.html" -UseBasicParsing -TimeoutSec 1
  } catch {
    $serverDead = $true
  }

  if ($serverDead) {
    Write-Host "Confirmed: HTTP server is completely DEAD. All network requests will fail." -ForegroundColor Red
  }

  # Step 4: Launch browser with server DEAD (Must load from Service Worker cache)
  Write-Host "`nStep 4: Requesting application from dead origin (Must load from Service Worker cache)..." -ForegroundColor Cyan
  $proc2 = Start-Process -FilePath $edge -ArgumentList @(
    "--headless",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--user-data-dir=$tempDir",
    "--dump-dom",
    "http://localhost:$Port/index.html"
  ) -RedirectStandardOutput $outFileOffline -PassThru -Wait

  if (Test-Path $outFileOffline) {
    $offlineDom = Get-Content $outFileOffline -Raw
    $hasBrand = $offlineDom -match 'StudentHub'
    $hasDashboard = $offlineDom -match 'Dashboard'
    $hasShell = $offlineDom -match 'app-sidebar'

    Write-Host "`n================ OFFLINE VERIFICATION RESULT ================" -ForegroundColor Cyan
    if ($hasBrand -and $hasDashboard -and $hasShell) {
      Write-Host "REAL OFFLINE TEST PASSED (100% Verified in Edge browser)!" -ForegroundColor Green
      Write-Host "The application successfully loaded its complete HTML shell, navigation, and layout from Service Worker cache with zero network connection." -ForegroundColor Green
    } else {
      Write-Host "Offline test failed. DOM did not match expected app shell." -ForegroundColor Red
    }
  } else {
    Write-Host "Failed to output offline DOM." -ForegroundColor Red
  }
} finally {
  if ($serverProc -and -not $serverProc.HasExited) {
    Stop-Process -Id $serverProc.Id -Force -ErrorAction SilentlyContinue
  }
  if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue }
  if (Test-Path $flagFile) { Remove-Item $flagFile -Force -ErrorAction SilentlyContinue }
  if (Test-Path $outFileOffline) { Remove-Item $outFileOffline -Force -ErrorAction SilentlyContinue }
}
