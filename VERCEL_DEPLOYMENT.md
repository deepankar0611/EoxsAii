# Vercel Deployment Guide

This guide will help you deploy your EOXS AI application to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **Environment Variables**: Prepare all required environment variables

## Step 1: Prepare Environment Variables

Before deploying, you need to set up the following environment variables in Vercel:

### Required Environment Variables

```bash
# Server Configuration
PORT=8082
CORS_ORIGIN=https://your-vercel-domain.vercel.app
BASE_URL=https://your-vercel-domain.vercel.app

# Database (Use MongoDB Atlas for production)
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database-name

# Authentication (Clerk)
CLERK_PUBLISHABLE_KEY=pk_test_your-clerk-publishable-key
CLERK_SECRET_KEY=sk_test_your-clerk-secret-key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# JWT
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRY_HOURS=24

# Admin Configuration
ADMIN_EMAILS=admin@example.com,another-admin@example.com
```

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Other
   - **Root Directory**: `./` (leave empty)
   - **Build Command**: `npm run vercel-build`
   - **Output Directory**: `dist`
5. Add all environment variables from Step 1
6. Click "Deploy"

### Option B: Deploy via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. Follow the prompts and add environment variables when asked

## Step 3: Configure Domain (Optional)

1. Go to your project dashboard in Vercel
2. Navigate to "Settings" > "Domains"
3. Add your custom domain if desired

## Step 4: Update CORS Settings

After deployment, update your `CORS_ORIGIN` environment variable to include your Vercel domain:

```bash
CORS_ORIGIN=https://your-vercel-domain.vercel.app
```

## Important Notes

### Database Setup
- Use MongoDB Atlas for production database
- Ensure your MongoDB cluster allows connections from Vercel's IP ranges
- Update the connection string in environment variables

### File Uploads
- The application uses Cloudinary for file uploads
- Ensure your Cloudinary account is properly configured
- Update Cloudinary credentials in environment variables

### Authentication
- Clerk authentication needs to be configured for your production domain
- Update Clerk dashboard with your Vercel domain
- Ensure CORS settings allow your domain

## Troubleshooting

### Common Issues

1. **Build Failures**: Check the build logs in Vercel dashboard
2. **Database Connection**: Verify MongoDB connection string and network access
3. **CORS Errors**: Ensure CORS_ORIGIN is set to your Vercel domain
4. **Environment Variables**: Double-check all environment variables are set correctly

### Checking Logs

1. Go to your Vercel project dashboard
2. Click on "Functions" tab
3. Check the logs for any errors

## Post-Deployment

1. Test all major functionality
2. Verify file uploads work
3. Test authentication flow
4. Check API endpoints are responding
5. Monitor performance and errors

## Support

If you encounter issues:
1. Check Vercel documentation
2. Review application logs
3. Verify all environment variables are set correctly
4. Test locally with production environment variables 