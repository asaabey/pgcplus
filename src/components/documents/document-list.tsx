'use client';

import { useState, useEffect, useMemo } from 'react';
import { FileText, Download, Trash2, Eye, Search, Database, HardDrive } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';
import type { Document } from '@/lib/db/table-storage';

interface DocumentListProps {
  onViewDocument?: (document: Document) => void;
  refreshTrigger?: number;
}

export function DocumentList({ onViewDocument, refreshTrigger }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/documents');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch documents');
      }

      setDocuments(data.documents);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [refreshTrigger]);

  const handleDownload = async (document: Document) => {
    try {
      const response = await fetch(`/api/documents/${document.id}/download`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get download URL');
      }

      // Open download URL in new tab
      window.open(data.downloadUrl, '_blank');
    } catch (err) {
      console.error('Download error:', err);
      alert(err instanceof Error ? err.message : 'Failed to download document');
    }
  };

  const handleDelete = async (document: Document) => {
    if (!confirm(`Are you sure you want to delete "${document.title}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete document');
      }

      // Refresh list
      fetchDocuments();
    } catch (err) {
      console.error('Delete error:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete document');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <Badge variant="success">Ready</Badge>;
      case 'processing':
        return <Badge variant="warning">Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Helper function to parse fileSize string back to bytes
  const parseFileSize = (sizeStr: string | undefined): number => {
    if (!sizeStr) return 0;

    const match = sizeStr.match(/^([\d.]+)\s*(Bytes|KB|MB|GB)$/i);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();

    const multipliers: Record<string, number> = {
      'BYTES': 1,
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024,
    };

    return value * (multipliers[unit] || 0);
  };

  // Calculate total statistics
  const statistics = useMemo(() => {
    const totalCount = documents.length;
    const totalBytes = documents.reduce((sum, doc) => sum + parseFileSize(doc.fileSize), 0);

    // Format total size
    const formatTotalSize = (bytes: number): string => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    return {
      totalCount,
      totalSize: formatTotalSize(totalBytes),
    };
  }, [documents]);

  // Filter documents based on search query
  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return documents;

    const query = searchQuery.toLowerCase();
    return documents.filter(doc =>
      doc.title.toLowerCase().includes(query) ||
      doc.category.toLowerCase().includes(query) ||
      doc.version.toLowerCase().includes(query)
    );
  }, [documents, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading documents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" onClick={fetchDocuments} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
        <p className="text-sm text-muted-foreground">
          Upload your first policy document to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Statistics Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-around gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Documents</p>
                <p className="text-2xl font-bold">{statistics.totalCount}</p>
              </div>
            </div>
            <div className="h-12 w-px bg-border" />
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <HardDrive className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Size</p>
                <p className="text-2xl font-bold">{statistics.totalSize}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Box */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search documents by title, category, or version..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Results count */}
      {searchQuery && (
        <p className="text-sm text-muted-foreground">
          Found {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Document List */}
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-12">
          <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No documents found</h3>
          <p className="text-sm text-muted-foreground">
            Try adjusting your search query
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredDocuments.map((document) => (
        <Card key={document.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">{document.title}</h3>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-sm text-muted-foreground">{document.category}</span>
                      <span className="text-sm text-muted-foreground">v{document.version}</span>
                      {document.fileSize && (
                        <span className="text-sm text-muted-foreground">{document.fileSize}</span>
                      )}
                      {getStatusBadge(document.status)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Uploaded {formatDate(document.createdAt)}
                    </p>
                    {document.status === 'failed' && document.errorMessage && (
                      <p className="text-xs text-destructive mt-2">
                        Error: {document.errorMessage}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onViewDocument?.(document)}
                      title="View document"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDownload(document)}
                      title="Download document"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(document)}
                      title="Delete document"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
        </div>
      )}
    </div>
  );
}
