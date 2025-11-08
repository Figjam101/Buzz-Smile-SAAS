# Development Workflow - Live Website

## Yes, you can continue editing while the website is live! 🎉

This guide explains how to maintain your development workflow while having a live version for your client to see.

## How It Works

1. **Local Development** - You continue working on your local version (localhost:3000)
2. **Live Version** - Your client sees the deployed version on your domain
3. **Easy Updates** - Deploy changes whenever you're ready

## Development Process

### 1. Continue Local Development
```bash
# Start your local development servers as usual
cd server && npm start
cd client && npm start
```

### 2. Make Your Changes
- Edit components, add features, fix bugs
- Test everything locally first
- Your client won't see these changes until you deploy

### 3. Deploy Updates When Ready
```bash
# Run the deployment script
./deploy-updates.sh
```

### 4. Upload to Hostinger
- Upload the contents of `deployment/public_html` to your Hostinger account
- Restart the Node.js application in Hostinger panel

## Best Practices

### For Client Demos
- Deploy stable versions when you want to show progress
- Test thoroughly before deploying
- Keep a changelog of what's new in each deployment

### For Development
- Use feature branches for major changes
- Test locally before deploying
- Keep your local environment running for quick iterations

## Quick Deployment Checklist

- [ ] Test all features locally
- [ ] Run `./deploy-updates.sh`
- [ ] Upload `deployment/public_html` contents to Hostinger
- [ ] Update production environment variables if needed
- [ ] Restart Node.js application in Hostinger
- [ ] Test the live site
- [ ] Notify client of updates

## Environment Variables

### Local (.env)
- Keep your development settings
- Use localhost URLs
- Test data and credentials

### Production (.env.production)
- Production database connections
- Live API keys
- Production domain settings

## File Structure After Deployment

```
Hostinger public_html/
├── index.html (React app)
├── static/ (CSS, JS, images)
├── api/ (Node.js backend)
│   ├── index.js
│   ├── routes/
│   ├── models/
│   └── .env (production settings)
└── uploads/ (user files)
```

## Tips

1. **Always test locally first** - Don't deploy broken code
2. **Use the deployment script** - It handles the build process
3. **Keep backups** - Save working versions before major changes
4. **Communicate with client** - Let them know when updates are live
5. **Monitor the live site** - Check for errors after deployment

## Troubleshooting

### If something breaks on live site:
1. Check Hostinger error logs
2. Verify environment variables
3. Ensure all dependencies are installed
4. Restart the Node.js application

### If local development stops working:
1. Pull latest changes
2. Run `npm install` in both client and server
3. Check your local .env file
4. Restart development servers

---

**Remember**: Your local development environment is completely separate from the live site. You can break things locally without affecting what your client sees! 🛡️

## Pre‑Commit: Simple Safety Checks (Beginner Friendly)

Pre‑commit is a friendly helper that runs quick checks before your changes are saved into Git. It helps you avoid two common headaches:

- Accidentally committing huge files (over 50 MB) that slow down pushes.
- Accidentally committing secrets (like passwords or keys) that should never be in the code.

### One‑Time Setup (per computer)

1) Open Terminal and go to your project folder:

```
cd "/Users/work/Library/CloudStorage/GoogleDrive-npkalyx@gmail.com/My Drive/Buzz Smile Media /SAAS WEBSITE"
```

2) Install pre‑commit (pick ONE method that works for you):

```
# Homebrew (recommended on macOS)
brew install pre-commit

# OR: Pipx (keeps Python tools tidy)
brew install pipx && pipx ensurepath
pipx install pre-commit

# OR: Pip (also fine)
pip install pre-commit
```

3) Turn it on for this project:

```
pre-commit install
```

4) Try it once on all files (optional, good for a first scan):

```
pre-commit run --all-files
```

### What happens when you commit

- You work normally: `git add .` then `git commit -m "your message"`.
- Pre‑commit runs automatically. If everything is OK, the commit succeeds.
- If it finds a problem, it stops the commit and tells you what to fix.

### If it finds a problem

- Large file warning (example):
  - Message: “Added file is too large: deployment/public_html/api/uploads/…/video.mov”
  - Fix: remove the file from Git (keep it outside the repo):
    - `git rm --cached path/to/file.mov`
    - We already ignore uploads by default (`deployment/public_html/api/uploads/`).
    - If you truly need big files in Git, ask about Git LFS.

- Secret detected (example):
  - Message: “Potential secret found in path/to/file.json”
  - Fix: do not commit secrets. Move keys/passwords into environment variables (GitHub Actions/Vercel settings).
    - Remove the file from Git: `git rm --cached path/to/secret.json`

- Minor fixes (trailing spaces/end‑of‑file):
  - The tool can auto‑fix these; just commit again.

### Updating or turning off

```
# Update hooks to latest versions
pre-commit autoupdate

# Uninstall (not recommended)
pre-commit uninstall
```

### Team reminder

- Everyone should run these once on their machine:
  - Install pre‑commit (brew/pipx/pip)
  - `pre-commit install`
  - Optional: `pre-commit run --all-files`

These quick checks keep pushes smooth and prevent accidental leaks.