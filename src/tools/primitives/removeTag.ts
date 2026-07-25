import { executeAppleScript } from '../../utils/scriptExecution.js';
import { buildAppleScriptJsonHelpers } from '../../utils/appleScriptJson.js';
import { escapeAppleScriptString } from '../../utils/appleScriptString.js';

export interface RemoveTagParams {
  id?: string;
  name?: string;
}

/**
 * Generate pure AppleScript for tag removal.
 * Deleting a tag removes it from all tasks but does not delete the tasks.
 */
export function generateAppleScript(params: RemoveTagParams): string {
  const id = params.id ? escapeAppleScriptString(params.id) : '';
  const name = params.name ? escapeAppleScriptString(params.name) : '';
  const jsonHelpers = buildAppleScriptJsonHelpers();

  if (!id && !name) {
    return `return "{\\\"success\\\":false,\\\"error\\\":\\\"Either id or name must be provided\\\"}"`;
  }

  let script = `
${jsonHelpers}
  try
    tell application "OmniFocus"
      tell front document
        set foundTag to missing value
`;

  if (id) {
    script += `
        try
          set foundTag to first flattened tag where id = "${id}"
        end try
`;
  }

  if (name) {
    script += `
        if foundTag is missing value then
          set nameMatches to (flattened tags where name = "${name}")
          set nameMatchCount to count of nameMatches

          if nameMatchCount = 1 then
            set foundTag to item 1 of nameMatches
          else if nameMatchCount > 1 then
            return "{\\\"success\\\":false,\\\"error\\\":\\"" & my jsonEscape("Ambiguous tag name: ${name}. Multiple matches found; please use id.") & "\\\"}"
          end if
        end if
`;
  }

  script += `
        if foundTag is not missing value then
          set tagName to name of foundTag
          set tagId to id of foundTag as string

          -- Count affected tasks and child tags before deleting (for reporting)
          set affectedTaskCount to count of (tasks of foundTag)
          set childTagCount to count of (flattened tags of foundTag)

          delete foundTag

          return "{\\\"success\\\":true,\\\"id\\\":\\"" & my jsonEscape(tagId) & "\\",\\\"name\\\":\\"" & my jsonEscape(tagName) & "\\",\\\"affectedTaskCount\\\":" & affectedTaskCount & ",\\\"childTagCount\\\":" & childTagCount & "}"
        else
          return "{\\\"success\\\":false,\\\"error\\\":\\\"Tag not found\\\"}"
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
 * Remove a tag from OmniFocus. Tasks keep existing; they just lose the tag.
 */
export async function removeTag(params: RemoveTagParams): Promise<{
  success: boolean,
  id?: string,
  name?: string,
  affectedTaskCount?: number,
  childTagCount?: number,
  error?: string
}> {
  try {
    const script = generateAppleScript(params);

    console.error('Executing AppleScript for tag removal...');

    const stdout = await executeAppleScript(script);

    console.error('AppleScript stdout:', stdout);

    try {
      const result = JSON.parse(stdout);

      if (!result.success) {
        return { success: false, error: result.error };
      }

      return {
        success: true,
        id: result.id,
        name: result.name,
        affectedTaskCount: result.affectedTaskCount,
        childTagCount: result.childTagCount
      };
    } catch (parseError) {
      console.error('Error parsing AppleScript result:', parseError);
      return { success: false, error: `Failed to parse result: ${stdout}` };
    }
  } catch (error: any) {
    console.error('Error in removeTag:', error);
    return { success: false, error: error?.message || 'Unknown error in removeTag' };
  }
}
