<# Validate that Phase 3-5 features are properly gated. #>
Param()

$ErrorActionPreference = 'Continue'

$configPath = Join-Path -Path (Get-Location) -ChildPath 'pilot/config/feature-flags.json'
$config = Get-Content -Path $configPath -Raw | ConvertFrom-Json

$violations = @()

# Check Phase 3-5 features are disabled
$phaseFlags = @{
  'phase3_social' = 'nft_minting'
  'phase4_entrepreneurship' = 'stripe_escrow'
  'phase5_future_self' = 'socratic_tutor'
}

foreach ($phase in $phaseFlags.Keys) {
  $phaseEnabled = $config.phases.$phase.enabled
  if ($phaseEnabled -eq $true) {
    $violations += "Phase flag '$phase' is ENABLED. Should be disabled."
  }
}

# Check specific features
$disabledFeatures = @('nft_minting', 'stripe_escrow', 'biometric_integration', 'socratic_tutor', 'rag_pipeline', 'lms_sync')
foreach ($feat in $disabledFeatures) {
  if ($config.features.$feat.enabled -eq $true) {
    $violations += "Feature '$feat' is ENABLED. Should be disabled for MVP."
  }
}

if ($violations.Count -eq 0) {
  Write-Host "Feature gate validation PASSED. All Phase 3-5 features are properly disabled." -ForegroundColor Green
  exit 0
} else {
  Write-Host "Feature gate validation FAILED. Violations:" -ForegroundColor Red
  $violations | ForEach-Object { Write-Host "  - $_" }
  exit 1
}
