export const MAX_LISTING_PHOTOS = 5;
export const MAX_LISTING_SINGLE_BYTES = 4 * 1024 * 1024;
// Keep combined multipart payload well under Vercel's 4.5 MB Serverless Function body cap
export const MAX_LISTING_TOTAL_BYTES = Math.floor(3.5 * 1024 * 1024);
export const TARGET_COMPRESSED_BYTES = 450 * 1024;

export function isSupportedListingImage(file: File) {
  if (
    [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
    ].includes(file.type.toLowerCase())
  ) {
    return true;
  }
  return /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), mime, quality);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Compresses and normalizes user-selected photos to JPEG in browser canvas
 * so mobile camera images (4-12 MB+) always fit well beneath Vercel's 4.5 MB limit.
 */
export async function compressImageFile(
  file: File,
  options: { targetBytes?: number; allowWebpDirect?: boolean } = {}
): Promise<{ file: File; error?: string }> {
  const targetBytes = options.targetBytes ?? TARGET_COMPRESSED_BYTES;
  const allowWebpDirect = options.allowWebpDirect ?? true;
  const lowerType = file.type.toLowerCase();
  const isHeic =
    lowerType === "image/heic" ||
    lowerType === "image/heif" ||
    /\.(heic|heif)$/i.test(file.name);

  if (
    !isHeic &&
    file.size <= targetBytes &&
    (lowerType === "image/jpeg" ||
      lowerType === "image/png" ||
      (allowWebpDirect && lowerType === "image/webp"))
  ) {
    return { file };
  }

  return await new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();
    let settled = false;

    const cleanup = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timeoutId);
        URL.revokeObjectURL(objectUrl);
      }
    };

    const timeoutId = setTimeout(() => {
      if (settled) return;
      cleanup();
      resolve(
        file.size <= MAX_LISTING_SINGLE_BYTES && !isHeic
          ? { file }
          : {
              file,
              error: `Could not optimize "${file.name}" in time. Try picking a JPG or PNG photo.`,
            }
      );
    }, 10_000);

    img.onload = async () => {
      if (settled) return;
      try {
        const steps = [
          { maxSide: 1400, quality: 0.82 },
          { maxSide: 1080, quality: 0.68 },
          { maxSide: 820, quality: 0.56 },
        ];
        let bestBlob: Blob | null = null;
        const outName =
          (file.name.replace(/\.[^.]+$/, "") || "photo") + ".jpg";

        for (const step of steps) {
          const scale = Math.min(
            1,
            step.maxSide / Math.max(img.width || 1, img.height || 1)
          );
          const width = Math.max(1, Math.round((img.width || 1) * scale));
          const height = Math.max(1, Math.round((img.height || 1) * scale));
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) break;
          // Fill white background before drawing transparent PNG/WebP
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          const blob = await canvasToBlob(canvas, "image/jpeg", step.quality);
          if (blob) {
            bestBlob = blob;
            if (blob.size <= targetBytes) break;
          }
        }

        cleanup();
        if (bestBlob && (isHeic || bestBlob.size <= file.size || file.size > targetBytes)) {
          resolve({
            file: new File([bestBlob], outName, { type: "image/jpeg" }),
          });
          return;
        }
        if (!isHeic && file.size <= MAX_LISTING_SINGLE_BYTES) {
          resolve({ file });
          return;
        }
        resolve({
          file,
          error: `"${file.name}" could not be compressed below 4 MB. Please pick a smaller JPG or PNG image.`,
        });
      } catch {
        cleanup();
        resolve(
          !isHeic && file.size <= MAX_LISTING_SINGLE_BYTES
            ? { file }
            : {
                file,
                error: `Unable to process "${file.name}". Please choose a JPG or PNG photo.`,
              }
        );
      }
    };

    img.onerror = () => {
      cleanup();
      if (isHeic) {
        resolve({
          file,
          error: `This browser cannot decode HEIC file "${file.name}". Please convert it to JPG/PNG or take a quick screenshot.`,
        });
        return;
      }
      resolve(
        file.size <= MAX_LISTING_SINGLE_BYTES
          ? { file }
          : {
              file,
              error: `Could not optimize "${file.name}". Try a JPG or PNG file under 4 MB.`,
            }
      );
    };

    img.src = objectUrl;
  });
}
