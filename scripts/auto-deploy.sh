#!/usr/bin/env bash

set -euo pipefail

BLUE='\033[1;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

msg=${1:-"chore(deploy): auto-deploy"}

echo -e "${BLUE}▶ Auto Deploy: build, commit, push, deploy${NC}"

# 0) Sanity checks
if [ ! -f "client/package.json" ]; then
  echo -e "${RED}✖ Not at repo root (client/package.json missing).${NC}"
  exit 1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo -e "${RED}✖ Git repo not initialized here.${NC}"
  exit 1
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  echo -e "${RED}✖ No git remote 'origin' set. Add it, then re-run.${NC}"
  exit 1
fi

# 1) Ensure local is up-to-date
echo -e "${BLUE}• Pulling latest from origin/main (rebase)${NC}"
git pull --rebase origin main || true

# 2) Build client (uses CI=false to avoid failing on warnings)
echo -e "${BLUE}• Building client${NC}"
pushd client >/dev/null
if [ ! -d node_modules ]; then
  echo -e "${YELLOW}• Installing dependencies (client)${NC}"
  npm install
fi
npm run build
popd >/dev/null

# 3) Guarantee a change (optional); poke file if nothing staged
if [ -z "$(git status --porcelain)" ]; then
  echo -e "${YELLOW}• No changes detected; touching deploy-poke to force deploy${NC}"
  ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  echo "deploy poke: $ts" >> client/public/deploy-poke.txt
fi

# 4) Commit & push
echo -e "${BLUE}• Committing and pushing changes${NC}"
git add -A
if git diff --cached --quiet; then
  echo -e "${YELLOW}• Nothing to commit; continuing to deploy${NC}"
else
  git commit -m "$msg"
fi
git push origin main

# 5) Deploy to Vercel (Production)
echo -e "${BLUE}• Deploying to Vercel (Production)${NC}"
VERCEL_CMD=(npx --yes vercel@latest deploy --prod --yes)

if [ -n "${VERCEL_TOKEN:-}" ]; then
  VERCEL_CMD+=(--token "$VERCEL_TOKEN")
fi
if [ -n "${VERCEL_SCOPE:-}" ]; then
  VERCEL_CMD+=(--scope "$VERCEL_SCOPE")
fi

"${VERCEL_CMD[@]}"

echo -e "${GREEN}✔ Done: auto-deploy completed.${NC}"