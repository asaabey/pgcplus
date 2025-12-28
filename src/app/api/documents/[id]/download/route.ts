import { NextRequest, NextResponse } from 'next/server';
import { getDocumentById, getDocumentDownloadUrl } from '@/lib/documents/crud';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const document = await getDocumentById(id);
    if (!document) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const downloadUrl = await getDocumentDownloadUrl(id, 60);
    return NextResponse.json({
      downloadUrl,
      fileName: `${document.title}.${document.fileType}`,
      fileType: document.fileType,
      fileSize: document.fileSize,
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Failed to generate URL' }, { status: 500 });
  }
}
