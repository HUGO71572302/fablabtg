/**
 * Optimise une photo dans le navigateur avant envoi : redimensionnement (côté le plus long ≤ maxSide)
 * et JPEG compressé. Une photo de téléphone de 12 Mo devient typiquement 300 Ko à 1 Mo.
 * Si la conversion est impossible (format non lu par le navigateur), le fichier d'origine est renvoyé.
 */
export async function compressImage(file: File, maxSide = 2000, quality = 0.86): Promise<File> {
  if (!file.type.startsWith("image/") || /gif|svg/.test(file.type)) return file;
  if (file.size <= 700 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;
    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}
