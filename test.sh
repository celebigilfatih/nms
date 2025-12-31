#!/bin/bash
# NMS Application Testing Script
# Comprehensive test suite for all components

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="http://localhost:3001/api"
FRONTEND_URL="http://localhost:3000"
WS_URL="ws://localhost:3000/ws"
TEST_RESULTS=()
PASSED=0
FAILED=0

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

log_test() {
  echo -e "${BLUE}[TEST]${NC} $1"
}

log_pass() {
  echo -e "${GREEN}[PASS]${NC} $1"
  ((PASSED++))
}

log_fail() {
  echo -e "${RED}[FAIL]${NC} $1"
  ((FAILED++))
  TEST_RESULTS+=("$1")
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

check_service() {
  local service=$1
  local port=$2
  log_test "Checking $service on port $port..."
  
  if nc -z localhost $port 2>/dev/null; then
    log_pass "$service is running"
    return 0
  else
    log_fail "$service is not accessible on port $port"
    return 1
  fi
}

# ============================================================================
# CONNECTIVITY TESTS
# ============================================================================

test_connectivity() {
  echo -e "\n${BLUE}=== CONNECTIVITY TESTS ===${NC}"
  
  check_service "Frontend" 3000
  check_service "Backend API" 3001
  check_service "PostgreSQL" 5432
}

# ============================================================================
# FRONTEND TESTS
# ============================================================================

test_frontend() {
  echo -e "\n${BLUE}=== FRONTEND TESTS ===${NC}"
  
  log_test "Testing frontend accessibility..."
  local response=$(curl -s -o /dev/null -w "%{http_code}" $FRONTEND_URL)
  
  if [ "$response" = "200" ]; then
    log_pass "Frontend responds with 200 OK"
  else
    log_fail "Frontend returned $response instead of 200"
  fi
}

# ============================================================================
# API ENDPOINT TESTS
# ============================================================================

test_api_endpoints() {
  echo -e "\n${BLUE}=== API ENDPOINT TESTS ===${NC}"
  
  # Health check
  log_test "Testing /api/health endpoint..."
  response=$(curl -s $API_URL/health)
  if echo "$response" | grep -q "healthy"; then
    log_pass "Health check passed"
  else
    log_fail "Health check failed: $response"
  fi
  
  # Devices endpoint
  log_test "Testing GET /api/devices..."
  response=$(curl -s -w "\n%{http_code}" $API_URL/devices)
  http_code=$(echo "$response" | tail -1)
  if [ "$http_code" = "200" ]; then
    log_pass "Devices endpoint returns 200"
  else
    log_fail "Devices endpoint returned $http_code"
  fi
  
  # Alarms endpoint
  log_test "Testing GET /api/alarms..."
  response=$(curl -s -w "\n%{http_code}" $API_URL/alarms)
  http_code=$(echo "$response" | tail -1)
  if [ "$http_code" = "200" ]; then
    log_pass "Alarms endpoint returns 200"
  else
    log_fail "Alarms endpoint returned $http_code"
  fi
  
  # Settings endpoint
  log_test "Testing GET /api/settings..."
  response=$(curl -s -w "\n%{http_code}" $API_URL/settings)
  http_code=$(echo "$response" | tail -1)
  if [ "$http_code" = "200" ]; then
    log_pass "Settings endpoint returns 200"
  else
    log_fail "Settings endpoint returned $http_code"
  fi
}

# ============================================================================
# AUTHENTICATION TESTS
# ============================================================================

test_authentication() {
  echo -e "\n${BLUE}=== AUTHENTICATION TESTS ===${NC}"
  
  log_test "Testing login with valid credentials..."
  response=$(curl -s -X POST $API_URL/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@nms.local","password":"admin123"}')
  
  if echo "$response" | grep -q "success"; then
    log_pass "Login successful"
    TOKEN=$(echo "$response" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  else
    log_fail "Login failed: $response"
  fi
  
  log_test "Testing login with invalid credentials..."
  response=$(curl -s -X POST $API_URL/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@nms.local","password":"wrong"}')
  
  if echo "$response" | grep -q "success.*false"; then
    log_pass "Invalid credentials properly rejected"
  else
    log_warn "Unexpected response for invalid credentials"
  fi
}

# ============================================================================
# DATABASE TESTS
# ============================================================================

test_database() {
  echo -e "\n${BLUE}=== DATABASE TESTS ===${NC}"
  
  log_test "Testing database connectivity..."
  # This would require psql installed
  result=$(docker-compose exec -T postgres pg_isready -U nms_user 2>/dev/null)
  
  if [ $? -eq 0 ]; then
    log_pass "Database is accessible"
  else
    log_warn "Could not verify database (psql may not be installed)"
  fi
  
  log_test "Checking database tables..."
  log_warn "Manual verification needed - check DEPLOYMENT.md for SQL commands"
}

# ============================================================================
# PERFORMANCE TESTS
# ============================================================================

test_performance() {
  echo -e "\n${BLUE}=== PERFORMANCE TESTS ===${NC}"
  
  log_test "Testing API response time (5 requests)..."
  total_time=0
  max_time=0
  min_time=9999
  
  for i in {1..5}; do
    response_time=$(curl -s -w "%{time_total}" -o /dev/null $API_URL/devices)
    time_ms=$(echo "$response_time * 1000" | bc)
    
    if (( $(echo "$time_ms > $max_time" | bc -l) )); then
      max_time=$time_ms
    fi
    if (( $(echo "$time_ms < $min_time" | bc -l) )); then
      min_time=$time_ms
    fi
    total_time=$(echo "$total_time + $time_ms" | bc)
  done
  
  avg_time=$(echo "$total_time / 5" | bc)
  
  if (( $(echo "$avg_time < 200" | bc -l) )); then
    log_pass "API response time good: Avg=${avg_time}ms, Min=${min_time}ms, Max=${max_time}ms"
  else
    log_warn "API response time high: Avg=${avg_time}ms (target: <200ms)"
  fi
  
  log_test "Testing frontend page load time..."
  page_time=$(curl -s -w "%{time_total}" -o /dev/null $FRONTEND_URL)
  page_time_ms=$(echo "$page_time * 1000" | bc)
  
  if (( $(echo "$page_time_ms < 2000" | bc -l) )); then
    log_pass "Frontend load time good: ${page_time_ms}ms"
  else
    log_warn "Frontend load time high: ${page_time_ms}ms (target: <2000ms)"
  fi
}

# ============================================================================
# SECURITY TESTS
# ============================================================================

test_security() {
  echo -e "\n${BLUE}=== SECURITY TESTS ===${NC}"
  
  log_test "Checking for CORS headers..."
  response=$(curl -s -I $API_URL/health | grep -i "access-control")
  if [ ! -z "$response" ]; then
    log_pass "CORS headers present"
  else
    log_warn "CORS headers not found"
  fi
  
  log_test "Checking for security headers..."
  response=$(curl -s -I $FRONTEND_URL | grep -i "x-content-type-options")
  if [ ! -z "$response" ]; then
    log_pass "Security headers present"
  else
    log_warn "Security headers not fully configured"
  fi
  
  log_test "Testing unauthorized access..."
  response=$(curl -s -w "\n%{http_code}" $API_URL/admin)
  http_code=$(echo "$response" | tail -1)
  
  if [ "$http_code" = "401" ] || [ "$http_code" = "403" ]; then
    log_pass "Unauthorized access properly rejected"
  else
    log_warn "Authorization check may need review (received $http_code)"
  fi
}

# ============================================================================
# MAIN TEST SUITE
# ============================================================================

run_all_tests() {
  echo -e "${BLUE}"
  echo "╔════════════════════════════════════════════════════╗"
  echo "║  NMS Application Test Suite                        ║"
  echo "║  Starting comprehensive testing...                 ║"
  echo "╚════════════════════════════════════════════════════╝"
  echo -e "${NC}"
  
  # Run all test suites
  test_connectivity
  test_frontend
  test_api_endpoints
  test_authentication
  test_database
  test_performance
  test_security
  
  # Print summary
  echo -e "\n${BLUE}=== TEST SUMMARY ===${NC}"
  echo -e "${GREEN}Passed: $PASSED${NC}"
  echo -e "${RED}Failed: $FAILED${NC}"
  
  if [ ${#TEST_RESULTS[@]} -gt 0 ]; then
    echo -e "\n${YELLOW}Failed Tests:${NC}"
    for test in "${TEST_RESULTS[@]}"; do
      echo -e "  ${RED}✗${NC} $test"
    done
  fi
  
  local total=$((PASSED + FAILED))
  local success_rate=$((PASSED * 100 / total))
  
  echo -e "\n${BLUE}Success Rate: ${success_rate}% (${PASSED}/${total})${NC}"
  
  if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}\n"
    return 0
  else
    echo -e "${YELLOW}⚠ Some tests failed. Review output above.${NC}\n"
    return 1
  fi
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

# Check if running in Docker environment
if ! command -v docker &> /dev/null; then
  log_warn "Docker not found. Some tests may not work."
fi

# Check if curl is available
if ! command -v curl &> /dev/null; then
  log_fail "curl is required for testing"
  exit 1
fi

# Run all tests
run_all_tests

# Exit with appropriate code
if [ $FAILED -eq 0 ]; then
  exit 0
else
  exit 1
fi
