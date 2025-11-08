#!/bin/bash

# Quick deployment script for Hostinger updates
echo "🚀 Starting deployment process..."

# Step 1: Build the client
echo "📦 Building client application..."
cd client
npm run build

# Step 2: Create deployment folder
echo "📁 Preparing deployment files..."
cd ..
mkdir -p deployment/public_html
mkdir -p deployment/public_html/api

# Step 3: Copy client build files to public_html
echo "📋 Copying client files..."
cp -r client/build/* deployment/public_html/

# Step 4: Copy server files to api folder
echo "📋 Copying server files..."
cp -r server/* deployment/public_html/api/
# Remove development files
rm -f deployment/public_html/api/.env
rm -f deployment/public_html/api/create_test_user.js
rm -f deployment/public_html/api/debug_*.js
rm -f deployment/public_html/api/test_*.js
rm -f deployment/public_html/api/reset_*.js
rm -f deployment/public_html/api/setup_*.js

echo "✅ Deployment files ready in 'deployment' folder!"
echo "📤 Upload the contents of 'deployment/public_html' to your Hostinger account"
echo ""
echo "Next steps:"
echo "1. Upload 'deployment/public_html' contents to your Hostinger public_html folder"
echo "2. Make sure to update .env file with production settings"
echo "3. Install dependencies: npm install (in the api folder)"
echo "4. Restart your Node.js application in Hostinger panel"