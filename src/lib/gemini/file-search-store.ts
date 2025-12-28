import { getGeminiClient } from './client';
import { TableClient } from '@azure/data-tables';
import { AzureNamedKeyCredential } from '@azure/data-tables';

interface FileSearchStoreConfig {
  partitionKey: string;
  rowKey: string;
  storeName: string;
  displayName: string;
  createdAt: Date;
  timestamp: Date;
}

let cachedStoreName: string | null = null;

/**
 * Get or create the shared File Search Store
 * Returns the store name (e.g., "fileSearchStores/abc123")
 *
 * Strategy:
 * 1. Check in-memory cache
 * 2. Check Azure Table Storage
 * 3. Create new store in Gemini if not exists
 * 4. Persist to Azure Table Storage
 */
export async function getOrCreateFileSearchStore(): Promise<string> {
  // Return cached value if available
  if (cachedStoreName) {
    return cachedStoreName;
  }

  // Check if store exists in Azure Table Storage
  const tableClient = getStoreTableClient();
  try {
    const entity = await tableClient.getEntity<FileSearchStoreConfig>(
      'config',
      'file-search-store'
    );
    cachedStoreName = entity.storeName;
    return cachedStoreName;
  } catch (error) {
    // Store doesn't exist, create it
    console.log('File Search Store not found in Table Storage, creating new one...');
  }

  // Create new File Search Store in Gemini
  const client = getGeminiClient();
  const store = await client.fileSearchStores.create({
    config: { displayName: 'pgc-policies' }
  });

  if (!store.name) {
    throw new Error('Failed to create File Search Store - no name returned');
  }

  console.log('Created new Gemini File Search Store:', store.name);

  // Persist to Azure Table Storage
  const now = new Date();
  const config: FileSearchStoreConfig = {
    partitionKey: 'config',
    rowKey: 'file-search-store',
    storeName: store.name,
    displayName: 'pgc-policies',
    createdAt: now,
    timestamp: now,
  };

  await tableClient.createEntity(config);
  cachedStoreName = store.name;

  return cachedStoreName;
}

/**
 * Get the Table Storage client for storing File Search Store configuration
 * Reuses the existing 'documents' table with a different partition key
 */
function getStoreTableClient(): TableClient {
  if (!process.env.AZURE_STORAGE_ACCOUNT_NAME || !process.env.AZURE_STORAGE_ACCOUNT_KEY) {
    throw new Error('Azure Storage credentials not configured');
  }

  const credential = new AzureNamedKeyCredential(
    process.env.AZURE_STORAGE_ACCOUNT_NAME,
    process.env.AZURE_STORAGE_ACCOUNT_KEY
  );

  return new TableClient(
    `https://${process.env.AZURE_STORAGE_ACCOUNT_NAME}.table.core.windows.net`,
    'documents', // Reuse existing table
    credential
  );
}
