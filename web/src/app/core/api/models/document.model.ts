export type DocumentFileType = 'pdf' | 'scanned_pdf' | 'image';

export type DocumentStatus =
  | 'pending'
  | 'ocr'
  | 'segmentation'
  | 'indexing'
  | 'available'
  | 'error';

export interface DocumentSpace {
  id: string;
  name: string;
}

export interface DocumentProgram {
  id: string;
  name: string;
}

export interface DocumentSchool {
  id: string;
  name: string;
}

export interface DocumentUploadedBy {
  id: string;
  name: string;
}

export interface DocumentItem {
  id: string;
  name: string;
  fileType: DocumentFileType;
  status: DocumentStatus;
  version: number;
  space: DocumentSpace;
  program?: DocumentProgram | null;
  school?: DocumentSchool | null;
  uploadedBy: DocumentUploadedBy;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentStats {
  total: number;
  available: number;
  processing: number;
  error: number;
}

export interface QueryDocumentsParams {
  page?: number;
  limit?: number;
  spaceId?: string;
  programId?: string;
  schoolId?: string;
  status?: DocumentStatus;
  fileType?: DocumentFileType;
  search?: string;
}
