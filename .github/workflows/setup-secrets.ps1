# Run this script to generate secrets, then paste them into GitHub UI
# GitHub Repo: https://github.com/whewalla2026-ctrl/sos-udb
# Settings > Secrets and variables > Actions > New repository secret

$ErrorActionPreference = "Stop"

function New-RandomString($length, $chars) {
    -join ((48..57) + (65..90) + (97..122) + $chars | Get-Random -Count $length | ForEach-Object {[char]$_})
}

Write-Host "=== Generate and paste each secret into GitHub ==="
Write-Host "`n1. JWT_SECRET:"
$s1 = New-RandomString 128 @(33..47)
Write-Host "   $s1"

Write-Host "`n2. DB_PASSWORD:"
$s2 = New-RandomString 32 @(33..47)
Write-Host "   $s2"

Write-Host "`n3. REDIS_PASSWORD:"
$s3 = New-RandomString 64 @()
Write-Host "   $s3"

Write-Host "`n4. GRAFANA_ADMIN_PASSWORD:"
$s4 = New-RandomString 32 @(33..47)
Write-Host "   $s4"

Write-Host "`n5. BACKUP_ENCRYPTION_KEY:"
$s5 = New-RandomString 64 @()
Write-Host "   $s5"

Write-Host "`n6. CI_JWT_SECRET:"
$s6 = New-RandomString 64 @()
Write-Host "   $s6"

Write-Host "`n`n=== Branch Protection ==="
Write-Host "GitHub Repo > Settings > Branches > Add rule"
Write-Host "Branch: release/v1-production"
Write-Host "- Require pull request before merging"
Write-Host "- Require status checks (typecheck, lint, test, docker-build)"
Write-Host "- Require branches up to date"
Write-Host "- Do not allow bypassing"

Write-Host "`n=== After secrets configured, verify CI ==="
Write-Host "GitHub Repo > Actions tab"
Write-Host "Push a trivial commit to trigger:"
Write-Host "  git commit --allow-empty -m 'ci: trigger pipeline'"
Write-Host "  git push origin release/v1-production"
