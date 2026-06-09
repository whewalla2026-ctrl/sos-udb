#!/bin/sh
BASE=http://localhost:3000
for page in "/" "/auth/login" "/dashboard" "/dashboard/quests" "/dashboard/tutor" "/dashboard/safety" "/dashboard/doter"; do
  echo "Testing $page..."
  code=$(curl -s -o /dev/null -w "%{http_code}" $BASE$page)
  if [ "$code" = "200" ] || [ "$code" = "302" ]; then
    echo "  ✅ $page → $code"
  else
    echo "  ❌ $page → $code"
  fi
done
