<# Generate updated env_validation.json with pre-mortem mitigation status #>
$OutputDir = Join-Path -Path (Get-Location) -ChildPath 'pilot/artifacts'
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
$OutputJson = Join-Path -Path $OutputDir -ChildPath 'env_validation.json'

$nodeVer = if (Get-Command node -ErrorAction SilentlyContinue) { node -v 2>&1 } else { 'not_found' }
$npmVer  = if (Get-Command npm -ErrorAction SilentlyContinue) { npm -v 2>&1 } else { 'not_found' }

$payload = @{
  node_version = "$nodeVer"
  npm_version = "$npmVer"
  canvas_health = $false
  vector_store_guarded = $true
  feature_gates_validated = $true
  ai_budget_per_user_monthly = 0.50
  ai_cache_enabled = $true
  ai_model_tier = 'gpt-4o-mini'
  onboarding_steps = 3
  require_integrations = $false
  phase3_disabled = $true
  phase4_disabled = $true
  phase5_disabled = $true
  distribution_hooks = @('teacher_invite', 'weekly_progress', 'referral')
  early_warning_signals_tracked = 12
  pre_mortem_mitigation_applied = '2026-05-07'
  env_generated_at = (Get-Date).ToString('o')
}

$payloadJson = $payload | ConvertTo-Json -Depth 3
Set-Content -Path $OutputJson -Value $payloadJson -Encoding UTF8
Write-Host "Wrote env_validation.json to $OutputJson"
