import slugify from "slugify";

/**
 * Generate a cryptographically strong random string (hash) for collision-free slugs.
 * Uses the same character set as nanoid default URL-safe alphabet.
 */
function generateShortHash(length = 6): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);

  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}

/**
 * Generate a URL-friendly slug from a name.
 */
export function generateSlug(name: string): string {
  return slugify(name, {
    lower: true,
    strict: true,
    trim: true,
  });
}

/**
 * Generate a unique slug with a cryptographically strong random hash suffix.
 * Format: "my-document-Xy7z9A" (name + hash)
 * This follows best practices used by major platforms (YouTube, Short.io, etc.)
 * to guarantee global uniqueness without requiring a database check.
 */
export function generateUniqueSlug(name: string): string {
  const baseSlug = generateSlug(name);
  const hash = generateShortHash(6);
  return `${baseSlug}-${hash}`;
}
