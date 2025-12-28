'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UploadDocumentDialog } from '@/components/documents/upload-document-dialog';
import { DocumentList } from '@/components/documents/document-list';
import { DocumentViewer } from '@/components/documents/document-viewer';
import type { Document } from '@/lib/db/table-storage';
import { AppHeader } from '@/components/layout/app-header';

function DocumentsContent() {
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  // Show loading state while session is loading
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchCategories();
    fetchDocuments();
  }, []);

  useEffect(() => {
    const docId = searchParams.get('doc');
    if (docId && documents.length > 0) {
      const doc = documents.find((d) => d.id === docId);
      if (doc) {
        handleViewDocument(doc);
      }
    }
  }, [searchParams, documents]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/documents/categories');
      const data = await response.json();
      if (response.ok) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents');
      const data = await response.json();
      if (response.ok) {
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

  const handleUploadSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
    fetchCategories();
    fetchDocuments();
  };

  const handleViewDocument = (document: Document) => {
    setSelectedDocument(document);
    setViewerOpen(true);
  };

  const handleCloseViewer = () => {
    setViewerOpen(false);
    setSelectedDocument(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        action={(
          <div className="flex items-center gap-3">
            {session?.user && (
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {session.user.name}
              </span>
            )}
            <UploadDocumentDialog
              onUploadSuccess={handleUploadSuccess}
              categories={categories}
            />
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        )}
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Documents</h2>
          <p className="text-sm text-muted-foreground">
            Manage your policy and guideline documents
          </p>
        </div>

        <DocumentList
          onViewDocument={handleViewDocument}
          refreshTrigger={refreshTrigger}
        />
      </main>

      {/* Document Viewer */}
      <DocumentViewer
        document={selectedDocument}
        open={viewerOpen}
        onClose={handleCloseViewer}
      />
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <DocumentsContent />
    </Suspense>
  );
}
