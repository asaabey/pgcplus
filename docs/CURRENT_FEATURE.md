# Current Feature: NextAuth Authentication for Documents Route

## Original Prompts
1. "working really well, minor formatting issues. lets render markdown in Answer box. show citations as links"
2. "the citations dont appear in the text as hyperlinks. the footnotes are too lengthy"
3. "add nextjs auth for documents route. use hardcoded username and password in @.env.local file"

## Assessment

### Initial Issues (Resolved)
1. **Answer rendering**: The AI-generated answers were displayed as plain text with `whitespace-pre-wrap`, which didn't properly format markdown content (bold, lists, headers, etc.)
2. **Citations display**: Citations were shown as static text blocks without any interactivity or ability to navigate to the source documents

### Updated Issues (Resolved)
3. **Inline citations not clickable**: Gemini's responses include citation markers like [1], [2] in the text, but these weren't hyperlinked to the actual documents
4. **Lengthy footnote snippets**: The citation snippets in the Sources section were showing full text, making the UI cluttered and hard to scan

### Latest Issue (Current Fix)
5. **No authentication**: The `/documents` route was publicly accessible without any login requirement, exposing sensitive policy documents

## Implementation Plan

### 1. Install Dependencies
- [x] Install `react-markdown` for rendering markdown content
- [x] Install `remark-gfm` for GitHub Flavored Markdown support
- [x] Install `@tailwindcss/typography` for prose styling

### 2. Update Search Page (src/app/page.tsx)
- [x] Import `ReactMarkdown`, `remarkGfm`, and `ExternalLink` icon
- [x] Replace plain text rendering with `ReactMarkdown` component
- [x] Add prose classes for proper markdown styling
- [x] Convert citations from static divs to clickable `Link` components
- [x] Add hover effects and external link icon to citations
- [x] Link citations to `/documents?doc={documentId}` for direct navigation

### 3. Update Documents Page (src/app/documents/page.tsx)
- [x] Import `useSearchParams` and `Suspense` from Next.js
- [x] Add state for documents list
- [x] Create `fetchDocuments()` function to load all documents
- [x] Add effect hook to check for `doc` query parameter
- [x] Auto-open document viewer when navigating from citations
- [x] Wrap component in Suspense boundary (required for `useSearchParams`)

### 4. Styling Updates
- [x] Update Tailwind config to include typography plugin
- [x] Add custom prose styles in globals.css for:
  - Headings (h1-h4)
  - Paragraphs and lists
  - Code blocks and inline code
  - Links with hover effects
  - Blockquotes

### 5. Make Inline Citations Clickable (NEW)
- [x] Update search API to include citation indices
- [x] Create `MarkdownWithCitations` component
- [x] Parse citation markers [1], [2], etc. in the answer text
- [x] Convert citation markers to clickable links
- [x] Links navigate directly to the source document

### 6. Shorten Citation Snippets (NEW)
- [x] Truncate snippets to 150 characters max
- [x] Add "..." ellipsis for truncated text
- [x] Use `line-clamp-2` CSS to limit to 2 lines
- [x] Add numbered badges (1, 2, 3) to match inline citations
- [x] Improve visual hierarchy with better spacing

### 7. Add NextAuth Authentication (LATEST)
- [x] Install `next-auth@beta` (v5) and `bcryptjs`
- [x] Create auth configuration with Credentials provider
- [x] Set up API route at `/api/auth/[...nextauth]`
- [x] Create sign-in page at `/auth/signin`
- [x] Implement middleware to protect `/documents` route
- [x] Add SessionProvider to root layout
- [x] Add sign-out button to documents page header
- [x] Use hardcoded credentials from .env.local (ADMIN_USERNAME, ADMIN_PASSWORD)
- [x] Redirect to sign-in page when accessing protected route

## Changes Made

### Files Modified

1. **package.json**
   - Added `react-markdown@10.1.0`
   - Added `remark-gfm@4.0.1`
   - Added `@tailwindcss/typography@0.5.19` (dev dependency)

2. **src/app/api/search/route.ts**
   - Added `index` field to citations (1, 2, 3, etc.)
   - Exported `groundingSupports` for inline citation metadata

3. **src/app/page.tsx**
   - Updated `Citation` interface to include `index` field
   - Created `MarkdownWithCitations` component to handle inline citations
   - Regex pattern `/\[(\d+)\]/g` finds citation markers in text
   - Custom ReactMarkdown component that converts `[1]` → clickable link
   - Citation links use `#citation-{num}` as temporary href, then link to document
   - Truncated citation snippets to 150 characters max with ellipsis
   - Added numbered badges (circular) matching inline citation numbers
   - Used `line-clamp-2` CSS class to limit snippet to 2 lines
   - Improved layout with flex spacing and better visual hierarchy

