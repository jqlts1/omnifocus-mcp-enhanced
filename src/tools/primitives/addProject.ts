import { executeAppleScript } from '../../utils/scriptExecution.js';
import { appleScriptDateCode } from '../../utils/dateFormatter.js';
import { buildAppleScriptJsonHelpers } from '../../utils/appleScriptJson.js';
import { escapeAppleScriptString } from '../../utils/appleScriptString.js';

// Interface for project creation parameters
export interface AddProjectParams {
  name: string;
  note?: string;
  dueDate?: string; // ISO date string
  deferDate?: string; // ISO date string
  plannedDate?: string; // ISO date string
  flagged?: boolean;
  estimatedMinutes?: number;
  tags?: string[]; // Tag names
  folderName?: string; // Folder name to add project to
  sequential?: boolean; // Whether tasks should be sequential or parallel
}

/**
 * Generate pure AppleScript for project creation
 */
export function generateAppleScript(params: AddProjectParams): string {
  // Sanitize and prepare parameters for AppleScript
  const name = escapeAppleScriptString(params.name);
  const note = params.note ? escapeAppleScriptString(params.note) : '';
  // Build date variables outside OmniFocus tell block to avoid locale parsing issues.
  const dueDateCode = params.dueDate ? appleScriptDateCode(params.dueDate, 'dueDateValue') : '';
  const deferDateCode = params.deferDate ? appleScriptDateCode(params.deferDate, 'deferDateValue') : '';
  const plannedDateCode = params.plannedDate ? appleScriptDateCode(params.plannedDate, 'plannedDateValue') : '';
  const datePreamble = [dueDateCode, deferDateCode, plannedDateCode].filter(Boolean).join('\n');
  const flagged = params.flagged === true;
  const estimatedMinutes = params.estimatedMinutes?.toString() || '';
  const tags = params.tags || [];
  const folderName = params.folderName ? escapeAppleScriptString(params.folderName) : '';
  const sequential = params.sequential === true;
  const jsonHelpers = buildAppleScriptJsonHelpers();
  const tagAssignmentScript = tags.length > 0
    ? tags.map(tag => {
      const sanitizedTag = escapeAppleScriptString(tag);
      return `
          try
            set theTag to missing value
            try
              set theTag to first flattened tag where name = "${sanitizedTag}"
            end try
            if theTag is missing value then
              set theTag to make new tag with properties {name:"${sanitizedTag}"}
            end if
            add theTag to tags of newProject
          on error
            -- Ignore errors finding/adding tags
          end try`;
    }).join('\n')
    : '';

  // Construct AppleScript with error handling
  let script = `
${jsonHelpers}
  try
${datePreamble}
    tell application "OmniFocus"
      tell front document
        -- Determine the container (root or folder)
        if "${folderName}" is "" then
          -- Create project at the root level
          set newProject to make new project with properties {name:"${name}"}
        else
          -- Use specified folder
          try
            set theFolder to first flattened folder where name = "${folderName}"
            set newProject to make new project with properties {name:"${name}"} at end of projects of theFolder
          on error
            return "{\\\"success\\\":false,\\\"error\\\":\\"" & my jsonEscape("Folder not found: ${folderName}") & "\\\"}"
          end try
        end if
        
        -- Set project properties
        ${note ? `set note of newProject to "${note}"` : ''}
        ${params.dueDate ? `set due date of newProject to dueDateValue` : ''}
        ${params.deferDate ? `set defer date of newProject to deferDateValue` : ''}
        ${params.plannedDate ? `set planned date of newProject to plannedDateValue` : ''}
        ${flagged ? `set flagged of newProject to true` : ''}
        ${estimatedMinutes ? `set estimated minutes of newProject to ${estimatedMinutes}` : ''}
        ${`set sequential of newProject to ${sequential}`}
        
        -- Get the project ID
        set projectId to id of newProject as string
        set projectNameValue to name of newProject
        
        -- Add tags if provided
        ${tagAssignmentScript}
        
        -- Return success with project ID
        return "{\\\"success\\\":true,\\\"projectId\\\":\\"" & my jsonEscape(projectId) & "\\",\\\"name\\\":\\"" & my jsonEscape(projectNameValue) & "\\\"}"
      end tell
    end tell
  on error errorMessage
    return "{\\\"success\\\":false,\\\"error\\\":\\"" & my jsonEscape(errorMessage) & "\\\"}"
  end try
  `;

  return script;
}

/**
 * Add a project to OmniFocus
 */
export async function addProject(params: AddProjectParams): Promise<{ success: boolean, projectId?: string, error?: string }> {
  try {
    // Generate AppleScript
    const script = generateAppleScript(params);

    console.error("Executing AppleScript...");

    // Execute AppleScript using temp file (avoids shell escaping issues)
    const stdout = await executeAppleScript(script);

    console.error("AppleScript stdout:", stdout);

    // Parse the result
    try {
      const result = JSON.parse(stdout);

      // Return the result
      return {
        success: result.success,
        projectId: result.projectId,
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
    console.error("Error in addProject:", error);
    return {
      success: false,
      error: error?.message || "Unknown error in addProject"
    };
  }
} 
