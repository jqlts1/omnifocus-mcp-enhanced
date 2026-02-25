import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

// Interface for folder deletion parameters
export interface DeleteFolderParams {
  id?: string;          // ID of the folder to delete
  name?: string;        // Name of the folder to delete (as fallback if ID not provided)
}

/**
 * Generate pure AppleScript for folder deletion
 */
function generateAppleScript(params: DeleteFolderParams): string {
  // Sanitize and prepare parameters for AppleScript
  const id = params.id?.replace(/["\\]/g, '\\$&') || '';
  const name = params.name?.replace(/["\\]/g, '\\$&') || '';

  // Verify we have at least one identifier
  if (!id && !name) {
    return `return "{\\\"success\\\":false,\\\"error\\\":\\\"Either id or name must be provided\\\"}"`;
  }

  let script = `
  try
    tell application "OmniFocus"
      tell front document
        -- Find the folder
        set foundFolder to missing value
`;

  // Add ID search if provided
  if (id) {
    script += `
        -- Try to find folder by ID
        try
          set foundFolder to first flattened folder where id = "${id}"
        end try
`;
  }

  // Add name search as primary or fallback
  if (!id && name) {
    script += `
        -- Find folder by name
        try
          set foundFolder to first flattened folder where name = "${name}"
        end try
`;
  } else if (id && name) {
    script += `
        -- If ID search failed, try to find by name as fallback
        if foundFolder is missing value then
          try
            set foundFolder to first flattened folder where name = "${name}"
          end try
        end if
`;
  }

  script += `
        -- If we found the folder, delete it
        if foundFolder is not missing value then
          set folderName to name of foundFolder
          set folderId to id of foundFolder as string

          -- Delete the folder
          delete foundFolder

          -- Return success
          return "{\\\"success\\\":true,\\\"id\\\":\\"" & folderId & "\\",\\\"name\\\":\\"" & folderName & "\\"}"
        else
          -- Folder not found
          return "{\\\"success\\\":false,\\\"error\\\":\\\"Folder not found\\\"}"
        end if
      end tell
    end tell
  on error errorMessage
    return "{\\\"success\\\":false,\\\"error\\\":\\"" & errorMessage & "\\"}"
  end try
  `;

  return script;
}

/**
 * Delete a folder from OmniFocus
 */
export async function deleteFolder(params: DeleteFolderParams): Promise<{success: boolean, id?: string, name?: string, error?: string}> {
  try {
    const script = generateAppleScript(params);

    console.error("Executing AppleScript for folder deletion...");
    console.error(`Folder ID: ${params.id || 'not provided'}, Name: ${params.name || 'not provided'}`);

    const { stdout, stderr } = await execAsync(`osascript -e '${script}'`);

    if (stderr) {
      console.error("AppleScript stderr:", stderr);
    }

    console.error("AppleScript stdout:", stdout);

    try {
      const result = JSON.parse(stdout);
      return {
        success: result.success,
        id: result.id,
        name: result.name,
        error: result.error
      };
    } catch (parseError) {
      console.error("Error parsing AppleScript result:", parseError);
      return {
        success: false,
        error: `Failed to parse result: ${stdout}`
      };
    }
  } catch (error: any) {
    console.error("Error in deleteFolder execution:", error);
    return {
      success: false,
      error: error?.message || "Unknown error in deleteFolder"
    };
  }
}
