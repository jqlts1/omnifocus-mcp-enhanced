import { exec } from 'child_process';
import { promisify } from 'util';
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
  const taskId = params.taskId?.replace(/['"\\]/g, '\\$&') || '';
  const taskName = params.taskName?.replace(/['"\\]/g, '\\$&') || '';
  
  let script = `
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
        
        -- Return JSON result
        return "{\\\"success\\\":true,\\\"task\\\":{\\\"id\\\":\\"" & taskId & "\\",\\\"name\\\":\\"" & taskName & "\\",\\\"note\\\":\\"" & taskNote & "\\",\\\"parentId\\\":\\"" & parentId & "\\",\\\"parentName\\\":\\"" & parentName & "\\",\\\"projectId\\\":\\"" & projectId & "\\",\\\"projectName\\\":\\"" & projectName & "\\",\\\"hasChildren\\\":" & hasChildren & ",\\\"childrenCount\\\":" & childrenCount & "}}"
      end tell
    end tell
  on error errorMessage
    return "{\\\"success\\\":false,\\\"error\\\":\\"" & errorMessage & "\\"}"
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
    
    console.error("Executing getTaskById AppleScript...");
    
    // Execute AppleScript
    const { stdout, stderr } = await execAsync(`osascript -e '${script}'`);
    
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