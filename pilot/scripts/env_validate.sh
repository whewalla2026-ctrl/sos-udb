#!/usr/bin/env bash
set -euo pipefail

# Lightweight environment validation for Phase 1/Phase 2 gating
# Outputs a JSON artifact at pilot/artifacts/env_validation.json

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="$(cd "$SCRIPT_DIR/../../pilot/artifacts" && pwd)"
OUTPUT_JSON="$OUTPUT_DIR/env_validation.json"

mkdir -p "$OUTPUT_DIR"

NODE_VER=$(node -v 2>/dev/null || echo "not_found")
NPM_VER=$(npm -v 2>/dev/null || echo "not_found")
PSQL_VER=$(psql -V 2>/dev/null | awk '{print $NF}' || "not_found")
CANVAS_BASE="${CANVAS_BASE:-http://localhost:8080}"
CANVAS_HEALTH_OK=false
if command -v curl >/dev/null 2>&1; then
  if curl -sSf --max-time 2 "$CANVAS_BASE/health" >/dev/null 2>&1; then
    CANVAS_HEALTH_OK=true
  fi
fi
VECTOR_GUARD_FLAG="${VECTOR_GUARD_FLAG:-false}"

cat > "$OUTPUT_JSON" <<JSON
{
  "node_version": "$NODE_VER",
  "npm_version": "$NPM_VER",
  "psql_version": "$PSQL_VER",
  "canvas_health": $CANVAS_HEALTH_OK,
  "canvas_base": "$CANVAS_BASE",
  "vector_store_guarded": $VECTOR_GUARD_FLAG,
  "env_generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
JSON

echo "Wrote env_validation.json to $OUTPUT_JSON"
