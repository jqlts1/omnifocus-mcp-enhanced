import { executeAppleScript } from '../../utils/scriptExecution.js';
import { buildAppleScriptJsonHelpers } from '../../utils/appleScriptJson.js';
import { escapeAppleScriptString } from '../../utils/appleScriptString.js';

export interface AddTagParams {
  name: string;
  parentTagName?: string; // Parent tag to nest under (root if omitted)
}

/**
 * Generate pure AppleScript for tag creation.
 */
export function generateAppleScript(params: AddTagParams): string {
  const name = escapeAppleScriptString(params.name);
  const parentTagName = params.parentTagName ? escapeAppleScriptString(params.parentTagName) : '';
  const jsonHelpers = buildAppleScriptJsonHelpers();

  const script = `
${jsonHelpers}
  try
    tell application "OmniFocus"
      tell front document
        -- Reject duplicate tag names to keep the tag tree clean
        set existingMatches to (flattened tags where name = "${name}")
        if (count of existingMatches) > 0 then
          return "{\\\"success\\\":false,\\\"error\\\":\\"" & my jsonEscape("Tag already exists: ${name}") & "\\\"}"
        end if

        if "${parentTagName}" is "" then
          -- Create tag at the root level
          set newTag to make new tag with properties {name:"${name}"}
        else
          -- Resolve parent tag with duplicate protection
          set parentMatches to (flattened tags where name = "${parentTagName}")
          set parentMatchCount to count of parentMatches

          if parentMatchCount = 0 then
            return "{\\\"success\\\":false,\\\"error\\\":\\"" & my jsonEscape("Parent tag not found: ${parentTagName}") & "\\\"}"
          else if parentMatchCount > 1 then
            return "{\\\"success\\\":false,\\\"error\\\":\\"" & my jsonEscape("Ambiguous parent tag name: ${parentTagName}. Multiple matches found; please rename or use a unique tag.") & "\\\"}"
          end if

          set parentTag to item 1 of parentMatches
          set newTag to make new tag with properties {name:"${name}"} at end of tags of parentTag
        end if

        set tagId to id of newTag as string
        set tagNameValue to name of newTag

        return "{\\\"success\\\":true,\\\"tagId\\\":\\"" & my jsonEscape(tagId) & "\\",\\\"name\\\":\\"" & my jsonEscape(tagNameValue) & "\\\"}"
      end tell
    end tell
  on error errorMessage
    return "{\\\"success\\\":false,\\\"error\\\":\\"" & my jsonEscape(errorMessage) & "\\\"}"
  end try
  `;

  return script;
}

/**
 * Add a tag to OmniFocus.
 */
export async function addTag(params: AddTagParams): Promise<{ success: boolean, tagId?: string, name?: string, error?: string }> {
  try {
    const script = generateAppleScript(params);

    console.error('Executing AppleScript for tag creation...');

    const stdout = await executeAppleScript(script);

    console.error('AppleScript stdout:', stdout);

    try {
      const result = JSON.parse(stdout);

      if (!result.success) {
        return { success: false, error: result.error };
      }

      return { success: true, tagId: result.tagId, name: result.name };
    } catch (parseError) {
      console.error('Error parsing AppleScript result:', parseError);
      return { success: false, error: `Failed to parse result: ${stdout}` };
    }
  } catch (error: any) {
    console.error('Error in addTag:', error);
    return { success: false, error: error?.message || 'Unknown error in addTag' };
  }
}
