/**
 * Cursor Encoding Utilities
 *
 * Provides opaque cursor encoding/decoding for cursor-based pagination.
 * Cursors encode both timestamp and ID for consistent pagination even when
 * data changes between requests.
 *
 * @module utils/cursor
 */

/**
 * Cursor data structure containing timestamp and ID for pagination
 */
export interface Cursor {
  /** Timestamp for ordering (ISO 8601 format when serialized) */
  timestamp: Date;
  /** Unique identifier for tie-breaking when timestamps are equal */
  id: string;
}

/**
 * Error thrown when cursor decoding fails
 */
export class CursorDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CursorDecodeError";
  }
}

/**
 * Separator used between timestamp and ID in the cursor payload
 * Using a character unlikely to appear in IDs
 */
const CURSOR_SEPARATOR = "|";

/**
 * Encodes a cursor to an opaque base64 string.
 *
 * The cursor format is: base64(ISO_TIMESTAMP|ID)
 *
 * @param cursor - The cursor containing timestamp and ID
 * @returns Opaque base64-encoded cursor string
 * @throws Error if cursor is invalid
 *
 * @example
 * ```typescript
 * const cursor = { timestamp: new Date('2025-01-15T10:30:00Z'), id: 'mem-123' };
 * const encoded = encodeCursor(cursor);
 * // Returns: "MjAyNS0wMS0xNVQxMDozMDowMC4wMDBafG1lbS0xMjM="
 * ```
 */
export function encodeCursor(cursor: Cursor): string {
  if (!cursor?.timestamp || cursor.id === undefined || cursor.id === null) {
    throw new Error("Invalid cursor: timestamp and id are required");
  }

  if (!(cursor.timestamp instanceof Date) || isNaN(cursor.timestamp.getTime())) {
    throw new Error("Invalid cursor: timestamp must be a valid Date");
  }

  if (typeof cursor.id !== "string" || cursor.id.length === 0) {
    throw new Error("Invalid cursor: id must be a non-empty string");
  }

  const payload = `${cursor.timestamp.toISOString()}${CURSOR_SEPARATOR}${cursor.id}`;
  return Buffer.from(payload, "utf-8").toString("base64");
}

/**
 * Decodes an opaque base64 cursor string back to a Cursor object.
 *
 * @param encoded - The base64-encoded cursor string
 * @returns The decoded cursor with timestamp and ID
 * @throws CursorDecodeError if the cursor is invalid or malformed
 *
 * @example
 * ```typescript
 * const encoded = "MjAyNS0wMS0xNVQxMDozMDowMC4wMDBafG1lbS0xMjM=";
 * const cursor = decodeCursor(encoded);
 * // Returns: { timestamp: Date('2025-01-15T10:30:00Z'), id: 'mem-123' }
 * ```
 */
export function decodeCursor(encoded: string): Cursor {
  if (!encoded || typeof encoded !== "string") {
    throw new CursorDecodeError("Invalid cursor: must be a non-empty string");
  }

  let payload: string;
  try {
    payload = Buffer.from(encoded, "base64").toString("utf-8");
  } catch {
    throw new CursorDecodeError("Invalid cursor: failed to decode base64");
  }

  const separatorIndex = payload.indexOf(CURSOR_SEPARATOR);
  if (separatorIndex === -1) {
    throw new CursorDecodeError("Invalid cursor: malformed payload");
  }

  const timestampStr = payload.substring(0, separatorIndex);
  const id = payload.substring(separatorIndex + 1);

  if (!timestampStr || !id) {
    throw new CursorDecodeError("Invalid cursor: missing timestamp or id");
  }

  const timestamp = new Date(timestampStr);
  if (isNaN(timestamp.getTime())) {
    throw new CursorDecodeError("Invalid cursor: invalid timestamp format");
  }

  return { timestamp, id };
}

/**
 * Validates if a string is a valid encoded cursor without throwing.
 *
 * @param encoded - The string to validate
 * @returns true if the string is a valid cursor, false otherwise
 *
 * @example
 * ```typescript
 * isValidCursor("MjAyNS0wMS0xNVQxMDozMDowMC4wMDBafG1lbS0xMjM="); // true
 * isValidCursor("invalid"); // false
 * ```
 */
export function isValidCursor(encoded: string): boolean {
  try {
    decodeCursor(encoded);
    return true;
  } catch {
    return false;
  }
}
