/** Browser-side helpers to download generated PDFs to the user's computer. */

function triggerBlobDownload(blob: Blob, filename: string): void {
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(href);
}

/** Decode a base64 PDF (from the create/generate API) and download it. */
export function downloadBase64Pdf(base64: string, filename: string): void {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  triggerBlobDownload(new Blob([bytes], { type: 'application/pdf' }), filename);
}

/** Download an already-fetched PDF Blob. */
export function downloadPdfBlob(blob: Blob, filename: string): void {
  triggerBlobDownload(blob, filename);
}
