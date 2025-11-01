# Buzz Smile SaaS — Step-by-Step Setup for Google Login (Beginner Friendly)

This guide walks you through, click-by-click, how to set up Google Login and connect your deployed frontend (Vercel) to your backend (Railway). No prior technical experience required.

---

## 1) What You’ll Need

- A Google account you can log in to.
- Access to your Vercel project (frontend website).
- Access to your Railway project (backend API).

---

## 2) Create a Google OAuth Client

1. Open your browser and go to: https://console.cloud.google.com/
2. If prompted, sign in with your Google account.
3. At the top, click the project dropdown (it may say “My First Project”).
4. Click “New Project”.
   - Project name: e.g. “Buzz Smile SaaS”.
   - Click “Create”.
5. Make sure you are inside the new project (look at the top bar to confirm).
6. On the left sidebar, click “APIs & Services”.
7. Click “OAuth consent screen”.
   - User Type: choose “External”. Click “Create”.
   - App name: e.g. “Buzz Smile SaaS Login”.
   - User support email: your email.
   - Developer contact information: your email.
   - Scroll down and click “Save and Continue”.
   - Scopes: you can skip adding extra scopes (we only need basic profile/email). Click “Save and Continue”.
   - Test users: you can skip for now or add your own email. Click “Save and Continue”, then “Back to Dashboard”.
8. In the left sidebar, click “Credentials”.
9. Click the blue “+ CREATE CREDENTIALS” button at the top.
10. Choose “OAuth client ID”.
11. Application type: choose “Web application”.
12. Name: e.g. “Buzz Smile Frontend”.
13. Under “Authorized JavaScript origins”, click “Add URI” and paste your frontend domain:
    - Example: `https://buzz-smile-saas-frontend-....vercel.app`
14. Under “Authorized redirect URIs”, click “Add URI” and paste your backend callback URL:
    - Example: `https://buzz-smile-saas-production.up.railway.app/auth/google/callback`
15. Click “Create”.
16. A popup appears with your **Client ID** and **Client Secret**. Keep this window open—you’ll copy these into Railway in the next step.

Notes:
- We only use basic scopes (`profile`, `email`); this does NOT access Google Drive.
- If you later use a custom domain (e.g. `https://buzzsmile.com`), you must add it to “Authorized JavaScript origins”.

---

## 3) Add Environment Variables on Railway (Backend)

1. Open: https://railway.app/ and log in.
2. Click your project (the one hosting the backend API).
3. Click the service that runs your Node.js server (usually named “server” or similar).
4. Find and click “Variables” or “Environment”.
5. Add these variables (use exact names):
   - `GOOGLE_CLIENT_ID` → paste from the Google pop‑up.
   - `GOOGLE_CLIENT_SECRET` → paste from the Google pop‑up.
   - `JWT_SECRET` → type a long random string (e.g. copy a password from a generator). This is used to sign your app’s login tokens.
   - `SESSION_SECRET` → another long random string.
   - `CLIENT_URL` → paste your Vercel frontend URL, e.g. `https://buzz-smile-saas-frontend-....vercel.app`.
   - Optional `CLIENT_URLS` → same as above, or add multiple domains separated by commas if you have more than one.
6. Click “Save” or “Deploy” if Railway prompts you.
7. If there’s a “Restart” or “Redeploy” button, click it to apply changes.

---

## 4) Confirm Frontend API URL on Vercel

1. Open: https://vercel.com/ and log in.
2. Click your project (the frontend website).
3. Click “Settings” → “Environment Variables”.
4. Ensure this exists for the “Production” environment:
   - `REACT_APP_API_URL` → `https://buzz-smile-saas-production.up.railway.app`
5. If you added or changed this, click “Redeploy” (or trigger a new deployment) so changes take effect.

---

## 5) Test the Flow

Step A — Start Google Login:
1. In your browser, go to your backend Google login URL:
   - `https://buzz-smile-saas-production.up.railway.app/auth/google`
2. You should be sent to a Google login screen. Log in.

Step B — Backend Issues Token and Redirects:
1. After login, Google sends you back to the backend.
2. The backend creates a login token (JWT) and redirects your browser to:
   - `https://your-frontend-domain.vercel.app/auth/success?token=...`

Step C — Frontend Stores Token and Navigates:
1. The `/auth/success` page stores the token in your browser (localStorage).
2. You are automatically sent to your dashboard page.
3. If you open the browser dev tools → Application → Local Storage, you should see a key named `token`.

If you see “Google OAuth Not Available”, it means the backend env vars weren’t set correctly. Recheck Step 3.

---

## 6) Troubleshooting (Simple)

- “Google OAuth Not Available” page:
  - Double-check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set on Railway.
  - Make sure `CLIENT_URL` matches your exact Vercel domain.

- 401 errors after login:
  - Confirm the token exists in localStorage.
  - Make sure requests include the token as `Authorization: Bearer <token>` (the app handles this automatically once stored).

- Redirect mismatch errors:
  - Your Google Cloud “Authorized redirect URIs” must include the exact Railway callback: `https://...railway.app/auth/google/callback`.
  - Your “Authorized JavaScript origins” must include the exact Vercel domain.

---

## 7) What If I Change Domains Later?

- Add the new frontend domain to “Authorized JavaScript origins” in Google Cloud.
- Update `CLIENT_URL` on Railway to the new frontend domain.
- Update `REACT_APP_API_URL` on Vercel if the backend domain changes.
- Redeploy both.

---

That’s it! Follow these steps in order and you’ll have Google Login working end‑to‑end.