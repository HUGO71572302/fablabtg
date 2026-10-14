/** URL publique d'un média stocké en base, avec image de repli éventuelle. */
export function mediaUrl(id: number | null | undefined, fallback: string | null = null): string | null {
  return id ? `/api/media/${id}` : fallback;
}
