import { TableClient, AzureNamedKeyCredential } from '@azure/data-tables';

let tableClient: TableClient | null = null;

function getTableClient(): TableClient {
  if (!tableClient) {
    if (!process.env.AZURE_STORAGE_ACCOUNT_NAME || !process.env.AZURE_STORAGE_ACCOUNT_KEY) {
      throw new Error('Azure Storage credentials not configured');
    }

    const credential = new AzureNamedKeyCredential(
      process.env.AZURE_STORAGE_ACCOUNT_NAME,
      process.env.AZURE_STORAGE_ACCOUNT_KEY
    );

    tableClient = new TableClient(
      `https://${process.env.AZURE_STORAGE_ACCOUNT_NAME}.table.core.windows.net`,
      'documents',
      credential
    );
  }
  return tableClient;
}

export interface Document {
  partitionKey: string;
  rowKey: string;
  id: string;
  title: string;
  category: string;
  version: string;
  status: 'processing' | 'ready' | 'failed';
  storageUri: string;
  blobName: string;
  fileSize?: string;
  fileType?: string;
  geminiDocumentId?: string;
  geminiFileSearchStoreName?: string;
  errorMessage?: string;
  createdAt: Date;
  timestamp: Date;
}

export async function createDocument(doc: Omit<Document, 'partitionKey' | 'rowKey' | 'id' | 'createdAt' | 'timestamp'>): Promise<Document> {
  const id = Date.now().toString();
  const now = new Date();
  const entity: Document = {
    partitionKey: 'doc',
    rowKey: id,
    id,
    ...doc,
    createdAt: now,
    timestamp: now,
  };

  await getTableClient().createEntity(entity);
  return entity;
}

export async function getAllDocuments(): Promise<Document[]> {
  const entities = getTableClient().listEntities<Document>({
    queryOptions: { filter: "PartitionKey eq 'doc'" }
  });

  const docs: Document[] = [];
  for await (const entity of entities) {
    docs.push(entity as Document);
  }

  return docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getDocumentById(id: string): Promise<Document | null> {
  try {
    const entity = await getTableClient().getEntity<Document>('doc', id);
    return entity as Document;
  } catch {
    return null;
  }
}

export async function updateDocument(id: string, updates: Partial<Document>): Promise<Document> {
  const entity = await getTableClient().getEntity<Document>('doc', id);
  const updated = { ...entity, ...updates };
  await getTableClient().updateEntity(updated, 'Merge');
  return updated as Document;
}

export async function deleteDocument(id: string): Promise<void> {
  await getTableClient().deleteEntity('doc', id);
}
