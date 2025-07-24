import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

// Interface for project creation parameters
export interface AddProjectParams {
  name: string;
  note?: string;
  dueDate?: string; // ISO date string
  deferDate?: string; // ISO date string
  flagged?: boolean;
  estimatedMinutes?: number;
  tags?: string[]; // Tag names
  folderName?: string; // Folder name to add project to
  sequential?: boolean; // Whether tasks should be sequential or parallel
}

/**
 * Generate pure AppleScript for project creation
 */
function generateAppleScript(params: AddProjectParams): string {
  // CLAUDEAI: Sanitize and prepare parameters for AppleScript - only escape backslashes and double quotes
  // Single quotes (apostrophes) don't need escaping in AppleScript double-quoted strings
  const name = params.name.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const note = params.note?.replace(/\\/g, '\\\\').replace(/"/g, '\\"') || '';
  const dueDate = params.dueDate || '';
  const deferDate = params.deferDate || '';
  const flagged = params.flagged === true;
  const estimatedMinutes = params.estimatedMinutes?.toString() || '';
  const tags = params.tags || [];
  const folderName = params.folderName?.replace(/\\/g, '\\\\').replace(/"/g, '\\"') || '';
  const sequential = params.sequential === true;
  
  // Construct AppleScript with error handling
  let script = `
  try
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
            return "{\\\"success\\\":false,\\\"error\\\":\\\"Folder not found: ${folderName}\\\"}"
          end try
        end if
        
        -- Set project properties
        ${note ? `set note of newProject to "${note}"` : ''}
        ${dueDate ? `
          set due date of newProject to (current date) + (time to GMT)
          set due date of newProject to date "${dueDate}"` : ''}
        ${deferDate ? `
          set defer date of newProject to (current date) + (time to GMT)
          set defer date of newProject to date "${deferDate}"` : ''}
        ${flagged ? `set flagged of newProject to true` : ''}
        ${estimatedMinutes ? `set estimated minutes of newProject to ${estimatedMinutes}` : ''}
        ${`set sequential of newProject to ${sequential}`}
        
        -- Get the project ID
        set projectId to id of newProject as string
        
        -- Add tags if provided
        ${tags.length > 0 ? tags.map(tag => {
          const sanitizedTag = tag.replace(/\\/g, '\\\\').replace(/"/g, '\\"'); // CLAUDEAI: Only escape backslashes and double quotes for AppleScript
          return `
          try
            set theTag to first flattened tag where name = "${sanitizedTag}"
            tell newProject to add theTag
          on error
            -- Ignore errors finding/adding tags
          end try`;
        }).join('\n') : ''}
        
        -- Return success with project ID
        return "{\\\"success\\\":true,\\\"projectId\\\":\\"" & projectId & "\\",\\\"name\\\":\\"${name}\\"}"
      end tell
    end tell
  on error errorMessage
    return "{\\\"success\\\":false,\\\"error\\\":\\"" & errorMessage & "\\"}"
  end try
  `;
  
  return script;
}

/**
 * Add a project to OmniFocus
 */
export async function addProject(params: AddProjectParams): Promise<{success: boolean, projectId?: string, error?: string}> {
  try {
    // Generate AppleScript
    const script = generateAppleScript(params);
    
    console.error("Executing AppleScript directly...");
    
    // Execute AppleScript directly
    const { stdout, stderr } = await execAsync(`osascript -e '${script}'`);
    
    if (stderr) {
      console.error("AppleScript stderr:", stderr);
    }
    
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