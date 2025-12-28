'use client';

import { useState, useEffect } from 'react';
import { Download, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Document } from '@/lib/db/table-storage';

interface DocumentViewerProps {
  document: Document | null;
  open: boolean;
  onClose: () => void;
}

export function DocumentViewer({ document, open, onClose }: DocumentViewerProps) {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && document) {
      fetchDownloadUrl();
    } else {
      setDownloadUrl(null);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, document]);

  const fetchDownloadUrl = async () => {
    if (!document) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/documents/${document.id}/download`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get download URL');
      }

      setDownloadUrl(data.downloadUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
    }
  };

  const handleOpenExternal = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
    }
  };

  if (!document) return null;

  const isPdf = document.fileType === 'pdf';
  const isDocx = document.fileType === 'docx' || document.fileType === 'doc';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 mr-4">
              <DialogTitle className="truncate">{document.title}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {document.category} • v{document.version}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={!downloadUrl}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              {isDocx && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenExternal}
                  disabled={!downloadUrl}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-muted/30">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-sm text-muted-foreground">Loading document...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-sm text-destructive mb-4">{error}</p>
                <Button variant="outline" onClick={fetchDownloadUrl}>
                  Retry
                </Button>
              </div>
            </div>
          )}

          {!loading && !error && downloadUrl && (
            <>
              {isPdf ? (
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
                      <Button variant="outline" onClick={handleOpenExternal}>
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
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
