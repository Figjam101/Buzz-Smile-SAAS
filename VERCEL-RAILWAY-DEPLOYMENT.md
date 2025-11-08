# Vercel & Railway Deployment (Auto via GitHub Actions)

This guide explains how to set up automatic redeployments for the frontend (Vercel) and backend (Railway) using GitHub Actions.

## Overview

- Client (React) auto-deploys to Vercel when `buzz-smile-saas/client/**` changes on `main`.
- Server (Node/Express) auto-deploys to Railway when `buzz-smile-saas/server/**` changes on `main`.
- Workflows are in `buzz-smile-saas/.github/workflows/`:
  - `vercel-client-deploy.yml`
  - `railway-server-deploy.yml`

## Prerequisites

1. Connect your GitHub repository to Vercel and Railway (one-time setup).
2. Add GitHub repository secrets (Settings → Secrets and variables → Actions):
   - `VERCEL_TOKEN`: Vercel personal token (Account Settings → Tokens)
   - `VERCEL_ORG_ID`: Vercel Org ID (Project → Settings → General)
   - `VERCEL_PROJECT_ID`: Vercel Project ID for the client app
   - `RAILWAY_TOKEN`: Railway token (Account → Settings)
   - Optional: `RAILWAY_PROJECT_ID`, `RAILWAY_SERVICE_ID` (CLI uses `railway.json` if linked)
3. Configure environment variables in hosting providers:
   - Vercel Project (client): `REACT_APP_API_URL`, `REACT_APP_FB_APP_ID`, `REACT_APP_FB_API_VERSION`
   - Railway Service (server): `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, plus any others from `server/.env`

## How It Works

### Client → Vercel
- Checks out code, installs dependencies and builds under `buzz-smile-saas/client`.
- Deploys to Vercel production using `amondnet/vercel-action`.
- Vercel uses env vars configured in the Vercel project during its remote build.

### Server → Railway
- Checks out code, installs Railway CLI and logs in via `RAILWAY_TOKEN`.
- Runs `railway up --detach` from `buzz-smile-saas/server`.
- Railway uses env vars configured in its service settings and the `railway.json` linkage.

## Paths & Triggers

- Client workflow triggers on `buzz-smile-saas/client/**` and `vercel.json` changes.
- Server workflow triggers on `buzz-smile-saas/server/**` and `railway.json` changes.

## Manual Redeploys (optional)

- Vercel: Redeploy from the dashboard (Deployments → Redeploy).
- Railway: Run `railway up --detach` locally or trigger a workflow dispatch.

## Troubleshooting

- Missing secrets cause workflow failures; add them in GitHub → Settings → Secrets.
- Env mismatch: ensure Vercel and Railway envs match local `.env` values.
- Monorepo path changes require updating `working-directory` and `paths` in workflows.

Once secrets are set, every push to `main` auto-deploys the affected app.