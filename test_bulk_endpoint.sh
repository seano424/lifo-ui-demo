#!/bin/bash
#
# Simple test of the bulk scoring endpoint
#
# Usage: ./test_bulk_endpoint.sh
# Or run the curl command directly

echo "🧪 Testing Bulk Scoring Endpoint"
echo "================================"

# Configuration
API_URL="http://localhost:8000"
STORE_ID="e3b41480-79a3-4cb7-8151-3fe014a1b60f"  # Use your actual store ID
ENDPOINT="/api/v1/scoring/batch/${STORE_ID}/bulk"

# You'll need to replace this with your actual auth token
# Get it from browser dev tools when logged in, or use API key
AUTH_TOKEN="your-auth-token-here"

echo "🌐 API URL: ${API_URL}"
echo "🏪 Store ID: ${STORE_ID}"
echo "📡 Endpoint: ${ENDPOINT}"
echo ""

if [ "$AUTH_TOKEN" = "your-auth-token-here" ]; then
    echo "⚠️  WARNING: Please set your actual AUTH_TOKEN in this script"
    echo "   You can get it from browser dev tools or use an API key"
    echo ""
fi

echo "🚀 Making request..."
echo "===================="

# Make the request with detailed output
curl -X POST "${API_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{"force_recalculate": false}' \
  -w "\n\nHTTP Status: %{http_code}\nTotal Time: %{time_total}s\nConnect Time: %{time_connect}s\n" \
  -v

echo ""
echo "🏁 Test completed"
echo ""
echo "Expected results:"
echo "✅ HTTP Status: 200"
echo "✅ Response time: <10 seconds"
echo "✅ JSON response with processed batch counts"
echo "❌ If you get 500 error, check the API logs for details"