import { executeAppleScript } from '../../utils/scriptExecution.js';
import { buildAppleScriptJsonHelpers } from '../../utils/appleScriptJson.js';
import { escapeAppleScriptString } from '../../utils/appleScriptString.js';

// Interface for item removal parameters
export interface RemoveItemParams {
  id?: string;          // ID of the task or project to remove
  name?: string;        // Name of the task or project to remove (as fallback if ID not provided)
  itemType: 'task' | 'project'; // Type of item to remove
}

/**
 * Generate pure AppleScript for item removal
 */
function generateAppleScript(params: RemoveItemParams): string {
  // Sanitize and prepare parameters for AppleScript
  const id = params.id ? escapeAppleScriptString(params.id) : '';
  const name = params.name ? escapeAppleScriptString(params.name) : '';
  const itemType = params.itemType;
  const jsonHelpers = buildAppleScriptJsonHelpers();

  // Verify we have at least one identifier
  if (!id && !name) {
    return `return "{\\\"success\\\":false,\\\"error\\\":\\\"Either id or name must be provided\\\"}"`;
  }

  // Construct AppleScript with error handling
  let script = `
${jsonHelpers}
  try
    tell application "OmniFocus"
      tell front document
        -- Find the item to remove
        set foundItem to missing value
`;

  // Add ID search if provided
  if (id) {
    script += `
        -- Try to find by ID first
        try
          set foundItem to first ${itemType === 'task' ? 'flattened task' : 'flattened project'} where id = "${id}"
        end try
`;
  }

  // Add name search if provided (and no ID or as fallback)
  if (!id && name) {
    script += `
        -- Find by name
        try
          set foundItem to first ${itemType === 'task' ? 'flattened task' : 'flattened project'} where name = "${name}"
        end try
`;
  } else if (id && name) {
    script += `
        -- If ID search failed, try to find by name as fallback
        if foundItem is missing value then
          try
            set foundItem to first ${itemType === 'task' ? 'flattened task' : 'flattened project'} where name = "${name}"
          end try
        end if
`;
  }

  // Add the rest of the script
  script += `
        -- If we found the item, remove it
        if foundItem is not missing value then
          set itemName to name of foundItem
          set itemId to id of foundItem as string
          
          -- Delete the item
          delete foundItem
          
          -- Return success
          return "{\\\"success\\\":true,\\\"id\\\":\\"" & my jsonEscape(itemId) & "\\",\\\"name\\\":\\"" & my jsonEscape(itemName) & "\\\"}"
        else
          -- Item not found
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
 * Remove a task or project from OmniFocus
 */
export async function removeItem(params: RemoveItemParams): Promise<{ success: boolean, id?: string, name?: string, error?: string }> {
  try {
    // Generate AppleScript
    const script = generateAppleScript(params);

    console.error("Executing AppleScript for removal...");
    console.error(`Item type: ${params.itemType}, ID: ${params.id || 'not provided'}, Name: ${params.name || 'not provided'}`);

    // Log a preview of the script for debugging (first few lines)
    const scriptPreview = script.split('\n').slice(0, 10).join('\n') + '\n...';
    console.error("AppleScript preview:\n", scriptPreview);

    // Execute AppleScript using temp file (avoids shell escaping issues)
    const stdout = await executeAppleScript(script);

    console.error("AppleScript stdout:", stdout);

    // Parse the result
    try {
      const result = JSON.parse(stdout);

      // Return the result
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
    console.error("Error in removeItem execution:", error);

    // Include more detailed error information
    if (error.message && error.message.includes('syntax error')) {
      console.error("This appears to be an AppleScript syntax error. Review the script generation logic.");
    }

    return {
      success: false,
      error: error?.message || "Unknown error in removeItem"
    };
  }
} 
