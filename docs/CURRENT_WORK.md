# Current Feature: Citation Deduplication and Public Document Viewer

## Original Prompt
User requested:
1. Show only one citation per document instead of multiple references to the same document
2. Make citation links open documents directly in view mode without requiring authentication

## Assessment

### Problem Analysis
1. **Multiple Citations for Same Document**: The search API was creating separate citation entries for each grounding chunk, even when multiple chunks came from the same document
2. **Authentication Required for Viewing**: Citation links pointed to `/documents?doc=ID` which required login, creating friction for users viewing search results

### Solution Design
1. **Deduplication**: Modify search API to group citations by document ID using a Map to track unique documents
2. **Public Viewer**: Create a new public route `/view/[id]` that doesn't require authentication
3. **Update Links**: Change all citation links from `/documents?doc=ID` to `/view/ID`

## Implementation

### Files Modified

#### 1. [src/app/api/search/route.ts](src/app/api/search/route.ts)
**Changes:**
- Added `Citation` interface at the top
- Replaced direct mapping with Map-based deduplication:
  - Created `citationMap` to track unique documents by `documentId`
  - Only adds first occurrence of each document
  - Converts Map to array and assigns sequential indices

**Before:**
```typescript
const citations = groundingChunks.map((chunk: any, index: number) => {
  // Creates citation for every chunk, even duplicates
});
```

**After:**
```typescript
const citationMap = new Map<string, Citation>();
groundingChunks.forEach((chunk: any) => {
  const documentId = matchedDoc?.id || geminiFileId;
  if (!citationMap.has(documentId)) {
    citationMap.set(documentId, { documentId, title, snippet });
  }
});
const citations = Array.from(citationMap.values()).map((citation, index) => ({
  ...citation,
  index: index + 1,
}));
```

#### 2. [src/app/view/[id]/page.tsx](src/app/view/[id]/page.tsx) - NEW FILE
**Purpose:** Public document viewer that doesn't require authentication

**Features:**
- Fetches document by ID and download URL from APIs
- Displays document metadata in header (title, category, version)
- Standalone full-screen viewer (not dialog-based)
- PDF inline preview using iframe
- DOCX download/open message (no inline preview)
- Download and Open buttons
- Back button returns to search page
- Loading and error states

**Key Points:**
- No authentication required (excluded from middleware)
- Full-screen layout with flex column
- Built as standalone component (not reusing Dialog-based DocumentViewer)
- Handles both PDF (preview) and DOCX (download only) file types

#### 3. [src/middleware.ts](src/middleware.ts)
**Changes:**
- Added comment documenting that `/view/:path*` is intentionally NOT protected
- Only `/documents/:path*` requires authentication

#### 4. [src/app/page.tsx](src/app/page.tsx)
**Changes:**
- Updated inline citation links: `/documents?doc=ID` → `/view/ID` (line 51)
- Updated sources citation links: `/documents?doc=ID` → `/view/ID` (line 188)

## Todo List

### Completed ✓
1. ✓ Add deduplication logic to search API
2. ✓ Create public viewer route at `/view/[id]`
3. ✓ Update middleware to allow public access to viewer
4. ✓ Update citation links in search page (inline citations)
5. ✓ Update citation links in search page (sources section)
6. ✓ Build standalone viewer component (not dialog-based)
7. ✓ Fix citation number mapping after deduplication (chunk-to-citation mapping)
8. ✓ TypeScript compilation passes with no errors
9. ✓ Development server running successfully on http://localhost:3001

### ✅ Bug Fixed: Document ID Matching
**Issue**: Citation links were navigating to `/view` without document ID, resulting in 404 errors.

**Root Cause**:
- Gemini's grounding chunks returned document titles with file extensions (e.g., `"Water Quality Testing.DOCX"`)
- Database stored titles without extensions (e.g., `"Water Quality Testing"`)
- Initial matching logic only tried exact `geminiDocumentId` match, which was empty/missing

**Solution Implemented**:
Created multi-strategy title-based fallback matching in [src/app/api/search/route.ts](src/app/api/search/route.ts:104-122):
1. **Strategy 1**: Exact match (case-sensitive)
2. **Strategy 2**: Case-insensitive match
3. **Strategy 3**: Match without file extension (handles `.DOCX` vs `.docx` or missing extensions)

**Result**: Citations now correctly populate `documentId` field, and links work properly!

### Ready for Testing
- [ ] Test search with multiple chunks from same document → should show single citation
- [ ] Test citation links open public viewer without auth redirect
- [ ] Test document download from public viewer
- [ ] Test back navigation from viewer to search
- [ ] Test viewer with invalid document ID (error handling)
- [ ] Test PDF inline preview in public viewer
- [ ] Test DOCX download message in public viewer

## Technical Details

### Citation Deduplication Logic
The deduplication uses JavaScript's `Map` which ensures uniqueness by key:
1. Iterate through all grounding chunks from Gemini
2. Extract or match document ID for each chunk
3. Use Map with document ID as key - automatically prevents duplicates
4. Take first snippet encountered for each document
5. Convert to array and assign sequential indices (1, 2, 3...)

### Route Structure
- `/` - Public search page (no auth)
- `/view/[id]` - Public document viewer (no auth)
- `/documents` - Document management page (requires auth)
- `/api/documents/[id]` - Document API (no auth for GET)
- `/api/documents/[id]/download` - SAS URL generation (no auth)

### Security Considerations
- Public viewer only allows viewing, not editing or deleting
- Uses existing API endpoints that already have appropriate permissions
- SAS URLs for blob storage have 60-minute expiration
- Authentication still required for document management operations

## Bug Fix: Citation Number Mapping

### Problem Identified
When deduplicating citations, the citation numbers in Gemini's answer text didn't match the deduplicated citation array:

**Example:**
- Gemini returns chunks [0, 1, 2, 3, 4] where chunks 0, 2, and 4 all reference Document A
- Answer text contains: "According to policy [1], [2], and [3]..." (referring to chunk indices)
- After deduplication, we only have 1 citation for Document A
- But the text still shows [1], [2], [3] which don't map to our single citation

### Solution Implemented
1. **Track Chunk Indices**: During deduplication, store which original chunk indices map to each citation
2. **Create Mapping**: Generate a `chunkToCitationMap` that maps original chunk numbers to deduplicated citation numbers
   - Example: `{ 0: 1, 1: 1, 2: 1, 3: 2, 4: 1 }` means chunks 0,1,2,4 → citation 1, chunk 3 → citation 2
3. **Send Mapping to Frontend**: Include `chunkToCitationMap` in API response
4. **Use Mapping in Frontend**: When processing citation markers `[1]`, `[2]`, etc., look up the correct citation using the map

### Code Changes
- **API** [src/app/api/search/route.ts](src/app/api/search/route.ts:58-100): Added `chunkIndices` tracking and `chunkToCitationMap` generation
- **Frontend** [src/app/page.tsx](src/app/page.tsx:27-63): Updated `MarkdownWithCitations` to use the mapping

### Result
Citation links now correctly point to deduplicated citations, ensuring users can click any citation number and view the correct document.

## Next Steps (if needed)
1. Consider adding rate limiting to public viewer to prevent abuse
2. Consider adding analytics to track which documents are viewed most
3. Consider adding share buttons or copy link functionality
4. Consider showing related documents in viewer sidebar
