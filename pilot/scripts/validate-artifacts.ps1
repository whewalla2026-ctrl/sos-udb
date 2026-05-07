<# Validate all required gating artifacts exist #>
$base = Join-Path -Path (Get-Location) -ChildPath 'pilot/outputs'
$required = @(
  'env_validation.json','migration_report.json','data_integrity_report.json','rollback_test_log.txt',
  'core_validation_report.json','latency_report.json','fallback_trigger_log.txt','cost_report.json',
  'cost_analysis.json','vector_test_report.json','lms_flow_log.json','monitoring_validation_report.json',
  'alert_trigger_log.txt','e2e_test_report.json','ttv_report.json','onboarding_success_rate.json',
  'load_test_report.json','simulation_summary.json','user_behavior_report.json'
)
$missing = @()
foreach ($f in $required) {
  $p = Join-Path -Path $base -ChildPath $f
  if (-not (Test-Path -Path $p)) { $missing += $f }
}
if ($missing.Count -eq 0) {
  Write-Host "ALL $($required.Count) required artifacts present" -ForegroundColor Green
  exit 0
} else {
  Write-Host "MISSING artifacts: $($missing -join ', ')" -ForegroundColor Red
  exit 1
}
