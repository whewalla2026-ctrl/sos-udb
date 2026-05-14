#!/bin/bash
sleep 30
echo "=== Container Status ==="
docker ps --filter name=udb-api --format "{{.Names}} {{.Status}}"
echo "=== Health Check ==="
docker exec udb-api sh -c "curl -s http://localhost:4000/health" 2>&1 || echo "FAILED"
echo ""
echo "=== GraphQL ==="
docker exec udb-api sh -c "curl -s -X POST http://localhost:4000/graphql -H 'content-type: application/json' -H 'x-apollo-operation-name: test' -d '{\"query\":\"{ __typename }\"}'" 2>&1 || echo "FAILED"
