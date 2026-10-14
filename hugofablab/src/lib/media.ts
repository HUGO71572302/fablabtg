import sharp from "sharp";
import { db } from "@/db";
import { media } from "@/db/schema";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Enregistre une image téléversée (photo de machine, projet, logo…) en base, redimensionnée et convertie en WebP.
 * Retourne l'identifiant du média, ou null si aucun fichier n'a été fourni.
 */
export async function saveImage(file: FormDataEntryValue | null, labId: number | null, maxSize = 1600): Promise<number | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (!file.type.startsWith("image/")) throw new Error("Format non pris en charge : choisissez une image (JPG, PNG, WebP).");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Image trop lourde (10 Mo maximum).");
  const input = Buffer.from(await file.arrayBuffer());
  let out: Buffer;
  try {
    out = await sharp(input)
      .rotate()
      .resize({ width: maxSize, height: maxSize, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    throw new Error("Impossible de lire cette image. Essayez une autre photo.");
  }
  const [row] = await db
    .insert(media)
    .values({ labId, mime: "image/webp", data: out.toString("base64"), bytes: out.length })
    .returning({ id: media.id });
  return row.id;
}
