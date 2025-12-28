import { NextRequest, NextResponse } from 'next/server';
import { getDocumentById, deleteDocument, updateDocumentStatus } from '@/lib/documents/crud';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const document = await getDocumentById(id);
    if (!document) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ document });
  } catch (error) {
    console.error('Get error:', error);
    return NextResponse.json({ error: 'Failed to get document' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, errorMessage } = body;

    if (!status || !['processing', 'ready', 'failed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const document = await updateDocumentStatus(id, status, errorMessage);
    return NextResponse.json({ message: 'Updated', document });
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteDocument(id);
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
