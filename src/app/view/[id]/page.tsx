'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Document } from '@/lib/db/table-storage';

export default function PublicViewerPage() {
  const params = useParams();
  const documentId = params.id as string;
  const [document, setDocument] = useState<Document | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/documents/${documentId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch document');
        }

        setDocument(data.document);

        // Fetch download URL
        const urlResponse = await fetch(`/api/documents/${documentId}/download`);
        const urlData = await urlResponse.json();

        if (!urlResponse.ok) {
          throw new Error(urlData.error || 'Failed to get download URL');
        }

        setDownloadUrl(urlData.downloadUrl);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load document');
      } finally {
        setLoading(false);
      }
    };

    if (documentId) {
      fetchDocument();
    }
  }, [documentId]);

  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error || 'Document not found'}</p>
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Search
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isPdf = document.fileType === 'pdf';
  const isDocx = document.fileType === 'docx' || document.fileType === 'doc';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Search
              </Button>
            </Link>
            <div className="flex-1 mx-6 min-w-0">
              <h1 className="text-xl font-semibold truncate">{document.title}</h1>
              <p className="text-sm text-muted-foreground">
                {document.category} • v{document.version}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleDownload} variant="outline" size="sm" disabled={!downloadUrl}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              {isDocx && (
                <Button onClick={handleDownload} variant="outline" size="sm" disabled={!downloadUrl}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Document Viewer */}
      <main className="flex-1 overflow-hidden bg-muted/30">
        {!downloadUrl ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Loading document...</p>
            </div>
          </div>
        ) : isPdf ? (
          <iframe
            src={downloadUrl}
            className="w-full h-full border-0"
            title={document.title}
          />
        ) : isDocx ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="max-w-md">
              <h3 className="text-lg font-semibold mb-2">DOCX Preview Not Available</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Word documents cannot be previewed in the browser. Please download the file
                or open it in a new tab.
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download File
                </Button>
                <Button variant="outline" onClick={handleDownload}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">
              Preview not available for this file type
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
