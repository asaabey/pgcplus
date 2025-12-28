# Current Work: Netlify Deployment Error Fix

## Original User Prompt
```
when deploying on netlfy i got this errors: [403 error during "Uploading blobs to deploy store"]
```

## Assessment

The error occurs because:
1. **Netlify Blobs conflict**: The `@netlify/plugin-nextjs` is trying to use Netlify's Blobs feature
2. **We use Azure Storage**: This project uses Azure Blob Storage, not Netlify Blobs
3. **403 Forbidden**: Netlify Blobs may require a paid plan or specific configuration

## Root Cause
The Next.js plugin for Netlify is automatically trying to handle blob storage, conflicting with our Azure-based storage solution.

## Solution Options

### Option 1: Disable Netlify Blobs (Recommended)
Configure the Netlify plugin to skip blob upload since we handle storage via Azure.

### Option 2: Configure Netlify Properly
Ensure Netlify has proper permissions for Blobs (may require plan upgrade).

### Option 3: Use netlify.toml for Configuration
Explicitly configure build settings to avoid automatic blob detection.

## Todo List
- [x] Check if `netlify.toml` exists - No, it didn't
- [x] Add configuration to disable Netlify Blobs upload
- [x] Verify Next.js build output configuration
- [ ] Test deployment on Netlify
- [ ] Verify environment variables are set correctly

## Changes Made

### 1. Created `netlify.toml`
- Explicitly configured `@netlify/plugin-nextjs` plugin
- Set build command and publish directory
- Configured esbuild bundler instead of blobs
- Added cache headers for static assets and images
- Node version set to 20

### 2. Updated `next.config.ts`
- Added `output: 'standalone'` for proper Netlify deployment
- Keeps existing 100mb body size limit for file uploads

## Key Configuration Points

The `netlify.toml` file:
- Uses `node_bundler = "esbuild"` which avoids Netlify Blobs
- Explicitly sets publish directory to `.next`
- Configures caching headers for performance

## Next Steps

1. Commit these changes
2. Push to repository
3. Netlify should automatically trigger a new deployment
4. Verify the deployment succeeds without blob upload errors
