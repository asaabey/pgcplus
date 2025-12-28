import { BlobServiceClient, ContainerClient, BlobSASPermissions } from '@azure/storage-blob';

let blobServiceClient: BlobServiceClient | null = null;

function getBlobServiceClient(): BlobServiceClient {
  if (!blobServiceClient) {
    if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING is not defined');
    }
    blobServiceClient = BlobServiceClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING
    );
  }
  return blobServiceClient;
}

function getContainerName(): string {
  if (!process.env.AZURE_STORAGE_CONTAINER_NAME) {
    throw new Error('AZURE_STORAGE_CONTAINER_NAME is not defined');
  }
  return process.env.AZURE_STORAGE_CONTAINER_NAME;
}

async function getContainerClient(): Promise<ContainerClient> {
  const containerClient = getBlobServiceClient().getContainerClient(getContainerName());
  await containerClient.createIfNotExists();
  return containerClient;
}

/**
 * Upload a document to Azure Blob Storage
 */
export async function uploadDocument(
  file: File | Buffer,
  fileName: string,
  metadata?: Record<string, string>
): Promise<{ uri: string; blobName: string }> {
  const containerClient = await getContainerClient();
  const blobName = `${Date.now()}-${fileName}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  const buffer = file instanceof File ? await file.arrayBuffer() : file;

  await blockBlobClient.upload(buffer, buffer.byteLength || (buffer as Buffer).length, {
    blobHTTPHeaders: {
      blobContentType: getContentType(fileName),
    },
    metadata: metadata || {},
  });

  return {
    uri: blockBlobClient.url,
    blobName,
  };
}

/**
 * Download a document from Azure Blob Storage
 */
export async function downloadDocument(blobName: string): Promise<Buffer> {
  const containerClient = await getContainerClient();
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  const downloadResponse = await blockBlobClient.download();

  if (!downloadResponse.readableStreamBody) {
    throw new Error('Failed to download document');
  }

  return streamToBuffer(downloadResponse.readableStreamBody);
}

/**
 * Get a SAS URL for temporary document access
 */
export async function getDocumentSasUrl(
  blobName: string,
  expiresInMinutes: number = 60
): Promise<string> {
  const containerClient = await getContainerClient();
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  const expiresOn = new Date();
  expiresOn.setMinutes(expiresOn.getMinutes() + expiresInMinutes);

  // Generate SAS token
  const permissions = new BlobSASPermissions();
  permissions.read = true;

  const sasUrl = await blockBlobClient.generateSasUrl({
    permissions,
    expiresOn,
  });

  return sasUrl;
}

/**
 * Delete a document from Azure Blob Storage
 */
export async function deleteDocument(blobName: string): Promise<void> {
  const containerClient = await getContainerClient();
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.deleteIfExists();
}

/**
 * List all documents in the container
 */
export async function listDocuments(prefix?: string): Promise<
  Array<{
    name: string;
    size: number;
    lastModified: Date;
    contentType?: string;
  }>
> {
  const containerClient = await getContainerClient();
  const documents: Array<{
    name: string;
    size: number;
    lastModified: Date;
    contentType?: string;
  }> = [];

  for await (const blob of containerClient.listBlobsFlat({ prefix })) {
    documents.push({
      name: blob.name,
      size: blob.properties.contentLength || 0,
      lastModified: blob.properties.lastModified || new Date(),
      contentType: blob.properties.contentType,
    });
  }

  return documents;
}

/**
 * Get document metadata
 */
export async function getDocumentMetadata(blobName: string): Promise<Record<string, string>> {
  const containerClient = await getContainerClient();
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  const properties = await blockBlobClient.getProperties();
  return properties.metadata || {};
}

/**
 * Update document metadata
 */
export async function updateDocumentMetadata(
  blobName: string,
  metadata: Record<string, string>
): Promise<void> {
  const containerClient = await getContainerClient();
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.setMetadata(metadata);
}

/**
 * Check if document exists
 */
export async function documentExists(blobName: string): Promise<boolean> {
  const containerClient = await getContainerClient();
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  return blockBlobClient.exists();
}

// Helper functions

function getContentType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop();
  const contentTypes: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc: 'application/msword',
    txt: 'text/plain',
  };
  return contentTypes[ext || ''] || 'application/octet-stream';
}

async function streamToBuffer(readableStream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    readableStream.on('data', (data) => {
      chunks.push(data instanceof Buffer ? data : Buffer.from(data));
    });
    readableStream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    readableStream.on('error', reject);
  });
}
