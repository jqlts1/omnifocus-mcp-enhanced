import { executeAppleScript } from '../../utils/scriptExecution.js';
import { buildAppleScriptJsonHelpers } from '../../utils/appleScriptJson.js';
import { escapeAppleScriptString } from '../../utils/appleScriptString.js';

// Interface for append-to-note parameters
export interface AppendToNoteParams {
  id?: string;                   // ID of the task or project
  name?: string;                 // Name of the task or project (fallback if ID not provided)
  itemType: 'task' | 'project';  // Type of item whose note is being appended to
  text: string;                  // Text to append to the note
  separator?: string;            // Separator between existing note and new text (default: newline)
}

/**
 * Generate pure AppleScript that appends text to an item's note without overwriting.
 */
export function generateAppleScript(params: AppendToNoteParams): string {
  const id = params.id ? escapeAppleScriptString(params.id) : '';
  const name = params.name ? escapeAppleScriptString(params.name) : '';
  const itemType = params.itemType;
  const singularTypeLabel = itemType === 'task' ? 'task' : 'project';
  const listName = itemType === 'task' ? 'flattened tasks' : 'flattened projects';
  const appendText = escapeAppleScriptString(params.text);
  // Separator handling:
  // - Default (undefined): use AppleScript's `linefeed` constant for a real newline.
  // - Explicit string: embed it as an escaped literal (empty string means no separator).
  const useDefaultNewline = params.separator === undefined;
  const separatorExpr = useDefaultNewline
    ? 'linefeed'
    : `"${escapeAppleScriptString(params.separator as string)}"`;
  const jsonHelpers = buildAppleScriptJsonHelpers();

  if (!id && !name) {
    return `return "{\\\"success\\\":false,\\\"error\\\":\\\"Either id or name must be provided\\\"}"`;
  }

  if (!params.text) {
    return `return "{\\\"success\\\":false,\\\"error\\\":\\\"text must be provided\\\"}"`;
  }

  let script = `
${jsonHelpers}
  try
    tell application "OmniFocus"
      tell front document
        -- Find the item
        set foundItem to missing value
`;

  if (id) {
    script += `
        -- Try to find by ID first
        try
          set foundItem to first ${itemType === 'task' ? 'flattened task' : 'flattened project'} where id = "${id}"
        end try
`;
  }

  if (name) {
    script += `
        -- Resolve by name with duplicate protection
        if foundItem is missing value then
          set nameMatches to (${listName} where name = "${name}")
          set nameMatchCount to count of nameMatches

          if nameMatchCount = 1 then
            set foundItem to item 1 of nameMatches
          else if nameMatchCount > 1 then
            return "{\\\"success\\\":false,\\\"error\\\":\\"" & my jsonEscape("Ambiguous ${singularTypeLabel} name: ${name}. Multiple matches found; please use id.") & "\\\"}"
          end if
        end if
`;
  }

  script += `
        if foundItem is not missing value then
          set itemName to name of foundItem
          set itemId to id of foundItem as string

          -- Read the existing note (may be empty)
          set existingNote to note of foundItem
          if existingNote is missing value then
            set existingNote to ""
          end if

          -- Append text, using the separator only when there is existing content
          if existingNote is "" then
            set newNote to "${appendText}"
          else
            set newNote to existingNote & ${separatorExpr} & "${appendText}"
          end if

          set note of foundItem to newNote

          return "{\\\"success\\\":true,\\\"id\\\":\\"" & my jsonEscape(itemId) & "\\",\\\"name\\\":\\"" & my jsonEscape(itemName) & "\\\"}"
        else
          return "{\\\"success\\\":false,\\\"error\\\":\\\"Item not found\\\"}"
        end if
      end tell
    end tell
  on error errorMessage
    return "{\\\"success\\\":false,\\\"error\\\":\\"" & my jsonEscape(errorMessage) & "\\\"}"
  end try
  `;

  return script;
}

/**
 * Append text to a task or project note in OmniFocus (non-destructive).
 */
export async function appendToNote(params: AppendToNoteParams): Promise<{
  success: boolean,
  id?: string,
  name?: string,
  error?: string
}> {
  try {
    if (!params.id && !params.name) {
      return { success: false, error: 'Either id or name must be provided' };
    }
    if (!params.text) {
      return { success: false, error: 'text must be provided' };
    }

    const script = generateAppleScript(params);

    console.error('Executing AppleScript for note append...');

    const stdout = await executeAppleScript(script);

    console.error('AppleScript stdout:', stdout);

    try {
      const result = JSON.parse(stdout);

      if (!result.success) {
        return { success: false, error: result.error };
      }

      return { success: true, id: result.id, name: result.name };
    } catch (parseError) {
      console.error('Error parsing AppleScript result:', parseError);
      return { success: false, error: `Failed to parse result: ${stdout}` };
    }
  } catch (error: any) {
    console.error('Error in appendToNote:', error);
    return { success: false, error: error?.message || 'Unknown error in appendToNote' };
  }
}
