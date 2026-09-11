/**
 * Image compression utility for profile photo uploads.
 * Uses the Canvas API — browser-only, no external dependencies.
 */

const MAX_DIMENSION = 400;
const MAX_SIZE_BYTES = 300 * 1024; // 300 KB
const INITIAL_QUALITY = 0.85;
const MIN_QUALITY = 0.1;
const QUALITY_STEP = 0.1;

/**
 * Compresses an image file to a JPEG Blob with the following guarantees:
 * - Output size ≤ 300 KB
 * - Output dimensions ≤ 400 × 400 px
 * - Center-cropped to a 1:1 aspect ratio before resizing
 * - Quality iterates from 0.85 down to 0.1 until the size constraint is met
 *
 * This function uses browser-only APIs (`createImageBitmap`, `HTMLCanvasElement`).
 * Do not call it from Node.js / server-side code.
 *
 * @param file - The image File selected by the user
 * @returns A JPEG Blob ready for upload
 */
export async function compressImage(file: File): Promise<Blob> {
  // Decode the image into a bitmap (browser native — no <img> element needed)
  const bitmap = await createImageBitmap(file);
  const { width: origW, height: origH } = bitmap;

  // ── Center-crop to 1:1 aspect ratio ──────────────────────────────────────
  const cropSize = Math.min(origW, origH);
  const cropX = (origW - cropSize) / 2;
  const cropY = (origH - cropSize) / 2;

  // ── Determine output canvas size (cap at MAX_DIMENSION) ──────────────────
  const outputSize = Math.min(cropSize, MAX_DIMENSION);

  // ── Draw cropped & scaled image onto canvas ───────────────────────────────
  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Gagal mendapatkan context canvas 2D.');
  }

  // drawImage(source, sx, sy, sw, sh, dx, dy, dw, dh)
  ctx.drawImage(bitmap, cropX, cropY, cropSize, cropSize, 0, 0, outputSize, outputSize);
  bitmap.close();

  // ── Iteratively reduce JPEG quality until ≤ 300 KB ───────────────────────
  const toBlob = (quality: number): Promise<Blob> =>
    new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('canvas.toBlob returned null'))),
        'image/jpeg',
        quality,
      ),
    );

  let quality = INITIAL_QUALITY;
  let blob = await toBlob(quality);

  while (blob.size > MAX_SIZE_BYTES && quality > MIN_QUALITY) {
    quality = Math.round((quality - QUALITY_STEP) * 10) / 10; // avoid float drift
    blob = await toBlob(Math.max(quality, MIN_QUALITY));
  }

  // Final safety net: if still over limit after reaching MIN_QUALITY, return
  // the MIN_QUALITY result anyway (upload layer can reject if needed).
  return blob;
}
