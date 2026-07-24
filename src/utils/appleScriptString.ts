/**
 * Escape content for embedding inside AppleScript double-quoted strings.
 *
 * AppleScript accepts apostrophes as-is inside double-quoted strings, but
 * backslashes, double quotes, and control characters must be escaped to avoid
 * terminating the string literal or changing the generated script structure.
 */
export function escapeAppleScriptString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}
