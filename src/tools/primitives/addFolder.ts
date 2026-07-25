import { executeAppleScript } from '../../utils/scriptExecution.js';
import { buildAppleScriptJsonHelpers } from '../../utils/appleScriptJson.js';
import { escapeAppleScriptString } from '../../utils/appleScriptString.js';

// Interface for folder creation parameters
export interface AddFolderParams {
  name: string;
  parentFolderName?: string; // Parent folder name to nest this folder under (root if omitted)
}

/**
 * Generate pure AppleScript for folder creation
 */
export function generateAppleScript(params: AddFolderParams): string {
  const name = escapeAppleScriptString(params.name);
  const parentFolderName = params.parentFolderName ? escapeAppleScriptString(params.parentFolderName) : '';
  const jsonHelpers = buildAppleScriptJsonHelpers();

  const script = `
${jsonHelpers}
  try
    tell application "OmniFocus"
      tell front document
        -- Determine the container (root or parent folder)
        if "${parentFolderName}" is "" then
          -- Create folder at the root level
          set newFolder to make new folder with properties {name:"${name}"}
        else
          -- Resolve parent folder with duplicate protection
          set parentMatches to (flattened folders where name = "${parentFolderName}")
          set parentMatchCount to count of parentMatches

          if parentMatchCount = 0 then
            return "{\\\"success\\\":false,\\\"error\\\":\\"" & my jsonEscape("Parent folder not found: ${parentFolderName}") & "\\\"}"
          else if parentMatchCount > 1 then
            return "{\\\"success\\\":false,\\\"error\\\":\\"" & my jsonEscape("Ambiguous parent folder name: ${parentFolderName}. Multiple matches found; please rename or use a unique folder.") & "\\\"}"
          end if

          set parentFolder to item 1 of parentMatches
          set newFolder to make new folder with properties {name:"${name}"} at end of folders of parentFolder
        end if

        -- Get the folder ID and name
        set folderId to id of newFolder as string
        set folderNameValue to name of newFolder

        -- Return success with folder ID
        return "{\\\"success\\\":true,\\\"folderId\\\":\\"" & my jsonEscape(folderId) & "\\",\\\"name\\\":\\"" & my jsonEscape(folderNameValue) & "\\\"}"
      end tell
    end tell
  on error errorMessage
    return "{\\\"success\\\":false,\\\"error\\\":\\"" & my jsonEscape(errorMessage) & "\\\"}"
  end try
  `;

  return script;
}

/**
 * Add a folder to OmniFocus
 */
export async function addFolder(params: AddFolderParams): Promise<{ success: boolean, folderId?: string, name?: string, error?: string }> {
  try {
    const script = generateAppleScript(params);

    console.error('Executing AppleScript for folder creation...');

    const stdout = await executeAppleScript(script);

    console.error('AppleScript stdout:', stdout);

    try {
      const result = JSON.parse(stdout);

      if (!result.success) {
        return {
          success: false,
          error: result.error
        };
      }

      return {
        success: true,
        folderId: result.folderId,
        name: result.name
      };
    } catch (parseError) {
      console.error('Error parsing AppleScript result:', parseError);
      return {
        success: false,
        error: `Failed to parse result: ${stdout}`
      };
    }
  } catch (error: any) {
    console.error('Error in addFolder:', error);
    return {
      success: false,
      error: error?.message || 'Unknown error in addFolder'
    };
  }
}
