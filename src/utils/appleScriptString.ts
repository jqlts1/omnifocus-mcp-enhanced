/**
 * Escape content for embedding inside AppleScript double-quoted strings.
 *
 * AppleScript accepts apostrophes as-is inside double-quoted strings, but
 * backslashes and double quotes must be escaped to avoid syntax errors.
 */
export function escapeAppleScriptString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}
