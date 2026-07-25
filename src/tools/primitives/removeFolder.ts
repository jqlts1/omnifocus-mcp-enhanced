import { executeAppleScript } from '../../utils/scriptExecution.js';
import { buildAppleScriptJsonHelpers } from '../../utils/appleScriptJson.js';
import { escapeAppleScriptString } from '../../utils/appleScriptString.js';

// Interface for folder removal parameters
export interface RemoveFolderParams {
  id?: string;   // ID of the folder to remove
  name?: string; // Name of the folder to remove (fallback if ID not provided)
}

/**
 * Generate pure AppleScript for folder removal.
 * Deleting a folder also deletes all projects and tasks it contains.
 */
export function generateAppleScript(params: RemoveFolderParams): string {
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
        -- Find the folder to remove
        set foundFolder to missing value
`;

  if (id) {
    script += `
        -- Try to find by ID first
        try
          set foundFolder to first flattened folder where id = "${id}"
        end try
`;
  }

  if (name) {
    script += `
        -- Resolve by name with duplicate protection
        if foundFolder is missing value then
          set nameMatches to (flattened folders where name = "${name}")
          set nameMatchCount to count of nameMatches

          if nameMatchCount = 1 then
            set foundFolder to item 1 of nameMatches
          else if nameMatchCount > 1 then
            return "{\\\"success\\\":false,\\\"error\\\":\\"" & my jsonEscape("Ambiguous folder name: ${name}. Multiple matches found; please use id.") & "\\\"}"
          end if
        end if
`;
  }

  script += `
        -- If we found the folder, remove it
        if foundFolder is not missing value then
          set folderName to name of foundFolder
          set folderId to id of foundFolder as string

          -- Count contained projects and tasks before deleting (for reporting)
          set containedProjects to flattened projects of foundFolder
          set projectCountValue to count of containedProjects
          set taskCountValue to 0
          repeat with aProject in containedProjects
            try
              set taskCountValue to taskCountValue + (count of (flattened tasks of aProject))
            end try
          end repeat

          -- Delete the folder (cascades to contained projects and tasks)
          delete foundFolder

          return "{\\\"success\\\":true,\\\"id\\\":\\"" & my jsonEscape(folderId) & "\\",\\\"name\\\":\\"" & my jsonEscape(folderName) & "\\",\\\"deletedProjectCount\\\":" & projectCountValue & ",\\\"deletedTaskCount\\\":" & taskCountValue & "}"
        else
          return "{\\\"success\\\":false,\\\"error\\\":\\\"Folder not found\\\"}"
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
 * Remove a folder from OmniFocus (deletes all contained projects and tasks).
 */
export async function removeFolder(params: RemoveFolderParams): Promise<{
  success: boolean,
  id?: string,
  name?: string,
  deletedProjectCount?: number,
  deletedTaskCount?: number,
  error?: string
}> {
  try {
    const script = generateAppleScript(params);

    console.error('Executing AppleScript for folder removal...');

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
        id: result.id,
        name: result.name,
        deletedProjectCount: result.deletedProjectCount,
        deletedTaskCount: result.deletedTaskCount
      };
    } catch (parseError) {
      console.error('Error parsing AppleScript result:', parseError);
      return {
        success: false,
        error: `Failed to parse result: ${stdout}`
      };
    }
  } catch (error: any) {
    console.error('Error in removeFolder execution:', error);
    return {
      success: false,
      error: error?.message || 'Unknown error in removeFolder'
    };
  }
}