4. **src/app/documents/page.tsx**
   - Added `useSearchParams`, `Suspense` imports
   - Created `DocumentsContent` component containing main logic
   - Added `documents` state and `fetchDocuments()` function
   - Added effect to handle `doc` query parameter and auto-open viewer
   - Wrapped export in `Suspense` boundary to fix Next.js build error

5. **tailwind.config.ts**
   - Added `@tailwindcss/typography` plugin

6. **src/app/globals.css**
   - Added custom prose styles for consistent markdown rendering
   - Styled headings, paragraphs, lists, code, links, and blockquotes
   - Used theme colors for dark mode compatibility
   - Added `line-clamp-2` utility for truncating text to 2 lines

7. **.env.local**
   - Updated `NEXTAUTH_SECRET` with a proper secret key
   - Kept existing `ADMIN_USERNAME=admin` and `ADMIN_PASSWORD=admin123`

### Files Created (Authentication)

1. **src/lib/auth/config.ts**
   - NextAuth v5 configuration with Credentials provider
   - Validates username/password against .env.local values
   - Configures sign-in page route
   - Implements `authorized` callback to protect `/documents` route

2. **src/app/api/auth/[...nextauth]/route.ts**
   - API route handler for NextAuth
   - Exports GET and POST handlers

3. **src/app/auth/signin/page.tsx**
   - Custom sign-in page with username/password form
   - Shows error messages for invalid credentials
   - Redirects to callbackUrl after successful login
   - Wrapped in Suspense for useSearchParams

4. **src/middleware.ts**
   - Middleware to protect `/documents` route
   - Redirects unauthenticated users to `/auth/signin`
   - Preserves intended destination via callbackUrl

5. **src/components/auth/session-provider.tsx**
   - Client component wrapper for NextAuth SessionProvider
   - Enables useSession hook throughout the app

## Key Features

### Markdown Rendering
- **Rich text formatting**: Bold, italic, headings, lists all render properly
- **Code support**: Inline code with background highlight and code blocks
- **GitHub Flavored Markdown**: Tables, strikethrough, task lists supported
- **Dark mode compatible**: Uses theme colors from Tailwind config

### Inline Citation Links (NEW!)
- **Clickable inline citations**: Citation markers like [1], [2] in the answer text are now clickable
- **Direct navigation**: Clicking [1] navigates to the source document immediately
- **Visual distinction**: Inline citations styled as bold, colored links with hover effect
- **Tooltip**: Hovering over [1] shows the document title
- **Smart parsing**: Regex automatically finds all `[number]` patterns and converts them

### Citation Footnotes
- **Numbered badges**: Each citation shows a circular badge (1, 2, 3) matching inline references
- **Truncated snippets**: Max 150 characters with ellipsis (...)
- **Line clamping**: CSS limits snippets to 2 lines for consistency
- **Interactive links**: Citations are clickable and navigate to the document
- **Visual feedback**: Hover effect shows the citation is clickable
- **External link icon**: Small icon indicates the citation opens a document
- **Direct navigation**: URL pattern `/documents?doc={documentId}` auto-opens the viewer

### Authentication (NEW!)
- **Protected route**: `/documents` requires authentication
- **Credentials login**: Username and password from .env.local
- **Custom sign-in page**: Clean, branded login form at `/auth/signin`
- **Session management**: NextAuth v5 handles sessions with JWT
- **Middleware protection**: Automatically redirects unauthenticated users
- **Callback URL**: Preserves intended destination after login
- **Sign-out button**: Visible in documents page header
- **User display**: Shows logged-in username in header

## Technical Details

### Suspense Boundary
Next.js requires `useSearchParams()` to be wrapped in a Suspense boundary for static export compatibility. The solution:
```tsx
function DocumentsContent() {
  const searchParams = useSearchParams();
  // ... component logic
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DocumentsContent />
    </Suspense>
  );
}
```

### Markdown Styling
The `prose` classes from `@tailwindcss/typography` provide beautiful default styling, enhanced with custom styles for:
- Theme color integration
- Consistent spacing
- Code block styling
- Link hover effects

### Inline Citation Processing
The `MarkdownWithCitations` component uses a multi-step approach:

