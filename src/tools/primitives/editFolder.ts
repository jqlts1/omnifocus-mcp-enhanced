import { executeAppleScript } from '../../utils/scriptExecution.js';
import { buildAppleScriptJsonHelpers } from '../../utils/appleScriptJson.js';
import { escapeAppleScriptString } from '../../utils/appleScriptString.js';

// Interface for folder edit parameters
export interface EditFolderParams {
  id?: string;                 // ID of the folder to edit
  name?: string;               // Name of the folder to edit (fallback if ID not provided)
  newName?: string;            // New name for the folder
  newParentFolderName?: string; // Move folder under a new parent folder (empty string "" moves to root)
}

/**
 * Validate edit parameters before script generation.
 */
export function validateEditFolderParams(params: EditFolderParams): { valid: boolean; error?: string } {
  if (!params.id && !params.name) {
    return {
      valid: false,
      error: 'Either id or name must be provided'
    };
  }

  if (params.newName === undefined && params.newParentFolderName === undefined) {
    return {
      valid: false,
      error: 'Nothing to update: provide newName and/or newParentFolderName.'
    };
  }

  return { valid: true };
}

/**
 * Generate pure AppleScript for folder editing
 */
export function generateAppleScript(params: EditFolderParams): string {
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
        -- Find the folder to edit
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
        -- If we found the folder, edit it
        if foundFolder is not missing value then
          set folderName to name of foundFolder
          set folderId to id of foundFolder as string
          set changedProperties to {}
`;

  // Move to a new parent folder (or root when empty string)
  if (params.newParentFolderName !== undefined) {
    if (params.newParentFolderName === '') {
      script += `
          -- Move folder to the root level
          move foundFolder to end of folders
          set end of changedProperties to "parent (root)"
`;
    } else {
      const destName = escapeAppleScriptString(params.newParentFolderName);
      script += `
          -- Resolve destination parent folder with duplicate protection
          set destMatches to (flattened folders where name = "${destName}")
          set destMatchCount to count of destMatches

          if destMatchCount = 0 then
            return "{\\\"success\\\":false,\\\"error\\\":\\"" & my jsonEscape("Destination parent folder not found: ${destName}") & "\\\"}"
          else if destMatchCount > 1 then
            return "{\\\"success\\\":false,\\\"error\\\":\\"" & my jsonEscape("Ambiguous destination parent folder name: ${destName}. Multiple matches found; please rename or use a unique folder.") & "\\\"}"
          end if

          set destFolder to item 1 of destMatches

          -- Prevent cycles: destination cannot be this folder or any of its descendants
          set cursorFolder to destFolder
          repeat while cursorFolder is not missing value
            if (id of cursorFolder as string) is folderId then
              return "{\\\"success\\\":false,\\\"error\\\":\\\"Invalid move target: cannot move a folder into itself or its descendants.\\\"}"
            end if

            set nextCursorFolder to missing value
            try
              set cursorContainer to container of cursorFolder
              if class of cursorContainer is folder then
                set nextCursorFolder to cursorContainer
              end if
            end try
            set cursorFolder to nextCursorFolder
          end repeat

          -- Move folder under destination parent
          move foundFolder to end of folders of destFolder
          set end of changedProperties to "parent"
`;
    }
  }

  if (params.newName !== undefined) {
    script += `
          -- Update name
          set name of foundFolder to "${escapeAppleScriptString(params.newName)}"
          set end of changedProperties to "name"
`;
  }

  script += `
          -- Prepare the changed properties as a string
          set changedPropsText to ""
          repeat with i from 1 to count of changedProperties
            set changedPropsText to changedPropsText & item i of changedProperties
            if i < count of changedProperties then
              set changedPropsText to changedPropsText & ", "
            end if
          end repeat

          -- Re-read the (possibly updated) name and id
          set folderName to name of foundFolder
          set folderId to id of foundFolder as string

          return "{\\\"success\\\":true,\\\"id\\\":\\"" & my jsonEscape(folderId) & "\\",\\\"name\\\":\\"" & my jsonEscape(folderName) & "\\",\\\"changedProperties\\\":\\"" & my jsonEscape(changedPropsText) & "\\\"}"
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
 * Edit a folder in OmniFocus
 */
export async function editFolder(params: EditFolderParams): Promise<{
  success: boolean,
  id?: string,
  name?: string,
  changedProperties?: string,
  error?: string
}> {
  try {
    const validation = validateEditFolderParams(params);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }

    const script = generateAppleScript(params);

    console.error('Executing AppleScript for folder editing...');

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
        changedProperties: result.changedProperties
      };
    } catch (parseError) {
      console.error('Error parsing AppleScript result:', parseError);
      return {
        success: false,
        error: `Failed to parse result: ${stdout}`
      };
    }
  } catch (error: any) {
    console.error('Error in editFolder execution:', error);
    return {
      success: false,
      error: error?.message || 'Unknown error in editFolder'
    };
  }
}
