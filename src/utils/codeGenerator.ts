/**
 * Generate a random alphanumeric string
 * @param length - Length of the string to generate
 * @returns Random uppercase alphanumeric string
 */
export function generateRandomCode(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate multiple unique codes with optional prefix
 * @param quantity - Number of codes to generate
 * @param length - Length of random part
 * @param prefix - Optional prefix for all codes
 * @returns Array of unique code strings
 */
export function generateUniqueCodes(
  quantity: number,
  length: number,
  prefix: string = ''
): string[] {
  const codes = new Set<string>();
  const maxAttempts = quantity * 10; // Allow more attempts than needed
  let attempts = 0;

  while (codes.size < quantity && attempts < maxAttempts) {
    const randomPart = generateRandomCode(length);
    const code = `${prefix}${randomPart}`.toUpperCase();
    codes.add(code);
    attempts++;
  }

  return Array.from(codes);
}

/**
 * Find duplicates in an array
 * @param items - Array to check for duplicates
 * @returns Array of duplicate items
 */
export function findDuplicates<T>(items: T[]): T[] {
  const seen = new Set<T>();
  const duplicates = new Set<T>();

  for (const item of items) {
    if (seen.has(item)) {
      duplicates.add(item);
    } else {
      seen.add(item);
    }
  }

  return Array.from(duplicates);
}

/**
 * Remove duplicates from an array
 * @param items - Array to deduplicate
 * @returns Array without duplicates
 */
export function removeDuplicates<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}
