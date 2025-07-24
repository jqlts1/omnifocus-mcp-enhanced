import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, unlinkSync } from 'fs'; // CLAUDEAI: Add file system imports for temporary file handling
import { join } from 'path'; // CLAUDEAI: Add path utilities for temporary file handling
import { tmpdir } from 'os'; // CLAUDEAI: Add OS utilities for temporary file handling
import { escapeForAppleScript, generateJsonEscapeHelper } from '../../utils/applescriptUtils.js'; // CLAUDEAI: Import AppleScript utilities
const execAsync = promisify(exec);

// Interface for task lookup parameters
export interface GetTaskByIdParams {
  taskId?: string;
  taskName?: string;
}

// Interface for task information result
export interface TaskInfo {
  id: string;
  name: string;
  note: string;
  parentId?: string;
  parentName?: string;
  projectId?: string;
  projectName?: string;
  hasChildren: boolean;
  childrenCount: number;
}

/**
 * Generate AppleScript to get task information by ID or name
 */
function generateGetTaskScript(params: GetTaskByIdParams): string {
  const taskId = escapeForAppleScript(params.taskId || ''); // CLAUDEAI: Use utility function for consistent escaping
  const taskName = escapeForAppleScript(params.taskName || ''); // CLAUDEAI: Use utility function for consistent escaping
  
  let script = `
  ${generateJsonEscapeHelper()}
  
  try
    tell application "OmniFocus"
      tell front document
        -- Find task by ID or name
        if "${taskId}" is not "" then
          set theTask to first flattened task where id = "${taskId}"
        else if "${taskName}" is not "" then
          set theTask to first flattened task where name = "${taskName}"
        else
          return "{\\\"success\\\":false,\\\"error\\\":\\\"Either taskId or taskName must be provided\\\"}"
        end if
        
        -- Get task information
        set taskId to id of theTask as string
        set taskName to name of theTask
        set taskNote to note of theTask
        set taskChildren to tasks of theTask
        set childrenCount to count of taskChildren
        set hasChildren to (childrenCount > 0)
        
        -- Get parent information
        set parentId to ""
        set parentName to ""
        try
          set parentTask to container of theTask
          if class of parentTask is task then
            set parentId to id of parentTask as string
            set parentName to name of parentTask
          end if
        end try
        
        -- Get project information
        set projectId to ""
        set projectName to ""
        try
          set containingProject to containing project of theTask
          if containingProject is not missing value then
            set projectId to id of containingProject as string
            set projectName to name of containingProject
          end if
        end try
        
        -- Escape all values for JSON output
        set escapedTaskId to my escapeForJson(taskId)
        set escapedTaskName to my escapeForJson(taskName)
        set escapedTaskNote to my escapeForJson(taskNote)
        set escapedParentId to my escapeForJson(parentId)
        set escapedParentName to my escapeForJson(parentName)
        set escapedProjectId to my escapeForJson(projectId)
        set escapedProjectName to my escapeForJson(projectName)
        
        -- Return JSON result
        return "{\\\"success\\\":true,\\\"task\\\":{\\\"id\\\":\\"" & escapedTaskId & "\\",\\\"name\\\":\\"" & escapedTaskName & "\\",\\\"note\\\":\\"" & escapedTaskNote & "\\",\\\"parentId\\\":\\"" & escapedParentId & "\\",\\\"parentName\\\":\\"" & escapedParentName & "\\",\\\"projectId\\\":\\"" & escapedProjectId & "\\",\\\"projectName\\\":\\"" & escapedProjectName & "\\",\\\"hasChildren\\\":" & hasChildren & ",\\\"childrenCount\\\":" & childrenCount & "}}"
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
 * Get task information by ID or name from OmniFocus
 */
export async function getTaskById(params: GetTaskByIdParams): Promise<{success: boolean, task?: TaskInfo, error?: string}> {
  try {
    // Validate parameters
    if (!params.taskId && !params.taskName) {
      return {
        success: false,
        error: "Either taskId or taskName must be provided"
      };
    }

    // Generate AppleScript
    const script = generateGetTaskScript(params);
    
    console.error("Executing AppleScript via temporary file...");
    
    // CLAUDEAI: Write AppleScript to temporary file to avoid shell escaping issues with apostrophes
    const tempFile = join(tmpdir(), `omnifocus-gettask-${Date.now()}.applescript`);
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
      
      if (result.success) {
        return {
          success: true,
          task: result.task as TaskInfo
        };
      } else {
        return {
          success: false,
          error: result.error
        };
      }
    } catch (parseError) {
      console.error("Error parsing AppleScript result:", parseError);
      return {
        success: false,
        error: `Failed to parse result: ${stdout}`
      };
    }
  } catch (error: any) {
    console.error("Error in getTaskById:", error);
    return {
      success: false,
      error: error?.message || "Unknown error in getTaskById"
    };
  }
}