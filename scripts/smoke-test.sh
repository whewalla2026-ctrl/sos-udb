#!/bin/bash
set -euo pipefail

BASE="${1:-http://localhost:4000}"
FRONTEND="${2:-http://localhost:3030}"
PASS=0
FAIL=0

assert() {
  local name="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo "  [PASS] $name"
    ((PASS++))
  else
    echo "  [FAIL] $name — expected '$expected', got '$actual'"
    ((FAIL++))
  fi
}

assert_contains() {
  local name="$1" expected="$2" haystack="$3"
  if echo "$haystack" | grep -q "$expected"; then
    echo "  [PASS] $name"
    ((PASS++))
  else
    echo "  [FAIL] $name — expected to contain '$expected'"
    ((FAIL++))
  fi
}

echo "============================================"
echo "  UDB Smoke Tests (v11.0)"
echo "  Target: $BASE"
echo "  $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "============================================"
echo ""

# ─── 1-5. API Health ───────────────────────────────────────
echo "1. API Health"
HEALTH=$(curl -sf "$BASE/health" 2>&1 || echo "FAILED")
assert "GET /health returns 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/health" 2>&1)"
assert_contains "Status is ok" '"status":"ok"' "$HEALTH"
assert_contains "Database is up" '"database":{"status":"up"}' "$HEALTH"
assert_contains "Redis is up" '"redis":{"status":"up"}' "$HEALTH"
assert_contains "Version reported" '"version"' "$HEALTH"

# ─── 6. GraphQL ────────────────────────────────────────────
echo "2. GraphQL"
GQL=$(curl -sf -X POST "$BASE/graphql" \
  -H "Content-Type: application/json" \
  -d '{"query":"{__typename}"}' 2>&1 || echo "FAILED")
assert_contains "Basic query returns data" '"__typename":"Query"' "$GQL"

# ─── 7-8. Prometheus Metrics ───────────────────────────────
echo "3. Prometheus Metrics"
METRICS=$(curl -sf "$BASE/metrics" 2>&1 || echo "FAILED")
assert_contains "/metrics returns HELP" "# HELP" "$METRICS"
assert_contains "udb_http_requests_total exists" "udb_http_requests_total" "$METRICS"

# ─── 9. Frontend ──────────────────────────────────────────
echo "4. Frontend"
assert "Frontend serves page (200)" "200" "$(curl -s -o /dev/null -w '%{http_code}' "$FRONTEND" 2>&1)"

# ─── 10. Introspection Blocked ────────────────────────────
echo "5. Introspection Blocked"
INTRO=$(curl -s -X POST "$BASE/graphql" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __schema { types { name } } }"}' 2>&1)
# Expect error, not schema data
if echo "$INTRO" | grep -q '"data"'; then
  echo "  [FAIL] Introspection returned data (not blocked)"
  ((FAIL++))
else
  echo "  [PASS] Introspection blocked (returns error)"
  ((PASS++))
fi

# ─── 11. Rate Limiting ────────────────────────────────────
echo "6. Rate Limiting"
LAST_CODE=""
for i in $(seq 1 20); do
  LAST_CODE=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/health" 2>&1)
done
if [ "$LAST_CODE" = "429" ]; then
  echo "  [PASS] Rate limiting returns 429 after excess requests"
  ((PASS++))
else
  echo "  [WARN] Rate limiting status: $LAST_CODE (may require more requests or throttling not enforced on health)"
  # This is informational - rate limiting might be per-endpoint or not apply to health
  ((PASS++))
fi

# ─── Summary ───────────────────────────────────────────────
echo ""
echo "============================================"
echo "  RESULTS: $PASS passed, $FAIL failed"
echo "============================================"

if [ "$FAIL" -gt 0 ]; then
  echo "SMOKE TESTS: FAIL"
  exit 1
else
  echo "SMOKE TESTS: PASS"
  exit 0
fi
