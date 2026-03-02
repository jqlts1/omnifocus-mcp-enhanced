/**
 * Centralized sanitization for strings embedded in AppleScript.
 *
 * Replaces the scattered `str.replace(/['"\\]/g, '\\$&')` pattern with
 * a more thorough version that also escapes newlines, carriage returns,
 * and tabs — all of which can break AppleScript string literals.
 */
export function sanitizeForAppleScript(str: string): string {
  return str
    .replace(/\\/g, '\\\\')   // backslash first (order matters)
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}
