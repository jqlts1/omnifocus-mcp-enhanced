/**
 * Utility functions for AppleScript generation and handling
 */

/**
 * Escape a string for safe use in AppleScript double-quoted strings
 * Only escapes backslashes and double quotes as per Apple documentation
 */
export function escapeForAppleScript(str: string): string {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Generate AppleScript helper function for JSON string escaping
 * This function will be included in the generated AppleScript
 * Based on RFC 7159 JSON specification
 */
export function generateJsonEscapeHelper(): string {
  return `
  -- Helper function to escape strings for JSON output
  on escapeForJson(inputText)
    set escapedText to inputText
    -- Replace backslashes first (must be first to avoid double escaping)
    set escapedText to my replaceText(escapedText, "\\\\", "\\\\\\\\")
    -- Replace double quotes for JSON
    set escapedText to my replaceText(escapedText, "\\"", "\\\\\\"")
    -- Replace newlines for JSON
    set escapedText to my replaceText(escapedText, "
", "\\\\n")
    -- Replace carriage returns for JSON
    set escapedText to my replaceText(escapedText, "\\r", "\\\\r")
    -- Replace tabs for JSON
    set escapedText to my replaceText(escapedText, "	", "\\\\t")
    -- Note: Single quotes/apostrophes do NOT need escaping in JSON
    return escapedText
  end escapeForJson
  
  -- Helper function to replace text
  on replaceText(sourceText, findText, replaceText)
    set AppleScript's text item delimiters to findText
    set textItems to every text item of sourceText
    set AppleScript's text item delimiters to replaceText
    set resultText to textItems as string
    set AppleScript's text item delimiters to ""
    return resultText
  end replaceText
  `;
}

/**
 * Generate case-insensitive AppleScript search condition for exact name matching
 */
export function generateCaseInsensitiveSearch(itemType: 'task' | 'project' | 'tag' | 'folder', searchValue: string): string {
  const itemTypeMap = {
    task: 'flattened task',
    project: 'flattened project', 
    tag: 'flattened tag',
    folder: 'flattened folder'
  };
  
  // Use AppleScript's case-insensitive exact comparison by converting both to lowercase
  return `first ${itemTypeMap[itemType]} whose (name as string) = "${searchValue}"`;
}