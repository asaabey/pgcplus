# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## Stack

- **Next.js 16.1.1** (App Router)
- **Azure Table Storage** - Document metadata
- **Azure Blob Storage** - Document files
- **Google Gemini API** - File Search & AI (to be integrated)
- **React 19**, TypeScript, Tailwind CSS, shadcn/ui

## Quick Setup

```bash
pnpm install
azd provision                    # Creates Azure Storage Account
azd env get-values > .env.azure  # Get credentials
# Copy values from .env.azure to .env
pnpm dev
```

## Project Structure

```
src/
├── app/
│   ├── api/documents/          # API routes
│   │   ├── route.ts            # GET, POST /api/documents
│   │   └── [id]/
│   │       ├── route.ts        # GET, PATCH, DELETE /api/documents/:id
│   │       └── download/route.ts
│   ├── documents/page.tsx      # Main UI
│   └── layout.tsx
├── components/
│   ├── documents/
│   │   ├── upload-document-dialog.tsx
│   │   ├── document-list.tsx
│   │   └── document-viewer.tsx
│   └── ui/                     # shadcn/ui components
└── lib/
    ├── db/
    │   └── table-storage.ts    # Azure Table Storage client
    ├── storage/
    │   └── azure-storage.ts    # Azure Blob Storage client
    └── documents/
        └── crud.ts             # Combined CRUD operations

infra/
├── main.bicep                  # Azure infrastructure
└── storage.bicep               # Storage Account config
```

## Document Flow

1. **Upload**: User uploads PDF/DOCX → Stored in Azure Blob + metadata in Table Storage (status: `processing`)
2. **Index**: [TODO] Background job uploads to Gemini File Search Store
3. **Ready**: Status updated to `ready` with Gemini document ID
4. **Search**: [TODO] Query Gemini with File Search tool for AI answers + citations

## Data Model (Azure Table Storage)

Table: `documents`

```typescript
{
  partitionKey: 'doc',
  rowKey: string,           // Timestamp-based ID
  id: string,               // Same as rowKey
  title: string,
  category: string,
  version: string,
  status: 'processing' | 'ready' | 'failed',
  storageUri: string,       // Azure Blob URL
  blobName: string,         // Blob identifier
  fileSize: string,         // Human-readable
  fileType: 'pdf' | 'docx',
  geminiDocumentId: string, // Set after indexing
  geminiFileSearchStoreName: string,
  errorMessage: string,     // If failed
  createdAt: Date,
  timestamp: Date
}
```

## Azure Resources (via azd provision)

**Only Storage Account** - Nothing else!
- Resource Group: `rg-{environmentName}`
- Storage Account: `st{uniqueString}`
  - Blob Service → Container: `documents` (private)
  - Table Service → Table: `documents`
- Outputs: Connection string, account name, account key

**Web app hosted on Netlify** (not Azure App Service)

## Environment Variables

```env
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
AZURE_STORAGE_ACCOUNT_NAME=your_account
AZURE_STORAGE_ACCOUNT_KEY=your_key
AZURE_STORAGE_CONTAINER_NAME=documents
GEMINI_API_KEY=your_gemini_api_key
```

## API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/documents` | List all documents |
| POST | `/api/documents` | Upload document (multipart, max 100MB) |
| GET | `/api/documents/[id]` | Get single document |
| PATCH | `/api/documents/[id]` | Update status |
| DELETE | `/api/documents/[id]` | Delete document (DB + Blob) |
| GET | `/api/documents/[id]/download` | Get SAS URL (60 min expiry) |

## Key Functions

### Table Storage (`src/lib/db/table-storage.ts`)
- `createDocument(doc)` - Insert into Table Storage
- `getAllDocuments()` - List all, sorted by createdAt desc
- `getDocumentById(id)` - Fetch single entity
- `updateDocument(id, updates)` - Partial update
- `deleteDocument(id)` - Delete entity

### Blob Storage (`src/lib/storage/azure-storage.ts`)
- `uploadDocument(file, fileName, metadata)` - Upload to blob container
- `downloadDocument(blobName)` - Download as Buffer
- `getDocumentSasUrl(blobName, expiresInMinutes)` - Generate temp access URL
- `deleteDocument(blobName)` - Delete blob

### CRUD (`src/lib/documents/crud.ts`)
- `uploadAndCreateDocument(file, fileName, metadata)` - Upload blob + create DB record
- `getDocumentDownloadUrl(id)` - Get SAS URL by document ID
- `deleteDocument(id)` - Cascade delete (blob + DB)

## Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm lint             # Run ESLint

# Azure
azd provision         # Create/update Azure resources
azd deploy            # Deploy to Azure (when App Service added)
azd down              # Delete all Azure resources
azd env get-values    # View environment variables
```

## Current Status

✅ **Implemented**
- Document upload UI with drag-and-drop
- Document list with status badges
- PDF inline viewer
- DOCX download
- Azure Blob Storage integration
- Azure Table Storage integration
- API routes for all CRUD operations

⏳ **TODO**
- Authentication middleware
- Gemini File Search integration
- Background job for document indexing
- Search UI with natural language input
- AI-generated answers with citations

## Gemini Integration (Next Phase)

### File Search Store Setup
```javascript
const store = await ai.fileSearchStores.create({
  config: { displayName: 'pgc-policies' }
});

const operation = await ai.fileSearchStores.uploadToFileSearchStore({
  file: buffer,
  fileSearchStoreName: store.name,
  config: {
    displayName: filename,
    customMetadata: [
      { key: "category", stringValue: category },
      { key: "version", stringValue: version }
    ]
  }
});
```

### Query Example
```javascript
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: userQuery,
  config: {
    tools: [{
      fileSearch: {
        fileSearchStoreNames: [store.name]
      }
    }]
  }
});

// Access citations
const citations = response.candidates[0].groundingMetadata;
```

## Development Notes

- Use lazy initialization for Azure clients (build-time safety)
- SAS URLs expire in 60 minutes
- Table Storage uses timestamp as rowKey for chronological ordering
- File size limit: 100MB (validated client + server)
- Only PDF and DOCX supported
- All blobs stored with timestamp prefix for uniqueness
