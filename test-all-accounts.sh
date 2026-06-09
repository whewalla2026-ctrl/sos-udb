#!/bin/sh
BASE=http://localhost:3000
for email in "sarah.demo@udb.app" "leo.demo@udb.app" "maya.demo@udb.app" "admin.demo@udb.app"; do
  case $email in
    "leo.demo@udb.app") pw="DemoKidPass123!" ;;
    "maya.demo@udb.app") pw="DemoTeenPass123!" ;;
    "admin.demo@udb.app") pw="DemoAdmin123!" ;;
    *) pw="DemoParent123!" ;;
  esac
  echo "Testing $email..."
  resp=$(curl -s -X POST $BASE/auth/login -H "Content-Type: application/json" -d "{\"email\":\"$email\",\"password\":\"$pw\"}")
  if echo "$resp" | grep -q token; then
    echo "  ✅ PASS"
  else
    echo "  ❌ FAIL: $resp"
  fi
done
