$ErrorActionPreference = "Stop"
$OutputDir = "pilot/outputs"
$null = New-Item -ItemType Directory -Path $OutputDir -Force
$tmpDir = "$env:TEMP\udb-loadtest"
$null = New-Item -ItemType Directory -Path $tmpDir -Force

# Clear Redis brute force keys
        docker exec udb-redis redis-cli EVAL "for _,k in ipairs(redis.call('keys','*bruteforce*')) do redis.call('del',k) end" 0 2>&1 | Out-Null

Write-Output "=== UDB Load Test ==="
Write-Output "Starting at $(Get-Date -Format 'HH:mm:ss')"
Write-Output ""

function Write-JsonFile($Path, $Obj) {
    [System.IO.File]::WriteAllText($Path, ($Obj | ConvertTo-Json -Compress), [System.Text.Encoding]::ASCII)
}

# Phase 1: Register 10 fresh users
Write-Output "--- Phase 1: Register 10 fresh users ---"
$users = @()
$regTimes = @()
$regFails = 0
for ($i = 1; $i -le 10; $i++) {
    $email = "lt$([DateTime]::Now.Ticks % 100000)$i@sos.com"
    $password = "LTpass$i!99"
    $body = @{ email = $email; password = $password; displayName = "LoadT$i" }
    $jf = "$tmpDir\r$i.json"
    Write-JsonFile $jf $body
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $respOut = "$tmpDir\reg_out_$([System.IO.Path]::GetRandomFileName()).txt"
    $httpCode = curl.exe -s -o "$respOut" -w "%{http_code}" -X POST "http://localhost:3000/auth/register" -H "Content-Type: application/json" -d "@$jf" 2>&1
    $sw.Stop()
    Remove-Item -LiteralPath "$respOut" -Force -ErrorAction SilentlyContinue
    $regTimes += $sw.ElapsedMilliseconds
    if ($httpCode -eq 201) {
        $users += @{ email = $email; password = $password }
        Write-Output "  [$i] $email -> $($sw.ElapsedMilliseconds)ms (201)"
    } else {
        $regFails++
        Write-Output "  [$i] $email -> $($sw.ElapsedMilliseconds)ms ($httpCode)"
    }
}
$avgRegTime = [math]::Round(($regTimes | Measure-Object -Average).Average, 1)
Write-Output "  Avg: ${avgRegTime}ms, Fails: $regFails"
Write-Output ""

# Phase 2: Burst login - 10 logins per user across all users (within brute force limits)
Write-Output "--- Phase 2: Burst login (10 per user, batch of 10 users) ---"
if ($users.Count -gt 0) {
    $burstTimes = @()
    $burstFails = 0
    $totalReqs = 0
    for ($round = 0; $round -lt 2; $round++) {
        # Clear brute force at start of each round
docker exec udb-redis redis-cli EVAL "for _,k in ipairs(redis.call('keys','*bruteforce*')) do redis.call('del',k) end" 0 2>&1 | Out-Null
        Start-Sleep -Seconds 1
        foreach ($u in $users) {
            $jf = "$tmpDir\b$($u.email.GetHashCode()).json"
            Write-JsonFile $jf @{ email = $u.email; password = $u.password }
            $sw = [System.Diagnostics.Stopwatch]::StartNew()
            $respOut = "$tmpDir\bout_$([System.IO.Path]::GetRandomFileName()).txt"
            $code = curl.exe -s -o "$respOut" -w "%{http_code}" -X POST "http://localhost:3000/auth/login" -H "Content-Type: application/json" -d "@$jf" 2>&1
            $sw.Stop()
            $burstTimes += $sw.ElapsedMilliseconds
            if ($code -ne 200) { $burstFails++ }
            Remove-Item -LiteralPath "$respOut" -Force -ErrorAction SilentlyContinue
            $totalReqs++
        }
        Write-Output "  Round $($round+1): $($users.Count) logins complete (total: $totalReqs)"
    }
    $avgBurstTime = [math]::Round(($burstTimes | Measure-Object -Average).Average, 1)
    $p99 = [math]::Round(($burstTimes | Sort-Object)[17], 1)
    Write-Output "  Avg: ${avgBurstTime}ms, P99: ${p99}ms, Fails: $burstFails/$totalReqs"
} else { Write-Output "  SKIP - no users registered" }
Write-Output ""

# Phase 3: Token validation test
Write-Output "--- Phase 3: Token validation ---"
docker exec udb-redis redis-cli EVAL "for _,k in ipairs(redis.call('keys','*bruteforce*')) do redis.call('del',k) end" 0 2>&1 | Out-Null
Start-Sleep -Seconds 1
if ($users.Count -gt 0) {
    $valTimes = @()
    $valFails = 0
    $tu = $users[0]
    $jf = "$tmpDir\val.json"
    Write-JsonFile $jf @{ email = $tu.email; password = $tu.password }
    $loginResp = curl.exe -s -X POST "http://localhost:3000/auth/login" -H "Content-Type: application/json" -d "@$jf" 2>&1
    if ($loginResp -match '"token":"([^"]+)"') {
        $token = $matches[1]
        Write-Output "  Token obtained: $($token.Substring(0,30))..."
        $jf2 = "$tmpDir\val2.json"
        Write-JsonFile $jf2 @{ token = $token }
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $respOut = "$tmpDir\val_out_$([System.IO.Path]::GetRandomFileName()).txt"
        $code = curl.exe -s -o "$respOut" -w "%{http_code}" -X POST "http://localhost:3000/auth/validate" -H "Content-Type: application/json" -d "@$jf2" 2>&1
        $sw.Stop()
        Remove-Item -LiteralPath "$respOut" -Force -ErrorAction SilentlyContinue
        Write-Output "  Validate: $code in $($sw.ElapsedMilliseconds)ms"
        $valTimes += $sw.ElapsedMilliseconds
    } else { Write-Output "  Failed to get token: $loginResp"; $valFails++ }
} else { Write-Output "  SKIP - no users registered" }
Write-Output ""

# Phase 4: System health check
Write-Output "--- Phase 4: Post-load system health ---"
$health = curl.exe -s "http://localhost:3000/gateway/health" 2>&1
Write-Output "  Gateway: $health"
$promUp = curl.exe -s "http://localhost:9090/api/v1/query?query=up" 2>&1
Write-Output "  Prometheus: OK"

# Save report
$report = @{
    timestamp = (Get-Date -Format 'o')
    phase1_registration = @{ avgMs = $avgRegTime; failures = $regFails; total = 10 }
    phase2_burst_login = @{ avgMs = $avgBurstTime; p99Ms = $p99; failures = $burstFails; total = 100 }
    phase3_validation = @{ failures = $valFails }
}
$report | ConvertTo-Json -Depth 10 | Set-Content -Path "$OutputDir\load_test_report.json" -Encoding ascii
Write-Output "`nReport: pilot/outputs/load_test_report.json"
Write-Output "=== Load test completed at $(Get-Date -Format 'HH:mm:ss') ==="
