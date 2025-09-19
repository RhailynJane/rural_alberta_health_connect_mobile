/**
 * Sanitizes optional string fields to ensure they are either a string or undefined.
 * This prevents type errors when inserting data into Convex with v.optional(v.string()) fields.
 *
 * @param obj - The object containing fields to sanitize
 * @param fields - Array of field names that should be sanitized
 * @returns A new object with sanitized fields
 */
export function sanitizeOptionalStrings<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const result = { ...obj };
  for (const field of fields) {
    const value = result[field];
    if (value !== undefined && typeof value !== "string") {
      result[field] = undefined as any;
    }
  }
  return result;
}

/**
 * Safely converts a value to a string or undefined.
 * Returns undefined for any non-string value (including empty objects).
 *
 * @param val - The value to convert
 * @returns A string or undefined
 */
export function safeString(val: unknown): string | undefined {
  return typeof val === "string" ? val : undefined;
}

/**
 * Safely converts a value to a string or empty string.
 * Returns empty string for any non-string value (including empty objects).
 *
 * @param val - The value to convert
 * @returns A string
 */
export function safeStringOrEmpty(val: unknown): string {
  return typeof val === "string" ? val : "";
}
