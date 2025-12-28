import { getGeminiClient } from './client';
import { getOrCreateFileSearchStore } from './file-search-store';

export interface GeminiUploadResult {
  geminiDocumentId: string;
  geminiFileSearchStoreName: string;
}

/**
 * Get MIME type from file extension
 */
function getMimeType(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    'pdf': 'application/pdf',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'doc': 'application/msword',
    'txt': 'text/plain',
  };

  return mimeTypes[extension || ''] || 'application/octet-stream';
}

/**
 * Upload document to Gemini File Search Store
 * @param buffer - File content as Buffer
 * @param fileName - Original file name
 * @param metadata - Document metadata (category, version, title)
 * @returns Gemini document ID and store name
 */
export async function uploadDocumentToGemini(
  buffer: Buffer,
  fileName: string,
  metadata: {
    title: string;
    category: string;
    version: string;
  }
): Promise<GeminiUploadResult> {
  const client = getGeminiClient();
  const storeName = await getOrCreateFileSearchStore();

  console.log(`Uploading document to Gemini File Search Store: ${fileName}`);

  // Determine MIME type from file extension
  const mimeType = getMimeType(fileName);

  // Convert Buffer to Blob with MIME type
  const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });

  // Upload to File Search Store
  const operation = await client.fileSearchStores.uploadToFileSearchStore({
    file: blob,
    fileSearchStoreName: storeName,
    config: {
      displayName: fileName,
      customMetadata: [
        { key: 'title', stringValue: metadata.title },
        { key: 'category', stringValue: metadata.category },
        { key: 'version', stringValue: metadata.version },
      ],
    },
  });

  // Poll for completion (Gemini indexing is async)
  let completedOperation = operation;
  let pollAttempts = 0;
  const maxAttempts = 60; // 5 minutes max (5s intervals)

  while (!completedOperation.done && pollAttempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second intervals
    completedOperation = await client.operations.get({ operation: completedOperation });
    pollAttempts++;

    if (pollAttempts % 6 === 0) {
      // Log progress every 30 seconds
      console.log(`Gemini indexing in progress... ${pollAttempts * 5}s elapsed`);
    }
  }

  if (!completedOperation.done) {
    throw new Error('Gemini indexing timeout - operation did not complete in 5 minutes');
  }

  if (completedOperation.error) {
    throw new Error(`Gemini indexing failed: ${completedOperation.error.message}`);
  }

  // Extract document ID from operation result
  // The response contains the uploaded document information
  const geminiDocumentId = (completedOperation.response as any)?.name ||
                          (completedOperation as any).name ||
                          'unknown';

  console.log(`Document uploaded to Gemini successfully: ${geminiDocumentId}`);

  return {
    geminiDocumentId,
    geminiFileSearchStoreName: storeName,
  };
}

/**
 * Delete document from Gemini File Search Store
 * @param geminiDocumentId - The Gemini document ID (e.g., "files/abc123")
 */
export async function deleteDocumentFromGemini(
  geminiDocumentId: string
): Promise<void> {
  try {
    const client = getGeminiClient();
    await client.files.delete({ name: geminiDocumentId });
    console.log(`Deleted document from Gemini: ${geminiDocumentId}`);
  } catch (error) {
    // Log but don't throw - document may already be deleted or not exist
    console.warn(`Failed to delete Gemini document ${geminiDocumentId}:`, error);
  }
}
