# PGC+ 

Policy & Guideline Center with AI search

## Setup

```bash
pnpm install
azd provision              # Creates Azure Storage only
azd env get-values         # Get credentials
# Add to .env
pnpm dev
```

## What gets provisioned

- **Azure Storage Account** (Blob + Table)
  - Blob container: `documents`
  - Table: `documents`
- **Nothing else** - Web app runs on Netlify

## Deploy to Netlify

```bash
pnpm build
# Deploy .next to Netlify
```

See [CLAUDE.md](CLAUDE.md) for full architecture details.