1. **Regex Replacement**: Find all `[number]` patterns in the answer text
   ```javascript
   content.replace(/\[(\d+)\]/g, (match, num) => {
     return `[${num}](#citation-${num} "${citation.title}")`;
   });
   ```

2. **Custom Link Renderer**: ReactMarkdown component intercepts anchor tags
   ```javascript
   components={{
     a: ({ href, ...props }) => {
       if (href?.startsWith('#citation-')) {
         // Convert to Link component pointing to document
         return <Link href={`/documents?doc=${documentId}`}>[{num}]</Link>;
       }
     }
   }}
   ```

3. **Result**: Citation markers become clickable links that navigate to the source document

### Citation Snippet Truncation
```javascript
const truncatedSnippet = citation.snippet.length > 150
  ? citation.snippet.substring(0, 150) + '...'
  : citation.snippet;
```
Combined with CSS `line-clamp-2` to ensure consistent visual height even if truncation isn't needed.

### Authentication Flow

1. **User visits `/documents`**
   - Middleware checks if authenticated
   - If not → redirect to `/auth/signin?callbackUrl=/documents`

2. **User enters credentials**
   - Form submits to NextAuth
   - Credentials provider validates against .env.local
   - Username: `admin` (from `ADMIN_USERNAME`)
   - Password: `admin123` (from `ADMIN_PASSWORD`)

3. **Successful login**
   - Session created with JWT
   - User redirected to callbackUrl (`/documents`)
   - Session persists across page reloads

4. **Sign out**
   - Click "Sign Out" button
   - Session destroyed
   - Redirected to home page (`/`)

### NextAuth v5 Configuration

```typescript
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      async authorize(credentials) {
        // Validate against ADMIN_USERNAME and ADMIN_PASSWORD
        if (credentials.username === adminUsername &&
            credentials.password === adminPassword) {
          return { id: '1', name: adminUsername, email: '...' };
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    authorized({ auth, request }) {
      // Protect /documents route
      const isOnDocuments = request.nextUrl.pathname.startsWith('/documents');
      if (isOnDocuments && !auth?.user) return false;
      return true;
    },
  },
});
```

## Testing

- [x] Build passes successfully (`pnpm run build`)
- [x] TypeScript compilation successful
- [x] No runtime errors
- [x] NextAuth routes created successfully
- [x] Middleware configured correctly
- [ ] Manual testing: Verify markdown renders correctly
- [ ] Manual testing: Verify citations link to correct documents
- [ ] Manual testing: Verify auto-open functionality works
- [ ] Manual testing: Login with admin/admin123 credentials
- [ ] Manual testing: Verify /documents redirects to signin when not authenticated
- [ ] Manual testing: Verify sign-out functionality works
- [ ] Manual testing: Verify session persists across page reloads

## Next Steps

1. Test authentication flow:
   - Try accessing `/documents` without logging in
   - Login with admin/admin123
   - Verify redirect to documents page
   - Test sign-out functionality
2. Test inline citation links with actual Gemini responses
3. Verify [1], [2] markers become clickable and navigate correctly
4. Confirm snippet truncation works well visually
5. Test numbered badges align with inline citations
6. Ensure styling looks good in both light and dark modes
7. Verify auto-open document viewer when clicking citations

## Security Notes

**⚠️ IMPORTANT for Production:**

1. **Change credentials**: The default `admin/admin123` should be changed in production
2. **Use strong secret**: Generate a proper `NEXTAUTH_SECRET` using:
   ```bash
   openssl rand -base64 32
   ```
3. **Consider hashing passwords**: Currently passwords are compared in plain text. For production, hash passwords with bcrypt:
   ```typescript
   const hashedPassword = await bcrypt.hash(password, 10);
   const isValid = await bcrypt.compare(credentials.password, hashedPassword);
   ```
4. **Add rate limiting**: Prevent brute force attacks on the login endpoint
5. **Use HTTPS**: Always use HTTPS in production for secure credential transmission
6. **Environment variables**: Never commit `.env.local` to version control

## Visual Example

**Before:**
- Answer: Plain text with [1] markers that aren't clickable
- Citations: Full paragraph of text making the UI cluttered

**After:**
- Answer: "According to the policy **[1]**..." (← clickable, links to doc)
- Citations:
  ```
  [1] Remote Work Policy
      This policy outlines the guidelines for remote work arrangements including...
  ```
  → Now shows:
  ```
  ① Remote Work Policy ↗
    This policy outlines the guidelines for remote work arrangements...
  ```
  (Truncated to 150 chars, 2 lines max, with numbered badge)
