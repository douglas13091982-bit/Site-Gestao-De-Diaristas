// Client-side image compression + WebP conversion.
// Runs entirely in the browser using <canvas>, no server calls.

export type CompressOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0..1
  mimeType?: "image/webp" | "image/jpeg" | "image/png";
};

const DEFAULTS: Required<CompressOptions> = {
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 0.82,
  mimeType: "image/webp",
};

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/**
 * Compresses and converts an image file to WebP (or another format).
 * Falls back to the original file if conversion fails or the browser
 * cannot encode the target format.
 */
export async function compressImage(
  file: File,
  opts: CompressOptions = {},
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  // Skip animated GIFs / SVGs — canvas would drop animation / rasterize badly.
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;

  const { maxWidth, maxHeight, quality, mimeType } = { ...DEFAULTS, ...opts };

  try {
    const img = await loadImage(file);
    const ratio = Math.min(1, maxWidth / img.width, maxHeight / img.height);
    const w = Math.max(1, Math.round(img.width * ratio));
    const h = Math.max(1, Math.round(img.height * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, w, h);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, mimeType, quality),
    );
    if (!blob) return file;

    // If WebP came out bigger than original (rare for tiny PNGs), keep the smaller one.
    if (blob.size >= file.size && file.type === mimeType) return file;

    const ext = mimeType === "image/webp" ? "webp" : mimeType === "image/png" ? "png" : "jpg";
    const base = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${base}.${ext}`, { type: mimeType, lastModified: Date.now() });
  } catch (err) {
    console.warn("[compressImage] fallback to original:", err);
    return file;
  }
}