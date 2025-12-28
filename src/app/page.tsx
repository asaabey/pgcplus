'use client';

import { useState } from 'react';
import { Search, Loader2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppHeader } from '@/components/layout/app-header';

interface Citation {
  index: number;
  documentId: string;
  title: string;
  snippet: string;
}

interface SearchResult {
  answer: string;
  citations: Citation[];
  chunkToCitationMap?: Record<number, number>;
}

// Custom component to render markdown with clickable inline citations
function MarkdownWithCitations({
  content,
  citations,
  chunkToCitationMap
}: {
  content: string;
  citations: Citation[];
  chunkToCitationMap?: Record<number, number>;
}) {
  // Process the markdown to make citation numbers clickable
  // The numbers in the text [1], [2], [3] refer to chunk indices (0-indexed in the map)
  const processedContent = content.replace(/\[(\d+)\]/g, (match, num) => {
    const chunkNum = parseInt(num, 10);

    // If we have a mapping, use it to find the correct citation
    if (chunkToCitationMap) {
      // Chunk indices are 0-based, but displayed as 1-based in text
      const chunkIndex = chunkNum - 1;
      const citationIndex = chunkToCitationMap[chunkIndex];

      if (citationIndex !== undefined) {
        const citation = citations.find(c => c.index === citationIndex);
        if (citation) {
          return `[${citationIndex}](#citation-${citationIndex} "${citation.title}")`;
        }
      }
    } else {
      // Fallback: direct mapping (old behavior)
      const citationIndex = chunkNum - 1;
      const citation = citations[citationIndex];
      if (citation) {
        return `[${chunkNum}](#citation-${chunkNum} "${citation.title}")`;
      }
    }

    return match;
  });

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, href, children, ...props }) => {
            // Handle citation links specially
            if (href?.startsWith('#citation-')) {
              const citationNum = href.replace('#citation-', '');
              const citationIndex = parseInt(citationNum, 10);

              // Find citation by its index property (not array position)
              const citation = citations.find(c => c.index === citationIndex);

              // If citation or documentId is missing, just show the number without link
              if (!citation || !citation.documentId) {
                return <span className="text-primary font-semibold">[{citationNum}]</span>;
              }

              return (
                <Link
                  href={`/view/${citation.documentId}`}
                  className="inline-flex items-center text-primary font-semibold no-underline hover:underline"
                  title={citation.title}
                  {...props}
                >
                  [{citationNum}]
                </Link>
              );
            }
            // Regular links
            return <a href={href} {...props}>{children}</a>;
          },
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Search failed');
        return;
      }

      setResult(data);
    } catch (err) {
      setError('Network error - please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        action={(
          <Link href="/documents">
            <Button variant="outline">Manage Documents</Button>
          </Link>
        )}
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-10 space-y-4">
            <h1 className="text-6xl font-black italic tracking-[-0.05em] sm:text-7xl">
              <span className="inline-block bg-gradient-to-r from-sky-400 via-blue-500 to-cyan-600 bg-clip-text text-transparent drop-shadow-md">
                PGC+
              </span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Ask questions and get AI-powered answers from your documents
            </p>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-full border border-border/70 bg-background/95 px-4 py-2.5 shadow-sm transition focus-within:border-primary focus-within:shadow-lg">
                <Search className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask a question (e.g., What is the remote work policy?)"
                  className="flex-1 min-w-[180px] border-none bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
                  disabled={loading}
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-70"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  <span>{loading ? 'Searching…' : 'Search'}</span>
                </button>
              </div>
              <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                <span>Try:</span>
                <button
                  type="button"
                  onClick={() => setQuery('What are equipment requirements for water quality testing?')}
                  className="rounded-full border border-border/70 bg-muted/30 px-3 py-1 text-foreground transition hover:bg-muted/60"
                >
                  What are equipment requirements for water quality testing?
                </button>
                <button
                  type="button"
                  onClick={() => setQuery('Fungal peritonitis prophylaxis guidelines')}
                  className="rounded-full border border-border/70 bg-muted/30 px-3 py-1 text-foreground transition hover:bg-muted/60"
                >
                  Fungal peritonitis prophylaxis guidelines
                </button>
              </div>
            </div>
          </form>

          {/* Error */}
          {error && (
            <Card className="mb-6 border-destructive">
              <CardContent className="pt-6">
                <p className="text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-6">
              {/* Answer */}
              <Card>
                <CardHeader>
                  <CardTitle>Answer</CardTitle>
                </CardHeader>
                <CardContent>
                  <MarkdownWithCitations
                    content={result.answer}
                    citations={result.citations}
                    chunkToCitationMap={result.chunkToCitationMap}
                  />
                </CardContent>
              </Card>

              {/* Citations */}
              {result.citations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Sources</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {result.citations.map((citation, index) => {
                        // Truncate snippet to max 150 characters
                        const truncatedSnippet = citation.snippet && citation.snippet.length > 150
                          ? citation.snippet.substring(0, 150) + '...'
                          : citation.snippet;

                        return (
                          <Link
                            key={index}
                            href={`/view/${citation.documentId}`}
                            className="block border-l-4 border-primary pl-4 py-2 hover:bg-muted/50 transition-colors rounded-r"
                          >
                            <div className="flex items-start gap-3">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex-shrink-0 mt-0.5">
                                {citation.index}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium flex items-center gap-2">
                                  {citation.title}
                                  <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                </p>
                                {truncatedSnippet && (
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {truncatedSnippet}
                                  </p>
                                )}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
