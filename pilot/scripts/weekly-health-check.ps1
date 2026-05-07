<# Weekly health check for early warning signals. #>
Param()

$ErrorActionPreference = 'Continue'

$signalsPath = Join-Path -Path (Get-Location) -ChildPath 'pilot/runbooks/early-warning-signals.json'
$signals = Get-Content -Path $signalsPath -Raw | ConvertFrom-Json

Write-Host "=== Weekly Early Warning Signals Check ===" -ForegroundColor Cyan
Write-Host ""

$criticalCount = 0
$warningCount = 0

foreach ($signal in $signals.signals) {
  $value = $signal.current_value
  if ($null -eq $value) {
    $status = "not tracked"
  } elseif ($signal.threshold.healthy -match "> (\d+)") {
    $threshold = [int]$matches[1]
    if ($value -gt $threshold) { $status = "healthy" }
    elseif ($value -gt ($threshold * 0.5)) { $status = "warning"; $warningCount++ }
    else { $status = "critical"; $criticalCount++ }
  } else {
    $status = "unknown"
  }

  $color = @{ "healthy" = "Green"; "warning" = "Yellow"; "critical" = "Red"; "not tracked" = "Gray"; "unknown" = "Gray" }[$status]
  Write-Host "[$status] $($signal.name)" -ForegroundColor $color
  Write-Host "  Target: $($signal.threshold.healthy) | Current: $(if($null -eq $value){'not set'}else{$value})"
  Write-Host ""
}

Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "Critical signals: $criticalCount" -ForegroundColor $(if($criticalCount -gt 0){'Red'}else{'Green'})
Write-Host "Warning signals: $warningCount" -ForegroundColor $(if($warningCount -gt 2){'Yellow'}else{'Green'})
Write-Host ""

if ($criticalCount -gt 0) {
  Write-Host "ACTION REQUIRED: $criticalCount critical signals detected. Stop feature work. Fix signals." -ForegroundColor Red
  exit 1
} elseif ($warningCount -gt 3) {
  Write-Host "CAUTION: $warningCount warnings. Reconsider product strategy." -ForegroundColor Yellow
  exit 0
} else {
  Write-Host "Signals nominal. Continue monitored rollout." -ForegroundColor Green
  exit 0
}
