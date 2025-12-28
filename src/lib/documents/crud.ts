import {
  createDocument as createDoc,
  getAllDocuments as getAllDocs,
  getDocumentById as getDocById,
  updateDocument as updateDoc,
  deleteDocument as deleteDoc,
  type Document,
} from '@/lib/db/table-storage';
import {
  uploadDocument as uploadToAzure,
  deleteDocument as deleteFromAzure,
  getDocumentSasUrl,
} from '@/lib/storage/azure-storage';
import {
  uploadDocumentToGemini,
  deleteDocumentFromGemini,
  type GeminiUploadResult,
} from '@/lib/gemini/document-indexing';

export async function createDocument(data: Omit<Document, 'partitionKey' | 'rowKey' | 'id' | 'createdAt' | 'timestamp'>): Promise<Document> {
  return createDoc(data);
}

export async function getAllDocuments(): Promise<Document[]> {
  return getAllDocs();
}

export async function getDocumentById(id: string): Promise<Document | null> {
  return getDocById(id);
}

export async function updateDocumentStatus(
  id: string,
  status: 'processing' | 'ready' | 'failed',
  errorMessage?: string
): Promise<Document> {
  return updateDoc(id, { status, errorMessage });
}

export async function deleteDocument(id: string): Promise<void> {
  const doc = await getDocById(id);
  if (doc) {
    // Delete from Azure Blob Storage
    await deleteFromAzure(doc.blobName);

    // Delete from Gemini (if indexed)
    if (doc.geminiDocumentId) {
      await deleteDocumentFromGemini(doc.geminiDocumentId);
    }
  }

  // Delete from Table Storage
  await deleteDoc(id);
}

export async function uploadAndCreateDocument(
  file: File | Buffer,
  fileName: string,
  metadata: {
    title: string;
    category: string;
    version: string;
  }
): Promise<Document> {
  // Step 1: Upload to Azure Blob Storage
  const { uri, blobName } = await uploadToAzure(file, fileName, {
    title: metadata.title,
    category: metadata.category,
    version: metadata.version,
  });

  const fileSize = file instanceof File ? file.size : (file as Buffer).length;
  const fileSizeFormatted = formatFileSize(fileSize);
  const fileType = fileName.split('.').pop()?.toLowerCase() || 'unknown';

  // Step 2: Create database record with status='processing'
  const document = await createDoc({
    title: metadata.title,
    category: metadata.category,
    version: metadata.version,
    status: 'processing',
    storageUri: uri,
    blobName,
    fileSize: fileSizeFormatted,
    fileType,
  });

  // Step 3: Convert file to Buffer if needed
  const buffer = file instanceof File ? Buffer.from(await file.arrayBuffer()) : file;

  try {
    // Step 4: Upload to Gemini File Search Store (synchronous - user waits)
    const geminiResult: GeminiUploadResult = await uploadDocumentToGemini(
      buffer,
      fileName,
      metadata
    );

    // Step 5: Update document with Gemini IDs and mark as 'ready'
    const updatedDoc = await updateDoc(document.id, {
      geminiDocumentId: geminiResult.geminiDocumentId,
      geminiFileSearchStoreName: geminiResult.geminiFileSearchStoreName,
      status: 'ready',
    });

    return updatedDoc;
  } catch (error) {
    // Step 6: Mark as 'failed' if Gemini upload fails
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await updateDoc(document.id, {
      status: 'failed',
      errorMessage: `Gemini upload failed: ${errorMessage}`,
    });

    // Re-throw so API can return 500
    throw error;
  }
}

export async function getDocumentDownloadUrl(id: string, expiresInMinutes: number = 60): Promise<string> {
  const doc = await getDocById(id);
  if (!doc) throw new Error('Document not found');
  return getDocumentSasUrl(doc.blobName, expiresInMinutes);
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
