import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/config";

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return "Please choose a JPG, PNG or WEBP image.";
  if (file.size > MAX_UPLOAD_BYTES) return "That image is larger than 8 MB. Please choose a smaller one.";
  return null;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("This image could not be read."));
    img.src = src;
  });
}

export function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("This file could not be read."));
    r.readAsDataURL(file);
  });
}

/** Resize an image so its longest side is at most maxSize, returned as a JPEG data URL. */
export async function resizeImage(file: Blob, maxSize = 1280, quality = 0.82): Promise<string> {
  const src = await readAsDataUrl(file);
  const img = await loadImage(src);
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return src;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}
