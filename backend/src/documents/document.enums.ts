export enum DocumentFileType {
  PDF = 'pdf',
  SCANNED_PDF = 'scanned_pdf',
  IMAGE = 'image',
  DOCX = 'docx',
  PPTX = 'pptx',
}

export enum DocumentStatus {
  PENDING = 'pending',
  OCR = 'ocr',
  SEGMENTATION = 'segmentation',
  INDEXING = 'indexing',
  AVAILABLE = 'available',
  ERROR = 'error',
}
