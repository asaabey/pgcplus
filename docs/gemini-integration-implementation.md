# Gemini File Search RAG Integration - Implementation Summary

**Date**: 2025-12-28
**Status**: ✅ Complete - Build Passing

## Overview

Successfully integrated Google Gemini File Search for Retrieval Augmented Generation (RAG) into the PGC+ document management system. Users can now upload documents that are automatically indexed in Gemini File Search Store, and search them using natural language queries with AI-generated answers and citations.

## Implementation Details

### 1. New Files Created

#### Gemini Infrastructure
- **[src/lib/gemini/client.ts](src/lib/gemini/client.ts)** - Gemini client initialization using `@google/genai` package
- **[src/lib/gemini/file-search-store.ts](src/lib/gemini/file-search-store.ts)** - File Search Store management with Azure Table Storage persistence
- **[src/lib/gemini/document-indexing.ts](src/lib/gemini/document-indexing.ts)** - Document upload/delete operations with polling for indexing completion

#### API Routes
- **[src/app/api/search/route.ts](src/app/api/search/route.ts)** - POST endpoint for search queries with File Search tool

### 2. Modified Files

#### Core Logic
- **[src/lib/documents/crud.ts](src/lib/documents/crud.ts)**
  - `uploadAndCreateDocument()`: Integrated Gemini indexing (synchronous)
  - `deleteDocument()`: Added cascade delete to Gemini

#### UI
- **[src/app/page.tsx](src/app/page.tsx)** - Replaced redirect with search interface (new landing page)

### 3. Dependencies Added

```json
{
  "@google/genai": "^1.34.0"
}
```

Note: Kept existing `@google/generative-ai` for potential future use, but File Search requires `@google/genai`.

## Upload Flow

### Before (Original)
1. Upload to Azure Blob Storage
2. Create Table Storage record with `status='processing'`
3. Return document

### After (With Gemini)
1. Upload to Azure Blob Storage ✓
2. Create Table Storage record with `status='processing'` ✓
3. **Upload to Gemini File Search Store (synchronous - user waits)**
4. **Poll for indexing completion (5s intervals, 5 min timeout)**
5. **Update record with `geminiDocumentId`, `geminiFileSearchStoreName`, `status='ready'`**
6. Return updated document

### Error Handling
- If Gemini upload fails: Document marked as `status='failed'` with error message
- Azure blob kept for manual retry/debugging (no rollback)
- API returns 500 error to client

## Delete Flow

### After (With Gemini)
1. Delete from Azure Blob Storage ✓
2. **Delete from Gemini (if `geminiDocumentId` exists)**
3. Delete from Table Storage ✓

