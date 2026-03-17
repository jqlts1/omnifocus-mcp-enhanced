import path from 'node:path';

export type TaskAttachmentSource = 'embedded' | 'linked';
export type TaskAttachmentKind = 'image' | 'pdf' | 'audio' | 'video' | 'archive' | 'text' | 'file';

export interface RawTaskAttachment {
  id?: string;
  name?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
}

export interface TaskAttachmentInfo {
  id: string;
  name: string;
  kind: TaskAttachmentKind;
  mimeType: string | null;
  sizeBytes: number | null;
  source: TaskAttachmentSource;
  isImage: boolean;
  url?: string;
}

const EXTENSION_TO_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
  txt: 'text/plain',
  md: 'text/markdown',
  markdown: 'text/markdown',
  json: 'application/json',
  csv: 'text/csv',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  zip: 'application/zip'
};

function extractExtension(name: string): string | null {
  const lastDot = name.lastIndexOf('.');
  if (lastDot === -1 || lastDot === name.length - 1) {
    return null;
  }

  return name.slice(lastDot + 1).toLowerCase();
}

export function inferMimeType(name: string): string | null {
  const extension = extractExtension(name);
  if (!extension) {
    return null;
  }

  return EXTENSION_TO_MIME[extension] || null;
}

export function inferAttachmentKind(name: string, mimeType?: string | null): TaskAttachmentKind {
  const resolvedMimeType = mimeType || inferMimeType(name) || '';

  if (resolvedMimeType.startsWith('image/')) {
    return 'image';
  }

  if (resolvedMimeType === 'application/pdf') {
    return 'pdf';
  }

  if (resolvedMimeType.startsWith('audio/')) {
    return 'audio';
  }

  if (resolvedMimeType.startsWith('video/')) {
    return 'video';
  }

  if (
    resolvedMimeType.startsWith('text/') ||
    resolvedMimeType === 'application/json'
  ) {
    return 'text';
  }

  if (resolvedMimeType === 'application/zip') {
    return 'archive';
  }

  return 'file';
}

function normalizeName(name: string | null | undefined, fallbackPrefix: string, index: number): string {
  return name?.trim() || `${fallbackPrefix}-${index + 1}`;
}

export function normalizeEmbeddedAttachment(raw: RawTaskAttachment, index: number): TaskAttachmentInfo {
  const name = normalizeName(raw.name, 'attachment', index);
  const mimeType = raw.mimeType || inferMimeType(name);

  return {
    id: raw.id?.trim() || `embedded-${index + 1}`,
    name,
    kind: inferAttachmentKind(name, mimeType),
    mimeType,
    sizeBytes: raw.sizeBytes ?? null,
    source: 'embedded',
    isImage: (mimeType || '').startsWith('image/')
  };
}

export function buildLinkedFileAttachment(url: string, index: number): TaskAttachmentInfo {
  let name = `linked-file-${index + 1}`;

  try {
    const parsed = new URL(url);
    name = decodeURIComponent(path.posix.basename(parsed.pathname)) || name;
  } catch {
    const trimmedUrl = url.trim();
    if (trimmedUrl.length > 0) {
      name = trimmedUrl.split('/').pop() || name;
    }
  }

  const mimeType = inferMimeType(name);

  return {
    id: `linked-${index + 1}`,
    name,
    kind: inferAttachmentKind(name, mimeType),
    mimeType,
    sizeBytes: null,
    source: 'linked',
    isImage: (mimeType || '').startsWith('image/'),
    url
  };
}

export function normalizeTaskAttachments(
  embeddedAttachments: RawTaskAttachment[] | undefined,
  linkedFileURLs: string[] | undefined
): TaskAttachmentInfo[] {
  const normalizedEmbedded = (embeddedAttachments || []).map((attachment, index) =>
    normalizeEmbeddedAttachment(attachment, index)
  );

  const normalizedLinked = (linkedFileURLs || []).map((url, index) =>
    buildLinkedFileAttachment(url, index)
  );

  return [...normalizedEmbedded, ...normalizedLinked];
}

export function selectTaskAttachment(
  attachments: TaskAttachmentInfo[],
  selector: {
    attachmentId?: string;
    attachmentName?: string;
  }
): TaskAttachmentInfo | undefined {
  if (selector.attachmentId) {
    return attachments.find(attachment => attachment.id === selector.attachmentId);
  }

  if (selector.attachmentName) {
    const normalizedNeedle = selector.attachmentName.trim().toLowerCase();
    return attachments.find(attachment => attachment.name.trim().toLowerCase() === normalizedNeedle);
  }

  return undefined;
}

export function formatAttachmentSize(sizeBytes: number | null): string {
  if (sizeBytes === null || Number.isNaN(sizeBytes)) {
    return 'unknown size';
  }

  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}
