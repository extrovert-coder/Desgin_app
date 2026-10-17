<#
.SYNOPSIS
  Lightweight Zero-Dependency Static HTTP Server for Windows PowerShell
  Serves the Offline Student Assistant for ES Module testing and local development.
#>

param(
  [int]$Port = 8080
)

$root = $PSScriptRoot
if (-not $root) { $root = Get-Location }

$mimeTypes = @{
  '.html' = 'text/html; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.js'   = 'application/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.webmanifest' = 'application/manifest+json; charset=utf-8'
  '.svg'  = 'image/svg+xml'
  '.png'  = 'image/png'
  '.ico'  = 'image/x-icon'
}

$listener = New-Object System.Net.HttpListener
$prefix = ('http://localhost:' + $Port + '/')
$listener.Prefixes.Add($prefix)

try {
  $listener.Start()
  Write-Host '==========================================================' -ForegroundColor Cyan
  Write-Host ' Offline Student Assistant — Local Development Server' -ForegroundColor Green
  Write-Host (' Running at: ' + $prefix) -ForegroundColor Yellow
  Write-Host ' Press Ctrl+C in this terminal to stop the server.' -ForegroundColor Gray
  Write-Host '==========================================================' -ForegroundColor Cyan
} catch {
  Write-Error 'Failed to start HttpListener. Port might already be in use.'
  exit 1
}

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    $urlPath = $request.Url.LocalPath.TrimStart('/')
    if ([string]::IsNullOrWhiteSpace($urlPath)) {
      $urlPath = 'index.html'
    }

    if ($request.HttpMethod -eq 'POST' -and $urlPath -eq 'test-complete') {
      $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
      $body = $reader.ReadToEnd()
      $reader.Close()
      [System.IO.File]::WriteAllText([System.IO.Path]::Combine($root, 'test_results.json'), $body, [System.Text.Encoding]::UTF8)

      $response.StatusCode = 200
      $msg = [System.Text.Encoding]::UTF8.GetBytes('{"status":"ok"}')
      $response.ContentType = 'application/json'
      $response.ContentLength64 = $msg.Length
      $response.OutputStream.Write($msg, 0, $msg.Length)
      $response.OutputStream.Close()
      continue
    }

    if ($request.HttpMethod -eq 'POST' -and $urlPath -eq 'sw-ready') {
      [System.IO.File]::WriteAllText([System.IO.Path]::Combine($root, 'sw_ready.flag'), 'ready', [System.Text.Encoding]::UTF8)
      $response.StatusCode = 200
      $msg = [System.Text.Encoding]::UTF8.GetBytes('{"status":"ready"}')
      $response.ContentType = 'application/json'
      $response.ContentLength64 = $msg.Length
      $response.OutputStream.Write($msg, 0, $msg.Length)
      $response.OutputStream.Close()
      continue
    }

    # Normalize file path and prevent directory traversal
    $filePath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($root, $urlPath.Replace('/', [System.IO.Path]::DirectorySeparatorChar)))

    if ($filePath.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase) -and [System.IO.File]::Exists($filePath)) {
      $extension = [System.IO.Path]::GetExtension($filePath).ToLower()
      $contentType = $mimeTypes[$extension]
      if (-not $contentType) { $contentType = 'application/octet-stream' }

      $fileBytes = [System.IO.File]::ReadAllBytes($filePath)
      $response.ContentType = $contentType
      $response.ContentLength64 = $fileBytes.Length
      $response.StatusCode = 200

      # Cache control for local development
      $response.AddHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
      $response.OutputStream.Write($fileBytes, 0, $fileBytes.Length)
    } else {
      $response.StatusCode = 404
      $errText = '404 Not Found'
      $msg = [System.Text.Encoding]::UTF8.GetBytes($errText)
      $response.ContentType = 'text/plain'
      $response.ContentLength64 = $msg.Length
      $response.OutputStream.Write($msg, 0, $msg.Length)
    }

    $response.OutputStream.Close()
  }
} finally {
  $listener.Stop()
  $listener.Close()
}
