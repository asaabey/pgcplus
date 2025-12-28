# Netlify Deployment Guide for PGC+

## Required Environment Variables

When deploying to Netlify, you need to configure the following environment variables in your Netlify site settings:

### 1. Azure Storage (REQUIRED)

These values are obtained after running `azd provision` in your Azure environment:

```
AZURE_STORAGE_CONNECTION_STRING
AZURE_STORAGE_ACCOUNT_NAME
AZURE_STORAGE_ACCOUNT_KEY
AZURE_STORAGE_CONTAINER_NAME=documents
```

**How to get these values:**
1. Run `azd provision` locally
2. Run `azd env get-values` to see all values
3. Copy the Azure Storage credentials

### 2. Google Gemini API (REQUIRED)

```
GEMINI_API_KEY
```

**How to get this:**
- Visit https://makersuite.google.com/app/apikey
- Create a new API key
- Copy the key value

### 3. NextAuth Configuration (REQUIRED)

```
NEXTAUTH_SECRET
NEXTAUTH_URL
```

**How to configure:**
- **NEXTAUTH_SECRET**: Generate with `openssl rand -base64 32`
- **NEXTAUTH_URL**: Set to your Netlify site URL (e.g., `https://your-app.netlify.app`)

### 4. Authentication Credentials (REQUIRED)

```
ADMIN_USERNAME
ADMIN_PASSWORD
```

**Security Note:** Change these from the defaults before deploying to production!

## Step-by-Step Deployment

### 1. Prepare Your Repository

Ensure your `.gitignore` includes:
```
.env
.env.local
.env*.local
```

### 2. Configure Netlify Environment Variables

1. Go to your Netlify site dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Add all required variables from the list above
4. Save changes

### 3. Deploy

Option A: **Connect Git Repository** (Recommended)
1. Connect your GitHub/GitLab repository to Netlify
2. Netlify will automatically deploy on push to main branch
3. Build command: `pnpm build` (or `npm run build`)
4. Publish directory: `.next`

Option B: **Manual Deploy**
```bash
pnpm build
netlify deploy --prod
```

### 4. Verify Deployment

After deployment:
1. Visit your Netlify URL
2. Test the login with your `ADMIN_USERNAME` and `ADMIN_PASSWORD`
3. Try uploading a document
4. Test the search functionality

## Environment Variables Checklist

Before deploying, ensure you have set:

- [ ] `AZURE_STORAGE_CONNECTION_STRING`
- [ ] `AZURE_STORAGE_ACCOUNT_NAME`
- [ ] `AZURE_STORAGE_ACCOUNT_KEY`
- [ ] `AZURE_STORAGE_CONTAINER_NAME` (set to `documents`)
- [ ] `GEMINI_API_KEY`
- [ ] `NEXTAUTH_SECRET` (generated securely)
- [ ] `NEXTAUTH_URL` (your Netlify site URL)
- [ ] `ADMIN_USERNAME` (changed from default)
- [ ] `ADMIN_PASSWORD` (strong password, changed from default)

## Optional Variables

These are NOT required for Netlify deployment but can be kept for Azure integration:

```
AZURE_ENV_NAME
AZURE_LOCATION
AZURE_SUBSCRIPTION_ID
DATABASE_URL
```

## Troubleshooting

### Build Fails
- Check that all required environment variables are set
- Verify TypeScript compilation passes locally with `pnpm build`
- Check Netlify build logs for specific errors

### Authentication Not Working
- Ensure `NEXTAUTH_URL` matches your actual Netlify URL (including https://)
- Verify `NEXTAUTH_SECRET` is set and is a secure random string
- Check browser console for auth errors

### Document Upload Fails
- Verify Azure Storage credentials are correct
- Check that the `documents` container exists in your Azure Storage account
- Ensure your Azure Storage account allows connections from Netlify IPs

### Search Not Working
- Verify `GEMINI_API_KEY` is valid
- Check Netlify function logs for Gemini API errors
- Ensure documents have been successfully indexed in Gemini

## Security Considerations

1. **Never commit `.env` or `.env.local` files to Git**
2. **Change default credentials** before deploying
3. **Use strong passwords** for `ADMIN_PASSWORD`
4. **Regenerate `NEXTAUTH_SECRET`** for production (don't reuse development secrets)
5. **Rotate API keys** periodically
6. **Monitor Azure Storage** access logs for unusual activity

## Cost Optimization

- Azure Storage: Pay-per-use (blob storage + table storage)
- Gemini API: Free tier available, paid tiers for higher usage
- Netlify: Free tier includes 100GB bandwidth, 300 build minutes/month

## Support

If you encounter issues:
1. Check Netlify build logs
2. Check Netlify function logs
3. Review Azure Storage metrics
4. Verify Gemini API quota usage
