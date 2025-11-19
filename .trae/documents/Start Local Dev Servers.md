## Overview
- Start both backend (`server`) and frontend (`client`) dev servers from the repository root.
- Uses the existing npm scripts to install dependencies and run both concurrently.

## Prerequisites
- Node `20.x` and npm `>=8` installed.
- Work in the root directory: `SAAS WEBSITE`.

## Environment
- Backend reads `server/.env` (already set: `PORT=5002`, `CLIENT_URL=http://localhost:3000`).
- Frontend reads `client/.env` (already set: `REACT_APP_API_URL=http://localhost:5002`).
- MongoDB is optional in dev; server will start with `ALLOW_SERVER_WITHOUT_DB=true`.

## Install Dependencies
- In the project root run: `npm run install-all`
- This installs root, then `server`, then `client` dependencies using npm.

## Start Servers
- In the project root run: `npm run dev`
- This launches:
  - Backend on `http://localhost:5002` (Express, nodemon)
  - Frontend on `http://localhost:3000` (CRA dev server)

## Verification Steps
- Frontend: open `http://localhost:3000` and ensure the app loads.
- API health: visit `http://localhost:5002/api/health` to confirm `status: ok`.
- Console logs should show `🚀 Server running on port 5002` and CRA dev server ready.

## What I Will Execute
1. Run `npm run install-all` in the root.
2. Run `npm run dev` in the root.
3. Monitor startup logs for errors (ports, env, FFmpeg, CORS).
4. Provide a preview link for the frontend once it’s live and share the API health check result.

## Notes
- There are duplicate scripts under `buzz-smile-saas/` but we’ll use the root scripts for consistency.
- If ports are busy, I’ll free them or adjust `PORT` temporarily and restart.