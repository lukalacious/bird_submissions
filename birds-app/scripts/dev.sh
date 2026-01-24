#!/bin/bash
# Development server startup script
#
# Usage:
#   cd ~/Documents/code/projects/birds/birds-app
#   ./scripts/dev.sh
#
# Note: Uses webpack bundler (not Turbopack) for stability

set -e

cd "$(dirname "$0")/.."

echo "🧹 Cleaning up..."

# Kill any existing Next.js processes
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

echo "🚀 Starting development server (webpack)..."
echo "   Access at: http://localhost:3000"
echo ""

# Start the dev server with webpack
npm run dev
