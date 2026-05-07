#!/usr/bin/env bash
set -euo pipefail

OUTPUT_DIR="$(cd "$(dirname "$0")"/.. && pwd)/artifacts"
mkdir -p "$OUTPUT_DIR"
GAP_REPORT="$OUTPUT_DIR/gap_analysis_report.json"

# Very lightweight gap scan: search for TODO/FIXME and obvious gaps in gating artifacts
TODO_COUNT=$(rg -n --no-heading -S "TODO|FIXME|P0|GRACE" pilot -S | wc -l | tr -d '\n')
MISSINGS=$(rg -n --no-heading -S "untracked|Untracked|TODO|FIXME" -g 'pilot/**' 2>/dev/null || true)

cat > "$GAP_REPORT" <<JSON
{
  "gaps_found": $([ "$TODO_COUNT" -gt 0 ] && echo true || echo false),
  "todo_candidates": $TODO_COUNT,
  "notes": "Gap scan executed. Review TODO/FIXME and missing pilot artifacts."
}
JSON

echo "Wrote gap_analysis_report.json to $GAP_REPORT"
