import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { escapeForAppleScript, generateJsonEscapeHelper } from '../../utils/applescriptUtils.js'; // CLAUDEAI: Import AppleScript utilities
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
  // CLAUDEAI: Sanitize and prepare parameters for AppleScript using utility functions
  const name = escapeForAppleScript(params.name);
  const note = escapeForAppleScript(params.note || '');
  const dueDate = params.dueDate || '';
  const deferDate = params.deferDate || '';
  const flagged = params.flagged === true;
  const estimatedMinutes = params.estimatedMinutes?.toString() || '';
  const tags = params.tags || [];
  const folderName = escapeForAppleScript(params.folderName || '');
  const sequential = params.sequential === true;
  
  // Construct AppleScript with error handling
  let script = `
  ${generateJsonEscapeHelper()}
  
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
          const sanitizedTag = escapeForAppleScript(tag); // CLAUDEAI: Use utility function for consistent escaping
          return `
          try
            set theTag to first flattened tag where name = "${sanitizedTag}"
            tell newProject to add theTag
          on error
            -- Ignore errors finding/adding tags
          end try`;
        }).join('\n') : ''}
        
        -- Escape values for JSON output
        set escapedProjectId to my escapeForJson(projectId)
        set escapedName to my escapeForJson("${name}")
        
        -- Return success with project ID
        return "{\\\"success\\\":true,\\\"projectId\\\":\\"" & escapedProjectId & "\\",\\\"name\\\":\\"" & escapedName & "\\"}"
      end tell
    end tell
  on error errorMessage
    -- Escape error message for JSON output
    set escapedError to my escapeForJson(errorMessage)
    return "{\\\"success\\\":false,\\\"error\\\":\\"" & escapedError & "\\"}"
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
    
    console.error("Executing AppleScript via temporary file...");
    
    // CLAUDEAI: Write AppleScript to temporary file to avoid shell escaping issues with apostrophes
    const tempFile = join(tmpdir(), `omnifocus-project-${Date.now()}.applescript`);
    let stdout = '';
    let stderr = '';
    
    try {
      writeFileSync(tempFile, script);
      const result = await execAsync(`osascript "${tempFile}"`);
      stdout = result.stdout;
      stderr = result.stderr;
    } finally {
      // CLAUDEAI: Clean up temporary file
      try {
        unlinkSync(tempFile);
      } catch (cleanupError) {
        console.error("Error cleaning up temporary file:", cleanupError);
      }
    }
    
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