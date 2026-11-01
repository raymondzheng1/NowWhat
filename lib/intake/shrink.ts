/**
 * Make a photo of a letter small enough to upload, in the browser, before it is sent.
 *
 * Vercel refuses a request body over 4.5 MB before our route runs, with a page that is not
 * JSON — so a phone photo of 5–8 MB failed as "Something went wrong" (measured on the live
 * site, 2026-11-01). Phone photos are commonly that size. Redrawn at 2000 px on the long side
 * as a JPEG, a photographed page is well under 1 MB and still sharp enough to read.
 *
 * Runs only on the device; nothing is kept. A PDF cannot be redrawn here, so a large one is
 * reported as too big rather than sent to fail.
 */

/** What we send at most. Under Vercel's 4.5 MB with room for the form's own bytes. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const LONG_SIDE = 2000;

export class UploadTooLargeError extends Error {}

export async function shrinkForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || typeof createImageBitmap !== "function") {
    if (file.size > MAX_UPLOAD_BYTES) throw new UploadTooLargeError();
    return file;
  }
  // A small photo goes as it is: redrawing would only lose detail.
  if (file.size <= MAX_UPLOAD_BYTES / 4) return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // A format this browser cannot draw (HEIC on some phones): send it if it fits.
    if (file.size > MAX_UPLOAD_BYTES) throw new UploadTooLargeError();
    return file;
  }
  const scale = Math.min(1, LONG_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
  if (!blob) {
    if (file.size > MAX_UPLOAD_BYTES) throw new UploadTooLargeError();
    return file;
  }
  if (blob.size > MAX_UPLOAD_BYTES) throw new UploadTooLargeError();
  return new File([blob], "letter.jpg", { type: "image/jpeg" });
}
