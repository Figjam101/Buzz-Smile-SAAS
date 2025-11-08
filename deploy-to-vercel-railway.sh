#!/bin/bash

# 🚀 Vercel + Railway Deployment Script
# This script helps you deploy your SAAS website to Vercel (frontend) + Railway (backend)

echo "🚀 Starting Vercel + Railway Deployment Process..."
echo "=================================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}⚠️  Git not initialized. Initializing git repository...${NC}"
    git init
    echo -e "${GREEN}✅ Git repository initialized${NC}"
fi

# Check if we have a remote origin
if ! git remote get-url origin > /dev/null 2>&1; then
    echo -e "${RED}❌ No git remote origin found!${NC}"
    echo -e "${YELLOW}Please create a GitHub repository and add it as origin:${NC}"
    echo "1. Go to https://github.com and create a new repository"
    echo "2. Run: git remote add origin https://github.com/yourusername/your-repo.git"
    echo "3. Run this script again"
    exit 1
fi

# Build the client to check for errors
echo -e "${BLUE}🔨 Building client application...${NC}"
cd client
if npm run build; then
    echo -e "${GREEN}✅ Client build successful${NC}"
    cd ..
else
    echo -e "${RED}❌ Client build failed! Please fix errors before deploying.${NC}"
    cd ..
    exit 1
fi

# Check server dependencies
echo -e "${BLUE}🔍 Checking server dependencies...${NC}"
cd server
if npm install --production; then
    echo -e "${GREEN}✅ Server dependencies OK${NC}"
    cd ..
else
    echo -e "${RED}❌ Server dependency issues! Please fix before deploying.${NC}"
    cd ..
    exit 1
fi

# Add all changes to git
echo -e "${BLUE}📦 Preparing files for deployment...${NC}"
git add .

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo -e "${YELLOW}⚠️  No changes to commit${NC}"
else
    # Commit changes
    echo -e "${BLUE}💾 Committing changes...${NC}"
    git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M:%S')"
    echo -e "${GREEN}✅ Changes committed${NC}"
fi

# Push to GitHub
echo -e "${BLUE}🚀 Pushing to GitHub...${NC}"
if git push origin main; then
    echo -e "${GREEN}✅ Successfully pushed to GitHub${NC}"
else
    echo -e "${RED}❌ Failed to push to GitHub${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Code successfully pushed to GitHub!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "=============="
echo ""
echo -e "${YELLOW}1. Deploy Frontend to Vercel:${NC}"
echo "   • Go to https://vercel.com"
echo "   • Click 'New Project'"
echo "   • Select your GitHub repository"
echo "   • Set Root Directory to: client"
echo "   • Click Deploy"
echo ""
echo -e "${YELLOW}2. Deploy Backend to Railway:${NC}"
echo "   • Go to https://railway.app"
echo "   • Click 'New Project'"
echo "   • Select 'Deploy from GitHub repo'"
echo "   • Choose your repository"
echo "   • Set Root Directory to: server"
echo "   • Add MongoDB database"
echo "   • Configure environment variables"
echo ""
echo -e "${YELLOW}3. Environment Variables:${NC}"
echo ""
echo -e "${BLUE}   Vercel (Frontend):${NC}"
echo "   REACT_APP_API_URL=https://your-railway-app.railway.app/api"
echo ""
echo -e "${BLUE}   Railway (Backend):${NC}"
echo "   PORT=3000"
echo "   MONGODB_URI=<your-railway-mongodb-connection-string>"
echo "   JWT_SECRET=your-super-secure-jwt-secret"
echo "   NODE_ENV=production"
echo "   CLIENT_URL=https://your-vercel-app.vercel.app"
echo "   CAPCUT_API_KEY=your-capcut-api-key"
echo "   CAPCUT_API_SECRET=your-capcut-api-secret"
echo ""
echo -e "${GREEN}🚀 Your SAAS website will be live in ~10 minutes!${NC}"
echo ""
echo -e "${BLUE}📖 For detailed instructions, see: VERCEL-RAILWAY-DEPLOYMENT.md${NC}"