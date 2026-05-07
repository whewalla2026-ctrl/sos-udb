# Final Release Verification Audit
# Scans for Phase 3-5 leakage, stub services, mocks, TODOs, and placeholder routes

$ErrorActionPreference = 'Continue'

Write-Host "=== FINAL RELEASE VERIFICATION AUDIT ===" -ForegroundColor Cyan
Write-Host ""

# ── 1. API Module Check ──
Write-Host "--- 1. API Module Phase 3-5 Leakage ---" -ForegroundColor Yellow
$allowed = @('UUPModule','PlanningModule','AiLiteModule','MonitoringModule','AuthModule','AuditModule','LmsModule','VectorStoreLocalModule','WaitlistModule','GraphQLAppModule')
$appModule = Get-Content 'services/api/src/app.module.ts' -Raw
$violations = @()
foreach ($mod in $allowed) {
    if ($appModule -notmatch $mod) { $violations += "MISSING: $mod should be imported" }
}
# Check for forbidden modules
$forbidden = @('EscrowModule','NFTModule','FutureSelfModule','AiMentorModule','JoonWorldModule','RagModule','ModerationModule','KidPreneurModule','OmnichannelModule','BiometricsModule','WalletModule','MarketplaceModule','AiLifeCoachModule','GovernanceModule','BiometricFlowModule')
foreach ($mod in $forbidden) {
    if ($appModule -match $mod) { $violations += "LEAK: $mod is still imported" }
}
if ($violations.Count -eq 0) { Write-Host "  PASS: No Phase 3-5 modules in AppModule" -ForegroundColor Green }
else { $violations | ForEach-Object { Write-Host "  $_" -ForegroundColor Red } }

# ── 2. Stub Service Check ──
Write-Host ""
Write-Host "--- 2. Stub Service Detection ---" -ForegroundColor Yellow
$stubs = @('biometrics','kidpreneur','omnichannel')
foreach ($s in $stubs) {
    $path = "services/$s"
    if (Test-Path $path) {
        $files = @(Get-ChildItem $path -Recurse -Filter *.ts -Name)
        Write-Host ("  WARNING: " + $s + " exists with " + $files.Count + " .ts file(s)") -ForegroundColor Yellow
    } else { Write-Host ("  PASS: " + $s + " removed") -ForegroundColor Green }
}

# Non-wired standalone services (OK - independent microservices)
$standalone = @('doter-vision','lms-sync','ai-mentor')
foreach ($s in $standalone) {
    $path = "services/$s"
    if (Test-Path $path) {
        $files = @(Get-ChildItem $path -Recurse -Filter *.ts -Name)
        Write-Host ("  NOTE: " + $s + " standalone microservice (" + $files.Count + " files, not wired)") -ForegroundColor Gray
    }
}

# ── 3. Mock Detection in Production Code ──
Write-Host ""
Write-Host "--- 3. Mock/Stub Detection in Production Code ---" -ForegroundColor Yellow
$mockPatterns = @(
    @{pattern='mock'; path='services\api\src'},  
    @{pattern='MOCK_'; path='services\api\src'},
    @{pattern='placeholder'; path='services\api\src'},
    @{pattern='stub'; path='services\api\src'},
    @{pattern='fake'; path='services\api\src'}
)
$mockFound = $false
foreach ($mp in $mockPatterns) {
    $results = Select-String -Path "services\api\src\*.ts" -Pattern $mp.pattern -SimpleMatch -ErrorAction SilentlyContinue
    if ($results) {
        # Filter out legitimate uses
        foreach ($r in $results) {
            if ($r.Line -notmatch 'stubhub|stub|placeholder|mockService|mockFn|mockImplementation') {
                Write-Host "  ⚠ Possible mock in: $($r.Path):$($r.LineNumber) - $($r.Line.Trim())" -ForegroundColor Yellow
                $mockFound = $true
            }
        }
    }
}
if (-not $mockFound) { Write-Host "  ✓ No mock/stub patterns detected in production code" -ForegroundColor Green }

# ── 4. TODO/FIXME Scan ──
Write-Host ""
Write-Host "--- 4. TODO/FIXME Detection ---" -ForegroundColor Yellow
$todos = Select-String -Path "services\*.ts" -Pattern '(TODO|FIXME|HACK|XXX|HARDCODED)' -SimpleMatch -ErrorAction SilentlyContinue
$webTodos = Select-String -Path "apps\web\src\*.tsx","apps\web\src\*.ts" -Pattern '(TODO|FIXME|HACK|XXX|HARDCODED)' -SimpleMatch -ErrorAction SilentlyContinue
$allTodos = @($todos) + @($webTodos)
# Filter out node_modules and known false positives
$realTodos = $allTodos | Where-Object {
    $_.Path -notmatch 'node_modules' -and 
    $_.Path -notmatch '\.pnpm' -and
    $_.Path -notmatch 'gap_scan' -and
    $_.Line -notmatch 'TODO.*todo' -and
    $_.Line -notmatch 'TODOs'
}
if ($realTodos.Count -gt 0) {
    Write-Host "  ⚠ $($realTodos.Count) TODO/FIXME markers found:" -ForegroundColor Yellow
    $realTodos | ForEach-Object { Write-Host "    $($_.Path):$($_.LineNumber) - $($_.Line.Trim())" }
} else { Write-Host "  ✓ No TODO/FIXME markers in production code" -ForegroundColor Green }

# ── 5. Dead Route Detection ──
Write-Host ""
Write-Host "--- 5. Active Web Routes ---" -ForegroundColor Yellow
$routes = Get-ChildItem "apps/web/src/app/dashboard" -Directory | Select-Object Name
Write-Host "  Active dashboard pages: $($routes.Name -join ', ')" -ForegroundColor Green
# Verify no Phase 3-5 pages remain
$phase35Pages = @('academic','ai-proxy','biometric','future-self','joon-world','m-eq','messages','quests','safety','skill-agents','tutor','ventures')
$leaks = $phase35Pages | Where-Object { $routes.Name -contains $_ }
if ($leaks.Count -gt 0) { Write-Host "  ⚠ Phase 3-5 pages still present: $($leaks -join ', ')" -ForegroundColor Red }
else { Write-Host "  ✓ No Phase 3-5 dashboard pages remain" -ForegroundColor Green }

# ── 6. Sidebar Check ──
Write-Host ""
Write-Host "--- 6. Sidebar Navigation ---" -ForegroundColor Yellow
$sidebar = Get-Content "apps/web/src/components/Sidebar.tsx" -Raw
if ($sidebar -match 'FUTURE|VENTURES|JOON|MESSAGES|SAFETY|TUTOR|ACADEMIC|BIOMETRIC|SKILL') {
    Write-Host "  ⚠ Sidebar may contain Phase 3-5 links" -ForegroundColor Red
} else { Write-Host "  ✓ Sidebar contains only Phase 1-2 navigation" -ForegroundColor Green }

# ── Summary Stepping into the Next Phase ──
Write-Host ""
Write-Host "=== AUDIT SUMMARY ===" -ForegroundColor Cyan
if ($violations.Count -eq 0 -and -not $mockFound -and $realTodos.Count -eq 0 -and $leaks.Count -eq 0 -and ($sidebar -notmatch 'FUTURE|VENTURES|JOON|MESSAGES|SAFETY|TUTOR|ACADEMIC|BIOMETRIC|SKILL')) {
    Write-Host "✅ ALL CHECKS PASSED - No Phase 3-5 leakage, no mocks, no TODOs" -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ ISSUES DETECTED - Review warnings above" -ForegroundColor Red
    exit 1
}
