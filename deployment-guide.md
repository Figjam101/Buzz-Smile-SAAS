# Hostinger Deployment Guide

## Prerequisites
- Hostinger hosting account
- Domain name
- MongoDB Atlas account (for cloud database)

## Step 1: Prepare Your Application for Production

### 1.1 Update Environment Variables
1. Copy `.env.production` to `.env` in your server folder
2. Update the following values:
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `JWT_SECRET`: Generate a strong secret key
   - `CLIENT_URL`: Your domain name (e.g., https://yourdomain.com)

### 1.2 Build the Client Application
```bash
cd client
npm run build
```

## Step 2: Set Up MongoDB Atlas (Cloud Database)

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free cluster
3. Create a database user
4. Whitelist your IP address (or use 0.0.0.0/0 for all IPs)
5. Get your connection string and update `MONGODB_URI` in `.env`

## Step 3: Upload to Hostinger

### 3.1 File Structure for Upload
```
public_html/
├── (client build files - index.html, static/, etc.)
└── api/
    ├── index.js
    ├── package.json
    ├── .env
    ├── models/
    ├── routes/
    ├── middleware/
    ├── services/
    └── uploads/
```

### 3.2 Upload Process
1. **Upload Client Files**: Upload all contents of `client/build/` to `public_html/`
2. **Upload Server Files**: Upload server files to `public_html/api/`
3. **Install Dependencies**: Use Hostinger's Node.js app manager or SSH to run `npm install`

## Step 4: Configure Hostinger

### 4.1 Node.js Application Setup
1. Go to Hostinger hPanel
2. Navigate to "Node.js App"
3. Create new Node.js application
4. Set startup file to `api/index.js`
5. Set Node.js version to 18 or higher

### 4.2 Environment Variables
Add these in Hostinger's Node.js app environment variables:
- `PORT=5000`
- `MONGODB_URI=your_mongodb_atlas_connection_string`
- `JWT_SECRET=your_secure_jwt_secret`
- `NODE_ENV=production`
- `CLIENT_URL=https://yourdomain.com`

## Step 5: Domain Configuration

### 5.1 Connect Your Domain
1. In Hostinger hPanel, go to "Domains"
2. Add your domain or update DNS settings
3. Point domain to your hosting account

### 5.2 SSL Certificate
1. Enable SSL certificate in Hostinger hPanel
2. Force HTTPS redirect

## Step 6: Update Client API URLs

Update all API calls in your React app to use relative URLs or your domain:
- Change `http://localhost:5001/api/` to `/api/` or `https://yourdomain.com/api/`

## Step 7: Test Your Deployment

1. Visit your domain
2. Test user registration/login
3. Test file uploads
4. Test all major features

## Troubleshooting

### Common Issues:
1. **500 Internal Server Error**: Check server logs, ensure all dependencies are installed
2. **Database Connection Issues**: Verify MongoDB Atlas connection string and IP whitelist
3. **File Upload Issues**: Ensure uploads directory has proper permissions
4. **CORS Issues**: Update CORS settings in server to allow your domain

### Hostinger Specific:
- Use Hostinger's File Manager or FTP to upload files
- Check Node.js app logs in hPanel for errors
- Ensure your hosting plan supports Node.js applications