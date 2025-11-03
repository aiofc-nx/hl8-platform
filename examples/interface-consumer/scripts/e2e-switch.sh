#!/usr/bin/env bash
set -euo pipefail

# 演示：切换不同实现（例如不同 cache/logger 实现）保持相同行为
# 约定：通过环境变量 INFRA_IMPL 指定实现标识（mock、inmem、real 等）

INFRA_IMPL=${INFRA_IMPL:-mock}
API_BASE=${API_BASE:-http://localhost:3000}
TENANT_ID=${TENANT_ID:-t-001}
ENTITY_ID=${ENTITY_ID:-e-001}

echo "[E2E] Using INFRA_IMPL=${INFRA_IMPL} API_BASE=${API_BASE}"
echo "[E2E] Testing contract consistency across implementations..."

export INFRA_IMPL

# 测试结果计数器
PASSED=0
FAILED=0

# 辅助函数：测试端点并校验响应
test_endpoint() {
  local method=$1
  local endpoint=$2
  local expected_status=${3:-200}
  local description=$4

  echo "[TEST] ${description}"
  echo "  → ${method} ${endpoint}"

  local response
  local status_code

  if [ "${method}" = "GET" ]; then
    response=$(curl -sS -w "\n%{http_code}" "${API_BASE}${endpoint}" || echo -e "\n000")
  elif [ "${method}" = "POST" ]; then
    response=$(curl -sS -w "\n%{http_code}" -X POST \
      -H "Content-Type: application/json" \
      -d '{"name":"test-entity"}' \
      "${API_BASE}${endpoint}" || echo -e "\n000")
  else
    echo "  ✗ Unsupported method: ${method}"
    ((FAILED++))
    return 1
  fi

  status_code=$(echo "${response}" | tail -n1)
  body=$(echo "${response}" | sed '$d')

  if [ "${status_code}" = "${expected_status}" ]; then
    echo "  ✓ Status: ${status_code}"
    if command -v jq &> /dev/null && [ -n "${body}" ]; then
      echo "${body}" | jq -C '.' 2>/dev/null | head -n 5 || echo "  (non-JSON response)"
    fi
    ((PASSED++))
    return 0
  else
    echo "  ✗ Expected status ${expected_status}, got ${status_code}"
    echo "  Response: ${body}"
    ((FAILED++))
    return 1
  fi
}

# 测试 REST v1 端点（与 @hl8/interface-kernel@1.x 对齐）
echo ""
echo "[SECTION] REST API v1 Contract Tests"
echo "====================================="

# GET /v1/tenants/:tenantId/entities/:entityId
test_endpoint \
  "GET" \
  "/v1/tenants/${TENANT_ID}/entities/${ENTITY_ID}" \
  200 \
  "Get entity by ID"

# GET /v1/tenants/:tenantId/entities (with pagination)
test_endpoint \
  "GET" \
  "/v1/tenants/${TENANT_ID}/entities?page=1&limit=10" \
  200 \
  "List entities with pagination"

# POST /v1/tenants/:tenantId/entities
test_endpoint \
  "POST" \
  "/v1/tenants/${TENANT_ID}/entities" \
  201 \
  "Create entity"

# 输出测试摘要
echo ""
echo "[SUMMARY]"
echo "====================================="
echo "Passed: ${PASSED}"
echo "Failed: ${FAILED}"
echo "Total:  $((PASSED + FAILED))"

if [ ${FAILED} -eq 0 ]; then
  echo "[E2E] ✓ All tests passed - contract consistency verified"
  exit 0
else
  echo "[E2E] ✗ Some tests failed - contract may be inconsistent"
  exit 1
fi
