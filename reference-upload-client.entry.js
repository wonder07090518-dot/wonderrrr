import { upload } from '@vercel/blob/client';

const MULTIPART_THRESHOLD = 100 * 1024 * 1024;

function safeSegment(value) {
  return String(value || 'reference-file')
    .normalize('NFKC')
    .replace(/[\\/\r\n\0?#%]+/g, '-')
    .replace(/\s+/g, '-')
    .slice(-160);
}

export async function uploadOrderReference(file, options) {
  const relativePath = options.relativePath || file.name;
  const pathname = `orders/${safeSegment(options.orderId)}/${safeSegment(file.name)}`;
  const blob = await upload(pathname, file, {
    access: 'private',
    handleUploadUrl: '/api/reference-upload',
    multipart: file.size > MULTIPART_THRESHOLD,
    clientPayload: JSON.stringify({
      orderId: options.orderId,
      name: file.name,
      path: relativePath,
      size: file.size,
      type: file.type || 'application/octet-stream'
    }),
    onUploadProgress: progress => options.onProgress?.(progress)
  });
  return {
    name: file.name,
    path: relativePath,
    size: file.size,
    type: file.type || blob.contentType || 'application/octet-stream',
    blobPathname: blob.pathname,
    blobUrl: blob.url
  };
}
