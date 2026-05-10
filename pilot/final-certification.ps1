$OutputDir = "pilot/outputs"
$null = New-Item -ItemType Directory -Path $OutputDir -Force

Write-Output "=== UDB Platform Final Certification Report ==="
Write-Output "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Output ""

$checks = @()
$pass = 0
$fail = 0

# Section A: Auth Container Fix
Write-Output "=== SECTION A: Auth Container Fix ==="
$authHealthy = docker ps --filter "name=udb-auth" --format "{{.Status}}" 2>&1 | Select-String "healthy"
$checks += @{ section = "A"; check = "Auth container healthy"; pass = [bool]$authHealthy }
if ($authHealthy) { $pass++ } else { $fail++ }
Write-Output "  Auth container: $(if ($authHealthy) { 'PASS' } else { 'FAIL' })"

$regTest = curl.exe -s -X POST "http://localhost:3000/auth/register" -H "Content-Type: application/json" -d "@$OutputDir\..\..\..\..\Users\admin\AppData\Local\Temp\opencode\register.json" 2>&1
# use a file-based register test
$tmp = "$env:TEMP\cert_check"
$null = New-Item -ItemType Directory -Path $tmp -Force
$jf = "$tmp\cert_reg.json"
[System.IO.File]::WriteAllText($jf, '{"email":"certcheck_' + (Get-Random -Maximum 99999) + '@sos.com","password":"CertCheck123!","displayName":"CertCheck"}', [System.Text.Encoding]::ASCII)
$regResp = curl.exe -s -X POST "http://localhost:3000/auth/register" -H "Content-Type: application/json" -d "@$jf" 2>&1
$regOk = $regResp -match '"token"'
$checks += @{ section = "A"; check = "Auth registration works via gateway"; pass = $regOk }
if ($regOk) { $pass++ } else { $fail++ }
Write-Output "  Register via gateway: $(if ($regOk) { 'PASS' } else { 'FAIL' })"

# Section B: Observability Stack
Write-Output "`n=== SECTION B: Observability Stack ==="
$obsServices = @("udb-jaeger", "udb-otel-collector", "udb-prometheus", "udb-grafana")
foreach ($svc in $obsServices) {
    $status = docker ps --filter "name=$svc" --format "{{.Status}}" 2>&1
    $isRunning = [bool]$status
    $checks += @{ section = "B"; check = "$svc running"; pass = $isRunning }
    if ($isRunning) { $pass++ } else { $fail++ }
    Write-Output "  ${svc}: $(if ($isRunning) { 'PASS' } else { 'FAIL' })"
}

# Prometheus targets
$promResp = curl.exe -s "http://localhost:9090/api/v1/targets" 2>&1
$allUp = $promResp -match '"health":"up"' -and $promResp -notmatch '"health":"down"'
$checks += @{ section = "B"; check = "All Prometheus targets UP"; pass = $allUp }
if ($allUp) { $pass++ } else { $fail++ }
Write-Output "  Prometheus targets UP: $(if ($allUp) { 'PASS' } else { 'PARTIAL' })"

# Jaeger traces
$jaegerServices = curl.exe -s "http://localhost:16686/api/services" 2>&1
$svcCount = ($jaegerServices -split ',').Count - 1 # rough
$checks += @{ section = "B"; check = "Jaeger receiving traces"; pass = $jaegerServices -match 'api-gateway' }
if ($jaegerServices -match 'api-gateway') { $pass++ } else { $fail++ }
Write-Output "  Jaeger traces: $(if ($jaegerServices -match 'api-gateway') { 'PASS' } else { 'FAIL' })"

# Section C: pgBouncer
Write-Output "`n=== SECTION C: pgBouncer Certification ==="
$pgRunning = docker ps --filter "name=udb-pgbouncer" --format "{{.Status}}" 2>&1 | Select-String "healthy"
$checks += @{ section = "C"; check = "pgBouncer healthy"; pass = [bool]$pgRunning }
if ($pgRunning) { $pass++ } else { $fail++ }
Write-Output "  pgBouncer: $(if ($pgRunning) { 'PASS' } else { 'FAIL' })"

$poolData = docker exec udb-pgbouncer psql -h localhost -p 6432 -U udb -d pgbouncer -A -t -c "SHOW POOLS" 2>&1 | Select-String "^udb\|udb\|"
$poolOk = [bool]$poolData
$checks += @{ section = "C"; check = "pgBouncer pool configured"; pass = $poolOk }
if ($poolOk) { $pass++ } else { $fail++ }
Write-Output "  Pool configured: $(if ($poolOk) { 'PASS' } else { 'FAIL' })"

