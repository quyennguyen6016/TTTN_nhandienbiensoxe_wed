const DEFAULT_MAX_EDGE = 1280;
const DEFAULT_JPEG_QUALITY = 0.88;

export async function prepareImageForUpload(
  file: File,
  maxEdge = DEFAULT_MAX_EDGE,
  quality = DEFAULT_JPEG_QUALITY
): Promise<File> {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  const bitmap = await loadImageSource(file);
  const width = bitmap.width;
  const height = bitmap.height;
  const largestEdge = Math.max(width, height);

  const canvas = document.createElement("canvas");
  if (largestEdge > maxEdge) {
    const scale = maxEdge / largestEdge;
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
  } else {
    canvas.width = width;
    canvas.height = height;
  }

  const context = canvas.getContext("2d");
  if (!context) {
    cleanupBitmap(bitmap);
    return file;
  }

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  cleanupBitmap(bitmap);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );
  if (!blob) {
    return file;
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "plate";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}

function loadImageSource(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file);
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Không đọc được ảnh."));
    };
    image.src = url;
  });
}

function cleanupBitmap(bitmap: ImageBitmap | HTMLImageElement) {
  if ("close" in bitmap && typeof bitmap.close === "function") {
    bitmap.close();
  }
}
