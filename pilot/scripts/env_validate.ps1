<# PowerShell environment validation for Phase 1+Phase 2 gating #>
Param()

$ErrorActionPreference = 'Stop'

$OutputDir = Join-Path -Path (Get-Location) -ChildPath 'pilot/artifacts'
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
$OutputJson = Join-Path -Path $OutputDir -ChildPath 'env_validation.json'

$nodeVer = if (Get-Command node -ErrorAction SilentlyContinue) { node -v 2>$null } else { 'not_found' }
$npmVer  = if (Get-Command npm -ErrorAction SilentlyContinue) { npm -v 2>$null } else { 'not_found' }
$psqlVer = if (Get-Command psql -ErrorAction SilentlyContinue) { psql --version 2>$null; $null } else { 'not_found' }
if ($psqlVer -eq $null) { $psqlVer = 'not_found' }

$canvasBase = $env:CANVAS_BASE
if (-not $canvasBase) { $canvasBase = 'http://localhost:8080' }
$canvasHealth = $false
try {
  if (Test-Connection -Quiet -Count 1 -ComputerName (New-Object Uri($canvasBase).Host)) { }
  $resp = Invoke-WebRequest -Uri "$canvasBase/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
  if ($resp -and $resp.StatusCode -eq 200) { $canvasHealth = $true }
} catch {
  $canvasHealth = $false
}

$vectorGuard = $env:VECTOR_GUARD_FLAG
if (-not $vectorGuard) { $vectorGuard = 'false' }

$payload = @{
  node_version = $nodeVer
  npm_version = $npmVer
  psql_version = $psqlVer
  canvas_health = [bool]$canvasHealth
  canvas_base = $canvasBase
  vector_store_guarded = [bool]([string]$vectorGuard -eq 'true')
  env_generated_at = (Get-Date).ToString('o')
}
$payloadJson = $payload | ConvertTo-Json -Depth 3
Set-Content -Path $OutputJson -Value $payloadJson -Encoding UTF8
Write-Host "Wrote env_validation.json to $OutputJson"
