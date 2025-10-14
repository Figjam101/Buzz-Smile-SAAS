# Deployment Checklist for Railway & Vercel

## ✅ Completed Tasks

### 1. Configuration Files
- [x] Updated `vercel.json` for frontend deployment
- [x] Updated `railway.json` for backend deployment  
- [x] Created `nixpacks.toml` for FFmpeg installation on Railway
- [x] Updated `package.json` files with engines and build scripts

### 2. Environment Variables
- [x] Created `.env.production` files for both client and server
- [x] Configured Railway environment variable injection (`${{MONGODB_URL}}`, `${{PORT}}`)
- [x] Set up Vercel environment variables for frontend

### 3. FFmpeg Compatibility
- [x] Updated FFmpeg paths for production environments
- [x] Added conditional FFmpeg configuration in `thumbnailService.js` and `index.js`
- [x] Configured nixpacks to install `ffmpeg-full` on Railway

### 4. Database Configuration
- [x] Verified MongoDB connection setup in `server/index.js`
- [x] Updated production environment to use Railway's automatic database injection
- [x] Added proper error handling for database connections

## 🚀 Deployment Steps

### Railway (Backend) Deployment:
1. Connect your GitHub repository to Railway
2. Select the `buzz-smile-saas` project
3. Railway will automatically detect the `nixpacks.toml` configuration
4. Set environment variables in Railway dashboard:
   - `JWT_SECRET` (generate a secure secret)
   - `SESSION_SECRET` (generate a secure secret)
   - `CLIENT_URL` (your Vercel app URL)
   - `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET` (OAuth credentials)
   - `FACEBOOK_APP_ID` & `FACEBOOK_APP_SECRET` (OAuth credentials)
5. Add MongoDB service in Railway
6. Deploy the backend

### Vercel (Frontend) Deployment:
1. Connect your GitHub repository to Vercel
2. Select the `buzz-smile-saas` project
3. Vercel will automatically detect the `vercel.json` configuration
4. Set environment variables in Vercel dashboard:
   - `REACT_APP_API_URL` (your Railway backend URL + `/api`)
5. Deploy the frontend

## 🔧 Environment Variables Reference

### Railway Backend Variables:
```
JWT_SECRET=your-production-jwt-secret-key-here-make-it-very-long-and-secure
SESSION_SECRET=your-production-session-secret-here-make-it-very-long-and-secure
CLIENT_URL=https://your-vercel-app.vercel.app
GOOGLE_CLIENT_ID=your-production-google-client-id
GOOGLE_CLIENT_SECRET=your-production-google-client-secret
FACEBOOK_APP_ID=your-production-facebook-app-id
FACEBOOK_APP_SECRET=your-production-facebook-app-secret
NODE_ENV=production
```

### Vercel Frontend Variables:
```
REACT_APP_API_URL=https://your-railway-app.railway.app/api
GENERATE_SOURCEMAP=false
```

## 🧪 Testing Checklist

After deployment, test these features:
- [ ] User registration and login
- [ ] Video upload functionality
- [ ] Video processing (OpenCut integration)
- [ ] Thumbnail generation
- [ ] OAuth authentication (Google, Facebook)
- [ ] Database operations (CRUD)
- [ ] File serving and static assets

## 📝 Notes

- Railway automatically provides `MONGODB_URL` and `PORT` environment variables
- FFmpeg is installed via nixpacks configuration
- File uploads are configured to use `/tmp/uploads` for Railway's ephemeral storage
- CORS is configured to allow requests from the Vercel frontend
- All sensitive data should be stored in environment variables, not in code

## 🔍 Troubleshooting

### Common Issues:
1. **Database Connection**: Ensure Railway MongoDB service is running and `MONGODB_URL` is set
2. **CORS Errors**: Verify `CLIENT_URL` matches your Vercel deployment URL
3. **FFmpeg Issues**: Check nixpacks.toml configuration and Railway build logs
4. **File Upload Issues**: Verify upload path permissions and file size limits
5. **OAuth Issues**: Ensure OAuth redirect URLs are updated for production domains

### Useful Commands:
```bash
# Check Railway logs
railway logs

# Check Vercel deployment logs
vercel logs

# Test API endpoints
curl https://your-railway-app.railway.app/api/health
```