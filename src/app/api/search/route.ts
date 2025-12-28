import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient } from '@/lib/gemini/client';
import { getOrCreateFileSearchStore } from '@/lib/gemini/file-search-store';
import { getAllDocuments } from '@/lib/db/table-storage';

interface Citation {
  documentId: string;
  title: string;
  snippet: string;
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    const client = getGeminiClient();
    const storeName = await getOrCreateFileSearchStore();

    // Build the system instruction as the first message
    const systemPrompt = `You are a helpful AI assistant that answers questions about company policies and guidelines.

Instructions:
- Search through the provided documents to find relevant information
- Provide accurate, concise answers based only on the document contents
- Always cite your sources using inline citations [1], [2], etc.
- If you cannot find the answer in the documents, say so clearly
- If multiple documents contain relevant information, synthesize the information coherently
- If relevant, present information as a markdown table for better clarity
- Use emojis where appropriate to make responses more engaging and easier to scan
- Use **bold** for emphasis on important terms (e.g., drug names, key requirements, deadlines)
- Use *italics* for definitions, technical terms, or subtle emphasis
- Be professional and clear in your responses

User question: ${query}`;

    // Query Gemini with File Search tool
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: systemPrompt,
      config: {
        tools: [{
          fileSearch: {
            fileSearchStoreNames: [storeName],
          },
        }],
      },
    });

    const candidate = response.candidates?.[0];
    if (!candidate) {
      return NextResponse.json(
        { error: 'No response from Gemini' },
        { status: 500 }
      );
    }

    // Extract answer text
    const answer = candidate.content?.parts?.[0]?.text || 'No answer generated';

    // Extract citations from grounding metadata
    const groundingChunks = candidate.groundingMetadata?.groundingChunks || [];
    const groundingSupports = candidate.groundingMetadata?.groundingSupports || [];

    // Get all documents to map Gemini IDs to our document IDs
    const allDocuments = await getAllDocuments();

    // Map chunk indices to citations and deduplicate by document
    const citationMap = new Map<string, Citation & { chunkIndices: number[] }>();

    groundingChunks.forEach((chunk: any, chunkIndex: number) => {
      // Try multiple possible locations for the document ID
      const geminiFileId = chunk.web?.uri ||
                          chunk.retrievedContext?.uri ||
                          chunk.web?.url ||
                          chunk.retrievedContext?.url ||
                          '';

      // Also extract the title for fallback matching
      const chunkTitle = chunk.web?.title || chunk.retrievedContext?.title || '';

      // Try to find document by Gemini ID first, then fallback to title matching
      let matchedDoc = allDocuments.find(doc =>
        doc.geminiDocumentId === geminiFileId
      );

      // If no match by ID, try matching by title with multiple strategies
      if (!matchedDoc && chunkTitle) {
        // Strategy 1: Exact match (case-sensitive)
        matchedDoc = allDocuments.find(doc => doc.title === chunkTitle);

        // Strategy 2: Case-insensitive match
        if (!matchedDoc) {
          matchedDoc = allDocuments.find(doc =>
            doc.title.toLowerCase() === chunkTitle.toLowerCase()
          );
        }

        // Strategy 3: Match without file extension
        if (!matchedDoc) {
          const chunkTitleNoExt = chunkTitle.replace(/\.(pdf|docx?|txt)$/i, '');
          matchedDoc = allDocuments.find(doc => {
            const docTitleNoExt = doc.title.replace(/\.(pdf|docx?|txt)$/i, '');
            return docTitleNoExt.toLowerCase() === chunkTitleNoExt.toLowerCase();
          });
        }

        if (!matchedDoc) {
          console.warn(`No match found for chunk title: "${chunkTitle}"`);
        }
      }

      const documentId = matchedDoc?.id || geminiFileId;

      // If we haven't seen this document yet, add it
      if (!citationMap.has(documentId)) {
        citationMap.set(documentId, {
          documentId,
          title: matchedDoc?.title || chunk.web?.title || chunk.retrievedContext?.title || 'Unknown Document',
          snippet: chunk.retrievedContext?.text || '',
          chunkIndices: [chunkIndex],
        });
      } else {
        // Add this chunk index to the existing citation
        citationMap.get(documentId)!.chunkIndices.push(chunkIndex);
      }
    });

    // Convert map to array and add indices
    const citations = Array.from(citationMap.values()).map((citation, index) => ({
      documentId: citation.documentId,
      title: citation.title,
      snippet: citation.snippet,
      index: index + 1,
      chunkIndices: citation.chunkIndices, // Keep track of which original chunks map to this citation
    }));

    // Create a mapping from original chunk indices to deduplicated citation indices
    // This helps the frontend know that chunks [0, 2, 5] all map to citation 1, for example
    const chunkToCitationMap: Record<number, number> = {};
    citations.forEach((citation) => {
      citation.chunkIndices.forEach((chunkIndex) => {
        chunkToCitationMap[chunkIndex] = citation.index;
      });
    });

    return NextResponse.json({
      answer,
      citations,
      chunkToCitationMap, // Maps original chunk indices to deduplicated citation indices
      groundingSupports, // Include support indices for inline citations
      rawGroundingMetadata: candidate.groundingMetadata, // For debugging
    });

  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