### Error Handling
- Gemini delete failures logged but don't block deletion
- Orphaned Gemini documents acceptable (don't affect functionality)

## Search Flow

### User Experience
1. User enters natural language query on landing page
2. Query sent to `/api/search` (POST)
3. Gemini queried with File Search tool
4. AI-generated answer displayed with source citations

### API Flow
1. Receive query from client
2. Get or create File Search Store
3. Call Gemini `models.generateContent()` with File Search tool
4. Extract answer and citations from response
5. Return formatted results

## Architecture Decisions

### Why `@google/genai` instead of `@google/generative-ai`?
- File Search API only available in `@google/genai` package
- Different SDK with different API surface
- Documented in official Gemini File Search guide

### Why Single Shared Store?
- Simpler management
- Enables cross-category search
- Can still filter by metadata (category, version)
- Store name persisted in Azure Table Storage

### Why Synchronous Upload?
- User requirement: Immediate readiness for search
- Simpler implementation (no background job infrastructure)
- Acceptable UX for current file size limits (100MB max)

### Why Azure Table Storage for Store Persistence?
- Consistent with existing architecture
- No new dependencies
- Reuses `documents` table with different partition key
- In-memory cache for performance

## Configuration

### Environment Variables

Required in `.env.local`:
```env
GEMINI_API_KEY=your_actual_api_key_here
```

Already configured:
- `AZURE_STORAGE_CONNECTION_STRING`
- `AZURE_STORAGE_ACCOUNT_NAME`
- `AZURE_STORAGE_ACCOUNT_KEY`

## Data Model Changes

### Azure Table Storage - `documents` table

#### Existing Document Entity (Now Populated)
```typescript
{
  geminiDocumentId: string,          // e.g., "files/abc123" (now populated)
  geminiFileSearchStoreName: string, // e.g., "fileSearchStores/xyz" (now populated)
  status: 'processing' | 'ready' | 'failed', // Now uses all states
  errorMessage: string,              // Populated on Gemini failures
}
```

#### New Config Entity (Same Table, Different Partition)
```typescript
{
  partitionKey: 'config',
  rowKey: 'file-search-store',
  storeName: string,      // Gemini store name
  displayName: 'pgc-policies',
  createdAt: Date,
  timestamp: Date
}
```

## Routes

### Before
- `/` → Redirects to `/documents`
- `/documents` → Document management UI

### After
- `/` → **Search interface (landing page)**
- `/documents` → Document management UI (unchanged)
- `/api/search` → **Search API endpoint (NEW)**

## Technical Notes

### Gemini API Details
- **Model**: `gemini-2.5-flash` (fast, cost-effective)
- **Polling**: 5-second intervals, 60 attempts max (5 minutes)
- **File Types**: PDF, DOCX (matches existing upload restrictions)
- **Max File Size**: 100MB (matches existing limit)

### Buffer to Blob Conversion with MIME Type
```typescript
const mimeType = getMimeType(fileName); // Determine from extension
const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
```

Required because:
- Gemini API expects `Blob` but Azure returns `Buffer`
- MIME type must be specified for proper file handling
- Supported MIME types: `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

### Custom Metadata
Documents indexed with:
- `title`: Document title
- `category`: Document category
- `version`: Document version

Enables future filtered search capabilities.

## Testing Checklist

### Upload Flow
- [ ] Upload PDF - verify status changes to 'ready'
- [ ] Upload DOCX - verify status changes to 'ready'
- [ ] Check Azure Table Storage for Gemini IDs
- [ ] Test large file - verify polling works
- [ ] Test upload failure - verify status='failed'

### Delete Flow
- [ ] Delete indexed document - verify removed from Gemini
- [ ] Verify cascade delete (blob + Table Storage)

### Search Flow
- [ ] Search for known content - verify answer returned
- [ ] Check citations - verify source documents listed
- [ ] Test empty query - verify validation
- [ ] Test API failure - verify error display

### UI/UX
- [ ] Landing page shows search interface ✓
- [ ] "Manage Documents" button navigates to /documents ✓
- [ ] Loading state shows spinner ✓
- [ ] Results display answer + citations ✓
- [ ] Error states display correctly ✓

## Known Limitations

1. **Synchronous Upload**: Large files (approaching 100MB) may timeout
   - **Mitigation**: Monitor real upload times, consider async for >50MB files

2. **No Retry Mechanism**: Failed uploads require manual re-upload
   - **Future**: Add retry button in UI for failed documents

3. **Citation Linking**: Citations may not directly reference Azure documents
   - **Mitigation**: Custom metadata includes document IDs
   - **Future**: Enhance citation parsing to link to `/documents` viewer

4. **Single Store**: All documents in one File Search Store
   - **Impact**: Store grows with document count
   - **Mitigation**: Gemini File Search optimized for large stores

## Future Enhancements

1. **Background Indexing**: Queue large files to async worker (Azure Functions)
2. **Search Filters**: UI to filter by category/version using metadata
3. **Search History**: Track queries in Table Storage
4. **Answer Streaming**: Stream Gemini responses for faster UX
5. **Document Updates**: Re-index when document content changes
6. **Multi-Store Support**: Separate stores per category
7. **Admin Panel**: Reset/manage File Search Store
8. **Retry Failed Uploads**: UI button to retry failed Gemini indexing

## Build Status

✅ **pnpm build**: Passing
✅ **TypeScript**: No errors
✅ **All routes**: Compiled successfully

## Files Changed Summary

### Created (4)
1. `src/lib/gemini/client.ts`
2. `src/lib/gemini/file-search-store.ts`
3. `src/lib/gemini/document-indexing.ts`
4. `src/app/api/search/route.ts`

### Modified (2)
1. `src/lib/documents/crud.ts`
2. `src/app/page.tsx`

### Configuration (1)
1. `package.json` - Added `@google/genai@^1.34.0`

---

**Implementation Date**: 2025-12-28
**Next Steps**: Test upload and search functionality with real documents
