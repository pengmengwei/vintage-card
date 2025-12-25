export interface ProcessedImage {
  originalUrl: string;
  processedUrl: string;
  blessing?: string;
  title?: string;
}

export interface AppState {
  step: 'upload' | 'processing' | 'result';
  currentImage: ProcessedImage | null;
  error: string | null;
}
