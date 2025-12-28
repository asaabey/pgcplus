import { NextRequest, NextResponse } from 'next/server';
import { getAllDocuments, uploadAndCreateDocument } from '@/lib/documents/crud';

// GET /api/documents - List all documents
export async function GET() {
  try {
    const documents = await getAllDocuments();
    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

// POST /api/documents - Upload a new document
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const category = formData.get('category') as string;
    const version = formData.get('version') as string;

    // Validation
    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    if (!title || !category || !version) {
      return NextResponse.json(
        { error: 'Title, category, and version are required' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only PDF and DOCX files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (100MB max)
    const maxSize = 100 * 1024 * 1024; // 100MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 100MB' },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload and create document
    const document = await uploadAndCreateDocument(
      buffer,
      file.name,
      { title, category, version }
    );

    return NextResponse.json({
      message: 'Document uploaded successfully',
      document,
    }, { status: 201 });

  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}
