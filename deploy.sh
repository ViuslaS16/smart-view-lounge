#!/bin/bash
# SmartView Lounge — Deploy Script
# Builds locally (VPS has insufficient RAM for tsc) then uploads compiled dist
# Usage: ./deploy.sh [backend|frontend|all]

set -e

VPS="root@157.230.36.140"
VPS_APP_DIR="/home/smartviewlounge/smart-view-lounge"
MODE="${1:-all}"

echo "🚀 SmartView Deploy — mode: $MODE"

if [[ "$MODE" == "backend" || "$MODE" == "all" ]]; then
  echo ""
  echo "▶ Building backend locally..."
  cd "$(dirname "$0")/backend"
  npx tsc
  echo "✅ Backend compiled"

  echo "▶ Uploading dist/ to VPS..."
  tar czf /tmp/sv-backend-dist.tar.gz dist/
  sshpass -p 'SmartV@2003Lounge' scp -o StrictHostKeyChecking=no \
    /tmp/sv-backend-dist.tar.gz "$VPS:/tmp/sv-backend-dist.tar.gz"

  echo "▶ Deploying on VPS..."
  sshpass -p 'SmartV@2003Lounge' ssh -o StrictHostKeyChecking=no "$VPS" "
    cd $VPS_APP_DIR && git pull origin main
    cd backend && rm -rf dist && tar xzf /tmp/sv-backend-dist.tar.gz
    chown -R smartviewlounge:smartviewlounge dist
    su - smartviewlounge -c 'pm2 restart smartview-backend'
    echo '✅ Backend deployed and restarted'
  "
fi

if [[ "$MODE" == "frontend" || "$MODE" == "all" ]]; then
  echo ""
  echo "▶ Building frontend locally..."
  cd "$(dirname "$0")/frontend"
  npm run build
  echo "✅ Frontend compiled"

  echo "▶ Uploading .next/ to VPS..."
  tar czf /tmp/sv-frontend-next.tar.gz .next/
  sshpass -p 'SmartV@2003Lounge' scp -o StrictHostKeyChecking=no \
    /tmp/sv-frontend-next.tar.gz "$VPS:/tmp/sv-frontend-next.tar.gz"

  echo "▶ Deploying on VPS..."
  sshpass -p 'SmartV@2003Lounge' ssh -o StrictHostKeyChecking=no "$VPS" "
    cd $VPS_APP_DIR/frontend && rm -rf .next && tar xzf /tmp/sv-frontend-next.tar.gz
    chown -R smartviewlounge:smartviewlounge .next
    su - smartviewlounge -c 'pm2 restart smartview-frontend'
    echo '✅ Frontend deployed and restarted'
  "
fi

echo ""
echo "🎉 Deploy complete!"
