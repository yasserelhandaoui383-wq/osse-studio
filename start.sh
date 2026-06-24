#!/usr/bin/env bash
# Osse Studio - one-click start (macOS/Linux)
set -e
echo "=== Osse Studio ==="
npm install
npm run setup
echo ""
echo "Starting app at http://localhost:3000  (press Ctrl+C to stop)"
npm run dev
