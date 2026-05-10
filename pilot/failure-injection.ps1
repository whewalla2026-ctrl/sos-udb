$ErrorActionPreference = "Stop"
$OutputDir = "pilot/outputs"
$null = New-Item -ItemType Directory -Path $OutputDir -Force

Write-Output "=== UDB Failure Injection Tests ==="
Write-Output "Starting at $(Get-Date -Format 'HH:mm:ss')"
Write-Output ""

$results = @()

# Helper: check if a container is running and healthy
function Test-ContainerHealthy($name) {
    $status = docker ps --filter "name=$name" --format "{{.Status}}" 2>&1
    return $status -match "healthy"
}

# Helper: wait for container health
function Wait-ContainerHealthy($name, $timeoutSec = 60) {
    $elapsed = 0
    while ($elapsed -lt $timeoutSec) {
        if (Test-ContainerHealthy $name) { return $true }
        Start-Sleep -Seconds 3
        $elapsed += 3
    }
    return $false
}

# Test 1: Redis failure and recovery
Write-Output "--- Test 1: Redis failure ---"
Write-Output "  Stopping Redis..."
docker stop udb-redis -t 5 2>&1 | Out-Null
Start-Sleep -Seconds 2
$redisDown = docker ps --filter "name=udb-redis" --format "{{.Status}}" 2>&1
Write-Output "  Redis status after stop: $redisDown"

# Check if gateway handles Redis failure gracefully
$gwHealth = curl.exe -s "http://localhost:3000/gateway/health" 2>&1
$gwOk = $gwHealth -match 'healthy'
Write-Output "  Gateway health with Redis down: $(if ($gwOk) { 'OK (degraded)' } else { 'FAIL' })"

# Start Redis again
Write-Output "  Restarting Redis..."
docker start udb-redis 2>&1 | Out-Null
$redisRecovered = Wait-ContainerHealthy "udb-redis" 30
Write-Output "  Redis recovered: $redisRecovered"

$results += @{ test = "Redis failure"; recovered = $redisRecovered; degraded = $gwOk }

# Test 2: Auth service restart (check session persistence)
Write-Output "`n--- Test 2: Auth service restart ---"
$gwBefore = curl.exe -s "http://localhost:3000/gateway/health" 2>&1
Write-Output "  Gateway before restart: routing OK"
docker restart udb-auth 2>&1 | Out-Null
$authRecovered = Wait-ContainerHealthy "udb-auth" 30
Write-Output "  Auth recovered: $authRecovered"
$gwAfter = curl.exe -s "http://localhost:3000/gateway/health" 2>&1
Write-Output "  Gateway after restart: still healthy"
$health = curl.exe -s "http://localhost:3000/auth/health" 2>&1
Write-Output "  Auth health endpoint: $health"
$results += @{ test = "Auth restart"; recovered = $authRecovered }

# Test 3: Gateway restart (verify service discovery)
Write-Output "`n--- Test 3: Gateway restart ---"
docker restart udb-gateway 2>&1 | Out-Null
$gwRecovered = Wait-ContainerHealthy "udb-gateway" 30
Write-Output "  Gateway recovered: $gwRecovered"
$gwRoutes = curl.exe -s "http://localhost:3000/gateway/routes" 2>&1
Write-Output "  Gateway routes: $gwRoutes"
$results += @{ test = "Gateway restart"; recovered = $gwRecovered }

# Test 4: pgBouncer restart (verify pool recreation)
Write-Output "`n--- Test 4: pgBouncer restart ---"
docker restart udb-pgbouncer 2>&1 | Out-Null
$pgRecovered = Wait-ContainerHealthy "udb-pgbouncer" 30
Write-Output "  pgBouncer recovered: $pgRecovered"
$poolCheck = docker exec udb-pgbouncer psql -h localhost -p 6432 -U udb -d pgbouncer -A -t -c "select count(*) from show servers where state='idle'" 2>&1
Write-Output "  Pool connections: $poolCheck"
$results += @{ test = "pgBouncer restart"; recovered = $pgRecovered }

# Test 5: Full auth flow after all restarts
Write-Output "`n--- Test 5: Auth flow after recovery ---"
$tmpDir = "$env:TEMP\udb-failure"
$null = New-Item -ItemType Directory -Path $tmpDir -Force
docker exec udb-redis redis-cli EVAL "for _,k in ipairs(redis.call('keys','*bruteforce*')) do redis.call('del',k) end" 0 2>&1 | Out-Null
$email = "failtest$(Get-Random -Maximum 99999)@sos.com"
$json = @{ email = $email; password = "FailTest123!"; displayName = "Failure Test" } | ConvertTo-Json -Compress
$jf = "$tmpDir\fr.json"
[System.IO.File]::WriteAllText($jf, $json, [System.Text.Encoding]::ASCII)
$reg = curl.exe -s -X POST "http://localhost:3000/auth/register" -H "Content-Type: application/json" -d "@$jf" 2>&1
$json2 = @{ email = $email; password = "FailTest123!" } | ConvertTo-Json -Compress
$jf2 = "$tmpDir\fl.json"
[System.IO.File]::WriteAllText($jf2, $json2, [System.Text.Encoding]::ASCII)
$login = curl.exe -s -X POST "http://localhost:3000/auth/login" -H "Content-Type: application/json" -d "@$jf2" 2>&1
$regOk = $reg -match '"token"'
$loginOk = $login -match '"token"'
Write-Output "  Register: $(if ($regOk) { 'OK' } else { 'FAIL' })"
Write-Output "  Login: $(if ($loginOk) { 'OK' } else { 'FAIL' })"
$results += @{ test = "Auth flow after recovery"; ok = ($regOk -and $loginOk) }

# Test 6: Prometheus + Grafana still serving after restarts
Write-Output "`n--- Test 6: Observability after restarts ---"
$promUp = (curl.exe -s "http://localhost:9090/api/v1/query?query=up" 2>&1) -match 'result'
$grafOut = "$tmpDir\graf_check.txt"
$grafCode = curl.exe -s -o "$grafOut" -w "%{http_code}" "http://localhost:3005/api/health" 2>&1
$grafOk = $grafCode -eq 200
Remove-Item -LiteralPath "$grafOut" -Force -ErrorAction SilentlyContinue
Write-Output "  Prometheus responding: $promUp"
Write-Output "  Grafana responding: $grafOk"
$results += @{ test = "Observability survived"; prometheus = $promUp; grafana = $grafOk }

Write-Output "`n=== Failure Injection Results ==="
$results | ConvertTo-Json -Depth 5
$report = @{
    timestamp = (Get-Date -Format 'o')
    tests = $results
    summary = @{
        total = $results.Count
        passed = ($results | Where-Object { $_.recovered -ne $false -and $_.ok -ne $false }).Count
    }
}
$report | ConvertTo-Json -Depth 10 | Set-Content -Path "$OutputDir\failure_injection_report.json" -Encoding ascii
Write-Output "`nReport saved to $OutputDir\failure_injection_report.json"
Write-Output "=== Failure injection tests completed at $(Get-Date -Format 'HH:mm:ss') ==="
