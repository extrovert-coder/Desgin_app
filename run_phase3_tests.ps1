param(
  [int]$Port = 8092
)

$resultsFile = Join-Path $PSScriptRoot "test_results.json"
if (Test-Path $resultsFile) { Remove-Item $resultsFile -Force }

$serverProc = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $PSScriptRoot "serve.ps1"), "-Port", "$Port" -WorkingDirectory $PSScriptRoot -PassThru
Start-Sleep -Seconds 2

$tempDir = Join-Path $env:TEMP ("edge_test_" + [System.Guid]::NewGuid().ToString())

try {
  # Verify server responsiveness
  $ready = $false
  for ($i = 0; $i -lt 5; $i++) {
    try {
      $resp = Invoke-WebRequest -Uri "http://localhost:$Port/index.html" -UseBasicParsing -TimeoutSec 2
      if ($resp.StatusCode -eq 200) { $ready = $true; break }
    } catch {
      Start-Sleep -Seconds 1
    }
  }

  if (-not $ready) {
    Write-Host "Server failed to respond on port $Port" -ForegroundColor Red
    return
  }

  Write-Host "Server ready on port $Port. Launching headless Edge to run IndexedDB tests..." -ForegroundColor Green
  $edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
  
  $edgeProc = Start-Process -FilePath $edge -ArgumentList @(
    "--headless",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--user-data-dir=$tempDir",
    "http://localhost:$Port/tests.html"
  ) -PassThru

  # Wait for test completion callback (up to 12 seconds)
  $completed = $false
  for ($s = 0; $s -lt 12; $s++) {
    if (Test-Path $resultsFile) {
      $completed = $true
      break
    }
    Start-Sleep -Seconds 1
  }

  if ($completed) {
    $raw = Get-Content $resultsFile -Raw -Encoding UTF8
    # Parse JSON
    $json = ConvertFrom-Json $raw
    
    Write-Host ""
    Write-Host "================ TEST RUNNER SUMMARY ================" -ForegroundColor Cyan
    if ($json.allPassed) {
      $summaryText = "ALL TESTS PASSED (" + $json.passedCount + "/" + $json.totalCount + ") - IndexedDB Data Access Layer Verified"
      Write-Host $summaryText -ForegroundColor Green
    } else {
      $summaryText = "TESTS FAILED (" + ($json.totalCount - $json.passedCount) + "/" + $json.totalCount + " failed)"
      Write-Host $summaryText -ForegroundColor Red
    }

    Write-Host ""
    Write-Host "================ TEST CASES ================" -ForegroundColor Cyan
    foreach ($r in $json.results) {
      if ($r.pass) {
        Write-Host ("  [PASS] " + $r.name) -ForegroundColor White
      } else {
        Write-Host ("  [FAIL] " + $r.name + " => " + $r.error) -ForegroundColor Red
      }
    }
  } else {
    Write-Host "Timed out waiting for test execution completion." -ForegroundColor Red
  }
} finally {
  if ($edgeProc -and -not $edgeProc.HasExited) {
    Stop-Process -Id $edgeProc.Id -Force -ErrorAction SilentlyContinue
  }
  if ($serverProc -and -not $serverProc.HasExited) {
    Stop-Process -Id $serverProc.Id -Force -ErrorAction SilentlyContinue
  }
  if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue }
  if (Test-Path $resultsFile) { Remove-Item $resultsFile -Force -ErrorAction SilentlyContinue }
}