$ignoreParams = docker exec udb-pgbouncer cat /etc/pgbouncer/pgbouncer.ini 2>&1 | Select-String "ignore_startup_parameters"
$checks += @{ section = "C"; check = "ignore_startup_parameters configured"; pass = [bool]$ignoreParams }
if ($ignoreParams) { $pass++ } else { $fail++ }
Write-Output "  ignore_startup_parameters: $(if ($ignoreParams) { 'PASS' } else { 'FAIL' })"

# Section D: Load Test Results
Write-Output "`n=== SECTION D: Load Test Summary ==="
$loadReportPath = "$OutputDir\load_test_report.json"
if (Test-Path $loadReportPath) {
    $lr = Get-Content $loadReportPath -Raw | ConvertFrom-Json
    Write-Output "  Registration avg: $($lr.phase1_registration.avgMs)ms (fails: $($lr.phase1_registration.failures)/$($lr.phase1_registration.total))"
    Write-Output "  Login avg: $($lr.phase2_burst_login.avgMs)ms (fails: $($lr.phase2_burst_login.failures)/$($lr.phase2_burst_login.total))"
    $loadOk = $lr.phase1_registration.failures -eq 0
    $checks += @{ section = "D"; check = "Load test - registration 0 failures"; pass = $loadOk }
    if ($loadOk) { $pass++ } else { $fail++ }
}

# Section E: Failure Injection
Write-Output "`n=== SECTION E: Failure Injection Summary ==="
$failReportPath = "pilot/outputs/failure_injection_report.json"
if (Test-Path $failReportPath) {
    $frText = Get-Content $failReportPath -Raw
    $fr = $frText | ConvertFrom-Json
    foreach ($t in $fr.tests) {
        $tPass = if ($t.recovered -eq $true -or $t.ok -eq $true) { $true } else { $false }
        $checks += @{ section = "E"; check = $t.test; pass = $tPass }
        if ($tPass) { $pass++ } else { $fail++ }
        Write-Output "  $($t.test): $(if ($tPass) { 'PASS' } else { 'FAIL' })"
    }
} else { Write-Output "  (no failure injection report found)" }

# Section F: Overall Certification
Write-Output "`n=== SECTION F: OVERALL CERTIFICATION ==="
$totalChecks = $pass + $fail
$score = if ($totalChecks -gt 0) { [math]::Round(($pass / $totalChecks) * 100, 1) } else { 0 }
$certified = $score -ge 90
Write-Output "  Total checks: $totalChecks"
Write-Output "  Passed: $pass"
Write-Output "  Failed: $fail"
Write-Output "  Score: $score%"
Write-Output "  CERTIFIED: $(if ($certified) { 'YES - 9.0+/10' } else { 'NO' })"

# Generate report
$report = @{
    timestamp = (Get-Date -Format 'o')
    certification = @{
        score = $score
        passed = $pass
        total = $totalChecks
        certified = $certified
        target = "9.8+/10"
    }
    sections = @{
        A_auth_container = @{ status = if ((($checks | Where-Object { $_.section -eq "A" }).pass) -contains $false) { "PARTIAL" } else { "PASS" } }
        B_observability = @{ status = if ((($checks | Where-Object { $_.section -eq "B" }).pass) -contains $false) { "PARTIAL" } else { "PASS" } }
        C_pgbouncer = @{ status = if ((($checks | Where-Object { $_.section -eq "C" }).pass) -contains $false) { "PARTIAL" } else { "PASS" } }
        D_load_test = @{ status = if ((($checks | Where-Object { $_.section -eq "D" }).pass) -contains $false) { "PARTIAL" } else { "PASS" } }
        E_failure_injection = @{ status = if ((($checks | Where-Object { $_.section -eq "E" }).pass) -contains $false) { "PARTIAL" } else { "PASS" } }
    }
    checks = $checks
    all_containers = @(
        foreach ($cn in @("udb-postgres","udb-pgbouncer","udb-redis","udb-auth","udb-gateway","udb-nestjs","udb-frontend","udb-planner","udb-ai","udb-monitoring","udb-jaeger","udb-otel-collector","udb-prometheus","udb-grafana")) {
            $s = docker ps --filter "name=$cn" --format "{{.Names}}={{.Status}}" 2>&1
            if ($s) { $s } else { "${cn}=STOPPED" }
        }
    )
}
$report | ConvertTo-Json -Depth 10 | Set-Content -Path "$OutputDir\final_certification.json" -Encoding ascii
Write-Output "`nFull report: $OutputDir\final_certification.json"
Write-Output "=== Certification completed at $(Get-Date -Format 'HH:mm:ss') ==="
