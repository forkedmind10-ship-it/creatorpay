#!/bin/bash

# CreatorPay Website Launcher
echo "🦀 Starting CreatorPay Website..."
echo ""
echo "🌐 Website: http://localhost:3000"
echo "📊 Dashboard: http://localhost:3000/dashboard.html"
echo "🔧 API Health: http://localhost:3000/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Start the server
npm start