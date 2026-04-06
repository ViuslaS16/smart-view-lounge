#!/bin/bash

echo "🚀 Starting SmartView Lounge Development Servers..."
echo "==================================================="

# Setup cleanup trap so Ctrl+C kills both terminal processes
trap 'echo -e "\n🛑 Stopping servers..."; kill 0' SIGINT SIGTERM EXIT

# Start backend in the background
echo "🟢 Starting Backend NodeAPI..."
cd backend || exit
npm run dev &
BACKEND=$!

cd ..

# Start frontend in the background
echo "🟢 Starting Frontend Next.js..."
cd frontend || exit
npm run dev &
FRONTEND=$!

# Wait for processes
wait $BACKEND
wait $FRONTEND
