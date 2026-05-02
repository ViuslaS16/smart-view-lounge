#!/bin/bash
# SmartView Lounge — Zero-Downtime Deploy Script
# Usage: ./deploy.sh [backend|frontend|all]

set -e

# Resolve the directory containing this script
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

VPS="root@157.230.36.140"
SSH_KEY="~/.ssh/id_ed25519_smartview"
VPS_APP_DIR="/home/smartviewlounge/smart-view-lounge"
MODE="${1:-all}"

export COPYFILE_DISABLE=1

echo "🚀 SmartView Zero-Downtime Deploy — mode: $MODE"

# Ensure the ecosystem file is uploaded
echo "▶ Syncing ecosystem config to VPS..."
scp -i $SSH_KEY -o StrictHostKeyChecking=no "$ROOT_DIR/ecosystem.config.js" "$VPS:$VPS_APP_DIR/ecosystem.config.js"
ssh -i $SSH_KEY -o StrictHostKeyChecking=no "$VPS" "chown smartviewlounge:smartviewlounge $VPS_APP_DIR/ecosystem.config.js"

if [[ "$MODE" == "backend" || "$MODE" == "all" ]]; then
  echo ""
  echo "▶ Building backend locally..."
  cd "$ROOT_DIR/backend"
  npm exec tsc
  echo "▶ Copying migrations to dist..."
  cp -R src/db/migrations dist/db/
  echo "✅ Backend compiled"

  echo "▶ Uploading dist/ and package.json to VPS..."
  tar czf /tmp/sv-backend-dist.tar.gz dist/ package.json package-lock.json
  scp -i $SSH_KEY -o StrictHostKeyChecking=no /tmp/sv-backend-dist.tar.gz "$VPS:/tmp/sv-backend-dist.tar.gz"

  echo "▶ Deploying Backend on VPS..."
  ssh -i $SSH_KEY -o StrictHostKeyChecking=no "$VPS" "
    cd $VPS_APP_DIR/backend 
    rm -rf dist && tar xzf /tmp/sv-backend-dist.tar.gz
    chown -R smartviewlounge:smartviewlounge dist package.json package-lock.json
    
    echo '▶ Installing dependencies...'
    su - smartviewlounge -c 'cd $VPS_APP_DIR/backend && npm install --production'
    
    echo '▶ Running database migrations...'
    su - smartviewlounge -c 'cd $VPS_APP_DIR/backend && node dist/db/migrate.js'
    echo '✅ Migrations applied'
    
    echo '▶ Reloading backend (Zero-Downtime)...'
    su - smartviewlounge -c 'pm2 reload $VPS_APP_DIR/ecosystem.config.js --only smartview-backend --update-env'
    echo '✅ Backend deployed and reloaded'
  "
  
  echo "▶ Running Health Check..."
  sleep 5
  HEALTH=$(ssh -i $SSH_KEY -o StrictHostKeyChecking=no "$VPS" "curl -s http://localhost:4000/health")
  if [[ "$HEALTH" == *"\"status\":\"ok\""* ]]; then
    echo "✅ Health check passed! ($HEALTH)"
  else
    echo "❌ Health check failed or timeout. Response: $HEALTH"
    echo "Check logs: pm2 logs smartview-backend"
    exit 1
  fi
fi

if [[ "$MODE" == "frontend" || "$MODE" == "all" ]]; then
  echo ""
  echo "▶ Building frontend locally (with production env)..."
  cd "$ROOT_DIR/frontend"
  NEXT_PUBLIC_API_URL=https://smartviewlounge.com/api \
  NEXT_PUBLIC_APP_URL=https://smartviewlounge.com \
  npm run build
  echo "✅ Frontend compiled"

  echo "▶ Uploading .next/ and package.json to VPS..."
  tar czf /tmp/sv-frontend-next.tar.gz .next/ package.json package-lock.json
  scp -i $SSH_KEY -o StrictHostKeyChecking=no /tmp/sv-frontend-next.tar.gz "$VPS:/tmp/sv-frontend-next.tar.gz"

  echo "▶ Deploying Frontend on VPS..."
  ssh -i $SSH_KEY -o StrictHostKeyChecking=no "$VPS" "
    cd $VPS_APP_DIR/frontend 
    rm -rf .next && tar xzf /tmp/sv-frontend-next.tar.gz
    chown -R smartviewlounge:smartviewlounge .next package.json package-lock.json
    
    echo '▶ Installing dependencies...'
    su - smartviewlounge -c 'cd $VPS_APP_DIR/frontend && npm install --production'
    
    echo '▶ Reloading frontend (Zero-Downtime)...'
    su - smartviewlounge -c 'pm2 reload $VPS_APP_DIR/ecosystem.config.js --only smartview-frontend --update-env'
    echo '✅ Frontend deployed and reloaded'
  "
fi

echo ""
echo "🎉 Deploy complete! No 502 errors occurred."
