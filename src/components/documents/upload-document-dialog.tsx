'use client';

import { useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatFileSize } from '@/lib/utils';

interface UploadDocumentDialogProps {
  onUploadSuccess?: () => void;
  categories?: string[];
}

export function UploadDocumentDialog({
  onUploadSuccess,
  categories = [],
}: UploadDocumentDialogProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [version, setVersion] = useState('1.0');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
      ];

      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Only PDF and DOCX files are allowed');
        return;
      }

      // Validate file size (100MB)
      const maxSize = 100 * 1024 * 1024;
      if (selectedFile.size > maxSize) {
        setError('File size must be less than 100MB');
        return;
      }

      setFile(selectedFile);
      setError(null);

      // Auto-populate title from filename if empty
      if (!title) {
        const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, '');
        setTitle(nameWithoutExt);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file || !title || (!category && !newCategory) || !version) {
      setError('Please fill in all required fields');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('category', newCategory || category);
      formData.append('version', version);

      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload document');
      }

      // Reset form
      setFile(null);
      setTitle('');
      setCategory('');
      setNewCategory('');
      setVersion('1.0');
      setOpen(false);

      // Notify parent
      onUploadSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Upload Document
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Upload New Document</DialogTitle>
          <DialogDescription>
            Upload a PDF or DOCX policy document with metadata.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* File Upload */}
            <div className="grid gap-2">
              <Label htmlFor="file">File *</Label>
              {!file ? (
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="file"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/80 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                      <p className="mb-2 text-sm text-muted-foreground">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">PDF or DOCX (MAX. 100MB)</p>
                    </div>
                    <input
                      id="file"
                      type="file"
                      className="hidden"
                      accept=".pdf,.docx,.doc"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              ) : (
                <div className="flex items-start gap-2 p-3 border rounded-lg">
                  <FileText className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium break-words leading-snug">
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleRemoveFile}
                    className="flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Title */}
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Textarea
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Employee Handbook"
                required
                className="min-h-[72px]"
              />
            </div>

            {/* Category */}
            <div className="grid gap-2">
              <Label htmlFor="category">Category *</Label>
              {categories.length > 0 ? (
                <>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                      <SelectItem value="__new__">+ New Category</SelectItem>
                    </SelectContent>
                  </Select>
                  {category === '__new__' && (
                    <Input
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="Enter new category"
                      required
                    />
                  )}
                </>
              ) : (
                <Input
                  id="category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="e.g., HR Policies"
                  required
                />
              )}
            </div>

            {/* Version */}
            <div className="grid gap-2">
              <Label htmlFor="version">Version *</Label>
              <Input
                id="version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g., 1.0"
                required
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={uploading || !file}>
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
