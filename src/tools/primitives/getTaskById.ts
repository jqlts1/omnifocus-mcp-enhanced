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
  tags: string[];
  dueDate?: string;
  deferDate?: string;
  flagged: boolean;
  completed: boolean;
  estimatedMinutes?: number;
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
        
        -- Get tags
        set taskTags to tags of theTask
        set tagNames to ""
        if (count of taskTags) > 0 then
          set tagList to {}
          repeat with taskTag in taskTags
            set end of tagList to "\\"" & (name of taskTag) & "\\""
          end repeat
          set AppleScript's text item delimiters to ","
          set tagNames to tagList as string
          set AppleScript's text item delimiters to ""
        end if
        
        -- Get other properties
        set taskFlagged to flagged of theTask
        set taskCompleted to completed of theTask
        set taskDueDate to ""
        set taskDeferDate to ""
        set taskEstimatedMinutes to ""
        
        try
          if due date of theTask is not missing value then
            set taskDueDate to (due date of theTask) as string
          end if
        end try
        
        try
          if defer date of theTask is not missing value then
            set taskDeferDate to (defer date of theTask) as string
          end if
        end try
        
        try
          if estimated minutes of theTask is not missing value then
            set taskEstimatedMinutes to (estimated minutes of theTask) as string
          end if
        end try
        
        -- Return simple pipe-delimited result to avoid JSON escaping issues
        return "SUCCESS|" & taskId & "|" & taskName & "|" & taskNote & "|" & parentId & "|" & parentName & "|" & projectId & "|" & projectName & "|" & hasChildren & "|" & childrenCount & "|" & tagNames & "|" & taskDueDate & "|" & taskDeferDate & "|" & taskFlagged & "|" & taskCompleted & "|" & taskEstimatedMinutes
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
    
    console.error("Generated getTaskById AppleScript:");
    console.error(script);
    console.error("Executing getTaskById AppleScript...");
    
    // Execute AppleScript
    const { stdout, stderr } = await execAsync(`osascript -e '${script}'`);
    
    if (stderr) {
      console.error("AppleScript stderr:", stderr);
    }
    
    console.error("AppleScript stdout:", stdout);
    
    // Parse the result
    try {
      if (stdout.startsWith('SUCCESS|')) {
        // Parse pipe-delimited format
        const parts = stdout.substring(8).split('|'); // Remove "SUCCESS|" prefix
        const [id, name, note, parentId, parentName, projectId, projectName, hasChildrenStr, childrenCountStr, tagNamesStr, dueDate, deferDate, flaggedStr, completedStr, estimatedMinutesStr] = parts;
        
        // Parse tags from comma-separated quoted strings
        let tags: string[] = [];
        if (tagNamesStr && tagNamesStr.trim() !== '') {
          tags = tagNamesStr.split(',').map(tag => tag.replace(/^"(.*)"$/, '$1'));
        }
        
        const taskInfo: TaskInfo = {
          id,
          name,
          note,
          parentId: parentId || undefined,
          parentName: parentName || undefined,
          projectId: projectId || undefined,
          projectName: projectName || undefined,
          hasChildren: hasChildrenStr === 'true',
          childrenCount: parseInt(childrenCountStr) || 0,
          tags,
          dueDate: dueDate || undefined,
          deferDate: deferDate || undefined,
          flagged: flaggedStr === 'true',
          completed: completedStr === 'true',
          estimatedMinutes: estimatedMinutesStr ? parseInt(estimatedMinutesStr) : undefined
        };
        
        return {
          success: true,
          task: taskInfo
        };
      } else {
        // Try JSON parsing for error messages
        const result = JSON.parse(stdout);
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