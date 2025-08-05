#!/bin/bash

echo "🍄 Starting Mushroom Foraging App with Swiss Fungi Integration"
echo "============================================================="

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if dependencies are up to date
echo "🔍 Checking dependencies..."
npm ls --depth=0 > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "⚠️  Some dependencies may be missing. Running npm install..."
    npm install
fi

# Set environment variables
export NODE_ENV=development
export PORT=5000

echo "🚀 Starting development server..."
echo "   - Server will run on http://localhost:5000"
echo "   - Client will be served with hot reload"
echo "   - Swiss Fungi integration enabled"
echo ""

# Start the development server
npm run dev